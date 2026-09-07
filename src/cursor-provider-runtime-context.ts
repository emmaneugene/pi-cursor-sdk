import type { CursorPiToolBridge } from "./cursor-pi-tool-bridge-types.js";

/** Runtime state captured by one nested in-process Cursor provider registration. */
export interface CursorProviderRuntimeContext {
	readonly scopeKey: string;
	readonly cwd: string;
	readonly sessionFile: string | undefined;
	readonly projectTrusted: boolean;
	readonly bridge: CursorPiToolBridge;
	readonly localResume: false;
	readonly nativeToolReplay: false;
	readonly disposeAgentAfterTurn: true;
}
