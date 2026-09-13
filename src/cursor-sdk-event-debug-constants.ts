import { resolve } from "node:path";
import { loadCursorSdkUserConfig, type CursorSdkConfig } from "./cursor-config.js";
import {
	CURSOR_SDK_EVENT_DEBUG_INTERNAL_ENV_NAMES,
	CURSOR_SDK_EVENT_DEBUG_INTERNAL_RUN_DIR_ENV,
	CURSOR_SDK_EVENT_DEBUG_INTERNAL_SESSION_DIR_ENV,
	CURSOR_SDK_EVENT_DEBUG_RUN_DIR_ENV,
	CURSOR_SDK_EVENT_DEBUG_SESSION_DIR_ENV,
} from "../shared/cursor-sdk-event-debug-env.mjs";

export {
	CURSOR_SDK_EVENT_DEBUG_INTERNAL_ENV_NAMES,
	CURSOR_SDK_EVENT_DEBUG_INTERNAL_RUN_DIR_ENV,
	CURSOR_SDK_EVENT_DEBUG_INTERNAL_SESSION_DIR_ENV,
	CURSOR_SDK_EVENT_DEBUG_RUN_DIR_ENV,
	CURSOR_SDK_EVENT_DEBUG_SESSION_DIR_ENV,
};
export const CURSOR_SDK_EVENT_DEBUG_LOG_PREFIX = "[pi-cursor-sdk:sdk-events]";

export const SESSION_MANIFEST = "session.json";
export const SESSION_PI_SESSION_SNAPSHOT = "pi-session.jsonl";

export const ARTIFACTS = {
	metadata: "metadata.json",
	sendPayload: "send-payload.json",
	contextSnapshot: "context-snapshot.json",
	onDelta: "on-delta.jsonl",
	onStep: "on-step.jsonl",
	streamEvents: "stream-events.jsonl",
	piStreamEvents: "pi-stream-events.jsonl",
	providerEvents: "provider-events.jsonl",
	liveRunEvents: "live-run-events.jsonl",
	bridgeEvents: "bridge-events.jsonl",
	bridgeRaw: "bridge-raw.jsonl",
	displayDecisions: "display-decisions.jsonl",
	coordinatorEvents: "coordinator-events.jsonl",
	drainEvents: "drain-events.jsonl",
	timeline: "timeline.jsonl",
	piSessionSnapshot: "pi-session-snapshot.jsonl",
	finalPartial: "final-partial.json",
	errors: "errors.jsonl",
	waitResult: "wait-result.json",
	conversation: "conversation.json",
	summary: "summary.json",
} as const;

export function resolveCursorSdkEventDebugBaseDir(
	cwd: string,
	config: CursorSdkConfig = loadCursorSdkUserConfig(),
): string {
	const raw = config.debug?.sdkEvents?.directory?.trim();
	return resolve(cwd, raw || ".debug/cursor-sdk-events");
}
