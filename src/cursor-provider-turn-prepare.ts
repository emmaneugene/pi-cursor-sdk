import type { Context, SimpleStreamOptions } from "@earendil-works/pi-ai";
import type { AgentModeOption, ModelSelection } from "@cursor/sdk";
import { configureCursorSdkHttp1 } from "./cursor-http1.js";
import { installCursorMcpToolTimeoutOverride } from "./cursor-mcp-timeout-override.js";
import { ensureCursorRipgrepPath, ensureCursorTreeSitterVendorDir } from "./cursor-sdk-platform-package.js";
import { installCursorSdkOutputFilter, suppressCursorSdkOutput } from "./cursor-sdk-output-filter.js";
import {
	acquireSessionCursorAgent,
	buildCursorSessionSendPrompt,
	planCursorSessionSend,
	resetSessionCursorAgent,
	type CursorSessionSendPlan,
} from "./cursor-session-agent.js";
import type { CursorPiBridgeToolRequest } from "./cursor-pi-tool-bridge.js";
import { buildCursorPrompt, estimateCursorPromptTokens } from "./context.js";
import { getCursorPromptOptions } from "./cursor-usage-accounting.js";
import { getActiveContextToolNames } from "./cursor-context-tools.js";
import type { CursorLiveRun } from "./cursor-live-run-coordinator.js";
import {
	abandonSessionCursorAgent,
	createCursorNativeReplayId,
	cursorLiveRuns,
	getPendingCursorLiveRun,
} from "./cursor-provider-live-run-drain.js";
import {
	getCursorProviderAgentModeOrThrow,
	getEffectiveFastForModelId,
} from "./cursor-state.js";
import { resolveEffectiveCursorConfig } from "./cursor-runtime-state.js";
import { buildCursorBridgeExcludeToolNames, type CursorResolvedSdkConfig } from "./cursor-config.js";
import { buildCursorModelSelection } from "./model-discovery.js";
import { getEffectiveCursorSettingSources } from "./cursor-setting-sources.js";
import { getCursorSessionProjectTrusted } from "./cursor-session-scope.js";
import { resolveCursorPiToolBridgeEnabled } from "./cursor-pi-tool-bridge-env.js";
import {
	buildCursorToolManifestText,
	resolveCursorToolManifestEnabled,
} from "./cursor-tool-manifest.js";
import { isCursorNativeToolDisplayRuntimeEnabled } from "./cursor-native-tool-display-state.js";
import { MISSING_CURSOR_API_KEY_MESSAGE } from "./cursor-provider-errors.js";
import { CursorSdkTurnCoordinator } from "./cursor-provider-turn-coordinator.js";
import { resolveCursorApiKey } from "./cursor-api-key.js";
import { loadCursorSdk } from "./cursor-sdk-runtime.js";
import type {
	CursorProviderTurnLifecycle,
	CursorProviderTurnPrepareResult,
	CursorProviderTurnRunnerParams,
} from "./cursor-provider-turn-types.js";
import type { CursorSdkEventDebugSink } from "./cursor-sdk-event-debug.js";
import type { SessionCursorAgentLease } from "./cursor-session-agent.js";

export interface PrepareCursorProviderTurnParams {
	params: CursorProviderTurnRunnerParams;
	cwd: string;
	resolvedApiKey: string;
	sdkEventDebug: CursorSdkEventDebugSink | undefined;
	throwIfAborted: () => void;
	/** Snapshot resolved once by the runner before draining; reused unchanged through prepare. */
	resolvedConfig: CursorResolvedSdkConfig;
}

interface PrepareCursorProviderTurnContext extends PrepareCursorProviderTurnParams {
	agentMode: AgentModeOption;
	selection: ModelSelection;
	fastEnabled: boolean | undefined;
}

export function resolveCursorProviderTurnConfig(cwd: string, projectTrusted = getCursorSessionProjectTrusted()) {
	return resolveEffectiveCursorConfig({ cwd, projectTrusted });
}

function buildLocalCursorProviderTurnLifecycle(
	lease: SessionCursorAgentLease,
	scopeKey: string,
	disposeAgentAfterTurn: boolean,
): CursorProviderTurnLifecycle {
	return {
		trackRunCompletion: (completion) => lease.trackRunCompletion(completion),
		commitSend: (context, bootstrapped) => lease.commitSend(context, bootstrapped),
		abandon: () => abandonSessionCursorAgent(scopeKey),
		dispose: async () => {
			if (disposeAgentAfterTurn) await resetSessionCursorAgent(scopeKey);
		},
	};
}

async function prepareCursorLocalProviderTurn(
	prepareParams: PrepareCursorProviderTurnContext,
): Promise<CursorProviderTurnPrepareResult> {
	const { params, cwd, resolvedApiKey, sdkEventDebug, throwIfAborted, resolvedConfig, agentMode, selection, fastEnabled } = prepareParams;
	const { model, context, options, runtimeContext } = params;

	let restoreCursorSdkOutputFilter: (() => void) | undefined;
	let sessionAgentScopeKey: string | undefined;
	let liveRun: CursorLiveRun | undefined;
	let completed = false;

	try {
		ensureCursorRipgrepPath();
		ensureCursorTreeSitterVendorDir();
		const localSafety = {
			autoReview: resolvedConfig.local.autoReview.value,
			sandboxEnabled: resolvedConfig.local.sandboxEnabled.value,
		};
		const sdk = await loadCursorSdk();
		const { Agent } = sdk;
		const useHttp1ForAgent = configureCursorSdkHttp1(
			sdk,
			resolvedConfig.local.useHttp1ForAgent,
		);

		installCursorMcpToolTimeoutOverride();
		restoreCursorSdkOutputFilter = installCursorSdkOutputFilter();
		const settingSources = getEffectiveCursorSettingSources();
		const queuedBridgeRequestsBeforeLiveRun: CursorPiBridgeToolRequest[] = [];
		let liveRunForBridgeQueue: CursorLiveRun | undefined;
		const bridgeExcludeToolNames = buildCursorBridgeExcludeToolNames(resolvedConfig);
		const localResumeEnabled = runtimeContext?.localResume ?? resolvedConfig.local.resume.value;

		const sessionAgentAcquireParams = {
			apiKey: resolvedApiKey,
			agentMode,
			cwd,
			modelSelection: selection,
			settingSources,
			localSafety,
			localResume: localResumeEnabled,
			useHttp1ForAgent,
			runtimeScope: runtimeContext
				? { scopeKey: runtimeContext.scopeKey, sessionFile: runtimeContext.sessionFile }
				: undefined,
			bridge: runtimeContext?.bridge,
			bridgeExcludeToolNames,
			debugRecorder: sdkEventDebug,
			onBridgeToolRequest: (request: CursorPiBridgeToolRequest) => {
				if (liveRunForBridgeQueue && !liveRunForBridgeQueue.disposed) {
					cursorLiveRuns.queueEvent(liveRunForBridgeQueue, { type: "bridge-tool", request });
				} else {
					queuedBridgeRequestsBeforeLiveRun.push(request);
				}
			},
			createAgent: (createOptions: Parameters<typeof Agent.create>[0]) =>
				suppressCursorSdkOutput(() => Agent.create(createOptions)),
		};
		let sessionAgentLease = await acquireSessionCursorAgent(sessionAgentAcquireParams);
		sessionAgentScopeKey = sessionAgentLease.scopeKey;
		throwIfAborted();

		let bridgeToolNames = new Set(sessionAgentLease.bridgeRun?.snapshot.tools.map((tool) => tool.mcpToolName) ?? []);
		let includePiBridgeGuidance = bridgeToolNames.size > 0;
		const buildPromptOptions = (plan: ReturnType<typeof planCursorSessionSend>) => {
			const promptOptions = {
				...getCursorPromptOptions(model),
				agentMode,
				includePiBridgeGuidance,
			};
			if (plan.mode !== "bootstrap" || !resolveCursorToolManifestEnabled()) {
				return promptOptions;
			}
			return {
				...promptOptions,
				toolManifest: buildCursorToolManifestText({
					bridgeSnapshot: sessionAgentLease.bridgeRun?.snapshot,
					piBridgeEnabled: resolveCursorPiToolBridgeEnabled(),
					includePiBridgeGuidance,
				}),
			};
		};
		let sendPlan = planCursorSessionSend(sessionAgentLease.sendState, context);
		if (sessionAgentLease.created && sessionAgentLease.resumed && sendPlan.mode === "incremental") {
			sendPlan = { mode: "bootstrap", resetAgent: false, reason: "process_resume" };
		}
		let promptOptions = buildPromptOptions(sendPlan);
		let prompt = buildCursorSessionSendPrompt(context, promptOptions, sendPlan);
		if (sendPlan.resetAgent) {
			await resetSessionCursorAgent(sessionAgentScopeKey);
			sessionAgentLease = await acquireSessionCursorAgent({ ...sessionAgentAcquireParams, forceCreate: true });
			sessionAgentScopeKey = sessionAgentLease.scopeKey;
			bridgeToolNames = new Set(sessionAgentLease.bridgeRun?.snapshot.tools.map((tool) => tool.mcpToolName) ?? []);
			includePiBridgeGuidance = bridgeToolNames.size > 0;
			sendPlan = planCursorSessionSend(sessionAgentLease.sendState, context);
			promptOptions = buildPromptOptions(sendPlan);
			prompt = buildCursorSessionSendPrompt(context, promptOptions, sendPlan);
		}
		const bootstrap = sendPlan.mode === "bootstrap";
		const agent = sessionAgentLease.agent;
		const bridgeRun = sessionAgentLease.bridgeRun;
		const sendPayload = {
			text: prompt.text,
			images: prompt.images.length > 0 ? prompt.images : undefined,
		};
		const sessionBridgeRun = bridgeRun;
		const promptInputTokens = estimateCursorPromptTokens(prompt, promptOptions);
		const useNativeToolReplay = runtimeContext?.nativeToolReplay ?? isCursorNativeToolDisplayRuntimeEnabled();
		const activeToolNames = getActiveContextToolNames(context);
		sdkEventDebug?.recordProviderMeta({
			model: {
				id: model.id,
				provider: model.provider,
				api: model.api,
				reasoning: options?.reasoning ?? "off",
				fastEnabled,
				selection,
			},
			settingSources: settingSources ?? null,
			sendState: sessionAgentLease.sendState,
			sendPlan,
			promptOptions,
			toolManifestEnabled: resolveCursorToolManifestEnabled(),
			agentMode,
			localForce: resolvedConfig.local.force.value,
			localResume: localResumeEnabled,
			resumedAgent: sessionAgentLease.resumed,
			activeToolNames: activeToolNames ? [...activeToolNames] : [],
			sessionAgentScopeKey,
			bridgeRunId: bridgeRun?.id,
		});
		const nativeReplayId = createCursorNativeReplayId();
		const textDeltas: string[] = [];
		const useLiveRun = useNativeToolReplay || bridgeRun !== undefined;
		liveRun = useLiveRun
			? cursorLiveRuns.start({
					id: useNativeToolReplay ? nativeReplayId : bridgeRun?.id ?? nativeReplayId,
					agent,
					bridgeRun,
					sessionBridgeRun,
					sessionAgentScopeKey,
					promptInputTokens,
					textDeltas,
					debugRecorder: sdkEventDebug,
				})
			: undefined;
		if (liveRun) {
			liveRunForBridgeQueue = liveRun;
			for (const request of queuedBridgeRequestsBeforeLiveRun.splice(0)) {
				cursorLiveRuns.queueEvent(liveRun, { type: "bridge-tool", request });
			}
		}
		const turnCoordinator = new CursorSdkTurnCoordinator({
			stream: params.stream,
			partial: params.partial,
			cwd,
			resolvedApiKey,
			liveRun,
			useNativeToolReplay,
			activeToolNames,
			nativeReplayId,
			textDeltas,
			debugRecorder: sdkEventDebug,
		});

		completed = true;
		return {
			agent,
			cwd,
			payload: sendPayload,
			meta: {
				sendPlan,
				prompt,
				bootstrap,
				promptInputTokens,
				useNativeToolReplay,
				bridgeEnabled: bridgeRun !== undefined,
				nativeReplayId,
				agentMode,
				modelSelection: selection,
				...(sessionAgentLease.resumeNotice ? { resumeNotice: sessionAgentLease.resumeNotice } : {}),
			},
			contextWindowAgentId: agent.agentId,
			textDeltas,
			sessionAgentScopeKey,
			sessionAgentLease,
			localForce: resolvedConfig.local.force,
			restoreCursorSdkOutputFilter,
			lifecycle: buildLocalCursorProviderTurnLifecycle(
			sessionAgentLease,
			sessionAgentScopeKey,
			runtimeContext?.disposeAgentAfterTurn === true,
		),
			runtime: liveRun
				? { kind: "live", liveRun, turnCoordinator }
				: { kind: "direct", turnCoordinator },
		};
	} finally {
		if (!completed) {
			if (liveRun && !liveRun.disposed) {
				await cursorLiveRuns
					.release(liveRun)
					.catch(() => abandonSessionCursorAgent(sessionAgentScopeKey).catch(() => {}));
			} else {
				await abandonSessionCursorAgent(sessionAgentScopeKey).catch(() => {});
			}
			restoreCursorSdkOutputFilter?.();
		}
	}
}

export async function prepareCursorProviderTurn(
	prepareParams: PrepareCursorProviderTurnParams,
): Promise<CursorProviderTurnPrepareResult> {
	const { params } = prepareParams;
	const { model, options } = params;

	const agentMode = getCursorProviderAgentModeOrThrow();
	const fastEnabled = getEffectiveFastForModelId(model.id);
	const selection = buildCursorModelSelection(model.id, options?.reasoning ?? "off", fastEnabled);
	const context: PrepareCursorProviderTurnContext = { ...prepareParams, agentMode, selection, fastEnabled };

	return prepareCursorLocalProviderTurn(context);
}

export function requireCursorApiKey(options: SimpleStreamOptions | undefined): string {
	const apiKey = resolveCursorApiKey(options?.apiKey);
	if (!apiKey) throw new Error(MISSING_CURSOR_API_KEY_MESSAGE);
	return apiKey;
}
