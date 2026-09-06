import { isCursorModel } from "./cursor-model.js";
import { registerCursorModelLifecycle, type CursorModelLifecycleExtensionApi } from "./cursor-model-lifecycle.js";
import { resolveCursorFacingSystemPrompt } from "./cursor-agents-context.js";

export type CursorAgentsContextExtensionApi = CursorModelLifecycleExtensionApi;

export function registerCursorAgentsContextDedup(pi: CursorAgentsContextExtensionApi): void {
	registerCursorModelLifecycle(pi, {
		beforeAgentStart: (event, ctx) => {
			if (!isCursorModel(ctx.model)) return undefined;
			const resolved = resolveCursorFacingSystemPrompt(
				event.systemPrompt,
				ctx.model,
				event.systemPromptOptions,
			);
			if (resolved === event.systemPrompt) return undefined;
			return { systemPrompt: resolved };
		},
	});
}
