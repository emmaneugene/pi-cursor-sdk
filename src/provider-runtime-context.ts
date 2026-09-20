import type { CursorPiToolBridge } from "./pi-tool-bridge-types.js";

/** Runtime state captured by one nested in-process Cursor provider registration. */
export interface CursorProviderRuntimeContext {
	readonly scopeKey: string;
	readonly cwd: string;
	readonly sessionFile: string | undefined;
	readonly bridge: CursorPiToolBridge;
	readonly nativeToolReplay: false;
	readonly disposeAgentAfterTurn: true;
}
