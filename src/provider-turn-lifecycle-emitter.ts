import type { CursorLiveRun } from "./live-run-coordinator.js";
import { cursorLiveRuns } from "./provider-live-run-drain.js";
import type { CursorPartialContentEmitter } from "./partial-content-emitter.js";
import type { CursorSdkEventDebugRecorder } from "./sdk-event-debug.js";
import {
	CURSOR_TOOL_LIFECYCLE_DEFER_MS,
	formatCursorToolLifecycleProgressText,
	isCursorToolLifecycleEligible,
} from "./tool-lifecycle.js";
import { getNormalizedCursorToolName } from "./tool-visibility.js";
import { getStartedToolCallFingerprint } from "./provider-turn-tool-ledger.js";

export interface CursorToolLifecycleEmitterOptions {
	liveRun?: CursorLiveRun;
	resolvedApiKey?: string;
	contentEmitter: CursorPartialContentEmitter;
	debugRecorder?: CursorSdkEventDebugRecorder;
	hasStartedToolCall: (callId: string) => boolean;
	isBridgeMcpToolCall: (toolCall: unknown) => boolean;
}

type LifecycleCallState =
	| { status: "scheduled"; fingerprint: string; progressText: string; timer: ReturnType<typeof setTimeout> }
	| { status: "emitted"; fingerprint: string; progressText: string }
	| { status: "suppressed"; fingerprint: string; progressText: string }
	| { status: "closed" };

export class CursorToolLifecycleEmitter {
	private readonly liveRun?: CursorLiveRun;
	private readonly resolvedApiKey?: string;
	private readonly contentEmitter: CursorPartialContentEmitter;
	private readonly debugRecorder?: CursorSdkEventDebugRecorder;
	private readonly hasStartedToolCall: (callId: string) => boolean;
	private readonly isBridgeMcpToolCall: (toolCall: unknown) => boolean;
	private readonly calls = new Map<string, LifecycleCallState>();

	constructor(options: CursorToolLifecycleEmitterOptions) {
		this.liveRun = options.liveRun;
		this.resolvedApiKey = options.resolvedApiKey;
		this.contentEmitter = options.contentEmitter;
		this.debugRecorder = options.debugRecorder;
		this.hasStartedToolCall = options.hasStartedToolCall;
		this.isBridgeMcpToolCall = options.isBridgeMcpToolCall;
	}

	maybeSchedule(callId: unknown, toolCall: unknown): void {
		if (typeof callId !== "string") return;
		const existing = this.calls.get(callId);
		if (existing?.status === "emitted" || existing?.status === "closed") return;
		if (this.isBridgeMcpToolCall(toolCall)) return;
		if (!isCursorToolLifecycleEligible(toolCall)) return;

		const progressText = formatCursorToolLifecycleProgressText(toolCall, this.resolvedApiKey);
		if (!progressText) return;

		const fingerprint = getStartedToolCallFingerprint(toolCall);
		const existingOwner = this.findActiveFingerprintOwner(callId, fingerprint);
		if (existingOwner) {
			this.recordSkip(callId, existingOwner, toolCall, "duplicate-active-fingerprint");
			return;
		}

		if (existing?.status === "scheduled") clearTimeout(existing.timer);
		const timer = setTimeout(() => {
			const current = this.calls.get(callId);
			if (current?.status !== "scheduled" || current.timer !== timer) return;
			if (!this.hasStartedToolCall(callId)) {
				this.calls.delete(callId);
				return;
			}
			const progressOwner = this.findActiveProgressTextOwner(callId, progressText);
			if (progressOwner) {
				this.calls.set(callId, { status: "suppressed", fingerprint, progressText });
				this.recordSkip(callId, progressOwner, toolCall, "duplicate-active-progress-text");
				return;
			}
			this.calls.set(callId, { status: "emitted", fingerprint, progressText });
			this.emit(callId, toolCall, progressText);
		}, CURSOR_TOOL_LIFECYCLE_DEFER_MS);
		timer.unref?.();
		this.calls.set(callId, { status: "scheduled", fingerprint, progressText, timer });
	}

	cancel(callId: string): void {
		const state = this.calls.get(callId);
		if (!state || state.status === "closed") return;
		if (state.status === "scheduled") clearTimeout(state.timer);
		if (state.status === "emitted") {
			// Retain a tombstone so late updates for this callId cannot re-emit after releasing its keys.
			this.calls.set(callId, { status: "closed" });
		} else {
			this.calls.delete(callId);
		}
	}

	clear(): void {
		for (const state of this.calls.values()) {
			if (state.status === "scheduled") clearTimeout(state.timer);
		}
		this.calls.clear();
	}

	private recordSkip(callId: string, ownerCallId: string, toolCall: unknown, reason: string): void {
		this.debugRecorder?.recordCoordinatorEvent("tool_lifecycle_skip", {
			callId,
			ownerCallId,
			toolName: getNormalizedCursorToolName(toolCall),
			reason,
		});
	}

	private findActiveFingerprintOwner(callId: string, fingerprint: string): string | undefined {
		for (const [otherCallId, state] of this.calls) {
			if (otherCallId !== callId && state.status !== "closed" && state.fingerprint === fingerprint) return otherCallId;
		}
		return undefined;
	}

	private findActiveProgressTextOwner(callId: string, progressText: string): string | undefined {
		for (const [otherCallId, state] of this.calls) {
			if (otherCallId !== callId && state.status === "emitted" && state.progressText === progressText && this.hasStartedToolCall(otherCallId)) {
				return otherCallId;
			}
		}
		return undefined;
	}

	private emit(callId: string, toolCall: unknown, progressText: string): void {
		this.debugRecorder?.recordCoordinatorEvent("tool_lifecycle", {
			callId,
			toolName: getNormalizedCursorToolName(toolCall),
			progressText,
			liveRun: this.liveRun !== undefined,
		});
		if (this.liveRun) {
			cursorLiveRuns.queueEvent(this.liveRun, { type: "thinking-delta", text: progressText });
			return;
		}
		this.contentEmitter.appendThinkingDelta(progressText);
	}
}
