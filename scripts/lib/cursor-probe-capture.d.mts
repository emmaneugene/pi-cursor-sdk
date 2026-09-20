export declare const RAW_PROBE_ARTIFACT_WARNING: string;

export declare function isProbeMainModule(metaUrl: string): boolean;

export declare function readInstalledPackageVersion(
	require: NodeJS.Require,
	packageName: string,
): string;

export declare function ensureArtifactDir(dir: string): string;

export declare function writeJsonArtifact(path: string, value: unknown): void;

export declare function printJsonSummary(summary: unknown): void;
