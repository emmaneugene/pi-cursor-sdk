# Cursor dogfood checklist

Short maintainer checklist for **minimal-surface** validation after prompt, bridge, replay, or manifest changes. This is the fast path from pi-cursor-composer dogfood sessions. It complements the current fork release evidence bar.

## Minimal environment

- Build first after any `src/` edit: `npm run build` (the pi manifest loads compiled `dist/`)
- Extension only: `pi -ne --approve -e . --cursor-no-fast --model cursor/grok-4.6`. `-ne` keeps a host `pi install` of this package from colliding with `-e .`.
- Fresh session dir: `--session-dir /tmp/pi-cursor-dogfood-<id>`
- Baseline surface (no ambient Cursor MCP/rules):
  - `local.settingSources: []` in the isolated or user `cursor-sdk.json`, **or**
  - empty / minimal `~/.cursor/mcp.json` when you need to verify user MCP config separately
- Optional: `tools.manifest: false` to confirm bootstrap behavior without the manifest block

## One-turn exercise

1. **Native Cursor host tool** — one `read` or `shell` call (Cursor SDK host tools; not listed in MCP `listTools`).
2. **Pi bridge** (if enabled) — one bridged call via exposed `pi__*` MCP name, e.g. `pi__cursor_activate_skill` when active.
3. **Configured MCP** (optional) — only when you intentionally load Cursor MCP via settings; skip for minimal baseline.

`pi --no-tools` is a pi-registry toggle, not a Cursor SDK host-tool kill switch. In dogfood, expect it to remove pi bridge exposure while Cursor host tools can still run.

In-session debug: `/cursor-tools` prints `tools.bridge.enabled`, `tools.manifest`, `local.settingSources`, and the callable-surface manifest snapshot for the current session.

## CLI spot-check

`pi -ne --approve -e . --list-models cursor` should exit 0 and show a Cursor model table. Capture both stdout and stderr before treating empty stdout as a discovery failure.

## JSONL spot-check

Inspect the session JSONL under the temp `--session-dir`:

| Pattern | Meaning |
| --- | --- |
| `cursor-replay-*` | Display-only replay of Cursor SDK activity—not callable |
| `cursor-pi-bridge-run-*` | Live pi execution via bridge |
| Callable tools | Cursor SDK host + MCP `listTools` + exposed `pi__*` only |

Common mistake: treating `cursor-replay-*` IDs or pi transcript tool labels as tools to invoke.

## Bootstrap prompt

First send (bootstrap) should include:

- Short **Cursor SDK tool boundary** block
- **Callable tool surfaces this run** manifest (unless `tools.manifest` is false)
- Tail guard with shell `cd` hint

Incremental sends omit the full boundary; tail guard remains.

## Activity replay — Cursor edit card

After a Cursor **edit** tool call, confirm the activity card:

- `details.diffString` present on the replay record
- Collapsed diff preview with colored add/remove lines in the TUI

Canonical visual evidence: `npm run smoke:visual -- --label release-check --prompt 'Read ./package.json and reply with its package name.'` (see [Cursor native tool visual audit](./native-tool-visual-audit.md)).

## Related docs

- [Cursor tool surfaces in pi](./tool-surfaces.md) — three namespaces and discoverability
- [Cursor live smoke checklist](./live-smoke-checklist.md) — live release evidence and focused checks
- [Cursor testing lessons](./testing-lessons.md) — auth, JSONL scans, plan-mode traps
