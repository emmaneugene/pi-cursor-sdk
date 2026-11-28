import { createServer, type IncomingMessage, type Server as HttpServer, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import type {
	CursorPiToolBridge,
	CursorPiToolBridgeRun,
	CursorPiToolBridgeRunOptions,
	CursorPiToolBridgeSnapshotApi,
} from "./pi-tool-bridge-types.js";
import { asRecord } from "./record-utils.js";
import type { CursorPiToolBridgeRunImpl } from "./pi-tool-bridge-run.js";
import {
	buildCursorPiToolBridgeSnapshot,
	buildCursorPiToolBridgeSurfaceSignature,
	createEmptySnapshot,
} from "./pi-tool-bridge-snapshot.js";
import type { CursorPiToolBridgeConfig } from "./pi-tool-bridge-config.js";

export const LOOPBACK_HOST = "127.0.0.1";
const HTTP_SERVER_CLOSE_GRACE_MS = 250;

type LoopbackHttpServerState =
	| { kind: "stopped" }
	| { kind: "starting"; server: HttpServer; ready: Promise<AddressInfo> }
	| { kind: "listening"; server: HttpServer; address: AddressInfo }
	| { kind: "closing"; done: Promise<void> };

function readLoopbackAddressInfo(server: HttpServer): AddressInfo | undefined {
	const addr = asRecord(server.address());
	return typeof addr?.port === "number"
		? {
			address: typeof addr.address === "string" ? addr.address : LOOPBACK_HOST,
			family: typeof addr.family === "string" ? addr.family : "IPv4",
			port: addr.port,
		}
		: undefined;
}

function closeNodeHttpServer(server: HttpServer): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		let settled = false;
		const settle = (error?: Error | null) => {
			if (settled) return;
			settled = true;
			clearTimeout(closeTimer);
			if (error) reject(error);
			else resolve();
		};
		const closeTimer = setTimeout(() => settle(), HTTP_SERVER_CLOSE_GRACE_MS);
		closeTimer.unref?.();
		server.close(settle);
		server.closeIdleConnections();
		server.closeAllConnections();
	});
}

export class CursorPiToolBridgeRegistry implements CursorPiToolBridge {
	private readonly pi: CursorPiToolBridgeSnapshotApi;
	private readonly config: CursorPiToolBridgeConfig;
	private readonly routes = new Map<string, CursorPiToolBridgeRunImpl>();
	private readonly startingRuns = new Set<CursorPiToolBridgeRunImpl>();
	private serverState: LoopbackHttpServerState = { kind: "stopped" };

	constructor(pi: CursorPiToolBridgeSnapshotApi, config: CursorPiToolBridgeConfig) {
		this.pi = pi;
		this.config = config;
	}

	isEnabled(): boolean {
		return this.config.enabled;
	}

	getToolSurfaceSignature(excludedToolNames?: ReadonlySet<string>): string {
		if (!this.isEnabled()) return "bridge:off";
		const snapshot = buildCursorPiToolBridgeSnapshot(this.pi, {
			exposeOverlappingBuiltins: this.config.exposeBuiltins,
			excludedToolNames,
		});
		return buildCursorPiToolBridgeSurfaceSignature(snapshot);
	}

	async createRun(options: CursorPiToolBridgeRunOptions = {}): Promise<CursorPiToolBridgeRun> {
		const bridgeEnabled = this.isEnabled();
		const snapshot = bridgeEnabled
			? buildCursorPiToolBridgeSnapshot(this.pi, {
				exposeOverlappingBuiltins: this.config.exposeBuiltins,
				excludedToolNames: options.excludeToolNames,
			})
			: createEmptySnapshot();
		const { CursorPiToolBridgeRunImpl } = await import("./pi-tool-bridge-run.js");
		const run = new CursorPiToolBridgeRunImpl(this, this.config, snapshot, bridgeEnabled && snapshot.tools.length > 0, options);
		if (run.enabled) this.startingRuns.add(run);
		try {
			await run.start();
		} catch (error) {
			await run.dispose().catch(() => undefined);
			throw error;
		} finally {
			this.startingRuns.delete(run);
		}
		run.emitStartDiagnostics(bridgeEnabled);
		return run;
	}

	hasLiveRuns(): boolean {
		return this.routes.size > 0 || this.startingRuns.size > 0;
	}

	async disposeAll(reason = "Cursor pi tool bridge disposed"): Promise<void> {
		const runs = new Set([...this.startingRuns, ...this.routes.values()]);
		await Promise.all([...runs].map(async (run) => {
			run.cancel(reason);
			await run.dispose();
		}));
		await this.closeHttpServer();
	}

	async registerRun(pathname: string, run: CursorPiToolBridgeRunImpl): Promise<string> {
		// Reserve route before startup so a concurrent unregister cannot close the server mid-start.
		this.routes.set(pathname, run);
		try {
			const address = await this.ensureHttpServer();
			if (this.routes.get(pathname) !== run) {
				throw new Error("Cursor pi tool bridge run was unregistered during startup");
			}
			return `http://${LOOPBACK_HOST}:${address.port}${pathname}`;
		} catch (error) {
			if (this.routes.get(pathname) === run) this.routes.delete(pathname);
			if (this.routes.size === 0) await this.closeHttpServer().catch(() => undefined);
			throw error;
		}
	}

	async unregisterRun(pathname: string, run: CursorPiToolBridgeRunImpl): Promise<void> {
		if (this.routes.get(pathname) === run) this.routes.delete(pathname);
		if (this.routes.size === 0) await this.closeHttpServer();
	}

	getHttpServerAddress(): AddressInfo | undefined {
		return this.serverState.kind === "listening" ? this.serverState.address : undefined;
	}

	getEndpointCount(): number {
		return this.routes.size;
	}

	hasPendingPiToolCallId(piToolCallId: string): boolean {
		for (const run of this.routes.values()) {
			if (run.hasPendingPiToolCallId(piToolCallId)) return true;
		}
		return false;
	}

	cancelPendingPiToolCallId(piToolCallId: string, reason: string): boolean {
		for (const run of this.routes.values()) {
			if (run.cancelPendingPiToolCallId(piToolCallId, reason)) return true;
		}
		return false;
	}

	private async ensureHttpServer(): Promise<AddressInfo> {
		while (true) {
			const state = this.serverState;
			if (state.kind === "listening") return state.address;
			if (state.kind === "starting") { await state.ready; continue; }
			if (state.kind === "closing") { await state.done; continue; }

			const server = createServer((req, res) => { void this.handleHttpRequest(req, res); });
			let resolveReady!: (address: AddressInfo) => void;
			let rejectReady!: (error: Error) => void;
			const ready = new Promise<AddressInfo>((resolve, reject) => {
				resolveReady = resolve;
				rejectReady = reject;
			});
			ready.catch(() => undefined);
			this.serverState = { kind: "starting", server, ready };

			const onError = (error: Error) => {
				server.off("listening", onListening);
				this.serverState = { kind: "stopped" };
				rejectReady(error);
			};
			const onListening = () => {
				server.off("error", onError);
				const address = readLoopbackAddressInfo(server);
				if (!address) {
					this.serverState = { kind: "stopped" };
					server.close();
					rejectReady(new Error("Cursor pi tool bridge HTTP server is not listening"));
					return;
				}
				this.serverState = { kind: "listening", server, address };
				resolveReady(address);
			};
			server.once("error", onError);
			server.once("listening", onListening);
			server.listen(0, LOOPBACK_HOST);
			return await ready;
		}
	}

	private async closeHttpServer(): Promise<void> {
		while (this.routes.size === 0) {
			const state = this.serverState;
			if (state.kind === "stopped") return;
			if (state.kind === "closing") { await state.done; continue; }
			if (state.kind === "starting") { await state.ready.catch(() => undefined); continue; }

			let resolveDone!: () => void;
			const done = new Promise<void>((resolve) => { resolveDone = resolve; });
			this.serverState = { kind: "closing", done };
			try {
				await closeNodeHttpServer(state.server);
			} finally {
				if (this.serverState.kind === "closing" && this.serverState.done === done) {
					this.serverState = { kind: "stopped" };
				}
				resolveDone();
			}
			return;
		}
	}

	private async handleHttpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
		if (req.socket.localAddress !== LOOPBACK_HOST) {
			res.writeHead(403, { "content-type": "application/json" }).end(JSON.stringify({ error: "Cursor pi tool bridge only accepts loopback requests" }));
			return;
		}

		const url = new URL(req.url ?? "/", `http://${LOOPBACK_HOST}`);
		const run = this.routes.get(url.pathname);
		if (!run) {
			res.writeHead(404, { "content-type": "application/json" }).end(JSON.stringify({ error: "Cursor pi tool bridge endpoint not found" }));
			return;
		}

		try {
			await run.handleHttpRequest(req, res);
		} catch (error) {
			if (!res.headersSent) {
				res.writeHead(500, { "content-type": "application/json" }).end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
			}
		}
	}
}
