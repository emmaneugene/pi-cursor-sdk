export {
	CURSOR_SDK_EVENT_DEBUG_ENV_NAMES,
	CURSOR_SDK_EVENT_DEBUG_INTERNAL_ENV_NAMES,
	CURSOR_SDK_EVENT_DEBUG_INTERNAL_RUN_DIR_ENV,
	CURSOR_SDK_EVENT_DEBUG_INTERNAL_SESSION_DIR_ENV,
	CURSOR_SDK_EVENT_DEBUG_RUN_DIR_ENV,
	CURSOR_SDK_EVENT_DEBUG_SESSION_DIR_ENV,
	CURSOR_SDK_EVENT_DEBUG_STALE_PUBLIC_ENV_NAMES,
} from "../../shared/cursor-sdk-event-debug-env.mjs";

export declare const CURSOR_SDK_STALE_PUBLIC_ENV_NAMES: readonly string[];

export declare function sealedNodePath(nodePath?: string, envPath?: string): string;
export declare function clearCursorSdkEventDebugEnv<TEnv extends Record<string, string | undefined>>(env: TEnv): TEnv;
export declare function clearCursorSdkStalePublicEnv<TEnv extends Record<string, string | undefined>>(env: TEnv): TEnv;
export declare function writeCursorSdkUserConfig(agentDir: string, patch?: Record<string, unknown>): string;
export declare function writeCursorSdkEventDebugUserConfig(
	agentDir: string,
	sdkEvents?: { enabled?: boolean; directory?: string; stderr?: boolean },
): string;
export interface CursorSmokeUserConfigOptions {
	settingSources?: string | null;
	nativeToolDisplay?: boolean;
	registerNativeTools?: boolean;
	bridge?: boolean;
	exposeBuiltinTools?: boolean;
	bridgeDebug?: boolean;
	bridgeDebugFile?: string;
	localResume?: boolean;
	transport?: "default" | "http1";
	eventDebugDir?: string;
}
export declare function buildCursorSmokeUserConfig(options?: CursorSmokeUserConfigOptions): Record<string, unknown>;
export declare function buildCursorSmokeEnv(options?: CursorSmokeUserConfigOptions & {
	baseEnv?: Record<string, string | undefined>;
	nodePath?: string;
	term?: string;
	agentDir?: string;
}): Record<string, string | undefined>;
export declare function buildCursorSmokeEnvPlan(options?: CursorSmokeUserConfigOptions & {
	baseEnv?: Record<string, string | undefined>;
	nodePath?: string;
	term?: string;
	agentDir?: string;
}): {
	env: Record<string, string | undefined>;
	sealedPath: string;
	clearEnvNames: string[];
	envEntries: Array<[string, string]>;
	userConfig?: Record<string, unknown>;
};
