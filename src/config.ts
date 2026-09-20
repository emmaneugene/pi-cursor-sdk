import { randomUUID } from "node:crypto";
import {
	chmodSync,
	closeSync,
	existsSync,
	mkdirSync,
	openSync,
	readFileSync,
	renameSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { asRecord } from "./record-utils.js";

export const CURSOR_SDK_CONFIG_FILE = "cursor-sdk.json";

export type CursorConfigSource = "cli" | "user" | "session" | "builtin";

export interface CursorSdkConfig {
	models?: {
		fastDefaults?: Record<string, boolean>;
		cache?: { enabled?: boolean; ttlMs?: number };
	};
	local?: {
		autoReview?: boolean;
		sandbox?: boolean;
		transport?: "default" | "http1";
		settingSources?: string[];
		preservePiAgentsContext?: boolean;
	};
	tools?: {
		manifest?: boolean;
		bridge?: {
			enabled?: boolean;
			exposeBuiltins?: boolean;
			exclude?: string[];
			callTimeoutMs?: number;
			debug?: { stderr?: boolean; file?: string };
		};
		mcp?: { callTimeoutMs?: number; connectTimeoutMs?: number };
		display?: { native?: "auto" | "on" | "off"; taskPresentation?: "task" | "subagent" | "subagent-meta" };
	};
	debug?: {
		sdkEvents?: { enabled?: boolean; directory?: string; stderr?: boolean };
	};
}

export interface CursorResolvedSetting<T> {
	value: T;
	source: CursorConfigSource;
}

export interface CursorResolvedSdkConfig {
	local: {
		autoReview: CursorResolvedSetting<boolean>;
		sandboxEnabled: CursorResolvedSetting<boolean>;
		force: CursorResolvedSetting<boolean>;
		transport: CursorResolvedSetting<"default" | "http1">;
	};
	tools: {
		bridge: {
			exclude: CursorResolvedSetting<string[]>;
		};
	};
}

type WidenLiterals<T> = T extends string
	? string
	: T extends readonly (infer U)[]
		? WidenLiterals<U>[]
		: T extends object
			? { [K in keyof T]: WidenLiterals<T[K]> }
			: T;

export type CursorExplicitSdkConfig = WidenLiterals<CursorSdkConfig>;

export interface ResolveCursorSdkConfigOptions {
	cli?: CursorExplicitSdkConfig;
	cliForce?: boolean;
	session?: CursorSdkConfig;
	user?: CursorSdkConfig;
}

export interface LoadCursorSdkConfigOptions {
	agentDir?: string;
}

function parseNonEmptyString(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed ? trimmed : undefined;
}

function parseStringList(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const parsed = [...new Set(value.map(parseNonEmptyString).filter((entry): entry is string => entry !== undefined))];
	return parsed;
}

function parseFiniteNumber(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseStringLiteral<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
	return typeof value === "string" && (allowed as readonly string[]).includes(value) ? value as T : undefined;
}

export function parseCursorSdkConfig(value: unknown): CursorSdkConfig | undefined {
	const record = asRecord(value);
	if (!record) return undefined;
	const config: CursorSdkConfig = {};
	const models = asRecord(record.models);
	if (models) {
		const parsed: NonNullable<CursorSdkConfig["models"]> = {};
		const fastDefaults = asRecord(models.fastDefaults);
		if (fastDefaults) parsed.fastDefaults = Object.fromEntries(
			Object.entries(fastDefaults).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"),
		);
		const cache = asRecord(models.cache);
		if (cache) {
			const enabled = typeof cache.enabled === "boolean" ? cache.enabled : undefined;
			const ttlMs = parseFiniteNumber(cache.ttlMs);
			if (enabled !== undefined || ttlMs !== undefined) parsed.cache = { ...(enabled === undefined ? {} : { enabled }), ...(ttlMs === undefined ? {} : { ttlMs }) };
		}
		if (Object.keys(parsed).length > 0) config.models = parsed;
	}
	const local = asRecord(record.local);
	if (local) {
		const parsed: NonNullable<CursorSdkConfig["local"]> = {};
		if (typeof local.autoReview === "boolean") parsed.autoReview = local.autoReview;
		if (typeof local.sandbox === "boolean") parsed.sandbox = local.sandbox;
		const transport = parseStringLiteral(local.transport, ["default", "http1"] as const);
		if (transport) parsed.transport = transport;
		const settingSources = parseStringList(local.settingSources);
		if (settingSources) parsed.settingSources = settingSources;
		if (typeof local.preservePiAgentsContext === "boolean") parsed.preservePiAgentsContext = local.preservePiAgentsContext;
		if (Object.keys(parsed).length > 0) config.local = parsed;
	}
	const tools = asRecord(record.tools);
	if (tools) {
		const parsed: NonNullable<CursorSdkConfig["tools"]> = {};
		if (typeof tools.manifest === "boolean") parsed.manifest = tools.manifest;
		const bridge = asRecord(tools.bridge);
		if (bridge) {
			const parsedBridge: NonNullable<NonNullable<CursorSdkConfig["tools"]>["bridge"]> = {};
			if (typeof bridge.enabled === "boolean") parsedBridge.enabled = bridge.enabled;
			if (typeof bridge.exposeBuiltins === "boolean") parsedBridge.exposeBuiltins = bridge.exposeBuiltins;
			const exclude = parseStringList(bridge.exclude);
			if (exclude) parsedBridge.exclude = exclude;
			const callTimeoutMs = parseFiniteNumber(bridge.callTimeoutMs);
			if (callTimeoutMs !== undefined) parsedBridge.callTimeoutMs = callTimeoutMs;
			const debug = asRecord(bridge.debug);
			if (debug) {
				const stderr = typeof debug.stderr === "boolean" ? debug.stderr : undefined;
				const file = parseNonEmptyString(debug.file);
				if (stderr !== undefined || file !== undefined) parsedBridge.debug = { ...(stderr === undefined ? {} : { stderr }), ...(file === undefined ? {} : { file }) };
			}
			if (Object.keys(parsedBridge).length > 0) parsed.bridge = parsedBridge;
		}
		const mcp = asRecord(tools.mcp);
		if (mcp) {
			const callTimeoutMs = parseFiniteNumber(mcp.callTimeoutMs);
			const connectTimeoutMs = parseFiniteNumber(mcp.connectTimeoutMs);
			if (callTimeoutMs !== undefined || connectTimeoutMs !== undefined) parsed.mcp = { ...(callTimeoutMs === undefined ? {} : { callTimeoutMs }), ...(connectTimeoutMs === undefined ? {} : { connectTimeoutMs }) };
		}
		const display = asRecord(tools.display);
		if (display) {
			const native = parseStringLiteral(display.native, ["auto", "on", "off"] as const);
			const taskPresentation = parseStringLiteral(display.taskPresentation, ["task", "subagent", "subagent-meta"] as const);
			if (native || taskPresentation) parsed.display = { ...(native === undefined ? {} : { native }), ...(taskPresentation === undefined ? {} : { taskPresentation }) };
		}
		if (Object.keys(parsed).length > 0) config.tools = parsed;
	}
	const debug = asRecord(record.debug);
	const sdkEvents = asRecord(debug?.sdkEvents);
	if (sdkEvents) {
		const enabled = typeof sdkEvents.enabled === "boolean" ? sdkEvents.enabled : undefined;
		const directory = parseNonEmptyString(sdkEvents.directory);
		const stderr = typeof sdkEvents.stderr === "boolean" ? sdkEvents.stderr : undefined;
		if (enabled !== undefined || directory !== undefined || stderr !== undefined) config.debug = { sdkEvents: { ...(enabled === undefined ? {} : { enabled }), ...(directory === undefined ? {} : { directory }), ...(stderr === undefined ? {} : { stderr }) } };
	}
	return config;
}

export function getCursorSdkUserConfigPath(agentDir = getAgentDir()): string {
	return join(agentDir, CURSOR_SDK_CONFIG_FILE);
}

function readCursorSdkConfigFile(path: string): CursorSdkConfig {
	if (!existsSync(path)) return {};
	try {
		return parseCursorSdkConfig(JSON.parse(readFileSync(path, "utf-8"))) ?? {};
	} catch {
		return {};
	}
}

export function loadCursorSdkConfigForUpdate(path: string): Record<string, unknown> {
	if (!existsSync(path)) return {};
	let source: string;
	try {
		source = readFileSync(path, "utf-8");
	} catch (error) {
		throw new Error(`Failed to read Cursor SDK config ${path}: ${error instanceof Error ? error.message : String(error)}`);
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(source);
	} catch {
		throw new Error(`Invalid JSON in Cursor SDK config ${path}`);
	}
	const record = asRecord(parsed);
	if (!record) throw new Error(`Invalid Cursor SDK config ${path}: expected a JSON object`);
	return record;
}

export function loadCursorSdkUserConfig(path = getCursorSdkUserConfigPath()): CursorSdkConfig {
	return readCursorSdkConfigFile(path);
}

export function loadCursorSdkConfig(options: LoadCursorSdkConfigOptions = {}): { user: CursorSdkConfig } {
	return { user: loadCursorSdkUserConfig(getCursorSdkUserConfigPath(options.agentDir)) };
}

const CONFIG_LOCK_RETRY_MS = 20;
const CONFIG_LOCK_TIMEOUT_MS = 5_000;
const configLockWaitBuffer = new Int32Array(new SharedArrayBuffer(4));

function sleepForConfigLock(): void {
	Atomics.wait(configLockWaitBuffer, 0, 0, CONFIG_LOCK_RETRY_MS);
}

function acquireCursorSdkConfigLock(path: string): () => void {
	mkdirSync(dirname(path), { recursive: true });
	const lockPath = `${path}.lock`;
	const deadline = Date.now() + CONFIG_LOCK_TIMEOUT_MS;
	while (true) {
		try {
			const descriptor = openSync(lockPath, "wx", 0o600);
			return () => {
				try { closeSync(descriptor); } finally { rmSync(lockPath, { force: true }); }
			};
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
			if (Date.now() >= deadline) throw new Error(`Timed out waiting for Cursor SDK config lock ${lockPath}; remove it only if no pi process is writing this config`);
			sleepForConfigLock();
		}
	}
}

function replaceJsonFile(path: string, config: object, mode?: number): void {
	mkdirSync(dirname(path), { recursive: true });
	const tempPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
	let replaced = false;
	try {
		writeFileSync(tempPath, `${JSON.stringify(config, null, 2)}\n`, { encoding: "utf8", flag: "wx", ...(mode === undefined ? {} : { mode }) });
		if (mode !== undefined) chmodSync(tempPath, mode);
		renameSync(tempPath, path);
		replaced = true;
	} finally {
		if (!replaced) {
			try { rmSync(tempPath, { force: true }); } catch { /* Keep the replacement failure; cleanup is best effort. */ }
		}
	}
}

function withCursorSdkConfigLock<T>(path: string, operation: () => T): T {
	const release = acquireCursorSdkConfigLock(path);
	try { return operation(); } finally { release(); }
}

export function updateCursorSdkConfig(path: string, update: (current: Record<string, unknown>) => Record<string, unknown>, options: { newFileMode?: number } = {}): Record<string, unknown> {
	return withCursorSdkConfigLock(path, () => {
		const updated = update(loadCursorSdkConfigForUpdate(path));
		const mode = existsSync(path) ? statSync(path).mode & 0o777 : options.newFileMode;
		replaceJsonFile(path, updated, mode);
		return updated;
	});
}

export function saveCursorSdkUserConfig(config: CursorSdkConfig, path = getCursorSdkUserConfigPath()): void {
	updateCursorSdkConfig(path, () => ({ ...config }), { newFileMode: 0o600 });
}

function mergeRecords(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(Object.keys({ ...base, ...patch }).map((key) => {
		const baseValue = base[key];
		const patchValue = patch[key];
		const baseRecord = asRecord(baseValue);
		const patchRecord = asRecord(patchValue);
		return [key, baseRecord && patchRecord ? mergeRecords(baseRecord, patchRecord) : patchValue === undefined ? baseValue : patchValue];
	}));
}

export function mergeCursorSdkConfig(base: CursorSdkConfig, patch: CursorSdkConfig): CursorSdkConfig {
	return mergeCursorSdkConfigForUpdate(base as Record<string, unknown>, patch) as CursorSdkConfig;
}

export function mergeCursorSdkConfigForUpdate(base: Record<string, unknown>, patch: CursorSdkConfig): Record<string, unknown> {
	return mergeRecords(base, patch as Record<string, unknown>);
}

export function cursorFastDefaultsFromConfig(config: CursorSdkConfig | undefined): Map<string, boolean> {
	return new Map(Object.entries(config?.models?.fastDefaults ?? {}));
}

export function withCursorFastDefaults<T extends object>(config: T, fastDefaults: Map<string, boolean>): T & { models: { fastDefaults: Record<string, boolean> } } {
	const models = asRecord((config as Record<string, unknown>).models);
	return {
		...config,
		models: { ...models, fastDefaults: Object.fromEntries([...fastDefaults.entries()].sort(([a], [b]) => a.localeCompare(b))) },
	} as T & { models: { fastDefaults: Record<string, boolean> } };
}

function resolved<T>(source: CursorConfigSource, value: T): CursorResolvedSetting<T> {
	return { value, source };
}

function resolveField<T>(layers: Array<CursorResolvedSetting<T> | undefined>): CursorResolvedSetting<T> {
	const match = layers.find((layer): layer is CursorResolvedSetting<T> => layer !== undefined);
	if (!match) throw new Error("Cursor config resolver missing built-in default");
	return match;
}

function valueFrom<T>(source: CursorConfigSource, value: T | undefined): CursorResolvedSetting<T> | undefined {
	return value === undefined ? undefined : resolved(source, value);
}

export function resolveCursorSdkConfig(options: ResolveCursorSdkConfigOptions = {}): CursorResolvedSdkConfig {
	const cli = options.cli;
	const session = options.session;
	const user = options.user;
	return {
		local: {
			autoReview: resolveField([valueFrom("cli", cli?.local?.autoReview), valueFrom("user", user?.local?.autoReview), resolved("builtin", false)]),
			sandboxEnabled: resolveField([valueFrom("cli", cli?.local?.sandbox), valueFrom("user", user?.local?.sandbox), resolved("builtin", false)]),
			force: resolveField([valueFrom("cli", options.cliForce), resolved("builtin", false)]),
			transport: resolveField([valueFrom("session", session?.local?.transport), valueFrom("user", user?.local?.transport), resolved("builtin", "default")]),
		},
		tools: {
			bridge: {
				exclude: resolveField([valueFrom("user", user?.tools?.bridge?.exclude), resolved("builtin", [])]),
			},
		},
	};
}

/** Builds the bridge snapshot exclusion set from resolved tools.bridge config. */
export function buildCursorBridgeExcludeToolNames(resolvedConfig: CursorResolvedSdkConfig): ReadonlySet<string> {
	const names = resolvedConfig.tools.bridge.exclude.value;
	return names.length > 0 ? new Set(names) : new Set();
}

export function resolveCursorFastDefault(options: { cliForceFast?: boolean; cliForceNoFast?: boolean; sessionValue?: boolean; userValue?: boolean; modelDefault: boolean }): CursorResolvedSetting<boolean> {
	if (options.cliForceNoFast) return resolved("cli", false);
	if (options.cliForceFast) return resolved("cli", true);
	if (options.sessionValue !== undefined) return resolved("session", options.sessionValue);
	if (options.userValue !== undefined) return resolved("user", options.userValue);
	return resolved("builtin", options.modelDefault);
}
