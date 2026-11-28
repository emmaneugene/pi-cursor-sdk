import { createHash } from "node:crypto";
import type { AgentModeOption, LocalAgentOptions, LocalAgentStore, ModelSelection, SDKAgent, SettingSource } from "@cursor/sdk";
import type { Context } from "@earendil-works/pi-ai";
import {
	getRegisteredCursorPiToolBridge,
	type CursorPiBridgeToolRequest,
	type CursorPiToolBridge,
	type CursorPiToolBridgeRun,
} from "./pi-tool-bridge.js";
import { computeCursorContextFingerprint } from "./context.js";
import { getCursorSessionFile, getCursorSessionScopeGeneration, getCursorSessionScopeKey } from "./session-scope.js";
import type { CursorSdkEventDebugRecorder } from "./sdk-event-debug.js";
import { loadCursorSdk, type CursorSdkModule } from "./sdk-runtime.js";
import { runWithCursorSdkPlatformPackageVisible } from "./sdk-platform-package.js";
import type { SessionCursorAgentSendState } from "./session-send-policy.js";
import {
	openCursorSessionStoreForScope,
	type CursorSessionStoreIdentity,
	type OpenCursorSessionStore,
} from "./session-store.js";

export const CURSOR_LOCAL_AGENT_IDLE_MS = 5 * 60 * 1000;

export interface SessionCursorAgentLease {
	scopeKey: string;
	poolKey: string;
	instanceId: number;
	agent: SDKAgent;
	bridgeRun?: CursorPiToolBridgeRun;
	store: LocalAgentStore;
	storeIdentity: CursorSessionStoreIdentity;
	readonly sendState: SessionCursorAgentSendState;
	created: boolean;
	commitSend(context: Context, bootstrapped: boolean): void;
	trackRunCompletion(completion: Promise<unknown>): void;
}

interface ActiveAgentResource {
	scopeKey: string;
	poolKey: string;
	instanceId: number;
	agent: SDKAgent;
	bridgeRun?: CursorPiToolBridgeRun;
	sessionStore: OpenCursorSessionStore;
	sendState: SessionCursorAgentSendState;
}

type ScopeSlot =
	| { status: "empty" }
	| { status: "creating"; poolKey: string; instanceId: number; creating: Promise<void> }
	| { status: "ready"; resource: ActiveAgentResource; lastUsedAtMs?: number }
	| {
		status: "busy";
		resource: ActiveAgentResource;
		lastUsedAtMs?: number;
		completionSettled: Promise<void>;
		pendingCompletion: Promise<void>;
		releaseBusyWait: () => void;
	};

type ActiveScopeSlot = Extract<ScopeSlot, { status: "ready" | "busy" }>;
type CreatingScopeSlot = Extract<ScopeSlot, { status: "creating" }>;

type ScopeInvalidation =
	| { kind: "none" }
	| { kind: "lazy"; deadTransport: boolean };

interface ScopePoolRecord {
	slot: ScopeSlot;
	invalidation: ScopeInvalidation;
	terminalClosedAtSessionGeneration?: number;
}

class SessionCursorAgentCreationSupersededError extends Error {
	constructor() {
		super("Cursor session agent creation was superseded");
		this.name = "SessionCursorAgentCreationSupersededError";
	}
}

export class SessionCursorAgentScopeClosedError extends Error {
	constructor() {
		super("Cursor session agent scope is closed");
		this.name = "SessionCursorAgentScopeClosedError";
	}
}

interface SessionCursorAgentCreateParams {
	apiKey: string;
	agentMode: AgentModeOption;
	cwd: string;
	modelSelection: ModelSelection;
	settingSources?: SettingSource[];
	localSafety?: CursorLocalSafetyOptions;
	useHttp1ForAgent?: boolean;
	bridgeExcludeToolNames?: ReadonlySet<string>;
	onBridgeToolRequest?: (request: CursorPiBridgeToolRequest) => void;
	debugRecorder?: CursorSdkEventDebugRecorder;
	runtimeScope?: { scopeKey: string; sessionFile: string | undefined };
	bridge?: CursorPiToolBridge;
	createAgent?: CursorSdkModule["Agent"]["create"];
}

const scopePools = new Map<string, ScopePoolRecord>();
const EMPTY_SCOPE_SLOT: ScopeSlot = { status: "empty" };
const NO_INVALIDATION: ScopeInvalidation = { kind: "none" };
let deadTransportAgentDisposeTimeoutMs = 3000;
let nextSessionAgentInstanceId = 1;
let nowMs = () => Date.now();

export interface CursorLocalSafetyOptions {
	autoReview?: boolean;
	sandboxEnabled?: boolean;
}

export function buildCursorLocalAgentOptions(options: {
	cwd: string;
	settingSources?: SettingSource[];
	localSafety?: CursorLocalSafetyOptions;
	store?: LocalAgentStore;
}): LocalAgentOptions {
	return {
		cwd: options.cwd,
		...(options.store ? { store: options.store } : {}),
		...(options.settingSources ? { settingSources: options.settingSources } : {}),
		...(options.localSafety?.autoReview === true ? { autoReview: true } : {}),
		...(options.localSafety?.sandboxEnabled === true ? { sandboxOptions: { enabled: true } } : {}),
	};
}

function getOrCreateScopePoolRecord(scopeKey: string): ScopePoolRecord {
	let record = scopePools.get(scopeKey);
	if (!record) {
		record = { slot: EMPTY_SCOPE_SLOT, invalidation: NO_INVALIDATION };
		scopePools.set(scopeKey, record);
	}
	return record;
}

function isTerminallyClosed(scopeKey: string, record: ScopePoolRecord): boolean {
	if (record.terminalClosedAtSessionGeneration === undefined) return false;
	if (record.terminalClosedAtSessionGeneration >= getCursorSessionScopeGeneration(scopeKey)) return true;
	record.terminalClosedAtSessionGeneration = undefined;
	return false;
}

function pruneScopePoolRecordIfIdle(scopeKey: string, record: ScopePoolRecord): void {
	if (!isTerminallyClosed(scopeKey, record) && record.slot.status === "empty" && record.invalidation.kind === "none" && scopePools.get(scopeKey) === record) {
		scopePools.delete(scopeKey);
	}
}

function assertScopeAcceptsAcquire(scopeKey: string): void {
	const record = scopePools.get(scopeKey);
	if (!record) return;
	if (isTerminallyClosed(scopeKey, record)) throw new SessionCursorAgentScopeClosedError();
	pruneScopePoolRecordIfIdle(scopeKey, record);
}

function rethrowSupersededWhenReplacedByDifferentPoolKey(scopeKey: string, poolKey: string, error: unknown): void {
	if (!(error instanceof SessionCursorAgentCreationSupersededError)) return;
	const slot = scopePools.get(scopeKey)?.slot;
	if (!slot || slot.status === "empty") return;
	if ((slot.status === "creating" ? slot.poolKey : slot.resource.poolKey) !== poolKey) throw error;
}

function getSessionCursorAgentPoolState(scopeKey: string): ScopeSlot {
	return scopePools.get(scopeKey)?.slot ?? EMPTY_SCOPE_SLOT;
}

function hasSessionAgent(scopeKey: string): boolean {
	const slot = scopePools.get(scopeKey)?.slot;
	return slot !== undefined && slot.status !== "empty";
}

function isActiveScopeSlot(slot: ScopeSlot | undefined): slot is ActiveScopeSlot {
	return slot?.status === "ready" || slot?.status === "busy";
}

function buildApiKeyPoolKeyFingerprint(apiKey: string): string {
	return createHash("sha256").update(apiKey).digest("hex").slice(0, 16);
}

function buildSessionAgentPoolKey(scopeKey: string, params: SessionCursorAgentCreateParams): string {
	const bridge = params.bridge ?? getRegisteredCursorPiToolBridge();
	return [
		scopeKey,
		params.cwd,
		JSON.stringify(params.modelSelection),
		params.settingSources?.join(",") ?? "",
		JSON.stringify({ autoReview: params.localSafety?.autoReview === true, sandboxEnabled: params.localSafety?.sandboxEnabled === true }),
		params.useHttp1ForAgent === undefined ? "http1:default" : params.useHttp1ForAgent ? "http1:on" : "http1:off",
		buildApiKeyPoolKeyFingerprint(params.apiKey),
		bridge ? bridge.getToolSurfaceSignature(params.bridgeExcludeToolNames) : "bridge:absent",
	].join("\0");
}

async function disposeAgentResource(resource: ActiveAgentResource, options?: { deadTransport?: boolean }): Promise<void> {
	resource.bridgeRun?.cancel("Cursor session agent disposed");
	try {
		await resource.bridgeRun?.dispose();
	} catch {
		// disposal failure should not block session replacement
	}
	try {
		const disposal = Promise.resolve(resource.agent[Symbol.asyncDispose]()).catch(() => undefined);
		// A dead local transport may never settle SDK disposal; bound the wait so the
		// next acquire recreates instead of hanging on the dead agent.
		await (options?.deadTransport
			? Promise.race([
					disposal,
					new Promise<void>((resolve) => setTimeout(resolve, deadTransportAgentDisposeTimeoutMs).unref?.()),
				])
			: disposal);
	} catch {
		// disposal failure should not block session replacement
	}
	await resource.sessionStore.dispose().catch(() => undefined);
}

async function disposePoolEntryForScope(scopeKey: string, options?: { terminal?: boolean; deadTransport?: boolean }): Promise<void> {
	const record = scopePools.get(scopeKey) ?? (options?.terminal ? getOrCreateScopePoolRecord(scopeKey) : undefined);
	if (!record) return;
	if (options?.terminal) record.terminalClosedAtSessionGeneration = getCursorSessionScopeGeneration(scopeKey);
	const deadTransport = options?.deadTransport === true || (record.invalidation.kind === "lazy" && record.invalidation.deadTransport);
	record.invalidation = NO_INVALIDATION;

	const slot = record.slot;
	record.slot = EMPTY_SCOPE_SLOT;
	pruneScopePoolRecordIfIdle(scopeKey, record);

	if (slot.status === "empty") return;
	if (slot.status === "busy") slot.releaseBusyWait();
	if (slot.status === "creating") {
		slot.creating.catch(() => undefined);
		return;
	}
	await disposeAgentResource(slot.resource, { deadTransport });
}

function commitSessionAgentSendForLease(scopeKey: string, poolKey: string, instanceId: number, context: Context, bootstrapped: boolean): void {
	const slot = scopePools.get(scopeKey)?.slot;
	if (!isActiveScopeSlot(slot) || slot.resource.poolKey !== poolKey || slot.resource.instanceId !== instanceId) return;
	const previous = slot.resource.sendState;
	slot.resource.sendState = {
		bootstrapped: true,
		contextFingerprint: computeCursorContextFingerprint(context),
		incrementalSendCount: bootstrapped || !previous.bootstrapped ? 0 : previous.incrementalSendCount + 1,
	};
	slot.lastUsedAtMs = nowMs();
}

function buildBusySlot(slot: ActiveScopeSlot, completionSettled: Promise<void>): Extract<ScopeSlot, { status: "busy" }> {
	const { resource } = slot;
	let releaseBusyWait = (): void => {};
	const releaseSignal = new Promise<"released">((resolve) => { releaseBusyWait = () => resolve("released"); });
	const pendingCompletion = Promise.race([completionSettled.then(() => "completed" as const), releaseSignal]).then((outcome) => {
		const record = scopePools.get(resource.scopeKey);
		const current = record?.slot;
		if (
			outcome === "completed" &&
			record &&
			current?.status === "busy" &&
			current.resource.poolKey === resource.poolKey &&
			current.resource.instanceId === resource.instanceId &&
			current.pendingCompletion === pendingCompletion
		) {
			record.slot = { status: "ready", resource: current.resource, lastUsedAtMs: current.lastUsedAtMs };
		}
	});
	return { status: "busy", resource, lastUsedAtMs: slot.lastUsedAtMs, completionSettled, pendingCompletion, releaseBusyWait };
}

function trackSessionAgentRunCompletionForLease(scopeKey: string, poolKey: string, instanceId: number, completion: Promise<unknown>): void {
	const record = scopePools.get(scopeKey);
	const slot = record?.slot;
	if (!record || !isActiveScopeSlot(slot) || slot.resource.poolKey !== poolKey || slot.resource.instanceId !== instanceId) return;
	const completionToTrack = Promise.resolve(completion).then(() => undefined, () => undefined);
	const completionSettled = slot.status === "busy"
		? Promise.all([slot.completionSettled, completionToTrack]).then(() => undefined)
		: completionToTrack;
	if (slot.status === "busy") slot.releaseBusyWait();
	record.slot = buildBusySlot(slot, completionSettled);
}

function leaseFromResource(resource: ActiveAgentResource, params: SessionCursorAgentCreateParams, created: boolean): SessionCursorAgentLease {
	resource.bridgeRun?.setOnToolRequest(params.onBridgeToolRequest);
	resource.bridgeRun?.setDebugRecorder(params.debugRecorder);
	return {
		scopeKey: resource.scopeKey,
		poolKey: resource.poolKey,
		instanceId: resource.instanceId,
		agent: resource.agent,
		bridgeRun: resource.bridgeRun,
		store: resource.sessionStore.store,
		storeIdentity: resource.sessionStore.identity,
		get sendState() {
			return resource.sendState;
		},
		created,
		commitSend: (context, bootstrapped) => {
			commitSessionAgentSendForLease(resource.scopeKey, resource.poolKey, resource.instanceId, context, bootstrapped);
		},
		trackRunCompletion: (completion) => {
			trackSessionAgentRunCompletionForLease(resource.scopeKey, resource.poolKey, resource.instanceId, completion);
		},
	};
}

async function createSessionAgentResource(
	scopeKey: string,
	persistentStore: boolean,
	instanceId: number,
	params: SessionCursorAgentCreateParams,
): Promise<ActiveAgentResource> {
	let bridgeRun: CursorPiToolBridgeRun | undefined;
	let sessionStore: OpenCursorSessionStore | undefined;
	try {
		const registeredBridge = params.bridge ?? getRegisteredCursorPiToolBridge();
		if (registeredBridge) {
			const createdBridgeRun = await registeredBridge.createRun({
				onToolRequest: params.onBridgeToolRequest,
				debugRecorder: params.debugRecorder,
				excludeToolNames: params.bridgeExcludeToolNames,
			});
			if (!createdBridgeRun.enabled || !createdBridgeRun.mcpServers) {
				await createdBridgeRun.dispose();
			} else {
				bridgeRun = createdBridgeRun;
			}
		}

		const resolvedPoolKey = buildSessionAgentPoolKey(scopeKey, params);
		let createAgent = params.createAgent;
		if (!createAgent) {
			const sdk = await loadCursorSdk();
			createAgent = sdk.Agent.create;
		}
		const storeSelection = await openCursorSessionStoreForScope({
			cwd: params.cwd,
			scopeKey,
			persistent: persistentStore,
		});
		sessionStore = storeSelection.sessionStore;
		const buildAgentOptions = () => ({
			apiKey: params.apiKey,
			model: params.modelSelection,
			mode: params.agentMode,
			local: buildCursorLocalAgentOptions({
				cwd: params.cwd,
				settingSources: params.settingSources,
				localSafety: params.localSafety,
				store: sessionStore!.store,
			}),
			...(bridgeRun?.mcpServers ? { mcpServers: bridgeRun.mcpServers } : {}),
		});
		let agent: SDKAgent | undefined;
		await runWithCursorSdkPlatformPackageVisible(async () => {
			agent = await createAgent(buildAgentOptions());
		});
		if (!agent) throw new Error("Cursor SDK agent creation returned no agent");
		if (!sessionStore) throw new Error("Cursor SDK session store was not opened");

		return {
			scopeKey,
			poolKey: resolvedPoolKey,
			instanceId,
			agent,
			bridgeRun,
			sessionStore,
			sendState: { bootstrapped: false },
		};
	} catch (error) {
		bridgeRun?.cancel("Cursor session agent create failed");
		await bridgeRun?.dispose().catch(() => undefined);
		await sessionStore?.dispose().catch(() => undefined);
		throw error;
	}
}

export {
	buildCursorSessionSendPrompt,
	MAX_COMPLETED_INCREMENTAL_SENDS_BEFORE_REBOOTSTRAP,
	planCursorSessionSend,
	type CursorSessionSendPlan,
	type SessionCursorAgentSendState,
} from "./session-send-policy.js";

export function invalidateSessionAgent(scopeKey: string = getCursorSessionScopeKey(), options?: { deadTransport?: boolean }): void {
	const record = getOrCreateScopePoolRecord(scopeKey);
	const deadTransport = (record.invalidation.kind === "lazy" && record.invalidation.deadTransport) || options?.deadTransport === true;
	record.invalidation = { kind: "lazy", deadTransport };
}

export async function acquireSessionCursorAgent(params: SessionCursorAgentCreateParams): Promise<SessionCursorAgentLease> {
	const scopeKey = params.runtimeScope?.scopeKey ?? getCursorSessionScopeKey();
	const persistentStore = params.runtimeScope ? params.runtimeScope.sessionFile !== undefined : getCursorSessionFile() !== undefined;

	while (true) {
		assertScopeAcceptsAcquire(scopeKey);
		if (scopePools.get(scopeKey)?.invalidation.kind === "lazy") {
			await disposePoolEntryForScope(scopeKey);
			continue;
		}

		const poolKey = buildSessionAgentPoolKey(scopeKey, params);
		const slot = getSessionCursorAgentPoolState(scopeKey);

		if (isActiveScopeSlot(slot) && slot.resource.poolKey !== poolKey) {
			await disposePoolEntryForScope(scopeKey);
			continue;
		}

		if (slot.status === "ready") {
			if (slot.lastUsedAtMs !== undefined && nowMs() - slot.lastUsedAtMs >= CURSOR_LOCAL_AGENT_IDLE_MS) {
				await disposePoolEntryForScope(scopeKey, { deadTransport: true });
				continue;
			}
			return leaseFromResource(slot.resource, params, false);
		}

		if (slot.status === "busy") {
			await slot.pendingCompletion;
			continue;
		}

		if (slot.status === "creating") {
			if (slot.poolKey !== poolKey) {
				await disposePoolEntryForScope(scopeKey);
				continue;
			}
			try {
				await slot.creating;
			} catch (error) {
				if (error instanceof SessionCursorAgentCreationSupersededError) {
					assertScopeAcceptsAcquire(scopeKey);
					rethrowSupersededWhenReplacedByDifferentPoolKey(scopeKey, poolKey, error);
					continue;
				}
				throw error;
			}
			continue;
		}

		assertScopeAcceptsAcquire(scopeKey);
		const record = getOrCreateScopePoolRecord(scopeKey);
		const instanceId = nextSessionAgentInstanceId++;
		let creatingSlot: CreatingScopeSlot;
		const creating = createSessionAgentResource(scopeKey, persistentStore, instanceId, params).then(async (resource) => {
			const currentRecord = scopePools.get(scopeKey);
			if (currentRecord?.slot !== creatingSlot) {
				await disposeAgentResource(resource);
				throw new SessionCursorAgentCreationSupersededError();
			}
			currentRecord.slot = { status: "ready", resource };
		});
		creatingSlot = { status: "creating", poolKey, instanceId, creating };
		record.slot = creatingSlot;

		try {
			await creating;
			assertScopeAcceptsAcquire(scopeKey);
			const currentRecord = scopePools.get(scopeKey);
			if (currentRecord?.invalidation.kind === "lazy") {
				await disposePoolEntryForScope(scopeKey);
				continue;
			}
			if (
				currentRecord?.slot.status === "ready" &&
				currentRecord.slot.resource.poolKey === poolKey &&
				currentRecord.slot.resource.instanceId === instanceId
			) {
				return leaseFromResource(currentRecord.slot.resource, params, true);
			}
			continue;
		} catch (error) {
			const currentRecord = scopePools.get(scopeKey);
			if (currentRecord?.slot === creatingSlot) {
				currentRecord.slot = EMPTY_SCOPE_SLOT;
				pruneScopePoolRecordIfIdle(scopeKey, currentRecord);
			}
			if (error instanceof SessionCursorAgentCreationSupersededError) {
				assertScopeAcceptsAcquire(scopeKey);
				rethrowSupersededWhenReplacedByDifferentPoolKey(scopeKey, poolKey, error);
				continue;
			}
			throw error;
		}
	}
}

export type RefreshSessionCursorAgentConfigResult = "reloaded" | "no-agent" | "busy" | "unsupported";

export async function refreshSessionCursorAgentConfig(scopeKey: string = getCursorSessionScopeKey()): Promise<RefreshSessionCursorAgentConfigResult> {
	const record = scopePools.get(scopeKey);
	if (!record || isTerminallyClosed(scopeKey, record)) return "no-agent";
	pruneScopePoolRecordIfIdle(scopeKey, record);
	if (record.invalidation.kind !== "none" || record.slot.status === "empty" || record.slot.status === "creating") return "no-agent";
	if (record.slot.status === "busy") return "busy";
	if (typeof record.slot.resource.agent.reload !== "function") return "unsupported";
	await record.slot.resource.agent.reload();
	return "reloaded";
}

export async function resetSessionCursorAgent(scopeKey: string = getCursorSessionScopeKey()): Promise<void> {
	await disposePoolEntryForScope(scopeKey);
}

export async function disposeSessionCursorAgent(scopeKey: string = getCursorSessionScopeKey()): Promise<void> {
	await disposePoolEntryForScope(scopeKey, { terminal: true });
}

export async function disposeAllSessionCursorAgents(): Promise<void> {
	const scopeKeys = [...scopePools.keys()];
	await Promise.all(scopeKeys.map((scopeKey) => disposePoolEntryForScope(scopeKey, { terminal: true })));
	scopePools.clear();
	nowMs = () => Date.now();
}

export const __testUtils = {
	hasSessionAgent,
	getSessionCursorAgentPoolState,
	invalidateSessionAgent,
	disposeSessionCursorAgent,
	resetSessionCursorAgent,
	refreshSessionCursorAgentConfig,
	disposeAllSessionCursorAgents,
	setNowMs(ms: number): void {
		nowMs = () => ms;
	},
	buildApiKeyPoolKeyFingerprint,
	buildSessionAgentPoolKey,
	setDeadTransportAgentDisposeTimeoutMs(ms: number): number {
		const previous = deadTransportAgentDisposeTimeoutMs;
		deadTransportAgentDisposeTimeoutMs = ms;
		return previous;
	},
	SessionCursorAgentCreationSupersededError,
	SessionCursorAgentScopeClosedError,
};
