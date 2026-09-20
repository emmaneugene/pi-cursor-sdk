import type {
	ExtensionHandler,
	SessionBeforeTreeEvent,
	SessionCompactEvent,
	SessionShutdownEvent,
	SessionTreeEvent,
} from "@earendil-works/pi-coding-agent";
import { clearCursorSdkHttp1 } from "./http1.js";
import { onCursorSessionScopeKeyChange } from "./session-scope.js";
import {
	disposeSessionCursorAgent,
	invalidateSessionAgent,
	resetSessionCursorAgent,
} from "./session-agent.js";

export interface CursorSessionAgentLifecycleExtensionApi {
	on(event: "session_shutdown", handler: ExtensionHandler<SessionShutdownEvent>): void;
	on(event: "session_compact", handler: ExtensionHandler<SessionCompactEvent>): void;
	on(event: "session_before_tree", handler: ExtensionHandler<SessionBeforeTreeEvent>): void;
	on(event: "session_tree", handler: ExtensionHandler<SessionTreeEvent>): void;
	on(event: "model_select", handler: () => Promise<void> | void): void;
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
