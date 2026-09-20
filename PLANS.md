# pi-cursor-sdk radical simplification plan

Goal: cut the fork to the smallest integration that still works well.
Status: Slice 2 implemented (uncommitted). Slice 3 pending owner review.
Sign-off: [x] Slice 2 · [ ] Slice 3

Landed outside this file (do not redo):
- Slice 0 (display-once routing, registry-owned replay source names, probe helper,
  inert test-side `PI_CURSOR_*` cleanup). R2 already folded the replay-name list
  into `src/tool-presentation-registry.ts`.
- Filename `cursor-` strip and small `src/` pass-through merges.

Cancelled: Slice 1 config trim. Keep every `cursor-sdk.json` key, including MCP
timeouts, bridge debug/call timeout, tools manifest, and model-cache knobs.

Rule for every remaining slice: land code + tests + docs + AGENTS.md map entries
together.
Validation baseline: `npm test`, `npm run typecheck`, `npm pack --dry-run`.
Live smoke only where noted (repo pre-commit rule).

## Slice 2 — Delete local resume family (~4.8k lines)

Every session starts a fresh SDK agent; first post-restart turn bootstraps
from Pi transcript. Same-process pooling, incremental sends, 20-send
rebootstrap, 5-min idle eviction all stay.

KILL src (~0.9k): `session-agent-resume.ts` (514),
`session-agent-cleanup.ts` (388).
KEEP: `session-agent-lineage.ts` — silent `cursor-sdk-agent-lineage` JSONL
log of each local `agentId` at `Agent.send()`. Owner: keep for now.
`isCursorLocalAgentId` currently lives in the resume module; move it into
lineage (or a tiny shared helper) when resume dies. Do not delete lineage
tests.
EDIT src: `index.ts` (drop resume/cleanup registrations; keep lineage),
`session-agent.ts` (always `Agent.create()`, drop lease/resume fields),
`session-store.ts` (collapse to derived session store only — store still
needed live), `session-send-policy.ts` (drop `process_resume` reason),
`provider-turn-prepare.ts` / `-send.ts` / `-types.ts` /
`-run-finalizer.ts` / `live-run-coordinator.ts` / `live-run-drain.ts`
(resume-notice plumbing), `session-compaction-prep.ts` (keep
release+reset, drop suppression), `config.ts` (`local.resume`),
`runtime-state.ts` (`--cursor-local-resume/--no-local-resume`),
`state.ts` (`/cursor-local-resume-cleanup`), smoke-env lib.
DELETE tests (~2.3k minus lineage): resume, cleanup, local-resume (×2).
SHRINK tests: session-agent, store, compaction-prep, config, state,
index-registration, stream-config, maintainer-scripts-lib,
smoke-cli-package-contracts, turn-prepare, provider harness + extension kit.
DELETE scripts (~1.4k): `local-resume-smoke.mjs`,
`local-resume-cleanup-smoke.mjs`, `lib/local-resume-smoke-harness.mjs`,
`lib/local-resume-suites.mjs` + d.mts, + 10 `package.json` selectors.
DOCS: README resume/cleanup sections + config reference row; ux-spec
invariants; testing-lessons + live-smoke-checklist mentions.
MIGRATION: old `cursor-sdk-agent-resume` / `-cleanup` JSONL entries become
inert (Pi ignores unscanned custom types). `cursor-sdk-agent-lineage`
entries stay live. Add one regression test: reopen a session containing
retired resume/cleanup entries plus a lineage entry, complete a fresh
bootstrap turn, and still record a new lineage id.
LOST: Cursor-native agent continuity across restarts (SDK-side state);
first post-restart turn costs a full bootstrap (unmeasured — no benchmark
exists). Pi transcript history is NOT lost.
LIVE SMOKE (repo rule, runtime change): reopen-session new-agentId check +
print-mode run + `smoke:visual` release-check.

## Slice 3 — Transcript-only display (~7k+ lines)

All Cursor host tools render as bounded transcript thinking text. No replay
cards, no `cursor-replay-*` tool calls in new sessions.
Example: a read renders `read package.json` + bounded content, not a card.

KILL src (~1.9k): `native-replay-routing.ts`,
`native-replay-trace.ts`, `native-tool-display-registration.ts`,
`native-tool-display-state.ts`, `native-tool-display-tools.ts`,
`native-tool-display-replay.ts`,
`replay-activity-builders.ts`, `replay-summary-args.ts`,
`replay-tool-details.ts` (after incomplete path stops building details).
KEEP: transcript formatters/utils, result readers, web modules, skill tool,
task-presentation (independent — transcript headers, not cards),
incomplete/lifecycle/visibility policy (rewired to direct traces).
Do not re-derive replay source names from the registry (already in the
registry from Slice 0).
EDIT src: display-router (trace-only), coordinator (transcript fingerprint),
live-run-drain + live-run-coordinator (drop card transport, keep bridge
drain), turn-prepare/types/send + debug (drop replay metadata), registry
(drop replay policy, keep aliases/visibility/bridge exclusions),
transcript-specs (drop display builders), tool-transcript (drop display
builder), context.ts (drop replay labels), bridge-snapshot (drop replay
check), tool-manifest wording, index.ts registrations.
CONFIG: delete `tools.display.native` (config, state, smoke runner,
contracts test). KEEP `tools.display.taskPresentation`.
DELETE tests (~4.9k): 13 replay/card test files incl. `index-native-tools`
(758). SHRINK ~22 files (bridge, coordinator, debug, transcript-bounds,
stream-events, smoke contracts…).
DOCS: delete `native-tool-replay.md` (keep bridge-only pages if
uncovered), replace `native-tool-visual-audit.md` with a short generic
guide, rewrite ux-spec card sections, README card claims, AGENTS.md map
entries.
MIGRATION: no JSONL rewrite; old entries stay schema-valid. UNVERIFIED: how
Pi 0.86 renders historical `cursor-replay-*` cards after registrations
disappear — verify with an old session pre-release.
LIVE SMOKE (repo rule, replay change): print-mode proof (trace text, no
`toolCall` card) + `smoke:visual` with rewritten fixture (text trace, no
`cursor-replay-*` IDs, bridged tool still exactly one real call).

## Order + dependencies

Slices 2 and 3 can run in either order. File sets are disjoint except
shared `config`/`state` tests — coordinate those if both slices are in flight.

## Size of the prize (approx, planner-measured)

| Slice | src | tests | scripts | total |
|---|---|---|---|---|
| 2 resume | ~0.9k | ~2.3k+shrink (lineage tests stay) | ~1.4k | ~4.6k |
| 3 replay | ~1.9k+edits | ~4.9k+shrink | — | ~7k+ |
