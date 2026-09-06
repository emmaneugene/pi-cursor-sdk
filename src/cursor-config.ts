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
import { CONFIG_DIR_NAME, getAgentDir } from "@earendil-works/pi-coding-agent";
import { parseOptionalEnvBoolean } from "./cursor-env-boolean.js";
import { asRecord } from "./cursor-record-utils.js";

export const CURSOR_SDK_CONFIG_FILE = "cursor-sdk.json";

export const CURSOR_AUTO_REVIEW_ENV = "PI_CURSOR_AUTO_REVIEW";
export const CURSOR_SANDBOX_ENV = "PI_CURSOR_SANDBOX";
export const CURSOR_LOCAL_FORCE_ENV = "PI_CURSOR_LOCAL_FORCE";
export const CURSOR_LOCAL_RESUME_ENV = "PI_CURSOR_LOCAL_RESUME";
export const CURSOR_HTTP1_ENV = "PI_CURSOR_HTTP_1_1";

export type CursorConfigSource = "cli" | "environment" | "project" | "user" | "session" | "model-alias" | "builtin";
export type CursorConfigTrustLevel = "one-shot" | "environment" | "trusted-project" | "user" | "session" | "model-catalog" | "builtin";

export interface CursorSdkConfig {
	fastDefaults?: Record<string, boolean>;
	local?: {
		autoReview?: boolean;
		sandbox?: boolean;
		sandboxOptions?: {
			enabled?: boolean;
		};
		force?: boolean;
		resume?: boolean;
		useHttp1ForAgent?: boolean;
	};
	bridge?: {
		/** Pi tool names hidden from the pi tool bridge; unset/empty exposes all non-excluded active tools. */
		excludeTools?: string[];
	};
}

export interface CursorResolvedSetting<T> {
	value: T;
	source: CursorConfigSource;
	trustLevel: CursorConfigTrustLevel;
}

export interface CursorResolvedSdkConfig {
	local: {
		autoReview: CursorResolvedSetting<boolean>;
		sandboxEnabled: CursorResolvedSetting<boolean>;
		force: CursorResolvedSetting<boolean>;
		resume: CursorResolvedSetting<boolean>;
		useHttp1ForAgent: CursorResolvedSetting<boolean>;
	};
	bridge: {
		excludeTools: CursorResolvedSetting<string[]>;
	};
}

// Widens string-literal-union fields to raw `string` so CLI callers can pass unvalidated input through to
// validateExplicitValue, while keeping every other field's shape linked to CursorSdkConfig so new fields
// don't need a manually maintained parallel type.
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
	env?: Record<string, string | undefined>;
	session?: CursorSdkConfig;
	project?: CursorSdkConfig;
	user?: CursorSdkConfig;
}

export interface LoadCursorSdkConfigOptions {
	cwd?: string;
	projectTrusted?: boolean;
	agentDir?: string;
}

const TRUST_LEVELS: Record<CursorConfigSource, CursorConfigTrustLevel> = {
	cli: "one-shot",
	environment: "environment",
	project: "trusted-project",
	user: "user",
	session: "session",
	"model-alias": "model-catalog",
	builtin: "builtin",
};

function validateExplicitValue<T extends string>(
	raw: string | undefined,
	name: string,
	isValid: (value: unknown) => value is T,
	validValues: string,
): T | undefined {
	const value = raw?.trim();
	if (!value) return undefined;
	if (!isValid(value)) throw new Error(`Invalid ${name} "${value}". Use ${validValues}.`);
	return value;
}

function parseNonEmptyString(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed ? trimmed : undefined;
}

function parseToolNames(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const parsed = [...new Set(value.map((name) => (typeof name === "string" ? name.trim() : "")).filter((name) => name.length > 0))];
	return parsed.length > 0 ? parsed : undefined;
}

export function parseCursorSdkConfig(value: unknown): CursorSdkConfig | undefined {
	const record = asRecord(value);
	if (!record) return undefined;
	const config: CursorSdkConfig = {};

	const fastDefaults = asRecord(record.fastDefaults);
	if (fastDefaults) {
		config.fastDefaults = Object.fromEntries(
			Object.entries(fastDefaults).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"),
		);
	}

	const local = asRecord(record.local);
	if (local) {
		const parsedLocal: NonNullable<CursorSdkConfig["local"]> = {};
		if (typeof local.autoReview === "boolean") parsedLocal.autoReview = local.autoReview;
		if (typeof local.sandbox === "boolean") parsedLocal.sandbox = local.sandbox;
		if (typeof local.force === "boolean") parsedLocal.force = local.force;
		if (typeof local.resume === "boolean") parsedLocal.resume = local.resume;
		if (typeof local.useHttp1ForAgent === "boolean") parsedLocal.useHttp1ForAgent = local.useHttp1ForAgent;
		const sandboxOptions = asRecord(local.sandboxOptions);
		if (typeof sandboxOptions?.enabled === "boolean") parsedLocal.sandboxOptions = { enabled: sandboxOptions.enabled };
		if (Object.keys(parsedLocal).length > 0) config.local = parsedLocal;
	}

	const bridge = asRecord(record.bridge);
	if (bridge) {
		const excludeTools = parseToolNames(bridge.excludeTools);
		if (excludeTools) config.bridge = { excludeTools };
	}

	return config;
}

export function getCursorSdkUserConfigPath(agentDir = getAgentDir()): string {
	return join(agentDir, CURSOR_SDK_CONFIG_FILE);
}

export function getCursorSdkProjectConfigPath(cwd: string, configDirName = CONFIG_DIR_NAME): string {
	return join(cwd, configDirName, CURSOR_SDK_CONFIG_FILE);
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

export function loadCursorSdkProjectConfig(cwd: string, projectTrusted: boolean): CursorSdkConfig | undefined {
	if (!projectTrusted) return undefined;
	const path = getCursorSdkProjectConfigPath(cwd);
	return existsSync(path) ? readCursorSdkConfigFile(path) : undefined;
}

export function loadCursorSdkConfig(options: LoadCursorSdkConfigOptions = {}): { user: CursorSdkConfig; project?: CursorSdkConfig } {
	const user = loadCursorSdkUserConfig(getCursorSdkUserConfigPath(options.agentDir));
	const project = options.cwd ? loadCursorSdkProjectConfig(options.cwd, options.projectTrusted === true) : undefined;
	return project ? { user, project } : { user };
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
				try {
					closeSync(descriptor);
				} finally {
					rmSync(lockPath, { force: true });
				}
			};
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
			if (Date.now() >= deadline) {
				throw new Error(`Timed out waiting for Cursor SDK config lock ${lockPath}; remove it only if no pi process is writing this config`);
			}
			sleepForConfigLock();
		}
	}
}

function replaceJsonFile(path: string, config: object, mode?: number): void {
	mkdirSync(dirname(path), { recursive: true });
	const tempPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
	let replaced = false;
	try {
		writeFileSync(tempPath, `${JSON.stringify(config, null, 2)}\n`, {
			encoding: "utf8",
			flag: "wx",
			...(mode === undefined ? {} : { mode }),
		});
		if (mode !== undefined) chmodSync(tempPath, mode);
		renameSync(tempPath, path);
		replaced = true;
	} finally {
		if (!replaced) {
			try {
				rmSync(tempPath, { force: true });
			} catch {
				// Keep the replacement failure; cleanup is best effort.
			}
		}
	}
}

function withCursorSdkConfigLock<T>(path: string, operation: () => T): T {
	const release = acquireCursorSdkConfigLock(path);
	try {
		return operation();
	} finally {
		release();
	}
}

export function updateCursorSdkConfig(
	path: string,
	update: (current: Record<string, unknown>) => Record<string, unknown>,
	options: { newFileMode?: number } = {},
): Record<string, unknown> {
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

export function saveCursorSdkProjectConfig(cwd: string, config: CursorSdkConfig, configDirName = CONFIG_DIR_NAME): void {
	const path = getCursorSdkProjectConfigPath(cwd, configDirName);
	updateCursorSdkConfig(path, () => ({ ...config }));
}

export function mergeCursorSdkConfig(base: CursorSdkConfig, patch: CursorSdkConfig): CursorSdkConfig {
	return mergeCursorSdkConfigForUpdate({ ...base }, patch) as CursorSdkConfig;
}

export function mergeCursorSdkConfigForUpdate(
	base: Record<string, unknown>,
	patch: CursorSdkConfig,
): Record<string, unknown> {
	const baseLocal = asRecord(base.local);
	const baseSandboxOptions = asRecord(baseLocal?.sandboxOptions);
	return {
		...base,
		...patch,
		...(baseLocal || patch.local
			? {
					local: {
						...baseLocal,
						...patch.local,
						...(baseSandboxOptions || patch.local?.sandboxOptions
							? { sandboxOptions: { ...baseSandboxOptions, ...patch.local?.sandboxOptions } }
							: {}),
					},
				}
			: {}),
	};
}

export function cursorFastDefaultsFromConfig(config: CursorSdkConfig | undefined): Map<string, boolean> {
	return new Map(Object.entries(config?.fastDefaults ?? {}));
}

export function withCursorFastDefaults<T extends object>(
	config: T,
	fastDefaults: Map<string, boolean>,
): T & { fastDefaults: Record<string, boolean> } {
	return {
		...config,
		fastDefaults: Object.fromEntries([...fastDefaults.entries()].sort(([a], [b]) => a.localeCompare(b))),
	};
}

function resolved<T>(source: CursorConfigSource, value: T): CursorResolvedSetting<T> {
	return { value, source, trustLevel: TRUST_LEVELS[source] };
}

function valueFrom<T>(source: CursorConfigSource, value: T | undefined): CursorResolvedSetting<T> | undefined {
	return value === undefined ? undefined : resolved(source, value);
}

function resolveOrdinary<T>(layers: Array<CursorResolvedSetting<T> | undefined>): CursorResolvedSetting<T> {
	const match = layers.find((layer): layer is CursorResolvedSetting<T> => layer !== undefined);
	if (!match) throw new Error("Cursor config resolver missing built-in default");
	return match;
}

// Field/layer resolver table: each field declares the ordered list of sources it participates in (its
// precedence), plus its per-layer values. Sources omitted from a field's order (e.g. local fields skip
// "session", force skips project/user/session) are the field-specific omissions the review asked to keep
// explicit; test/cursor-config.test.ts asserts each one.
type CursorFieldSource = Exclude<CursorConfigSource, "model-alias">;
type CursorFieldValues<T> = Partial<Record<CursorFieldSource, T>>;

const LOCAL_ORDER: CursorFieldSource[] = ["cli", "environment", "project", "user", "builtin"];
const LOCAL_FORCE_ORDER: CursorFieldSource[] = ["cli", "environment", "builtin"];
const HTTP1_ORDER: CursorFieldSource[] = ["session", "environment", "user", "builtin"];
const BRIDGE_ORDER: CursorFieldSource[] = ["project", "user", "builtin"];

function buildFieldLayers<T>(order: CursorFieldSource[], values: CursorFieldValues<T>): Array<CursorResolvedSetting<T> | undefined> {
	return order.map((source) => (source === "builtin" ? resolved("builtin", values.builtin as T) : valueFrom(source, values[source])));
}

function resolveOrdinaryField<T>(order: CursorFieldSource[], values: CursorFieldValues<T>): CursorResolvedSetting<T> {
	return resolveOrdinary(buildFieldLayers(order, values));
}

export function cursorSdkConfigFromEnv(env: Record<string, string | undefined> = process.env): CursorSdkConfig {
	const config: CursorSdkConfig = {};
	const autoReview = parseOptionalEnvBoolean(env[CURSOR_AUTO_REVIEW_ENV]);
	const sandbox = parseOptionalEnvBoolean(env[CURSOR_SANDBOX_ENV]);
	const force = parseOptionalEnvBoolean(env[CURSOR_LOCAL_FORCE_ENV]);
	const resume = parseOptionalEnvBoolean(env[CURSOR_LOCAL_RESUME_ENV]);
	const useHttp1ForAgent = parseOptionalEnvBoolean(env[CURSOR_HTTP1_ENV]);
	if (autoReview !== undefined || sandbox !== undefined || force !== undefined || resume !== undefined || useHttp1ForAgent !== undefined) {
		config.local = {
			...(autoReview !== undefined ? { autoReview } : {}),
			...(sandbox !== undefined ? { sandboxOptions: { enabled: sandbox } } : {}),
			...(force !== undefined ? { force } : {}),
			...(resume !== undefined ? { resume } : {}),
			...(useHttp1ForAgent !== undefined ? { useHttp1ForAgent } : {}),
		};
	}
	return config;
}

export function resolveCursorSdkConfig(options: ResolveCursorSdkConfigOptions = {}): CursorResolvedSdkConfig {
	const env = cursorSdkConfigFromEnv(options.env);
	const cli = options.cli;
	const session = options.session;
	const project = options.project;
	const user = options.user;
	return {
		local: {
			autoReview: resolveOrdinaryField(LOCAL_ORDER, {
				cli: cli?.local?.autoReview,
				environment: env.local?.autoReview,
				project: project?.local?.autoReview,
				user: user?.local?.autoReview,
				builtin: false,
			}),
			sandboxEnabled: resolveOrdinaryField(LOCAL_ORDER, {
				cli: cli?.local?.sandboxOptions?.enabled ?? cli?.local?.sandbox,
				environment: env.local?.sandboxOptions?.enabled ?? env.local?.sandbox,
				project: project?.local?.sandboxOptions?.enabled ?? project?.local?.sandbox,
				user: user?.local?.sandboxOptions?.enabled ?? user?.local?.sandbox,
				builtin: false,
			}),
			force: resolveOrdinaryField(LOCAL_FORCE_ORDER, {
				cli: cli?.local?.force,
				environment: env.local?.force,
				builtin: false,
			}),
			resume: resolveOrdinaryField(LOCAL_ORDER, {
				cli: cli?.local?.resume,
				environment: env.local?.resume,
				project: project?.local?.resume,
				user: user?.local?.resume,
				builtin: true,
			}),
			useHttp1ForAgent: resolveOrdinaryField(HTTP1_ORDER, {
				session: session?.local?.useHttp1ForAgent,
				environment: env.local?.useHttp1ForAgent,
				user: user?.local?.useHttp1ForAgent,
				builtin: false,
			}),
		},
		bridge: {
			excludeTools: resolveOrdinaryField(BRIDGE_ORDER, {
				project: project?.bridge?.excludeTools,
				user: user?.bridge?.excludeTools,
				builtin: [],
			}),
		},
	};
}

/** Builds the bridge snapshot exclusion set from resolved `bridge` config; unset/empty exposes everything. */
export function buildCursorBridgeExcludeToolNames(resolvedConfig: CursorResolvedSdkConfig): ReadonlySet<string> {
	const names = resolvedConfig.bridge.excludeTools.value;
	return names.length > 0 ? new Set(names) : new Set();
}

export function resolveCursorFastDefault(options: {
	cliForceFast?: boolean;
	cliForceNoFast?: boolean;
	aliasOverride?: boolean;
	sessionValue?: boolean;
	userValue?: boolean;
	modelDefault: boolean;
}): CursorResolvedSetting<boolean> {
	if (options.cliForceNoFast) return resolved("cli", false);
	if (options.cliForceFast) return resolved("cli", true);
	if (options.aliasOverride !== undefined) return resolved("model-alias", options.aliasOverride);
	if (options.sessionValue !== undefined) return resolved("session", options.sessionValue);
	if (options.userValue !== undefined) return resolved("user", options.userValue);
	return resolved("builtin", options.modelDefault);
}
