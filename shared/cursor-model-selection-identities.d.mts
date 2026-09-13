import type { ModelListItem } from "@cursor/sdk";

export interface CursorModelSelectionIdentity {
	model: ModelListItem;
	piModelId: string;
	defaultContext?: string;
	contextWindowKey: string;
}

export declare function getCursorModelSelectionIdentities(
	models: readonly ModelListItem[],
): CursorModelSelectionIdentity[];

export declare function normalizeCursorContextWindowEntries(
	models: readonly ModelListItem[],
	entries: ReadonlyMap<string, number>,
	source?: string,
): Map<string, number>;
