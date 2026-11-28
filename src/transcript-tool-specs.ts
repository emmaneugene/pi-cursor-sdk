import {
	CURSOR_KNOWN_NORMALIZED_TOOL_NAMES,
	CURSOR_REPLAY_ACTIVITY_TOOL_NAME,
	getCursorReplayCallSummary,
	getCursorToolActivityTitle,
	getCursorToolActivityReplaySpec,
	getCursorToolGenerateImageReplaySpec,
	type CursorNormalizedToolName,
	type CursorReplayActivityToolName,
} from "./tool-presentation-registry.js";
import {
	assembleCursorReplayActivityDetails,
	assembleCursorReplayGenerateImageDetails,
	CURSOR_REPLAY_UNREGISTERED_ACTIVITY_TOOL_NAME,
	type CursorReplayToolDetails,
} from "./replay-tool-details.js";
import {
	firstNonEmptyLine,
	formatError,
	limitText,
	truncateArg,
	type CursorPiToolDisplay,
	type NormalizedResult,
	type PiToolDisplayResult,
	type TranscriptOptions,
} from "./transcript-utils.js";
import {
	buildFindDisplayArgs,
	buildGrepDisplayArgs,
	buildReadDisplayArgs,
	buildShellDisplayArgs,
	formatDelete,
	formatEdit,
	formatFallback,
	formatGenerateImage,
	formatGlob,
	formatGrep,
	formatLs,
	formatMcp,
	formatWebFetch,
	formatWebSearch,
	formatPlan,
	formatRecordScreen,
	formatResolvedEdit,
	formatResolvedWrite,
	formatSemSearch,
	formatRead,
	formatReadLints,
	formatShell,
	formatTask,
	formatTodos,
	formatWrite,
	formatNativeReadDisplayContent,
	getGlobBody,
	getGrepBody,
	getLsBody,
	getShellOutput,
	resolveEditDisplay,
	resolveReadContent,
	resolveWriteDisplay,
} from "./transcript-tool-formatters.js";
export interface ToolDisplayContext {
	rawName: string;
	name: string;
	args: Record<string, unknown>;
	result: NormalizedResult;
	options: TranscriptOptions;
}

type NeutralActivityReplayToolName = Exclude<CursorReplayActivityToolName, "edit" | "write" | "generateImage">;

interface ToolDisplaySpec {
	formatTranscript: (context: ToolDisplayContext) => string;
	buildPiToolDisplay: (context: ToolDisplayContext) => CursorPiToolDisplay;
}

function textToolResult(text: string, details?: unknown): PiToolDisplayResult {
	return { content: [{ type: "text", text }], details };
}

function buildCursorActivityDisplayArgs(
	args: Record<string, unknown>,
	activityTitle: string,
	activitySummary: string | undefined,
): Record<string, unknown> {
	const trimmedSummary = activitySummary?.trim();
	return {
		...args,
		activityTitle,
		...(trimmedSummary ? { activitySummary: trimmedSummary } : {}),
	};
}

function buildReplaySummaryDisplay(
	toolName: string,
	args: Record<string, unknown>,
	result: NormalizedResult,
	contentText: string,
	details: CursorReplayToolDetails,
): CursorPiToolDisplay {
	const isError = result.status === "error";
	const expandedText = details.expandedText ?? contentText;
	const summary = details.summary;
	return {
		toolName,
		args,
		result: textToolResult(contentText, {
			...details,
			summary,
			expandedText,
		}),
		isError,
	};
}

function buildActivityReplayDisplay(
	sourceToolName: NeutralActivityReplayToolName,
	context: ToolDisplayContext,
): CursorPiToolDisplay {
	const spec = TOOL_DISPLAY_IMPLEMENTATIONS[sourceToolName];
	const activity = getCursorToolActivityReplaySpec(sourceToolName);
	if (!activity) throw new Error(`Missing activity replay spec for ${sourceToolName}`);
	const activityTitle = getCursorToolActivityTitle(sourceToolName);
	const replayArgs = activity.buildActivityArgs(context);
	const activitySummary = getCursorReplayCallSummary(sourceToolName, replayArgs);
	const activityArgs = buildCursorActivityDisplayArgs({ ...replayArgs }, activityTitle, activitySummary);
	const contentText = spec.formatTranscript(context).trimEnd();
	const activityFields = activity.buildDetails(context, contentText);
	const details = assembleCursorReplayActivityDetails(
		sourceToolName,
		activityTitle,
		activityFields,
		contentText,
		context.result.status === "error",
		activitySummary,
	);
	return buildReplaySummaryDisplay(CURSOR_REPLAY_ACTIVITY_TOOL_NAME, activityArgs, context.result, contentText, details);
}

function buildGenerateImageReplayDisplay(context: ToolDisplayContext): CursorPiToolDisplay {
	const spec = TOOL_DISPLAY_IMPLEMENTATIONS.generateImage;
	const replay = getCursorToolGenerateImageReplaySpec("generateImage");
	if (!replay) throw new Error("Missing generate image replay spec");
	const activityTitle = getCursorToolActivityTitle("generateImage");
	const replayArgs = replay.buildActivityArgs(context);
	const activitySummary = getCursorReplayCallSummary("generateImage", replayArgs);
	const activityArgs = buildCursorActivityDisplayArgs({ ...replayArgs }, activityTitle, activitySummary);
	const contentText = spec.formatTranscript(context).trimEnd();
	const details = assembleCursorReplayGenerateImageDetails(
		replay.buildDetails(context, contentText),
		contentText,
		context.result.status === "error",
		activitySummary,
	);
	return buildReplaySummaryDisplay(CURSOR_REPLAY_ACTIVITY_TOOL_NAME, activityArgs, context.result, contentText, details);
}

function buildGenericPiToolDisplay(context: ToolDisplayContext): CursorPiToolDisplay {
	const { rawName, name, args, result, options } = context;
	const displayName = rawName.trim() || name;
	const activityTitle = getCursorToolActivityTitle(displayName);
	const contentText = formatFallback(name, args, result, options);
	const fallbackBody = contentText.includes("\n\n") ? contentText.slice(contentText.indexOf("\n\n") + 2) : "";
	const activitySummary =
		result.status === "error" ? undefined : firstNonEmptyLine(fallbackBody);
	const activityArgs = buildCursorActivityDisplayArgs({}, activityTitle, activitySummary);
	const summary =
		result.status === "error"
			? undefined
			: activitySummary ?? truncateArg(displayName === "unknown" ? "tool" : displayName);
	return buildReplaySummaryDisplay(
		CURSOR_REPLAY_ACTIVITY_TOOL_NAME,
		activityArgs,
		result,
		contentText,
		assembleCursorReplayActivityDetails(
			CURSOR_REPLAY_UNREGISTERED_ACTIVITY_TOOL_NAME,
			activityTitle,
			{ summary, expandedText: contentText },
			contentText,
			result.status === "error",
			activitySummary,
		),
	);
}

function buildEditActivitySummary(
	displayPath: string | undefined,
	linesAdded: number | undefined,
	linesRemoved: number | undefined,
): string | undefined {
	const path = displayPath ?? "replayed";
	const parts = [
		linesAdded ? `added ${linesAdded} line${linesAdded === 1 ? "" : "s"}` : undefined,
		linesRemoved ? `removed ${linesRemoved} line${linesRemoved === 1 ? "" : "s"}` : undefined,
	].filter((part): part is string => Boolean(part));
	if (parts.length > 0) return `${path} ${parts.join(", ")}`;
	return path;
}

function buildEditPiToolDisplay(context: ToolDisplayContext): CursorPiToolDisplay {
	const { rawName, args, result, options } = context;
	const resolved = resolveEditDisplay(rawName, args, result, options);
	const contentText = formatResolvedEdit(resolved, result, options);
	if (resolved.target === "native") {
		const details: CursorReplayToolDetails = {
			variant: "nativeEdit",
			path: resolved.displayPath,
			linesAdded: resolved.linesAdded,
			linesRemoved: resolved.linesRemoved,
			diffString: resolved.normalizedDiff,
			diff: resolved.normalizedDiff,
			firstChangedLine: resolved.firstChangedLine,
		};
		return {
			toolName: "edit",
			args: resolved.nativeArgs,
			result: textToolResult(contentText, details),
			isError: resolved.isError,
		};
	}
	const activityTitle = getCursorToolActivityTitle("edit");
	const activityArgs = buildCursorActivityDisplayArgs(resolved.activityBaseArgs, activityTitle, resolved.displayPath);
	const trimmedContent = contentText.trimEnd();
	return buildReplaySummaryDisplay(
		CURSOR_REPLAY_ACTIVITY_TOOL_NAME,
		activityArgs,
		result,
		trimmedContent,
		assembleCursorReplayActivityDetails(
			"edit",
			activityTitle,
			{
				path: resolved.displayPath,
				summary: resolved.isError
					? undefined
					: buildEditActivitySummary(resolved.displayPath, resolved.linesAdded, resolved.linesRemoved),
				expandedText: trimmedContent,
				diffString: resolved.normalizedDiff,
				diff: resolved.normalizedDiff,
				linesAdded: resolved.linesAdded,
				linesRemoved: resolved.linesRemoved,
			},
			trimmedContent,
			resolved.isError,
			resolved.displayPath,
		),
	);
}

function buildWritePiToolDisplay(context: ToolDisplayContext): CursorPiToolDisplay {
	const { args, result, options } = context;
	const resolved = resolveWriteDisplay(args, result, options);
	const contentText = formatResolvedWrite(resolved, result, options).trimEnd();
	if (resolved.target === "activity") {
		const activityTitle = getCursorToolActivityTitle("write");
		const fallbackSummary = resolved.displayPath ?? "file";
		return buildReplaySummaryDisplay(
			CURSOR_REPLAY_ACTIVITY_TOOL_NAME,
			buildCursorActivityDisplayArgs(resolved.displayArgs, activityTitle, fallbackSummary),
			result,
			contentText,
			assembleCursorReplayActivityDetails(
				"write",
				activityTitle,
				{
					path: resolved.displayPath,
					summary: resolved.isError ? undefined : resolved.displayPath ?? "wrote file",
					expandedText: contentText,
					fileContentAfterWrite: resolved.fileContentAfterWrite,
				},
				contentText,
				resolved.isError,
				fallbackSummary,
			),
		);
	}
	const details: CursorReplayToolDetails = {
		variant: "nativeWrite",
		path: resolved.displayPath,
		linesCreated: resolved.linesCreated,
		fileSize: resolved.fileSize,
		fileContentAfterWrite: resolved.fileContentAfterWrite,
		expandedText: contentText,
	};
	return {
		toolName: "write",
		args: resolved.displayArgs,
		result: textToolResult(contentText, details),
		isError: resolved.isError,
	};
}

const TOOL_DISPLAY_IMPLEMENTATIONS: Record<CursorNormalizedToolName, ToolDisplaySpec> = {
	read: {
		formatTranscript: ({ args, result, options }) => formatRead(args, result, options),
		buildPiToolDisplay: ({ args, result, options }) => {
			if (result.status === "error") {
				return {
					toolName: "read",
					args: buildReadDisplayArgs(args, options),
					result: textToolResult(formatError(result.error)),
					isError: true,
				};
			}
			const resolved = resolveReadContent(args, result, options);
			const isLocalPreview = resolved.source === "local-preview";
			return {
				toolName: "read",
				args: buildReadDisplayArgs(args, options, isLocalPreview),
				result: textToolResult(
					formatNativeReadDisplayContent(resolved, options),
					isLocalPreview ? { localReadPreview: true } : undefined,
				),
				isError: false,
			};
		},
	},
	shell: {
		formatTranscript: ({ args, result, options }) => formatShell(args, result, options),
		buildPiToolDisplay: ({ args, result, options }) => {
			const shellOutput = getShellOutput(result, args);
			const isError = result.status === "error" || shellOutput.timedOut || (shellOutput.exitCode !== undefined && shellOutput.exitCode !== 0);
			return {
				toolName: "bash",
				args: buildShellDisplayArgs(args),
				result: textToolResult(result.status === "error" ? formatError(result.error) : limitText(shellOutput.text, options)),
				isError,
			};
		},
	},
	grep: {
		formatTranscript: ({ args, result, options }) => formatGrep(args, result, options),
		buildPiToolDisplay: ({ args, result, options }) => {
			const isError = result.status === "error";
			return {
				toolName: "grep",
				args: buildGrepDisplayArgs(args, options),
				result: textToolResult(isError ? formatError(result.error) : getGrepBody(result, options)),
				isError,
			};
		},
	},
	glob: {
		formatTranscript: ({ args, result, options }) => formatGlob(args, result, options),
		buildPiToolDisplay: ({ args, result, options }) => {
			const isError = result.status === "error";
			return {
				toolName: "find",
				args: buildFindDisplayArgs(args, options),
				result: textToolResult(isError ? formatError(result.error) : getGlobBody(result, options)),
				isError,
			};
		},
	},
	ls: {
		formatTranscript: ({ args, result, options }) => formatLs(args, result, options),
		buildPiToolDisplay: ({ args, result, options }) => ({
			toolName: "ls",
			args,
			result: textToolResult(result.status === "error" ? formatError(result.error) : getLsBody(result, options).trim()),
			isError: result.status === "error",
		}),
	},
	edit: {
		formatTranscript: ({ args, result, options }) => formatEdit(args, result, options),
		buildPiToolDisplay: buildEditPiToolDisplay,
	},
	write: {
		formatTranscript: ({ args, result, options }) => formatWrite(args, result, options),
		buildPiToolDisplay: buildWritePiToolDisplay,
	},
	delete: {
		formatTranscript: ({ args, result, options }) => formatDelete(args, result, options),
		buildPiToolDisplay: (context) => buildActivityReplayDisplay("delete", context),
	},
	readLints: {
		formatTranscript: ({ args, result, options }) => formatReadLints(args, result, options),
		buildPiToolDisplay: (context) => buildActivityReplayDisplay("readLints", context),
	},
	updateTodos: {
		formatTranscript: ({ args, result, options }) => formatTodos(args, result, options, "updateTodos"),
		buildPiToolDisplay: (context) => buildActivityReplayDisplay("updateTodos", context),
	},
	createPlan: {
		formatTranscript: ({ args, result, options }) => formatPlan(args, result, options),
		buildPiToolDisplay: (context) => buildActivityReplayDisplay("createPlan", context),
	},
	task: {
		formatTranscript: ({ args, result, options }) => formatTask(args, result, options),
		buildPiToolDisplay: (context) => buildActivityReplayDisplay("task", context),
	},
	generateImage: {
		formatTranscript: ({ args, result, options }) => formatGenerateImage(args, result, options),
		buildPiToolDisplay: (context) => buildGenerateImageReplayDisplay(context),
	},
	mcp: {
		formatTranscript: ({ args, result, options }) => formatMcp(args, result, options),
		buildPiToolDisplay: (context) => buildActivityReplayDisplay("mcp", context),
	},
	semSearch: {
		formatTranscript: ({ args, result, options }) => formatSemSearch(args, result, options),
		buildPiToolDisplay: (context) => buildActivityReplayDisplay("semSearch", context),
	},
	recordScreen: {
		formatTranscript: ({ args, result, options }) => formatRecordScreen(args, result, options),
		buildPiToolDisplay: (context) => buildActivityReplayDisplay("recordScreen", context),
	},
	webSearch: {
		formatTranscript: ({ args, result, options }) => formatWebSearch(args, result, options),
		buildPiToolDisplay: (context) => buildActivityReplayDisplay("webSearch", context),
	},
	webFetch: {
		formatTranscript: ({ args, result, options }) => formatWebFetch(args, result, options),
		buildPiToolDisplay: (context) => buildActivityReplayDisplay("webFetch", context),
	},
};

export const CURSOR_TOOL_DISPLAY_SPEC_KEYS = CURSOR_KNOWN_NORMALIZED_TOOL_NAMES;

function getToolDisplaySpec(name: string): ToolDisplaySpec | undefined {
	if (Object.hasOwn(TOOL_DISPLAY_IMPLEMENTATIONS, name)) return TOOL_DISPLAY_IMPLEMENTATIONS[name as CursorNormalizedToolName];
	return undefined;
}

export function formatCursorToolTranscriptFromSpec(context: ToolDisplayContext): string {
	const spec = getToolDisplaySpec(context.name);
	if (spec) return spec.formatTranscript(context);
	return formatFallback(context.name, context.args, context.result, context.options);
}

export function buildCursorPiToolDisplayFromSpec(context: ToolDisplayContext): CursorPiToolDisplay {
	const spec = getToolDisplaySpec(context.name);
	if (spec) return spec.buildPiToolDisplay(context);
	return buildGenericPiToolDisplay(context);
}
