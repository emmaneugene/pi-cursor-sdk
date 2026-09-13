import { loadCursorSdkUserConfig, type CursorSdkConfig } from "./cursor-config.js";
import { resolveCursorMcpToolTimeoutMs } from "./cursor-mcp-timeout-override.js";

export interface CursorPiToolBridgeConfig {
	enabled: boolean;
	exposeBuiltins: boolean;
	callTimeoutMs: number;
	debug: {
		stderr: boolean;
		file?: string;
	};
}

export function resolveCursorPiToolBridgeConfig(
	config: CursorSdkConfig = loadCursorSdkUserConfig(),
): CursorPiToolBridgeConfig {
	const bridge = config.tools?.bridge;
	const mcpToolTimeoutMs = resolveCursorMcpToolTimeoutMs(config);
	const configuredCallTimeoutMs = bridge?.callTimeoutMs;
	const callTimeoutMs = configuredCallTimeoutMs === undefined
		|| !Number.isFinite(configuredCallTimeoutMs)
		|| configuredCallTimeoutMs <= 0
		? mcpToolTimeoutMs
		: Math.min(Math.max(Math.trunc(configuredCallTimeoutMs), 1), mcpToolTimeoutMs);

	return {
		enabled: bridge?.enabled ?? true,
		exposeBuiltins: bridge?.exposeBuiltins ?? false,
		callTimeoutMs,
		debug: {
			stderr: bridge?.debug?.stderr ?? false,
			...(bridge?.debug?.file ? { file: bridge.debug.file } : {}),
		},
	};
}
