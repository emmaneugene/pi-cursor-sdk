import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CURSOR_SDK_CONFIG_FILE, type CursorSdkConfig } from "../../src/config.js";
import { CURSOR_SDK_EVENT_DEBUG_INTERNAL_RUN_DIR_ENV } from "../../src/sdk-event-debug-constants.js";

export const ENABLED_CURSOR_SDK_EVENT_DEBUG_CONFIG: CursorSdkConfig = {
	debug: { sdkEvents: { enabled: true } },
};

export function writeCursorSdkEventDebugUserConfigFile(
	agentDir: string,
	sdkEvents: NonNullable<NonNullable<CursorSdkConfig["debug"]>["sdkEvents"]> = { enabled: true },
): string {
	mkdirSync(agentDir, { recursive: true });
	const path = join(agentDir, CURSOR_SDK_CONFIG_FILE);
	writeFileSync(path, `${JSON.stringify({ debug: { sdkEvents } }, null, 2)}\n`);
	return path;
}

export function installCursorSdkEventDebugUserConfig(
	sdkEvents: NonNullable<NonNullable<CursorSdkConfig["debug"]>["sdkEvents"]> = { enabled: true },
	options: { runDir?: string } = {},
): () => void {
	const agentDir = mkdtempSync(join(tmpdir(), "pi-cursor-sdk-event-debug-agent-"));
	const previousAgentDir = process.env.PI_CODING_AGENT_DIR;
	const previousRunDir = process.env[CURSOR_SDK_EVENT_DEBUG_INTERNAL_RUN_DIR_ENV];
	writeCursorSdkEventDebugUserConfigFile(agentDir, sdkEvents);
	process.env.PI_CODING_AGENT_DIR = agentDir;
	if (options.runDir !== undefined) process.env[CURSOR_SDK_EVENT_DEBUG_INTERNAL_RUN_DIR_ENV] = options.runDir;
	return () => {
		if (previousAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
		else process.env.PI_CODING_AGENT_DIR = previousAgentDir;
		if (previousRunDir === undefined) delete process.env[CURSOR_SDK_EVENT_DEBUG_INTERNAL_RUN_DIR_ENV];
		else process.env[CURSOR_SDK_EVENT_DEBUG_INTERNAL_RUN_DIR_ENV] = previousRunDir;
		rmSync(agentDir, { recursive: true, force: true });
	};
}
