import { describe, expect, it, vi, afterEach } from "vitest";
import { createRequire } from "node:module";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	ensureArtifactDir,
	isProbeMainModule,
	printJsonSummary,
	readInstalledPackageVersion,
	writeJsonArtifact,
} from "../scripts/lib/cursor-probe-capture.mjs";

const require = createRequire(import.meta.url);

describe("cursor-probe-capture lib", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("detects non-main module invocations", () => {
		expect(isProbeMainModule("file:///definitely/not/the/entry.mjs")).toBe(false);
	});

	it("reads the installed Cursor SDK version", () => {
		const version = readInstalledPackageVersion(require, "@cursor/sdk");
		expect(version).toMatch(/^\d+\.\d+\.\d+/);
	});

	it("returns unknown for missing packages", () => {
		expect(readInstalledPackageVersion(require, "@cursor/does-not-exist")).toBe("unknown");
	});

	it("creates artifact dirs and round-trips JSON artifacts", () => {
		const root = mkdtempSync(join(tmpdir(), "probe-capture-"));
		try {
			const dir = ensureArtifactDir(join(root, "nested", "out"));
			expect(existsSync(dir)).toBe(true);
			writeJsonArtifact(join(dir, "summary.json"), { ok: true });
			expect(JSON.parse(readFileSync(join(dir, "summary.json"), "utf8"))).toEqual({ ok: true });
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("prints summaries as JSON", () => {
		const log = vi.spyOn(console, "log").mockImplementation(() => {});
		printJsonSummary({ ok: true });
		expect(JSON.parse(log.mock.calls[0][0])).toEqual({ ok: true });
	});
});
