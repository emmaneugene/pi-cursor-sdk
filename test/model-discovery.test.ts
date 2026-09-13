import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	discoverModels,
	buildCursorModelSelection,
	getCursorModelMetadata,
	getCursorModelMetadataEntries,
	__testUtils,
	type CursorModelFallbackIssue,
} from "../src/model-discovery.js";
import { saveCachedContextWindow, __testUtils as contextWindowCacheTestUtils } from "../src/context-window-cache.js";
import { FALLBACK_MODEL_ITEMS } from "../src/cursor-fallback-models.generated.js";

vi.mock("@cursor/sdk", () => ({
	Cursor: {
		models: {
			list: vi.fn(),
		},
	},
}));

import { Cursor } from "@cursor/sdk";
import type { ModelListItem } from "@cursor/sdk";

const mockedList = vi.mocked(Cursor.models.list);

function register(items: ModelListItem[]) {
	return __testUtils.registerModelItems(items);
}

function writeStoredCursorApiKey(apiKey: string): void {
	writeFileSync(
		join(process.env.PI_CODING_AGENT_DIR!, "auth.json"),
		JSON.stringify({ cursor: { type: "api_key", key: apiKey } }, null, 2),
	);
}

describe("discoverModels", () => {
	const originalEnv = process.env;
	const originalArgv = process.argv;
	let tmpAgentDir: string;

	beforeEach(() => {
		process.env = { ...originalEnv };
		delete process.env.CURSOR_API_KEY;
		tmpAgentDir = mkdtempSync(join(tmpdir(), "pi-cursor-discovery-"));
		process.env.PI_CODING_AGENT_DIR = tmpAgentDir;
		process.argv = ["node", "vitest"];
	});

	afterEach(() => {
		rmSync(tmpAgentDir, { recursive: true, force: true });
		process.env = originalEnv;
		process.argv = originalArgv;
		vi.clearAllMocks();
	});

	it("returns generated fallback models when no API key", async () => {
		delete process.env.CURSOR_API_KEY;
		const issues: CursorModelFallbackIssue[] = [];
		const models = await discoverModels({ onFallback: (issue) => issues.push(issue) });
		const modelIds = models.map((model) => model.id);
		expect(modelIds).toEqual(
			expect.arrayContaining([
				"claude-opus-4-7",
				"claude-opus-4-8",
				"claude-sonnet-4-6",
				"composer-2.5",
				"grok-4.6",
				"gpt-5.5",
			]),
		);
		expect(modelIds).toHaveLength(FALLBACK_MODEL_ITEMS.length);
		expect(issues).toEqual([
			expect.objectContaining({
				reason: "missing-api-key",
				message: expect.stringContaining("CURSOR_API_KEY"),
			}),
		]);
		expect(issues[0].message).toContain("/login");
		expect(issues[0].message).toContain("startup discovery does not parse Pi CLI arguments");
		expect(issues[0].message).toContain("fallback models can run once auth exists");
		expect(issues[0].message).toContain("/cursor-refresh-models");
		expect(issues[0].message).not.toContain("will fail until pi is restarted");
		expect(mockedList).not.toHaveBeenCalled();
	});

	it("returns fallback models and reports missing key when API key is whitespace", async () => {
		process.env.CURSOR_API_KEY = "   ";
		const issues: CursorModelFallbackIssue[] = [];
		const models = await discoverModels({ onFallback: (issue) => issues.push(issue) });
		expect(models.some((model) => model.id === "gpt-5.5")).toBe(true);
		expect(issues).toEqual([expect.objectContaining({ reason: "missing-api-key" })]);
		expect(mockedList).not.toHaveBeenCalled();
	});

	it("ignores adversarial Pi argv forms during startup discovery", async () => {
		process.argv = [
			"node", "pi", "--model", "anthropic/first", "--api-key", "first-key",
			"--MODEL", "cursor/case", "--API-KEY", "case-key",
			"--model=cursor/unsupported", "--api-key=equals-key",
			"--models", "cursor/list-like", "--provider", "cursor",
			"--model", "cursor/final", "--api-key", "last-key",
		];

		const models = await discoverModels();

		expect(models.some((model) => model.id === "composer-2.5")).toBe(true);
		expect(mockedList).not.toHaveBeenCalled();
	});

	it("uses an explicitly supplied provider-scoped refresh key", async () => {
		mockedList.mockResolvedValueOnce([
			{ id: "composer-2", displayName: "Composer 2", variants: [{ params: [], displayName: "Composer 2", isDefault: true }] },
		]);

		const models = await discoverModels({ apiKey: " explicit-key " });

		expect(mockedList).toHaveBeenCalledWith({ apiKey: "explicit-key" });
		expect(models.map((model) => model.id)).toEqual(["composer-2"]);
	});

	it("uses stored pi auth for model discovery when env and CLI are absent", async () => {
		writeStoredCursorApiKey("stored-key-123");
		mockedList.mockResolvedValueOnce([
			{
				id: "composer-2",
				displayName: "Composer 2",
				variants: [{ params: [], displayName: "Composer 2", isDefault: true }],
			},
		]);

		const models = await discoverModels();

		expect(mockedList).toHaveBeenCalledWith({ apiKey: "stored-key-123" });
		expect(models.map((model) => model.id)).toEqual(["composer-2"]);
	});

	it("prefers stored pi auth over CURSOR_API_KEY for model discovery", async () => {
		writeStoredCursorApiKey("stored-key-123");
		process.env.CURSOR_API_KEY = "env-key-123";
		mockedList.mockResolvedValueOnce([
			{
				id: "composer-2",
				displayName: "Composer 2",
				variants: [{ params: [], displayName: "Composer 2", isDefault: true }],
			},
		]);

		await discoverModels();

		expect(mockedList).toHaveBeenCalledWith({ apiKey: "stored-key-123" });
	});

	it.each(["CURSOR_API_KEY", "$CURSOR_API_KEY", "${CURSOR_API_KEY}", "pi-cursor-sdk-cursor-api-key-placeholder"])(
		"treats unresolved stored %s auth as missing when env is absent",
		async (placeholder) => {
			writeStoredCursorApiKey(placeholder);
			const issues: CursorModelFallbackIssue[] = [];

			const models = await discoverModels({ onFallback: (issue) => issues.push(issue) });

			expect(models.some((model) => model.id === "composer-2.5")).toBe(true);
			expect(issues).toEqual([expect.objectContaining({ reason: "missing-api-key" })]);
			expect(issues[0].message).toContain("/login");
			expect(mockedList).not.toHaveBeenCalled();
		},
	);

	it.each(["CURSOR_API_KEY", "$CURSOR_API_KEY", "${CURSOR_API_KEY}", "pi-cursor-sdk-cursor-api-key-placeholder"])(
		"resolves stored %s auth through the env var when present",
		async (placeholder) => {
			writeStoredCursorApiKey(placeholder);
			process.env.CURSOR_API_KEY = "env-key-123";
			mockedList.mockResolvedValueOnce([
				{
					id: "composer-2",
					displayName: "Composer 2",
					variants: [{ params: [], displayName: "Composer 2", isDefault: true }],
				},
			]);

			await discoverModels();

			expect(mockedList).toHaveBeenCalledWith({ apiKey: "env-key-123" });
		},
	);

	it("calls Cursor.models.list with API key and sorts by base id", async () => {
		process.env.CURSOR_API_KEY = "test-key-123";
		mockedList.mockResolvedValueOnce([
			{
				id: "model-b",
				displayName: "Model B",
				variants: [{ params: [], displayName: "Model B", isDefault: true }],
			},
			{
				id: "model-a",
				displayName: "Model A",
				variants: [{ params: [], displayName: "Model A", isDefault: true }],
			},
		]);
		const models = await discoverModels();
		expect(mockedList).toHaveBeenCalledWith({ apiKey: "test-key-123" });
		expect(models.map((model) => model.id)).toEqual(["model-a", "model-b"]);
		expect(models[0].name).toBe("Model A");
	});

	it("sorts canonical models and keeps each default variant's parameters", async () => {
		process.env.CURSOR_API_KEY = "test-key-123";
		mockedList.mockResolvedValueOnce([
			{
				id: "z-model",
				displayName: "Z Model",
				parameters: [{ id: "context", displayName: "Context", values: [{ value: "long" }, { value: "short" }] }],
				variants: [{ params: [{ id: "context", value: "short" }], displayName: "Z Model", isDefault: true }],
			},
			{
				id: "a-model",
				displayName: "A Model",
				parameters: [{ id: "context", displayName: "Context", values: [{ value: "300k" }, { value: "1m" }] }],
				variants: [{ params: [{ id: "context", value: "1m" }], displayName: "A Model", isDefault: true }],
			},
		]);

		const models = await discoverModels();

		expect(models.map((model) => model.id)).toEqual(["a-model", "z-model"]);
		expect(getCursorModelMetadata("a-model")?.defaultParams).toEqual([{ id: "context", value: "1m" }]);
		expect(getCursorModelMetadata("z-model")?.defaultParams).toEqual([{ id: "context", value: "short" }]);
	});




	it("registers one canonical model with Cursor's default context and fast parameters", async () => {
		process.env.CURSOR_API_KEY = "test-key-123";
		mockedList.mockResolvedValueOnce([
			{
				id: "gpt-5.4",
				displayName: "GPT-5.4",
				parameters: [
					{ id: "context", displayName: "Context", values: [{ value: "272k" }, { value: "1m" }] },
					{ id: "reasoning", displayName: "Reasoning", values: [{ value: "none" }, { value: "medium" }] },
					{ id: "fast", displayName: "Fast", values: [{ value: "false" }, { value: "true" }] },
				],
				variants: [{
					params: [
						{ id: "context", value: "1m" },
						{ id: "reasoning", value: "medium" },
						{ id: "fast", value: "false" },
					],
					displayName: "GPT-5.4",
					isDefault: true,
				}],
			},
		]);

		const models = await discoverModels();

		expect(models.map((model) => model.id)).toEqual(["gpt-5.4"]);
		expect(models[0]).toMatchObject({ name: "GPT-5.4", contextWindow: 1_000_000 });
		expect(getCursorModelMetadata("gpt-5.4")).toMatchObject({
			supportsFast: true,
			defaultFast: false,
		});
		expect(getCursorModelMetadata("gpt-5.4")?.defaultParams).toEqual([
			{ id: "context", value: "1m" },
			{ id: "reasoning", value: "medium" },
			{ id: "fast", value: "false" },
		]);
		expect(buildCursorModelSelection("gpt-5.4", "medium", true)).toEqual({
			id: "gpt-5.4",
			params: [
				{ id: "context", value: "1m" },
				{ id: "reasoning", value: "medium" },
				{ id: "fast", value: "true" },
			],
		});
	});
	it("does not encode reasoning, effort, or thinking into pi model IDs", async () => {
		process.env.CURSOR_API_KEY = "test-key-123";
		mockedList.mockResolvedValueOnce([
			{
				id: "gpt-5.3-codex",
				displayName: "GPT-5.3 Codex",
				parameters: [
					{ id: "reasoning", displayName: "Reasoning", values: [{ value: "high" }] },
					{ id: "fast", displayName: "Fast", values: [{ value: "false" }, { value: "true" }] },
				],
				variants: [
					{
						params: [
							{ id: "reasoning", value: "high" },
							{ id: "fast", value: "true" },
						],
						displayName: "GPT-5.3 Codex",
						isDefault: true,
					},
				],
			},
		]);
		const models = await discoverModels();
		expect(models.map((model) => model.id)).toEqual(["gpt-5.3-codex"]);
		expect(getCursorModelMetadata("gpt-5.3-codex")?.defaultParams).toEqual([
			{ id: "reasoning", value: "high" },
			{ id: "fast", value: "true" },
		]);
	});

	it("uses bundled SDK-derived context windows for models without context params", async () => {
		const tmpAgentDir = mkdtempSync(join(tmpdir(), "pi-cursor-context-window-bundled-"));
		process.env.PI_CODING_AGENT_DIR = tmpAgentDir;
		try {
			process.env.CURSOR_API_KEY = "test-key-123";
			mockedList.mockResolvedValueOnce([
				{
					id: "composer-2",
					displayName: "Composer 2",
					parameters: [{ id: "fast", displayName: "Fast", values: [{ value: "false" }, { value: "true" }] }],
					variants: [{ params: [{ id: "fast", value: "true" }], displayName: "Composer 2", isDefault: true }],
				},
				{
					id: "new-sdk-model",
					displayName: "New SDK Model",
					variants: [{ params: [], displayName: "New SDK Model", isDefault: true }],
				},
			]);

			const models = await discoverModels();

			expect(models.map((model) => [model.id, model.contextWindow])).toEqual([
				["composer-2", 200000],
				["new-sdk-model", 200000],
			]);
		} finally {
			rmSync(tmpAgentDir, { recursive: true, force: true });
		}
	});

	it("uses checkpoint evidence migrated from a former alias for its canonical model", () => {
		const sol = FALLBACK_MODEL_ITEMS.find(({ id }) => id === "gpt-5.6-sol");
		if (!sol) throw new Error("gpt-5.6-sol fallback fixture missing");

		expect(register([sol]).map(({ id, contextWindow }) => [id, contextWindow])).toEqual([
			["gpt-5.6-sol", 272000],
		]);
	});

	it("loads the context-window cache once while registering a model catalog", async () => {
		const tmpAgentDir = mkdtempSync(join(tmpdir(), "pi-cursor-context-window-count-"));
		process.env.PI_CODING_AGENT_DIR = tmpAgentDir;
		try {
			contextWindowCacheTestUtils.resetUserContextWindowOverrideLoadCount();
			process.env.CURSOR_API_KEY = "test-key-123";
			mockedList.mockResolvedValueOnce(
				Array.from({ length: 25 }, (_, index) => ({
					id: `synthetic-model-${index}`,
					displayName: `Synthetic Model ${index}`,
					variants: [{ params: [], displayName: `Synthetic Model ${index}`, isDefault: true }],
				})),
			);

			await discoverModels();

			expect(contextWindowCacheTestUtils.getUserContextWindowOverrideLoadCount()).toBe(1);
		} finally {
			rmSync(tmpAgentDir, { recursive: true, force: true });
		}
	});

	it("uses legacy default-context evidence for the canonical model", async () => {
		const tmpAgentDir = mkdtempSync(join(tmpdir(), "pi-cursor-context-window-qualified-"));
		process.env.PI_CODING_AGENT_DIR = tmpAgentDir;
		try {
			saveCachedContextWindow("gpt-5.5@1m", 950000);
			process.env.CURSOR_API_KEY = "test-key-123";
			mockedList.mockResolvedValueOnce([{
				id: "gpt-5.5",
				displayName: "GPT-5.5",
				parameters: [{ id: "context", displayName: "Context", values: [{ value: "1m" }, { value: "272k" }] }],
				variants: [{ params: [{ id: "context", value: "1m" }], displayName: "GPT-5.5", isDefault: true }],
			}]);

			const models = await discoverModels();

			expect(models.map((model) => [model.id, model.contextWindow])).toEqual([["gpt-5.5", 950000]]);
		} finally {
			rmSync(tmpAgentDir, { recursive: true, force: true });
		}
	});


	it("lets user cache override bundled context windows", async () => {
		const tmpAgentDir = mkdtempSync(join(tmpdir(), "pi-cursor-context-window-"));
		process.env.PI_CODING_AGENT_DIR = tmpAgentDir;
		try {
			saveCachedContextWindow("composer-2", 201000);
			process.env.CURSOR_API_KEY = "test-key-123";
			mockedList.mockResolvedValueOnce([
				{
					id: "composer-2",
					displayName: "Composer 2",
					parameters: [{ id: "fast", displayName: "Fast", values: [{ value: "false" }, { value: "true" }] }],
					variants: [{ params: [{ id: "fast", value: "true" }], displayName: "Composer 2", isDefault: true }],
				},
			]);

			const models = await discoverModels();

			expect(models.map((model) => [model.id, model.contextWindow])).toEqual([["composer-2", 201000]]);
		} finally {
			rmSync(tmpAgentDir, { recursive: true, force: true });
		}
	});

	it("ignores malformed context-window cache values", async () => {
		const tmpAgentDir = mkdtempSync(join(tmpdir(), "pi-cursor-context-window-malformed-"));
		process.env.PI_CODING_AGENT_DIR = tmpAgentDir;
		try {
			writeFileSync(contextWindowCacheTestUtils.getCachePath(), JSON.stringify({ contextWindows: { "composer-2": "201000" } }));
			process.env.CURSOR_API_KEY = "test-key-123";
			mockedList.mockResolvedValueOnce([
				{
					id: "composer-2",
					displayName: "Composer 2",
					variants: [{ params: [], displayName: "Composer 2", isDefault: true }],
				},
			]);

			const models = await discoverModels();

			expect(models.find((model) => model.id === "composer-2")?.contextWindow).toBe(200000);
		} finally {
			rmSync(tmpAgentDir, { recursive: true, force: true });
		}
	});

	it("sets reasoning false for models without thinking controls", async () => {
		process.env.CURSOR_API_KEY = "test-key-123";
		mockedList.mockResolvedValueOnce([
			{
				id: "gemini-3.1-pro",
				displayName: "Gemini 3.1 Pro",
				variants: [{ params: [], displayName: "Gemini 3.1 Pro", isDefault: true }],
			},
		]);
		const models = await discoverModels();
		expect(models[0].reasoning).toBe(false);
		expect(models[0].thinkingLevelMap).toBeUndefined();
	});

	it("maps Cursor reasoning values to pi thinking levels", async () => {
		process.env.CURSOR_API_KEY = "test-key-123";
		mockedList.mockResolvedValueOnce([
			{
				id: "gpt-5.4",
				displayName: "GPT-5.4",
				parameters: [
					{
						id: "reasoning",
						displayName: "Reasoning",
						values: [
							{ value: "none" },
							{ value: "minimal" },
							{ value: "low" },
							{ value: "medium" },
							{ value: "high" },
							{ value: "extra-high" },
						],
					},
				],
				variants: [
					{
						params: [{ id: "reasoning", value: "medium" }],
						displayName: "GPT-5.4",
						isDefault: true,
					},
				],
			},
		]);
		const models = await discoverModels();
		expect(models[0].thinkingLevelMap).toEqual({
			off: "none",
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "extra-high",
			max: null,
		});
	});

	it("maps boolean Cursor thinking values to off and high with explicit unsupported nulls", async () => {
		process.env.CURSOR_API_KEY = "test-key-123";
		mockedList.mockResolvedValueOnce([
			{
				id: "claude-haiku-4-5",
				displayName: "Haiku 4.5",
				parameters: [
					{
						id: "thinking",
						displayName: "Thinking",
						values: [{ value: "false" }, { value: "true" }],
					},
				],
				variants: [
					{
						params: [{ id: "thinking", value: "true" }],
						displayName: "Haiku 4.5",
						isDefault: true,
					},
				],
			},
		]);
		const models = await discoverModels();
		expect(models[0].thinkingLevelMap).toEqual({
			off: "false",
			minimal: null,
			low: null,
			medium: null,
			high: "true",
			xhigh: null,
			max: null,
		});
	});

	it("maps Claude effort with distinct xhigh and max values", async () => {
		process.env.CURSOR_API_KEY = "test-key-123";
		mockedList.mockResolvedValueOnce([
			{
				id: "claude-opus-4-7",
				displayName: "Opus 4.7",
				parameters: [
					{ id: "thinking", displayName: "Thinking", values: [{ value: "false" }, { value: "true" }] },
					{ id: "context", displayName: "Context", values: [{ value: "300k" }, { value: "1m" }] },
					{
						id: "effort",
						displayName: "Effort",
						values: [
							{ value: "low" },
							{ value: "medium" },
							{ value: "high" },
							{ value: "xhigh" },
							{ value: "max" },
							{ value: "extra-high" },
						],
					},
				],
				variants: [
					{
						params: [
							{ id: "thinking", value: "true" },
							{ id: "context", value: "1m" },
							{ id: "effort", value: "xhigh" },
						],
						displayName: "Opus 4.7",
						isDefault: true,
					},
				],
			},
		]);
		const models = await discoverModels();
		expect(models.map((model) => model.id)).toEqual(["claude-opus-4-7"]);
		expect(models[0].contextWindow).toBe(1000000);
		expect(models[0].thinkingLevelMap).toEqual({
			off: "false",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max",
		});
	});

	it("registers text and image input for Cursor models", async () => {
		process.env.CURSOR_API_KEY = "test-key-123";
		mockedList.mockResolvedValueOnce([
			{
				id: "vision-capable",
				displayName: "Vision Capable",
				variants: [{ params: [], displayName: "Vision Capable", isDefault: true }],
			},
		]);

		const models = await discoverModels();

		expect(models[0].input).toEqual(["text", "image"]);
	});

	it("maps reasoning off to unsupported null when Cursor exposes no none or off value", async () => {
		process.env.CURSOR_API_KEY = "test-key-123";
		mockedList.mockResolvedValueOnce([
			{
				id: "reasoning-only",
				displayName: "Reasoning Only",
				parameters: [
					{
						id: "reasoning",
						displayName: "Reasoning",
						values: [{ value: "low" }, { value: "medium" }, { value: "high" }],
					},
				],
				variants: [{ params: [{ id: "reasoning", value: "medium" }], displayName: "Reasoning Only", isDefault: true }],
			},
		]);

		const models = await discoverModels();

		expect(models[0].thinkingLevelMap).toEqual({
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null,
		});
		expect(buildCursorModelSelection("reasoning-only", "off")).toEqual({
			id: "reasoning-only",
			params: [{ id: "reasoning", value: "medium" }],
		});
	});

	it("maps boolean thinking plus effort to thinking=true with effort and off to thinking=false without effort", async () => {
		process.env.CURSOR_API_KEY = "test-key-123";
		mockedList.mockResolvedValueOnce([
			{
				id: "claude-like",
				displayName: "Claude Like",
				parameters: [
					{ id: "thinking", displayName: "Thinking", values: [{ value: "false" }, { value: "true" }] },
					{ id: "effort", displayName: "Effort", values: [{ value: "low" }, { value: "medium" }, { value: "high" }] },
				],
				variants: [
					{
						params: [
							{ id: "thinking", value: "true" },
							{ id: "effort", value: "medium" },
						],
						displayName: "Claude Like",
						isDefault: true,
					},
				],
			},
		]);

		const models = await discoverModels();

		expect(models[0].thinkingLevelMap).toEqual({
			off: "false",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null,
		});
		expect(buildCursorModelSelection("claude-like", "high")).toEqual({
			id: "claude-like",
			params: [
				{ id: "thinking", value: "true" },
				{ id: "effort", value: "high" },
			],
		});
		expect(buildCursorModelSelection("claude-like", "off")).toEqual({
			id: "claude-like",
			params: [{ id: "thinking", value: "false" }],
		});
	});

	it("keeps the fallback snapshot aligned with the current Composer 2.5 catalog shape", async () => {
		delete process.env.CURSOR_API_KEY;

		const models = await discoverModels();
		const modelIds = models.map((model) => model.id);

		expect(modelIds).toContain("composer-2.5");
		expect(modelIds).not.toContain("composer-2-5");
		expect(modelIds).not.toContain("composer-latest");
		expect(getCursorModelMetadata("composer-2.5")).toEqual(
			expect.objectContaining({
				contextWindow: 200000,
				supportsFast: true,
				defaultFast: true,
			}),
		);
		expect(buildCursorModelSelection("composer-2.5", "off")).toEqual({
			id: "composer-2.5",
			params: [{ id: "fast", value: "true" }],
		});
		expect(buildCursorModelSelection("composer-2.5", "off", false)).toEqual({
			id: "composer-2.5",
			params: [{ id: "fast", value: "false" }],
		});
	});

	it("falls back and reports discovery failure when Cursor.models.list throws", async () => {
		process.env.CURSOR_API_KEY = "test-key-123";
		const issues: CursorModelFallbackIssue[] = [];
		mockedList.mockRejectedValueOnce(new Error("network error"));
		const models = await discoverModels({ onFallback: (issue) => issues.push(issue) });
		expect(models.some((model) => model.id === "composer-2.5")).toBe(true);
		expect(issues).toEqual([
			expect.objectContaining({
				reason: "discovery-failed",
				message: expect.stringContaining("Cursor model discovery failed"),
			}),
		]);
		expect(issues[0].message).toContain("network error");
		expect(issues[0].errorMessage).toBe("network error");
		expect(issues[0].message).toContain("/login");
		expect(issues[0].message).not.toContain("test-key-123");
	});

	it("redacts sensitive values from fallback failure details", async () => {
		process.env.CURSOR_API_KEY = "test-key-123";
		const issues: CursorModelFallbackIssue[] = [];
		mockedList.mockRejectedValueOnce(
			new Error(
				'Unauthorized Bearer test-key-123 {"apiKey":"test-key-123","token":"token-value","session_id":"session-value"} https://repo-user:repo-p@ss@example.com/org/repo.git cookie: foo=bar; baz=qux',
			),
		);

		await discoverModels({ onFallback: (issue) => issues.push(issue) });

		expect(issues[0].reason).toBe("discovery-failed");
		expect(issues[0].message).toContain("Bearer [redacted]");
		expect(issues[0].message).toContain('"apiKey":"[redacted]"');
		expect(issues[0].message).toContain('"token":"[redacted]"');
		expect(issues[0].message).toContain('"session_id":"[redacted]"');
		expect(issues[0].message).toContain("cookie: [redacted]");
		expect(issues[0].errorMessage).toContain("Bearer [redacted]");
		expect(issues[0].message).not.toContain("test-key-123");
		expect(issues[0].message).not.toContain("token-value");
		expect(issues[0].message).not.toContain("session-value");
		expect(issues[0].message).not.toContain("repo-user");
		expect(issues[0].message).not.toContain("repo-p");
		expect(issues[0].message).not.toContain("@ss@");
		expect(issues[0].message).not.toContain("foo=bar");
		expect(issues[0].message).not.toContain("baz=qux");
	});

	it("falls back and reports empty model list when Cursor.models.list returns empty", async () => {
		process.env.CURSOR_API_KEY = "test-key-123";
		const issues: CursorModelFallbackIssue[] = [];
		mockedList.mockResolvedValueOnce([]);
		const models = await discoverModels({ onFallback: (issue) => issues.push(issue) });
		expect(models.some((model) => model.id === "claude-opus-4-8")).toBe(true);
		expect(issues).toEqual([
			expect.objectContaining({
				reason: "empty-model-list",
				message: expect.stringContaining("Cursor model discovery returned no models"),
			}),
		]);
		expect(issues[0].message).toContain("/login");
		expect(issues[0].message).toContain("/cursor-refresh-models");
	});

	it("uses id as name when displayName is missing", async () => {
		process.env.CURSOR_API_KEY = "test-key-123";
		mockedList.mockResolvedValueOnce([
			{ id: "raw-id", variants: [{ params: [], displayName: "raw-id", isDefault: true }] } as unknown as ModelListItem,
		]);
		const models = await discoverModels();
		expect(models[0].name).toBe("raw-id");
	});

	it("uses first variant when no isDefault is marked", async () => {
		process.env.CURSOR_API_KEY = "test-key-123";
		mockedList.mockResolvedValueOnce([
			{
				id: "test-model",
				displayName: "Test Model",
				parameters: [{ id: "reasoning", displayName: "Reasoning", values: [{ value: "low" }, { value: "high" }] }],
				variants: [
					{ params: [{ id: "reasoning", value: "low" }], displayName: "Test Model" },
					{ params: [{ id: "reasoning", value: "high" }], displayName: "Test Model" },
				],
			},
		]);
		const models = await discoverModels();
		expect(models[0].id).toBe("test-model");
		expect(buildCursorModelSelection("test-model", "off")).toEqual({
			id: "test-model",
			params: [{ id: "reasoning", value: "low" }],
		});
	});

});
