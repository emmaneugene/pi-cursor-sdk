import type {
	BeforeAgentStartEvent,
	BeforeAgentStartEventResult,
	ExtensionAPI,
	ExtensionContext,
	ExtensionHandler,
	SessionStartEvent,
	TurnStartEvent,
} from "@earendil-works/pi-coding-agent";
import type { CursorModelFallbackIssue } from "./model-discovery.js";
import { getCursorSessionScopeKey } from "./session-scope.js";

export const CURSOR_PROVIDER = "cursor";
export const CURSOR_SDK_API = "cursor-sdk";

export type CursorModelRef =
	| Pick<NonNullable<ExtensionContext["model"]>, "provider" | "api">
	| undefined;

export function isCursorModel(model: CursorModelRef): boolean {
	return model?.provider === CURSOR_PROVIDER || model?.api === CURSOR_SDK_API;
}

export type CursorActiveToolApi = Pick<ExtensionAPI, "getActiveTools">;

export function arePiToolsDisabled(pi: CursorActiveToolApi): boolean {
	return pi.getActiveTools().length === 0;
}

export type CursorModelLifecycleContext = ExtensionContext;

type CursorModelSelectEvent = { model: ExtensionContext["model"] };

type CursorModelLifecycleSyncHandler = (ctx: CursorModelLifecycleContext) => Promise<void> | void;
type CursorModelSessionStartHandler = ExtensionHandler<SessionStartEvent>;
type CursorModelSelectHandler = (event: CursorModelSelectEvent, ctx: CursorModelLifecycleContext) => Promise<void> | void;
type CursorModelTurnStartHandler = ExtensionHandler<TurnStartEvent>;
type CursorModelBeforeAgentStartHandler = ExtensionHandler<BeforeAgentStartEvent, BeforeAgentStartEventResult>;

export interface CursorModelLifecycleExtensionApi {
	on(event: "session_start", handler: ExtensionHandler<SessionStartEvent>): void;
	on(event: "before_agent_start", handler: CursorModelBeforeAgentStartHandler): void;
	on(event: "model_select", handler: (event: CursorModelSelectEvent, ctx: ExtensionContext) => Promise<void> | void): void;
	on(event: "turn_start", handler: ExtensionHandler<TurnStartEvent>): void;
}

export interface CursorModelLifecycleHandlers {
	sessionStart?: CursorModelSessionStartHandler;
	modelSelect?: CursorModelSelectHandler;
	turnStart?: CursorModelTurnStartHandler;
	sync?: CursorModelLifecycleSyncHandler;
	beforeAgentStart?: CursorModelBeforeAgentStartHandler;
}

function normalizeLifecycleHandlers(
	handlerOrHandlers: CursorModelLifecycleSyncHandler | CursorModelLifecycleHandlers,
): CursorModelLifecycleHandlers {
	return typeof handlerOrHandlers === "function" ? { sync: handlerOrHandlers } : handlerOrHandlers;
}

export function registerCursorModelLifecycle(
	pi: CursorModelLifecycleExtensionApi,
	handlerOrHandlers: CursorModelLifecycleSyncHandler | CursorModelLifecycleHandlers,
): void {
	const handlers = normalizeLifecycleHandlers(handlerOrHandlers);
	const sync = handlers.sync;
	if (handlers.sessionStart || sync) {
		pi.on("session_start", async (event, ctx) => {
			await handlers.sessionStart?.(event, ctx);
			await sync?.(ctx);
		});
	}
	if (handlers.modelSelect || sync) {
		pi.on("model_select", async (event, ctx) => {
			const effectiveCtx = { ...ctx, model: event.model };
			await handlers.modelSelect?.(event, effectiveCtx);
			await sync?.(effectiveCtx);
		});
	}
	if (handlers.turnStart || sync) {
		pi.on("turn_start", async (event, ctx) => {
			await handlers.turnStart?.(event, ctx);
			await sync?.(ctx);
		});
	}
	if (handlers.beforeAgentStart || sync) {
		pi.on("before_agent_start", async (event, ctx) => {
			await sync?.(ctx);
			return await handlers.beforeAgentStart?.(event, ctx);
		});
	}
}

export type CursorFallbackWarningExtensionApi = CursorModelLifecycleExtensionApi;

export function registerCursorFallbackIssueWarning(
	pi: CursorFallbackWarningExtensionApi,
	issue: CursorModelFallbackIssue,
): void {
	const warnedSessionScopeKeys = new Set<string>();

	registerCursorModelLifecycle(pi, (ctx: ExtensionContext) => {
		if (!isCursorModel(ctx.model) || !ctx.hasUI) return;
		const scopeKey = getCursorSessionScopeKey();
		if (warnedSessionScopeKeys.has(scopeKey)) return;
		warnedSessionScopeKeys.add(scopeKey);
		ctx.ui.notify(issue.message, "warning");
	});
}
