import { getFirstStringByKeys } from "./record-utils.js";
import {
	classifyCursorWebToolKind,
	getCursorReplayActivityTitle,
	getCursorToolVisibilityPolicy,
	normalizeCursorToolName as normalizeToolName,
} from "./tool-presentation-registry.js";
import { getToolArgs, getToolName } from "./transcript-utils.js";

function getMcpToolName(args: Record<string, unknown>): string | undefined {
	const toolName = getFirstStringByKeys(args, ["toolName", "tool_name"]);
	const trimmed = toolName?.trim();
	return trimmed || undefined;
}

/**
 * Maps SDK/host/MCP tool names to transcript display keys.
 * Web search/fetch often arrives as MCP `toolName` values, not dedicated SDK ToolTypes.
 */
export function resolveTranscriptToolName(rawName: string, args: Record<string, unknown>): string {
	const normalized = normalizeToolName(rawName);
	const directWebKind = classifyCursorWebToolKind(rawName) ?? classifyCursorWebToolKind(normalized);
	if (directWebKind) return directWebKind;
	if (normalized === "mcp") {
		const mcpWebKind = classifyCursorWebToolKind(getMcpToolName(args));
		if (mcpWebKind) return mcpWebKind;
	}
	return normalized;
}

export interface CursorToolVisibility {
	args: Record<string, unknown>;
	displayName: string;
	normalizedName: string;
	normalizedKey: string;
	activityTitle?: string;
	incompleteTitle?: string;
	lifecycleTitle?: string;
	lifecycleEligible: boolean;
}

export function getNormalizedCursorToolName(toolCall: unknown): string {
	return classifyCursorToolVisibility(toolCall).normalizedName;
}

export function classifyCursorToolVisibility(toolCall: unknown): CursorToolVisibility {
	const args = getToolArgs(toolCall);
	const displayName = resolveTranscriptToolName(getToolName(toolCall), args);
	const normalizedName = normalizeToolName(displayName);
	const normalizedKey = normalizedName.toLowerCase();
	const config = getCursorToolVisibilityPolicy(normalizedKey);
	const replayActivityTitle = getCursorReplayActivityTitle(normalizedName);
	return {
		args,
		displayName,
		normalizedName,
		normalizedKey,
		activityTitle: replayActivityTitle ?? config?.incompleteTitle ?? config?.lifecycleTitle,
		incompleteTitle: replayActivityTitle ?? config?.incompleteTitle,
		lifecycleTitle: replayActivityTitle ?? config?.lifecycleTitle,
		lifecycleEligible: config?.lifecycleEligible ?? false,
	};
}
