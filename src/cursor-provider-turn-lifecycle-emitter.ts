import type { CursorLiveRun } from "./cursor-live-run-coordinator.js";
import { cursorLiveRuns } from "./cursor-provider-live-run-drain.js";
import type { CursorPartialContentEmitter } from "./cursor-partial-content-emitter.js";
import type { CursorSdkEventDebugRecorder } from "./cursor-sdk-event-debug.js";
import {
	CURSOR_TOOL_LIFECYCLE_DEFER_MS,
	formatCursorToolLifecycleProgressText,
	isCursorToolLifecycleEligible,
} from "./cursor-tool-lifecycle.js";
import { getNormalizedCursorToolName } from "./cursor-tool-visibility.js";
import { getStartedToolCallFingerprint } from "./cursor-provider-turn-tool-ledger.js";

export interface CursorToolLifecycleEmitterOptions {
	liveRun?: CursorLiveRun;
	resolvedApiKey?: string;
	contentEmitter: CursorPartialContentEmitter;
	debugRecorder?: CursorSdkEventDebugRecorder;
	hasStartedToolCall: (callId: string) => boolean;
	isBridgeMcpToolCall: (toolCall: unknown) => boolean;
}

interface PendingLifecycleCall {
	fingerprint: string;
	progressText: string;
	timer?: ReturnType<typeof setTimeout>;
}

export class CursorToolLifecycleEmitter {
	private readonly liveRun?: CursorLiveRun;
	private readonly resolvedApiKey?: string;
	private readonly contentEmitter: CursorPartialContentEmitter;
	private readonly debugRecorder?: CursorSdkEventDebugRecorder;
	private readonly hasStartedToolCall: (callId: string) => boolean;
	private readonly isBridgeMcpToolCall: (toolCall: unknown) => boolean;
	private readonly emittedLifecycleCallIds = new Set<string>();
	private readonly lifecycleByCallId = new Map<string, PendingLifecycleCall>();
	private readonly fingerprintOwners = new Map<string, string>();
	private readonly progressTextOwners = new Map<string, string>();

	constructor(options: CursorToolLifecycleEmitterOptions) {
		this.liveRun = options.liveRun;
		this.resolvedApiKey = options.resolvedApiKey;
		this.contentEmitter = options.contentEmitter;
		this.debugRecorder = options.debugRecorder;
		this.hasStartedToolCall = options.hasStartedToolCall;
		this.isBridgeMcpToolCall = options.isBridgeMcpToolCall;
	}

	maybeSchedule(callId: unknown, toolCall: unknown): void {
		if (typeof callId !== "string" || this.emittedLifecycleCallIds.has(callId)) return;
		if (this.isBridgeMcpToolCall(toolCall)) return;
		if (!isCursorToolLifecycleEligible(toolCall)) return;

		const progressText = formatCursorToolLifecycleProgressText(toolCall, this.resolvedApiKey);
		if (!progressText) return;

		const fingerprint = getStartedToolCallFingerprint(toolCall);
		const existingOwner = this.fingerprintOwners.get(fingerprint);
		if (existingOwner && existingOwner !== callId) {
			this.debugRecorder?.recordCoordinatorEvent("tool_lifecycle_skip", {
				callId,
				ownerCallId: existingOwner,
				toolName: getNormalizedCursorToolName(toolCall),
				reason: "duplicate-active-fingerprint",
			});
			return;
		}

		this.cancel(callId);
		this.fingerprintOwners.set(fingerprint, callId);
		if (!this.progressTextOwners.has(progressText)) {
			this.progressTextOwners.set(progressText, callId);
		}
		const pending: PendingLifecycleCall = { fingerprint, progressText };
		const timer = setTimeout(() => {
			delete pending.timer;
			if (!this.hasStartedToolCall(callId)) {
				this.clearLifecycleIdentity(callId);
				return;
			}
			if (this.emittedLifecycleCallIds.has(callId)) return;
			const progressOwner = this.progressTextOwners.get(progressText);
			if (progressOwner && progressOwner !== callId && this.hasStartedToolCall(progressOwner)) {
				this.debugRecorder?.recordCoordinatorEvent("tool_lifecycle_skip", {
					callId,
					ownerCallId: progressOwner,
					toolName: getNormalizedCursorToolName(toolCall),
					reason: "duplicate-active-progress-text",
				});
				return;
			}
			this.progressTextOwners.set(progressText, callId);
			this.emit(callId, toolCall, progressText);
		}, CURSOR_TOOL_LIFECYCLE_DEFER_MS);
		timer.unref?.();
		pending.timer = timer;
		this.lifecycleByCallId.set(callId, pending);
	}

	cancel(callId: string): void {
		const pending = this.lifecycleByCallId.get(callId);
		if (pending?.timer) clearTimeout(pending.timer);
		this.clearLifecycleIdentity(callId);
	}

	clear(): void {
		this.emittedLifecycleCallIds.clear();
		for (const pending of this.lifecycleByCallId.values()) {
			if (pending.timer) clearTimeout(pending.timer);
		}
		this.lifecycleByCallId.clear();
		this.fingerprintOwners.clear();
		this.progressTextOwners.clear();
	}

	private clearLifecycleIdentity(callId: string): void {
		const pending = this.lifecycleByCallId.get(callId);
		this.lifecycleByCallId.delete(callId);
		if (pending?.fingerprint && this.fingerprintOwners.get(pending.fingerprint) === callId) {
			this.fingerprintOwners.delete(pending.fingerprint);
		}
		if (pending?.progressText && this.progressTextOwners.get(pending.progressText) === callId) {
			this.progressTextOwners.delete(pending.progressText);
		}
	}

	private emit(callId: string, toolCall: unknown, progressText: string): void {
		this.emittedLifecycleCallIds.add(callId);
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
