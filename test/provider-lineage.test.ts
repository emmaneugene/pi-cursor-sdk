import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionEntry } from "@earendil-works/pi-coding-agent";
import {
	asMockCursorRun,
	asMockSdkAgent,
	collectEvents,
	createPiHarness,
	makeContext,
	makeModel,
	mockedCreate,
	mockedResume,
	resetCursorProviderTestState,
} from "./helpers/provider-harness.js";
import {
	CURSOR_SESSION_AGENT_LINEAGE_ENTRY_TYPE,
	registerCursorSessionAgentLineage,
	__testUtils as lineageTestUtils,
} from "../src/session-agent-lineage.js";
import { __testUtils as sessionAgentTestUtils } from "../src/session-agent.js";
import { registerCursorSessionScope } from "../src/session-scope.js";
import { streamCursor } from "../src/provider.js";

function successfulAgent(agentId: string) {
	return asMockSdkAgent({
		agentId,
		send: vi.fn().mockResolvedValue(asMockCursorRun({
			id: `run-${agentId}`,
			agentId,
			status: "finished",
			wait: vi.fn().mockResolvedValue({ id: `run-${agentId}`, status: "finished", result: "done" }),
		})),
	});
}

describe("cursor provider lineage", () => {
	beforeEach(async () => {
		await resetCursorProviderTestState();
		lineageTestUtils.reset();
	});

	it("appends two distinct successfully sent local agent IDs for one native pi session", async () => {
		const pi = createPiHarness();
		registerCursorSessionScope(pi);
		registerCursorSessionAgentLineage(pi);
		await pi.runSessionStart({
			cwd: "/tmp/project",
			sessionManager: {
				getSessionId: vi.fn(() => "session-1"),
				getSessionFile: vi.fn(() => "/tmp/session.jsonl"),
				getEntries: vi.fn(() => []),
			},
		});
		mockedCreate
			.mockResolvedValueOnce(successfulAgent("agent-1"))
			.mockResolvedValueOnce(successfulAgent("agent-2"));

		await collectEvents(streamCursor(makeModel(), makeContext(), { apiKey: "test-key" }));
		await sessionAgentTestUtils.resetSessionCursorAgent();
		await collectEvents(streamCursor(makeModel(), makeContext(), { apiKey: "test-key" }));
		expect(pi.appendEntry.mock.calls).toEqual([
			[
				CURSOR_SESSION_AGENT_LINEAGE_ENTRY_TYPE,
				expect.objectContaining({ agentId: "agent-1", sessionId: "session-1" }),
			],
			[
				CURSOR_SESSION_AGENT_LINEAGE_ENTRY_TYPE,
				expect.objectContaining({ agentId: "agent-2", sessionId: "session-1" }),
			],
		]);
	});

	it("does not record an acquired local agent when abort prevents Agent.send", async () => {
		const pi = createPiHarness();
		registerCursorSessionScope(pi);
		registerCursorSessionAgentLineage(pi);
		await pi.runSessionStart({
			cwd: "/tmp/project",
			sessionManager: {
				getSessionId: vi.fn(() => "session-1"),
				getSessionFile: vi.fn(() => "/tmp/session.jsonl"),
				getEntries: vi.fn(() => []),
			},
		});
		const controller = new AbortController();
		const send = vi.fn();
		mockedCreate.mockImplementationOnce(async () => {
			controller.abort();
			return asMockSdkAgent({ agentId: "agent-unused", send });
		});

		await collectEvents(streamCursor(makeModel(), makeContext(), { apiKey: "test-key", signal: controller.signal }));

		expect(send).not.toHaveBeenCalled();
		expect(pi.appendEntry).not.toHaveBeenCalled();
	});

	it("records a local agent when Agent.send is initiated but rejects", async () => {
		const pi = createPiHarness();
		registerCursorSessionScope(pi);
		registerCursorSessionAgentLineage(pi);
		await pi.runSessionStart({
			cwd: "/tmp/project",
			sessionManager: {
				getSessionId: vi.fn(() => "session-1"),
				getSessionFile: vi.fn(() => "/tmp/session.jsonl"),
				getEntries: vi.fn(() => []),
			},
		});
		mockedCreate.mockResolvedValueOnce(asMockSdkAgent({
			agentId: "agent-failed",
			send: vi.fn().mockRejectedValue(new Error("send failed")),
		}));

		await collectEvents(streamCursor(makeModel(), makeContext(), { apiKey: "test-key" }));

		expect(pi.appendEntry).toHaveBeenCalledOnce();
		expect(pi.appendEntry).toHaveBeenCalledWith(
			CURSOR_SESSION_AGENT_LINEAGE_ENTRY_TYPE,
			expect.objectContaining({ agentId: "agent-failed", sessionId: "session-1" }),
		);
	});

	it("records lineage at the provider boundary", async () => {
		const pi = createPiHarness();
			registerCursorSessionScope(pi);
			registerCursorSessionAgentLineage(pi);
			await pi.runSessionStart({
				cwd: "/tmp/project",
				sessionManager: {
					getSessionId: vi.fn(() => "session-1"),
					getSessionFile: vi.fn(() => "/tmp/session.jsonl"),
					getEntries: vi.fn(() => []),
				},
			});
			mockedCreate.mockResolvedValueOnce(successfulAgent("agent-no-resume"));

			await collectEvents(streamCursor(makeModel(), makeContext(), { apiKey: "test-key" }));

			expect(pi.appendEntry).toHaveBeenCalledWith(
				CURSOR_SESSION_AGENT_LINEAGE_ENTRY_TYPE,
				expect.objectContaining({ agentId: "agent-no-resume", sessionId: "session-1" }),
			);
	});

	it("bootstraps a new agent when retired resume/cleanup JSONL is present and still records lineage", async () => {
		const pi = createPiHarness();
		registerCursorSessionScope(pi);
		registerCursorSessionAgentLineage(pi);
		const existingEntries: SessionEntry[] = [
			{
				type: "custom",
				id: "resume-old",
				parentId: null,
				timestamp: "2026-07-23T00:00:00.000Z",
				customType: "cursor-sdk-agent-resume",
				data: { version: 2, runtime: "local", agentId: "agent-old" },
			},
			{
				type: "custom",
				id: "cleanup-old",
				parentId: null,
				timestamp: "2026-07-23T00:00:00.000Z",
				customType: "cursor-sdk-agent-cleanup",
				data: { version: 1, agentId: "agent-old" },
			},
			{
				type: "custom",
				id: "lineage-old",
				parentId: null,
				timestamp: "2026-07-23T00:00:00.000Z",
				customType: CURSOR_SESSION_AGENT_LINEAGE_ENTRY_TYPE,
				data: {
					version: 1,
					runtime: "local",
					agentId: "agent-old",
					sessionId: "session-1",
					sessionFile: "/tmp/session.jsonl",
					scopeKey: "/tmp/session.jsonl",
					cwd: "/tmp/project",
					timestamp: "2026-07-23T00:00:00.000Z",
				},
			},
		];
		await pi.runSessionStart({
			cwd: "/tmp/project",
			sessionManager: {
				getSessionId: vi.fn(() => "session-1"),
				getSessionFile: vi.fn(() => "/tmp/session.jsonl"),
				getEntries: vi.fn(() => existingEntries),
			},
		});
		mockedCreate.mockResolvedValueOnce(successfulAgent("agent-new"));

		await collectEvents(streamCursor(makeModel(), makeContext(), { apiKey: "test-key" }));

		expect(mockedResume).not.toHaveBeenCalled();
		expect(mockedCreate).toHaveBeenCalled();
		expect(pi.appendEntry).toHaveBeenCalledWith(
			CURSOR_SESSION_AGENT_LINEAGE_ENTRY_TYPE,
			expect.objectContaining({ agentId: "agent-new", sessionId: "session-1" }),
		);
	});
});
