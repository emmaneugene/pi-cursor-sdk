import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import type { ModelListItem } from "@cursor/sdk";
import { loadCursorSdkUserConfig, type CursorSdkConfig } from "./cursor-config.js";
import { asRecord } from "./cursor-record-utils.js";
import { projectCursorModelCatalog } from "../shared/cursor-model-selection-identities.mjs";

const MODEL_LIST_CACHE_FILE = "cursor-sdk-model-list.json";
const MODEL_LIST_CACHE_VERSION = 1;
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_CLOCK_SKEW_MS = 5 * 60 * 1000;

interface ModelListCacheFile {
	version: number;
	fetchedAt: number;
	keyFingerprint: string;
	models: ModelListItem[];
}

export interface CachedModelCatalog {
	fetchedAt: number;
	models: ModelListItem[];
	freshness: "fresh" | "stale";
}

function getCachePath(): string {
	return join(getAgentDir(), MODEL_LIST_CACHE_FILE);
}

export function isModelCacheDisabled(config: CursorSdkConfig = loadCursorSdkUserConfig()): boolean {
	return config.models?.cache?.enabled === false;
}

export function getModelCacheTtlMs(config: CursorSdkConfig = loadCursorSdkUserConfig()): number {
	const ttlMs = config.models?.cache?.ttlMs;
	return ttlMs === undefined || !Number.isFinite(ttlMs) || ttlMs < 0 ? DEFAULT_TTL_MS : ttlMs;
}

// Fingerprint the API key so a key change invalidates the cache, without ever
// persisting the key itself.
export function fingerprintApiKey(apiKey: string): string {
	return createHash("sha256").update(apiKey).digest("hex").slice(0, 16);
}

function isValidFetchedAt(value: unknown): value is number {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= Date.now() + MAX_CACHE_CLOCK_SKEW_MS;
}

function parseModelListCacheFile(value: unknown): ModelListCacheFile | undefined {
	const record = asRecord(value);
	if (!record) return undefined;
	if (!Array.isArray(record.models)) return undefined;
	const models = projectCursorModelCatalog(record.models);
	if (
		record.version !== MODEL_LIST_CACHE_VERSION ||
		!isValidFetchedAt(record.fetchedAt) ||
		typeof record.keyFingerprint !== "string" ||
		!models
	) {
		return undefined;
	}
	return {
		version: record.version,
		fetchedAt: record.fetchedAt,
		keyFingerprint: record.keyFingerprint,
		models,
	};
}

function readCacheFile(): ModelListCacheFile | undefined {
	const path = getCachePath();
	if (!existsSync(path)) return undefined;
	try {
		return parseModelListCacheFile(JSON.parse(readFileSync(path, "utf-8")));
	} catch {
		return undefined;
	}
}

// One read of the on-disk catalog. Freshness is "stale" when the entry is older
// than the TTL, or when TTL is zero. Callers skip the network only for "fresh".
export function loadCachedModelCatalog(
	keyFingerprint: string,
	now: number = Date.now(),
	config?: CursorSdkConfig,
): CachedModelCatalog | undefined {
	if (isModelCacheDisabled(config)) return undefined;
	const cache = readCacheFile();
	if (!cache || cache.keyFingerprint !== keyFingerprint) return undefined;
	const ttlMs = getModelCacheTtlMs(config);
	return {
		fetchedAt: cache.fetchedAt,
		models: cache.models,
		freshness: ttlMs > 0 && now - cache.fetchedAt <= ttlMs ? "fresh" : "stale",
	};
}

export function saveModelListCache(keyFingerprint: string, models: ModelListItem[], config?: CursorSdkConfig): boolean {
	if (isModelCacheDisabled(config)) return false;
	const projected = projectCursorModelCatalog(models);
	if (!projected) return false;
	try {
		const path = getCachePath();
		mkdirSync(dirname(path), { recursive: true });
		const data: ModelListCacheFile = {
			version: MODEL_LIST_CACHE_VERSION,
			fetchedAt: Date.now(),
			keyFingerprint,
			models: projected,
		};
		writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
		chmodSync(path, 0o600);
		return true;
	} catch {
		return false;
	}
}

export const __testUtils = {
	getCachePath,
	DEFAULT_TTL_MS,
};
