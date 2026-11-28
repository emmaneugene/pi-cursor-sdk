import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { AssistantMessage } from "@earendil-works/pi-ai";
import { CURSOR_PROVIDER } from "./model.js";

// Pi's OVERFLOW_PATTERNS requires `context_length_exceeded` to trigger compact-and-retry (see Pi `docs/custom-provider.md` -> "Context Overflow Errors").
export const CURSOR_OVERFLOW_MARKER = "context_length_exceeded";

// Bare `resource_exhausted` and `too many tokens` are intentionally excluded
// because they false-match throttling/quota errors and cause unwanted compaction.
const CURSOR_OVERFLOW_PATTERNS = [
	/context[_ ]?length/i,
	/context[_ ]?window/i,
	/maximum context/i,
	/prompt is too long/i,
	/too large for model/i,
	/exceed(?:s|ed).{0,30}context/i,
] as const;

// Rate-limit/throttle signals must not trigger compaction (pi retries them separately).
const CURSOR_THROTTLE_PATTERN = /too many requests|rate.?limit|throttl|retry.?after/i;

export function normalizeCursorOverflowErrorMessage(errorMessage: string | undefined): string | undefined {
	const message = errorMessage?.trim();
	if (!message) return undefined;
	if (message.includes(CURSOR_OVERFLOW_MARKER)) return undefined;
	if (CURSOR_THROTTLE_PATTERN.test(message)) return undefined;
	if (CURSOR_OVERFLOW_PATTERNS.some((pattern) => pattern.test(message))) {
		return `${CURSOR_OVERFLOW_MARKER}: ${message}`;
	}
	return undefined;
}

export function rewriteCursorOverflowAssistantMessage(
	message: AssistantMessage,
	isCursorProvider: boolean,
): AssistantMessage | undefined {
	if (!isCursorProvider || message.stopReason !== "error") return undefined;
	const rewritten = normalizeCursorOverflowErrorMessage(message.errorMessage);
	if (!rewritten) return undefined;
	return { ...message, errorMessage: rewritten };
}

export type CursorOverflowExtensionApi = Pick<ExtensionAPI, "on">;

export function registerCursorOverflowNormalization(pi: CursorOverflowExtensionApi): void {
	pi.on("message_end", (event, ctx) => {
		const message = event.message;
		if (message.role !== "assistant") return undefined;
		const isCursorProvider = message.provider === CURSOR_PROVIDER || ctx.model?.provider === CURSOR_PROVIDER;
		const rewritten = rewriteCursorOverflowAssistantMessage(message, isCursorProvider);
		if (!rewritten) return undefined;
		return { message: rewritten };
	});
}
