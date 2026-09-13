import type { CursorPiToolDisplay } from "./cursor-transcript-utils.js";
import { loadCursorSdkUserConfig, type CursorSdkConfig } from "./cursor-config.js";

export interface CursorNativeToolDisplayItem extends CursorPiToolDisplay {
	id: string;
	terminate?: boolean;
}

export const registeredNativeToolNames = new Set<string>();
export const skippedNativeToolNames = new Set<string>();
export const nativeToolResults = new Map<string, CursorNativeToolDisplayItem>();

let nativeToolDisplayRuntimeRequested = false;

export function isCursorNativeToolDisplayRequested(mode?: string, config: CursorSdkConfig = loadCursorSdkUserConfig()): boolean {
	const setting = config.tools?.display?.native ?? "auto";
	if (setting === "on") return true;
	if (setting === "off") return false;
	if (mode) return mode === "tui" || mode === "json" || mode === "rpc";
	return process.stdout.isTTY === true;
}

export function isCursorNativeToolRegistrationRequested(mode?: string, config?: CursorSdkConfig): boolean {
	return mode !== "print" && isCursorNativeToolDisplayRequested(mode, config);
}

export function setCursorNativeToolDisplayRuntimeRequested(requested: boolean): void {
	nativeToolDisplayRuntimeRequested = requested;
}

export function isCursorNativeToolDisplayEnabled(): boolean {
	return registeredNativeToolNames.size > 0;
}

export function isCursorNativeToolDisplayRuntimeEnabled(): boolean {
	return nativeToolDisplayRuntimeRequested && registeredNativeToolNames.size > 0;
}

export function canRenderCursorToolNatively(toolName: string): boolean {
	return registeredNativeToolNames.has(toolName);
}

export function isRegisteredCursorNativeToolName(toolName: string): boolean {
	return registeredNativeToolNames.has(toolName);
}

export function recordCursorNativeToolDisplay(item: CursorNativeToolDisplayItem): boolean {
	if (!canRenderCursorToolNatively(item.toolName)) return false;
	nativeToolResults.set(item.id, item);
	return true;
}

export function deleteCursorNativeToolDisplay(id: string): void {
	nativeToolResults.delete(id);
}

export function consumeCursorNativeToolDisplay(id: string): CursorNativeToolDisplayItem | undefined {
	const item = nativeToolResults.get(id);
	if (item) nativeToolResults.delete(id);
	return item;
}

export function isCursorReplayToolCallId(toolCallId: string): boolean {
	return toolCallId.startsWith("cursor-replay-");
}

export function isCursorFileMutationToolName(toolName: string): toolName is "edit" | "write" {
	return toolName === "edit" || toolName === "write";
}

export const __testUtils = {
	nativeToolResultCount: () => nativeToolResults.size,
	registerNativeToolNameForTests(toolName: string): void {
		nativeToolDisplayRuntimeRequested = true;
		registeredNativeToolNames.add(toolName);
	},
	reset(): void {
		nativeToolDisplayRuntimeRequested = false;
		registeredNativeToolNames.clear();
		skippedNativeToolNames.clear();
		nativeToolResults.clear();
	},
};
