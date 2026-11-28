import { readStoredCredential } from "@earendil-works/pi-coding-agent";

export const CURSOR_API_KEY_ENV_VAR = "CURSOR_API_KEY";
const CURSOR_PROVIDER_ID = "cursor";

// Non-secret sentinel for pi's provider registry: pi treats `$ENV_VAR` as unconfigured when
// unset (hiding fallback models before `/login`), so real keys resolve at turn time.
export const CURSOR_API_KEY_CONFIG_VALUE = "pi-cursor-sdk-cursor-api-key-placeholder";

const CURSOR_API_KEY_PLACEHOLDERS = new Set([
	CURSOR_API_KEY_ENV_VAR,
	`$${CURSOR_API_KEY_ENV_VAR}`,
	`\${${CURSOR_API_KEY_ENV_VAR}}`,
	CURSOR_API_KEY_CONFIG_VALUE,
]);

export function resolveCursorApiKey(apiKey?: string): string | undefined {
	const trimmed = apiKey?.trim();
	if (!trimmed) return undefined;
	if (CURSOR_API_KEY_PLACEHOLDERS.has(trimmed)) return process.env.CURSOR_API_KEY?.trim() || undefined;
	return trimmed;
}

function getStoredCursorApiKey(): string | undefined {
	try {
		const credential = readStoredCredential(CURSOR_PROVIDER_ID);
		return resolveCursorApiKey(credential?.type === "api_key" ? credential.key : undefined);
	} catch {
		return undefined;
	}
}

export function resolveCursorRuntimeApiKey(): Promise<string | undefined> {
	return Promise.resolve(getStoredCursorApiKey() ?? resolveCursorApiKey(process.env.CURSOR_API_KEY));
}
