# pi-cursor-sdk radical simplification plan

Goal: cut the fork to the smallest integration that still works well.
Status: Slice 0 APPROVED (in progress). Slices 1–3 pending slow review.
Sign-off: [x] Slice 0 · [ ] Slice 1 · [ ] Slice 2 · [ ] Slice 3

Rule for every slice: land code + tests + docs + AGENTS.md map entries together.
Validation baseline for every slice: `npm test`, `npm run typecheck`,
`npm pack --dry-run`. Live smoke only where noted (repo pre-commit rule).

## Slice 0 — No-UX-change refactors + dead env vars (safe first)

No user-visible behavior changes. No release note needed.

### R1: build each completed tool display once (S4, high confidence)
- `src/provider-turn-coordinator.ts` (~:273): build display once,
  pass to router instead of rebuilding.
- `src/provider-turn-display-router.ts` (~:71-72): route first;
  format/scrub transcript only for `transcript_trace` or enabled debug.
- Validation: existing replay/routing/transcript tests stay green; add a
  focused test proving native-replay path formats no transcript unless
  debugging. Trace output must stay byte-for-byte stable.

### R2: derive replay source names from the presentation registry (S4, medium)
- Delete `src/cursor-replay-source-names.ts` (33 lines).
- Move `CursorReplaySourceToolName` + known-name array + activity guard into
  `src/tool-presentation-registry.ts`, derived from
  `CURSOR_TOOL_PRESENTATION_SPECS`.
- Update `src/replay-tool-details.ts` imports; keep persisted parser.
- Risk: literal-union inference, import cycles.
- NOTE: if Slice 3 is approved, R2 happens inside it instead (the registry
  is rewritten there). Do not do both.

### R3: shared probe library for debug scripts (S6, medium)
- New `scripts/lib/` module: shared CLI parsing, artifact-root safety,
  redaction, summary writing.
- Keep `scripts/debug-sdk-events.mjs` + `scripts/debug-provider-events.mjs`
  as thin runners; artifact schemas unchanged.

### Dead env vars (test-side only — planners overclaimed here)
- Ground truth: `src/` never reads any legacy `PI_CURSOR_*` var, and
  sealed-env self-tests (steering/tmux/visual/isolated) assert the sealed
  child env stays clean. Those clear-lists and self-tests STAY — they guard
  isolation, and deleting entries would break the guards.
- `PI_CURSOR_SETTING_SOURCES` is a live smoke-launcher input (translated to
  explicit config, never inherited). It STAYS, including the cli-args default.
- Removed: ~84 inert `process.env.PI_CURSOR_* = ...` assignments plus
  save/delete/restore scaffolding across 18 test files, 16 dead `delete`
  lines, the harness reset block, the unreferenced src
  `CURSOR_SETTING_SOURCES_ENV` const, and one misleading test title.
- KEEP: internal `PI_CURSOR_SDK_EVENT_DEBUG_RUN_DIR`,
  `PI_CURSOR_SDK_EVENT_DEBUG_SESSION_DIR`, `PI_CURSOR_BRIDGE_TOOL_CALL_ID`.
- CHANGELOG history mentions stay (release history, not a support claim).

## Slice 1 — Config trim (removes keys; needs release note)

Hardcode sane defaults, delete the knobs + their tests + docs rows:

| Key | Hardcode to | Touch points |
|---|---|---|
| `tools.mcp.callTimeoutMs` | 1 hour | config, timeout-override, prepare, bridge-config, README, ux-spec, 3 test files |
| `tools.mcp.connectTimeoutMs` | 10 s | same area |
| `tools.bridge.debug.stderr/file` | off/unset | diagnostics, run, config, README, checklists |
| `tools.manifest` | always on | manifest, prepare, `/cursor-tools` report, prompt tests, docs |
| `tools.bridge.callTimeoutMs` | effective MCP timeout (fail-closed internally) | run, config, call-timeout tests, harness option |
| `models.cache.enabled/ttlMs` | on / 24 h | list-cache, discovery, README, cache tests |

KEPT deliberately (planner-verified as real user control, not tuning):
`tools.bridge.enabled`, `tools.bridge.exposeBuiltins`, `tools.bridge.exclude`
(per-tool safety denylist), `local.transport` + `/cursor-http` (VPN/proxy
recovery), `local.settingSources`, `local.preservePiAgentsContext`,
`local.autoReview` + `--cursor-auto-review`, `local.sandbox` +
`--cursor-sandbox`, `models.fastDefaults` + fast flags/commands, cursor mode,
`debug.sdkEvents.*`.
No slash command dies except none — `/cursor-tools` stops reporting removed
fields. Parser tests must reject/ignore removed keys; add fixed-default tests.

## Slice 2 — Delete local resume family (~4.8k lines)

Every session starts a fresh SDK agent; first post-restart turn bootstraps
from Pi transcript. Same-process pooling, incremental sends, 20-send
rebootstrap, 5-min idle eviction all stay.

KILL src (~1.0k): `session-agent-resume.ts` (514),
`session-agent-cleanup.ts` (388),
`session-agent-lineage.ts` (137, only if forensic history is in scope —
product decision below).
EDIT src: `index.ts` (registrations), `session-agent.ts` (always
`Agent.create()`, drop lease/resume fields), `session-store.ts`
(collapse to derived session store only — store still needed live),
`session-send-policy.ts` (drop `process_resume` reason),
`provider-turn-prepare.ts` / `-send.ts` / `-types.ts` /
`-run-finalizer.ts` / `live-run-coordinator.ts` / `live-run-drain.ts`
(resume-notice plumbing), `session-compaction-prep.ts` (keep
release+reset, drop suppression), `config.ts` (`local.resume`),
`runtime-state.ts` (`--cursor-local-resume/--no-local-resume`),
`state.ts` (`/cursor-local-resume-cleanup`), smoke-env lib.
DELETE tests (~2.3k): resume, cleanup, local-resume (×2), lineage (×3).
SHRINK tests: session-agent, store, compaction-prep, config, state,
index-registration, stream-config, maintainer-scripts-lib,
smoke-cli-package-contracts, turn-prepare, provider harness + extension kit.
DELETE scripts (~1.4k): `local-resume-smoke.mjs`,
`local-resume-cleanup-smoke.mjs`, `lib/local-resume-smoke-harness.mjs`,
`lib/local-resume-suites.mjs` + d.mts, + 10 `package.json` selectors.
DOCS: README resume/cleanup sections + config reference row; ux-spec
invariants; testing-lessons + live-smoke-checklist mentions.
MIGRATION: old `cursor-sdk-agent-resume/-cleanup/-lineage` JSONL entries
become inert (Pi ignores unscanned custom types). Add one regression test:
reopen a session containing all three retired entry types, complete a fresh
bootstrap turn.
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
`native-tool-display-replay.ts`, `native-tool-names.ts`,
`replay-activity-builders.ts`, `replay-summary-args.ts`,
`replay-tool-details.ts` (after incomplete path stops building details).
KEEP: transcript formatters/utils, result readers, web modules, skill tool,
task-presentation (independent — transcript headers, not cards),
incomplete/lifecycle/visibility policy (rewired to direct traces).
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

1. Slice 0 first (independent; R2 folds into Slice 3 if approved).
2. Slice 1 next (shrinks config/tests Slices 2–3 must touch).
3. Slices 2 and 3 in either order (disjoint file sets except
   `provider-local-resume.test.ts` replay setup and shared
   `config`/`state` tests — coordinate).
4. Open product decisions: lineage in/out of Slice 2; confirm KEEP list in
   Slice 1 (transport, exclude).

## Size of the prize (approx, planner-measured)

| Slice | src | tests | scripts | total |
|---|---|---|---|---|
| 2 resume | ~1.0k | ~2.3k+shrink | ~1.4k | ~4.8k |
| 3 replay | ~1.9k+edits | ~4.9k+shrink | — | ~7k+ |
| 1 config | edits | shrink | — | surface: −8 keys |
| 0 refactors/env | −33 | +cover | — | −25 env names |
