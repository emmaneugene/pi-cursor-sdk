import { describe, expect, it } from "vitest";
import { buildCursorPiBridgeMcpToolDescription } from "../src/cursor-bridge-contract.js";

describe("cursor bridge contract", () => {
	it("uses a one-line MCP description pointer instead of repeating the full contract", () => {
		const description = buildCursorPiBridgeMcpToolDescription({
			piToolDescription: "Ask the user a question.",
			piToolName: "sem_reindex",
			mcpToolName: "pi__sem_reindex",
		});
		expect(description).toContain("Ask the user a question.");
		expect(description).toContain("Call MCP name pi__sem_reindex (pi tool: sem_reindex)");
		expect(description).toContain("Full tool-surface rules are in the session bootstrap prompt.");
		expect(description).not.toContain("Pi bridge contract:");
	});
});
