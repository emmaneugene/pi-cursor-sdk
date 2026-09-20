function asRecord(value) {
	return value && typeof value === "object" && !Array.isArray(value) ? value : undefined;
}

function parseParameterValues(value) {
	if (!Array.isArray(value)) return undefined;
	const values = [];
	for (const entry of value) {
		const record = asRecord(entry);
		if (!record || typeof record.value !== "string") return undefined;
		values.push({ value: record.value });
	}
	return values;
}

function parseParameters(value) {
	if (value === undefined) return undefined;
	if (!Array.isArray(value)) return null;
	const parameters = [];
	for (const entry of value) {
		const record = asRecord(entry);
		const values = parseParameterValues(record?.values);
		if (!record || typeof record.id !== "string" || !values) return null;
		parameters.push({ id: record.id, values });
	}
	return parameters;
}

function parseVariantParams(value) {
	if (!Array.isArray(value)) return undefined;
	const params = [];
	for (const entry of value) {
		const record = asRecord(entry);
		if (!record || typeof record.id !== "string" || typeof record.value !== "string") return undefined;
		params.push({ id: record.id, value: record.value });
	}
	return params;
}

function parseVariants(value) {
	if (value === undefined) return undefined;
	if (!Array.isArray(value)) return null;
	const variants = [];
	for (const entry of value) {
		const record = asRecord(entry);
		const params = parseVariantParams(record?.params);
		if (!record || !params || typeof record.displayName !== "string") return null;
		if (record.isDefault !== undefined && typeof record.isDefault !== "boolean") return null;
		variants.push({
			params,
			displayName: record.displayName,
			...(record.isDefault !== undefined ? { isDefault: record.isDefault } : {}),
		});
	}
	return variants;
}

/** Keep IDs, model/variant names, and parameter values. Drop aliases, descriptions, and display-name labels. */
export function parseCursorModelCatalogItem(value) {
	const record = asRecord(value);
	if (!record || typeof record.id !== "string") return undefined;
	if (record.displayName !== undefined && typeof record.displayName !== "string") return undefined;
	const displayName = typeof record.displayName === "string" ? record.displayName : record.id;
	const parameters = parseParameters(record.parameters);
	if (parameters === null) return undefined;
	const variants = parseVariants(record.variants);
	if (variants === null) return undefined;
	return {
		id: record.id,
		displayName,
		...(parameters ? { parameters } : {}),
		...(variants ? { variants } : {}),
	};
}

export function projectCursorModelCatalog(models) {
	if (!Array.isArray(models)) return undefined;
	const projected = [];
	for (const model of models) {
		const item = parseCursorModelCatalogItem(model);
		if (!item) return undefined;
		projected.push(item);
	}
	return projected;
}

function getDefaultParam(model, id) {
	const variant = (model.variants ?? []).find((candidate) => candidate.isDefault) ?? model.variants?.[0];
	return variant?.params?.find((param) => param.id === id)?.value;
}

function getContextWindowKey(modelId, defaultContext) {
	return defaultContext ? `${modelId}@${defaultContext}` : modelId;
}

export function getCursorModelSelectionIdentities(models) {
	return [...models]
		.sort((a, b) => a.id.localeCompare(b.id))
		.map((model) => {
			const defaultContext = getDefaultParam(model, "context");
			return {
				model,
				piModelId: model.id,
				...(defaultContext ? { defaultContext } : {}),
				contextWindowKey: getContextWindowKey(model.id, defaultContext),
			};
		});
}

export function normalizeCursorContextWindowEntries(models, entries, source = "context windows") {
	const canonicalByInputId = new Map();
	for (const { piModelId, contextWindowKey } of getCursorModelSelectionIdentities(models)) {
		canonicalByInputId.set(piModelId, piModelId);
		canonicalByInputId.set(contextWindowKey, piModelId);
	}

	const normalized = new Map();
	for (const [modelId, contextWindow] of entries) {
		const canonicalId = modelId === "default" ? modelId : canonicalByInputId.get(modelId);
		if (!canonicalId) continue;
		const existing = normalized.get(canonicalId);
		if (existing !== undefined && existing !== contextWindow) {
			throw new Error(`${source} assigns conflicting windows to canonical model ${canonicalId}: ${existing} and ${contextWindow}`);
		}
		normalized.set(canonicalId, contextWindow);
	}
	return normalized;
}
