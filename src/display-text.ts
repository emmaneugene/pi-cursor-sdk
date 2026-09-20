import { asRecord } from "./record-utils.js";

const CURSOR_EDIT_DIFF_FIELD_ORDER = ["diffString", "diff", "unifiedDiff", "patch"] as const;

/** Canonical single-line sanitization and truncation for Cursor replay/trace display. */
export function sanitizeCursorDisplayLine(value: string): string {
	return value
		.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "�")
		.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function truncateCursorDisplayLine(value: string, maxLength = 240): string {
	if (maxLength <= 0) return "";
	const sanitized = sanitizeCursorDisplayLine(value);
	if (sanitized.length <= maxLength) return sanitized;
	if (maxLength === 1) return "…";
	return `${sanitized.slice(0, maxLength - 1).replace(/[\uD800-\uDBFF]$/, "")}…`;
}

export function resolveCursorEditDiff(source: unknown): string | undefined {
	const record = asRecord(source);
	if (!record) return undefined;
	for (const key of CURSOR_EDIT_DIFF_FIELD_ORDER) {
		const value = record[key];
		if (typeof value === "string" && value.length > 0) return value;
	}
	return undefined;
}
