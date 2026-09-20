import {
	type Api,
	type AssistantMessage,
	type AssistantMessageEventStream,
	type Context,
	createAssistantMessageEventStream,
	type Model,
	type SimpleStreamOptions,
} from "@earendil-works/pi-ai";
import {
	cursorLiveRuns,
	getPendingCursorLiveRun,
	hasTrailingUserMessagesAfterToolResults,
	releaseAllPendingCursorLiveRunsForTests,
	resetCursorNativeReplayIdleDisposeMs,
	setCursorNativeReplayIdleDisposeMs,
} from "./provider-live-run-drain.js";
import { disposeAllSessionCursorAgents } from "./session-agent.js";
import { attachCursorSdkEventDebugPiStreamTap, type CursorSdkEventDebugSink } from "./sdk-event-debug.js";
import { installCursorSdkProcessErrorGuard } from "./sdk-process-error-guard.js";
import { sanitizeCursorProviderError } from "./provider-errors.js";
import { resolveCursorApiKey } from "./api-key.js";
import { CursorProviderTurnRunner } from "./provider-turn-runner.js";
import { getCursorSessionScopeKey } from "./session-scope.js";
import { runExclusiveCursorSessionTurn, __testUtils as cursorSessionTurnQueueTestUtils } from "./session-turn-queue.js";
import type { CursorProviderRuntimeContext } from "./provider-runtime-context.js";

function makeInitialMessage(model: Model<Api>): AssistantMessage {
	return {
		role: "assistant",
		content: [],
		api: model.api,
		provider: model.provider,
		model: model.id,
		usage: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			totalTokens: 0,
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		},
		stopReason: "stop",
		timestamp: Date.now(),
	};
}

export function streamCursor(
	model: Model<Api>,
	context: Context,
	options?: SimpleStreamOptions,
	runtimeContext?: CursorProviderRuntimeContext,
): AssistantMessageEventStream {
	const stream = createAssistantMessageEventStream();
	const sdkEventDebugRef: { current?: CursorSdkEventDebugSink } = {};
	attachCursorSdkEventDebugPiStreamTap(stream, sdkEventDebugRef);

	(async () => {
		const partial = makeInitialMessage(model);

		const runner = new CursorProviderTurnRunner({
			model,
			context,
			stream,
			partial,
			options,
			runtimeContext,
			sdkEventDebugRef,
		});

		try {
			stream.push({ type: "start", partial });
			await runExclusiveCursorSessionTurn(
				runtimeContext?.scopeKey ?? getCursorSessionScopeKey(),
				() => runner.run(installCursorSdkProcessErrorGuard()),
				options?.signal,
			);
		} catch (error) {
			await runner.handleOuterCatch(error);
		}

		stream.end();
	})().catch((error: unknown) => {
		const partial = makeInitialMessage(model);
		partial.stopReason = "error";
		partial.errorMessage = sanitizeCursorProviderError(error, resolveCursorApiKey(options?.apiKey));
		stream.push({ type: "error", reason: "error", error: partial });
		stream.end();
	});

	return stream;
}

export const __testUtils = {
	pendingCursorNativeRunCount: cursorLiveRuns.count,
	getPendingCursorLiveRun,
	getActiveCursorLiveRunForScope: cursorLiveRuns.getActiveForScope,
	hasTrailingUserMessagesAfterToolResults,
	setCursorNativeReplayIdleDisposeMs,
	resetCursorNativeReplayIdleDisposeMs,
	releaseAllPendingCursorLiveRunsForTests,
	resetSessionCursorAgents: () => disposeAllSessionCursorAgents(),
	resetSessionTurnQueue: cursorSessionTurnQueueTestUtils.reset,
};
