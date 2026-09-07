import type { ExtensionHandler, SessionShutdownEvent } from "@earendil-works/pi-coding-agent";

/**
 * First factory invocation in this process owns Cursor's process-global
 * registrars (bridge, session scope, pooled SDK agent). Pi child sessions call
 * `createAgentSession` + `bindExtensions` in the same process, which re-invokes
 * this factory against a new ExtensionAPI while the parent Cursor run is still
 * live. A nested factory must not re-register.
 *
 * Ownership ends after the owner's shutdown handlers finish. Pi then reloads
 * the extension for `new`, `resume`, `fork`, and explicit reload operations.
 */
export type CursorExtensionFactoryClaim =
	| { kind: "owner"; token: symbol }
	| { kind: "nested" };

export interface CursorExtensionFactoryGuardApi {
	on(event: "session_shutdown", handler: ExtensionHandler<SessionShutdownEvent>): void;
}

let factoryOwnerToken: symbol | undefined;

export function claimCursorExtensionFactory(): CursorExtensionFactoryClaim {
	if (factoryOwnerToken) return { kind: "nested" };
	const token = Symbol("cursor-extension-factory-owner");
	factoryOwnerToken = token;
	return { kind: "owner", token };
}

export function releaseCursorExtensionFactory(token: symbol): void {
	if (factoryOwnerToken === token) {
		factoryOwnerToken = undefined;
	}
}

/**
 * Install the owner's release handler after all other factory registration
 * succeeds. The final handler keeps ownership until earlier shutdown cleanup
 * has finished.
 */
export function registerCursorExtensionFactoryRelease(
	pi: CursorExtensionFactoryGuardApi,
	claim: Extract<CursorExtensionFactoryClaim, { kind: "owner" }>,
): void {
	pi.on("session_shutdown", () => {
		releaseCursorExtensionFactory(claim.token);
	});
}

export const __testUtils = {
	isInstalled(): boolean {
		return factoryOwnerToken !== undefined;
	},
	reset(): void {
		factoryOwnerToken = undefined;
	},
};
