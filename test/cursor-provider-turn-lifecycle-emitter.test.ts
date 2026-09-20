import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAssistantMessageEventStream } from "@earendil-works/pi-ai";
import { CursorPartialContentEmitter } from "../src/cursor-partial-content-emitter.js";
import { CursorToolLifecycleEmitter } from "../src/cursor-provider-turn-lifecycle-emitter.js";
import { CURSOR_TOOL_LIFECYCLE_DEFER_MS } from "../src/cursor-tool-lifecycle.js";
import { makeAssistantMessage } from "./helpers/pi-harness.js";

describe("CursorToolLifecycleEmitter", () => {
	const started = new Set<string>();
	const skips: Array<{ reason?: string; callId?: string }> = [];

	beforeEach(() => {
		vi.useFakeTimers();
		started.clear();
		skips.length = 0;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	function createEmitter(): { emitter: CursorToolLifecycleEmitter; thinking: ReturnType<typeof vi.fn> } {
		const stream = createAssistantMessageEventStream();
		const contentEmitter = new CursorPartialContentEmitter(stream, makeAssistantMessage(""));
		const thinking = vi.spyOn(contentEmitter, "appendThinkingDelta");
		return {
			emitter: new CursorToolLifecycleEmitter({
				contentEmitter,
				hasStartedToolCall: (callId) => started.has(callId),
				isBridgeMcpToolCall: () => false,
				debugRecorder: {
					recordCoordinatorEvent(phase: string, payload: unknown) {
						if (phase !== "tool_lifecycle_skip") return;
						const record = payload && typeof payload === "object" ? payload as { reason?: string; callId?: string } : {};
						skips.push(record);
					},
				} as never,
			}),
			thinking,
		};
	}

	it("skips a second call with the same fingerprint until the owner is cancelled", () => {
		const { emitter, thinking } = createEmitter();
		const toolCall = { name: "shell", args: { command: "npm test" } };
		started.add("call-a");
		emitter.maybeSchedule("call-a", toolCall);
		emitter.maybeSchedule("call-b", toolCall);
		expect(skips).toEqual([expect.objectContaining({ reason: "duplicate-active-fingerprint", callId: "call-b" })]);

		emitter.cancel("call-a");
		skips.length = 0;
		started.add("call-b");
		emitter.maybeSchedule("call-b", toolCall);
		expect(skips).toEqual([]);
		vi.advanceTimersByTime(CURSOR_TOOL_LIFECYCLE_DEFER_MS);
		expect(skips).toEqual([]);
		expect(thinking).toHaveBeenCalledTimes(1);
	});

	it("skips emit when another started call already owns the same progress text", () => {
		const { emitter, thinking } = createEmitter();
		started.add("call-a");
		started.add("call-b");
		const callB = { name: "shell", args: { command: "npm test", workingDirectory: "/tmp" } };
		emitter.maybeSchedule("call-a", { name: "shell", args: { command: "npm test" } });
		emitter.maybeSchedule("call-b", callB);
		vi.advanceTimersByTime(CURSOR_TOOL_LIFECYCLE_DEFER_MS);
		expect(skips).toContainEqual(expect.objectContaining({ reason: "duplicate-active-progress-text", callId: "call-b" }));
		expect(thinking).toHaveBeenCalledTimes(1);
		emitter.maybeSchedule("call-c", callB);
		expect(skips).toContainEqual(expect.objectContaining({ reason: "duplicate-active-fingerprint", callId: "call-c" }));
	});

	it("allows reschedule after cancel", () => {
		const { emitter, thinking } = createEmitter();
		const toolCall = { name: "shell", args: { command: "npm test" } };
		started.add("call-a");
		emitter.maybeSchedule("call-a", toolCall);
		emitter.cancel("call-a");
		vi.advanceTimersByTime(CURSOR_TOOL_LIFECYCLE_DEFER_MS);
		expect(thinking).not.toHaveBeenCalled();
		emitter.maybeSchedule("call-a", toolCall);
		vi.advanceTimersByTime(CURSOR_TOOL_LIFECYCLE_DEFER_MS);
		expect(skips).toEqual([]);
		expect(thinking).toHaveBeenCalledTimes(1);
	});
});
