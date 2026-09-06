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

import { cacheSdkContextWindow } from "../src/cursor-provider-turn-finalize.js";

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
