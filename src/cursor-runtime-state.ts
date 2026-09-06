import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
	CURSOR_AUTO_REVIEW_ENV,
	CURSOR_LOCAL_FORCE_ENV,
	CURSOR_LOCAL_RESUME_ENV,
	CURSOR_SANDBOX_ENV,
	loadCursorSdkConfig,
	resolveCursorSdkConfig,
	type CursorExplicitSdkConfig,
	type CursorResolvedSdkConfig,
	type CursorResolvedSetting,
	type CursorSdkConfig,
} from "./cursor-config.js";
import { getResolvedSessionCursorHttp1Enabled } from "./cursor-http1.js";
import { getCursorSessionCwd, getCursorSessionProjectTrusted } from "./cursor-session-scope.js";

export type CursorRuntimeStateExtensionApi = Pick<ExtensionAPI, "getFlag" | "registerFlag">;

type CursorRuntimeContext = Pick<ExtensionContext, "cwd">;

interface CursorCliConfigSnapshot {
	config: CursorExplicitSdkConfig;
}

let cliCursorSnapshot: CursorCliConfigSnapshot = { config: {} };
let cliLocalForceConsumed = false;
let envLocalForceConsumed = false;

export function getCursorCliConfig(): CursorExplicitSdkConfig {
	return structuredClone(cliCursorSnapshot.config);
}

export function getCursorSessionConfig(): CursorSdkConfig {
	const useHttp1ForAgent = getResolvedSessionCursorHttp1Enabled();
	return {
		...(useHttp1ForAgent === undefined ? {} : { local: { useHttp1ForAgent } }),
	};
}

export function resolveEffectiveCursorConfig(options: {
	cwd: string;
	projectTrusted?: boolean;
}): CursorResolvedSdkConfig {
	const loadedConfig = loadCursorSdkConfig({ cwd: options.cwd, projectTrusted: options.projectTrusted === true });
	return resolveCursorSdkConfig({
		cli: getCursorCliConfig(),
		session: getCursorSessionConfig(),
		user: loadedConfig.user,
		project: loadedConfig.project,
	});
}

export function resolveEffectiveCursorConfigForContext(ctx: CursorRuntimeContext): CursorResolvedSdkConfig {
	return resolveEffectiveCursorConfig({
		cwd: ctx.cwd,
		projectTrusted: getCursorSessionCwd() === ctx.cwd && getCursorSessionProjectTrusted(),
	});
}

export type CursorRuntimeResolution =
	| {
			kind: "valid";
			useHttp1ForAgent: CursorResolvedSetting<boolean>;
		}
	| { kind: "invalid"; message: string };

export function resolveCursorStatusRuntime(ctx: CursorRuntimeContext): CursorRuntimeResolution {
	try {
		const config = resolveEffectiveCursorConfigForContext(ctx);
		return {
			kind: "valid",
			useHttp1ForAgent: config.local.useHttp1ForAgent,
		};
	} catch (error) {
		return { kind: "invalid", message: error instanceof Error ? error.message : String(error) };
	}
}

export function formatCursorStatus(
	fast: boolean | undefined,
	mode: "agent" | "plan" | "invalid",
	useHttp1ForAgent = false,
): string {
	const parts = ["cursor", fast === true ? "fast:on" : fast === false ? "fast:off" : "fast:n/a"];
	if (useHttp1ForAgent) parts.push("http1");
	if (mode === "invalid") parts.push("mode invalid");
	else if (mode === "plan") parts.push("plan");
	return parts.join(" · ");
}

export function consumeCursorLocalForceOverride(resolved: { value: boolean; source: string }): boolean {
	if (!resolved.value) return false;
	if (resolved.source === "cli" && !cliLocalForceConsumed) {
		if (cliCursorSnapshot.config.local) {
			const { force: _, ...local } = cliCursorSnapshot.config.local;
			cliCursorSnapshot.config.local = local;
		}
		cliLocalForceConsumed = true;
		return true;
	}
	if (resolved.source === "environment" && !envLocalForceConsumed) {
		envLocalForceConsumed = true;
		return true;
	}
	return false;
}

export function restoreCursorCliState(pi: Pick<ExtensionAPI, "getFlag">): void {
	const local: NonNullable<CursorExplicitSdkConfig["local"]> = {
		...(pi.getFlag("cursor-auto-review") === true ? { autoReview: true } : {}),
		...(pi.getFlag("cursor-sandbox") === true ? { sandboxOptions: { enabled: true } } : {}),
		...(!cliLocalForceConsumed && pi.getFlag("cursor-local-force") === true ? { force: true } : {}),
		...(pi.getFlag("cursor-no-local-resume") === true
			? { resume: false }
			: pi.getFlag("cursor-local-resume") === true
				? { resume: true }
				: {}),
	};
	cliCursorSnapshot = {
		config: {
			...(Object.keys(local).length ? { local } : {}),
		},
	};
}

export function registerCursorLocalRuntimeFlags(pi: Pick<ExtensionAPI, "registerFlag">): void {
	pi.registerFlag("cursor-auto-review", {
		description: `Enable Cursor SDK local Auto-review for this run (or set ${CURSOR_AUTO_REVIEW_ENV}=1)`,
		type: "boolean",
		default: false,
	});
	pi.registerFlag("cursor-sandbox", {
		description: `Enable Cursor SDK local sandboxing for this run (or set ${CURSOR_SANDBOX_ENV}=1)`,
		type: "boolean",
		default: false,
	});
	pi.registerFlag("cursor-local-force", {
		description: `Force-expire a stuck local Cursor SDK run before sending this run (or set ${CURSOR_LOCAL_FORCE_ENV}=1)`,
		type: "boolean",
		default: false,
	});
	pi.registerFlag("cursor-local-resume", {
		description: `Resume recorded local Cursor SDK agents for matching pi session branches (default; or set ${CURSOR_LOCAL_RESUME_ENV}=1)`,
		type: "boolean",
		default: false,
	});
	pi.registerFlag("cursor-no-local-resume", {
		description: `Disable local Cursor SDK agent resume for this run (or set ${CURSOR_LOCAL_RESUME_ENV}=0)`,
		type: "boolean",
		default: false,
	});
}

export function resetCursorRuntimeStateForTests(): void {
	cliCursorSnapshot = { config: {} };
	cliLocalForceConsumed = false;
	envLocalForceConsumed = false;
}
