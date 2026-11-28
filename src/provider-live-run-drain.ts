import {
	type Api,
	type AssistantMessage,
	type AssistantMessageEventStream,
	type Context,
	type JsonObject,
	type Model,
} from "@earendil-works/pi-ai";
import { scheduler } from "node:timers/promises";
import {
	CursorLiveRunAbortError,
	createCursorLiveRunCoordinator,
	hasTrailingUserMessagesAfterToolResults,
	type CursorLiveQueuedEvent,
	type CursorLiveRun,
} from "./live-run-coordinator.js";
import {
	deleteCursorNativeToolDisplay,
	recordCursorNativeToolDisplay,
	type CursorNativeToolDisplayItem,
} from "./native-tool-display-state.js";
import { type CursorPiBridgeToolRequest } from "./pi-tool-bridge.js";
import { CURSOR_LOCAL_AGENT_IDLE_MS, resetSessionCursorAgent } from "./session-agent.js";
import { applyCursorUsage } from "./usage-accounting.js";
import { CursorPartialContentEmitter } from "./partial-content-emitter.js";
import { trimCurrentTurnAlreadyEmittedCursorText } from "./run-final-text.js";
import { formatCursorSdkAbortMessage, resolveCursorSdkAbortCause } from "./provider-errors.js";
import { formatInactiveCursorReplayTrace } from "./native-replay-trace.js";
import { partitionNativeToolsByActiveContext } from "./native-replay-routing.js";
import type { CursorSdkEventDebugRecorder } from "./sdk-event-debug.js";

const CURSOR_NATIVE_REPLAY_TOOL_ID_PATTERN = /^(cursor-replay-\d+-\d+)-tool-\d+$/;

interface CursorLiveTurnState {
	emitter: CursorPartialContentEmitter;
	emittedText: string;
}
let cursorNativeReplayIdleDisposeMs = CURSOR_LOCAL_AGENT_IDLE_MS;

type CursorLiveRunDrainOutcome = "tool_use" | "stop" | "error" | "aborted";
type LiveRunPreSendOutcome = "stream_ended" | "continue_send";

function isLiveRunDisposed(run: CursorLiveRun): boolean {
	return run.status.kind === "disposed";
}

let cursorNativeReplayCounter = 0;

function toJsonObject(value: Record<string, unknown> | undefined): JsonObject {
	if (!value) return {};
	return JSON.parse(JSON.stringify(value)) as JsonObject;
}

export async function abandonSessionCursorAgent(scopeKey: string | undefined): Promise<void> {
	if (!scopeKey) return;
	await resetSessionCursorAgent(scopeKey);
}

export const cursorLiveRuns = createCursorLiveRunCoordinator({
	getIdleDisposeMs: () => cursorNativeReplayIdleDisposeMs,
	deleteNativeToolDisplay: deleteCursorNativeToolDisplay,
	abandonSessionAgent: (scopeKey) => abandonSessionCursorAgent(scopeKey),
});

export function createCursorNativeReplayId(): string {
	cursorNativeReplayCounter += 1;
	return `cursor-replay-${Date.now()}-${cursorNativeReplayCounter}`;
}

function getCursorNativeReplayIdFromToolCallId(toolCallId: string): string | undefined {
	return CURSOR_NATIVE_REPLAY_TOOL_ID_PATTERN.exec(toolCallId)?.[1];
}

export function getPendingCursorLiveRun(context: Context): CursorLiveRun | undefined {
	return cursorLiveRuns.getPendingFromContext(context, getCursorNativeReplayIdFromToolCallId);
}

export function getActiveCursorLiveRunForScope(scopeKey?: string): CursorLiveRun | undefined {
	return cursorLiveRuns.getActiveForScope(scopeKey);
}

function splitTextIntoReplayDeltas(text: string): string[] {
	const deltas: string[] = [];
	let remaining = text;
	while (remaining.length > 0) {
		if (remaining.length <= 96) {
			deltas.push(remaining);
			break;
		}
		const boundary = Math.max(48, remaining.lastIndexOf(" ", 96));
		deltas.push(remaining.slice(0, boundary));
		remaining = remaining.slice(boundary);
	}
	return deltas;
}

async function emitTextDeltas(
	stream: AssistantMessageEventStream,
	partial: AssistantMessage,
	deltas: string[],
): Promise<string> {
	const emitter = new CursorPartialContentEmitter(stream, partial, -1, true);
	for (const delta of deltas) {
		emitter.appendTextDelta(delta);
		await Promise.resolve();
	}
	return emitter.closeText();
}

export async function settleCursorLiveToolBatch(run: CursorLiveRun): Promise<void> {
	const eventType = cursorLiveRuns.peekEvent(run)?.type;
	if (eventType !== "tool" && eventType !== "bridge-tool") return;
	await scheduler.wait(75);
}

async function waitForCursorLiveSdkTurnEnded(run: CursorLiveRun, signal?: AbortSignal): Promise<boolean> {
	const deadline = Date.now() + 125;
	while (!cursorLiveRuns.hasSdkTurnEnded(run) && run.status.kind === "running") {
		const remainingMs = deadline - Date.now();
		if (remainingMs <= 0) return false;
		await scheduler.wait(Math.min(25, remainingMs));
		if (signal?.aborted) throw new CursorLiveRunAbortError();
	}
	return cursorLiveRuns.hasSdkTurnEnded(run);
}

export function flushPendingCursorLiveRunTraceEventsToStream(
	stream: AssistantMessageEventStream,
	partial: AssistantMessage,
	run: CursorLiveRun,
	options?: { includeTracesBehindQueuedTools?: boolean },
): void {
	if (isLiveRunDisposed(run)) return;
	const turn: CursorLiveTurnState = {
		emitter: new CursorPartialContentEmitter(stream, partial, -1, true),
		emittedText: "",
	};
	while (true) {
		const event = cursorLiveRuns.peekEvent(run);
		if (!event || event.type === "tool" || event.type === "bridge-tool") break;
		cursorLiveRuns.shiftEvent(run);
		emitCursorLiveQueuedEvent(turn, event, run);
	}
	if (options?.includeTracesBehindQueuedTools && run.pendingEvents.length > 0) {
		const preserved: CursorLiveQueuedEvent[] = [];
		for (const event of run.pendingEvents) {
			if (event.type === "tool" || event.type === "bridge-tool") {
				preserved.push(event);
				continue;
			}
			emitCursorLiveQueuedEvent(turn, event, run);
		}
		run.pendingEvents = preserved;
	}
	turn.emitter.closeAll();
}

function emitCursorLiveQueuedEvent(
	turn: CursorLiveTurnState,
	event: Exclude<CursorLiveQueuedEvent, { type: "tool" } | { type: "bridge-tool" }>,
	run?: CursorLiveRun,
): void {
	if (event.type === "thinking-delta") {
		turn.emitter.appendThinkingDelta(event.text);
	} else if (event.type === "thinking-completed") {
		turn.emitter.closeThinking();
	} else if (event.type === "text-delta") {
		turn.emittedText += event.text;
		if (run) run.emittedText += event.text;
		turn.emitter.appendTextDelta(event.text);
	}
}

function emitCursorNativeToolUseTurn(
	stream: AssistantMessageEventStream,
	partial: AssistantMessage,
	model: Model<Api>,
	context: Context,
	run: CursorLiveRun,
	toolResultInputTokens: number,
	tools: CursorNativeToolDisplayItem[],
	debugRecorder?: CursorSdkEventDebugRecorder,
): void {
	const shouldTerminate =
		run.status.kind === "finished" && !run.status.finalText.trim() && !cursorLiveRuns.peekEvent(run);
	for (const tool of tools) {
		const contentIndex = partial.content.length;
		const args = toJsonObject(tool.args);
		partial.content.push({
			type: "toolCall",
			id: tool.id,
			name: tool.toolName,
			arguments: args,
		});
		stream.push({ type: "toolcall_start", contentIndex, partial });
		stream.push({ type: "toolcall_delta", contentIndex, delta: JSON.stringify(args), partial });
		const block = partial.content[contentIndex];
		if (block.type === "toolCall") stream.push({ type: "toolcall_end", contentIndex, toolCall: block, partial });
		if (recordCursorNativeToolDisplay({ ...tool, args, terminate: shouldTerminate })) {
			run.recordedToolDisplayIds.push(tool.id);
			debugRecorder?.recordDrainEvent("native_tool_display_recorded", {
				toolId: tool.id,
				toolName: tool.toolName,
				terminate: shouldTerminate,
			});
		}
	}
	applyCursorUsage(partial, model, context, cursorLiveRuns.takeTurnInputTokens(run, toolResultInputTokens), {
		turn: cursorLiveRuns.takeSdkTurnUsage(run),
	});
	partial.stopReason = "toolUse";
	stream.push({ type: "done", reason: "toolUse", message: partial });
	cursorLiveRuns.requestIdleDispose(run);
}

function emitInactiveCursorReplayTrace(
	turn: CursorLiveTurnState,
	tools: CursorNativeToolDisplayItem[],
	debugRecorder?: CursorSdkEventDebugRecorder,
): void {
	if (tools.length === 0) return;
	for (const tool of tools) {
		const traceText = formatInactiveCursorReplayTrace(tool);
		debugRecorder?.recordDrainEvent("inactive_replay_trace", {
			toolId: tool.id,
			toolName: tool.toolName,
			traceText,
		});
		turn.emitter.appendThinkingBlock(traceText);
	}
}

function emitCursorBridgeToolUseTurn(
	stream: AssistantMessageEventStream,
	partial: AssistantMessage,
	model: Model<Api>,
	context: Context,
	run: CursorLiveRun,
	toolResultInputTokens: number,
	requests: CursorPiBridgeToolRequest[],
): void {
	for (const request of requests) {
		const contentIndex = partial.content.length;
		const args = toJsonObject(request.args);
		partial.content.push({
			type: "toolCall",
			id: request.piToolCallId,
			name: request.piToolName,
			arguments: args,
		});
		stream.push({ type: "toolcall_start", contentIndex, partial });
		stream.push({ type: "toolcall_delta", contentIndex, delta: JSON.stringify(args), partial });
		const block = partial.content[contentIndex];
		if (block.type === "toolCall") stream.push({ type: "toolcall_end", contentIndex, toolCall: block, partial });
	}
	applyCursorUsage(partial, model, context, cursorLiveRuns.takeTurnInputTokens(run, toolResultInputTokens), {
		turn: cursorLiveRuns.takeSdkTurnUsage(run),
	});
	partial.stopReason = "toolUse";
	stream.push({ type: "done", reason: "toolUse", message: partial });
	cursorLiveRuns.requestIdleDispose(run);
}

async function emitCursorLiveRunPendingToolUseTurn(
	turn: CursorLiveTurnState,
	stream: AssistantMessageEventStream,
	partial: AssistantMessage,
	model: Model<Api>,
	context: Context,
	run: CursorLiveRun,
	toolResultInputTokens: number,
	options: { signal?: AbortSignal; debugRecorder?: CursorSdkEventDebugRecorder },
): Promise<"tool_use" | "handled" | undefined> {
	const debugRecorder = options.debugRecorder ?? run.debugRecorder;
	const eventType = cursorLiveRuns.peekEvent(run)?.type;
	if (eventType !== "tool" && eventType !== "bridge-tool") return undefined;
	await settleCursorLiveToolBatch(run);
	const sdkTurnEnded = await waitForCursorLiveSdkTurnEnded(run, options.signal);
	if (options.signal?.aborted) throw new CursorLiveRunAbortError();
	if (eventType === "tool") {
		const { active, inactive } = partitionNativeToolsByActiveContext(context, cursorLiveRuns.collectNativeToolBatch(run));
		emitInactiveCursorReplayTrace(turn, inactive, debugRecorder);
		if (active.length === 0) return "handled";
		if (!sdkTurnEnded) cursorLiveRuns.ignoreFutureSdkTurnUsage(run);
		turn.emitter.closeAll();
		emitCursorNativeToolUseTurn(stream, partial, model, context, run, toolResultInputTokens, active, debugRecorder);
	} else {
		const requests = cursorLiveRuns.collectBridgeToolBatch(run);
		if (requests.length === 0) return "handled";
		if (!sdkTurnEnded) cursorLiveRuns.ignoreFutureSdkTurnUsage(run);
		turn.emitter.closeAll();
		emitCursorBridgeToolUseTurn(stream, partial, model, context, run, toolResultInputTokens, requests);
	}
	return "tool_use";
}

export async function drainCursorLiveRunTurn(
	stream: AssistantMessageEventStream,
	partial: AssistantMessage,
	model: Model<Api>,
	context: Context,
	run: CursorLiveRun,
	toolResultInputTokens: number,
	options: { signal?: AbortSignal; debugRecorder?: CursorSdkEventDebugRecorder } = {},
): Promise<CursorLiveRunDrainOutcome> {
	const debugRecorder = options.debugRecorder ?? run.debugRecorder;
	debugRecorder?.recordDrainEvent("turn_start", {
		runId: run.id,
		pendingEventCount: run.pendingEvents.length,
		done: run.status.kind !== "running",
	});
	let outcome: CursorLiveRunDrainOutcome | undefined;
	let outcomeDetails: Record<string, unknown> = {};
	const turn: CursorLiveTurnState = {
		emitter: new CursorPartialContentEmitter(stream, partial, -1, true),
		emittedText: "",
	};

	try {
		while (true) {
			while (cursorLiveRuns.peekEvent(run)) {
				const toolUse = await emitCursorLiveRunPendingToolUseTurn(
					turn,
					stream,
					partial,
					model,
					context,
					run,
					toolResultInputTokens,
					options,
				);
				if (toolUse === "tool_use") {
					outcome = "tool_use";
					return outcome;
				}
				if (toolUse === "handled") continue;
				const event = cursorLiveRuns.shiftEvent(run);
				if (!event || event.type === "tool" || event.type === "bridge-tool") continue;
				emitCursorLiveQueuedEvent(turn, event, run);
			}

			const status = run.status;
			switch (status.kind) {
				case "disposed": {
					partial.stopReason = "aborted";
					partial.errorMessage = formatCursorSdkAbortMessage(
						resolveCursorSdkAbortCause({ liveRunDisposed: true }),
					);
					stream.push({ type: "error", reason: "aborted", error: partial });
					outcome = "aborted";
					outcomeDetails = { reason: "disposed" };
					return outcome;
				}
				case "cancelled": {
					partial.stopReason = "aborted";
					if (status.abortMessage) partial.errorMessage = status.abortMessage;
					stream.push({ type: "error", reason: "aborted", error: partial });
					await cursorLiveRuns.release(run);
					outcome = "aborted";
					outcomeDetails = { reason: "cancelled" };
					return outcome;
				}
				case "error": {
					partial.stopReason = "error";
					partial.errorMessage = status.errorMessage;
					stream.push({ type: "error", reason: "error", error: partial });
					await cursorLiveRuns.release(run);
					outcome = "error";
					return outcome;
				}
				case "finished": {
					turn.emitter.closeAll();
					const finalText = trimCurrentTurnAlreadyEmittedCursorText(status.finalText, turn.emittedText, run.emittedText);
					if (finalText) {
						await emitTextDeltas(stream, partial, splitTextIntoReplayDeltas(finalText));
					}
					applyCursorUsage(partial, model, context, cursorLiveRuns.takeTurnInputTokens(run, toolResultInputTokens), {
						turn: cursorLiveRuns.takeSdkTurnUsage(run),
						billed: run.billedTurnUsage,
					});
					partial.stopReason = "stop";
					stream.push({ type: "done", reason: "stop", message: partial });
					await cursorLiveRuns.release(run);
					outcome = "stop";
					outcomeDetails = { finalTextLength: finalText.length };
					return outcome;
				}
				case "running":
					break;
				default: {
					const _exhaustive: never = status;
					return _exhaustive;
				}
			}

			await cursorLiveRuns.waitForProgress(run, options.signal);
		}
	} catch (error) {
		if (!outcome) {
			if (error instanceof CursorLiveRunAbortError) {
				outcome = "aborted";
				outcomeDetails = { reason: "signal_aborted" };
			} else {
				outcome = "error";
				outcomeDetails = {
					reason: "drain_error",
					errorMessage: error instanceof Error ? error.message : String(error),
				};
			}
		}
		throw error;
	} finally {
		debugRecorder?.recordDrainEvent("turn_end", {
			outcome: outcome ?? "error",
			runId: run.id,
			pendingEventCount: run.pendingEvents.length,
			done: run.status.kind !== "running",
			...outcomeDetails,
		});
	}
}

export async function drainExistingCursorLiveRunBeforeSend(
	stream: AssistantMessageEventStream,
	partial: AssistantMessage,
	model: Model<Api>,
	context: Context,
	signal?: AbortSignal,
	turnDebugRecorder?: CursorSdkEventDebugRecorder,
	scopeKey?: string,
): Promise<LiveRunPreSendOutcome> {
	turnDebugRecorder?.recordDrainEvent("pre_send_start", {});
	const run = getPendingCursorLiveRun(context) ?? getActiveCursorLiveRunForScope(scopeKey);
	if (!run || isLiveRunDisposed(run)) {
		turnDebugRecorder?.recordDrainEvent("pre_send_end", { outcome: "continue_send", reason: "no_pending_run" });
		return "continue_send";
	}

	try {
		const outcome = await cursorLiveRuns.withRunLease(run, signal, async () => {
			if (isLiveRunDisposed(run)) return "continue_send" as const;
			const consumed = cursorLiveRuns.consumeToolResults(run, context, getCursorNativeReplayIdFromToolCallId);
			await run.bridgeRun?.resolveToolResults(consumed.toolResults);
			while (!cursorLiveRuns.isReady(run)) {
				await cursorLiveRuns.waitForProgress(run, signal);
			}
			if (isLiveRunDisposed(run)) return "continue_send" as const;
			if (hasTrailingUserMessagesAfterToolResults(context)) {
				await cursorLiveRuns.release(run);
				turnDebugRecorder?.recordDrainEvent("pre_send_iteration", {
					runId: run.id,
					drainOutcome: "chain_user_input",
					outcome: "continue_send",
					shouldChainUserInput: true,
				});
				return "continue_send" as const;
			}
			const drainOutcome = await drainCursorLiveRunTurn(stream, partial, model, context, run, consumed.toolResultInputTokens, {
				signal,
				debugRecorder: turnDebugRecorder,
			});
			turnDebugRecorder?.recordDrainEvent("pre_send_iteration", {
				runId: run.id,
				drainOutcome,
				outcome: "stream_ended",
				shouldChainUserInput: false,
			});
			return "stream_ended" as const;
		});
		turnDebugRecorder?.recordDrainEvent("pre_send_end", { outcome, runId: run.id });
		return outcome;
	} catch (error) {
		turnDebugRecorder?.recordDrainEvent("pre_send_end", {
			outcome: error instanceof CursorLiveRunAbortError ? "aborted" : "error",
			runId: run.id,
			reason: error instanceof CursorLiveRunAbortError ? "signal_aborted" : "drain_error",
		});
		if (error instanceof CursorLiveRunAbortError) await cursorLiveRuns.release(run);
		throw error;
	}
}

export function setCursorNativeReplayIdleDisposeMs(value: number): void {
	cursorNativeReplayIdleDisposeMs = value;
}

export function resetCursorNativeReplayIdleDisposeMs(): void {
	cursorNativeReplayIdleDisposeMs = CURSOR_LOCAL_AGENT_IDLE_MS;
}

export async function releaseAllPendingCursorLiveRunsForTests(): Promise<void> {
	while (cursorLiveRuns.count() > 0) {
		const run = cursorLiveRuns.getActiveForScope();
		if (!run) break;
		const before = cursorLiveRuns.count();
		await cursorLiveRuns.release(run);
		if (cursorLiveRuns.count() >= before) break;
	}
}

export { hasTrailingUserMessagesAfterToolResults };
