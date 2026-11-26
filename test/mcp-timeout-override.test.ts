import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	cursorMcpToolTimeoutOverrideDefaults,
	installCursorMcpToolTimeoutOverride,
	isCursorSdkMcpConnectTimeoutStack,
	isCursorSdkMcpToolTimeoutStack,
	resolveCursorMcpConnectTimeoutMs,
	resolveCursorMcpToolTimeoutMs,
	restoreCursorMcpToolTimeoutOverride,
} from "../src/mcp-timeout-override.js";

afterEach(() => {
	restoreCursorMcpToolTimeoutOverride();
	vi.useRealTimers();
});

function scheduleSyntheticCursorSdkMcpListToolsTimeout(callback: () => void): ReturnType<typeof setTimeout> {
	const sdkUrl = pathToFileURL(join(process.cwd(), "node_modules/@cursor/sdk/dist/esm/index.js")).href;
	const source = `
return (() => {
	class Protocol {
		_setupTimeout() {
			return setTimeout(callback, 60000);
		}

		request() {
			return this._setupTimeout();
		}
	}

	class Client extends Protocol {
		listTools() {
			return this.request();
		}
	}

	class McpSdkClient {
		constructor() {
			this.client = new Client();
		}

		getTools() {
			return this.client.listTools();
		}
	}

	return new McpSdkClient().getTools();
})();
//# sourceURL=${sdkUrl}
`;
	const run = new Function("callback", source) as (callback: () => void) => ReturnType<typeof setTimeout>;
	return run(callback);
}

function scheduleSyntheticCursorSdkMcpInitializeTimeout(callback: () => void): ReturnType<typeof setTimeout> {
	const sdkUrl = pathToFileURL(join(process.cwd(), "node_modules/@cursor/sdk/dist/esm/index.js")).href;
	const source = `
return (() => {
	class Protocol {
		_setupTimeout() {
			return setTimeout(callback, 60000);
		}

		request() {
			return this._setupTimeout();
		}
	}

	class Client extends Protocol {
		connect() {
			return this.request();
		}
	}

	return new Client().connect();
})();
//# sourceURL=${sdkUrl}
`;
	const run = new Function("callback", source) as (callback: () => void) => ReturnType<typeof setTimeout>;
	return run(callback);
}

function scheduleSyntheticCursorSdkMcpUnknownProtocolTimeout(callback: () => void): ReturnType<typeof setTimeout> {
	const sdkUrl = pathToFileURL(join(process.cwd(), "node_modules/@cursor/sdk/dist/esm/index.js")).href;
	const source = `
return (() => {
	class Protocol {
		_setupTimeout() {
			return setTimeout(callback, 60000);
		}

		request() {
			return this._setupTimeout();
		}
	}

	class Client extends Protocol {
		listPrompts() {
			return this.request();
		}
	}

	return new Client().listPrompts();
})();
//# sourceURL=${sdkUrl}
`;
	const run = new Function("callback", source) as (callback: () => void) => ReturnType<typeof setTimeout>;
	return run(callback);
}

function scheduleSyntheticCursorSdkMcpToolTimeout(callback: () => void): ReturnType<typeof setTimeout> {
	const sdkUrl = pathToFileURL(join(process.cwd(), "node_modules/@cursor/sdk/dist/esm/index.js")).href;
	const source = `
return (() => {
	class Protocol {
		_setupTimeout() {
			return setTimeout(callback, 60000);
		}

		request() {
			return this._setupTimeout();
		}
	}

	class Client extends Protocol {
		callTool() {
			return this.request();
		}
	}

	class McpSdkClient {
		constructor() {
			this.client = new Client();
		}

		callTool() {
			return this.client.callTool();
		}
	}

	return new McpSdkClient().callTool();
})();
//# sourceURL=${sdkUrl}
`;
	const run = new Function("callback", source) as (callback: () => void) => ReturnType<typeof setTimeout>;
	return run(callback);
}

function readCursorSdkEsmBundleContaining(...markers: string[]): string {
	const sdkEsmDir = join(process.cwd(), "node_modules/@cursor/sdk/dist/esm");
	const hits = readdirSync(sdkEsmDir).flatMap((fileName) => {
		if (!fileName.endsWith(".js")) return [];
		const source = readFileSync(join(sdkEsmDir, fileName), "utf8");
		return markers.every((marker) => source.includes(marker)) ? [{ fileName, source }] : [];
	});

	expect(hits.map((hit) => hit.fileName)).toHaveLength(1);
	return hits[0]!.source;
}

describe("Cursor MCP timeout override", () => {
	it("tracks the installed Cursor SDK MCP callTool timeout seam", () => {
		const sdkMcpBundle = readCursorSdkEsmBundleContaining(
			'withName("McpSdkClient.callTool")',
			'this.sendToolCall({name:t,arguments:r}',
		);
		const sdkProtocolBundle = readCursorSdkEsmBundleContaining(
			'this.request({method:"initialize"',
			"timeoutId:setTimeout",
		);

		expect(sdkMcpBundle).toContain('withName("McpSdkClient.callTool")');
		expect(sdkMcpBundle).toContain('this.client.callTool(e,void 0,n)');
		expect(sdkMcpBundle).toContain('withName("McpSdkClient.getTools")');
		expect(sdkMcpBundle).toContain('e.listTools({cursor:t})');
		expect(sdkProtocolBundle).toContain('this.request({method:"initialize"');
		expect(sdkProtocolBundle).toContain('_setupTimeout(e,t,s,n,r=!1)');
		expect(sdkProtocolBundle).toContain('timeoutId:setTimeout(n,t)');
	});

	it("recognizes the Cursor SDK MCP tool-call timeout stack shape", () => {
		const stack = `Error
    at Protocol._setupTimeout (${process.cwd()}/node_modules/@cursor/sdk/dist/esm/index.js:1:1)
    at Client.callTool (${process.cwd()}/node_modules/@cursor/sdk/dist/esm/index.js:1:1)
    at McpSdkClient.callTool (${process.cwd()}/node_modules/@cursor/sdk/dist/esm/index.js:1:1)`;
		const sendToolCallStack = `Error
    at Protocol._setupTimeout (${process.cwd()}/node_modules/@cursor/sdk/dist/esm/128.js:1:1)
    at Client.request (${process.cwd()}/node_modules/@cursor/sdk/dist/esm/128.js:1:1)
    at McpSdkClient.sendToolCall (${process.cwd()}/node_modules/@cursor/sdk/dist/esm/544.js:1:1)`;

		const listToolsStack = stack.replace(/callTool/g, "listTools").replace(/McpSdkClient\.listTools/, "McpSdkClient.getTools");
		const initializeStack = stack.replace(/callTool/g, "connect");
		const unknownProtocolStack = stack.replace(/callTool/g, "listPrompts");

		expect(isCursorSdkMcpToolTimeoutStack(stack)).toBe(true);
		expect(isCursorSdkMcpToolTimeoutStack(sendToolCallStack)).toBe(true);
		expect(isCursorSdkMcpToolTimeoutStack(listToolsStack)).toBe(false);
		expect(isCursorSdkMcpConnectTimeoutStack(listToolsStack)).toBe(true);
		expect(isCursorSdkMcpConnectTimeoutStack(initializeStack)).toBe(true);
		expect(isCursorSdkMcpConnectTimeoutStack(unknownProtocolStack)).toBe(false);
		expect(isCursorSdkMcpConnectTimeoutStack(stack)).toBe(false);
		expect(isCursorSdkMcpToolTimeoutStack(stack.replace(/node_modules\/\@cursor\/sdk/g, "src"))).toBe(false);
	});

	it("recognizes minified @cursor/sdk 1.5.2 MCP stack frames and rejects other protocol methods", () => {
		const sdk128 = `${process.cwd()}/node_modules/@cursor/sdk/dist/esm/128.js:1:952118`;
		const sdk544 = `${process.cwd()}/node_modules/@cursor/sdk/dist/esm/544.js:1:756567`;

		const minifiedSendToolCallStack = `Error\n    at g._setupTimeout (${sdk128})\n    at g.request (${sdk128})\n    at rT.sendToolCall (${sdk544})`;
		const minifiedCallToolStack = `Error\n    at d._setupTimeout (${sdk128})\n    at g.callTool (${sdk128})\n    at rT.callTool (${sdk544})`;
		const minifiedConnectStack = `Error\n    at g._setupTimeout (${sdk128})\n    at g.request (${sdk128})\n    at g.connect (${sdk128})`;
		const minifiedListToolsStack = `Error\n    at g._setupTimeout (${sdk128})\n    at g.request (${sdk128})\n    at g.listTools (${sdk128})\n    at rT.getTools (${sdk544})`;
		const minifiedListPromptsStack = `Error\n    at g._setupTimeout (${sdk128})\n    at g.request (${sdk128})\n    at g.listPrompts (${sdk128})`;
		const minifiedListResourcesStack = `Error\n    at g._setupTimeout (${sdk128})\n    at g.request (${sdk128})\n    at g.listResources (${sdk128})`;
		const minifiedPingStack = `Error\n    at g._setupTimeout (${sdk128})\n    at g.request (${sdk128})\n    at g.ping (${sdk128})`;

		expect(isCursorSdkMcpToolTimeoutStack(minifiedSendToolCallStack)).toBe(true);
		expect(isCursorSdkMcpToolTimeoutStack(minifiedCallToolStack)).toBe(true);
		expect(isCursorSdkMcpToolTimeoutStack(minifiedConnectStack)).toBe(false);
		expect(isCursorSdkMcpToolTimeoutStack(minifiedListToolsStack)).toBe(false);

		expect(isCursorSdkMcpConnectTimeoutStack(minifiedConnectStack)).toBe(true);
		expect(isCursorSdkMcpConnectTimeoutStack(minifiedListToolsStack)).toBe(true);
		expect(isCursorSdkMcpConnectTimeoutStack(minifiedSendToolCallStack)).toBe(false);
		expect(isCursorSdkMcpConnectTimeoutStack(minifiedCallToolStack)).toBe(false);

		expect(isCursorSdkMcpToolTimeoutStack(minifiedListPromptsStack)).toBe(false);
		expect(isCursorSdkMcpConnectTimeoutStack(minifiedListPromptsStack)).toBe(false);
		expect(isCursorSdkMcpConnectTimeoutStack(minifiedListResourcesStack)).toBe(false);
		expect(isCursorSdkMcpConnectTimeoutStack(minifiedPingStack)).toBe(false);
	});

	it("installs the override before Cursor session agent acquisition", async () => {
		vi.resetModules();
		const calls: string[] = [];
		vi.doMock("../src/mcp-timeout-override.js", () => ({
			installCursorMcpToolTimeoutOverride: () => calls.push("install"),
		}));
		vi.doMock("../src/session-agent.js", () => ({
			CURSOR_LOCAL_AGENT_IDLE_MS: 5 * 60 * 1000,
			acquireSessionCursorAgent: async () => {
				calls.push("acquire");
				throw new Error("stop before Cursor agent creation");
			},
			buildCursorSessionSendPrompt: vi.fn(),
			planCursorSessionSend: vi.fn(),
			resetSessionCursorAgent: vi.fn(),
		}));
		const { prepareCursorProviderTurn, resolveCursorProviderTurnConfig } = await import("../src/provider-turn-prepare.js");

		await expect(
			prepareCursorProviderTurn({
				params: {
					model: { id: "cursor/composer-2.5", provider: "cursor", api: "assistant" } as never,
					context: {} as never,
					stream: { push: vi.fn() } as never,
					partial: { content: [] } as never,
					sdkEventDebugRef: {},
				},
				cwd: process.cwd(),
				resolvedApiKey: "key",
				sdkEventDebug: undefined,
				throwIfAborted: vi.fn(),
				resolvedConfig: resolveCursorProviderTurnConfig(),
			}),
		).rejects.toThrow("stop before Cursor agent creation");

		expect(calls).toEqual(["install", "acquire"]);
		vi.doUnmock("../src/mcp-timeout-override.js");
		vi.doUnmock("../src/session-agent.js");
		vi.resetModules();
	}, 15_000);

	it("extends only the Cursor SDK MCP tool-call default timeout", () => {
		vi.useFakeTimers();
		installCursorMcpToolTimeoutOverride({ timeoutMs: 3_600_000 });
		const callback = vi.fn();

		scheduleSyntheticCursorSdkMcpToolTimeout(callback);

		vi.advanceTimersByTime(60_000);
		expect(callback).not.toHaveBeenCalled();

		vi.advanceTimersByTime(3_600_000 - 60_000);
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it("shortens known Cursor SDK MCP initialize and listTools default timeouts", () => {
		vi.useFakeTimers();
		installCursorMcpToolTimeoutOverride({ connectTimeoutMs: 10_000 });
		const listToolsCallback = vi.fn();
		const initializeCallback = vi.fn();

		scheduleSyntheticCursorSdkMcpListToolsTimeout(listToolsCallback);
		scheduleSyntheticCursorSdkMcpInitializeTimeout(initializeCallback);

		vi.advanceTimersByTime(9_999);
		expect(listToolsCallback).not.toHaveBeenCalled();
		expect(initializeCallback).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1);
		expect(listToolsCallback).toHaveBeenCalledTimes(1);
		expect(initializeCallback).toHaveBeenCalledTimes(1);
	});

	it("does not shorten unknown Cursor SDK MCP protocol default timeouts", () => {
		vi.useFakeTimers();
		installCursorMcpToolTimeoutOverride({ connectTimeoutMs: 10_000 });
		const callback = vi.fn();

		scheduleSyntheticCursorSdkMcpUnknownProtocolTimeout(callback);

		vi.advanceTimersByTime(10_000);
		expect(callback).not.toHaveBeenCalled();

		vi.advanceTimersByTime(50_000);
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it("uses a 10s connect default and clamps user config overrides", () => {
		expect(resolveCursorMcpConnectTimeoutMs({})).toBe(
			cursorMcpToolTimeoutOverrideDefaults.defaultConnectTimeoutMs,
		);
		expect(resolveCursorMcpConnectTimeoutMs({
			tools: { mcp: { connectTimeoutMs: 5_000 } },
		})).toBe(5_000);
		expect(resolveCursorMcpConnectTimeoutMs({
			tools: { mcp: { connectTimeoutMs: 500 } },
		})).toBe(cursorMcpToolTimeoutOverrideDefaults.minConnectTimeoutMs);
		expect(resolveCursorMcpConnectTimeoutMs({
			tools: { mcp: { connectTimeoutMs: 120_000 } },
		})).toBe(cursorMcpToolTimeoutOverrideDefaults.cursorSdkDefaultTimeoutMs);
	});

	it("does not extend unrelated 60s timers", () => {
		vi.useFakeTimers();
		installCursorMcpToolTimeoutOverride({ timeoutMs: 3_600_000 });
		const callback = vi.fn();

		setTimeout(callback, 60_000);

		vi.advanceTimersByTime(60_000);
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it("keeps non-default timer calls on the cheap no-stack fast path", () => {
		vi.useFakeTimers();
		installCursorMcpToolTimeoutOverride({ timeoutMs: 3_600_000 });
		const OriginalError = globalThis.Error;
		let stackCaptures = 0;
		const CountingError = class extends OriginalError {
			constructor(message?: string) {
				super(message);
				stackCaptures += 1;
			}
		} as ErrorConstructor;
		globalThis.Error = CountingError;
		try {
			setTimeout(vi.fn(), 1);
			expect(stackCaptures).toBe(0);

			setTimeout(vi.fn(), 60_000);
			expect(stackCaptures).toBe(1);
		} finally {
			globalThis.Error = OriginalError;
		}
	});

	it("uses a one-hour default and clamps user config overrides", () => {
		expect(resolveCursorMcpToolTimeoutMs({})).toBe(
			cursorMcpToolTimeoutOverrideDefaults.defaultOverrideTimeoutMs,
		);
		expect(resolveCursorMcpToolTimeoutMs({
			tools: { mcp: { callTimeoutMs: 120_000 } },
		})).toBe(120_000);
		expect(resolveCursorMcpToolTimeoutMs({
			tools: { mcp: { callTimeoutMs: 250_000 } },
		})).toBe(250_000);
		expect(resolveCursorMcpToolTimeoutMs({
			tools: { mcp: { callTimeoutMs: 999_999_999_999 } },
		})).toBe(cursorMcpToolTimeoutOverrideDefaults.maxNodeTimerDelayMs);
	});
});
