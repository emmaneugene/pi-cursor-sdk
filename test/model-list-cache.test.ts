import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { ModelListItem } from "@cursor/sdk";
import {
	fingerprintApiKey,
	getModelCacheTtlMs,
	isModelCacheDisabled,
	loadCachedModelCatalog,
	saveModelListCache,
	__testUtils,
} from "../src/model-list-cache.js";

const MODELS: ModelListItem[] = [
	{
		id: "composer-2",
		displayName: "Composer 2",
		variants: [{ params: [], displayName: "Composer 2", isDefault: true }],
	},
];

describe("model-list-cache", () => {
	const originalEnv = process.env;
	let tmpAgentDir: string;
	const fp = fingerprintApiKey("test-key");

	beforeEach(() => {
		process.env = { ...originalEnv };
		tmpAgentDir = mkdtempSync(join(tmpdir(), "pi-cursor-model-cache-"));
		process.env.PI_CODING_AGENT_DIR = tmpAgentDir;
	});

	afterEach(() => {
		rmSync(tmpAgentDir, { recursive: true, force: true });
		process.env = originalEnv;
	});

	it("round-trips a saved catalog for a matching key", () => {
		saveModelListCache(fp, MODELS);
		expect(loadCachedModelCatalog(fp)).toEqual({
			fetchedAt: expect.any(Number),
			models: MODELS,
			freshness: "fresh",
		});
	});

	it("writes the cache file with 0600 permissions and no API key", () => {
		expect(saveModelListCache(fp, MODELS)).toBe(true);
		const path = __testUtils.getCachePath();
		if (process.platform !== "win32") expect(statSync(path).mode & 0o777).toBe(0o600);
		const raw = readFileSync(path, "utf-8");
		expect(raw).not.toContain("test-key");
		expect(JSON.parse(raw).keyFingerprint).toBe(fp);
	});

	it("tightens permissions when rewriting an existing loose cache file", () => {
		const path = __testUtils.getCachePath();
		writeFileSync(path, "{}", { mode: 0o644 });

		expect(saveModelListCache(fp, MODELS)).toBe(true);

		if (process.platform !== "win32") expect(statSync(path).mode & 0o777).toBe(0o600);
	});

	it("misses when the key fingerprint differs", () => {
		saveModelListCache(fp, MODELS);
		expect(loadCachedModelCatalog(fingerprintApiKey("other-key"))).toBeUndefined();
	});

	it("returns entries older than the TTL as stale", () => {
		saveModelListCache(fp, MODELS);
		const future = Date.now() + __testUtils.DEFAULT_TTL_MS + 1000;
		expect(loadCachedModelCatalog(fp, future)).toEqual({
			fetchedAt: expect.any(Number),
			models: MODELS,
			freshness: "stale",
		});
	});

	it("ignores a corrupt cache file", () => {
		writeFileSync(__testUtils.getCachePath(), "{ not json");
		expect(loadCachedModelCatalog(fp)).toBeUndefined();
	});

	it.each([
		["non-finite", "1e309"],
		["negative", "-1"],
		["finite Date-invalid", "1e100"],
		["far-future", `${Date.now() + __testUtils.DEFAULT_TTL_MS + 1}`],
	])("ignores cache files with %s timestamps", (_label, fetchedAt) => {
		writeFileSync(
			__testUtils.getCachePath(),
			`{"version":1,"fetchedAt":${fetchedAt},"keyFingerprint":${JSON.stringify(fp)},"models":${JSON.stringify(MODELS)}}`,
		);

		expect(loadCachedModelCatalog(fp)).toBeUndefined();
	});

	it.each([
		["missing displayName", { id: "missing-display-name" }],
		["parameter without values", { id: "raw-id", displayName: "Raw", parameters: [{ id: "context" }] }],
		[
			"parameter value without string value",
			{ id: "raw-id", displayName: "Raw", parameters: [{ id: "context", values: [{ displayName: "1M" }] }] },
		],
		[
			"variant param without string id/value",
			{ id: "raw-id", displayName: "Raw", variants: [{ params: [{ id: "context" }], displayName: "Raw", isDefault: true }] },
		],
	])("ignores cache files with invalid model shapes: %s", (_label, model) => {
		writeFileSync(
			__testUtils.getCachePath(),
			JSON.stringify({
				version: 1,
				fetchedAt: Date.now(),
				keyFingerprint: fp,
				models: [model],
			}),
		);

		expect(loadCachedModelCatalog(fp)).toBeUndefined();
	});

	it("disables reads and writes through user config", () => {
		const config = { models: { cache: { enabled: false } } };
		expect(saveModelListCache(fp, MODELS, config)).toBe(false);
		expect(loadCachedModelCatalog(fp, Date.now(), config)).toBeUndefined();
	});

	it("honors a custom TTL from user config", () => {
		const config = { models: { cache: { ttlMs: 1000 } } };
		expect(getModelCacheTtlMs(config)).toBe(1000);
		saveModelListCache(fp, MODELS, config);
		expect(loadCachedModelCatalog(fp, Date.now() + 2000, config)?.freshness).toBe("stale");
	});

	it("treats a zero TTL as stale while still returning the catalog", () => {
		const config = { models: { cache: { ttlMs: 0 } } };
		saveModelListCache(fp, MODELS, config);
		expect(loadCachedModelCatalog(fp, Date.now(), config)).toEqual({
			fetchedAt: expect.any(Number),
			models: MODELS,
			freshness: "stale",
		});
	});

	it("falls back to the default TTL for invalid config values", () => {
		expect(getModelCacheTtlMs({ models: { cache: { ttlMs: Number.NaN } } })).toBe(__testUtils.DEFAULT_TTL_MS);
	});

	it("defaults model caching to enabled", () => {
		expect(isModelCacheDisabled({})).toBe(false);
		expect(isModelCacheDisabled({ models: { cache: { enabled: false } } })).toBe(true);
	});
});
