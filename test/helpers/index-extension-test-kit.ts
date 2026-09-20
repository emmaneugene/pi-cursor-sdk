import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { vi } from "vitest";
import type { CursorSdkConfig } from "../../src/config.js";
import {
	createExtensionRegistrationPi,
	type CursorExtensionRegistrationPi,
	type PiHarness,
	type PiHarnessOptions,
} from "./pi-harness.js";
import { __testUtils as nativeToolDisplayTestUtils } from "../../src/native-tool-display-state.js";
import { __testUtils as cursorPiToolBridgeTestUtils } from "../../src/pi-tool-bridge.js";
import { __testUtils as cursorSessionScopeTestUtils } from "../../src/session-scope.js";
import { __testUtils as cursorSessionLineageTestUtils } from "../../src/session-agent-lineage.js";
import { __testUtils as cursorSdkProcessErrorGuardTestUtils } from "../../src/sdk-process-error-guard.js";
import { __testUtils as cursorExtensionFactoryGuardTestUtils } from "../../src/extension-factory-guard.js";
import { installCursorSessionStoreMock } from "./session-store.js";

export {
	nativeToolDisplayTestUtils,
	cursorPiToolBridgeTestUtils,
	cursorSessionScopeTestUtils,
};

let isolatedAgentDir: string | undefined;

export function writeIndexTestUserConfig(config: CursorSdkConfig): string {
	if (!isolatedAgentDir) {
		isolatedAgentDir = mkdtempSync(join(tmpdir(), "pi-cursor-index-config-"));
		process.env.PI_CODING_AGENT_DIR = isolatedAgentDir;
	}
	const path = join(isolatedAgentDir, "cursor-sdk.json");
	writeFileSync(path, `${JSON.stringify(config)}\n`);
	return path;
}

export function createExtensionPi(
	initialTools?: PiHarnessOptions["initialTools"],
): PiHarness & CursorExtensionRegistrationPi {
	return createExtensionRegistrationPi(initialTools ? { initialTools } : undefined);
}

export async function resetIndexExtensionTestState(): Promise<void> {
	vi.clearAllMocks();
	installCursorSessionStoreMock();
	if (isolatedAgentDir) rmSync(isolatedAgentDir, { recursive: true, force: true });
	isolatedAgentDir = mkdtempSync(join(tmpdir(), "pi-cursor-index-config-"));
	process.env.PI_CODING_AGENT_DIR = isolatedAgentDir;
	await cursorPiToolBridgeTestUtils.resetRegisteredBridgeForTests();
	cursorExtensionFactoryGuardTestUtils.reset();
	cursorSessionScopeTestUtils.reset();
	cursorSessionLineageTestUtils.reset();
	cursorSdkProcessErrorGuardTestUtils.resetLifecycleSessionGuard();
	nativeToolDisplayTestUtils.reset();
}
