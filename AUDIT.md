# Codebase simplification audit — 2026-09-18

Read-only audit of `pi-cursor-sdk` at `main`. 16 subsystem reviews (Grok 4.6, GPT Sol, GLM Flash, DeepSeek Flash), each finding verified by the coordinator with grep/read, then an independent GPT Sol meta-review for coverage, overlap, materiality, and ranking. No tests or builds were run. Line deltas are estimates.

## Summary

The remaining runtime work has no single large structural simplification. The recommendations focus on parallel state, compatibility shapes, and generated model metadata. Folding the many <50-line modules into their callers would move lines, not delete them; no worker recommended it.

## Ranked recommendations

### 7. Model catalog (S02, S01)

- **Verdict:** recommend (7b); correctness note (7c)
- **7b Snapshot projection.** `scripts/refresh-cursor-model-snapshots.mjs:88-115` copies the full SDK DTO; `model-list-cache.ts:45-92` re-validates it; `model-discovery.ts` consumes only IDs, model display name, parameter IDs/values, variant params/default marker, variant display name. The generated file has 589 `displayName` fields and 30 alias blocks for 37 models. One shared parser/projector for live, cached, and snapshot input, dropping aliases, descriptions, and parameter/value display names. ≈ −300 to −600 generated lines, −10 to −30 handwritten. Risk: existing version-1 cache files must stay readable or need a version bump. Validation: `test/model-list-cache.test.ts`, `test/model-discovery*.test.ts`, `test/cursor-model-snapshot-context.test.ts`. Confidence medium.
- **7c Correctness backlog.** `src/index.ts:116` sets `activeCursorProviderModels` on load; `/cursor-refresh-models` (`:137-149`) re-registers the owner provider but does not update it, so a nested child factory loaded after refresh (`:99-103`) receives the startup catalog. One assignment fixes it. Not a simplification.

### 8. `cursor-state.ts` triple duplication (S03)

- **Verdict:** recommend
- **Evidence:** restore loops `restoreSessionFastPreferences` (:113-125), `restoreSessionCursorMode` (:127-136), `restoreSessionCursorHttp1` (:146-155); persist-with-rollback `persistFastPreference` (:216-241) and `persistCursorHttp1Preference` (:261-284); command epilogues `cursor-fast` (:398-419) and `cursor-http` (:447-477).
- **Current complexity:** ~95 lines of parallel copies of one concept (session-scoped preference log); the `authoritativeGlobalFastPreferenceIds` set vs `cursor-http1.ts` single authoritative flag is easy to mis-copy.
- **Proposed representation:** two private helpers in the same file: `lastBranchEntryData(branch, customType, guard)` and `persistSessionGlobalPreference({ apply, revert, save, appendEntry, onAppendFailure })`. ≈ −40 to −55 lines, no new module.
- **Scope:** `src/cursor-state.ts` only.
- **Risks:** helpers must stay trivial to remain net-negative. Preserve rollback ordering and the "invalid mode keeps `cliCursorModeState`" exception.
- **Validation:** `test/cursor-fast-persistence.test.ts`, `test/cursor-http1-state.test.ts`, `test/cursor-state.test.ts`, `test/cursor-http1.test.ts`, `test/cursor-local-force.test.ts`.
- **Confidence:** medium

### 9. Lifecycle emitter per-call record (S06)

- **Verdict:** recommend
- **Evidence:** `src/cursor-provider-turn-lifecycle-emitter.ts:30-35` keeps six parallel collections per call; `maybeSchedule` (:66-94) writes four plus a timer; `cancel`/`clearLifecycleIdentity` (:97-127) reverse the pairs; the duplicate-progress-text skip (:80-88) deletes the timer and returns without clearing identity.
- **Current complexity:** invalid combinations are representable (timer without reverse map, fingerprint owner with no timer and no emit).
- **Proposed representation:** one `Map<callId, { fingerprint, progressText, timer }>` plus two uniqueness indexes and an `emitted` set; `cancel` drops one record and unindexes if the call still owns. ≈ −15 to −25 lines.
- **Scope:** `src/cursor-provider-turn-lifecycle-emitter.ts` only; `maybeSchedule`/`cancel`/`clear` unchanged.
- **Risks:** `duplicate-active-fingerprint` and `duplicate-active-progress-text` skip reasons are load-bearing; clearing identity on progress skip would let a later same-fingerprint call schedule.
- **Validation:** `test/cursor-provider-tool-lifecycle.test.ts`, `test/cursor-tool-lifecycle.test.ts`, `test/cursor-provider-task-progress.test.ts`. Add an emitter unit test (none exists) for same-fingerprint skip, same-progress-text skip, cancel-then-reschedule.
- **Confidence:** high

### 10. Debug sink counters (S13)

- **Verdict:** recommend
- **Evidence:** `src/cursor-sdk-event-debug.ts:237-251` declares 13 counter fields; `:515-529` copies them by hand into the summary; `:550-572` three identical `append*Jsonl` methods; `:589-605` `appendJsonl` already takes the bucket as a parameter; `:396` `recordError` passes a throwaway bucket that is discarded.
- **Proposed representation:** `counts: Record<string, Record<string, number>>` with a `bucket(name)` accessor, one `appendPhased(bucket, layer, phase, payload)`, and `errorCount` kept numeric. `summary.counts` keys unchanged. ≈ −35 lines.
- **Scope:** `src/cursor-sdk-event-debug.ts` private members only.
- **Risks:** `summary.counts` is a persisted artifact contract; keys must match exactly.
- **Validation:** `test/cursor-sdk-event-debug.test.ts`, `test/cursor-provider-debug-artifacts.test.ts`; add an assertion on `Object.keys(summary.counts)`.
- **Confidence:** medium-high

### 11. Replay expandable details typed by variant (S10)

- **Verdict:** recommend
- **Evidence:** `src/cursor-native-tool-display-replay.ts:405-420` `CursorReplayExpandableResultDetails` is a flat optional bag (image + edit diff + write content on one object); `src/cursor-replay-tool-details.ts:89-94` already defines the variant union; `cursor-native-tool-display-replay.ts:228-282` duplicates edit vs write preview (`details.diffString ?? details.diff`, then write adds `fileContentAfterWrite`); `:504-533` routes generateImage and activity through the same renderer.
- **Proposed representation:** type the expandable renderer as `CursorReplayActivityDetails | CursorReplayGenerateImageDetails`, narrow on `variant`, merge the two preview helpers, delete the bag type. ≈ −25 to −40 lines.
- **Scope:** `src/cursor-native-tool-display-replay.ts` only.
- **Risks:** activity edit/write cards must still color from `diffString`/`diff` and fall back to `expandedText`; nativeEdit/nativeWrite keep their own renderers.
- **Validation:** `test/cursor-native-tool-display-replay.test.ts`, `test/cursor-replay-tool-details.test.ts`, `test/cursor-replay-tool-details.compile.test.ts`.
- **Confidence:** high

### 12. `package.json` `files` (S16)

- **Verdict:** recommend
- **Evidence:** `package.json` lists 37 `scripts/...` entries, one for every current file under `scripts/`. `dist`, `shared`, and `src` already use directory entries.
- **Proposed representation:** one `"scripts"` entry. ≈ −36 lines, identical pack set.
- **Risks:** untracked stray files under `scripts/` would ship; none today.
- **Validation:** `test/maintainer-scripts-declarations.test.ts` (expands directory entries), `test/smoke-cli-package-contracts.test.ts`; diff `npm pack --dry-run --json` before/after.
- **Confidence:** high

### 13. Docs and `AGENTS.md` map drift (S17)

- 23 `src/` files are absent from the map: `cursor-active-tools`, `cursor-agent-message-web-tools`, `cursor-api-key`, `cursor-compact-tool-summary`, `cursor-display-only-trace`, `cursor-fallback-models.generated`, `cursor-live-run-accounting`, `cursor-native-tool-names`, `cursor-pi-tool-bridge-constants`, `cursor-provider-overflow`, `cursor-replay-activity-builders`, `cursor-replay-source-names`, `cursor-replay-summary-args`, `cursor-replay-tool-details`, `cursor-sdk-process-error-guard`, `cursor-sdk-runtime`, `cursor-session-agent-resume`, `cursor-session-turn-queue`, `cursor-skill-tool`, `cursor-task-presentation`, `cursor-web-tool-activity`, `cursor-web-tool-args`, `model-list-cache`.
- `docs/evidence/*` contains July–August 2026 records although `AGENTS.md` says superseded evidence should be deleted or folded into current docs.

## Best next slices (one small PR each)

1. #7b snapshot projection.

## Cross-cutting patterns

1. One entity, several containers: six lifecycle maps, five pool collections, and 13 counter fields.
2. Compatibility shapes stay at the resume parser, not in downstream cleanup.
3. The generated model snapshot remains large relative to its runtime projection.
4. `AGENTS.md` map drift (see #13).

## Subsystem coverage

| ID | Subsystem | Boundary | Result |
|---|---|---|---|
| S01 | Entry, factory guard, lifecycle hooks | `index.ts`, `cursor-extension-factory-guard.ts`, `cursor-provider-runtime-context.ts`, `cursor-provider-lazy.ts`, `cursor-model-lifecycle.ts`, `cursor-fallback-warning.ts`, `cursor-agents-context*.ts`, `cursor-model.ts`, `cursor-sdk-runtime.ts`, `cursor-active-tools.ts` | correctness note only (#7c) |
| S02 | Model discovery, caches, snapshot | `model-discovery.ts`, `model-list-cache.ts`, `cursor-fallback-models.generated.ts`, `bundled-context-windows.ts`, `context-window-cache.ts`, `shared/cursor-model-selection-identities.*`, `scripts/refresh-cursor-model-snapshots.mjs` | cache read consolidated; recommend (#7b) |
| S03 | Config, state controls, HTTP/1.1 | `cursor-config.ts`, `cursor-state.ts`, `cursor-runtime-state.ts`, `cursor-http1.ts`, `cursor-setting-sources.ts`, `shared/cursor-setting-sources.*`, `cursor-api-key.ts`, `cursor-task-presentation.ts` | recommend (#8) |
| S04 | Prompt/context, bootstrap surfaces | `context.ts`, `cursor-context-tools.ts`, `cursor-tool-manifest.ts`, `cursor-bridge-contract.ts`, `cursor-skill-tool.ts`, `cursor-provider-overflow.ts` | plan-flag finding rejected |
| S05 | Turn pipeline, outcomes, errors | `cursor-provider.ts`, `cursor-provider-turn-{runner,prepare,send,finalize,emit,types}.ts`, `cursor-provider-run-{outcome,finalizer}.ts`, `cursor-run-final-text.ts`, `cursor-provider-errors.ts`, `cursor-mcp-timeout-override.ts`, `cursor-sdk-process-error-guard.ts` | turn plumbing removed |
| S06 | Turn coordinator, normalization | `cursor-provider-turn-{coordinator,shell-output,tool-ledger,sdk-normalizer,display-router,lifecycle-emitter}.ts`, `cursor-tool-lifecycle.ts`, `cursor-partial-content-emitter.ts`, `cursor-incomplete-tool-visibility.ts`, `cursor-display-only-trace.ts` | recommend (#9) |
| S07 | Session agents, resume, store, scope | `cursor-session-agent*.ts`, `cursor-session-store.ts`, `cursor-session-scope.ts`, `cursor-session-compaction-prep.ts`, `cursor-session-send-policy.ts`, `cursor-session-turn-queue.ts`, `cursor-durable-fs.ts`, `cursor-sdk-platform-package.ts` | cleanup candidates normalized; pool slot-map demoted |
| S08 | Live run coordinator, drain, routing | `cursor-live-run-coordinator.ts`, `cursor-provider-live-run-drain.ts`, `cursor-live-run-accounting.ts`, `cursor-native-replay-routing.ts` | **skip** — a `running/finished/cancelled/error` union would add 40–80 lines and touch out-of-boundary mutators |
| S09 | Tool registry, transcript formatting | `cursor-tool-presentation-registry.ts`, `cursor-transcript-*.ts`, `cursor-tool-transcript.ts`, `cursor-tool-result-display-readers.ts`, `cursor-tool-visibility.ts`, `cursor-native-tool-names.ts`, `cursor-display-text.ts`, `cursor-record-utils.ts`, `cursor-edit-diff.ts`, `cursor-compact-tool-summary.ts`, `cursor-web-tool-*.ts`, `cursor-agent-message-web-tools.ts`, `cursor-replay-source-names.ts` | read preview consolidated |
| S10 | Native replay cards | `cursor-native-tool-display-*.ts`, `cursor-native-replay-trace.ts`, `cursor-replay-{activity-builders,summary-args,tool-details}.ts` | recommend (#11) |
| S11 | Pi tool bridge | `cursor-pi-tool-bridge*.ts` | dead surface removed |
| S12 | Usage accounting | `cursor-usage-accounting.ts`, `cursor-sdk-billed-usage.ts` | guard merge demoted |
| S13 | Debug artifacts, output filter, scrubbing | `cursor-sdk-event-debug*.ts`, `shared/cursor-sdk-event-debug-env.*`, `cursor-sdk-output-filter.ts`, `shared/cursor-sdk-output-filter.*`, `cursor-sensitive-text.ts`, `shared/cursor-sensitive-text.*` | recommend (#10); allocation union rejected; output filter and scrubbing clean |
| S14 | Maintainer smoke scripts | `scripts/*.mjs`, `scripts/*.sh`, `scripts/lib/*` (except `ensure-built.mjs`), `scripts/fixtures/*`, `.d.mts` siblings | smoke env options consolidated; no unused entrypoints |
| S16 | Build, packaging, test helpers | `scripts/build.mjs`, `scripts/prepare.mjs`, `scripts/lib/ensure-built.mjs`, `package.json`, `tsconfig*.json`, `vitest.config.ts`, `test/helpers/*`, `test/fixtures/*` | recommend (#12); build race-safety removal rejected; harnesses compose, no unused fixtures |
| S17 | Docs and `AGENTS.md` map | `AGENTS.md`, `README.md`, `docs/**` | recommend (#13) |

## Rejected, merged, or demoted

- **Rejected — S04 `includePlanModeGuidance` removal:** the flag intentionally prevents duplicate plan guidance while keeping it in the bootstrap boundary section; removal relocates prompt content.
- **Rejected — S13 allocation discriminated union:** the sink still exposes optional session fields; adds branching without removing the invalid state.
- **Rejected — S16 `build.mjs` staging/reaper/retry removal:** added in commit `a3399e7` for reproduced concurrent-build and filesystem races, with regression tests.
- **Demoted — S07 pool slot-map (`cursor-session-agent.ts:148-153`, five per-scope collections):** the collections have different lifetimes; a slot with many optional fields may relocate complexity and risks acquire/dispose races. Treat as a design spike.
- **Demoted — S12 guard merge in `applyCursorUsage`:** the repeated guards mark distinct billed/local/partition/occupancy trust boundaries.
- **Demoted — S01 refresh catalog:** bug, not simplification (#7c).
- **Merged:** S05 + S06 turn plumbing completed; S06 lifecycle-emitter records remain #9.
- **Merged:** S07 resume cleanup candidates and cleanup-entry phases now normalize at parse.
- **Merged:** S02 single model-cache read (`loadCachedModelCatalog`); snapshot projection remains #7b.

## Limitations

- Static review only; no tests or builds run. Line deltas are estimates.
- `.d.mts` siblings and `scripts/fixtures/plan-strip-shim` were covered inside S02/S03/S13/S14 by description, not by literal filename; each was opened by its worker.
- Two Grok workers reported "0 tool uses" in the harness summary; every citation from them was independently confirmed against source before acceptance.
- The repository was not modified by the audit; this file is the only addition.
