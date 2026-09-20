import { accessSync, constants, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join } from "node:path";

const RIPGREP_ENV = "CURSOR_RIPGREP_PATH";
const TREE_SITTER_VENDOR_ENV = "CURSOR_TREE_SITTER_VENDOR_DIR";

function cursorSdkPlatformPackageName(): string {
	return `@cursor/sdk-${process.platform}-${process.arch}`;
}

function resolveCursorSdkPlatformPackageDir(
	fromModuleUrl: string | URL = import.meta.url,
): string | undefined {
	try {
		const require = createRequire(fromModuleUrl);
		const sdkEntry = require.resolve("@cursor/sdk");
		return dirname(
			require.resolve(`${cursorSdkPlatformPackageName()}/package.json`, {
				paths: [dirname(sdkEntry)],
			}),
		);
	} catch {
		return undefined;
	}
}

function resolveCursorSdkPlatformBinary(
	binaryName: string,
	fromModuleUrl: string | URL = import.meta.url,
): string | undefined {
	try {
		const packageDirectory = resolveCursorSdkPlatformPackageDir(fromModuleUrl);
		if (!packageDirectory) return undefined;
		const binaryPath = join(packageDirectory, "bin", binaryName);
		accessSync(binaryPath, constants.X_OK);
		return binaryPath;
	} catch {
		return undefined;
	}
}

export function resolveBundledCursorRipgrepPath(
	fromModuleUrl: string | URL = import.meta.url,
): string | undefined {
	return resolveCursorSdkPlatformBinary(process.platform === "win32" ? "rg.exe" : "rg", fromModuleUrl);
}

export function ensureCursorRipgrepPath(): string | undefined {
	const configuredPath = process.env[RIPGREP_ENV];
	if (configuredPath && isAbsolute(configuredPath)) return configuredPath;

	const bundledPath = resolveBundledCursorRipgrepPath();
	if (bundledPath) process.env[RIPGREP_ENV] = bundledPath;
	return bundledPath;
}

export function resolveBundledCursorTreeSitterVendorDir(
	fromModuleUrl: string | URL = import.meta.url,
): string | undefined {
	const packageDirectory = resolveCursorSdkPlatformPackageDir(fromModuleUrl);
	if (!packageDirectory) return undefined;
	const vendorDir = join(packageDirectory, "vendor");
	if (!existsSync(join(vendorDir, "tree-sitter", "index.js"))) return undefined;
	return vendorDir;
}

export function ensureCursorTreeSitterVendorDir(): string | undefined {
	const configuredPath = process.env[TREE_SITTER_VENDOR_ENV];
	if (configuredPath && isAbsolute(configuredPath)) return configuredPath;

	const bundledPath = resolveBundledCursorTreeSitterVendorDir();
	if (bundledPath) process.env[TREE_SITTER_VENDOR_ENV] = bundledPath;
	return bundledPath;
}

export function resolveBundledCursorSandboxPath(
	fromModuleUrl: string | URL = import.meta.url,
): string | undefined {
	return resolveCursorSdkPlatformBinary(
		process.platform === "win32" ? "cursorsandbox.exe" : "cursorsandbox",
		fromModuleUrl,
	);
}

/**
 * The SDK finds `cursorsandbox` by walking from `process.argv[1]`, not from
 * `require.resolve`. Point that walk at the installed platform package for the
 * duration of local `Agent.create` / `Agent.resume`.
 */
export async function runWithCursorSdkPlatformPackageVisible<T>(
	run: () => Promise<T>,
	fromModuleUrl: string | URL = import.meta.url,
): Promise<T> {
	const packageDirectory = resolveCursorSdkPlatformPackageDir(fromModuleUrl);
	if (!packageDirectory) return run();
	const hostEntry = join(packageDirectory, "package.json");
	if (!existsSync(hostEntry)) return run();
	const previousArgv1 = process.argv[1];
	process.argv[1] = hostEntry;
	try {
		return await run();
	} finally {
		if (process.argv[1] === hostEntry) process.argv[1] = previousArgv1;
	}
}
