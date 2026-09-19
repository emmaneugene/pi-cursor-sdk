import { beforeEach, describe, expect, it, vi } from "vitest";

const { createAgentPlatform, loadLatest, saveCachedContextWindow } = vi.hoisted(() => ({
	createAgentPlatform: vi.fn(),
	loadLatest: vi.fn(),
	saveCachedContextWindow: vi.fn(),
}));

vi.mock("../src/cursor-sdk-runtime.js", () => ({
	loadCursorSdk: vi.fn(async () => ({ createAgentPlatform })),
}));

vi.mock("../src/context-window-cache.js", () => ({
	getCheckpointContextWindow: (checkpoint: unknown) =>
		(checkpoint as { tokenDetails?: { maxTokens?: number } } | null)?.tokenDetails?.maxTokens,
	saveCachedContextWindow,
}));

import { createAssistantMessageEventStream } from "@earendil-works/pi-ai";
import type { LocalAgentStore, SDKAgent } from "@cursor/sdk";
import { awaitFinalizeCursorRunOutcome, cacheSdkContextWindow } from "../src/cursor-provider-turn-finalize.js";
import { CursorSdkTurnCoordinator } from "../src/cursor-provider-turn-coordinator.js";
import type { CursorProviderTurnPrepareResult } from "../src/cursor-provider-turn-types.js";
import type { SessionCursorAgentLease } from "../src/cursor-session-agent.js";
import { makeAssistantMessage } from "./helpers/pi-harness.js";

describe("cacheSdkContextWindow", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createAgentPlatform.mockResolvedValue({ checkpointStore: { loadLatest } });
		loadLatest.mockResolvedValue({ tokenDetails: { maxTokens: 200_000 } });
	});

	it("opens the Cursor SDK platform scoped to the pi session cwd", async () => {
		await cacheSdkContextWindow("agent-1", "composer-2.5", "/repo/session-cwd");

		expect(createAgentPlatform).toHaveBeenCalledWith({
			workspaceRef: "/repo/session-cwd",
			scopedWorkspaceRef: "/repo/session-cwd",
		});
		expect(loadLatest).toHaveBeenCalledWith("agent-1");
		expect(saveCachedContextWindow).toHaveBeenCalledWith("composer-2.5", 200_000);
	});

	it("keeps the SDK default platform path when no cwd is available", async () => {
		await cacheSdkContextWindow("agent-1", "composer-2.5");

		expect(createAgentPlatform).toHaveBeenCalledWith(undefined);
	});
});

describe("awaitFinalizeCursorRunOutcome", () => {
	it("checkpoints the leased session agent, not the SDK run agent id", async () => {
		createAgentPlatform.mockResolvedValue({ checkpointStore: { loadLatest } });
		loadLatest.mockResolvedValue({ tokenDetails: { maxTokens: 200_000 } });
		const textDeltas: string[] = [];
		const prepared: CursorProviderTurnPrepareResult = {
			cwd: "/repo/session-cwd",
			payload: { text: "hello" },
			meta: {
				sendPlan: { mode: "incremental", reason: "incremental", resetAgent: false },
				prompt: { text: "hello", images: [] },
				bootstrap: false,
				promptInputTokens: 0,
				useNativeToolReplay: false,
				bridgeEnabled: false,
				nativeReplayId: "replay-1",
				agentMode: "agent",
				modelSelection: { id: "composer-2.5" },
			},
			localForce: { value: false, source: "builtin" },
			sessionAgentLease: {
				scopeKey: "scope-1",
				poolKey: "pool-1",
				instanceId: 1,
				agent: { agentId: "lease-agent" } as SDKAgent,
				store: {} as LocalAgentStore,
				storeIdentity: { version: 1, stateRoot: "/tmp/store" },
				sendState: { bootstrapped: false, contextFingerprint: "", incrementalSendCount: 0 },
				created: true,
				commitSend: () => {},
				trackRunCompletion: () => {},
			} satisfies SessionCursorAgentLease,
			restoreCursorSdkOutputFilter: () => {},
			lifecycle: {
				commitSend: () => {},
				trackRunCompletion: () => {},
				abandon: async () => {},
				dispose: async () => {},
			},
			runtime: {
				kind: "direct",
				turnCoordinator: new CursorSdkTurnCoordinator({
					stream: createAssistantMessageEventStream(),
					partial: makeAssistantMessage(""),
					cwd: "/repo/session-cwd",
					useNativeToolReplay: false,
					nativeReplayId: "replay-1",
					textDeltas,
				}),
			},
		};

		await awaitFinalizeCursorRunOutcome({
			run: {
				id: "run-1",
				agentId: "run-agent",
				status: "finished",
				wait: async () => ({
					id: "run-1",
					agentId: "run-agent",
					status: "finished",
					result: "ok",
					durationMs: 1,
					model: { id: "composer-2.5" },
				}),
			} as never,
			prepared,
			cursorAgentMessageOffset: 0,
			modelId: "composer-2.5",
		});

		expect(loadLatest).toHaveBeenCalledWith("lease-agent");
		expect(loadLatest).not.toHaveBeenCalledWith("run-agent");
	});
});
