import { loadCursorSdkUserConfig, type CursorSdkConfig } from "./config.js";
import type { CursorPiToolBridgeSnapshot } from "./pi-tool-bridge-types.js";

/**
 * Representative @cursor/sdk@1.0.30 local-agent ToolType values; actual exposure can vary by run.
 * See docs/native-tool-replay.md#sdk-tooltype-replay-matrix.
 */
export const CURSOR_HOST_TOOL_MANIFEST_SUMMARY =
	"read/shell/search/edit/write and other host tools when Cursor exposes them";

export function resolveCursorToolManifestEnabled(config: CursorSdkConfig = loadCursorSdkUserConfig()): boolean {
	return config.tools?.manifest ?? true;
}

export function buildCursorToolManifestText(options: {
	bridgeSnapshot?: CursorPiToolBridgeSnapshot;
	/** When false, bridge is off via tools.bridge.enabled=false (not merely empty). */
	piBridgeEnabled?: boolean;
	includePiBridgeGuidance?: boolean;
} = {}): string {
	const piBridgeEnabled = options.piBridgeEnabled ?? true;
	const includePiBridgeGuidance = options.includePiBridgeGuidance !== false;
	const lines = [
		"Callable tool surfaces this run:",
		`- Cursor host/MCP: ${CURSOR_HOST_TOOL_MANIFEST_SUMMARY}; configured MCP depends on Cursor settings.`,
		"- Pi tool toggles affect pi tools/bridge exposure only; they do not disable Cursor host/configured MCP tools.",
	];
	const bridgeTools = includePiBridgeGuidance ? options.bridgeSnapshot?.tools ?? [] : [];
	if (includePiBridgeGuidance) {
		if (!piBridgeEnabled) {
			lines.push("- Pi bridge: disabled (tools.bridge.enabled=false).");
		} else if (bridgeTools.length === 0) {
			lines.push("- Pi bridge: no pi__* tools exposed this run.");
		} else {
			const names = [...bridgeTools.map((tool) => tool.mcpToolName)].sort().join(", ");
			lines.push(`- Pi bridge: call exposed pi__* MCP names (${names}); pi shows real pi names.`);
		}
	}
	lines.push("- Not callable: cursor-replay-* IDs, pi history names, transcript labels.");
	return lines.join("\n");
}
