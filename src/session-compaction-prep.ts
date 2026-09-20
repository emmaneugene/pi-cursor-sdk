import { cursorLiveRuns } from "./provider-live-run-drain.js";
import { resetSessionCursorAgent } from "./session-agent.js";
import { getCursorSessionScopeKey } from "./session-scope.js";

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
