import { describe, expect, it } from "vitest";
import {
	DEFAULT_CURSOR_SETTING_SOURCES,
	cursorSettingSourcesIncludes,
	getEffectiveCursorSettingSources,
	resolveCursorSettingSources,
} from "../src/setting-sources.js";

describe("resolveCursorSettingSources", () => {
	it("defaults to all Cursor setting sources when unset", () => {
		expect(DEFAULT_CURSOR_SETTING_SOURCES).toEqual(["all"]);
		expect(resolveCursorSettingSources(undefined)).toEqual(DEFAULT_CURSOR_SETTING_SOURCES);
		expect(resolveCursorSettingSources("")).toEqual(DEFAULT_CURSOR_SETTING_SOURCES);
	});

	it("maps disable aliases to an empty list", () => {
		for (const raw of ["none", "0", "false", "off", "omit", "disabled"]) {
			expect(resolveCursorSettingSources(raw)).toEqual([]);
		}
	});

	it("maps enable aliases to all", () => {
		for (const raw of ["all", "1", "true", "on"]) {
			expect(resolveCursorSettingSources(raw)).toEqual(["all"]);
		}
	});

	it("parses comma-separated lists", () => {
		expect(resolveCursorSettingSources("project,user")).toEqual(["project", "user"]);
	});

	it("treats comma-only and blank-list input as disabled", () => {
		for (const raw of [",", ",,", "  ,  ,  "]) {
			expect(resolveCursorSettingSources(raw)).toEqual([]);
		}
	});
});

describe("cursorSettingSourcesIncludes", () => {
	it("loads user rules only when user or all is enabled", () => {
		expect(cursorSettingSourcesIncludes(["all"], "user")).toBe(true);
		expect(cursorSettingSourcesIncludes(["user"], "user")).toBe(true);
		expect(cursorSettingSourcesIncludes(["project"], "user")).toBe(false);
		expect(cursorSettingSourcesIncludes(undefined, "user")).toBe(false);
	});

	it("loads project rules only when project or all is enabled", () => {
		expect(cursorSettingSourcesIncludes(["all"], "project")).toBe(true);
		expect(cursorSettingSourcesIncludes(["project"], "project")).toBe(true);
		expect(cursorSettingSourcesIncludes(["user"], "project")).toBe(false);
		expect(cursorSettingSourcesIncludes(["plugins"], "project")).toBe(false);
	});
});

describe("getEffectiveCursorSettingSources", () => {
	it("reads user config and defaults to all", () => {
		expect(getEffectiveCursorSettingSources({})).toEqual(["all"]);
		expect(getEffectiveCursorSettingSources({ local: { settingSources: ["plugins"] } })).toEqual(["plugins"]);
		expect(getEffectiveCursorSettingSources({ local: { settingSources: [] } })).toEqual([]);
	});
});
