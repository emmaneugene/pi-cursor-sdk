import {
	createBashToolDefinition,
	createEditToolDefinition,
	createFindToolDefinition,
	createGrepToolDefinition,
	createLsToolDefinition,
	createReadToolDefinition,
	createWriteToolDefinition,
	type ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type, type TSchema } from "typebox";
import { getCursorSessionCwd } from "./session-scope.js";
import {
	isCursorReplayToolName,
	type BuiltinNativeCursorToolName,
	type CursorReplayToolName,
	type NativeCursorToolName,
} from "./tool-presentation-registry.js";
import {
	isCursorReplayNativeEditDetails,
	isCursorReplayNativeWriteDetails,
	parseCursorReplayToolDetails,
} from "./replay-tool-details.js";
import {
	renderCursorReplayCall,
	renderCursorReplayResult,
	renderNativeLookingCursorFileMutationCall,
	renderNativeLookingCursorReadReplayResult,
} from "./native-tool-display-replay.js";
import {
	consumeCursorNativeToolDisplay,
	isCursorReplayToolCallId,
} from "./native-tool-display-state.js";

export const cursorReplayToolSchema = Type.Object({}, { additionalProperties: true });

type AnyToolDefinition = ToolDefinition<TSchema, unknown, unknown>;
type RenderCall = NonNullable<AnyToolDefinition["renderCall"]>;
type RenderResult = NonNullable<AnyToolDefinition["renderResult"]>;

type NativeReplayStrategy = {
	createDefinition: (cwd: string) => AnyToolDefinition;
	missingReplayPolicy?: "block-file-mutation";
	renderReplayCall?: (
		args: Parameters<RenderCall>[0],
		theme: Parameters<RenderCall>[1],
		context: Parameters<RenderCall>[2],
		renderBase: () => ReturnType<RenderCall>,
	) => ReturnType<RenderCall>;
	renderReplayResult?: (
		result: Parameters<RenderResult>[0],
		options: Parameters<RenderResult>[1],
		theme: Parameters<RenderResult>[2],
		context: Parameters<RenderResult>[3],
		renderBase: () => ReturnType<RenderResult>,
	) => ReturnType<RenderResult>;
};

function emptyText(): Text {
	return new Text("", 0, 0);
}

function renderReadReplayCall(
	args: Parameters<RenderCall>[0],
	theme: Parameters<RenderCall>[1],
	context: Parameters<RenderCall>[2],
	renderBase: () => ReturnType<RenderCall>,
): ReturnType<RenderCall> {
	const rendered = renderBase();
	if ((args as Record<string, unknown>).localReadPreview !== true || context.expanded) return rendered;
	const baseText = rendered.render(120).join("\n").trimEnd();
	const labeled = `${baseText}${theme.fg("muted", " · local file preview")}`;
	if (rendered instanceof Text) {
		rendered.setText(labeled);
		return rendered;
	}
	return new Text(labeled, 0, 0);
}

function renderFileMutationReplayResult(
	matches: (details: NonNullable<ReturnType<typeof parseCursorReplayToolDetails>>) => boolean,
): NonNullable<NativeReplayStrategy["renderReplayResult"]> {
	return (result, options, theme, context, renderBase) => {
		const details = parseCursorReplayToolDetails(result.details);
		return details && matches(details)
			? renderCursorReplayResult(result, options, theme, context, context.isError, details)
			: renderBase();
	};
}

const NATIVE_CURSOR_TOOL_STRATEGIES: Record<BuiltinNativeCursorToolName, NativeReplayStrategy> = {
	read: {
		createDefinition: (cwd) => createReadToolDefinition(cwd) as AnyToolDefinition,
		renderReplayCall: renderReadReplayCall,
		renderReplayResult: renderNativeLookingCursorReadReplayResult,
	},
	bash: { createDefinition: (cwd) => createBashToolDefinition(cwd) as AnyToolDefinition },
	edit: {
		createDefinition: (cwd) => createEditToolDefinition(cwd) as AnyToolDefinition,
		missingReplayPolicy: "block-file-mutation",
		renderReplayCall: (args, theme, context) =>
			renderNativeLookingCursorFileMutationCall("edit", args as Record<string, unknown>, theme, context.isPartial),
		renderReplayResult: renderFileMutationReplayResult(isCursorReplayNativeEditDetails),
	},
	write: {
		createDefinition: (cwd) => createWriteToolDefinition(cwd) as AnyToolDefinition,
		missingReplayPolicy: "block-file-mutation",
		renderReplayCall: (args, theme, context) =>
			renderNativeLookingCursorFileMutationCall("write", args as Record<string, unknown>, theme, context.isPartial),
		renderReplayResult: renderFileMutationReplayResult(isCursorReplayNativeWriteDetails),
	},
	grep: { createDefinition: (cwd) => createGrepToolDefinition(cwd) as AnyToolDefinition },
	find: { createDefinition: (cwd) => createFindToolDefinition(cwd) as AnyToolDefinition },
	ls: { createDefinition: (cwd) => createLsToolDefinition(cwd) as AnyToolDefinition },
};

function getNativeReplayStrategy(toolName: string): NativeReplayStrategy | undefined {
	return Object.hasOwn(NATIVE_CURSOR_TOOL_STRATEGIES, toolName)
		? NATIVE_CURSOR_TOOL_STRATEGIES[toolName as BuiltinNativeCursorToolName]
		: undefined;
}

export function wrapNativeCursorTool<TParams extends TSchema, TDetails, TState>(
	definition: ToolDefinition<TParams, TDetails, TState>,
	getCurrentDefinition: () => ToolDefinition<TParams, TDetails, TState>,
): ToolDefinition<TParams, TDetails, TState> {
	const strategy = getNativeReplayStrategy(definition.name);
	return {
		...definition,
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const cursorDisplay = consumeCursorNativeToolDisplay(toolCallId);
			if (cursorDisplay) {
				if (cursorDisplay.isError) {
					const text = cursorDisplay.result.content
						.map((entry) => (entry.type === "text" ? entry.text : undefined))
						.filter((entry): entry is string => Boolean(entry))
						.join("\n");
					throw new Error(text || "Cursor tool replay failed");
				}
				return {
					content: cursorDisplay.result.content,
					details: cursorDisplay.result.details as TDetails,
					terminate: cursorDisplay.terminate ?? true,
				};
			}
			if (strategy?.missingReplayPolicy === "block-file-mutation" && isCursorReplayToolCallId(toolCallId)) {
				throw new Error(`No recorded Cursor ${definition.name} result was available. This replay-only call does not execute file mutations.`);
			}
			return getCurrentDefinition().execute(toolCallId, params, signal, onUpdate, ctx);
		},
		renderCall(args, theme, context) {
			const currentRenderCall = getCurrentDefinition().renderCall;
			const renderBase = () => currentRenderCall?.(args, theme, context) ?? emptyText();
			const isReplayCall = typeof context.toolCallId === "string" && isCursorReplayToolCallId(context.toolCallId);
			if (isReplayCall && strategy?.renderReplayCall) {
				return strategy.renderReplayCall(args, theme, context, renderBase) as ReturnType<NonNullable<ToolDefinition<TParams, TDetails, TState>["renderCall"]>>;
			}
			return renderBase();
		},
		renderResult(result, options, theme, context) {
			const currentRenderResult = getCurrentDefinition().renderResult;
			const renderBase = () => currentRenderResult?.(result, options, theme, context) ?? emptyText();
			const isReplayCall = typeof context.toolCallId === "string" && isCursorReplayToolCallId(context.toolCallId);
			if (isReplayCall && strategy?.renderReplayResult) {
				return strategy.renderReplayResult(result, options, theme, context, renderBase) as ReturnType<NonNullable<ToolDefinition<TParams, TDetails, TState>["renderResult"]>>;
			}
			return renderBase();
		},
	};
}

export function createCursorReplayOnlyToolDefinition(
	toolName: CursorReplayToolName,
): ToolDefinition<typeof cursorReplayToolSchema, unknown> {
	return {
		name: toolName,
		label: "Cursor activity",
		description: "Display recorded Cursor SDK tool activity. This tool only returns recorded Cursor results and never executes work directly.",
		parameters: cursorReplayToolSchema,
		async execute() {
			throw new Error("No recorded Cursor activity result was available. This replay-only tool does not execute work directly.");
		},
		renderCall(args, theme, context) {
			return renderCursorReplayCall(toolName, args as Record<string, unknown>, theme, context.isPartial);
		},
		renderResult(result, options, theme, context) {
			return renderCursorReplayResult(result, options, theme, context, context.isError);
		},
	};
}

export function createNativeCursorToolDefinition(toolName: NativeCursorToolName, cwd: string): AnyToolDefinition {
	const strategy = getNativeReplayStrategy(toolName);
	if (strategy) return strategy.createDefinition(cwd);
	if (isCursorReplayToolName(toolName)) return createCursorReplayOnlyToolDefinition(toolName) as AnyToolDefinition;
	throw new Error(`Unsupported Cursor native replay tool: ${toolName}`);
}

export function registerNativeCursorTool(
	pi: Pick<import("@earendil-works/pi-coding-agent").ExtensionAPI, "registerTool">,
	toolName: NativeCursorToolName,
): void {
	if (isCursorReplayToolName(toolName)) {
		const definition = createCursorReplayOnlyToolDefinition(toolName) as AnyToolDefinition;
		pi.registerTool(wrapNativeCursorTool(definition, () => definition));
		return;
	}
	let cachedCwd = getCursorSessionCwd();
	let cachedDefinition = createNativeCursorToolDefinition(toolName, cachedCwd);
	pi.registerTool(wrapNativeCursorTool(cachedDefinition, () => {
		const nextCwd = getCursorSessionCwd();
		if (nextCwd !== cachedCwd) {
			cachedCwd = nextCwd;
			cachedDefinition = createNativeCursorToolDefinition(toolName, nextCwd);
		}
		return cachedDefinition;
	}));
}
