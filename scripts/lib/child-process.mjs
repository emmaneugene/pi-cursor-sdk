import { execFile } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import { scrubSensitiveText } from "../../shared/sensitive-text.mjs";

export const DEFAULT_CHILD_SHUTDOWN_GRACE_MS = 2_000;
export const CHILD_PROCESS_TREE_SPAWN_OPTIONS = Object.freeze({
	detached: process.platform !== "win32",
});

function normalizeTimeoutMs(value, fallback) {
	return Number.isFinite(value) ? Math.max(1, Math.trunc(value)) : fallback;
}

export function waitForChildClose(child, options) {
	if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(child.exitCode ?? 1);
	if (options?.timeoutMs === undefined) {
		return new Promise((resolve) => {
			child.once("close", (code) => resolve(code ?? 1));
		});
	}
	const timeoutMs = normalizeTimeoutMs(options.timeoutMs, DEFAULT_CHILD_SHUTDOWN_GRACE_MS);
	const label = options.label ?? "child process";
	return new Promise((resolve, reject) => {
		const cleanup = () => {
			clearTimeout(timer);
			child.off("close", onClose);
			child.off("error", onError);
		};
		const onClose = (code) => {
			cleanup();
			resolve(code ?? 1);
		};
		const onError = (error) => {
			cleanup();
			reject(error);
		};
		const timer = setTimeout(() => {
			cleanup();
			reject(new Error(`${label} did not exit within ${timeoutMs}ms`));
		}, timeoutMs);
		child.once("close", onClose);
		child.once("error", onError);
	});
}

export function signalChild(child, signal) {
	if (!child.pid) return;
	try {
		if (process.platform === "win32") {
			child.kill(signal);
		} else {
			process.kill(-child.pid, signal);
		}
	} catch {
		try {
			child.kill(signal);
		} catch {
			// child already exited
		}
	}
}

function runHiddenWindowsCommand(command, args, timeoutMs) {
	return new Promise((resolve) => {
		let settled = false;
		let timer;
		const finish = (succeeded) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve(succeeded);
		};
		const child = execFile(
			command,
			args,
			{ maxBuffer: 64 * 1024, timeout: timeoutMs, windowsHide: true },
			(error) => finish(error === null),
		);
		timer = setTimeout(() => {
			child.kill("SIGKILL");
			finish(false);
		}, timeoutMs);
	});
}

async function terminateWindowsProcessTree(pid, timeoutMs) {
	if (await runHiddenWindowsCommand("taskkill", ["/PID", String(pid), "/T", "/F"], timeoutMs)) return true;

	const script = `
$ErrorActionPreference = "Stop"
$rootPid = [uint32]${pid}
$deadline = [DateTime]::UtcNow.AddMilliseconds(${timeoutMs})
try {
	$processes = @(Get-CimInstance -ClassName Win32_Process -Property ProcessId,ParentProcessId)
	$queue = [Collections.Generic.Queue[uint32]]::new()
	$descendants = [Collections.Generic.List[uint32]]::new()
	$seen = [Collections.Generic.HashSet[uint32]]::new()
	$queue.Enqueue($rootPid)
	while ($queue.Count -gt 0) {
		$parentPid = $queue.Dequeue()
		foreach ($process in $processes) {
			$childPid = [uint32]$process.ProcessId
			if ([uint32]$process.ParentProcessId -eq $parentPid -and $seen.Add($childPid)) {
				$descendants.Add($childPid)
				$queue.Enqueue($childPid)
			}
		}
	}
	for ($index = $descendants.Count - 1; $index -ge 0; $index--) {
		Stop-Process -Id $descendants[$index] -Force -ErrorAction SilentlyContinue
	}
	Stop-Process -Id $rootPid -Force -ErrorAction SilentlyContinue
	$targets = @($rootPid) + @($descendants)
	do {
		$alive = @(Get-Process -Id $targets -ErrorAction SilentlyContinue)
		if ($alive.Count -eq 0) { exit 0 }
		Start-Sleep -Milliseconds 25
	} while ([DateTime]::UtcNow -lt $deadline)
} catch {}
exit 1
`;
	return runHiddenWindowsCommand(
		"powershell.exe",
		["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
		timeoutMs,
	);
}

function waitForChildCloseWithin(child, timeoutMs) {
	if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true);
	return new Promise((resolve) => {
		const finish = (closed) => {
			clearTimeout(timer);
			child.off("close", onClose);
			resolve(closed);
		};
		const onClose = () => finish(true);
		const timer = setTimeout(() => finish(false), timeoutMs);
		child.once("close", onClose);
	});
}

function posixProcessGroupExists(pid) {
	try {
		process.kill(-pid, 0);
		return true;
	} catch (error) {
		return error?.code !== "ESRCH";
	}
}

async function waitForPosixProcessGroupExit(pid, timeoutMs) {
	const deadline = Date.now() + timeoutMs;
	while (posixProcessGroupExists(pid) && Date.now() < deadline) {
		await new Promise((resolve) => setTimeout(resolve, Math.min(25, deadline - Date.now())));
	}
	return !posixProcessGroupExists(pid);
}

export async function terminateChild(child, { graceMs = DEFAULT_CHILD_SHUTDOWN_GRACE_MS } = {}) {
	const pid = child.pid;
	if (!pid) return;
	const timeoutMs = normalizeTimeoutMs(graceMs, DEFAULT_CHILD_SHUTDOWN_GRACE_MS);
	try {
		child.stdin?.end?.();
	} catch {
		child.stdin?.destroy?.();
	}
	await waitForChildCloseWithin(child, timeoutMs);
	if (process.platform === "win32") {
		// CIM enumeration can exceed a short graceful-shutdown window on a busy Windows VM;
		// keep the process-tree discovery bounded but give orphan lookup a stable floor.
		const treeTimeoutMs = Math.max(timeoutMs, 15_000);
		if (!(await terminateWindowsProcessTree(pid, treeTimeoutMs))) {
			signalChild(child, "SIGTERM");
			if (!(await waitForChildCloseWithin(child, timeoutMs))) {
				signalChild(child, "SIGKILL");
				await waitForChildCloseWithin(child, timeoutMs);
			}
			throw new Error(`failed to verify termination of Windows process tree rooted at ${pid}`);
		}
		if (!(await waitForChildCloseWithin(child, timeoutMs))) {
			throw new Error(`Windows process tree exited but child ${pid} did not close`);
		}
		return;
	}

	if (posixProcessGroupExists(pid)) signalChild(child, "SIGTERM");
	let groupExited = await waitForPosixProcessGroupExit(pid, timeoutMs);
	if (!groupExited) {
		signalChild(child, "SIGKILL");
		groupExited = await waitForPosixProcessGroupExit(pid, timeoutMs);
	}
	const childClosed = await waitForChildCloseWithin(child, timeoutMs);
	if (!groupExited || !childClosed) {
		throw new Error(`failed to verify termination of POSIX process tree rooted at ${pid}`);
	}
}

export function parseJsonLines(stdout) {
	const events = [];
	for (const line of stdout.split("\n")) {
		if (!line.trim()) continue;
		try {
			events.push(JSON.parse(line));
		} catch {
			// ignore partial lines
		}
	}
	return events;
}

export function openJsonlRpcSession(child, { secrets = [] } = {}) {
	const cleanSecrets = Array.isArray(secrets) ? secrets.filter(Boolean) : [];
	const scrub = (text) => cleanSecrets.reduce((s, secret) => scrubSensitiveText(s, secret), scrubSensitiveText(text));
	let closed = child.exitCode !== null || child.signalCode !== null;
	let exitCode = child.exitCode ?? null;
	let exitSignal = child.signalCode ?? null;
	let childError;
	let disposePromise;
	const events = [];
	const waiters = new Set();
	const stdoutDecoder = new StringDecoder("utf8");
	const stderrDecoder = new StringDecoder("utf8");
	let stdout = "";
	let stderr = "";
	let lineBuf = "";

	const formatTail = () => `stdoutTail=${scrub(stdout.slice(-4_000))}\nstderrTail=${scrub(stderr.slice(-4_000))}`;
	const formatFailure = (label) =>
		new Error(
			childError
				? `${label}: child process error: ${scrub(childError.message)}\n${formatTail()}`
				: `${label}: child exited (code=${exitCode}, signal=${exitSignal}) before condition was met\n${formatTail()}`,
		);
	const settleWaiter = (w, fn, value) => {
		waiters.delete(w);
		clearTimeout(w.timer);
		fn(value);
	};
	const ingestLine = (line) => {
		const trimmed = line.trim();
		if (!trimmed) return;
		try {
			events.push(JSON.parse(trimmed));
		} catch {
			return;
		}
		for (const w of [...waiters]) {
			if (!waiters.has(w)) continue;
			try {
				if (w.predicate(events)) settleWaiter(w, w.resolve, [...events]);
			} catch (error) {
				settleWaiter(w, w.reject, error);
			}
		}
	};
	const onStdout = (chunk) => {
		const text = typeof chunk === "string" ? chunk : stdoutDecoder.write(chunk);
		if (!text) return;
		stdout += text;
		lineBuf += text;
		for (let nl = lineBuf.indexOf("\n"); nl !== -1; nl = lineBuf.indexOf("\n")) {
			const line = lineBuf.slice(0, nl);
			lineBuf = lineBuf.slice(nl + 1);
			ingestLine(line);
		}
	};
	const onStderr = (chunk) => {
		stderr += typeof chunk === "string" ? chunk : stderrDecoder.write(chunk);
	};
	const onStdinError = () => {};
	const detachListeners = () => {
		child.stdout?.off?.("data", onStdout);
		child.stderr?.off?.("data", onStderr);
		child.stdin?.off?.("error", onStdinError);
		child.off?.("error", onError);
		child.off?.("close", onClose);
	};
	const finish = (code, signal, error) => {
		if (closed) return;
		closed = true;
		detachListeners();
		exitCode = code ?? null;
		exitSignal = signal ?? null;
		if (error) childError = error instanceof Error ? error : new Error(String(error));
		for (const w of [...waiters]) settleWaiter(w, w.reject, formatFailure(w.label));
	};
	const onError = (error) => finish(null, null, error);
	const onClose = (code, signal) => {
		if (closed) return;
		const tailOut = stdoutDecoder.end();
		if (tailOut) onStdout(tailOut);
		if (lineBuf) {
			const last = lineBuf;
			lineBuf = "";
			ingestLine(last);
		}
		stderr += stderrDecoder.end();
		finish(code, signal);
	};
	if (!closed) {
		child.stdout?.on("data", onStdout);
		child.stderr?.on("data", onStderr);
		child.stdin?.on("error", onStdinError);
		child.once("error", onError);
		child.once("close", onClose);
	}
	return {
		get events() { return [...events]; },
		get stdout() { return stdout; },
		get stderr() { return stderr; },
		send(command) {
			if (closed) throw formatFailure("RPC send");
			if (!child.stdin?.writable || child.stdin.destroyed) {
				throw new Error(`RPC child stdin closed before command could be sent\n${formatTail()}`);
			}
			child.stdin.write(`${JSON.stringify(command)}\n`);
		},
		waitFor(predicate, { timeoutMs = 300_000, label = "RPC condition" } = {}) {
			try { if (predicate(events)) return Promise.resolve([...events]); } catch (error) { return Promise.reject(error); }
			if (closed) return Promise.reject(formatFailure(label));
			const ms = normalizeTimeoutMs(timeoutMs, 300_000);
			return new Promise((resolve, reject) => {
				const w = { label, predicate, resolve, reject, timer: undefined };
				w.timer = setTimeout(() => {
					waiters.delete(w);
					reject(new Error(`${label}: timed out after ${ms}ms\n${formatTail()}`));
				}, ms);
				waiters.add(w);
			});
		},
		async close({ timeoutMs = 30_000, label = "RPC child" } = {}) {
			if (childError) throw formatFailure(label);
			if (closed) return exitCode ?? 1;
			try { child.stdin?.end?.(); } catch { child.stdin?.destroy?.(); }
			try {
				return await waitForChildClose(child, { timeoutMs: normalizeTimeoutMs(timeoutMs, 30_000), label });
			} catch (error) {
				if (childError) throw formatFailure(label);
				throw new Error(`${scrub(error instanceof Error ? error.message : String(error))}\n${formatTail()}`);
			}
		},
		async dispose(disposeOptions) {
			if (child.exitCode !== null || child.signalCode !== null) {
				if (!closed) finish(child.exitCode, child.signalCode);
				return;
			}
			disposePromise ??= terminateChild(child, disposeOptions).finally(() => {
				if (!closed) finish(child.exitCode, child.signalCode);
			});
			await disposePromise;
		},
	};
}
