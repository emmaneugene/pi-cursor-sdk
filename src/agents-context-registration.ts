import { isCursorModel } from "./model.js";
import { registerCursorModelLifecycle, type CursorModelLifecycleExtensionApi } from "./model-lifecycle.js";
import { resolveCursorFacingSystemPrompt } from "./agents-context.js";
import { loadCursorSdkUserConfig, type CursorSdkConfig } from "./config.js";

export type CursorAgentsContextExtensionApi = CursorModelLifecycleExtensionApi;

export function registerCursorAgentsContextDedup(
	pi: CursorAgentsContextExtensionApi,
	config: CursorSdkConfig = loadCursorSdkUserConfig(),
): void {
	registerCursorModelLifecycle(pi, {
		beforeAgentStart: (event, ctx) => {
			if (!isCursorModel(ctx.model)) return undefined;
			const resolved = resolveCursorFacingSystemPrompt(
				event.systemPrompt,
				ctx.model,
				event.systemPromptOptions,
				undefined,
				undefined,
				config,
			);
			if (resolved === event.systemPrompt) return undefined;
			return { systemPrompt: resolved };
		},
	});
}
