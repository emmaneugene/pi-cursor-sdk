import { afterEach, describe, expect, it, vi } from "vitest";
import type { SDKAgent } from "@cursor/sdk";
import {
	__testUtils,
	attachCursorSdkBilledTurnUsage,
	fetchCursorSdkAgentUsage,
	selectCursorBilledTurnUsage,
	sumCursorSdkTurnUsage,
} from "../src/cursor-sdk-billed-usage.js";

const turnA = { inputTokens: 10, outputTokens: 2, cacheReadTokens: 4, cacheWriteTokens: 1 };
const turnB = { inputTokens: 20, outputTokens: 3, cacheReadTokens: 8, cacheWriteTokens: 2 };

afterEach(() => {
	__testUtils.reset();
});

describe("cursor billed usage selection", () => {
	it("sums unseen turns", () => {
		const agentUsage = {
			usage: { inputTokens: 30, outputTokens: 5, cacheReadTokens: 12, cacheWriteTokens: 3, totalTokens: 50 },
			runs: [
				{ runId: "run-aaaa", usage: turnA },
				{ runId: "usage-b", usage: turnB },
			],
		};
		expect(selectCursorBilledTurnUsage(agentUsage, {})).toEqual({
			turn: sumCursorSdkTurnUsage([turnA, turnB]),
			runIds: ["run-aaaa", "usage-b"],
		});
		expect(selectCursorBilledTurnUsage(agentUsage, { seenRunIds: new Set(["run-aaaa"]) })).toEqual({
			turn: turnB,
			runIds: ["usage-b"],
		});
	});

	it("calls getUsage without arguments", async () => {
		const getUsage = vi.fn().mockResolvedValue({ usage: turnA, runs: [] });
		const agent = { getUsage } as unknown as SDKAgent;
		await fetchCursorSdkAgentUsage(agent);
		expect(getUsage).toHaveBeenCalledWith();
	});

	it("watermarks selected runIds so a later fetch skips them", async () => {
		const getUsage = vi.fn()
			.mockResolvedValueOnce({
				usage: turnA,
				runs: [{ runId: "usage-a", usage: turnA }],
			})
			.mockResolvedValueOnce({
				usage: turnB,
				runs: [
					{ runId: "usage-a", usage: turnA },
					{ runId: "usage-b", usage: turnB },
				],
			});
		const agent = { getUsage } as unknown as SDKAgent;
		const first = await attachCursorSdkBilledTurnUsage({
			agent,
			agentId: "agent-1",
		});
		const second = await attachCursorSdkBilledTurnUsage({
			agent,
			agentId: "agent-1",
		});
		expect(first.turn).toEqual(turnA);
		expect(second.turn).toEqual(turnB);
	});

	it("returns undefined when getUsage is missing or times out", async () => {
		expect(await fetchCursorSdkAgentUsage({} as SDKAgent)).toBeUndefined();
		const getUsage = vi.fn(() => new Promise(() => {}));
		const agent = { getUsage } as unknown as SDKAgent;
		await expect(fetchCursorSdkAgentUsage(agent)).resolves.toBeUndefined();
	}, 8000);
});
