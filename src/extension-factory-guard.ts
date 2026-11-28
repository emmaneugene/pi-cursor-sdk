import type {
	ExtensionHandler,
	ProviderModelConfig,
	SessionShutdownEvent,
} from "@earendil-works/pi-coding-agent";

type CursorExtensionFactoryOwnerState =
	| { kind: "unowned" }
	| { kind: "initializing"; token: symbol }
	| { kind: "ready"; token: symbol; models: ProviderModelConfig[] };

export type CursorExtensionFactoryClaim =
	| { kind: "owner"; token: symbol }
	| { kind: "nested"; models: ProviderModelConfig[] }
	| { kind: "nested-initializing" };

export interface CursorExtensionFactoryGuardApi {
	on(event: "session_shutdown", handler: ExtensionHandler<SessionShutdownEvent>): void;
}

let ownerState: CursorExtensionFactoryOwnerState = { kind: "unowned" };

export function claimCursorExtensionFactory(): CursorExtensionFactoryClaim {
	if (ownerState.kind === "ready") return { kind: "nested", models: ownerState.models };
	if (ownerState.kind === "initializing") return { kind: "nested-initializing" };
	const token = Symbol("cursor-extension-factory-owner");
	ownerState = { kind: "initializing", token };
	return { kind: "owner", token };
}

export function setCursorExtensionOwnerModels(token: symbol, models: ProviderModelConfig[]): boolean {
	if (ownerState.kind === "unowned" || ownerState.token !== token) return false;
	ownerState = { kind: "ready", token, models };
	return true;
}

export function releaseCursorExtensionFactory(token: symbol): void {
	if (ownerState.kind !== "unowned" && ownerState.token === token) {
		ownerState = { kind: "unowned" };
	}
}

// Register last so ownership stays held until earlier shutdown handlers finish.
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
		return ownerState.kind !== "unowned";
	},
	reset(): void {
		ownerState = { kind: "unowned" };
	},
};
