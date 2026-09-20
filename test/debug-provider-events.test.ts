import { describe, expect, it } from "vitest";
import {
	buildDebugProviderEventsChildEnv,
	parseDebugProviderEventsArgs,
} from "../scripts/debug-provider-events.mjs";
import { CURSOR_SDK_EVENT_DEBUG_INTERNAL_RUN_DIR_ENV } from "../shared/cursor-sdk-event-debug-env.mjs";

describe("debug-provider-events maintainer probe", () => {
	it("parses args with api key from env", () => {
		expect(
			parseDebugProviderEventsArgs(["--prompt", "hello", "--out", "/tmp/out"], {
				CURSOR_API_KEY: "key",
			}),
		).toMatchObject({
			prompt: "hello",
			out: "/tmp/out",
			apiKey: "key",
		});
	});

	it("keeps the run-dir pin while clearing stale debug vars", () => {
		const env = buildDebugProviderEventsChildEnv(
			{
				HOME: "/home/user",
				PI_CURSOR_SDK_EVENT_DEBUG_DIR: "/stale/dir",
				PI_CURSOR_SDK_EVENT_DEBUG_STDERR: "1",
				[CURSOR_SDK_EVENT_DEBUG_INTERNAL_RUN_DIR_ENV]: "/stale/pin",
			},
			{
				apiKey: "probe-key",
				agentDir: "/tmp/out/pi-agent",
				artifactDir: "/tmp/out",
			},
		);
		expect(env[CURSOR_SDK_EVENT_DEBUG_INTERNAL_RUN_DIR_ENV]).toBe("/tmp/out");
		expect(env.CURSOR_API_KEY).toBe("probe-key");
		expect(env.PI_CODING_AGENT_DIR).toBe("/tmp/out/pi-agent");
		expect(env.HOME).toBe("/home/user");
		expect(env.PI_CURSOR_SDK_EVENT_DEBUG_DIR).toBeUndefined();
		expect(env.PI_CURSOR_SDK_EVENT_DEBUG_STDERR).toBeUndefined();
	});

	it("does not mutate the input env", () => {
		const envInput = { CURSOR_API_KEY: "key" };
		buildDebugProviderEventsChildEnv(envInput, {
			apiKey: "probe-key",
			agentDir: "/tmp/out/pi-agent",
			artifactDir: "/tmp/out",
		});
		expect(envInput).toEqual({ CURSOR_API_KEY: "key" });
	});
});
