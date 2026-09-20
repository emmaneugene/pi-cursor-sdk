import type {
	ExtensionHandler,
	SessionBeforeCompactEvent,
	SessionBeforeTreeEvent,
	SessionCompactEvent,
	SessionShutdownEvent,
	SessionTreeEvent,
} from "@earendil-works/pi-coding-agent";
import { cursorLiveRuns } from "./provider-live-run-drain.js";
import { clearCursorSdkHttp1 } from "./http1.js";
import { getCursorSessionScopeKey, onCursorSessionScopeKeyChange } from "./session-scope.js";
import {
	disposeSessionCursorAgent,
	invalidateSessionAgent,
	resetSessionCursorAgent,
} from "./session-agent.js";

export interface CursorSessionAgentLifecycleExtensionApi {
	on(event: "session_shutdown", handler: ExtensionHandler<SessionShutdownEvent>): void;
	on(event: "session_before_compact", handler: ExtensionHandler<SessionBeforeCompactEvent>): void;
	on(event: "session_compact", handler: ExtensionHandler<SessionCompactEvent>): void;
	on(event: "session_before_tree", handler: ExtensionHandler<SessionBeforeTreeEvent>): void;
	on(event: "session_tree", handler: ExtensionHandler<SessionTreeEvent>): void;
	on(event: "model_select", handler: () => Promise<void> | void): void;
}

/**
 * Prepare the pooled Cursor session agent for pi compaction summarization.
 * Releases any scoped live-run drain state still tied to the pooled agent, then
 * disposes the pool entry so summarization acquires a clean SDK agent.
 */
export async function prepareCursorSessionForCompaction(
	scopeKey: string = getCursorSessionScopeKey(),
): Promise<void> {
	while (true) {
		const run = cursorLiveRuns.getActiveForScope(scopeKey);
		if (!run || run.disposed) break;
		await cursorLiveRuns.release(run);
	}
	await resetSessionCursorAgent(scopeKey);
}

export function registerCursorSessionAgentLifecycle(pi: CursorSessionAgentLifecycleExtensionApi): void {
	onCursorSessionScopeKeyChange(async (previousScopeKey) => {
		await disposeSessionCursorAgent(previousScopeKey);
	});
	pi.on("session_shutdown", async (event) => {
		try {
			if (event.reason === "reload") {
				await resetSessionCursorAgent();
				return;
			}
			await disposeSessionCursorAgent();
		} finally {
			clearCursorSdkHttp1();
		}
	});
	pi.on("session_before_compact", async () => {
		await prepareCursorSessionForCompaction();
	});
	pi.on("session_compact", () => {
		invalidateSessionAgent();
	});
	pi.on("session_before_tree", () => {
		invalidateSessionAgent();
	});
	pi.on("session_tree", async () => {
		await resetSessionCursorAgent();
	});
	pi.on("model_select", () => {
		invalidateSessionAgent();
	});
}
