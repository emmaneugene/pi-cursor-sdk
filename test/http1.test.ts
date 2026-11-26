import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CursorConfigureOptions } from "@cursor/sdk";
import type { CursorResolvedSetting } from "../src/config.js";
import {
	__testUtils,
	configureCursorSdkHttp1,
} from "../src/http1.js";

function setting(
	value: "default" | "http1",
	source: "user" | "session" | "builtin",
): CursorResolvedSetting<"default" | "http1"> {
	return { value, source };
}

function sdkWithConfigure(configure: (options: CursorConfigureOptions) => void) {
	return { Cursor: { configure } };
}

describe("Cursor SDK HTTP/1.1 configuration", () => {
	beforeEach(() => {
		__testUtils.reset();
	});

	it("matches the installed Cursor SDK configure and null-clear contract", () => {
		const sdkConfigTypes = readFileSync(
			join(process.cwd(), "node_modules/@cursor/sdk/dist/esm/sdk-config.d.ts"),
			"utf8",
		);
		expect(sdkConfigTypes).toContain("useHttp1ForAgent?: boolean | null");
		expect(sdkConfigTypes).toContain("Pass `null` to clear a previous default.");
		const sdkImplementation = readFileSync(
			join(process.cwd(), "node_modules/@cursor/sdk/dist/esm/index.js"),
			"utf8",
		);
		expect(sdkImplementation).toMatch(
			/void 0!==([A-Za-z_$][\w$]*)\.local&&"useHttp1ForAgent"in \1\.local/,
		);
		expect(sdkImplementation).toContain("await this.getExecutor()");
		const httpVersionSelection = sdkImplementation.indexOf(
			'httpVersion:(e=$,z(e)||((0,x.it)()??j())?"1.1":"2")',
		);
		expect(httpVersionSelection).toBeGreaterThan(-1);
		const cacheKeyStart = sdkImplementation.indexOf("workingDirectory:t.workingDirectory,dirs:t.dirs");
		const cacheKeyEnd = sdkImplementation.indexOf("JSON.stringify(Qr(r))", cacheKeyStart);
		expect(cacheKeyStart).toBeGreaterThan(-1);
		expect(cacheKeyEnd).toBeGreaterThan(cacheKeyStart);
		expect(sdkImplementation.slice(cacheKeyStart, cacheKeyEnd)).not.toContain("useHttp1ForAgent");
		expect(sdkImplementation).toContain(
			"r.refs-=1,!(r.refs>0||Hr.get(t)!==r)){Hr.delete(t)",
		);
	});

	it.each([
		["http1", "user", true],
		["default", "session", false],
	] as const)("configures explicit %s transport from %s", (value, source, enabled) => {
		const configure = vi.fn<(options: CursorConfigureOptions) => void>();

		expect(configureCursorSdkHttp1(sdkWithConfigure(configure), setting(value, source))).toBe(enabled);
		expect(configure).toHaveBeenCalledWith({
			local: { useHttp1ForAgent: enabled },
		});
	});

	it("does not configure the SDK when the setting is unset", () => {
		const configure = vi.fn<(options: CursorConfigureOptions) => void>();

		expect(configureCursorSdkHttp1(sdkWithConfigure(configure), setting("default", "builtin"))).toBeUndefined();
		expect(configure).not.toHaveBeenCalled();
	});

	it("uses the documented null clear after an extension-owned explicit value", () => {
		const configure = vi.fn<(options: CursorConfigureOptions) => void>();
		const sdk = sdkWithConfigure(configure);

		configureCursorSdkHttp1(sdk, setting("http1", "session"));
		expect(configureCursorSdkHttp1(sdk, setting("default", "builtin"))).toBeUndefined();
		expect(configure).toHaveBeenLastCalledWith({
			local: { useHttp1ForAgent: null },
		});
	});
});
