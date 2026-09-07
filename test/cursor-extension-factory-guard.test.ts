import { beforeEach, describe, expect, it } from "vitest";
import type { ExtensionHandler, SessionShutdownEvent } from "@earendil-works/pi-coding-agent";
import {
	claimCursorExtensionFactory,
	registerCursorExtensionFactoryRelease,
	releaseCursorExtensionFactory,
	__testUtils,
} from "../src/cursor-extension-factory-guard.js";

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

	it("gives the first claim ownership and treats later claims as nested", () => {
		const owner = expectOwnerClaim();
		expect(__testUtils.isInstalled()).toBe(true);
		expect(claimCursorExtensionFactory()).toEqual({ kind: "nested" });
		expect(claimCursorExtensionFactory()).toEqual({ kind: "nested" });
		releaseCursorExtensionFactory(owner.token);
		expect(__testUtils.isInstalled()).toBe(false);
		expectOwnerClaim();
	});

	it.each(["new", "resume", "fork", "reload", "quit"] as const)("releases ownership when the owner runtime shuts down for %s", async (reason) => {
		const harness = createShutdownHarness();
		const owner = expectOwnerClaim();
		registerCursorExtensionFactoryRelease(harness.pi, owner);

		await harness.shutdown(reason);

		expect(__testUtils.isInstalled()).toBe(false);
		expectOwnerClaim();
	});

	it("does not let a stale owner release a newer claim", () => {
		const staleOwner = expectOwnerClaim();
		releaseCursorExtensionFactory(staleOwner.token);
		const currentOwner = expectOwnerClaim();

		releaseCursorExtensionFactory(staleOwner.token);

		expect(__testUtils.isInstalled()).toBe(true);
		releaseCursorExtensionFactory(currentOwner.token);
		expect(__testUtils.isInstalled()).toBe(false);
	});
});
