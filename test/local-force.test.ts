import { beforeEach, describe, expect, it } from "vitest";
import {
	consumeCursorLocalForceOverride,
	getCursorCliConfig,
	resetCursorRuntimeStateForTests,
	resolveEffectiveCursorConfig,
	restoreCursorCliState,
} from "../src/runtime-state.js";

function flags(values: Record<string, boolean>) {
	return { getFlag: (name: string) => values[name] };
}

describe("Cursor local force consumption", () => {
	beforeEach(resetCursorRuntimeStateForTests);

	it("does not force local sends by default", () => {
		restoreCursorCliState(flags({}));
		expect(consumeCursorLocalForceOverride({ value: false, source: "builtin" })).toBe(false);
	});

	it("reports local.force source as builtin when unset, cli when armed, and builtin after consumption", () => {
		restoreCursorCliState(flags({}));
		expect(resolveEffectiveCursorConfig().local.force).toEqual({ value: false, source: "builtin" });

		restoreCursorCliState(flags({ "cursor-local-force": true }));
		const armed = resolveEffectiveCursorConfig().local.force;
		expect(armed).toEqual({ value: true, source: "cli" });

		expect(consumeCursorLocalForceOverride(armed)).toBe(true);
		expect(resolveEffectiveCursorConfig().local.force).toEqual({ value: false, source: "builtin" });
	});

	it("consumes CLI local force once", () => {
		restoreCursorCliState(flags({ "cursor-local-force": true }));
		expect(consumeCursorLocalForceOverride({ value: true, source: "cli" })).toBe(true);
		expect(consumeCursorLocalForceOverride({ value: true, source: "cli" })).toBe(false);
	});

	it("does not rearm consumed CLI force on state reload", () => {
		restoreCursorCliState(flags({ "cursor-local-force": true }));
		expect(consumeCursorLocalForceOverride({ value: true, source: "cli" })).toBe(true);
		restoreCursorCliState(flags({ "cursor-local-force": true }));
		expect(consumeCursorLocalForceOverride({ value: true, source: "cli" })).toBe(false);
	});

	it("keeps force outside the persisted CLI config schema", () => {
		restoreCursorCliState(flags({ "cursor-local-force": true, "cursor-sandbox": true }));
		expect(getCursorCliConfig()).toEqual({ sandbox: true });
	});
});
