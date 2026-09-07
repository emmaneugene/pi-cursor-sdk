import { randomUUID } from "node:crypto";
import type { ExtensionAPI, ProviderConfig, ProviderModelConfig } from "@earendil-works/pi-coding-agent";
import { discoverModels, type CursorModelFallbackIssue } from "./model-discovery.js";
import { registerCursorRuntimeControls } from "./cursor-state.js";
import { registerCursorNativeToolDisplay } from "./cursor-native-tool-display-registration.js";
import { registerCursorPiToolBridge, registerNestedCursorPiToolBridge } from "./cursor-pi-tool-bridge.js";
import { registerCursorQuestionTool } from "./cursor-question-tool.js";
import { registerCursorSkillTool } from "./cursor-skill-tool.js";
import { registerCursorSessionScope } from "./cursor-session-scope.js";
import { registerCursorSessionAgentLifecycle } from "./cursor-session-agent-lifecycle.js";
import { registerCursorSessionAgentLineage } from "./cursor-session-agent-lineage.js";
import { registerCursorSessionAgentResume } from "./cursor-session-agent-resume.js";
import { streamCursorLazy } from "./cursor-provider-lazy.js";
import { CURSOR_API_KEY_CONFIG_VALUE, resolveCursorApiKey } from "./cursor-api-key.js";
import { registerCursorFallbackIssueWarning } from "./cursor-fallback-warning.js";
import { registerCursorAgentsContextDedup } from "./cursor-agents-context-registration.js";
import { registerCursorOverflowNormalization } from "./cursor-provider-overflow.js";
import { registerCursorSdkSessionProcessErrorGuard } from "./cursor-sdk-process-error-guard.js";
import { prepareCursorSessionForCompaction } from "./cursor-session-compaction-prep.js";
import { disposeSessionCursorAgent } from "./cursor-session-agent.js";
import { getCursorSessionCwd, getCursorSessionProjectTrusted } from "./cursor-session-scope.js";
import type { CursorProviderRuntimeContext } from "./cursor-provider-runtime-context.js";
import {
	claimCursorExtensionFactory,
	registerCursorExtensionFactoryRelease,
	releaseCursorExtensionFactory,
} from "./cursor-extension-factory-guard.js";

type CursorExtensionApi =
	& Pick<ExtensionAPI, "registerProvider" | "registerCommand" | "on">
	& Parameters<typeof registerCursorSessionScope>[0]
	& Parameters<typeof registerCursorSessionAgentLifecycle>[0]
	& Parameters<typeof registerCursorSessionAgentLineage>[0]
	& Parameters<typeof registerCursorSessionAgentResume>[0]
	& Parameters<typeof registerCursorRuntimeControls>[0]
	& Parameters<typeof registerCursorNativeToolDisplay>[0]
	& Parameters<typeof registerCursorQuestionTool>[0]
	& Parameters<typeof registerCursorSkillTool>[0]
	& Parameters<typeof registerCursorPiToolBridge>[0]
	& Parameters<typeof registerCursorFallbackIssueWarning>[0]
	& Parameters<typeof registerCursorAgentsContextDedup>[0]
	& Parameters<typeof registerCursorOverflowNormalization>[0]
	& Parameters<typeof registerCursorSdkSessionProcessErrorGuard>[0]
	& Parameters<typeof registerCursorExtensionFactoryRelease>[0];

let activeCursorProviderModels: ProviderModelConfig[] | undefined;

function createCursorProviderConfig(
	models: ProviderModelConfig[],
	streamSimple: NonNullable<ProviderConfig["streamSimple"]> = streamCursorLazy,
): ProviderConfig {
	return {
		name: "Cursor",
		baseUrl: "https://cursor.com",
		apiKey: CURSOR_API_KEY_CONFIG_VALUE,
		api: "cursor-sdk",
		models,
		streamSimple,
	};
}

function registerCursorProvider(
	pi: Pick<ExtensionAPI, "registerProvider">,
	models: ProviderModelConfig[],
	streamSimple?: NonNullable<ProviderConfig["streamSimple"]>,
): void {
	pi.registerProvider("cursor", createCursorProviderConfig(models, streamSimple));
}

function registerNestedCursorProvider(pi: CursorExtensionApi, models: ProviderModelConfig[]): void {
	const bridge = registerNestedCursorPiToolBridge(pi);
	const nestedRuntimeId = randomUUID();
	let runtimeContext: CursorProviderRuntimeContext = {
		scopeKey: `__nested_cursor__:${nestedRuntimeId}`,
		cwd: getCursorSessionCwd(),
		sessionFile: undefined,
		projectTrusted: getCursorSessionProjectTrusted(),
		bridge,
		localResume: false,
		nativeToolReplay: false,
		disposeAgentAfterTurn: true,
	};
	pi.on("session_start", (_event, ctx) => {
		const sessionFile = ctx.sessionManager?.getSessionFile?.() ?? undefined;
		const sessionId = ctx.sessionManager?.getSessionId?.() ?? nestedRuntimeId;
		runtimeContext = {
			...runtimeContext,
			scopeKey: sessionFile ?? `__nested_cursor__:${sessionId}`,
			cwd: ctx.cwd,
			sessionFile,
			projectTrusted: ctx.isProjectTrusted?.() === true || runtimeContext.projectTrusted,
		};
	});
	pi.on("session_shutdown", async () => {
		await disposeSessionCursorAgent(runtimeContext.scopeKey);
	});
	registerCursorProvider(pi, models, (model, context, options) =>
		streamCursorLazy(model, context, options, runtimeContext));
}

export default async function (pi: CursorExtensionApi) {
	const factoryClaim = claimCursorExtensionFactory();
	if (factoryClaim.kind === "nested") {
		if (!activeCursorProviderModels) {
			throw new Error("Nested Cursor provider loaded before the owner model catalog was ready");
		}
		registerNestedCursorProvider(pi, activeCursorProviderModels);
		return;
	}

	try {
		// Discover first. A discovery failure must not leave process-global
		// registrars from a discarded extension load.
		let fallbackIssue: CursorModelFallbackIssue | undefined;
		const models = await discoverModels({
			onFallback: (issue) => {
				fallbackIssue = issue;
			},
		});
		activeCursorProviderModels = models;

		// Session cwd must register before other session_start listeners that depend on it.
		registerCursorSessionScope(pi);
		registerCursorSessionAgentLineage(pi);
		registerCursorSessionAgentLifecycle(pi);
		registerCursorSessionAgentResume(pi);
		pi.on("session_before_compact", async () => {
			await prepareCursorSessionForCompaction();
		});
		registerCursorRuntimeControls(pi);
		registerCursorNativeToolDisplay(pi);
		registerCursorQuestionTool(pi);
		registerCursorSkillTool(pi);
		registerCursorPiToolBridge(pi);
		registerCursorAgentsContextDedup(pi);
		registerCursorOverflowNormalization(pi);

		if (fallbackIssue) {
			registerCursorFallbackIssueWarning(pi, fallbackIssue);
		}

		pi.registerCommand("cursor-refresh-models", {
			description: "Refresh the live Cursor model catalog without restarting pi",
			handler: async (_args, ctx) => {
				let refreshFallbackIssue: CursorModelFallbackIssue | undefined;
				const apiKey = resolveCursorApiKey(await ctx.modelRegistry.getApiKeyForProvider("cursor"));
				const refreshedModels = await discoverModels({
					apiKey,
					forceRefresh: true,
					onFallback: (issue) => {
						refreshFallbackIssue = issue;
					},
				});
				registerCursorProvider(pi, refreshedModels);
				if (!ctx.hasUI) return;
				if (refreshFallbackIssue) {
					ctx.ui.notify(`Cursor model catalog refresh did not use a live catalog: ${refreshFallbackIssue.message}`, "warning");
				} else {
					ctx.ui.notify(`Cursor model catalog refreshed with ${refreshedModels.length} model${refreshedModels.length === 1 ? "" : "s"}.`, "info");
				}
			},
		});

		registerCursorProvider(pi, models);
		// Keep the process error guard near the end so earlier Cursor cleanup
		// remains protected during session shutdown.
		registerCursorSdkSessionProcessErrorGuard(pi);
		// Register last so ownership remains protected until all other Cursor
		// session_shutdown handlers finish.
		registerCursorExtensionFactoryRelease(pi, factoryClaim);
	} catch (error) {
		releaseCursorExtensionFactory(factoryClaim.token);
		throw error;
	}
}
