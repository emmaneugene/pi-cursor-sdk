import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { resolveCursorSettingSources as resolveProviderSettingSources } from "../src/setting-sources.js";
import {
	commonBooleanFlag,
	commonProbeFlags,
	commonRepeatStringFlag,
	apiKeySecretsFromProcess,
	defaultApiKeyFromEnv,
	defaultSettingSourcesFromEnv,
	defaultTimestampedDir,
	parseArgv,
	readArgvApiKey,
	requireApiKey,
} from "../scripts/lib/cli-args.mjs";
import {
	CHILD_PROCESS_TREE_SPAWN_OPTIONS,
	parseJsonLines,
	terminateChild,
	waitForChildClose,
} from "../scripts/lib/child-process.mjs";
import {
	buildCursorSmokeEnv,
	buildCursorSmokeEnvPlan,
	CURSOR_SDK_EVENT_DEBUG_ENV_NAMES as scriptSdkEventDebugEnvNames,
	sealedNodePath,
	writeCursorSdkEventDebugUserConfig,
} from "../scripts/lib/smoke-env.mjs";
import { CURSOR_SDK_EVENT_DEBUG_ENV_NAMES as sharedSdkEventDebugEnvNames } from "../shared/sdk-event-debug-env.mjs";
import {
	CURSOR_SETTING_SOURCES_ENV,
	resolveCursorSettingSources,
	serializeCursorSettingSources,
} from "../shared/setting-sources.mjs";
import { scrubSensitiveText } from "../shared/sensitive-text.mjs";
import { createScriptFail } from "../scripts/lib/script-fail.mjs";
import { buildLocalResumeSmokeEnv } from "../scripts/local-resume-smoke.mjs";

function processExists(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return (error as NodeJS.ErrnoException).code !== "ESRCH";
	}
}

async function waitUntilGone(pids: number[], timeoutMs = 5_000): Promise<boolean> {
	const deadline = Date.now() + timeoutMs;
	while (pids.some(processExists) && Date.now() < deadline) {
		await new Promise((resolveWait) => setTimeout(resolveWait, 25));
	}
	return pids.every((pid) => !processExists(pid));
}

async function readChildPids(parent: ChildProcess): Promise<{ parentPid: number; grandchildPid: number }> {
	if (!parent.stdout) throw new Error("expected child stdout pipe");
	return new Promise((resolvePids, rejectPids) => {
		let stdout = "";
		const timer = setTimeout(() => rejectPids(new Error("timed out waiting for descendant pids")), 5_000);
		parent.stdout!.on("data", (chunk) => {
			stdout += chunk.toString();
			const line = stdout.split("\n").find(Boolean);
			if (!line) return;
			clearTimeout(timer);
			resolvePids(JSON.parse(line));
		});
		parent.once("error", (error) => {
			clearTimeout(timer);
			rejectPids(error);
		});
	});
}

async function waitForChildCloseWithinTest(parent: ChildProcess, timeoutMs = 5_000): Promise<number> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			waitForChildClose(parent),
			new Promise<never>((_resolve, reject) => {
				timer = setTimeout(() => reject(new Error("timed out waiting for child close")), timeoutMs);
			}),
		]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}

async function forceCleanupProcess(pid: number | undefined): Promise<void> {
	if (!pid || !processExists(pid)) return;
	if (process.platform === "win32") {
		spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true });
	} else {
		try {
			process.kill(pid, "SIGKILL");
		} catch {}
	}
	if (!(await waitUntilGone([pid], 2_000))) throw new Error(`failed to clean up child process ${pid}`);
}

describe("maintainer scripts shared lib", () => {
	it("keeps shared helpers aligned with provider runtime", () => {
		expect(CURSOR_SETTING_SOURCES_ENV).toBe("PI_CURSOR_SETTING_SOURCES");
		for (const raw of [undefined, "", "all", "none", "project,user", "OFF", "0"]) {
			expect(resolveCursorSettingSources(raw)).toEqual(resolveProviderSettingSources(raw));
		}
		const leakedKey = "super-secret-cursor-key-12345";
		const sample = `Bearer ${leakedKey} http://127.0.0.1:4242/cursor-pi-tool-bridge/abc/mcp`;
		expect(scrubSensitiveText(sample, leakedKey)).not.toContain(leakedKey);
		expect(serializeCursorSettingSources(["project", "user"])).toBe("project,user");
	});

	it("builds sealed smoke env without leaking debug or setting-source state", () => {
		expect(scriptSdkEventDebugEnvNames).toEqual(sharedSdkEventDebugEnvNames);
		expect(sealedNodePath("/opt/node/bin/node", `/tmp/bin${delimiter}/usr/bin`)).toBe(`/opt/node/bin${delimiter}/tmp/bin${delimiter}/usr/bin`);
		expect(sealedNodePath("/opt/node/bin/node", "")).toBe("/opt/node/bin");
		const agentDir = mkdtempSync(join(tmpdir(), "pi-cursor-sdk-smoke-event-debug-"));
		try {
			const env = buildCursorSmokeEnv({
				baseEnv: {
					PATH: "/tmp/fake:/usr/bin",
					PI_CURSOR_SETTING_SOURCES: "all",
					PI_CURSOR_SDK_EVENT_DEBUG: "1",
					PI_CURSOR_SDK_EVENT_DEBUG_DIR: "/tmp/stale",
				},
				nodePath: "/opt/node/bin/node",
				settingSources: "none",
				nativeDisplay: "on",
				bridge: false,
				exposeBuiltinTools: false,
				agentDir,
			});
			expect(env.PATH).toBe(`/opt/node/bin${delimiter}/tmp/fake:/usr/bin`);
			expect(env.PI_CURSOR_SETTING_SOURCES).toBeUndefined();
			expect(env.PI_CURSOR_NATIVE_TOOL_DISPLAY).toBeUndefined();
			expect(env.PI_CURSOR_REGISTER_NATIVE_TOOLS).toBeUndefined();
			expect(env.PI_CURSOR_PI_TOOL_BRIDGE).toBeUndefined();
			expect(env.PI_CURSOR_EXPOSE_BUILTIN_TOOLS).toBeUndefined();
			expect(env.PI_CURSOR_SDK_EVENT_DEBUG).toBeUndefined();
			expect(env.PI_CURSOR_SDK_EVENT_DEBUG_DIR).toBeUndefined();
			expect(env.PI_CURSOR_SDK_EVENT_DEBUG_STDERR).toBeUndefined();
			expect(JSON.parse(readFileSync(join(agentDir, "cursor-sdk.json"), "utf8"))).toEqual({
				local: { settingSources: [] },
				tools: {
					display: { native: "on" },
					bridge: { enabled: false, exposeBuiltins: false },
				},
			});
			buildCursorSmokeEnv({ baseEnv: { PATH: "/usr/bin" }, nativeDisplay: "off", agentDir });
			expect(JSON.parse(readFileSync(join(agentDir, "cursor-sdk.json"), "utf8")).tools.display).toEqual({ native: "off" });

			const withBridgeDebug = buildCursorSmokeEnv({
				baseEnv: { PATH: "/usr/bin" },
				nodePath: "/opt/node/bin/node",
				bridge: true,
				exposeBuiltinTools: true,
				bridgeDebug: true,
				bridgeDebugFile: "/tmp/bridge.jsonl",
				agentDir,
			});
			expect(withBridgeDebug.PI_CURSOR_PI_TOOL_BRIDGE_DEBUG).toBeUndefined();
			expect(withBridgeDebug.PI_CURSOR_PI_TOOL_BRIDGE_DEBUG_FILE).toBeUndefined();
			expect(JSON.parse(readFileSync(join(agentDir, "cursor-sdk.json"), "utf8")).tools.bridge).toEqual({
				enabled: true,
				exposeBuiltins: true,
				debug: { stderr: true, file: "/tmp/bridge.jsonl" },
			});
			expect(() => (sharedSdkEventDebugEnvNames as unknown as string[]).push("MUTATED")).toThrow(TypeError);

			const withDebug = buildCursorSmokeEnv({
				baseEnv: { PATH: "/usr/bin" },
				nodePath: "/opt/node/bin/node",
				eventDebugDir: "/tmp/events",
				agentDir,
			});
			expect(withDebug.PI_CURSOR_SDK_EVENT_DEBUG).toBeUndefined();
			expect(withDebug.PI_CURSOR_SDK_EVENT_DEBUG_DIR).toBeUndefined();
			expect(JSON.parse(readFileSync(join(agentDir, "cursor-sdk.json"), "utf8"))).toMatchObject({
				debug: { sdkEvents: { enabled: true, directory: "/tmp/events" } },
			});
			writeCursorSdkEventDebugUserConfig(agentDir, { stderr: true });
			expect(JSON.parse(readFileSync(join(agentDir, "cursor-sdk.json"), "utf8")).debug.sdkEvents.stderr).toBe(true);
		} finally {
			rmSync(agentDir, { recursive: true, force: true });
		}

		const defaultSettingsEnv = buildCursorSmokeEnv({
			baseEnv: { PATH: "/usr/bin", PI_CURSOR_SETTING_SOURCES: "none" },
			nodePath: "/opt/node/bin/node",
			settingSources: null,
		});
		expect(defaultSettingsEnv.PI_CURSOR_SETTING_SOURCES).toBeUndefined();

		const plan = buildCursorSmokeEnvPlan({
			baseEnv: { PATH: "/bin", PI_CURSOR_NATIVE_TOOL_DISPLAY: "0", PI_CURSOR_PI_TOOL_BRIDGE: "1", TERM: "bad" },
			nodePath: "/opt/node/bin/node",
		});
		expect(plan.envEntries).toEqual([]);
		expect(plan.env.PI_CURSOR_NATIVE_TOOL_DISPLAY).toBeUndefined();
	});

	it("uses explicit string modes for local-resume smoke config", () => {
		const root = mkdtempSync(join(tmpdir(), "pi-cursor-sdk-local-resume-env-"));
		try {
			for (const [mode, expectedResume] of [["on", true], ["off", false], ["unset", undefined]] as const) {
				const artifactDir = join(root, mode);
				buildLocalResumeSmokeEnv(artifactDir, { baseEnv: { PATH: "/usr/bin" }, localResumeEnv: mode });
				const config = JSON.parse(readFileSync(join(artifactDir, "agent", "cursor-sdk.json"), "utf8"));
				expect(config.local.resume).toBe(expectedResume);
				expect(config.tools.display).toEqual({ native: "off" });
			}
			expect(() => buildLocalResumeSmokeEnv(root, { localResumeEnv: false as never })).toThrow("unknown localResumeEnv mode: false");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("keeps setting-source parsing aligned with provider runtime", () => {
		expect(CURSOR_SETTING_SOURCES_ENV).toBe("PI_CURSOR_SETTING_SOURCES");
		for (const raw of [undefined, "", "all", "none", "project,user", "OFF", "0"]) {
			expect(resolveCursorSettingSources(raw)).toEqual(resolveProviderSettingSources(raw));
		}
		expect(defaultSettingSourcesFromEnv({ PI_CURSOR_SETTING_SOURCES: "none" })).toEqual([]);
	});

	it("scrubs secrets and bridge endpoints", () => {
		const leakedKey = "super-secret-cursor-key-12345";
		const sample = `Bearer ${leakedKey} http://127.0.0.1:4242/cursor-pi-tool-bridge/abc/mcp`;
		const scrubbed = scrubSensitiveText(sample, leakedKey);
		expect(scrubbed).not.toContain(leakedKey);
		expect(scrubbed).toContain("Bearer [redacted]");
		expect(scrubbed).toContain("[redacted-bridge-endpoint]");
	});

	it("serializes setting sources for child env forwarding", () => {
		expect(serializeCursorSettingSources(["all"])).toBe("all");
		expect(serializeCursorSettingSources(["project", "user"])).toBe("project,user");
		expect(serializeCursorSettingSources(undefined)).toBe("none");
		expect(serializeCursorSettingSources([])).toBe("none");
	});

	it("round-trips setting sources through resolve -> serialize -> resolve", () => {
		const cases: Array<{ raw?: string; expected: ReturnType<typeof resolveCursorSettingSources> }> = [
			{ raw: undefined, expected: ["all"] },
			{ raw: "", expected: ["all"] },
			{ raw: "all", expected: ["all"] },
			{ raw: "none", expected: [] },
			{ raw: "project,user", expected: ["project", "user"] },
			{ raw: ",", expected: [] },
			{ raw: "  ,  ", expected: [] },
		];
		for (const { raw, expected } of cases) {
			const resolved = resolveCursorSettingSources(raw);
			expect(resolved).toEqual(expected);
			expect(resolveCursorSettingSources(serializeCursorSettingSources(resolved))).toEqual(expected);
		}
	});

	it("reads api keys from argv and process env for failure scrubbing", () => {
		expect(readArgvApiKey(["--api-key", " argv-key "])).toBe("argv-key");
		expect(readArgvApiKey(["--api-key=inline-key"])).toBe("inline-key");
		expect(readArgvApiKey(["--model", "composer-2.5"])).toBeUndefined();
		expect(apiKeySecretsFromProcess(["--api-key", "argv-key"], { CURSOR_API_KEY: "env-key" })).toEqual([
			"env-key",
			"argv-key",
		]);
	});

	it("parses common probe flags and enforces api key requirements", () => {
		const fail = vi.fn((message: string) => {
			throw new Error(message);
		});
		const args = parseArgv(["--cwd", "/tmp/work", "--model", "composer-2.5", "--prompt", "hi", "--setting-sources", "none"], {
			defaults: {
				cwd: process.cwd(),
				model: "default",
				prompt: undefined,
				settingSources: defaultSettingSourcesFromEnv({ PI_CURSOR_SETTING_SOURCES: "all" }),
				apiKey: defaultApiKeyFromEnv({ CURSOR_API_KEY: "from-env" }),
			},
			flags: {
				cwd: commonProbeFlags.cwd,
				model: commonProbeFlags.model,
				prompt: commonProbeFlags.prompt,
				apiKey: commonProbeFlags.apiKey,
				settingSources: commonProbeFlags.settingSources,
			},
			fail,
		});
		expect(args).toMatchObject({
			cwd: resolve("/tmp/work"),
			model: "composer-2.5",
			prompt: "hi",
			settingSources: [],
			apiKey: "from-env",
		});
		const flagArgs = parseArgv(["--self-test", "--leftover-pattern", "one", "--leftover-pattern=two", "--prompt", "--starts-with-dash"], {
			defaults: { selfTest: false, leftoverPatterns: [] as string[], prompt: "" },
			flags: {
				selfTest: commonBooleanFlag("--self-test"),
				leftoverPatterns: commonRepeatStringFlag("--leftover-pattern"),
				prompt: { names: ["--prompt"], allowDashValue: true },
			},
			fail,
		});
		expect(flagArgs).toMatchObject({ selfTest: true, leftoverPatterns: ["one", "two"], prompt: "--starts-with-dash" });
		expect(() =>
			parseArgv(["--self-test=true"], {
				defaults: { selfTest: false },
				flags: { selfTest: commonBooleanFlag("--self-test") },
				fail,
			}),
		).toThrow(/--self-test does not accept a value/);

		expect(requireApiKey({ apiKey: "key" }, {}, fail)).toBe("key");
		expect(() => requireApiKey({}, {}, fail)).toThrow(/Cursor API key is required/);
	});

	it("rejects malformed repeated flag values", () => {
		const fail = vi.fn((message: string) => {
			throw new Error(message);
		});
		expect(() =>
			parseArgv(["--model", "--model=bad"], {
				defaults: { model: "default" },
				flags: { model: commonProbeFlags.model },
				fail,
			}),
		).toThrow(/--model requires a value/);
	});

	it("builds timestamped artifact directories under /tmp by default", () => {
		const dir = defaultTimestampedDir("pi-cursor-sdk-test-prefix");
		expect(dir.startsWith(resolve("/tmp", "pi-cursor-sdk-test-prefix-"))).toBe(true);
	});

	it("parses JSONL stdout and exposes child shutdown helpers", async () => {
		expect(parseJsonLines('{"type":"a"}\n\n{"type":"b"}\n')).toEqual([{ type: "a" }, { type: "b" }]);
		expect(CHILD_PROCESS_TREE_SPAWN_OPTIONS.detached).toBe(process.platform !== "win32");
		expect(typeof waitForChildClose).toBe("function");
		expect(typeof terminateChild).toBe("function");
	});

	it("allows child EOF cleanup before verified process-tree termination", async () => {
		const child = spawn(process.execPath, [
			"--input-type=module",
			"-e",
			`process.stdin.resume(); process.stdin.on("end", () => { console.log("graceful-cleanup"); process.exit(0); });`,
		], { stdio: ["pipe", "pipe", "pipe"], ...CHILD_PROCESS_TREE_SPAWN_OPTIONS });
		let stdout = "";
		child.stdout?.setEncoding("utf8");
		child.stdout?.on("data", (chunk) => { stdout += chunk; });
		await terminateChild(child, { graceMs: 2_000 });
		expect(stdout).toContain("graceful-cleanup");
	}, 15_000);

	it("terminates a spawned parent and its long-lived grandchild", async () => {
		const parent = spawn(
			process.execPath,
			[
				"--input-type=module",
				"-e",
				`import { spawn } from "node:child_process";
const grandchild = spawn(process.execPath, ["-e", "process.on('SIGTERM', () => {}); setInterval(() => {}, 60_000)"], { stdio: "ignore" });
console.log(JSON.stringify({ parentPid: process.pid, grandchildPid: grandchild.pid }));
setInterval(() => {}, 60_000);`,
			],
			{ stdio: ["ignore", "pipe", "pipe"], ...CHILD_PROCESS_TREE_SPAWN_OPTIONS },
		);
		let grandchildPid: number | undefined;
		try {
			const pids = await readChildPids(parent);
			grandchildPid = pids.grandchildPid;
			expect(processExists(pids.parentPid)).toBe(true);
			expect(processExists(pids.grandchildPid)).toBe(true);
			await terminateChild(parent, { graceMs: 1_000 });
			expect(await waitUntilGone([pids.parentPid, pids.grandchildPid])).toBe(true);
		} finally {
			await terminateChild(parent, { graceMs: 500 });
			await forceCleanupProcess(grandchildPid);
		}
	}, 15_000);

	it("terminates a live grandchild after its detached parent has exited", async () => {
		const parent = spawn(
			process.execPath,
			[
				"--input-type=module",
				"-e",
				`import { spawn } from "node:child_process";
const grandchild = spawn(process.execPath, ["-e", "process.on('SIGTERM', () => {}); setInterval(() => {}, 60_000)"], { stdio: "ignore", detached: process.platform === "win32" });
grandchild.unref();
console.log(JSON.stringify({ parentPid: process.pid, grandchildPid: grandchild.pid }));`,
			],
			{ stdio: ["ignore", "pipe", "pipe"], ...CHILD_PROCESS_TREE_SPAWN_OPTIONS },
		);
		let grandchildPid: number | undefined;
		try {
			const pids = await readChildPids(parent);
			grandchildPid = pids.grandchildPid;
			expect(await waitForChildCloseWithinTest(parent)).toBe(0);
			expect(processExists(pids.parentPid)).toBe(false);
			expect(processExists(pids.grandchildPid)).toBe(true);

			await terminateChild(parent, { graceMs: 2_000 });

			expect(await waitUntilGone([pids.grandchildPid])).toBe(true);
		} finally {
			await terminateChild(parent, { graceMs: 500 });
			await forceCleanupProcess(grandchildPid);
		}
	}, 30_000);

	it("createScriptFail scrubs generic secrets before applying explicit secrets", () => {
		const exit = vi.spyOn(process, "exit").mockImplementation((() => undefined) as typeof process.exit);
		const stderr = vi.spyOn(console, "error").mockImplementation(() => undefined);
		const firstSecret = "super-secret-cursor-key-12345";
		const secondSecret = "another-secret-token-67890";
		const fail = createScriptFail("test-script");
		fail(
			`failed with Bearer generic-token apiKey=raw-key http://127.0.0.1:4242/cursor-pi-tool-bridge/abc/mcp ${firstSecret} and ${secondSecret}`,
			[firstSecret, secondSecret],
		);
		const output = stderr.mock.calls.join("");
		expect(stderr).toHaveBeenCalledWith(expect.stringContaining("[redacted]"));
		expect(output).toContain("Bearer [redacted]");
		expect(output).toContain("apiKey=[redacted]");
		expect(output).toContain("[redacted-bridge-endpoint]");
		expect(output).not.toContain(firstSecret);
		expect(output).not.toContain(secondSecret);
		exit.mockRestore();
		stderr.mockRestore();
	});
});
