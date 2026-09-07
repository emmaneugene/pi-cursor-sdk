import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Type } from "typebox";
import {
	createExtensionRegistrationPi,
	createTestToolInfo,
	getCursorPiBridgeMcpUrl,
} from "./helpers/pi-harness.js";
import {
	createExtensionPi,
	cursorPiToolBridgeTestUtils,
	resetIndexExtensionTestState,
} from "./helpers/index-extension-test-kit.js";
import { getCursorSessionScopeKey } from "../src/cursor-session-scope.js";

vi.mock("../src/model-discovery.js", () => ({
	discoverModels: vi.fn(),
	getCursorModelMetadata: vi.fn(),
}));

import extensionFactory from "../src/index.js";
import { discoverModels } from "../src/model-discovery.js";

const mockedDiscover = vi.mocked(discoverModels);

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForQueuedRequestCount(run: { takeQueuedToolRequests: () => unknown[] }): Promise<number> {
	for (let attempt = 0; attempt < 100; attempt += 1) {
		const count = run.takeQueuedToolRequests().length;
		if (count > 0) return count;
		await sleep(10);
	}
	throw new Error("Timed out waiting for queued bridge request");
}

describe("extension factory nested-session guard", () => {
	beforeEach(resetIndexExtensionTestState);
	afterEach(resetIndexExtensionTestState);

	it("does not re-register process-global Cursor state for a second in-process factory", async () => {
		mockedDiscover.mockResolvedValue([]);
		const parentPi = createExtensionPi();
		const childPi = createExtensionPi();
		const laterChildPi = createExtensionPi();

		await extensionFactory(parentPi);
		const parentBridge = cursorPiToolBridgeTestUtils.getRegisteredBridgeForTests();
		expect(parentBridge).toBeDefined();
		expect(mockedDiscover).toHaveBeenCalledOnce();
		expect(parentPi.registerProvider).toHaveBeenCalledOnce();

		await extensionFactory(childPi);

		expect(mockedDiscover).toHaveBeenCalledOnce();
		expect(childPi.registerProvider).not.toHaveBeenCalled();
		expect(childPi.registerCommand).not.toHaveBeenCalled();
		expect(childPi.registerTool).not.toHaveBeenCalled();
		expect(childPi.on).not.toHaveBeenCalled();
		expect(cursorPiToolBridgeTestUtils.getRegisteredBridgeForTests()).toBe(parentBridge);

		await childPi.runSessionShutdown({ reason: "quit" });
		await extensionFactory(laterChildPi);
		expect(laterChildPi.registerProvider).not.toHaveBeenCalled();
	});

	it("does not let a child session_start steal the parent Cursor session scope", async () => {
		mockedDiscover.mockResolvedValue([]);
		const parentPi = createExtensionPi();
		const childPi = createExtensionPi();
		await extensionFactory(parentPi);
		await parentPi.runSessionStart({
			sessionManager: { getSessionFile: vi.fn(() => "/tmp/parent-session.jsonl") },
		});
		expect(getCursorSessionScopeKey()).toBe("/tmp/parent-session.jsonl");

		await extensionFactory(childPi);
		await childPi.runSessionStart({
			sessionManager: { getSessionFile: vi.fn(() => "/tmp/child-session.jsonl") },
		});

		expect(getCursorSessionScopeKey()).toBe("/tmp/parent-session.jsonl");
	});

	it.each(["new", "resume", "fork", "reload", "quit"] as const)("allows a replacement factory to take ownership after parent %s", async (reason) => {
		mockedDiscover.mockResolvedValue([]);
		const parentPi = createExtensionPi();
		const nextPi = createExtensionPi();
		await extensionFactory(parentPi);
		const parentBridge = cursorPiToolBridgeTestUtils.getRegisteredBridgeForTests();
		await parentPi.runSessionShutdown({ reason });

		await extensionFactory(nextPi);

		expect(mockedDiscover).toHaveBeenCalledTimes(2);
		expect(nextPi.registerProvider).toHaveBeenCalledOnce();
		const nextBridge = cursorPiToolBridgeTestUtils.getRegisteredBridgeForTests();
		expect(nextBridge).toBeDefined();
		expect(nextBridge).not.toBe(parentBridge);
	});

	it("releases the factory claim when model discovery rejects during initialization", async () => {
		mockedDiscover.mockRejectedValueOnce(new Error("discovery failed")).mockResolvedValueOnce([]);
		const failedPi = createExtensionPi();
		const nextPi = createExtensionPi();

		await expect(extensionFactory(failedPi)).rejects.toThrow("discovery failed");
		await extensionFactory(nextPi);

		expect(mockedDiscover).toHaveBeenCalledTimes(2);
		expect(failedPi.registerProvider).not.toHaveBeenCalled();
		expect(nextPi.registerProvider).toHaveBeenCalledOnce();
	});

	it("does not dispose a live parent bridge run when a child factory loads", async () => {
		process.env.PI_CURSOR_EXPOSE_BUILTIN_TOOLS = "1";
		mockedDiscover.mockResolvedValue([]);
		const parentPi = createExtensionRegistrationPi({
			initialTools: [createTestToolInfo("read", Type.Object({ path: Type.String() }), "Read a file")],
			activeTools: ["read"],
		});
		const childPi = createExtensionPi();
		await extensionFactory(parentPi);
		const bridge = cursorPiToolBridgeTestUtils.getRegisteredBridgeForTests();
		if (!bridge) throw new Error("expected a registered parent bridge");
		const run = await bridge.createRun();
		const client = new Client({ name: "pi-cursor-sdk-factory-guard-test", version: "1.0.0" });
		const transport = new StreamableHTTPClientTransport(new URL(getCursorPiBridgeMcpUrl(run)));
		await client.connect(transport);
		try {
			const callPromise = client.callTool({ name: "pi__read", arguments: { path: "README.md" } });
			const observedCallError = callPromise.catch((error: unknown) => error);
			expect(await waitForQueuedRequestCount(run)).toBe(1);

			await extensionFactory(childPi);
			await sleep(50);

			expect(cursorPiToolBridgeTestUtils.getRegisteredBridgeForTests()).toBe(bridge);
			expect(cursorPiToolBridgeTestUtils.getRegisteredBridgeForTests()?.hasLiveRuns()).toBe(true);
			expect(childPi.registerProvider).not.toHaveBeenCalled();
			const raced = await Promise.race([
				observedCallError.then((error) => ({ settled: true as const, error })),
				sleep(20).then(() => ({ settled: false as const })),
			]);
			expect(raced.settled).toBe(false);
		} finally {
			await client.close().catch(() => undefined);
			await transport.close().catch(() => undefined);
			await run.dispose();
		}
	});
});
