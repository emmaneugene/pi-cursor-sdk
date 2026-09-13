import { spawn } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	cursorFastDefaultsFromConfig,
	getCursorSdkUserConfigPath,
	loadCursorSdkConfig,
	loadCursorSdkConfigForUpdate,
	loadCursorSdkUserConfig,
	mergeCursorSdkConfig,
	mergeCursorSdkConfigForUpdate,
	parseCursorSdkConfig,
	resolveCursorFastDefault,
	resolveCursorSdkConfig,
	saveCursorSdkUserConfig,
	updateCursorSdkConfig,
	withCursorFastDefaults,
} from "../src/cursor-config.js";

function runConfigWriter(path: string, gatePath: string, key: string): Promise<{ code: number | null; output: string }> {
	const child = spawn(process.execPath, [resolve("node_modules/vitest/vitest.mjs"), "run", "test/fixtures/cursor-config-writer.test.ts", "--reporter=dot"], {
		cwd: process.cwd(),
		env: { ...process.env, PI_CURSOR_CONFIG_WRITER_PATH: path, PI_CURSOR_CONFIG_WRITER_GATE: gatePath, PI_CURSOR_CONFIG_WRITER_KEY: key },
	});
	let output = "";
	child.stdout?.on("data", (chunk) => { output += chunk; });
	child.stderr?.on("data", (chunk) => { output += chunk; });
	return new Promise((done) => { child.on("close", (code) => done({ code, output })); });
}

describe("Cursor SDK user config", () => {
	let root: string;
	let agentDir: string;

	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "pi-cursor-config-"));
		agentDir = join(root, "agent");
	});

	afterEach(() => { rmSync(root, { recursive: true, force: true }); });

	it("parses the v0.6 schema and ignores removed config fields", () => {
		expect(parseCursorSdkConfig({
			models: { fastDefaults: { "composer-2": false, bad: "false" }, cache: { enabled: true, ttlMs: 10 } },
			local: { autoReview: true, sandbox: true, resume: false, transport: "http1", settingSources: ["user", " user ", ""], preservePiAgentsContext: true, force: true, useHttp1ForAgent: true, sandboxOptions: { enabled: false } },
			tools: { manifest: false, bridge: { enabled: true, exposeBuiltins: false, exclude: ["bash", " bash ", "", 42], callTimeoutMs: 20, debug: { stderr: true, file: "debug.log" } }, mcp: { callTimeoutMs: 30, connectTimeoutMs: 40 }, display: { native: "on", taskPresentation: "subagent" } },
			debug: { sdkEvents: { enabled: true, directory: ".debug", stderr: false } },
			fastDefaults: { legacy: true },
			bridge: { excludeTools: ["legacy"] },
		})).toEqual({
			models: { fastDefaults: { "composer-2": false }, cache: { enabled: true, ttlMs: 10 } },
			local: { autoReview: true, sandbox: true, resume: false, transport: "http1", settingSources: ["user"], preservePiAgentsContext: true },
			tools: { manifest: false, bridge: { enabled: true, exposeBuiltins: false, exclude: ["bash"], callTimeoutMs: 20, debug: { stderr: true, file: "debug.log" } }, mcp: { callTimeoutMs: 30, connectTimeoutMs: 40 }, display: { native: "on", taskPresentation: "subagent" } },
			debug: { sdkEvents: { enabled: true, directory: ".debug", stderr: false } },
		});
	});

	it("uses CLI, user, and built-in precedence without environment or project layers", () => {
		const user = { local: { autoReview: true, sandbox: true, resume: false, transport: "http1" as const }, tools: { bridge: { exclude: ["bash"] } } };
		expect(resolveCursorSdkConfig({ user }).local).toMatchObject({
			autoReview: { value: true, source: "user" }, sandboxEnabled: { value: true, source: "user" }, resume: { value: false, source: "user" }, force: { value: false, source: "builtin" }, transport: { value: "http1", source: "user" },
		});
		expect(resolveCursorSdkConfig({ cli: { local: { autoReview: false, sandbox: false, resume: true } }, cliForce: true, user }).local).toMatchObject({
			autoReview: { value: false, source: "cli" }, sandboxEnabled: { value: false, source: "cli" }, resume: { value: true, source: "cli" }, force: { value: true, source: "cli" },
		});
		expect(resolveCursorSdkConfig({ session: { local: { transport: "default" } }, user }).local.transport).toEqual({ value: "default", source: "session" });
		expect(resolveCursorSdkConfig({ user }).tools.bridge.exclude).toEqual({ value: ["bash"], source: "user" });
		expect(resolveCursorSdkConfig().tools.bridge.exclude).toEqual({ value: [], source: "builtin" });
	});

	it("loads only ~/.pi/agent/cursor-sdk.json", () => {
		const path = getCursorSdkUserConfigPath(agentDir);
		mkdirSync(agentDir, { recursive: true });
		writeFileSync(path, JSON.stringify({ local: { resume: false } }));
		expect(loadCursorSdkConfig({ agentDir })).toEqual({ user: { local: { resume: false } } });
	});

	it("updates models.fastDefaults and writes new user config as 0600", () => {
		const path = getCursorSdkUserConfigPath(agentDir);
		mkdirSync(agentDir, { recursive: true });
		writeFileSync(path, JSON.stringify({ models: { fastDefaults: { "composer-2": false, bad: "true" } } }));
		const config = loadCursorSdkUserConfig(path);
		expect(cursorFastDefaultsFromConfig(config)).toEqual(new Map([["composer-2", false]]));
		const savedPath = join(agentDir, "saved-cursor-sdk.json");
		saveCursorSdkUserConfig(withCursorFastDefaults(config, new Map([["composer-2", true]])), savedPath);
		expect(JSON.parse(readFileSync(savedPath, "utf8"))).toEqual({ models: { fastDefaults: { "composer-2": true } } });
		if (process.platform !== "win32") expect(statSync(savedPath).mode & 0o777).toBe(0o600);
	});

	it("preserves unknown fields, permissions, locks, and atomic replacement", async () => {
		const path = getCursorSdkUserConfigPath(agentDir);
		mkdirSync(agentDir, { recursive: true });
		writeFileSync(path, JSON.stringify({ local: { resume: false }, future: { enabled: true } }));
		if (process.platform !== "win32") chmodSync(path, 0o640);
		expect(loadCursorSdkConfigForUpdate(path)).toEqual({ local: { resume: false }, future: { enabled: true } });
		updateCursorSdkConfig(path, (current) => mergeCursorSdkConfigForUpdate(current, { local: { sandbox: true } }));
		expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({ local: { resume: false, sandbox: true }, future: { enabled: true } });
		if (process.platform !== "win32") expect(statSync(path).mode & 0o777).toBe(0o640);

		const gatePath = join(root, "writer-gate");
		const first = runConfigWriter(path, gatePath, "writerA");
		const second = runConfigWriter(path, gatePath, "writerB");
		await vi.waitFor(() => expect(Number(existsSync(`${gatePath}.writerA.ready`)) + Number(existsSync(`${gatePath}.writerB.ready`))).toBe(1), { timeout: 20_000, interval: 20 });
		writeFileSync(gatePath, "go");
		for (const result of await Promise.all([first, second])) expect(result.code, result.output).toBe(0);
		expect(JSON.parse(readFileSync(path, "utf8"))).toMatchObject({ writerA: true, writerB: true });
		expect(existsSync(`${path}.lock`)).toBe(false);
		expect(readdirSync(agentDir).filter((name) => name.includes(".tmp"))).toEqual([]);
	}, 60_000);

	it("rejects malformed update files without exposing their contents", () => {
		const path = getCursorSdkUserConfigPath(agentDir);
		mkdirSync(agentDir, { recursive: true });
		const sentinel = "PI_CURSOR_MALFORMED_SECRET";
		writeFileSync(path, `{"secret":"${sentinel}`);
		expect(() => loadCursorSdkConfigForUpdate(path)).toThrow("Invalid JSON in Cursor SDK config");
		try { loadCursorSdkConfigForUpdate(path); } catch (error) { expect((error as Error).message).not.toContain(sentinel); }
	});

	it("keeps an existing lock and cleans its own lock after failures", () => {
		const path = getCursorSdkUserConfigPath(agentDir);
		mkdirSync(agentDir, { recursive: true });
		writeFileSync(path, '{"local":{"resume":false}}\n');
		writeFileSync(`${path}.lock`, "existing");
		try {
			expect(() => updateCursorSdkConfig(path, (current) => ({ ...current, local: { resume: true } }))).toThrow("Timed out waiting for Cursor SDK config lock");
			expect(readFileSync(path, "utf8")).toBe('{"local":{"resume":false}}\n');
			expect(readFileSync(`${path}.lock`, "utf8")).toBe("existing");
		} finally {
			rmSync(`${path}.lock`, { force: true });
		}
		expect(() => updateCursorSdkConfig(path, () => { throw new Error("update failed"); })).toThrow("update failed");
		expect(existsSync(`${path}.lock`)).toBe(false);
	}, 10_000);

	it("keeps fast precedence", () => {
		expect(resolveCursorFastDefault({ cliForceFast: true, sessionValue: false, userValue: false, modelDefault: false })).toMatchObject({ value: true, source: "cli" });
		expect(resolveCursorFastDefault({ sessionValue: false, userValue: true, modelDefault: true })).toMatchObject({ value: false, source: "session" });
	});
});
