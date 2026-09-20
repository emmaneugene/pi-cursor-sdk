import type { SettingSource } from "@cursor/sdk";
import { loadCursorSdkUserConfig, type CursorSdkConfig } from "./config.js";

export const DEFAULT_CURSOR_SETTING_SOURCES = ["all"] as const satisfies readonly SettingSource[];

export function resolveCursorSettingSources(raw?: string): SettingSource[] {
	const trimmed = raw?.trim();
	if (!trimmed) return [...DEFAULT_CURSOR_SETTING_SOURCES];
	const normalized = trimmed.toLowerCase();
	if (["0", "false", "off", "none", "omit", "disabled"].includes(normalized)) return [];
	if (["1", "true", "on", "all"].includes(normalized)) return ["all"];
	return trimmed.split(",").map((entry) => entry.trim()).filter(Boolean) as SettingSource[];
}

export function getEffectiveCursorSettingSources(config: CursorSdkConfig = loadCursorSdkUserConfig()): SettingSource[] {
	const configured = config.local?.settingSources;
	return configured === undefined ? [...DEFAULT_CURSOR_SETTING_SOURCES] : [...configured] as SettingSource[];
}

export function cursorSettingSourcesIncludes(
	settingSources: SettingSource[] | undefined,
	source: Extract<SettingSource, "user" | "project">,
): boolean {
	if (!settingSources?.length) return false;
	return settingSources.includes("all") || settingSources.includes(source);
}
