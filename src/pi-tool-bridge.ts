import { spawnSync } from "node:child_process";
import {
	CURSOR_PI_TOOL_BRIDGE_DIAGNOSTIC_PREFIX,
	type CursorPiToolBridgeDiagnosticEvent,
	serializeCursorPiToolBridgeDiagnostic,
} from "./pi-tool-bridge-diagnostics.js";
import { resolveCursorPiToolBridgeConfig, type CursorPiToolBridgeConfig } from "./pi-tool-bridge-config.js";
import { bridgeToolExecutionAbortTracker } from "./pi-tool-bridge-abort.js";
import { isCursorPiBridgeToolCallId, MCP_SERVER_NAME } from "./pi-tool-bridge-constants.js";
import { LOOPBACK_HOST, CursorPiToolBridgeRegistry } from "./pi-tool-bridge-server.js";
import type {
	CursorPiToolBridge,
	CursorPiToolBridgeExtensionApi,
	CursorPiToolBridgeSnapshotApi,
} from "./pi-tool-bridge-types.js";

export type {
	CursorPiBridgeToolDefinition,
	CursorPiBridgeToolRequest,
	CursorPiMcpInputSchema,
	CursorPiToolBridge,
	CursorPiToolBridgeExtensionApi,
	CursorPiToolBridgeRun,
	CursorPiToolBridgeRunOptions,
	CursorPiToolBridgeSnapshot,
	CursorPiToolBridgeSnapshotApi,
	CursorPiToolBridgeSnapshotOptions,
} from "./pi-tool-bridge-types.js";
export type { CursorPiToolBridgeDiagnosticEvent } from "./pi-tool-bridge-diagnostics.js";
export { resolveCursorPiToolBridgeConfig } from "./pi-tool-bridge-config.js";
export {
	buildCursorPiToolBridgeSnapshot,
	buildCursorPiToolBridgeSurfaceSignature,
} from "./pi-tool-bridge-snapshot.js";

let registeredCursorPiToolBridge: CursorPiToolBridgeRegistry | undefined;

const WINDOWS_BRIDGE_ABORT_ENV = "PI_CURSOR_BRIDGE_TOOL_CALL_ID";

function buildWindowsBridgeBashAbortCommand(command: string, marker: string): string {
	return `export ${WINDOWS_BRIDGE_ABORT_ENV}=${marker}; ${command}`;
}

function installWindowsBridgeBashAbortMarker(event: { toolCallId: string; toolName: string; input: unknown }): string | undefined {
	if (process.platform !== "win32" || event.toolName !== "bash") return undefined;
	if (typeof event.input !== "object" || event.input === null || !("command" in event.input)) return undefined;
	const input = event.input as { command?: unknown };
	if (typeof input.command !== "string" || input.command.length === 0) return undefined;
	const marker = event.toolCallId.replace(/[^A-Za-z0-9_.:-]/g, "_");
	input.command = buildWindowsBridgeBashAbortCommand(input.command, marker);
	return marker;
}

function killWindowsBridgeBashMarkerTree(marker: string | undefined): void {
	if (process.platform !== "win32" || !marker) return;
	const encodedMarker = Buffer.from(marker, "utf8").toString("base64");
	const script = `
$marker = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedMarker}'))
$needle = '${WINDOWS_BRIDGE_ABORT_ENV}=' + $marker
$seen = @{}
function Stop-Tree([int]$ProcessId) {
  if ($seen.ContainsKey($ProcessId)) { return }
  $seen[$ProcessId] = $true
  Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $ProcessId } | ForEach-Object { Stop-Tree $_.ProcessId }
  Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}
Get-CimInstance Win32_Process -Filter "Name = 'bash.exe' OR Name = 'sh.exe'" |
  Where-Object { $_.CommandLine -and $_.CommandLine.Contains($needle) } |
  ForEach-Object { Stop-Tree $_.ProcessId }
`;
	spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
		stdio: "ignore",
		timeout: 3_000,
		windowsHide: true,
	});
}

function attachCursorPiToolBridgeHandlers(
	pi: CursorPiToolBridgeExtensionApi,
	bridge: CursorPiToolBridgeRegistry,
	options: { abortAllOnShutdown: boolean; isActive: () => boolean },
): void {
	pi.on("tool_call", (event, ctx) => {
		if (!options.isActive()) return undefined;
		if (!bridge.hasPendingPiToolCallId(event.toolCallId)) {
			return isCursorPiBridgeToolCallId(event.toolCallId)
				? { block: true, reason: "Cursor pi bridge tool call is no longer pending" }
				: undefined;
		}
		const windowsAbortMarker = installWindowsBridgeBashAbortMarker(event);
		const trackingStarted = bridgeToolExecutionAbortTracker.track(event.toolCallId, {
			signal: ctx.signal,
			abort: () => {
				ctx.abort();
				killWindowsBridgeBashMarkerTree(windowsAbortMarker);
			},
			cancelPending: (reason) => {
				bridge.cancelPendingPiToolCallId(event.toolCallId, reason);
			},
		});
		if (trackingStarted) return undefined;
		return { block: true, reason: "Cursor pi bridge tool execution was aborted before it started" };
	});
	pi.on("tool_result", (event) => {
		bridgeToolExecutionAbortTracker.finish(event.toolCallId);
	});
	pi.on("session_shutdown", async (event) => {
		const reason = `Cursor pi tool bridge session shutdown: ${event.reason}`;
		if (options.abortAllOnShutdown) bridgeToolExecutionAbortTracker.abortAll(reason);
		await bridge.disposeAll(reason);
	});
}

export function registerCursorPiToolBridge(
	pi: CursorPiToolBridgeExtensionApi,
	config: CursorPiToolBridgeConfig = resolveCursorPiToolBridgeConfig(),
): CursorPiToolBridge {
	// Replacing a bridge during a live MCP run cancels its pending pi tool
	// calls. Keep the active registry as a final safety belt.
	if (registeredCursorPiToolBridge?.hasLiveRuns()) {
		return registeredCursorPiToolBridge;
	}
	bridgeToolExecutionAbortTracker.abortAll("Cursor pi tool bridge extension reloaded");
	void registeredCursorPiToolBridge?.disposeAll("Cursor pi tool bridge extension reloaded");
	const bridge = new CursorPiToolBridgeRegistry(pi, config);
	registeredCursorPiToolBridge = bridge;
	attachCursorPiToolBridgeHandlers(pi, bridge, {
		abortAllOnShutdown: true,
		isActive: () => registeredCursorPiToolBridge === bridge,
	});
	return bridge;
}

/** Register a bridge owned only by one nested in-process child session. */
export function registerNestedCursorPiToolBridge(
	pi: CursorPiToolBridgeExtensionApi,
	config: CursorPiToolBridgeConfig = resolveCursorPiToolBridgeConfig(),
): CursorPiToolBridge {
	const bridge = new CursorPiToolBridgeRegistry(pi, config);
	attachCursorPiToolBridgeHandlers(pi, bridge, {
		abortAllOnShutdown: false,
		isActive: () => true,
	});
	return bridge;
}

export function getRegisteredCursorPiToolBridge(): CursorPiToolBridge | undefined {
	return registeredCursorPiToolBridge;
}

export const __testUtils = {
	CURSOR_PI_TOOL_BRIDGE_DIAGNOSTIC_PREFIX,
	LOOPBACK_HOST,
	MCP_SERVER_NAME,
	createRegistry(
		pi: CursorPiToolBridgeSnapshotApi,
		overrides: Partial<CursorPiToolBridgeConfig> = {},
	) {
		const defaults = resolveCursorPiToolBridgeConfig({});
		return new CursorPiToolBridgeRegistry(pi, {
			...defaults,
			...overrides,
			debug: { ...defaults.debug, ...overrides.debug },
		});
	},
	getRegisteredBridgeForTests() {
		return registeredCursorPiToolBridge;
	},
	serializeDiagnosticForTests(event: CursorPiToolBridgeDiagnosticEvent) {
		return serializeCursorPiToolBridgeDiagnostic(event);
	},
	getActiveBridgeToolExecutionAbortCount() {
		return bridgeToolExecutionAbortTracker.getActiveCount();
	},
	buildWindowsBridgeBashAbortCommandForTests: buildWindowsBridgeBashAbortCommand,
	installWindowsBridgeBashAbortMarkerForTests: installWindowsBridgeBashAbortMarker,
	emitBridgeToolExecutionProcessAbortSignalForTests(signal: NodeJS.Signals) {
		bridgeToolExecutionAbortTracker.emitProcessAbortSignalForTests(signal);
	},
	resetRegisteredBridgeForTests() {
		bridgeToolExecutionAbortTracker.abortAll("Cursor pi tool bridge test reset");
		const bridge = registeredCursorPiToolBridge;
		registeredCursorPiToolBridge = undefined;
		return bridge?.disposeAll("Cursor pi tool bridge test reset") ?? Promise.resolve();
	},
};
