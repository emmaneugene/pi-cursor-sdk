import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";
import { LOCAL_RESUME_SUITES } from "../scripts/lib/local-resume-suites.mjs";

function run(command: string, args: string[], env = process.env, cwd = process.cwd()) {
	return spawnSync(command, args, { cwd, encoding: "utf8", env, shell: process.platform === "win32" && command === "npm" });
}

describe("smoke CLI and package contracts", () => {
	it("keeps smoke helper syntax and help paths working without live Cursor auth", () => {
		expect(run("bash", ["-n", "scripts/lib/smoke-shell.sh"]).status).toBe(0);
		expect(run("bash", ["-n", "scripts/tmux-live-smoke.sh"]).status).toBe(0);
		expect(run("bash", ["-n", "scripts/isolated-smoke.sh"]).status).toBe(0);
		expect(run(process.execPath, ["--check", "scripts/steering-rpc-smoke.mjs"]).status).toBe(0);
		expect(run(process.execPath, ["--check", "scripts/visual-tui-smoke.mjs"]).status).toBe(0);
		expect(run(process.execPath, ["--check", "scripts/visual-tui-smoke-self-test.mjs"]).status).toBe(0);
		expect(run(process.execPath, ["--check", "scripts/lib/visual-manifest.mjs"]).status).toBe(0);
		expect(run(process.execPath, ["--check", "scripts/validate-smoke-jsonl.mjs"]).status).toBe(0);
		expect(run(process.execPath, ["--check", "scripts/debug-sdk-events.mjs"]).status).toBe(0);
		expect(run(process.execPath, ["--check", "scripts/debug-provider-events.mjs"]).status).toBe(0);
		expect(run(process.execPath, ["--check", "scripts/local-resume-smoke.mjs"]).status).toBe(0);
		expect(run(process.execPath, ["--check", "scripts/local-resume-cleanup-smoke.mjs"]).status).toBe(0);
		expect(run(process.execPath, ["--check", "scripts/lib/local-resume-smoke-harness.mjs"]).status).toBe(0);
		expect(run(process.execPath, ["--check", "scripts/lib/local-resume-suites.mjs"]).status).toBe(0);

		const liveHelp = process.platform === "win32" ? undefined : run("scripts/tmux-live-smoke.sh", ["--help"]);
		const isolatedHelp = process.platform === "win32" ? undefined : run("scripts/isolated-smoke.sh", ["--help"]);
		const steeringHelp = run(process.execPath, ["scripts/steering-rpc-smoke.mjs", "--help"]);
		const visualHelp = run(process.execPath, ["scripts/visual-tui-smoke.mjs", "--help"]);
		const jsonlHelp = run(process.execPath, ["scripts/validate-smoke-jsonl.mjs", "--help"]);
		const sdkEventsHelp = run(process.execPath, ["scripts/debug-sdk-events.mjs", "--help"]);
		const providerEventsHelp = run(process.execPath, ["scripts/debug-provider-events.mjs", "--help"]);
		const localResumeHelp = run(process.execPath, ["scripts/local-resume-smoke.mjs", "--help"]);

		if (process.platform !== "win32") {
			expect(liveHelp!.status).toBe(0);
			expect(liveHelp!.stdout).toContain("retry-empty-output");
			expect(liveHelp!.stdout).toContain("--self-test");
			expect(isolatedHelp!.status).toBe(0);
			expect(isolatedHelp!.stdout).toContain("plan-strip");
			expect(isolatedHelp!.stdout).toContain("--self-test");
		}
		expect(steeringHelp.status).toBe(0);
		expect(steeringHelp.stdout).toContain("RPC steering smoke");
		expect(visualHelp.status).toBe(0);
		expect(visualHelp.stdout).toContain("Canonical offscreen TUI visual smoke runner");
		expect(visualHelp.stdout).toContain("tools.display.native=on");
		expect(visualHelp.stdout).toContain("--expose-builtin-tools");
		expect(jsonlHelp.status).toBe(0);
		expect(jsonlHelp.stdout).toContain("Validate assistant presence");
		expect(jsonlHelp.stdout).toContain("--replay-errors");
		expect(sdkEventsHelp.status).toBe(0);
		expect(sdkEventsHelp.stdout).toContain("Capture timestamped Cursor SDK event timelines");
		expect(providerEventsHelp.status).toBe(0);
		expect(providerEventsHelp.stdout).toContain("Capture raw Cursor SDK onDelta/onStep payloads through pi's provider path");
		expect(localResumeHelp.status).toBe(0);
		expect(localResumeHelp.stdout).toContain("smoke:local-resume");
		expect(localResumeHelp.stdout).toContain("--safety");
		expect(localResumeHelp.stdout).toContain("--tool-surface");
		expect(localResumeHelp.stdout).toContain("--abort");
		expect(localResumeHelp.stdout).toContain("--tree");
		expect(localResumeHelp.stdout).toContain("--copy-switch");
		expect(localResumeHelp.stdout).toContain("--fallback");
		expect(localResumeHelp.stdout).toContain("--compaction");
		expect(localResumeHelp.stdout).toContain("--default-dry-run");
		expect(localResumeHelp.stdout).toContain("--cleanup");
		expect(localResumeHelp.stdout).toContain("2  invalid command-line usage");

		if (process.platform !== "win32") {
			const failedCommand = run("bash", [
				"-c",
				"set -e; . scripts/lib/smoke-shell.sh; smoke_run_with_timeout_or_fail repro 1 bash -c 'exit 42'",
			]);
			expect(failedCommand.status).toBe(1);
			expect(failedCommand.stderr).toContain("repro exited 42");
		}

		if (process.platform !== "win32") {
			const visualSelfTest = run(process.execPath, ["scripts/visual-tui-smoke.mjs", "--self-test"]);
			expect(visualSelfTest.status).toBe(0);
			expect(visualSelfTest.stdout).toContain("self-test PASS");
		}
		if (process.platform !== "win32") {
			const steeringSelfTest = run(process.execPath, ["scripts/steering-rpc-smoke.mjs", "--self-test"]);
			expect(steeringSelfTest.status).toBe(0);
			expect(steeringSelfTest.stdout).toContain("self-test PASS");
		}
		if (process.platform !== "win32") {
			const liveSelfTest = run("scripts/tmux-live-smoke.sh", ["--self-test"]);
			expect(liveSelfTest.status).toBe(0);
			expect(liveSelfTest.stdout).toContain("self-test PASS");
			const isolatedSelfTest = run("scripts/isolated-smoke.sh", ["--self-test"]);
			expect(isolatedSelfTest.status).toBe(0);
			expect(isolatedSelfTest.stdout).toContain("self-test PASS");
		}
		const invalidVisualArgs = run(process.execPath, ["scripts/visual-tui-smoke.mjs", "--label", "bad", "--prompt", "bad", "--expose-builtin-tools"]);
		expect(invalidVisualArgs.status).toBe(2);
		expect(invalidVisualArgs.stderr).toContain("--expose-builtin-tools requires --bridge");
	}, 90_000);

	it("waits for final RPC settlement instead of a low-level run end", () => {
		for (const path of [
			"scripts/debug-provider-events.mjs",
			"scripts/lib/local-resume-smoke-harness.mjs",
			"scripts/steering-rpc-smoke.mjs",
		]) {
			const source = readFileSync(path, "utf8");
			expect(source).toContain("agent_settled");
			expect(source).not.toContain("agent_end");
		}
	});
	it("rejects paid smoke typos and repeated or conflicting lanes before auth or runs", () => {
		const env: NodeJS.ProcessEnv = {
			...process.env,
			CURSOR_LOCAL_RESUME_SMOKE_TIMEOUT_MS: "-1",
		};
		delete env.CURSOR_API_KEY;
		const cases = [
			{
				args: ["scripts/local-resume-smoke.mjs", "--safty"],
				expected: "unknown argument(s): --safty",
			},
			{
				args: ["scripts/local-resume-smoke.mjs", "--safety", "--safety"],
				expected: "only one smoke lane may be selected",
			},
			{
				args: ["scripts/local-resume-smoke.mjs", "--safety", "--tree"],
				expected: "only one smoke lane may be selected",
			},
		];
		for (const testCase of cases) {
			const result = run(process.execPath, testCase.args, env);
			expect(result.status, testCase.args.join(" ")).toBe(2);
			expect(result.stderr).toContain("usage error");
			expect(result.stderr).toContain(testCase.expected);
			expect(result.stderr).not.toContain("CURSOR_API_KEY is required");
			expect(result.stderr).not.toContain("CURSOR_LOCAL_RESUME_SMOKE_TIMEOUT_MS");
		}
	});

	it("scrubs API keys from offline local-resume CLI validation errors", () => {
		const apiKey = "cursor-offline-smoke-secret-12345";
		const env = { ...process.env, CURSOR_API_KEY: apiKey };
		for (const script of ["scripts/local-resume-smoke.mjs"]) {
			const result = run(process.execPath, [script, `--${apiKey}`], env);
			expect(result.status, script).toBe(2);
			expect(result.stderr).toContain("usage error");
			expect(result.stderr).toContain("[redacted]");
			expect(result.stderr).not.toContain(apiKey);
		}
	});

	it("uses one local-resume suite manifest for CLI lane metadata", () => {
		expect(LOCAL_RESUME_SUITES.map(({ key, flag, script }) => ({ key, flag, script }))).toEqual([
			{ key: "restart", flag: undefined, script: "smoke:local-resume" },
			{ key: "safety", flag: "--safety", script: "smoke:local-resume:safety" },
			{ key: "toolSurface", flag: "--tool-surface", script: "smoke:local-resume:tool-surface" },
			{ key: "abort", flag: "--abort", script: "smoke:local-resume:abort" },
			{ key: "tree", flag: "--tree", script: "smoke:local-resume:tree" },
			{ key: "copySwitch", flag: "--copy-switch", script: "smoke:local-resume:copy-switch" },
			{ key: "fallback", flag: "--fallback", script: "smoke:local-resume:fallback" },
			{ key: "compaction", flag: "--compaction", script: "smoke:local-resume:compaction" },
			{ key: "defaultDryRun", flag: "--default-dry-run", script: "smoke:local-resume:default-dry-run" },
			{ key: "cleanup", flag: "--cleanup", script: "smoke:local-resume:cleanup" },
		]);
	});

	it("packages maintainer smoke scripts", () => {
		const published = JSON.parse(readFileSync("package.json", "utf8")) as { files: string[] };
		expect(published.files).toContain("scripts");
		expect(published.files.some((entry) => entry.startsWith("scripts/"))).toBe(false);
		const result = run("npm", ["pack", "--dry-run", "--json"]);
		expect(result.status).toBe(0);
		const [pack] = JSON.parse(result.stdout) as Array<{ name: string; version: string; files: Array<{ path: string }> }>;
		const paths = new Set(pack.files.map((file) => file.path));

		expect(pack.name).toBe("@emmaneugene/pi-cursor-sdk");
		expect(paths.has("scripts/tmux-live-smoke.sh")).toBe(true);
		expect(paths.has("scripts/isolated-smoke.sh")).toBe(true);
		expect(paths.has("scripts/fixtures/plan-strip-shim/index.ts")).toBe(true);
		expect(paths.has("scripts/steering-rpc-smoke.mjs")).toBe(true);
		expect(paths.has("scripts/visual-tui-smoke.mjs")).toBe(true);
		expect(paths.has("scripts/validate-smoke-jsonl.mjs")).toBe(true);
		expect(paths.has("scripts/debug-sdk-events.mjs")).toBe(true);
		expect(paths.has("scripts/debug-provider-events.mjs")).toBe(true);
		for (const path of paths) {
			if (!path.endsWith(".mjs")) continue;
			const declarationPath = path.replace(/\.mjs$/, ".d.mts");
			if (existsSync(declarationPath)) expect(paths.has(declarationPath)).toBe(true);
		}
		expect(paths.has("shared/setting-sources.mjs")).toBe(true);
		expect(paths.has("shared/setting-sources.d.mts")).toBe(true);
		expect(paths.has("shared/sensitive-text.mjs")).toBe(true);
		expect(paths.has("shared/sensitive-text.d.mts")).toBe(true);
		expect(paths.has("scripts/lib/local-resume-smoke-harness.mjs")).toBe(true);
		expect(paths.has("scripts/lib/local-resume-suites.mjs")).toBe(true);
		expect(paths.has("scripts/lib/local-resume-suites.d.mts")).toBe(true);
		expect(paths.has("scripts/lib/smoke-env.mjs")).toBe(true);
		expect(paths.has("scripts/lib/smoke-env.d.mts")).toBe(true);
		expect(paths.has("scripts/lib/smoke-shell.sh")).toBe(true);
		expect(paths.has("scripts/lib/visual-render.mjs")).toBe(true);
		expect(paths.has("scripts/lib/visual-render.d.mts")).toBe(true);
		expect(paths.has("shared/sdk-event-debug-env.mjs")).toBe(true);
		expect(paths.has("shared/sdk-event-debug-env.d.mts")).toBe(true);
		expect(paths.has("scripts/lib/cursor-setting-sources.mjs")).toBe(false);
		expect(paths.has("scripts/lib/cursor-sensitive-text.mjs")).toBe(false);
		expect(paths.has("scripts/lib/cli-args.mjs")).toBe(true);
		expect(paths.has("CHANGELOG.md")).toBe(true);
		expect(paths.has("README.md")).toBe(true);
		expect(paths.has("dist/index.js")).toBe(true);
		// pi silently drops manifest entries whose file is missing; assert the
		// manifest target exists on disk after the pack-triggered build.
		const manifest = JSON.parse(readFileSync("package.json", "utf8")) as { pi?: { extensions?: string[] } };
		for (const entry of manifest.pi?.extensions ?? []) {
			expect(existsSync(entry), `pi.extensions entry missing on disk: ${entry}`).toBe(true);
		}
		expect(paths.has("tsconfig.build.json")).toBe(true);
		expect(paths.has("scripts/build.mjs")).toBe(true);
		expect(paths.has("scripts/prepare.mjs")).toBe(true);
		// Launchers import this helper; packed installs break without it.
		expect(paths.has("scripts/lib/ensure-built.mjs")).toBe(true);
		expect([...paths].some((path) => path.startsWith("coverage/") || path.startsWith(".pi/") || path.includes("smoke-dir"))).toBe(false);
	}, 90_000);
});
