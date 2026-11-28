import type { ChildProcess } from "node:child_process";

export declare const DEFAULT_CHILD_SHUTDOWN_GRACE_MS: number;
export declare const CHILD_PROCESS_TREE_SPAWN_OPTIONS: Readonly<{ detached: boolean }>;

export interface WaitForChildCloseOptions {
	timeoutMs?: number;
	label?: string;
}

export interface JsonlRpcSessionOptions {
	secrets?: readonly string[];
}

export interface JsonlRpcSession {
	readonly events: unknown[];
	readonly stdout: string;
	readonly stderr: string;
	send(command: unknown): void;
	waitFor(
		predicate: (events: readonly unknown[]) => boolean,
		options?: WaitForChildCloseOptions,
	): Promise<unknown[]>;
	close(options?: WaitForChildCloseOptions): Promise<number>;
	dispose(options?: { graceMs?: number }): Promise<void>;
}

export declare function waitForChildClose(
	child: ChildProcess,
	options?: WaitForChildCloseOptions,
): Promise<number>;
export declare function signalChild(child: ChildProcess, signal: NodeJS.Signals): void;
export declare function terminateChild(
	child: ChildProcess,
	options?: { graceMs?: number },
): Promise<void>;
export declare function parseJsonLines(stdout: string): unknown[];
export declare function openJsonlRpcSession(
	child: ChildProcess,
	options?: JsonlRpcSessionOptions,
): JsonlRpcSession;
