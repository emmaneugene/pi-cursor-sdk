/**
 * Shared capture mechanics for the maintainer debug probes
 * (debug-sdk-events.mjs and debug-provider-events.mjs).
 * Execution stays in the runners; only CLI/artifact boilerplate lives here.
 * Artifact schemas, exit codes, and scrubbing behavior are unchanged.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const RAW_PROBE_ARTIFACT_WARNING =
	"Raw artifact files may contain local paths, project text, tool args/results, or secrets from the workspace. Do not commit or share them.";

export function isProbeMainModule(metaUrl) {
	if (!process.argv[1]) return false;
	const current = fileURLToPath(metaUrl);
	const invoked = resolve(process.argv[1]);
	return process.platform === "win32" ? current.toLowerCase() === invoked.toLowerCase() : current === invoked;
}

export function readInstalledPackageVersion(require, packageName) {
	try {
		const entry = require.resolve(packageName);
		const packagePath = join(dirname(entry), "..", "..", "package.json");
		return JSON.parse(readFileSync(packagePath, "utf8")).version;
	} catch {
		return "unknown";
	}
}

export function ensureArtifactDir(dir) {
	mkdirSync(dir, { recursive: true });
	return dir;
}

export function writeJsonArtifact(path, value) {
	writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function printJsonSummary(summary) {
	console.log(JSON.stringify(summary, null, 2));
}
