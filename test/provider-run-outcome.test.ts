import { describe, expect, it } from "vitest";
import { resolveCursorRunOutcome } from "../src/provider-run-outcome.js";

function makeWaitResult(status: "finished" | "cancelled" | "error", result?: string) {
	return {
		id: "run-1",
		agentId: "agent-1",
		status,
		result,
		durationMs: 1,
		model: { id: "composer-2.5" },
	};
}

describe("cursor-provider-run-outcome", () => {
	it("normalizes signal-aborted finished waits to cancelled outcomes", () => {
		const outcome = resolveCursorRunOutcome({
			waitResult: makeWaitResult("finished", "hello"),
			signalAborted: true,
			textDeltas: ["hello"],
			emittedText: "",
		});
		expect(outcome.kind).toBe("cancelled");
		if (outcome.kind === "cancelled") expect(outcome.abortMessage.length).toBeGreaterThan(0);
	});

	it("normalizes signal-aborted error waits to cancelled outcomes", () => {
		const outcome = resolveCursorRunOutcome({
			waitResult: makeWaitResult("error", "boom"),
			signalAborted: true,
			textDeltas: [],
			emittedText: "",
		});
		expect(outcome.kind).toBe("cancelled");
		if (outcome.kind === "cancelled") expect(outcome.abortMessage.length).toBeGreaterThan(0);
	});

	it("never produces finished outcomes with signalAborted", () => {
		const outcome = resolveCursorRunOutcome({
			waitResult: makeWaitResult("finished", "hello"),
			signalAborted: true,
			textDeltas: [],
			emittedText: "",
		});
		if (outcome.kind === "finished") {
			expect.fail("finished outcome must not carry caller abort");
		}
	});

	it("classifies SDK cancelled and error statuses", () => {
		const cancelled = resolveCursorRunOutcome({
			waitResult: makeWaitResult("cancelled"),
			textDeltas: [],
			emittedText: "",
		});
		expect(cancelled.kind).toBe("cancelled");
		if (cancelled.kind === "cancelled") expect(cancelled.abortMessage.length).toBeGreaterThan(0);

		const errored = resolveCursorRunOutcome({
			waitResult: makeWaitResult("error", "boom"),
			textDeltas: [],
			emittedText: "",
		});
		expect(errored.kind).toBe("error");
		if (errored.kind === "error") expect(errored.errorMessage).toContain("boom");
	});

	it("uses local auth guidance for terminal errors", () => {
		const local = resolveCursorRunOutcome({
			waitResult: makeWaitResult("error", "Unauthorized"),
			textDeltas: [],
			emittedText: "",
		});
		expect(local.kind === "error" && local.errorMessage).toContain("Cursor SDK API key may be invalid or unauthorized");
	});

	it("marks successful finished runs and selects final text", () => {
		const outcome = resolveCursorRunOutcome({
			waitResult: makeWaitResult("finished", "final answer"),
			textDeltas: ["final"],
			emittedText: "",
		});
		expect(outcome.kind).toBe("finished");
		if (outcome.kind === "finished") {
			expect(outcome.finalText).toBe("final answer");
			expect(outcome.assistantTextProduced).toBe(true);
		}
	});
});
