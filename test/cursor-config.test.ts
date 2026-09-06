import { spawn } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	CURSOR_AUTO_REVIEW_ENV,
	CURSOR_SANDBOX_ENV,
	CURSOR_LOCAL_FORCE_ENV,
	CURSOR_LOCAL_RESUME_ENV,
	CURSOR_HTTP1_ENV,
	cursorFastDefaultsFromConfig,
	getCursorSdkProjectConfigPath,
	getCursorSdkUserConfigPath,
	loadCursorSdkConfig,
	loadCursorSdkConfigForUpdate,
	loadCursorSdkUserConfig,
	mergeCursorSdkConfig,
	parseCursorSdkConfig,
	resolveCursorFastDefault,
	resolveCursorSdkConfig,
	saveCursorSdkProjectConfig,
	saveCursorSdkUserConfig,
	updateCursorSdkConfig,
	withCursorFastDefaults,
} from "../src/cursor-config.js";

function runConfigWriter(
	path: string,
	gatePath: string,
	key: string,
): Promise<{ code: number | null; output: string }> {
	const child = spawn(
		process.execPath,
		[resolve("node_modules/vitest/vitest.mjs"), "run", "test/fixtures/cursor-config-writer.test.ts", "--reporter=dot"],
		{
			cwd: process.cwd(),
			env: {
				...process.env,
				PI_CURSOR_CONFIG_WRITER_PATH: path,
				PI_CURSOR_CONFIG_WRITER_GATE: gatePath,
				PI_CURSOR_CONFIG_WRITER_KEY: key,
			},
		},
	);
	let output = "";
	child.stdout?.on("data", (chunk) => { output += chunk; });
	child.stderr?.on("data", (chunk) => { output += chunk; });
	return new Promise((done) => {
		child.on("close", (code) => done({ code, output }));
	});
}

describe("Cursor SDK config resolver", () => {
	let root: string;
	let agentDir: string;
	let cwd: string;

	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "pi-cursor-config-"));
		agentDir = join(root, "agent");
		cwd = join(root, "repo");
		mkdirSync(cwd, { recursive: true });
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	it("resolves HTTP/1.1 as session, env, user, then byte-identical default", () => {
		const user = { local: { useHttp1ForAgent: true } };
		const project = { local: { useHttp1ForAgent: false } };

		expect(resolveCursorSdkConfig({ env: {}, user }).local.useHttp1ForAgent).toMatchObject({
			value: true,
			source: "user",
		});
		expect(
			resolveCursorSdkConfig({
				env: { [CURSOR_HTTP1_ENV]: "false" },
				user,
				project,
			}).local.useHttp1ForAgent,
		).toMatchObject({ value: false, source: "environment" });
		expect(
			resolveCursorSdkConfig({
				env: { [CURSOR_HTTP1_ENV]: "false" },
				session: { local: { useHttp1ForAgent: true } },
				user,
			}).local.useHttp1ForAgent,
		).toMatchObject({ value: true, source: "session" });
		expect(resolveCursorSdkConfig({ env: {}, project }).local.useHttp1ForAgent).toMatchObject({
			value: false,
			source: "builtin",
		});
	});

	it("parses the bridge excludeTools denylist from user and project JSON config", () => {
		const parsed = parseCursorSdkConfig({
			bridge: { excludeTools: ["bash", " bash ", "bash", "", 42] },
		});
		expect(parsed?.bridge).toEqual({ excludeTools: ["bash"] });

		// Empty and malformed lists mean unset (no restriction), not zero exposure.
		expect(parseCursorSdkConfig({ bridge: { excludeTools: [] } })?.bridge).toBeUndefined();
		expect(parseCursorSdkConfig({ bridge: { excludeTools: [42] } })?.bridge).toBeUndefined();
		expect(parseCursorSdkConfig({ bridge: { tools: ["find"] } })?.bridge).toBeUndefined();
		expect(parseCursorSdkConfig({ bridge: "on" })).toEqual({});
	});

	it("resolves the bridge denylist as trusted project over user with an empty built-in default", () => {
		const user = { bridge: { excludeTools: ["bash"] } };
		// Disjoint names prove project replaces, not unions with, the user denylist.
		const project = { bridge: { excludeTools: ["edit"] } };

		expect(resolveCursorSdkConfig({ env: {}, user }).bridge.excludeTools).toMatchObject({
			value: ["bash"],
			source: "user",
		});
		expect(resolveCursorSdkConfig({ env: {}, user, project }).bridge.excludeTools).toMatchObject({
			value: ["edit"],
			source: "project",
		});
		expect(resolveCursorSdkConfig({ env: {} }).bridge.excludeTools).toMatchObject({ value: [], source: "builtin" });
	});

	it("keeps legacy fastDefaults shape compatible and writes user config as 0600", () => {
		const path = getCursorSdkUserConfigPath(agentDir);
		mkdirSync(agentDir, { recursive: true });
		writeFileSync(path, JSON.stringify({ fastDefaults: { "composer-2": false, bad: "true" } }));

		const config = loadCursorSdkUserConfig(path);
		expect(cursorFastDefaultsFromConfig(config)).toEqual(new Map([["composer-2", false]]));

		const savedPath = join(agentDir, "saved-cursor-sdk.json");
		saveCursorSdkUserConfig(withCursorFastDefaults(config, new Map([["composer-2", true]])), savedPath);
		expect(JSON.parse(readFileSync(savedPath, "utf-8"))).toEqual({ fastDefaults: { "composer-2": true } });
		if (process.platform !== "win32") expect(statSync(savedPath).mode & 0o777).toBe(0o600);
	});

	it("preserves existing config permissions and atomically replaces user and project JSON", () => {
		const userPath = getCursorSdkUserConfigPath(agentDir);
		const projectPath = getCursorSdkProjectConfigPath(cwd);
		mkdirSync(agentDir, { recursive: true });
		writeFileSync(userPath, "{}\n");
		mkdirSync(join(cwd, ".pi"), { recursive: true });
		writeFileSync(projectPath, "{}\n");
		if (process.platform !== "win32") {
			chmodSync(userPath, 0o660);
			chmodSync(projectPath, 0o640);
		}

		saveCursorSdkUserConfig({ local: { resume: false } }, userPath);
		saveCursorSdkProjectConfig(cwd, { local: { resume: true } });

		expect(JSON.parse(readFileSync(userPath, "utf8"))).toEqual({ local: { resume: false } });
		expect(JSON.parse(readFileSync(projectPath, "utf8"))).toEqual({ local: { resume: true } });
		if (process.platform !== "win32") {
			expect(statSync(userPath).mode & 0o777).toBe(0o660);
			expect(statSync(projectPath).mode & 0o777).toBe(0o640);
		}
		expect(readdirSync(agentDir)).toEqual(["cursor-sdk.json"]);
		expect(readdirSync(join(cwd, ".pi"))).toEqual(["cursor-sdk.json"]);
	});

	it.skipIf(process.platform === "win32")("uses normal umask permissions for new project config files", () => {
		const newCwd = join(root, "new-repo");
		mkdirSync(newCwd);

		saveCursorSdkProjectConfig(newCwd, { local: { resume: true } });

		expect(statSync(getCursorSdkProjectConfigPath(newCwd)).mode & 0o777).toBe(0o666 & ~process.umask());
	});

	it("preserves current fast precedence through the resolver", () => {
		expect(resolveCursorFastDefault({ cliForceFast: true, aliasOverride: false, sessionValue: false, userValue: false, modelDefault: false })).toMatchObject({
			value: true,
			source: "cli",
		});
		expect(resolveCursorFastDefault({ aliasOverride: false, sessionValue: true, userValue: true, modelDefault: true })).toMatchObject({
			value: false,
			source: "model-alias",
		});
		expect(resolveCursorFastDefault({ sessionValue: false, userValue: true, modelDefault: true })).toMatchObject({
			value: false,
			source: "session",
		});
		expect(resolveCursorFastDefault({ userValue: false, modelDefault: true })).toMatchObject({ value: false, source: "user" });
		expect(resolveCursorFastDefault({ modelDefault: true })).toMatchObject({ value: true, source: "builtin" });
	});

	it("loads project config only from the caller's snapshotted trust decision", () => {
		const projectPath = getCursorSdkProjectConfigPath(cwd);
		mkdirSync(join(cwd, ".pi"), { recursive: true });
		writeFileSync(projectPath, JSON.stringify({ local: { resume: false } }));

		expect(loadCursorSdkConfig({ cwd, agentDir, projectTrusted: false })).toEqual({ user: {} });
		expect(loadCursorSdkConfig({ cwd, agentDir, projectTrusted: true })).toEqual({ user: {}, project: { local: { resume: false } } });
	});

	it("loads raw config objects for updates and rejects invalid files", () => {
		const path = getCursorSdkUserConfigPath(agentDir);
		mkdirSync(agentDir, { recursive: true });
		writeFileSync(path, JSON.stringify({ local: { resume: false }, future: { enabled: true } }));
		expect(loadCursorSdkConfigForUpdate(path)).toEqual({ local: { resume: false }, future: { enabled: true } });

		const sentinel = "PI_CURSOR_MALFORMED_SECRET";
		writeFileSync(path, `{"secret":"${sentinel}`);
		let malformedError: unknown;
		try {
			loadCursorSdkConfigForUpdate(path);
		} catch (error) {
			malformedError = error;
		}
		expect(malformedError).toBeInstanceOf(Error);
		expect((malformedError as Error).message).toContain("Invalid JSON in Cursor SDK config");
		expect((malformedError as Error).message).not.toContain(sentinel);
		writeFileSync(path, "[]");
		expect(() => loadCursorSdkConfigForUpdate(path)).toThrow("expected a JSON object");
	});

	it("serializes two process writers without losing unrelated fields", async () => {
		const path = getCursorSdkUserConfigPath(agentDir);
		const gatePath = join(root, "writer-gate");
		const first = runConfigWriter(path, gatePath, "writerA");
		const second = runConfigWriter(path, gatePath, "writerB");
		await vi.waitFor(() => {
			expect(existsSync(`${gatePath}.writerA.started`)).toBe(true);
			expect(existsSync(`${gatePath}.writerB.started`)).toBe(true);
			expect(
				Number(existsSync(`${gatePath}.writerA.ready`)) + Number(existsSync(`${gatePath}.writerB.ready`)),
			).toBe(1);
		}, { timeout: 20_000, interval: 20 });
		writeFileSync(gatePath, "go");
		const results = await Promise.all([first, second]);
		for (const result of results) expect(result.code, result.output).toBe(0);
		expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({ writerA: true, writerB: true });
		expect(existsSync(`${path}.lock`)).toBe(false);
	}, 60_000);

	it("times out without changing config or removing an existing lock", () => {
		const path = getCursorSdkUserConfigPath(agentDir);
		mkdirSync(agentDir, { recursive: true });
		writeFileSync(path, '{"local":{"resume":false}}\n');
		writeFileSync(`${path}.lock`, "existing");
		try {
			expect(() => updateCursorSdkConfig(path, (current) => ({ ...current, local: { resume: true } }))).toThrow(
				"Timed out waiting for Cursor SDK config lock",
			);
			expect(readFileSync(path, "utf8")).toBe('{"local":{"resume":false}}\n');
			expect(readFileSync(`${path}.lock`, "utf8")).toBe("existing");
		} finally {
			rmSync(`${path}.lock`, { force: true });
		}
	}, 10_000);

	it("cleans locks and temporary files on update, parse, and replacement failures", () => {
		const path = getCursorSdkUserConfigPath(agentDir);
		mkdirSync(agentDir, { recursive: true });
		writeFileSync(path, '{"local":{"resume":false}}\n');
		expect(() => updateCursorSdkConfig(path, () => { throw new Error("update failed"); })).toThrow("update failed");
		expect(readFileSync(path, "utf8")).toBe('{"local":{"resume":false}}\n');
		expect(existsSync(`${path}.lock`)).toBe(false);

		writeFileSync(path, "{invalid");
		expect(() => updateCursorSdkConfig(path, (current) => current)).toThrow("Invalid JSON in Cursor SDK config");
		expect(readFileSync(path, "utf8")).toBe("{invalid");
		expect(existsSync(`${path}.lock`)).toBe(false);

		writeFileSync(path, '{}\n');
		expect(() => updateCursorSdkConfig(path, (current) => {
			rmSync(path);
			mkdirSync(path);
			return { ...current, local: { resume: true } };
		})).toThrow();
		expect(existsSync(`${path}.lock`)).toBe(false);
		expect(readdirSync(agentDir).filter((name) => name.includes(".tmp"))).toEqual([]);
	});

	it("merges nested cursor sdk config", () => {
		expect(
			mergeCursorSdkConfig(
				{ local: { sandboxOptions: { enabled: true }, resume: false } },
				{ local: { autoReview: true, resume: true } },
			),
		).toEqual({
			local: { sandboxOptions: { enabled: true }, resume: true, autoReview: true },
		});
	});

	it.each([
		["disabled", false],
		["enabled", true],
		["false", false],
		["true", true],
	] as const)("parses PI_CURSOR_LOCAL_RESUME=%s as %s", (raw, expected) => {
		expect(resolveCursorSdkConfig({ env: { [CURSOR_LOCAL_RESUME_ENV]: raw } }).local.resume).toMatchObject({
			value: expected,
			source: "environment",
		});
	});

	it("ignores session for local fields (per-field source order)", () => {
		const local = resolveCursorSdkConfig({
			session: { local: { autoReview: true, resume: false } },
		}).local;
		expect(local.autoReview).toMatchObject({ value: false, source: "builtin" });
		expect(local.resume).toMatchObject({ value: true, source: "builtin" });
	});

	it("resolves local safety controls by CLI, env, project, user, built-in order", () => {
		const user = { local: { autoReview: true, sandboxOptions: { enabled: true }, force: true, resume: true } };
		const project = { local: { autoReview: false, sandbox: false, force: true, resume: false } };

		expect(resolveCursorSdkConfig().local.autoReview).toMatchObject({ value: false, source: "builtin" });
		expect(resolveCursorSdkConfig().local.force).toMatchObject({ value: false, source: "builtin" });
		expect(resolveCursorSdkConfig().local.resume).toMatchObject({ value: true, source: "builtin" });
		expect(resolveCursorSdkConfig({ user }).local.sandboxEnabled).toMatchObject({ value: true, source: "user" });
		expect(resolveCursorSdkConfig({ user, project }).local.autoReview).toMatchObject({ value: false, source: "project" });
		expect(resolveCursorSdkConfig({ user, project }).local.force).toMatchObject({ value: false, source: "builtin" });
		expect(resolveCursorSdkConfig({ user, project }).local.resume).toMatchObject({ value: false, source: "project" });
		expect(
			resolveCursorSdkConfig({
				env: { [CURSOR_AUTO_REVIEW_ENV]: "1", [CURSOR_SANDBOX_ENV]: "true", [CURSOR_LOCAL_FORCE_ENV]: "1", [CURSOR_LOCAL_RESUME_ENV]: "1" },
				user,
				project,
			}).local,
		).toMatchObject({
			autoReview: expect.objectContaining({ value: true, source: "environment" }),
			sandboxEnabled: expect.objectContaining({ value: true, source: "environment" }),
			force: expect.objectContaining({ value: true, source: "environment" }),
			resume: expect.objectContaining({ value: true, source: "environment" }),
		});
		expect(
			resolveCursorSdkConfig({
				cli: { local: { autoReview: false, sandboxOptions: { enabled: false }, force: false, resume: false } },
				env: { [CURSOR_AUTO_REVIEW_ENV]: "1", [CURSOR_SANDBOX_ENV]: "1", [CURSOR_LOCAL_FORCE_ENV]: "1", [CURSOR_LOCAL_RESUME_ENV]: "1" },
				user,
				project,
			}).local,
		).toMatchObject({
			autoReview: expect.objectContaining({ value: false, source: "cli" }),
			sandboxEnabled: expect.objectContaining({ value: false, source: "cli" }),
			force: expect.objectContaining({ value: false, source: "cli" }),
			resume: expect.objectContaining({ value: false, source: "cli" }),
		});
	});
});
