import type {
	ModelListItem,
	ModelParameterDefinition,
	ModelParameterValue,
	ModelSelection,
} from "@cursor/sdk";
import type { ProviderModelConfig } from "@earendil-works/pi-coding-agent";
import type { ModelThinkingLevel, ThinkingLevelMap } from "@earendil-works/pi-ai";
import { getCursorModelSelectionIdentities, projectCursorModelCatalog } from "../shared/model-selection-identities.mjs";
import { loadContextWindowCache } from "./context-window-cache.js";
import { loadCursorSdk } from "./sdk-runtime.js";
import { resolveCursorApiKey, resolveCursorRuntimeApiKey } from "./api-key.js";
import { scrubSensitiveText } from "./sensitive-text.js";
import {
	fingerprintApiKey,
	loadCachedModelCatalog,
	saveModelListCache,
} from "./model-list-cache.js";

export type CursorProviderModelConfig = Extract<ProviderModelConfig, { type?: "chat" }>;

const FALLBACK_CONTEXT_WINDOW = 128000;
const FALLBACK_MAX_TOKENS = 16384;
const ZERO_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
const TEXT_AND_IMAGE_INPUT: CursorProviderModelConfig["input"] = ["text", "image"];
const AUTH_SETUP_HINT = "/login (Use an API key -> Cursor) or CURSOR_API_KEY; startup discovery does not parse Pi CLI arguments, and Cursor Agent CLI/Desktop login is not reused";
const CATALOG_REFRESH_HINT =
	"After adding auth to an already-started pi session, run /cursor-refresh-models to refresh the full live Cursor model catalog without restarting pi.";

export type CursorModelFallbackReason = "missing-api-key" | "discovery-failed" | "empty-model-list" | "cached-after-error";

export interface CursorModelFallbackIssue {
	reason: CursorModelFallbackReason;
	message: string;
	errorMessage?: string;
}

export interface DiscoverModelsOptions {
	onFallback?: (issue: CursorModelFallbackIssue) => void;
	apiKey?: string;
	// Bypass the on-disk model cache and always hit the live catalog. Used by the
	// /cursor-refresh-models command; the startup path leaves this false so warm
	// boots skip the slow network round-trip.
	forceRefresh?: boolean;
}

async function getDiscoveryApiKey(apiKey?: string): Promise<string | undefined> {
	return resolveCursorApiKey(apiKey) ?? resolveCursorRuntimeApiKey();
}

export type CursorEffortParameterId = "effort" | "reasoning_effort" | "reasoning";

export type CursorThinkingOffMode =
	| { kind: "unsupported" }
	| { kind: "same-param"; value: string }
	| { kind: "disable-thinking"; falseValue: string };

export type CursorThinkingControl =
	| { kind: "boolean"; thinkingLevelMap: ThinkingLevelMap }
	| {
		kind: "level";
		paramId: CursorEffortParameterId;
		thinkingLevelMap: ThinkingLevelMap;
		offMode: CursorThinkingOffMode;
		companionThinkingTrueValue?: string;
	};

export interface CursorModelMetadata {
	piModelId: string;
	displayName: string;
	defaultParams: ModelParameterValue[];
	contextWindow: number;
	supportsFast: boolean;
	defaultFast: boolean;
	thinking?: CursorThinkingControl;
}

const metadataByPiModelId = new Map<string, CursorModelMetadata>();

function cloneParams(params: ModelParameterValue[]): ModelParameterValue[] {
	return params.map((param) => ({ ...param }));
}

function indexParameters(item: ModelListItem): Map<string, ModelParameterDefinition> {
	const parametersById = new Map<string, ModelParameterDefinition>();
	for (const parameter of item.parameters ?? []) {
		if (!parametersById.has(parameter.id)) parametersById.set(parameter.id, parameter);
	}
	return parametersById;
}

function hasBooleanValues(parameter: ModelParameterDefinition | undefined): boolean {
	const values = new Set((parameter?.values ?? []).map((value) => value.value.toLowerCase()));
	return values.has("false") && values.has("true");
}

function getParameterValue(parameter: ModelParameterDefinition | undefined, lowerValue: string): string | null {
	const value = parameter?.values.find((candidate) => candidate.value.toLowerCase() === lowerValue);
	return value?.value ?? null;
}

function getPreferredParameterValue(
	parameter: ModelParameterDefinition | undefined,
	lowerValues: string[],
): string | null {
	for (const value of lowerValues) {
		const candidate = getParameterValue(parameter, value);
		if (candidate) return candidate;
	}
	return null;
}

function mapComparableLevel(
	parameter: ModelParameterDefinition | undefined,
	level: Exclude<ModelThinkingLevel, "off">,
): string | null {
	if (level === "xhigh") {
		return getPreferredParameterValue(parameter, ["xhigh", "extra-high"]);
	}
	return getParameterValue(parameter, level);
}

const EFFORT_PARAMETER_IDS: readonly CursorEffortParameterId[] = ["effort", "reasoning_effort", "reasoning"];

function resolveThinkingMapping(parametersById: ReadonlyMap<string, ModelParameterDefinition>): CursorThinkingControl | undefined {
	const thinkingParameter = parametersById.get("thinking");
	const paramId = EFFORT_PARAMETER_IDS.find((id) => parametersById.has(id));
	if (!paramId) {
		if (!thinkingParameter || !hasBooleanValues(thinkingParameter)) return undefined;
		const thinkingLevelMap: ThinkingLevelMap = {
			off: getParameterValue(thinkingParameter, "false"),
			minimal: null,
			low: null,
			medium: null,
			high: getParameterValue(thinkingParameter, "true"),
			xhigh: null,
			max: null,
		};
		return Object.values(thinkingLevelMap).every((value) => value === null)
			? undefined
			: { kind: "boolean", thinkingLevelMap };
	}

	const valueParameter = parametersById.get(paramId)!;
	const valueOff = getPreferredParameterValue(valueParameter, ["none", "off"]);
	const thinkingOff = valueOff === null ? getParameterValue(thinkingParameter, "false") : null;
	const offMode: CursorThinkingOffMode =
		valueOff !== null
			? { kind: "same-param", value: valueOff }
			: thinkingOff !== null
				? { kind: "disable-thinking", falseValue: thinkingOff }
				: { kind: "unsupported" };
	const thinkingLevelMap: ThinkingLevelMap = {
		off: valueOff ?? thinkingOff,
		minimal: mapComparableLevel(valueParameter, "minimal"),
		low: mapComparableLevel(valueParameter, "low"),
		medium: mapComparableLevel(valueParameter, "medium"),
		high: mapComparableLevel(valueParameter, "high"),
		xhigh: mapComparableLevel(valueParameter, "xhigh"),
		max: mapComparableLevel(valueParameter, "max"),
	};
	if (Object.values(thinkingLevelMap).every((value) => value === null)) return undefined;

	const companionThinkingTrueValue = getParameterValue(thinkingParameter, "true") ?? undefined;
	return {
		kind: "level",
		paramId,
		thinkingLevelMap,
		offMode,
		...(companionThinkingTrueValue ? { companionThinkingTrueValue } : {}),
	};
}

function parseContextWindow(value: string): number | undefined {
	const match = /^(\d+(?:\.\d+)?)([km])$/i.exec(value.trim());
	if (!match) return undefined;
	const amount = Number(match[1]);
	const unit = match[2]?.toLowerCase();
	if (!Number.isFinite(amount)) return undefined;
	return Math.round(amount * (unit === "m" ? 1000000 : 1000));
}

function getDefaultParams(item: ModelListItem): ModelParameterValue[] {
	if (!item.variants?.length) return [];
	const defaultVariant = item.variants.find((variant) => variant.isDefault) ?? item.variants[0];
	return cloneParams(defaultVariant?.params ?? []);
}

function getParamValue(params: ModelParameterValue[], id: string): string | undefined {
	return params.find((param) => param.id === id)?.value;
}

function getContextWindow(
	contextWindowCache: Map<string, number>,
	modelId: string,
	defaultContext: string | undefined,
	contextWindowKey: string,
): number {
	return (
		contextWindowCache.get(modelId) ??
		contextWindowCache.get(contextWindowKey) ??
		(defaultContext ? parseContextWindow(defaultContext) : undefined) ??
		contextWindowCache.get("default") ??
		FALLBACK_CONTEXT_WINDOW
	);
}

function toMetadata(
	item: ModelListItem,
	defaultParams: ModelParameterValue[],
	defaultContext: string | undefined,
	contextWindowCache: Map<string, number>,
	contextWindowKey: string,
): CursorModelMetadata {
	const parametersById = indexParameters(item);
	const thinking = resolveThinkingMapping(parametersById);
	const fastValue = getParamValue(defaultParams, "fast")?.toLowerCase();
	return {
		piModelId: item.id,
		displayName: item.displayName || item.id,
		defaultParams: cloneParams(defaultParams),
		contextWindow: getContextWindow(contextWindowCache, item.id, defaultContext, contextWindowKey),
		supportsFast: parametersById.has("fast"),
		defaultFast: fastValue === "true",
		...(thinking ? { thinking } : {}),
	};
}

function toModelConfig(metadata: CursorModelMetadata, name: string): CursorProviderModelConfig {
	return {
		id: metadata.piModelId,
		name,
		reasoning: metadata.thinking !== undefined,
		...(metadata.thinking ? { thinkingLevelMap: metadata.thinking.thinkingLevelMap } : {}),
		input: [...TEXT_AND_IMAGE_INPUT],
		cost: { ...ZERO_COST },
		contextWindow: metadata.contextWindow,
		maxTokens: FALLBACK_MAX_TOKENS,
	};
}

function registerModelItems(items: ModelListItem[]): CursorProviderModelConfig[] {
	metadataByPiModelId.clear();
	const contextWindowCache = loadContextWindowCache();
	return getCursorModelSelectionIdentities(items).map(({ model: item, piModelId, defaultContext, contextWindowKey }) => {
		const metadata = toMetadata(
			item,
			getDefaultParams(item),
			defaultContext,
			contextWindowCache,
			contextWindowKey,
		);
		metadataByPiModelId.set(piModelId, metadata);
		return toModelConfig(metadata, metadata.displayName);
	});
}

export function getCursorModelMetadata(modelId: string): CursorModelMetadata | undefined {
	return metadataByPiModelId.get(modelId);
}

function cloneThinkingControl(thinking: CursorThinkingControl): CursorThinkingControl {
	return thinking.kind === "boolean"
		? { kind: "boolean", thinkingLevelMap: { ...thinking.thinkingLevelMap } }
		: { ...thinking, thinkingLevelMap: { ...thinking.thinkingLevelMap }, offMode: { ...thinking.offMode } };
}

export function getCursorModelMetadataEntries(): CursorModelMetadata[] {
	return [...metadataByPiModelId.values()].map((metadata) => ({
		...metadata,
		defaultParams: cloneParams(metadata.defaultParams),
		...(metadata.thinking ? { thinking: cloneThinkingControl(metadata.thinking) } : {}),
	}));
}

function setParam(params: ModelParameterValue[], id: string, value: string): void {
	const existing = params.find((param) => param.id === id);
	if (existing) {
		existing.value = value;
	} else {
		params.push({ id, value });
	}
}

function deleteParam(params: ModelParameterValue[], id: string): void {
	const index = params.findIndex((param) => param.id === id);
	if (index >= 0) params.splice(index, 1);
}

function applyThinkingLevel(metadata: CursorModelMetadata, params: ModelParameterValue[], level: ModelThinkingLevel): void {
	const { thinking } = metadata;
	const mapped = thinking?.thinkingLevelMap[level];
	if (!thinking || mapped === undefined || mapped === null) return;
	if (thinking.kind === "boolean") {
		setParam(params, "thinking", mapped);
		return;
	}
	if (level === "off") {
		switch (thinking.offMode.kind) {
			case "unsupported": return;
			case "same-param": setParam(params, thinking.paramId, thinking.offMode.value); return;
			case "disable-thinking":
				setParam(params, "thinking", thinking.offMode.falseValue);
				deleteParam(params, thinking.paramId);
				return;
		}
	}
	if (thinking.companionThinkingTrueValue) setParam(params, "thinking", thinking.companionThinkingTrueValue);
	setParam(params, thinking.paramId, mapped);
}

export function buildCursorModelSelection(
	modelId: string,
	thinkingLevel: ModelThinkingLevel,
	fastEnabled?: boolean,
): ModelSelection {
	const metadata = getCursorModelMetadata(modelId);
	if (!metadata) return { id: modelId };

	const params = cloneParams(metadata.defaultParams);
	applyThinkingLevel(metadata, params, thinkingLevel);

	if (metadata.supportsFast && fastEnabled !== undefined) {
		setParam(params, "fast", fastEnabled ? "true" : "false");
	}

	return params.length > 0 ? { id: metadata.piModelId, params } : { id: metadata.piModelId };
}

function sanitizeDiscoveryError(error: unknown, apiKey: string): string | undefined {
	const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
	return scrubSensitiveText(message, apiKey).trim() || undefined;
}

async function useFallbackModels(options: DiscoverModelsOptions, issue: CursorModelFallbackIssue): Promise<CursorProviderModelConfig[]> {
	options.onFallback?.(issue);
	const { FALLBACK_MODEL_ITEMS } = await import("./fallback-models.generated.js");
	return registerModelItems(FALLBACK_MODEL_ITEMS);
}

export async function discoverModels(options: DiscoverModelsOptions = {}): Promise<CursorProviderModelConfig[]> {
	const apiKey = await getDiscoveryApiKey(options.apiKey);
	if (!apiKey) {
		return useFallbackModels(options, {
			reason: "missing-api-key",
			message: `Cursor model discovery needs an API key from ${AUTH_SETUP_HINT}. Using fallback Cursor models so /login and model selection still work; fallback models can run once auth exists. ${CATALOG_REFRESH_HINT}`,
		});
	}

	const keyFingerprint = fingerprintApiKey(apiKey);
	const cachedCatalog = loadCachedModelCatalog(keyFingerprint);

	if (!options.forceRefresh && cachedCatalog?.freshness === "fresh" && cachedCatalog.models.length > 0) {
		return registerModelItems(cachedCatalog.models);
	}

	try {
		const { Cursor } = await loadCursorSdk();
		const listed = await Cursor.models.list({ apiKey });
		if (!Array.isArray(listed) || listed.length === 0) {
			return useFallbackModels(options, {
				reason: "empty-model-list",
				message: `Cursor model discovery returned no models. Using fallback Cursor models; verify ${AUTH_SETUP_HINT}. ${CATALOG_REFRESH_HINT}`,
			});
		}
		const models = projectCursorModelCatalog(listed);
		if (!models) {
			throw new Error("Cursor model catalog could not be projected");
		}
		saveModelListCache(keyFingerprint, models);
		return registerModelItems(models);
	} catch (error) {
		const errorMessage = sanitizeDiscoveryError(error, apiKey);
		// Prefer a previously cached catalog over the generic bundled fallback when
		// a live refresh fails (e.g. transient network/auth errors), but keep the
		// provenance visible so refresh commands do not claim a live refresh worked.
		if (cachedCatalog && cachedCatalog.models.length > 0) {
			options.onFallback?.({
				reason: "cached-after-error",
				message: `Cursor model discovery failed; using cached Cursor model catalog from ${new Date(cachedCatalog.fetchedAt).toISOString()}.${errorMessage ? ` ${errorMessage}` : ""}`,
				...(errorMessage ? { errorMessage } : {}),
			});
			return registerModelItems(cachedCatalog.models);
		}
		return useFallbackModels(options, {
			reason: "discovery-failed",
			message: `Cursor model discovery failed${errorMessage ? `: ${errorMessage}` : ""}. Using fallback Cursor models; verify ${AUTH_SETUP_HINT}. ${CATALOG_REFRESH_HINT}`,
			...(errorMessage ? { errorMessage } : {}),
		});
	}
}

export const __testUtils = {
	parseContextWindow,
	registerModelItems,
	normalizeApiKey: resolveCursorApiKey,
};
