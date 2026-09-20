import { createHash, randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, toNamespacedPath } from "node:path";
import type { LocalAgentStore } from "@cursor/sdk";
import { loadCursorSdk } from "./sdk-runtime.js";

export interface CursorSessionStoreIdentity {
	readonly version: 1;
	readonly stateRoot: string;
}

export interface OpenCursorSessionStore {
	identity: CursorSessionStoreIdentity;
	store: LocalAgentStore;
	dispose(): Promise<void>;
}

export interface CursorSessionStoreSelection {
	sessionStore: OpenCursorSessionStore;
}

interface CursorSessionStoreSdkOperations {
	getDefaultStateRoot(cwd: string): string | Promise<string>;
	openSqliteStore(options: { workspaceRef: string; stateRoot: string }): Promise<LocalAgentStore & { dispose(): Promise<void> }>;
}

let sdkOperationsForTests: CursorSessionStoreSdkOperations | undefined;

export function hashCursorSessionStoreScope(scopeKey: string): string {
	return createHash("sha256")
		.update("pi-cursor-sdk-session-store\0")
		.update(scopeKey)
		.digest("hex")
		.slice(0, 32);
}

export function buildCursorSessionStateRoot(defaultStateRoot: string, scopeKey: string, persistent: boolean): string {
	const baseRoot = persistent ? defaultStateRoot : join(tmpdir(), `pi-cursor-sdk-${randomUUID()}`);
	return join(baseRoot, "pi-sessions", hashCursorSessionStoreScope(scopeKey));
}

async function getSdkOperations(): Promise<CursorSessionStoreSdkOperations> {
	if (sdkOperationsForTests) return sdkOperationsForTests;
	const [{ getDefaultSdkStateRoot }, { SqliteLocalAgentStore }] = await Promise.all([
		loadCursorSdk(),
		import("@cursor/sdk/sqlite"),
	]);
	return {
		getDefaultStateRoot: getDefaultSdkStateRoot,
		openSqliteStore: (options) => SqliteLocalAgentStore.open(options),
	};
}

export async function getCursorSessionStoreIdentities(
	cwd: string,
	scopeKey: string,
	persistent: boolean,
): Promise<{ defaultStore: CursorSessionStoreIdentity; sessionStore: CursorSessionStoreIdentity }> {
	const defaultStateRoot = await (await getSdkOperations()).getDefaultStateRoot(cwd);
	return {
		defaultStore: { version: 1, stateRoot: defaultStateRoot },
		sessionStore: {
			version: 1,
			stateRoot: buildCursorSessionStateRoot(defaultStateRoot, scopeKey, persistent),
		},
	};
}

async function openOwnedCursorSessionStore(
	cwd: string,
	identity: CursorSessionStoreIdentity,
	removalRoot?: string,
): Promise<OpenCursorSessionStore> {
	const openedIdentity = Object.freeze({ ...identity });
	let store: LocalAgentStore & { dispose(): Promise<void> };
	try {
		store = await (await getSdkOperations()).openSqliteStore({
			workspaceRef: cwd,
			stateRoot: toNamespacedPath(openedIdentity.stateRoot),
		});
	} catch (error) {
		if (removalRoot) await rm(removalRoot, { recursive: true, force: true }).catch(() => undefined);
		throw error;
	}
	return {
		identity: openedIdentity,
		store,
		dispose: async () => {
			try {
				await store.dispose();
			} finally {
				if (removalRoot) await rm(removalRoot, { recursive: true, force: true });
			}
		},
	};
}

export function openCursorSessionStore(
	cwd: string,
	identity: CursorSessionStoreIdentity,
): Promise<OpenCursorSessionStore> {
	return openOwnedCursorSessionStore(cwd, identity);
}

export async function openCursorSessionStoreForScope(options: {
	cwd: string;
	scopeKey: string;
	persistent: boolean;
}): Promise<CursorSessionStoreSelection> {
	const identities = await getCursorSessionStoreIdentities(options.cwd, options.scopeKey, options.persistent);
	const removalRoot = options.persistent ? undefined : dirname(dirname(identities.sessionStore.stateRoot));
	return {
		sessionStore: await openOwnedCursorSessionStore(options.cwd, identities.sessionStore, removalRoot),
	};
}

export const __testUtils = {
	setSdkOperations(operations: CursorSessionStoreSdkOperations | undefined): void {
		sdkOperationsForTests = operations;
	},
};
