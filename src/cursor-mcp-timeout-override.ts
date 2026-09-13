import { loadCursorSdkUserConfig, type CursorSdkConfig } from "./cursor-config.js";

const CURSOR_SDK_MCP_DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_CURSOR_MCP_TOOL_TIMEOUT_MS = 3_600_000;
const DEFAULT_CURSOR_MCP_CONNECT_TIMEOUT_MS = 10_000;
const MIN_CURSOR_MCP_CONNECT_TIMEOUT_MS = 1_000;
const MAX_NODE_TIMER_DELAY_MS = 2_147_483_647;


interface CursorMcpToolTimeoutOverrideOptions {
	timeoutMs?: number;
	connectTimeoutMs?: number;
	config?: CursorSdkConfig;
}

interface CursorMcpToolTimeoutOverrideState {
	installed: boolean;
	timeoutMs: number;
	connectTimeoutMs: number;
	sdkDefaultTimeoutMs: number;
}

type GlobalSetTimeout = typeof globalThis.setTimeout;
type SetTimeoutHandler = Parameters<GlobalSetTimeout>[0];
type SetTimeoutDelay = Parameters<GlobalSetTimeout>[1];

let originalSetTimeout: GlobalSetTimeout | undefined;
let installedToolTimeoutMs = DEFAULT_CURSOR_MCP_TOOL_TIMEOUT_MS;
let installedConnectTimeoutMs = DEFAULT_CURSOR_MCP_CONNECT_TIMEOUT_MS;


function normalizeOverrideTimeoutMs(timeoutMs: number): number {
	if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return DEFAULT_CURSOR_MCP_TOOL_TIMEOUT_MS;
	return Math.min(Math.max(Math.trunc(timeoutMs), CURSOR_SDK_MCP_DEFAULT_TIMEOUT_MS), MAX_NODE_TIMER_DELAY_MS);
}

export function resolveCursorMcpToolTimeoutMs(config: CursorSdkConfig = loadCursorSdkUserConfig()): number {
	const timeoutMs = config.tools?.mcp?.callTimeoutMs;
	return normalizeOverrideTimeoutMs(timeoutMs ?? DEFAULT_CURSOR_MCP_TOOL_TIMEOUT_MS);
}

function normalizeConnectTimeoutMs(timeoutMs: number): number {
	if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return DEFAULT_CURSOR_MCP_CONNECT_TIMEOUT_MS;
	return Math.min(
		Math.max(Math.trunc(timeoutMs), MIN_CURSOR_MCP_CONNECT_TIMEOUT_MS),
		CURSOR_SDK_MCP_DEFAULT_TIMEOUT_MS,
	);
}

export function resolveCursorMcpConnectTimeoutMs(config: CursorSdkConfig = loadCursorSdkUserConfig()): number {
	const timeoutMs = config.tools?.mcp?.connectTimeoutMs;
	return normalizeConnectTimeoutMs(timeoutMs ?? DEFAULT_CURSOR_MCP_CONNECT_TIMEOUT_MS);
}

function isCursorSdkMcpProtocolTimeoutStack(stack: string | undefined): boolean {
	if (!stack) return false;
	return (
		/(?:node_modules[/\\]@cursor[/\\]sdk|node_modules\/\@cursor\/sdk|@cursor\/sdk\/dist)/.test(stack) &&
		/\b_setupTimeout\b|\bProtocol\._setupTimeout\b/.test(stack)
	);
}

export function isCursorSdkMcpToolTimeoutStack(stack: string | undefined): boolean {
	if (!stack) return false;
	return (
		isCursorSdkMcpProtocolTimeoutStack(stack) &&
		/\bcallTool\b|\bClient\.callTool\b|\bMcpSdkClient\.callTool\b/.test(stack)
	);
}

export function isCursorSdkMcpConnectTimeoutStack(stack: string | undefined): boolean {
	if (!stack || !isCursorSdkMcpProtocolTimeoutStack(stack)) return false;
	return /\bClient\.(?:connect|listTools)\b|\bMcpSdkClient\.getTools\b/.test(stack);
}

function isCursorSdkDefaultMcpTimeout(delay: SetTimeoutDelay): boolean {
	return typeof delay === "number" && delay === CURSOR_SDK_MCP_DEFAULT_TIMEOUT_MS;
}

function patchedSetTimeout(
	handler: SetTimeoutHandler,
	delay?: SetTimeoutDelay,
	...args: unknown[]
): ReturnType<GlobalSetTimeout> {
	const delegate = originalSetTimeout;
	if (!delegate) throw new Error("Cursor MCP timeout override installed without original setTimeout");

	let nextDelay = delay;
	if (isCursorSdkDefaultMcpTimeout(delay)) {
		const stack = new Error().stack;
		if (isCursorSdkMcpToolTimeoutStack(stack)) {
			nextDelay = installedToolTimeoutMs;
		} else if (isCursorSdkMcpConnectTimeoutStack(stack)) {
			nextDelay = installedConnectTimeoutMs;
		}
	}

	return Reflect.apply(delegate, globalThis, [handler, nextDelay, ...args]) as ReturnType<GlobalSetTimeout>;
}

export function installCursorMcpToolTimeoutOverride(
	options: CursorMcpToolTimeoutOverrideOptions = {},
): CursorMcpToolTimeoutOverrideState {
	installedToolTimeoutMs = normalizeOverrideTimeoutMs(
		options.timeoutMs ?? resolveCursorMcpToolTimeoutMs(options.config),
	);
	installedConnectTimeoutMs = normalizeConnectTimeoutMs(
		options.connectTimeoutMs ?? resolveCursorMcpConnectTimeoutMs(options.config),
	);

	if (!originalSetTimeout) {
		originalSetTimeout = globalThis.setTimeout;
		globalThis.setTimeout = patchedSetTimeout as GlobalSetTimeout;
	}

	return {
		installed: true,
		timeoutMs: installedToolTimeoutMs,
		connectTimeoutMs: installedConnectTimeoutMs,
		sdkDefaultTimeoutMs: CURSOR_SDK_MCP_DEFAULT_TIMEOUT_MS,
	};
}

export function restoreCursorMcpToolTimeoutOverride(): void {
	if (originalSetTimeout) {
		globalThis.setTimeout = originalSetTimeout;
		originalSetTimeout = undefined;
	}
	installedToolTimeoutMs = DEFAULT_CURSOR_MCP_TOOL_TIMEOUT_MS;
	installedConnectTimeoutMs = DEFAULT_CURSOR_MCP_CONNECT_TIMEOUT_MS;
}

export const cursorMcpToolTimeoutOverrideDefaults = {
	cursorSdkDefaultTimeoutMs: CURSOR_SDK_MCP_DEFAULT_TIMEOUT_MS,
	defaultOverrideTimeoutMs: DEFAULT_CURSOR_MCP_TOOL_TIMEOUT_MS,
	defaultConnectTimeoutMs: DEFAULT_CURSOR_MCP_CONNECT_TIMEOUT_MS,
	minConnectTimeoutMs: MIN_CURSOR_MCP_CONNECT_TIMEOUT_MS,
	maxNodeTimerDelayMs: MAX_NODE_TIMER_DELAY_MS,
} as const;
