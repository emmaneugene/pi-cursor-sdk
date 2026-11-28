import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	loadCursorSdkUserConfig,
	resolveCursorSdkConfig,
	type CursorCliConfigInputs,
	type CursorResolvedSdkConfig,
} from "./config.js";
import { getResolvedSessionCursorHttp1Enabled } from "./http1.js";

export type CursorRuntimeStateExtensionApi = Pick<ExtensionAPI, "getFlag" | "registerFlag">;

type CursorCliLocalConfig = Omit<CursorCliConfigInputs, "force">;

interface CursorCliConfigSnapshot {
	config: CursorCliLocalConfig;
	localForce: boolean;
}

let cliCursorSnapshot: CursorCliConfigSnapshot = { config: {}, localForce: false };
let cliLocalForceConsumed = false;

export function getCursorCliConfig(): CursorCliLocalConfig {
	return { ...cliCursorSnapshot.config };
}

export function resolveEffectiveCursorConfig(): CursorResolvedSdkConfig {
	const http1Enabled = getResolvedSessionCursorHttp1Enabled();
	return resolveCursorSdkConfig({
		cli: {
			autoReview: cliCursorSnapshot.config.autoReview,
			sandbox: cliCursorSnapshot.config.sandbox,
			force: cliCursorSnapshot.localForce ? true : undefined,
		},
		sessionTransport: http1Enabled === undefined ? undefined : (http1Enabled ? "http1" : "default"),
		user: loadCursorSdkUserConfig(),
	});
}

export function formatCursorStatus(
	fast: boolean | undefined,
	mode: "agent" | "plan" | "invalid",
	transport: "default" | "http1" = "default",
): string {
	const parts = ["cursor", fast === true ? "fast:on" : fast === false ? "fast:off" : "fast:n/a"];
	if (transport === "http1") parts.push("http1");
	if (mode === "invalid") parts.push("mode invalid");
	else if (mode === "plan") parts.push("plan");
	return parts.join(" · ");
}

export function consumeCursorLocalForceOverride(resolved: { value: boolean; source: string }): boolean {
	if (!resolved.value || resolved.source !== "cli" || cliLocalForceConsumed) return false;
	cliCursorSnapshot.localForce = false;
	cliLocalForceConsumed = true;
	return true;
}

export function restoreCursorCliState(pi: Pick<ExtensionAPI, "getFlag">): void {
	cliCursorSnapshot = {
		config: {
			...(pi.getFlag("cursor-auto-review") === true ? { autoReview: true } : {}),
			...(pi.getFlag("cursor-sandbox") === true ? { sandbox: true } : {}),
		},
		localForce: !cliLocalForceConsumed && pi.getFlag("cursor-local-force") === true,
	};
}

export function registerCursorLocalRuntimeFlags(pi: Pick<ExtensionAPI, "registerFlag">): void {
	pi.registerFlag("cursor-auto-review", {
		description: "Enable Cursor SDK local Auto-review for this run.",
		type: "boolean",
		default: false,
	});
	pi.registerFlag("cursor-sandbox", {
		description: "Enable Cursor SDK local sandboxing for this run.",
		type: "boolean",
		default: false,
	});
	pi.registerFlag("cursor-local-force", {
		description: "Force-expire a stuck local Cursor SDK run before sending this run.",
		type: "boolean",
		default: false,
	});
}

export function resetCursorRuntimeStateForTests(): void {
	cliCursorSnapshot = { config: {}, localForce: false };
	cliLocalForceConsumed = false;
}
