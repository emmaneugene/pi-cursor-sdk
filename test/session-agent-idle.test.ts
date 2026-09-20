import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	acquireSessionCursorAgent,
	CURSOR_LOCAL_AGENT_IDLE_MS,
	__testUtils as sessionAgentTestUtils,
} from "../src/session-agent.js";
import { __testUtils as cursorSessionScopeTestUtils } from "../src/session-scope.js";
import { makeContext } from "./helpers/pi-harness.js";
import { installCursorSessionStoreMock } from "./helpers/session-store.js";

describe("cursor-session-agent idle eviction", () => {
	beforeEach(async () => {
		installCursorSessionStoreMock();
		cursorSessionScopeTestUtils.reset();
		await sessionAgentTestUtils.disposeAllSessionCursorAgents();
		vi.clearAllMocks();
	});

	it("reuses a pooled agent last used inside the idle window", async () => {
		const createAgent = vi.fn().mockResolvedValue({
			agentId: "agent-1",
			[Symbol.asyncDispose]: vi.fn().mockResolvedValue(undefined),
		});
		cursorSessionScopeTestUtils.set("/tmp/project", "/tmp/sessions/test.jsonl");
		const params = {
			apiKey: "test-key",
			agentMode: "agent" as const,
			cwd: "/tmp/project",
			modelSelection: { id: "composer-2.5" },
			createAgent,
		};

		sessionAgentTestUtils.setNowMs(1_000);
		const first = await acquireSessionCursorAgent(params);
		first.commitSend(makeContext(), true);
		sessionAgentTestUtils.setNowMs(1_000 + CURSOR_LOCAL_AGENT_IDLE_MS - 1);
		const second = await acquireSessionCursorAgent(params);

		expect(second.created).toBe(false);
		expect(second.agent).toBe(first.agent);
		expect(createAgent).toHaveBeenCalledTimes(1);
	});

	it("creates a new agent after idle instead of reusing the previous one", async () => {
		const firstDispose = vi.fn().mockResolvedValue(undefined);
		const createAgent = vi
			.fn()
			.mockResolvedValueOnce({ agentId: "agent-1", [Symbol.asyncDispose]: firstDispose })
			.mockResolvedValueOnce({ agentId: "agent-2", [Symbol.asyncDispose]: vi.fn().mockResolvedValue(undefined) });
		const params = {
			apiKey: "test-key",
			agentMode: "agent" as const,
			cwd: "/tmp/project",
			modelSelection: { id: "composer-2.5" },
			createAgent,
		};

		sessionAgentTestUtils.setNowMs(1_000);
		const first = await acquireSessionCursorAgent(params);
		first.commitSend(makeContext(), true);
		sessionAgentTestUtils.setNowMs(1_000 + CURSOR_LOCAL_AGENT_IDLE_MS);
		const second = await acquireSessionCursorAgent(params);

		expect(second.created).toBe(true);
		expect(second.agent).not.toBe(first.agent);
		expect(createAgent).toHaveBeenCalledTimes(2);
		expect(firstDispose).toHaveBeenCalledTimes(1);
	});
});
