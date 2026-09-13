import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Type } from "typebox";
import {
	__testUtils,
	registerCursorPiToolBridge,
	resolveCursorPiToolBridgeConfig,
	type CursorPiToolBridgeExtensionApi,
	type CursorPiToolBridgeRun,
} from "../src/cursor-pi-tool-bridge.js";
import {
	createBridgePiHarness,
	createBuiltinToolInfo,
	getCursorPiBridgeMcpUrl,
} from "./helpers/pi-harness.js";

function registerTestBridge(pi: CursorPiToolBridgeExtensionApi, callTimeoutMs = 500) {
	return registerCursorPiToolBridge(pi, resolveCursorPiToolBridgeConfig({
		tools: {
			bridge: {
				exposeBuiltins: true,
				...(callTimeoutMs === undefined ? {} : { callTimeoutMs }),
			},
		},
	}));
}

async function waitForQueuedRequest(run: CursorPiToolBridgeRun) {
	for (let attempt = 0; attempt < 100; attempt += 1) {
		const [request] = run.takeQueuedToolRequests();
		if (request) return request;
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	throw new Error("Timed out waiting for queued bridge request");
}

describe("cursor pi tool bridge CallTool deadline", () => {
	afterEach(async () => {
		await __testUtils.resetRegisteredBridgeForTests();
	});

	it("defaults to the effective MCP tool timeout and allows only a lower bridge deadline", () => {
		expect(resolveCursorPiToolBridgeConfig({}).callTimeoutMs).toBe(3_600_000);
		expect(resolveCursorPiToolBridgeConfig({ tools: { bridge: { callTimeoutMs: 120_000 } } }).callTimeoutMs).toBe(120_000);
		expect(resolveCursorPiToolBridgeConfig({ tools: { bridge: { callTimeoutMs: 7_200_000 } } }).callTimeoutMs).toBe(3_600_000);
		expect(resolveCursorPiToolBridgeConfig({
			tools: { mcp: { callTimeoutMs: 60_000 }, bridge: { callTimeoutMs: 120_000 } },
		}).callTimeoutMs).toBe(60_000);
	});

	it("rejects a stranded call, clears pending state, and aborts active pi execution", async () => {
		const pi = createBridgePiHarness({
			active: ["bash"],
			tools: [createBuiltinToolInfo("bash", Type.Object({ command: Type.String() }), "Run shell commands")],
		});
		const run = await registerTestBridge(pi).createRun();
		const client = new Client({ name: "pi-cursor-sdk-test", version: "1.0.0" });
		const transport = new StreamableHTTPClientTransport(new URL(getCursorPiBridgeMcpUrl(run)));
		await client.connect(transport);
		try {
			const callResult = client.callTool({ name: "pi__bash", arguments: { command: "sleep 30" } }).catch((error: unknown) => error);
			const request = await waitForQueuedRequest(run);
			const abort = vi.fn();
			await pi.runToolCall(
				{ type: "tool_call", toolCallId: request.piToolCallId, toolName: "bash", input: request.args },
				{ signal: new AbortController().signal, abort },
			);

			const result = await Promise.race([
				callResult,
				new Promise((resolve) => setTimeout(() => resolve("still pending"), 2_000)),
			]);
			expect(result).toBeInstanceOf(Error);
			expect((result as Error).message).toMatch(/timed out.*500 ?ms|MCP error/i);
			expect(abort).toHaveBeenCalledOnce();
			expect(__testUtils.getActiveBridgeToolExecutionAbortCount()).toBe(0);
			expect(run.hasPendingPiToolCallId(request.piToolCallId)).toBe(false);
		} finally {
			await client.close().catch(() => undefined);
			await transport.close().catch(() => undefined);
			await run.dispose();
		}
	});

	it("aborts active pi execution when the MCP client cancels CallTool", async () => {
		const pi = createBridgePiHarness({
			active: ["bash"],
			tools: [createBuiltinToolInfo("bash", Type.Object({ command: Type.String() }), "Run shell commands")],
		});
		const run = await registerTestBridge(pi).createRun();
		const client = new Client({ name: "pi-cursor-sdk-test", version: "1.0.0" });
		const transport = new StreamableHTTPClientTransport(new URL(getCursorPiBridgeMcpUrl(run)));
		await client.connect(transport);
		try {
			const clientAbort = new AbortController();
			const callResult = client.callTool(
				{ name: "pi__bash", arguments: { command: "sleep 30" } },
				undefined,
				{ signal: clientAbort.signal },
			).catch((error: unknown) => error);
			const request = await waitForQueuedRequest(run);
			const abort = vi.fn();
			await pi.runToolCall(
				{ type: "tool_call", toolCallId: request.piToolCallId, toolName: "bash", input: request.args },
				{ signal: new AbortController().signal, abort },
			);

			clientAbort.abort();

			expect(await callResult).toBeInstanceOf(Error);
			await vi.waitFor(() => expect(abort).toHaveBeenCalledOnce());
			expect(__testUtils.getActiveBridgeToolExecutionAbortCount()).toBe(0);
			expect(run.hasPendingPiToolCallId(request.piToolCallId)).toBe(false);
		} finally {
			await client.close().catch(() => undefined);
			await transport.close().catch(() => undefined);
			await run.dispose();
		}
	});

	it("blocks a bridge tool event that reaches pi after its call expired", async () => {
		const pi = createBridgePiHarness({
			active: ["bash"],
			tools: [createBuiltinToolInfo("bash", Type.Object({ command: Type.String() }), "Run shell commands")],
		});
		const run = await registerTestBridge(pi).createRun();
		const client = new Client({ name: "pi-cursor-sdk-test", version: "1.0.0" });
		const transport = new StreamableHTTPClientTransport(new URL(getCursorPiBridgeMcpUrl(run)));
		await client.connect(transport);
		try {
			const callResult = client.callTool({ name: "pi__bash", arguments: { command: "sleep 30" } }).catch((error: unknown) => error);
			const request = await waitForQueuedRequest(run);
			expect(await callResult).toBeInstanceOf(Error);

			const hookResult = await pi.runToolCall({
				type: "tool_call",
				toolCallId: request.piToolCallId,
				toolName: "bash",
				input: request.args,
			});

			expect(hookResult).toEqual({ block: true, reason: "Cursor pi bridge tool call is no longer pending" });
		} finally {
			await client.close().catch(() => undefined);
			await transport.close().catch(() => undefined);
			await run.dispose();
		}
	});

	it("does not let a superseded tool_call handler block the replacement bridge", async () => {
		const pi = createBridgePiHarness({
			active: ["bash"],
			tools: [createBuiltinToolInfo("bash", Type.Object({ command: Type.String() }), "Run shell commands")],
		});
		registerTestBridge(pi);
		const run = await registerTestBridge(pi).createRun();
		const client = new Client({ name: "pi-cursor-sdk-test", version: "1.0.0" });
		const transport = new StreamableHTTPClientTransport(new URL(getCursorPiBridgeMcpUrl(run)));
		await client.connect(transport);
		try {
			const callPromise = client.callTool({ name: "pi__bash", arguments: { command: "echo ok" } });
			const request = await waitForQueuedRequest(run);

			const hookResult = await pi.runToolCall(
				{
					type: "tool_call",
					toolCallId: request.piToolCallId,
					toolName: "bash",
					input: request.args,
				},
				{
					signal: new AbortController().signal,
					abort: vi.fn(),
				},
			);

			expect(hookResult).toBeUndefined();
			expect(run.hasPendingPiToolCallId(request.piToolCallId)).toBe(true);

			await run.resolveToolResultsFromContext({
				systemPrompt: "",
				messages: [
					{
						role: "toolResult",
						toolCallId: request.piToolCallId,
						toolName: "bash",
						content: [{ type: "text", text: "ok" }],
						isError: false,
						timestamp: 1,
					},
				],
			});
			await expect(callPromise).resolves.toMatchObject({
				content: [{ type: "text", text: "ok" }],
			});
		} finally {
			await client.close().catch(() => undefined);
			await transport.close().catch(() => undefined);
			await run.dispose();
		}
	});

	it("aborts active pi execution when its bridge run is cancelled", async () => {
		const pi = createBridgePiHarness({
			active: ["bash"],
			tools: [createBuiltinToolInfo("bash", Type.Object({ command: Type.String() }), "Run shell commands")],
		});
		const run = await registerTestBridge(pi).createRun();
		const client = new Client({ name: "pi-cursor-sdk-test", version: "1.0.0" });
		const transport = new StreamableHTTPClientTransport(new URL(getCursorPiBridgeMcpUrl(run)));
		await client.connect(transport);
		try {
			const callResult = client.callTool({ name: "pi__bash", arguments: { command: "sleep 30" } }).catch((error: unknown) => error);
			const request = await waitForQueuedRequest(run);
			const abort = vi.fn();
			await pi.runToolCall(
				{ type: "tool_call", toolCallId: request.piToolCallId, toolName: "bash", input: request.args },
				{ signal: new AbortController().signal, abort },
			);

			run.cancel("cancelled by test");

			expect(await callResult).toBeInstanceOf(Error);
			expect(abort).toHaveBeenCalledOnce();
			expect(__testUtils.getActiveBridgeToolExecutionAbortCount()).toBe(0);
		} finally {
			await client.close().catch(() => undefined);
			await transport.close().catch(() => undefined);
			await run.dispose();
		}
	});
});
