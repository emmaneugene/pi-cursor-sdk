import { getCurrentTools, normalizeContext, type Context } from "@earendil-works/pi-ai";

/** Tool names from the provider context snapshot at stream start (not live pi.getActiveTools()). */
export function getActiveContextToolNames(context: Context): ReadonlySet<string> | undefined {
	const hasSystemMessage = context.messages.some((message) => message.role === "system");
	// Legacy raw contexts can omit the tool snapshot. A normalized transcript's
	// system messages are authoritative, including an explicitly empty tool set.
	if (!hasSystemMessage && context.tools === undefined) return undefined;
	const tools = getCurrentTools(normalizeContext(context).messages);
	return new Set(tools.map((tool) => tool.name));
}
