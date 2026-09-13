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
