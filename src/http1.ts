import type { CursorSdkModule } from "./sdk-runtime.js";
import type { CursorResolvedSetting } from "./config.js";
import { asRecord } from "./record-utils.js";

export const CURSOR_HTTP1_ENTRY_TYPE = "cursor-http1-state";

export interface CursorHttp1EntryData {
	enabled: boolean;
}

type CursorHttp1Sdk = {
	Cursor: Pick<CursorSdkModule["Cursor"], "configure">;
};

let sessionCursorHttp1Enabled: boolean | undefined;
let globalPreferenceAuthoritative = false;
let configuredCursor: CursorHttp1Sdk["Cursor"] | undefined;

export function isCursorHttp1EntryData(value: unknown): value is CursorHttp1EntryData {
	return typeof asRecord(value)?.enabled === "boolean";
}

export function getStoredCursorHttp1Enabled(): boolean | undefined {
	return sessionCursorHttp1Enabled;
}

export function setStoredCursorHttp1Enabled(enabled: boolean | undefined): void {
	sessionCursorHttp1Enabled = enabled;
}

export function getResolvedSessionCursorHttp1Enabled(): boolean | undefined {
	return globalPreferenceAuthoritative ? undefined : sessionCursorHttp1Enabled;
}

export function setCursorHttp1GlobalPreferenceAuthoritative(authoritative: boolean): void {
	globalPreferenceAuthoritative = authoritative;
}

export function clearCursorSdkHttp1(): void {
	if (configuredCursor === undefined) return;
	configuredCursor.configure({ local: { useHttp1ForAgent: null } });
	configuredCursor = undefined;
}

export function configureCursorSdkHttp1(
	sdk: CursorHttp1Sdk,
	setting: CursorResolvedSetting<"default" | "http1">,
): boolean | undefined {
	if (setting.source !== "builtin") {
		const enabled = setting.value === "http1";
		sdk.Cursor.configure({ local: { useHttp1ForAgent: enabled } });
		configuredCursor = sdk.Cursor;
		return enabled;
	}
	if (configuredCursor === sdk.Cursor) clearCursorSdkHttp1();
	else configuredCursor = undefined;
	return undefined;
}

export const __testUtils = {
	reset(): void {
		sessionCursorHttp1Enabled = undefined;
		globalPreferenceAuthoritative = false;
		configuredCursor = undefined;
	},
};
