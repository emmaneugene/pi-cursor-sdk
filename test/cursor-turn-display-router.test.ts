import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildCursorPiToolDisplay,
	formatCursorToolTranscript,
	type CursorPiToolDisplay,
} from "../src/cursor-tool-transcript.js";
import { CursorTurnDisplayRouter } from "../src/cursor-provider-turn-display-router.js";
import type { CursorLiveRun } from "../src/cursor-live-run-coordinator.js";
import type { CursorSdkEventDebugRecorder } from "../src/cursor-sdk-event-debug.js";
import {
	registerNativeToolDisplayForTest,
	resetCursorProviderTestState,
	type RegisteredTool,
} from "./helpers/cursor-provider-harness.js";

vi.mock("../src/cursor-tool-transcript.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../src/cursor-tool-transcript.js")>();
	const formatCursorToolTranscript = vi.fn(actual.formatCursorToolTranscript);
	return { ...actual, formatCursorToolTranscript };
});

const readToolCall = {
	type: "read",
	args: { path: "package.json" },
	result: { status: "success", value: { content: [{ text: "{}", }] } },
};

function makeRouter(options: {
	liveRun?: CursorLiveRun;
	useNativeToolReplay: boolean;
	debugRecorder?: CursorSdkEventDebugRecorder;
}) {
	return new CursorTurnDisplayRouter({
		cwd: "/tmp/work",
		liveRun: options.liveRun,
		useNativeToolReplay: options.useNativeToolReplay,
		nativeReplayId: "replay-1",
		contentEmitter: { appendThinkingBlock: vi.fn() } as never,
		debugRecorder: options.debugRecorder,
	});
}

function stubLiveRun(): CursorLiveRun {
	return { disposed: false, pendingEvents: [] } as unknown as CursorLiveRun;
}

function fakeRecorder() {
	return { recordDisplayDecision: vi.fn() } as unknown as CursorSdkEventDebugRecorder & {
		recordDisplayDecision: ReturnType<typeof vi.fn>;
	};
}

describe("CursorTurnDisplayRouter completed-call projection", () => {
	beforeEach(() => {
		resetCursorProviderTestState();
		vi.mocked(formatCursorToolTranscript).mockClear();
	});

	it("queues replay without formatting a transcript when debug is off", async () => {
		const registeredTools: RegisteredTool[] = [];
		await registerNativeToolDisplayForTest(registeredTools);
		const liveRun = stubLiveRun();
		const router = makeRouter({ liveRun, useNativeToolReplay: true });
		const display: CursorPiToolDisplay = buildCursorPiToolDisplay(readToolCall, { cwd: "/tmp/work" });

		const action = router.routeCompletedToolCall(readToolCall, display);

		expect(action?.kind).toBe("queue_replay");
		expect(vi.mocked(formatCursorToolTranscript)).not.toHaveBeenCalled();
		expect(liveRun.pendingEvents).toHaveLength(0);
		router.emitDisplayAction(action!);
		expect(liveRun.pendingEvents).toHaveLength(1);
	});

	it("formats the transcript once for replay decisions when debug is on", async () => {
		const registeredTools: RegisteredTool[] = [];
		await registerNativeToolDisplayForTest(registeredTools);
		const recorder = fakeRecorder();
		const router = makeRouter({
			liveRun: stubLiveRun(),
			useNativeToolReplay: true,
			debugRecorder: recorder,
		});
		const display: CursorPiToolDisplay = buildCursorPiToolDisplay(readToolCall, { cwd: "/tmp/work" });

		const action = router.routeCompletedToolCall(readToolCall, display);

		expect(action?.kind).toBe("queue_replay");
		expect(vi.mocked(formatCursorToolTranscript)).toHaveBeenCalledTimes(1);
		expect(recorder.recordDisplayDecision).toHaveBeenCalledOnce();
		expect(recorder.recordDisplayDecision.mock.calls[0][0]).toMatchObject({
			action: "queue_replay",
			transcript: expect.any(String),
		});
	});

	it("formats the transcript once for trace decisions", () => {
		const router = makeRouter({ useNativeToolReplay: false });
		const display: CursorPiToolDisplay = buildCursorPiToolDisplay(readToolCall, { cwd: "/tmp/work" });

		const action = router.routeCompletedToolCall(readToolCall, display);

		expect(action?.kind).toBe("emit_trace");
		expect(vi.mocked(formatCursorToolTranscript)).toHaveBeenCalledTimes(1);
	});
});
