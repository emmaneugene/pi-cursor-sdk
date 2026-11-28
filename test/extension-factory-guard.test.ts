import { beforeEach, describe, expect, it } from "vitest";
import type { ExtensionHandler, SessionShutdownEvent } from "@earendil-works/pi-coding-agent";
import {
	claimCursorExtensionFactory,
	registerCursorExtensionFactoryRelease,
	releaseCursorExtensionFactory,
	setCursorExtensionOwnerModels,
	__testUtils,
} from "../src/extension-factory-guard.js";
import { makeProviderModelConfig } from "./helpers/pi-harness.js";

function createShutdownHarness() {
	const shutdownHandlers: Array<ExtensionHandler<SessionShutdownEvent>> = [];
	return {
		pi: {
			on: (event: "session_shutdown", handler: ExtensionHandler<SessionShutdownEvent>) => {
				expect(event).toBe("session_shutdown");
				shutdownHandlers.push(handler);
			},
		},
		async shutdown(reason: SessionShutdownEvent["reason"]): Promise<void> {
			for (const handler of shutdownHandlers) {
				await handler({ type: "session_shutdown", reason }, {} as never);
			}
		},
	};
}

function expectOwnerClaim() {
	const claim = claimCursorExtensionFactory();
	expect(claim.kind).toBe("owner");
	if (claim.kind !== "owner") throw new Error("expected owner claim");
	return claim;
}

describe("cursor extension factory guard", () => {
	beforeEach(() => __testUtils.reset());

	it("transitions unowned -> initializing -> ready and exposes active models to nested claims", () => {
		const initialModels = [makeProviderModelConfig("composer-2")];
		const refreshedModels = [makeProviderModelConfig("grok-4.6")];
		const owner = expectOwnerClaim();
		expect(__testUtils.isInstalled()).toBe(true);
		expect(claimCursorExtensionFactory()).toEqual({ kind: "nested-initializing" });

		expect(setCursorExtensionOwnerModels(owner.token, initialModels)).toBe(true);
		expect(claimCursorExtensionFactory()).toEqual({ kind: "nested", models: initialModels });

		expect(setCursorExtensionOwnerModels(owner.token, refreshedModels)).toBe(true);
		expect(claimCursorExtensionFactory()).toEqual({ kind: "nested", models: refreshedModels });

		releaseCursorExtensionFactory(owner.token);
		expect(__testUtils.isInstalled()).toBe(false);
		expectOwnerClaim();
		expect(claimCursorExtensionFactory()).toEqual({ kind: "nested-initializing" });
	});

	it.each(["new", "resume", "fork", "reload", "quit"] as const)("releases ownership and clears models when the owner runtime shuts down for %s", async (reason) => {
		const harness = createShutdownHarness();
		const owner = expectOwnerClaim();
		setCursorExtensionOwnerModels(owner.token, [makeProviderModelConfig("composer-2")]);
		registerCursorExtensionFactoryRelease(harness.pi, owner);

		await harness.shutdown(reason);

		expect(__testUtils.isInstalled()).toBe(false);
		expectOwnerClaim();
		expect(claimCursorExtensionFactory()).toEqual({ kind: "nested-initializing" });
	});

	it("does not let a stale owner release or update models after replacement", () => {
		const staleModels = [makeProviderModelConfig("stale-model")];
		const currentModels = [makeProviderModelConfig("current-model")];
		const staleOwner = expectOwnerClaim();
		releaseCursorExtensionFactory(staleOwner.token);

		const currentOwner = expectOwnerClaim();
		expect(setCursorExtensionOwnerModels(currentOwner.token, currentModels)).toBe(true);
		expect(setCursorExtensionOwnerModels(staleOwner.token, staleModels)).toBe(false);
		expect(claimCursorExtensionFactory()).toEqual({ kind: "nested", models: currentModels });

		releaseCursorExtensionFactory(staleOwner.token);
		expect(__testUtils.isInstalled()).toBe(true);
		releaseCursorExtensionFactory(currentOwner.token);
		expect(__testUtils.isInstalled()).toBe(false);
	});
});
