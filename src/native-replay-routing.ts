import { getCurrentTools, normalizeContext, type Context } from "@earendil-works/pi-ai";
import { canRenderCursorToolNatively } from "./native-tool-display-state.js";

/** Tool names from the provider context snapshot at stream start (not live pi.getActiveTools()). */
export function getActiveContextToolNames(context: Context): ReadonlySet<string> | undefined {
	const hasSystemMessage = context.messages.some((message) => message.role === "system");
	// Legacy raw contexts can omit the tool snapshot. A normalized transcript's
	// system messages are authoritative, including an explicitly empty tool set.
	if (!hasSystemMessage && context.tools === undefined) return undefined;
	const tools = getCurrentTools(normalizeContext(context).messages);
	return new Set(tools.map((tool) => tool.name));
}

export type NativeReplayDisposition = "queue_replay" | "inactive_trace" | "transcript_trace";

export interface NativeReplayRoutingInput {
	toolName: string;
	useNativeToolReplay: boolean;
	activeToolNames?: ReadonlySet<string>;
	hasLiveRun: boolean;
}

export function isNativeToolActiveInContext(toolName: string, activeToolNames?: ReadonlySet<string>): boolean {
	return activeToolNames === undefined || activeToolNames.has(toolName);
}

/**
 * Canonical native replay routing for coordinator and live-run drain.
 * Extension resync (pi active tools) is separate; this uses context.tools snapshot only.
 */
export function resolveNativeReplayDisposition(input: NativeReplayRoutingInput): NativeReplayDisposition {
	if (!input.useNativeToolReplay || !canRenderCursorToolNatively(input.toolName)) {
		return "transcript_trace";
	}
	if (isNativeToolActiveInContext(input.toolName, input.activeToolNames) && input.hasLiveRun) {
		return "queue_replay";
	}
	if (!isNativeToolActiveInContext(input.toolName, input.activeToolNames)) {
		return "inactive_trace";
	}
	return "transcript_trace";
}

export function partitionNativeToolsByActiveContext<T extends { toolName: string }>(
	context: Context,
	tools: readonly T[],
): { active: T[]; inactive: T[] } {
	const activeToolNames = getActiveContextToolNames(context);
	if (!activeToolNames) return { active: [...tools], inactive: [] };
	const active: T[] = [];
	const inactive: T[] = [];
	for (const tool of tools) {
		if (activeToolNames.has(tool.toolName)) active.push(tool);
		else inactive.push(tool);
	}
	return { active, inactive };
}
