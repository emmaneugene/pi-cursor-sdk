import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
	openJsonlRpcSession,
	parseJsonLines,
	terminateChild,
	waitForChildClose,
} from "../scripts/lib/child-process.mjs";
import {
	buildCursorSmokeEnv,
	buildCursorSmokeEnvPlan,
	CURSOR_SDK_CLEARED_ENV_NAMES,
	CURSOR_SDK_EVENT_DEBUG_ENV_NAMES as scriptSdkEventDebugEnvNames,
	CURSOR_SDK_STALE_PUBLIC_ENV_NAMES,
	prepareCursorSmokeEnv,
	sealedNodePath,
} from "../scripts/lib/smoke-env.mjs";
import { CURSOR_SDK_EVENT_DEBUG_ENV_NAMES as sharedSdkEventDebugEnvNames } from "../shared/sdk-event-debug-env.mjs";
import {
	CURSOR_SETTING_SOURCES_ENV,
	resolveCursorSettingSources,
	serializeCursorSettingSources,
} from "../shared/setting-sources.mjs";
import { scrubSensitiveText } from "../shared/sensitive-text.mjs";
import { createScriptFail } from "../scripts/lib/script-fail.mjs";

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
		expect(new Set(CURSOR_SDK_CLEARED_ENV_NAMES).size).toBe(CURSOR_SDK_CLEARED_ENV_NAMES.length);
		expect(CURSOR_SDK_CLEARED_ENV_NAMES).toEqual(expect.arrayContaining([...scriptSdkEventDebugEnvNames, ...CURSOR_SDK_STALE_PUBLIC_ENV_NAMES]));
		expect(sealedNodePath("/opt/node/bin/node", `/tmp/bin${delimiter}/usr/bin`)).toBe(`/opt/node/bin${delimiter}/tmp/bin${delimiter}/usr/bin`);
		expect(sealedNodePath("/opt/node/bin/node", "")).toBe("/opt/node/bin");
		const agentDir = mkdtempSync(join(tmpdir(), "pi-cursor-sdk-smoke-event-debug-"));
		try {
			const configPath = join(agentDir, "cursor-sdk.json");
			const purePlan = buildCursorSmokeEnvPlan({ baseEnv: { PATH: "/usr/bin" }, settingSources: "none", agentDir });
			expect(purePlan.clearEnvNames).toEqual([...CURSOR_SDK_CLEARED_ENV_NAMES]);
			expect(buildCursorSmokeEnv({ baseEnv: { PATH: "/usr/bin" }, agentDir }).PI_CODING_AGENT_DIR).toBe(agentDir);
			expect(existsSync(configPath)).toBe(false);

			const env = prepareCursorSmokeEnv({
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
			expect(JSON.parse(readFileSync(configPath, "utf8"))).toEqual({
				local: { settingSources: [] },
				tools: {
					display: { native: "on" },
					bridge: { enabled: false, exposeBuiltins: false },
				},
			});
			prepareCursorSmokeEnv({ baseEnv: { PATH: "/usr/bin" }, nativeDisplay: "off", agentDir });
			expect(JSON.parse(readFileSync(configPath, "utf8")).tools.display).toEqual({ native: "off" });

			const withBridgeDebug = prepareCursorSmokeEnv({
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
			expect(JSON.parse(readFileSync(configPath, "utf8")).tools.bridge).toEqual({
				enabled: true,
				exposeBuiltins: true,
				debug: { stderr: true, file: "/tmp/bridge.jsonl" },
			});
			expect(() => (sharedSdkEventDebugEnvNames as unknown as string[]).push("MUTATED")).toThrow(TypeError);

			const withDebug = prepareCursorSmokeEnv({
				baseEnv: { PATH: "/usr/bin" },
				nodePath: "/opt/node/bin/node",
				eventDebugDir: "/tmp/events",
				agentDir,
			});
			expect(withDebug.PI_CURSOR_SDK_EVENT_DEBUG).toBeUndefined();
			expect(withDebug.PI_CURSOR_SDK_EVENT_DEBUG_DIR).toBeUndefined();
			expect(JSON.parse(readFileSync(configPath, "utf8"))).toMatchObject({
				debug: { sdkEvents: { enabled: true, directory: "/tmp/events" } },
			});
		} finally {
			rmSync(agentDir, { recursive: true, force: true });
		}

		const defaultSettingsEnv = prepareCursorSmokeEnv({
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
		expect(plan.userConfig).toBeUndefined();
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
			expect(await waitForChildClose(parent, { timeoutMs: 5_000, label: "detached parent" })).toBe(0);
			expect(processExists(pids.parentPid)).toBe(false);
			expect(processExists(pids.grandchildPid)).toBe(true);

			await terminateChild(parent, { graceMs: 2_000 });

			expect(await waitUntilGone([pids.grandchildPid])).toBe(true);
		} finally {
			await terminateChild(parent, { graceMs: 500 });
			await forceCleanupProcess(grandchildPid);
		}
	}, 30_000);

	it("openJsonlRpcSession rejects waitFor immediately on early non-zero exit with scrubbed output", async () => {
		const secret = "cursor-super-secret-rpc-key";
		const child = spawn(process.execPath, ["-e", `process.stderr.write("fatal Bearer ${secret}\\n"); process.exit(7);`], {
			stdio: ["pipe", "pipe", "pipe"],
			...CHILD_PROCESS_TREE_SPAWN_OPTIONS,
		});
		const rpc = openJsonlRpcSession(child, { secrets: [secret] });
		try {
			const startedAt = Date.now();
			const error = await rpc.waitFor(() => false, { timeoutMs: 30_000, label: "agent_settled" }).catch((err: Error) => err);
			expect(error).toBeInstanceOf(Error);
			expect(Date.now() - startedAt).toBeLessThan(5_000);
			expect((error as Error).message).toContain("code=7");
			expect((error as Error).message).not.toContain(secret);
		} finally {
			await rpc.dispose();
		}
	}, 15_000);

	it("openJsonlRpcSession enforces bounded close timeout and disposes active waiters and listeners", async () => {
		const fakeChild = Object.assign(new EventEmitter(), {
			exitCode: null,
			signalCode: null,
			stdout: new EventEmitter(),
			stderr: new EventEmitter(),
			stdin: new EventEmitter(),
		});
		const rpc = openJsonlRpcSession(fakeChild as unknown as ChildProcess);
		fakeChild.stdout.emit("data", '{"type":"ready"}\nnon-json\n');
		expect(await rpc.waitFor((events) => events.length === 1, { timeoutMs: 1_000 })).toEqual([{ type: "ready" }]);
		await expect(rpc.close({ timeoutMs: 25, label: "hung child" })).rejects.toThrow(
			/hung child did not exit within 25ms.*stdoutTail=.*non-json/s,
		);
		const pendingWait = rpc.waitFor(() => false, { timeoutMs: 30_000, label: "never settles" });
		await rpc.dispose();
		await expect(pendingWait).rejects.toThrow(/never settles: child exited \(code=null, signal=null\)/);
		expect([
			fakeChild.listenerCount("close"),
			fakeChild.listenerCount("error"),
			fakeChild.stdout.listenerCount("data"),
			fakeChild.stderr.listenerCount("data"),
			fakeChild.stdin.listenerCount("error"),
		]).toEqual([0, 0, 0, 0, 0]);
	});

	it("openJsonlRpcSession dispose terminates a still-running child even after a child error event", async () => {
		const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 60_000)"], {
			stdio: ["pipe", "pipe", "pipe"],
			...CHILD_PROCESS_TREE_SPAWN_OPTIONS,
		});
		const rpc = openJsonlRpcSession(child);
		try {
			const pendingWait = rpc.waitFor(() => false, { timeoutMs: 30_000, label: "wait after error" });
			child.emit("error", new Error("simulated kill failure"));
			await expect(pendingWait).rejects.toThrow(/wait after error: child process error: simulated kill failure/);
			expect(child.pid && processExists(child.pid)).toBe(true);
			await rpc.dispose({ graceMs: 500 });
			expect(child.pid ? await waitUntilGone([child.pid]) : false).toBe(true);
		} finally {
			await forceCleanupProcess(child.pid);
		}
	}, 15_000);

	if (process.platform !== "win32") {
		it("smoke-shell deduplicates cleared env unsets and delegates agent-home seeding", () => {
			const tempDir = mkdtempSync(join(tmpdir(), "pi-cursor-sdk-smoke-shell-"));
			try {
				const srcDir = join(tempDir, "src");
				const targetHome = join(tempDir, "home");
				mkdirSync(srcDir, { recursive: true });
				writeFileSync(join(srcDir, "auth.json"), '{"cursor":{"apiKey":"k"}}\n', "utf8");
				writeFileSync(join(srcDir, "models.json"), '{"models":[]}\n', "utf8");
				const script = [
					". scripts/lib/smoke-shell.sh",
					'smoke_load_cursor_sdk_event_debug_env_names "$1" scripts/lib/smoke-env.mjs',
					'smoke_load_cursor_sdk_stale_public_env_names "$1" scripts/lib/smoke-env.mjs',
					'smoke_build_cursor_sdk_cleared_env_unsets && printf "%s\\n" "${SMOKE_CURSOR_SDK_CLEARED_ENV_UNSETS[@]}"',
					'smoke_seed_pi_agent_home "$2" "$3" "$4"',
				].join("\n");
				const result = spawnSync(
					"bash",
					["-euo", "pipefail", "-c", script, "bash", process.execPath, targetHome, join(srcDir, "auth.json"), join(srcDir, "models.json")],
					{ encoding: "utf8" },
				);
				expect(result.status, result.stderr).toBe(0);
				const lines = result.stdout.split("\n").filter((line) => line && !line.startsWith("[smoke]"));
				expect(lines.filter((_, i) => i % 2 === 0).every((flag) => flag === "-u")).toBe(true);
				expect(lines.filter((_, i) => i % 2 === 1)).toEqual([...CURSOR_SDK_CLEARED_ENV_NAMES]);
				expect(readFileSync(join(targetHome, ".pi", "agent", "auth.json"), "utf8")).toContain('"cursor"');
				expect(readFileSync(join(targetHome, ".pi", "agent", "models.json"), "utf8")).toContain('"models"');
			} finally {
				rmSync(tempDir, { recursive: true, force: true });
			}
		});
	}

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
