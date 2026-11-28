import type { Context } from "@earendil-works/pi-ai";
import {
	buildCursorIncrementalPrompt,
	buildCursorPrompt,
	shouldBootstrapCursorContext,
	type CursorContextFingerprint,
	type CursorPrompt,
	type CursorPromptOptions,
} from "./context.js";

// Long-lived SDK session agents can drift tool-call behavior; recreate the agent after this many successful incremental sends.
export const MAX_COMPLETED_INCREMENTAL_SENDS_BEFORE_REBOOTSTRAP = 20;

export type SessionCursorAgentSendState =
	| { readonly bootstrapped: false }
	| {
			readonly bootstrapped: true;
			readonly contextFingerprint: CursorContextFingerprint;
			readonly incrementalSendCount: number;
	  };

export type CursorSessionSendPlan =
	| { mode: "bootstrap"; resetAgent: false; reason: "initial" }
	| { mode: "bootstrap"; resetAgent: true; reason: "incremental_threshold" | "context_divergence" }
	| { mode: "incremental"; resetAgent: false; reason: "incremental" };

export type CursorSessionSendMode = CursorSessionSendPlan["mode"];

export type CursorSessionSendReason = CursorSessionSendPlan["reason"];

export function planCursorSessionSend(sendState: SessionCursorAgentSendState, context: Context): CursorSessionSendPlan {
	if (!sendState.bootstrapped) {
		return { mode: "bootstrap", resetAgent: false, reason: "initial" };
	}
	if (sendState.incrementalSendCount >= MAX_COMPLETED_INCREMENTAL_SENDS_BEFORE_REBOOTSTRAP) {
		return { mode: "bootstrap", resetAgent: true, reason: "incremental_threshold" };
	}
	if (shouldBootstrapCursorContext(sendState, context)) {
		return { mode: "bootstrap", resetAgent: true, reason: "context_divergence" };
	}
	return { mode: "incremental", resetAgent: false, reason: "incremental" };
}

export function buildCursorSessionSendPrompt(
	context: Context,
	options: CursorPromptOptions,
	plan: CursorSessionSendPlan,
): CursorPrompt {
	return plan.mode === "bootstrap" ? buildCursorPrompt(context, options) : buildCursorIncrementalPrompt(context, options);
}
