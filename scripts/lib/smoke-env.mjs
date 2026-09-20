import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { delimiter, dirname, join } from "node:path";
import { resolveCursorSettingSources } from "../../shared/setting-sources.mjs";
import {
	CURSOR_SDK_EVENT_DEBUG_ENV_NAMES,
	CURSOR_SDK_EVENT_DEBUG_INTERNAL_ENV_NAMES,
	CURSOR_SDK_EVENT_DEBUG_INTERNAL_RUN_DIR_ENV,
	CURSOR_SDK_EVENT_DEBUG_INTERNAL_SESSION_DIR_ENV,
	CURSOR_SDK_EVENT_DEBUG_RUN_DIR_ENV,
	CURSOR_SDK_EVENT_DEBUG_SESSION_DIR_ENV,
	CURSOR_SDK_EVENT_DEBUG_STALE_PUBLIC_ENV_NAMES,
} from "../../shared/sdk-event-debug-env.mjs";

export {
	CURSOR_SDK_EVENT_DEBUG_ENV_NAMES,
	CURSOR_SDK_EVENT_DEBUG_INTERNAL_ENV_NAMES,
	CURSOR_SDK_EVENT_DEBUG_INTERNAL_RUN_DIR_ENV,
	CURSOR_SDK_EVENT_DEBUG_INTERNAL_SESSION_DIR_ENV,
	CURSOR_SDK_EVENT_DEBUG_RUN_DIR_ENV,
	CURSOR_SDK_EVENT_DEBUG_SESSION_DIR_ENV,
	CURSOR_SDK_EVENT_DEBUG_STALE_PUBLIC_ENV_NAMES,
};

export const CURSOR_SDK_STALE_PUBLIC_ENV_NAMES = Object.freeze([
	...CURSOR_SDK_EVENT_DEBUG_STALE_PUBLIC_ENV_NAMES,
	"PI_CURSOR_SETTING_SOURCES",
	"PI_CURSOR_NATIVE_TOOL_DISPLAY",
	"PI_CURSOR_REGISTER_NATIVE_TOOLS",
	"PI_CURSOR_PI_TOOL_BRIDGE",
	"PI_CURSOR_EXPOSE_BUILTIN_TOOLS",
	"PI_CURSOR_PI_TOOL_BRIDGE_DEBUG",
	"PI_CURSOR_PI_TOOL_BRIDGE_DEBUG_FILE",
	"PI_CURSOR_PI_BRIDGE_CALL_TIMEOUT_MS",
	"PI_CURSOR_TOOL_MANIFEST",
	"PI_CURSOR_TASK_PRESENTATION",
	"PI_CURSOR_AUTO_REVIEW",
	"PI_CURSOR_SANDBOX",
	"PI_CURSOR_LOCAL_FORCE",
	"PI_CURSOR_LOCAL_RESUME",
	"PI_CURSOR_HTTP_1_1",
	"PI_CURSOR_PRESERVE_PI_AGENTS_MD",
	"PI_CURSOR_MCP_TOOL_TIMEOUT_MS",
	"PI_CURSOR_MCP_TOOL_TIMEOUT_SECONDS",
	"PI_CURSOR_MCP_CONNECT_TIMEOUT_MS",
	"PI_CURSOR_MCP_CONNECT_TIMEOUT_SECONDS",
	"PI_CURSOR_SDK_DISABLE_MODEL_CACHE",
	"PI_CURSOR_SDK_MODEL_CACHE_TTL_MS",
]);

export function sealedNodePath(nodePath = process.execPath, envPath = process.env.PATH ?? "") {
	return [dirname(nodePath), envPath].filter(Boolean).join(delimiter);
}

export function clearCursorSdkEventDebugEnv(env) {
	for (const name of CURSOR_SDK_EVENT_DEBUG_ENV_NAMES) delete env[name];
	return env;
}

export function clearCursorSdkStalePublicEnv(env) {
	for (const name of CURSOR_SDK_STALE_PUBLIC_ENV_NAMES) delete env[name];
	return env;
}

function asRecord(value) {
	return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function mergeConfig(current, patch) {
	const next = { ...current };
	for (const [key, value] of Object.entries(asRecord(patch))) {
		next[key] = value && typeof value === "object" && !Array.isArray(value)
			? mergeConfig(asRecord(current[key]), value)
			: value;
	}
	return next;
}

export function writeCursorSdkUserConfig(agentDir, patch = {}) {
	mkdirSync(agentDir, { recursive: true });
	const path = join(agentDir, "cursor-sdk.json");
	let current = {};
	try {
		current = asRecord(JSON.parse(readFileSync(path, "utf8")));
	} catch {
		current = {};
	}
	writeFileSync(path, `${JSON.stringify(mergeConfig(current, patch), null, 2)}\n`);
	return path;
}

export function writeCursorSdkEventDebugUserConfig(agentDir, sdkEvents = { enabled: true }) {
	return writeCursorSdkUserConfig(agentDir, { debug: { sdkEvents } });
}

export function buildCursorSmokeUserConfig({
	settingSources,
	nativeDisplay,
	bridge,
	exposeBuiltinTools,
	bridgeDebug,
	bridgeDebugFile,
	transport,
	eventDebugDir,
} = {}) {
	const config = {};
	if (settingSources !== undefined && settingSources !== null) {
		config.local = { ...config.local, settingSources: resolveCursorSettingSources(settingSources) };
	}
	if (transport !== undefined) {
		config.local = { ...config.local, transport };
	}
	if (nativeDisplay !== undefined) {
		config.tools = { ...config.tools, display: { native: nativeDisplay } };
	}
	if (bridge !== undefined || exposeBuiltinTools !== undefined || bridgeDebug !== undefined || bridgeDebugFile !== undefined) {
		config.tools = {
			...config.tools,
			bridge: {
				...(bridge !== undefined ? { enabled: bridge } : {}),
				...(exposeBuiltinTools !== undefined ? { exposeBuiltins: exposeBuiltinTools } : {}),
				...((bridgeDebug !== undefined || bridgeDebugFile !== undefined)
					? {
						debug: {
							...(bridgeDebug !== undefined ? { stderr: bridgeDebug } : {}),
							...(bridgeDebugFile !== undefined ? { file: bridgeDebugFile } : {}),
						},
					}
					: {}),
			},
		};
	}
	if (eventDebugDir !== undefined) {
		config.debug = { sdkEvents: { enabled: true, directory: eventDebugDir } };
	}
	return config;
}

export function buildCursorSmokeEnv({
	baseEnv = process.env,
	nodePath = process.execPath,
	settingSources,
	nativeDisplay,
	bridge,
	exposeBuiltinTools,
	bridgeDebug,
	bridgeDebugFile,
	transport,
	term,
	eventDebugDir,
	agentDir,
} = {}) {
	const env = clearCursorSdkStalePublicEnv(clearCursorSdkEventDebugEnv({ ...baseEnv }));
	env.PATH = sealedNodePath(nodePath, baseEnv.PATH ?? "");
	if (term !== undefined) env.TERM = term;
	if (agentDir) {
		writeCursorSdkUserConfig(agentDir, buildCursorSmokeUserConfig({
			settingSources,
			nativeDisplay,
			bridge,
			exposeBuiltinTools,
			bridgeDebug,
			bridgeDebugFile,
			transport,
			eventDebugDir,
		}));
		env.PI_CODING_AGENT_DIR = agentDir;
	}
	return env;
}

export function buildCursorSmokeEnvPlan(options = {}) {
	const env = buildCursorSmokeEnv(options);
	const envEntries = [];
	if (options.term !== undefined) envEntries.push(["TERM", options.term]);
	return {
		env,
		sealedPath: env.PATH,
		clearEnvNames: [...CURSOR_SDK_EVENT_DEBUG_ENV_NAMES, ...CURSOR_SDK_STALE_PUBLIC_ENV_NAMES],
		envEntries,
		userConfig: options.agentDir ? buildCursorSmokeUserConfig(options) : undefined,
	};
}
