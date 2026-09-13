import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { streamCursor } from "../src/cursor-provider.js";
import {
	collectEvents,
	makeContext,
	makeModel,
	mockCreatedAgent,
	mockedConfigureCursor,
	mockedCreate,
	resetCursorProviderTestState,
} from "./helpers/cursor-provider-harness.js";

function mockSuccessfulAgent(agentId = "agent-1") {
	const send = vi.fn().mockResolvedValue({
		id: "run-1",
		agentId,
		status: "finished",
		wait: vi.fn().mockResolvedValue({ id: "run-1", status: "finished" }),
		cancel: vi.fn(),
		supports: () => true,
		unsupportedReason: () => undefined,
	});
	mockCreatedAgent({
		agentId,
		send,
	});
	return send;
}

describe("Cursor provider HTTP/1.1 transport", () => {
	beforeEach(resetCursorProviderTestState);

	it.each([
		["http1", true],
		["default", false],
	] as const)("configures explicit local.transport=%s before creating a local agent", async (transport, value) => {
		const agentDir = mkdtempSync(join(tmpdir(), "pi-cursor-http-config-"));
		const originalAgentDir = process.env.PI_CODING_AGENT_DIR;
		process.env.PI_CODING_AGENT_DIR = agentDir;
		writeFileSync(join(agentDir, "cursor-sdk.json"), JSON.stringify({ local: { transport } }));
		const send = mockSuccessfulAgent();

		try {
			await collectEvents(streamCursor(makeModel("gpt-5.5"), makeContext(), { apiKey: "test-key" }));
		} finally {
			if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
			else process.env.PI_CODING_AGENT_DIR = originalAgentDir;
			rmSync(agentDir, { recursive: true, force: true });
		}

		expect(mockedConfigureCursor).toHaveBeenCalledWith({ local: { useHttp1ForAgent: value } });
		expect(mockedConfigureCursor.mock.invocationCallOrder[0]).toBeLessThan(
			mockedCreate.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
		);
		expect(mockedConfigureCursor.mock.invocationCallOrder[0]).toBeLessThan(
			send.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
		);
	});

	it("leaves the default local SDK path unconfigured", async () => {
		mockSuccessfulAgent();

		await collectEvents(streamCursor(makeModel("gpt-5.5"), makeContext(), { apiKey: "test-key" }));

		expect(mockedConfigureCursor).not.toHaveBeenCalled();
		expect(mockedCreate.mock.calls[0][0].local).toMatchObject({
			cwd: process.cwd(),
			settingSources: ["all"],
			store: expect.any(Object),
		});
	});
});
