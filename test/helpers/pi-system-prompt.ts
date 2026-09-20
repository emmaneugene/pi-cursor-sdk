import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
	BuildSystemPromptOptions,
	NormalizedBuildSystemPromptOptions,
} from "@earendil-works/pi-coding-agent";
import { createDefaultSystemPromptOptions } from "./context-fixtures.js";
import type { PiAgentsContextFile } from "../../src/cursor-agents-context.js";

type PiBuildSystemPrompt = (options: BuildSystemPromptOptions) => string;
let cachedBuildSystemPrompt: PiBuildSystemPrompt | undefined;

export function buildInstalledPiSystemPrompt(options: BuildSystemPromptOptions): string {
	if (!cachedBuildSystemPrompt) {
		const piMain = fileURLToPath(import.meta.resolve("@earendil-works/pi-coding-agent"));
		const piPackageRoot = dirname(dirname(piMain));
		const require = createRequire(piMain);
		cachedBuildSystemPrompt = require(join(piPackageRoot, "dist/core/system-prompt.js"))
			.buildSystemPrompt as PiBuildSystemPrompt;
	}
	return cachedBuildSystemPrompt(options);
}

export function makeSystemPromptOptions(
	contextFiles: PiAgentsContextFile[],
	cwd = "/repo",
): NormalizedBuildSystemPromptOptions {
	return {
		...createDefaultSystemPromptOptions(cwd),
		contextFiles,
		selectedTools: [],
	};
}

/** Real installed-pi system prompt for the supplied project context files. */
export function buildPiSystemPromptWithContextFiles(
	contextFiles: PiAgentsContextFile[],
	cwd = "/repo",
): string {
	return buildInstalledPiSystemPrompt(makeSystemPromptOptions(contextFiles, cwd));
}
