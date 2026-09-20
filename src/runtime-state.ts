import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
	loadCursorSdkConfig,
	resolveCursorSdkConfig,
	type CursorExplicitSdkConfig,
	type CursorResolvedSdkConfig,
	type CursorResolvedSetting,
	type CursorSdkConfig,
} from "./config.js";
import { getResolvedSessionCursorHttp1Enabled } from "./http1.js";

export type CursorRuntimeStateExtensionApi = Pick<ExtensionAPI, "getFlag" | "registerFlag">;

type CursorRuntimeContext = Pick<ExtensionContext, "cwd">;

interface CursorCliConfigSnapshot {
	config: CursorExplicitSdkConfig;
	localForce: boolean;
}

let cliCursorSnapshot: CursorCliConfigSnapshot = { config: {}, localForce: false };
let cliLocalForceConsumed = false;

export function getCursorCliConfig(): CursorExplicitSdkConfig {
	return structuredClone(cliCursorSnapshot.config);
}

export function getCursorSessionConfig(): CursorSdkConfig {
	const http1Enabled = getResolvedSessionCursorHttp1Enabled();
	return http1Enabled === undefined
		? {}
		: { local: { transport: http1Enabled ? "http1" : "default" } };
}

export function resolveEffectiveCursorConfig(): CursorResolvedSdkConfig {
	const loadedConfig = loadCursorSdkConfig();
	return resolveCursorSdkConfig({
		cli: getCursorCliConfig(),
		cliForce: cliCursorSnapshot.localForce,
		session: getCursorSessionConfig(),
		user: loadedConfig.user,
	});
}

export function resolveEffectiveCursorConfigForContext(_ctx: CursorRuntimeContext): CursorResolvedSdkConfig {
	return resolveEffectiveCursorConfig();
}

export type CursorRuntimeResolution =
	| { kind: "valid"; transport: CursorResolvedSetting<"default" | "http1"> }
	| { kind: "invalid"; message: string };

export function resolveCursorStatusRuntime(ctx: CursorRuntimeContext): CursorRuntimeResolution {
	try {
		const config = resolveEffectiveCursorConfigForContext(ctx);
		return { kind: "valid", transport: config.local.transport };
	} catch (error) {
		return { kind: "invalid", message: error instanceof Error ? error.message : String(error) };
	}
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
	const local: NonNullable<CursorExplicitSdkConfig["local"]> = {
		...(pi.getFlag("cursor-auto-review") === true ? { autoReview: true } : {}),
		...(pi.getFlag("cursor-sandbox") === true ? { sandbox: true } : {}),
		...(pi.getFlag("cursor-no-local-resume") === true
			? { resume: false }
			: pi.getFlag("cursor-local-resume") === true
				? { resume: true }
				: {}),
	};
	cliCursorSnapshot = {
		config: Object.keys(local).length ? { local } : {},
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
	pi.registerFlag("cursor-local-resume", {
		description: "Resume recorded local Cursor SDK agents for matching pi session branches.",
		type: "boolean",
		default: false,
	});
	pi.registerFlag("cursor-no-local-resume", {
		description: "Disable local Cursor SDK agent resume for this run.",
		type: "boolean",
		default: false,
	});
}

export function resetCursorRuntimeStateForTests(): void {
	cliCursorSnapshot = { config: {}, localForce: false };
	cliLocalForceConsumed = false;
}
