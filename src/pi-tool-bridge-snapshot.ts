import type {
	CursorPiBridgeToolDefinition,
	CursorPiToolBridgeSnapshot,
	CursorPiToolBridgeSnapshotApi,
	CursorPiToolBridgeSnapshotOptions,
} from "./pi-tool-bridge-types.js";
import { createMcpToolName, normalizeMcpInputSchema, stableNameHash } from "./pi-tool-bridge-mcp.js";
import { canRenderCursorToolNatively } from "./native-tool-display-state.js";
import { isExcludedFromCursorBridgeExposure } from "./tool-presentation-registry.js";

const OVERLAPPING_CURSOR_NATIVE_PI_BUILTIN_TOOL_NAMES = new Set(["read", "bash", "write", "edit", "grep", "find", "ls"]);

export function createEmptySnapshot(): CursorPiToolBridgeSnapshot {
	return {
		tools: [],
		mcpToolNameToPiToolName: new Map(),
	};
}

function isOverlappingCursorNativePiToolName(toolName: string): boolean {
	return OVERLAPPING_CURSOR_NATIVE_PI_BUILTIN_TOOL_NAMES.has(toolName);
}

export function buildCursorPiToolBridgeSurfaceSignature(snapshot: CursorPiToolBridgeSnapshot): string {
	if (snapshot.tools.length === 0) return "bridge:empty";
	const serializedTools = snapshot.tools
		.map((tool) =>
			JSON.stringify({
				piToolName: tool.piToolName,
				mcpToolName: tool.mcpToolName,
				description: tool.description,
				promptGuidelines: tool.promptGuidelines,
				inputSchema: tool.inputSchema,
				source: tool.sourceInfo?.source,
				path: tool.sourceInfo?.path,
				scope: tool.sourceInfo?.scope,
			}),
		)
		.sort()
		.join("\0");
	return `bridge:on:${stableNameHash(serializedTools)}`;
}

export function buildCursorPiToolBridgeSnapshot(
	pi: CursorPiToolBridgeSnapshotApi,
	options: CursorPiToolBridgeSnapshotOptions = {},
): CursorPiToolBridgeSnapshot {
	const activeToolNames = new Set(pi.getActiveTools());
	const allTools = pi.getAllTools();
	const usedMcpToolNames = new Set<string>();
	const mcpToolNameToPiToolName = new Map<string, string>();
	const tools: CursorPiBridgeToolDefinition[] = [];

	const exposeOverlappingBuiltins = options.exposeOverlappingBuiltins === true;

	for (const tool of allTools) {
		if (!activeToolNames.has(tool.name)) continue;
		if (options.excludedToolNames?.has(tool.name)) continue;
		if (isExcludedFromCursorBridgeExposure(tool.name) && canRenderCursorToolNatively(tool.name)) continue;
		if (!exposeOverlappingBuiltins && isOverlappingCursorNativePiToolName(tool.name)) continue;

		const mcpToolName = createMcpToolName(tool.name, usedMcpToolNames);
		const description = tool.description || `Run pi tool ${tool.name}`;
		mcpToolNameToPiToolName.set(mcpToolName, tool.name);
		tools.push({
			piToolName: tool.name,
			mcpToolName,
			description,
			promptGuidelines: tool.promptGuidelines,
			inputSchema: normalizeMcpInputSchema(tool.parameters),
			sourceInfo: tool.sourceInfo,
		});
	}

	return { tools, mcpToolNameToPiToolName };
}
