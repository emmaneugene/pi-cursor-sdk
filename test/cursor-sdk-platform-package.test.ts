import {
	accessSync,
	chmodSync,
	constants,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, parse, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
	ensureCursorRipgrepPath,
	ensureCursorTreeSitterVendorDir,
	resolveBundledCursorRipgrepPath,
	resolveBundledCursorSandboxPath,
	resolveBundledCursorTreeSitterVendorDir,
	runWithCursorSdkPlatformPackageVisible,
} from "../src/cursor-sdk-platform-package.js";

const originalRipgrepPath = process.env.CURSOR_RIPGREP_PATH;
const originalTreeSitterVendorDir = process.env.CURSOR_TREE_SITTER_VENDOR_DIR;
const platformPackage = `@cursor/sdk-${process.platform}-${process.arch}`;
const rgBinaryName = process.platform === "win32" ? "rg.exe" : "rg";

afterEach(() => {
	if (originalRipgrepPath === undefined) delete process.env.CURSOR_RIPGREP_PATH;
	else process.env.CURSOR_RIPGREP_PATH = originalRipgrepPath;
	if (originalTreeSitterVendorDir === undefined) delete process.env.CURSOR_TREE_SITTER_VENDOR_DIR;
	else process.env.CURSOR_TREE_SITTER_VENDOR_DIR = originalTreeSitterVendorDir;
});

describe("Cursor ripgrep path", () => {
	it("resolves the executable from the installed Cursor SDK platform package", () => {
		const ripgrepPath = resolveBundledCursorRipgrepPath();

		if (!ripgrepPath) throw new Error("Expected the installed Cursor SDK platform package to include ripgrep");
		expect(ripgrepPath.replaceAll("\\", "/")).toContain(platformPackage);
		expect(() => accessSync(ripgrepPath, constants.X_OK)).not.toThrow();
	});

	it("resolves a platform package nested under @cursor/sdk/node_modules", () => {
		const root = mkdtempSync(join(tmpdir(), "pi-cursor-ripgrep-nested-"));
		try {
			const consumerDir = join(root, "consumer");
			const consumerModule = join(consumerDir, "index.js");
			const sdkDir = join(consumerDir, "node_modules", "@cursor", "sdk");
			const nestedPlatformDir = join(sdkDir, "node_modules", "@cursor", `sdk-${process.platform}-${process.arch}`);
			const nestedBinDir = join(nestedPlatformDir, "bin");
			const nestedRg = join(nestedBinDir, rgBinaryName);

			mkdirSync(nestedBinDir, { recursive: true });
			writeFileSync(join(sdkDir, "package.json"), JSON.stringify({ name: "@cursor/sdk", version: "1.0.30", main: "index.js" }));
			writeFileSync(join(sdkDir, "index.js"), "module.exports = {};\n");
			writeFileSync(
				join(nestedPlatformDir, "package.json"),
				JSON.stringify({ name: platformPackage, version: "1.0.30", bin: { rg: `bin/${rgBinaryName}` } }),
			);
			writeFileSync(nestedRg, "#!/bin/sh\nexit 0\n");
			chmodSync(nestedRg, 0o755);
			writeFileSync(consumerModule, "export {};\n");

			// Nested only — no hoisted platform package beside @cursor/sdk.
			const consumerRequire = createRequire(consumerModule);
			expect(() => consumerRequire.resolve(`${platformPackage}/package.json`)).toThrow();
			expect(consumerRequire.resolve("@cursor/sdk")).toBe(realpathSync(join(sdkDir, "index.js")));

			const resolved = resolveBundledCursorRipgrepPath(pathToFileURL(consumerModule));
			expect(resolved).toBe(realpathSync(nestedRg));
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("locks installed @cursor/sdk 1.0.30 Agent.create ripgrep contract", () => {
		const require = createRequire(import.meta.url);
		const sdkEntry = require.resolve("@cursor/sdk");
		const sdkRoot = join(dirname(sdkEntry), "..", "..");
		const sdkPackage = JSON.parse(readFileSync(join(sdkRoot, "package.json"), "utf8")) as { version: string };
		expect(sdkPackage.version).toBe("1.0.30");

		// Agent.create lives in the local-runtime chunk (esm/357.js beside cjs entry's sibling esm).
		const bundle = readFileSync(join(sdkRoot, "dist", "esm", "357.js"), "utf8");

		// Absolute CURSOR_RIPGREP_PATH wins; otherwise platform-package lookup, then PATH, then configure.
		expect(bundle).toContain(
			"CURSOR_RIPGREP_PATH;M=W&&(0,a.isAbsolute)(W)?W:(0,F.hQ)({binaryName:z,excludedWorkspaceDir:E}),M||(M=(0,I.resolveRipgrepFromPath)()),M&&(0,I.configureRipgrepPath)(M)",
		);
		expect(bundle).toContain("resolveRipgrepFromPath");
		expect(bundle).toContain("excludedWorkspaceDir");
		expect(bundle).toContain('throw new Error("configureRipgrepPath: path must not be empty")');
		expect(bundle).toContain("Ripgrep path not configured. Call configureRipgrepPath() at startup.");
	});

	it("configures an empty path without overriding an existing absolute value", () => {
		process.env.CURSOR_RIPGREP_PATH = "";
		const bundledPath = ensureCursorRipgrepPath();
		expect(process.env.CURSOR_RIPGREP_PATH).toBe(bundledPath);

		process.env.CURSOR_RIPGREP_PATH = "/custom/rg";
		expect(ensureCursorRipgrepPath()).toBe("/custom/rg");
		expect(process.env.CURSOR_RIPGREP_PATH).toBe("/custom/rg");
	});
});

describe("Cursor tree-sitter vendor dir", () => {
	it("resolves vendor/tree-sitter from the installed Cursor SDK platform package", () => {
		const vendorDir = resolveBundledCursorTreeSitterVendorDir();

		if (!vendorDir) throw new Error("Expected the installed Cursor SDK platform package to include tree-sitter vendor");
		expect(vendorDir.replaceAll("\\", "/")).toContain(platformPackage);
		expect(() => accessSync(join(vendorDir, "tree-sitter", "index.js"), constants.R_OK)).not.toThrow();
	});

	it("resolves a vendor directory nested under @cursor/sdk/node_modules", () => {
		const root = mkdtempSync(join(tmpdir(), "pi-cursor-treesitter-nested-"));
		try {
			const consumerDir = join(root, "consumer");
			const consumerModule = join(consumerDir, "index.js");
			const sdkDir = join(consumerDir, "node_modules", "@cursor", "sdk");
			const nestedPlatformDir = join(sdkDir, "node_modules", "@cursor", `sdk-${process.platform}-${process.arch}`);
			const nestedVendorIndex = join(nestedPlatformDir, "vendor", "tree-sitter", "index.js");

			mkdirSync(dirname(nestedVendorIndex), { recursive: true });
			writeFileSync(join(sdkDir, "package.json"), JSON.stringify({ name: "@cursor/sdk", version: "1.0.30", main: "index.js" }));
			writeFileSync(join(sdkDir, "index.js"), "module.exports = {};\n");
			writeFileSync(
				join(nestedPlatformDir, "package.json"),
				JSON.stringify({ name: platformPackage, version: "1.0.30" }),
			);
			writeFileSync(nestedVendorIndex, "module.exports = {};\n");
			writeFileSync(consumerModule, "export {};\n");

			const consumerRequire = createRequire(consumerModule);
			expect(() => consumerRequire.resolve(`${platformPackage}/package.json`)).toThrow();
			expect(consumerRequire.resolve("@cursor/sdk")).toBe(realpathSync(join(sdkDir, "index.js")));

			const resolved = resolveBundledCursorTreeSitterVendorDir(pathToFileURL(consumerModule));
			expect(resolved).toBe(realpathSync(join(nestedPlatformDir, "vendor")));
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("locks installed @cursor/sdk 1.0.30 Agent.create tree-sitter vendor contract", () => {
		const require = createRequire(import.meta.url);
		const sdkEntry = require.resolve("@cursor/sdk");
		const sdkRoot = join(dirname(sdkEntry), "..", "..");
		const sdkPackage = JSON.parse(readFileSync(join(sdkRoot, "package.json"), "utf8")) as { version: string };
		expect(sdkPackage.version).toBe("1.0.30");

		const bundle = readFileSync(join(sdkRoot, "dist", "esm", "index.js"), "utf8");
		expect(bundle).toContain(
			"CURSOR_TREE_SITTER_VENDOR_DIR;return e&&(0,s.isAbsolute)(e)?e:(0,o.nk)({relativePath:\"vendor\",excludedWorkspaceDirs:i.size>0?[...i]:[process.cwd()],accept:e=>(0,r.existsSync)((0,s.join)(e,\"tree-sitter\",\"index.js\"))})",
		);
		expect(bundle).toContain("CURSOR_TREE_SITTER_STUBBED");
		expect(bundle).toContain("shell command analysis is disabled");
	});

	it("configures an empty vendor dir without overriding an existing absolute value", () => {
		process.env.CURSOR_TREE_SITTER_VENDOR_DIR = "";
		const bundledPath = ensureCursorTreeSitterVendorDir();
		expect(process.env.CURSOR_TREE_SITTER_VENDOR_DIR).toBe(bundledPath);

		process.env.CURSOR_TREE_SITTER_VENDOR_DIR = "/custom/vendor";
		expect(ensureCursorTreeSitterVendorDir()).toBe("/custom/vendor");
		expect(process.env.CURSOR_TREE_SITTER_VENDOR_DIR).toBe("/custom/vendor");
	});
});

function findPlatformPackageBinaryFromArgv1(argv1: string, binaryName: string): string | undefined {
	const packageName = `@cursor/sdk-${process.platform}-${process.arch}`;
	let dir = dirname(resolve(argv1));
	const root = parse(dir).root;
	while (dir !== root) {
		const candidate = join(dir, "node_modules", packageName, "bin", binaryName);
		if (existsSync(candidate)) return realpathSync(candidate);
		dir = dirname(dir);
	}
	return undefined;
}

describe("Cursor sandbox binary", () => {
	const sandboxBinaryName = process.platform === "win32" ? "cursorsandbox.exe" : "cursorsandbox";

	it("resolves cursorsandbox from the installed Cursor SDK platform package", () => {
		const sandboxPath = resolveBundledCursorSandboxPath();

		if (!sandboxPath) throw new Error("Expected the installed Cursor SDK platform package to include cursorsandbox");
		expect(sandboxPath.replaceAll("\\", "/")).toContain(platformPackage);
		expect(() => accessSync(sandboxPath, constants.X_OK)).not.toThrow();
	});

	it("resolves a sandbox binary nested under @cursor/sdk/node_modules", () => {
		const root = mkdtempSync(join(tmpdir(), "pi-cursor-sandbox-nested-"));
		try {
			const consumerDir = join(root, "consumer");
			const consumerModule = join(consumerDir, "index.js");
			const sdkDir = join(consumerDir, "node_modules", "@cursor", "sdk");
			const nestedPlatformDir = join(sdkDir, "node_modules", "@cursor", `sdk-${process.platform}-${process.arch}`);
			const nestedBinDir = join(nestedPlatformDir, "bin");
			const nestedSandbox = join(nestedBinDir, sandboxBinaryName);

			mkdirSync(nestedBinDir, { recursive: true });
			writeFileSync(join(sdkDir, "package.json"), JSON.stringify({ name: "@cursor/sdk", version: "1.0.30", main: "index.js" }));
			writeFileSync(join(sdkDir, "index.js"), "module.exports = {};\n");
			writeFileSync(
				join(nestedPlatformDir, "package.json"),
				JSON.stringify({ name: platformPackage, version: "1.0.30" }),
			);
			writeFileSync(nestedSandbox, "#!/bin/sh\nexit 0\n");
			chmodSync(nestedSandbox, 0o755);
			writeFileSync(consumerModule, "export {};\n");

			const consumerRequire = createRequire(consumerModule);
			expect(() => consumerRequire.resolve(`${platformPackage}/package.json`)).toThrow();
			expect(consumerRequire.resolve("@cursor/sdk")).toBe(realpathSync(join(sdkDir, "index.js")));

			const resolved = resolveBundledCursorSandboxPath(pathToFileURL(consumerModule));
			expect(resolved).toBe(realpathSync(nestedSandbox));
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("locks installed @cursor/sdk 1.0.30 Agent.create sandbox binary contract", () => {
		const require = createRequire(import.meta.url);
		const sdkEntry = require.resolve("@cursor/sdk");
		const sdkRoot = join(dirname(sdkEntry), "..", "..");
		const sdkPackage = JSON.parse(readFileSync(join(sdkRoot, "package.json"), "utf8")) as { version: string };
		expect(sdkPackage.version).toBe("1.0.30");

		const bundle = readFileSync(join(sdkRoot, "dist", "esm", "357.js"), "utf8");
		expect(bundle).toContain(
			"cursorsandbox.exe\":\"cursorsandbox\",r=(0,F.hQ)({binaryName:t,excludedWorkspaceDir:e});r&&(0,I.configureSandboxPrereqs)({sandboxBinaryPath:r})",
		);
		expect(bundle).not.toContain("CURSOR_SANDBOX_PATH");
		expect(bundle).toContain("Local SDK sandboxing was requested, but sandboxing is not supported in this environment.");
	});

	it("points the SDK argv[1] walk at the platform package, then restores it", async () => {
		const sandboxPath = resolveBundledCursorSandboxPath();
		if (!sandboxPath) throw new Error("Expected the installed Cursor SDK platform package to include cursorsandbox");

		const previousArgv1 = process.argv[1];
		let argv1DuringRun: string | undefined;
		const result = await runWithCursorSdkPlatformPackageVisible(async () => {
			argv1DuringRun = process.argv[1];
			return "ok";
		});

		expect(result).toBe("ok");
		expect(argv1DuringRun).toBeDefined();
		expect(findPlatformPackageBinaryFromArgv1(argv1DuringRun!, sandboxBinaryName)).toBe(realpathSync(sandboxPath));
		expect(process.argv[1]).toBe(previousArgv1);
	});
});
