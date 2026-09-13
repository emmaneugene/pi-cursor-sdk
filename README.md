# @emmaneugene/pi-cursor-sdk

A pi provider extension that lets pi use Cursor models through the local `@cursor/sdk` agent runtime.

This is a maintained fork of [fitchmultz/pi-cursor-sdk](https://github.com/fitchmultz/pi-cursor-sdk)

Use this extension if you primarily use Cursor models inside pi and want Cursor's SDK agent loop preserved while pi adds native model selection, auth, thinking/context controls, session behavior, replay UI, and optional pi tool bridging.

## Why use this instead of an OpenAI-compatible Cursor endpoint?

Use `pi-cursor-sdk` when you primarily want to use Cursor models **inside pi**.

This extension runs Cursor models through the local `@cursor/sdk` agent runtime and keeps Cursor's agent loop intact. pi integrates around that loop: model discovery, model selection, thinking controls where Cursor exposes them, fast mode, Cursor mode, session handling, native replay cards, and the optional pi tool bridge.

OpenAI-compatible Cursor proxies are useful when you want a generic `/v1/chat/completions` or `/v1/responses` endpoint for many clients such as curl, the OpenAI SDK, OpenCode, or other tools. That compatibility comes from translating Cursor behavior into OpenAI-shaped requests, responses, and tool calls.

For pi users, that translation is usually the wrong abstraction. `pi-cursor-sdk` is pi-specific on purpose: it lets Cursor remain Cursor while making it feel native in pi.

| If you want... | Prefer |
| --- | --- |
| First-class Cursor usage inside pi | `pi-cursor-sdk` |
| Cursor's local SDK agent loop preserved, not replaced by an OpenAI-shaped adapter | `pi-cursor-sdk` |
| pi model picker, `/login`, `/model`, sessions, context display, footer/status UX | `pi-cursor-sdk` |
| Cursor SDK local-agent tools, settings, MCP, and native replay surfaced in pi | `pi-cursor-sdk` |
| pi extension tools exposed to Cursor through a local MCP bridge | `pi-cursor-sdk` |
| A generic OpenAI-compatible localhost `/v1` API for non-pi clients | An OpenAI-compatible Cursor proxy |
| One Cursor-ish endpoint shared across several unrelated tools | An OpenAI-compatible Cursor proxy |

## Quick start

1. Install the package:

```bash
pi install npm:@emmaneugene/pi-cursor-sdk
```

Or install from GitHub:

```bash
pi install https://github.com/emmaneugene/pi-cursor-sdk
```

2. Start pi with a Cursor model:

```bash
pi --model cursor/grok-4.6
```

3. In pi, run `/login`, choose `Use an API key`, choose `Cursor`, and paste your Cursor SDK API key.

If pi started without a key, run `/cursor-refresh-models` after `/login` to refresh the full live Cursor model catalog without restarting pi. Inside pi, use `/model` to choose another Cursor model.

## Requirements

- Node.js 22.19+
- Pi 0.84.0 or later; pi core peer metadata remains optional and uses `"*"` ranges per Pi package guidance
- a Cursor SDK API key saved through `/login`, available as `CURSOR_API_KEY`, or passed with pi's `--api-key`

No global `@cursor/sdk` install is required. This package depends on exact `@cursor/sdk@1.0.30`, so normal package installation brings in the SDK version this extension was built and tested against. Cursor SDK 1.0.30 declares its Node ConnectRPC transport dependency directly, so npm installs place `@connectrpc/connect-node` where the SDK can resolve it. The extension intentionally does not bundle `@cursor/sdk` or its platform packages, because packing from one maintainer OS can otherwise ship the wrong optional SDK binary for another OS. Cursor SDK 1.0.30 keeps the older `sqlite3 -> node-gyp@8` dependency chain out of the runtime tree, so deprecated install warnings for `inflight`, `rimraf`, `glob@7`, `npmlog`, `gauge`, `are-we-there-yet`, and `tar@6` from that chain are not expected. Older Pi and Cursor SDK compatibility paths are not maintained.

## Install

### Global install

```bash
pi install npm:@emmaneugene/pi-cursor-sdk
```

Alternative GitHub install:

```bash
pi install https://github.com/emmaneugene/pi-cursor-sdk
```

### Project-local install

Use `-l` if you want the package recorded in the current project's `.pi/settings.json` instead of your global pi settings:

```bash
pi install -l npm:@emmaneugene/pi-cursor-sdk
```

Pi 0.84.0 loads project-local extensions only after project trust is resolved, so this extension cannot observe that trust event. When a project-local install needs to read or write `.pi/cursor-sdk.json`, start every such run with explicit approval:

```bash
pi --approve --model cursor/grok-4.6
```

Without `--approve`, the project-local extension still runs after Pi trusts the project, but it ignores `.pi/cursor-sdk.json` and rejects `--save-project`; user config remains available.

### Try from a local checkout

For development from this repository:

```bash
npm install   # runs prepare, which compiles src/ into dist/ (the manifest entry pi loads)
pi -ne --approve -e . --model cursor/grok-4.6
```

`-ne` keeps a host `pi install` of this package from colliding with `-e .`. After editing `src/`, run `npm run build` before the next `pi -e .` run, or pi loads the previous build.

## Configure your Cursor SDK API key

`pi-cursor-sdk` passes an explicit API key to the Cursor SDK. It does **not** reuse Cursor Agent CLI login, Cursor Desktop login, or Cursor subscription/OAuth state shown by `agent status`.

Use either a user API key from Cursor Dashboard → API Keys or a service account API key from Team settings. Team Admin API keys are not supported by the Cursor SDK. Then configure the key with one of the methods below.

Preferred setup:

```bash
pi --model cursor/grok-4.6
```

Then, inside pi:

1. Run `/login`.
2. Select `Use an API key`.
3. Select `Cursor`.
4. Paste your Cursor SDK API key.
5. The key is saved in pi's native `~/.pi/agent/auth.json`.

If pi started without a key, fallback Cursor models still register so `/login` is reachable. After `/login`, fallback model runs can use the stored key, and `/cursor-refresh-models` refreshes the full live Cursor model catalog discovered from the Cursor SDK without restarting pi.

Note: if `/login` shows `Cursor ✓ key in models.json` but you have not saved a Cursor key and `CURSOR_API_KEY` is unset, that status is a pi auth-status limitation. A real Cursor SDK API key is still required for Cursor runs.

Environment setup:

```bash
export CURSOR_API_KEY="your-key"
pi --model cursor/grok-4.6
```

One-shot setup:

```bash
pi --api-key "your-key" --model cursor/grok-4.6 --cursor-no-fast -p "Say ok only."
```

Startup discovery intentionally does not parse Pi CLI arguments. It uses the stored `cursor` key in `~/.pi/agent/auth.json`, then `CURSOR_API_KEY`; without either, the bundled fallback catalog registers. Provider turns still receive Pi's resolved `--api-key`. `/cursor-refresh-models` asks Pi's ModelRegistry for provider `cursor`, so command-time auth follows Pi's provider-scoped resolution and is normalized through `CURSOR_API_KEY` placeholders before reaching the Cursor SDK.

### Model catalog cache

To avoid a live `Cursor.models.list` network round-trip on every pi startup, the discovered catalog is cached on disk at `~/.pi/agent/cursor-sdk-model-list.json` (written `0600`, keyed by an API-key fingerprint — the key itself is never stored). Warm startups within the cache TTL skip the network call and avoid loading `@cursor/sdk` until a Cursor turn needs it; `/cursor-refresh-models` always bypasses the cache and refreshes the live catalog. If a refresh fails, a previously cached catalog is preferred over the generic bundled fallback.

```bash
# Cache lifetime in milliseconds (default 86400000 = 24h).
PI_CURSOR_SDK_MODEL_CACHE_TTL_MS=3600000 pi --model cursor/grok-4.6

# Disable the cache and always discover live.
PI_CURSOR_SDK_DISABLE_MODEL_CACHE=1 pi --model cursor/grok-4.6
```

Do not store the API key in `~/.pi/agent/cursor-sdk.json`. That file is only for non-secret extension state such as Cursor fast defaults. `PATH` is only for executable lookup and should not contain the API key.

## Verify your setup

List Cursor models:

```bash
pi --list-models cursor
```

Expected behavior:

- with a valid key, Cursor models appear under the `cursor` provider
- on pi 0.79.x, the model table may be written to stderr in automation; treat exit 0 plus a table on either stdout or stderr as success
- if discovery cannot authenticate or reach Cursor, pi may still show fallback Cursor models; after adding auth with `/login`, fallback model runs can use the saved key, and `/cursor-refresh-models` refreshes the live catalog

Smoke test:

```bash
pi --model cursor/grok-4.6 --cursor-no-fast --no-session --mode json \
  -p "Reply exactly PI_CURSOR_MODEL_OK and nothing else."
```

Expected: the final assistant text is `PI_CURSOR_MODEL_OK`. If auth is missing or invalid, pi should tell you to configure a Cursor SDK API key via `/login`, `CURSOR_API_KEY`, or `--api-key`.

## Choosing a model

Choose Cursor models interactively with `/model`, or pass a model on the command line:

```bash
pi --model cursor/grok-4.6
pi --model cursor/gpt-5.5
pi --model cursor/claude-opus-4-8
```

Each item returned by `Cursor.models.list()` becomes one pi model with the canonical Cursor ID. Cursor aliases, alternative context values, and fast/slow states do not create additional model rows. The selected catalog item's default variant supplies its context and fast parameters.

Pi applies supported thinking levels at send time without creating more model rows:

```bash
pi --model cursor/gpt-5.5:medium
pi --model cursor/claude-opus-4-7:max
pi --model cursor/gpt-5.5 --thinking medium
```

The model's static pi `contextWindow` follows cached checkpoint evidence for its canonical ID or default context, then falls back to the default context reported by Cursor. Cursor SDK conversation mode and fast mode remain extension state, not model identity.

## Thinking support

All Cursor SDK models should be treated as thinking-capable Cursor models. The `thinking` column in `pi --list-models` is narrower: it only means pi can control a Cursor SDK thinking parameter for that model.

For models where Cursor exposes `reasoning`, `effort`, or boolean `thinking` parameters, pi's native thinking controls map to Cursor SDK params:

- `reasoning=none|low|medium|high|extra-high`
- `effort=low|medium|high|xhigh|max`
- `thinking=false|true` for boolean thinking models

Pi `xhigh` maps to Cursor `xhigh` or `extra-high`; Pi `max` maps only to a distinct Cursor `max` value.

For Claude models with both `thinking` and `effort`, pi thinking `off` sends `thinking=false` and omits `effort`.

### Why some Cursor models show `thinking=no`

In `pi --list-models`, `thinking=no` means pi cannot control the model's thinking level with `--thinking`, a final `:medium` model suffix, or shift+tab. It does not mean the Cursor model cannot think.

Some Cursor SDK models do not expose a `reasoning`, `effort`, or `thinking` parameter for the extension to set. Cursor thinking is still enabled/supported by the model, and Cursor may still emit thinking deltas. The extension surfaces those deltas through pi's native thinking rendering when the SDK emits them.

## Fast mode

Use `/cursor-fast` to persistently toggle fast mode for the selected Cursor model when the model supports Cursor's `fast` parameter.

Fast preferences are remembered per canonical Cursor model ID and stored:

- in the current session with `pi.appendEntry()`
- globally in `~/.pi/agent/cursor-sdk.json`

For one run, force fast on or off without changing saved defaults:

```bash
pi --model cursor/gpt-5.5 --cursor-fast -p "Say ok only"
pi --model cursor/grok-4.6 --cursor-no-fast -p "Say ok only"
```

Composer 2 and Composer 2.5 can default to fast. Use `--cursor-no-fast` for a one-shot no-fast Composer run. In print mode (`-p`), `--cursor-no-fast` is silent and does not write `~/.pi/agent/cursor-sdk.json`.

In interactive mode, the footer shows Cursor status only while a Cursor model is active. Fast-capable models show fast state explicitly, and fast and plan mode share one Cursor status value so they do not overwrite each other:

```text
cursor · fast:n/a
cursor · fast:n/a · plan
cursor · fast:off
cursor · fast:on
cursor · fast:off · plan
cursor · fast:on · plan
cursor · fast:on · http1
```

`fast:off` means fast mode is off. `fast:n/a` means the active model does not expose a fast toggle. `http1` appears when HTTP/1.1/SSE transport is enabled for Cursor SDK agents. If you do not see `plan`, Cursor SDK mode is the default `agent` mode.

## Cursor SDK mode

Cursor SDK conversation mode is Cursor-only extension state. It is not a pi model variant, not pi thinking/reasoning, and not pi's separate read-only plan-mode extension.

Default mode is `agent`. Start a one-shot run in a specific mode:

```bash
pi --model cursor/grok-4.6 --cursor-mode agent
pi --model cursor/grok-4.6 --cursor-mode plan
```

Change the session mode interactively:

```text
/cursor-mode agent
/cursor-mode plan
/cursor-mode
```

`/cursor-mode` with no argument reports the current mode and usage. The CLI flag does not persist to the session; slash-command changes are persisted with `pi.appendEntry()`.

Maintainers can run `/cursor-tools` in a Cursor model session to print the current bridge enablement, bootstrap manifest enablement, effective `PI_CURSOR_SETTING_SOURCES`, and callable-surface snapshot (host tools summary plus current `pi__*` names). See [Cursor dogfood checklist](docs/cursor-dogfood-checklist.md).

When a new local Cursor SDK agent is created, the extension seeds the mode through `Agent.create({ mode })`. The extension also sends the effective Cursor mode on every `agent.send(..., { mode })` call so `/cursor-mode` and `--cursor-mode` remain the source of truth even when a pooled SDK agent is reused.

Cursor SDK `plan` mode can produce plan-oriented output and Cursor todo/plan activity, but those replay cards remain display-only. They do not drive pi's plan-mode extension, pi todos, or active tool state.

## Cursor local agent config and safety controls

`/cursor-refresh-config` calls the current pooled SDK agent's `agent.reload()` so Cursor reloads filesystem config such as local hooks, project MCP, and subagents without restarting pi. If no Cursor agent exists yet, the next Cursor run loads config normally.

Cursor SDK local safety controls stay off by default. Enable them explicitly for one run:

```bash
PI_CURSOR_AUTO_REVIEW=1 PI_CURSOR_SANDBOX=1 pi --model cursor/grok-4.6
pi --model cursor/grok-4.6 --cursor-auto-review --cursor-sandbox
```

For manual stuck-run recovery only, explicitly force-expire the active persisted local SDK run before sending:

```bash
PI_CURSOR_LOCAL_FORCE=1 pi --model cursor/grok-4.6
pi --model cursor/grok-4.6 --cursor-local-force
```

This maps to the next actual `agent.send(..., { local: { force: true } })` only. SDK load, agent acquire, prompt preparation, or a pre-send abort does not consume it. A consumed CLI flag is not rearmed by session reload/tree lifecycle events; the environment override remains once per process. It is not a retry loop and does not cancel another live process's existing run handle; use it only when you know the persisted local run is wedged.

Branch-scoped local resume reattaches to recorded local SDK agents after a pi restart. It is on by default and records agent IDs plus their SDK store identity only in pi session custom entries, never user/project config. Independently of resume, each local agent whose send is initiated is also recorded once per native pi session as a best-effort non-resumable `cursor-sdk-agent-lineage` custom entry at the `Agent.send()` boundary for forensic lineage; cloned/forked sessions record their own lineage under their new pi session ID. Disable resume per run with CLI/env, or persist an opt-out in config:

```bash
pi --model cursor/grok-4.6 --cursor-no-local-resume
PI_CURSOR_LOCAL_RESUME=0 pi --model cursor/grok-4.6
```

Resume is strict: the current pi session file/id, branch path prefix, cwd/repo root, model/API/tool-surface pool key, SDK store identity, and compaction generation must match. Each persisted pi session gets a SQLite store under `<getDefaultSdkStateRoot(cwd)>/pi-sessions/<session-hash>/`, and that same store is used for create/resume, transcript reads, checkpoint lookup, and exact-ID cleanup so parallel pi sessions do not contend on one workspace `index.db`. Fileless sessions use a unique OS-temporary store per acquisition, remove it on graceful disposal, and start a fresh agent after invalidation instead of reopening a disposed temporary store. Legacy resume entries still try the SDK's default workspace store; if that resume fails or the agent is later replaced, the new agent moves to the per-session store. A trailing user message already present at process startup is crash-ambiguous and invalidates the old handle; only a user message appended in the current process may span a recorded handle, preventing restart from resending an already-submitted prompt. A successful process reattachment bootstraps the current pi transcript once while retaining the resumed Cursor agent's native state; later in-process turns remain incremental. If `Agent.resume()` fails, pi bootstraps a new local Cursor agent from the current transcript and streams one display-only continuity note. Superseded local agents can be cleaned up explicitly with `/cursor-local-resume-cleanup --dry-run` and `/cursor-local-resume-cleanup --yes`; cleanup only deletes exact recorded `agent-*` IDs from their recorded store.

Config can also set non-secret defaults in `~/.pi/agent/cursor-sdk.json` or trusted `.pi/cursor-sdk.json`. Project config activates only when Pi's project-trust flow reached this extension and approved the project, or the run started with explicit `--approve`; Pi's implicit trust for a project with no recognized resources is not enough. Because Pi 0.84.0 loads project-local package extensions after the trust event, `pi install -l` users must pass `--approve` on every run that reads or writes `.pi/cursor-sdk.json`. A trust resource added after trust resolution requires restarting pi. Fast-default and HTTP transport saves preserve unrecognized fields, reject malformed or non-object JSON without rewriting it, and serialize concurrent writers. A completed global preference write is retained if Pi's subsequent session-journal append fails, because Pi may already have mutated the in-memory branch; the command reports that partial journal failure and ignores the uncertain session entry until a later successful save or session restart. If a process is force-killed during the tiny update window, the next save reports the `.lock` path; remove it only after confirming no pi process is writing that config.

```json
{
  "local": {
    "autoReview": true,
    "sandboxOptions": { "enabled": true },
    "resume": true
  },
  "bridge": {
    "excludeTools": ["bash"]
  }
}
```

`bridge.excludeTools` is a denylist of pi tool names for the pi tool bridge. Denylisted active pi tools are hidden from Cursor; everything else active stays exposed, so an unset list means no restriction, not zero exposure. Names must be strings; empty and malformed entries are dropped, which also means an explicitly empty list falls through to lower-precedence config instead of clearing a user denylist. Trusted project config wins over user config. Overlapping built-in pi tools (`read`, `bash`, `write`, `edit`, `grep`, `find`, `ls`) stay hidden unless `PI_CURSOR_EXPOSE_BUILTIN_TOOLS=1`, and a denylist entry keeps hiding a tool even with that opt-in. A change to the resulting exposed surface splits the local agent pool, so the next turn creates a Cursor agent with the narrowed bridge snapshot.

### Local resume cleanup

Local resume cleanup is explicit and session-ledger scoped:

```bash
/cursor-local-resume-cleanup --dry-run
/cursor-local-resume-cleanup --yes
```

It only deletes superseded local `agent-*` IDs that this extension recorded as cleanup candidates, one exact ID at a time through the Cursor SDK using the candidate's recorded store identity (or the SDK default workspace store for legacy candidates without one), and protects agents still resumable from any session-tree branch. Before SDK deletion it verifies and fsyncs an exact intent in the Pi session JSONL, then verifies and fsyncs the result; a missing or non-durable intent prevents deletion, while a missing or non-durable result leaves the durable intent—and a conservative current-process marker—blocking automatic retry. A candidate with a recorded store identity that is invalid for the current session is durably marked non-retryable and excluded from later cleanup attempts. It does not sweep any SDK store or call lower-level empty delete filters. Removing a pi session file does not automatically remove its persisted store directory. After permanently retiring that session and confirming no pi process is using it, a recorded root may be removed manually only when it is the session-derived `<getDefaultSdkStateRoot(cwd)>/pi-sessions/<session-hash>/` path. Never manually remove the SDK default workspace root, which legacy entries may record and other sessions may share.

Only enabled local safety values are passed to `Agent.create({ local })`; false/default values are omitted to preserve the current local-agent behavior. Local force is one-shot/manual-only through CLI/env and is passed only to the next `Agent.send({ local: { force: true } })`. Local resume is enabled by default; opt out with `local.resume: false`, `--cursor-no-local-resume`, or `PI_CURSOR_LOCAL_RESUME=0`. Changes take effect on the next turn without recreating a healthy pooled agent.

## Images

Images from the latest user message are forwarded to Cursor. Historical images are kept out of the transcript and appear only as `[image omitted from transcript]` placeholders, so follow-up questions about an earlier image should reattach the image or include a textual description. The extension advertises `text` and `image` input for Cursor models because Cursor's SDK accepts image messages and Cursor models are expected to support them.


## Cursor provider tool contract

See [Cursor tool surfaces in pi](docs/cursor-tool-surfaces.md) for a concise guide to callable vs display-only tools, MCP catalog limits, JSONL ID patterns, and how pi toggles differ from Cursor ambient MCP.

Local Cursor runs use two separate tool surfaces:

- **Cursor-native surface:** Cursor local-agent tools, Cursor settings, plugins, and configured Cursor MCP servers. These remain owned by the Cursor SDK local agent path. Pi CLI tool toggles such as `--no-tools`, `--tools`, and `--exclude-tools` do not disable this Cursor-native surface.
- **pi bridge surface:** pi-cursor-sdk exposes bridgeable active pi tools through a per-run local loopback MCP bridge when the bridge is enabled and the current pi tool registry has exposed tools. Pi CLI tool toggles affect this bridge surface because they change pi's active tool registry.

Bridge capabilities are snapshotted from `pi.getActiveTools()` and `pi.getAllTools()` for each Cursor run, including per-tool prompt guidelines when pi exposes them. Cursor sees active bridgeable pi tools as collision-safe MCP names such as `pi__sem_reindex` only when they are exposed in that current run. When exposed, Cursor is instructed to prefer `pi__mcp` for MCP work and `pi__subagent` for delegation; Cursor-configured MCP and Cursor-native subagents are fallbacks when the matching pi tool is not exposed or is unavailable. Pi session output, tool cards, confirmations, hooks, renderers, history, and abort behavior use the real pi tool name, such as `sem_reindex`. The bridge queues Cursor's MCP call, emits a normal pi `toolCall`, waits for the matching pi `toolResult`, and resolves that result back into the same live Cursor SDK run without creating a new `Agent`, unless the run was disposed, aborted, or cancelled. The bridge does not call pi tool `execute()` handlers directly.

Pi subagents can select Cursor models under both Cursor and non-Cursor parents. Each nested Cursor child registers a child-local provider and bridge and uses an isolated SDK agent scope, so it does not replace or wait on the parent's active Cursor agent.

Overlapping built-in pi tools (`read`, `bash`, `write`, `edit`, `grep`, `find`, `ls`) are hidden by default because Cursor local agents already have native equivalents. Extension/custom tools and non-overlapping active tools present in pi's active tool registry normally remain exposed. When pi has visible Agent Skills loaded, the extension rewrites pi's skill catalog for Cursor and exposes `cursor_activate_skill` as `pi__cursor_activate_skill`; Cursor should call that bridge tool with a listed skill name to load the full `SKILL.md` and bundled resource list before applying the skill. If the bridge is disabled, the catalog remains available and instructs Cursor to fall back to reading the listed `SKILL.md` path directly.

Cursor-native tool replay is separate from the bridge. Replay cards are display-only recorded Cursor SDK activity. They never re-run Cursor-side commands, reapply Cursor edits, call MCP servers, or mutate pi state. See [Cursor native tool replay](docs/cursor-native-tool-replay.md).

Bridge controls:

```bash
# Roll back to Cursor SDK tools/settings/MCP only; do not expose active pi tools through the bridge.
PI_CURSOR_PI_TOOL_BRIDGE=0 pi --model cursor/grok-4.6

# Opt in to also expose overlapping pi tool names through the bridge.
PI_CURSOR_EXPOSE_BUILTIN_TOOLS=1 pi --model cursor/grok-4.6

# Override Cursor SDK MCP tool-call timeout, including bridged pi tools and configured Cursor MCP servers.
PI_CURSOR_MCP_TOOL_TIMEOUT_SECONDS=7200 pi --model cursor/grok-4.6
PI_CURSOR_MCP_TOOL_TIMEOUT_MS=7200000 pi --model cursor/grok-4.6

# Fail a stranded pi bridge CallTool sooner than the effective MCP tool timeout.
PI_CURSOR_PI_BRIDGE_CALL_TIMEOUT_MS=120000 pi --model cursor/grok-4.6

# Override known MCP initialize/listTools timeouts on first send (default 10s).
PI_CURSOR_MCP_CONNECT_TIMEOUT_SECONDS=5 pi --model cursor/grok-4.6
PI_CURSOR_MCP_CONNECT_TIMEOUT_MS=5000 pi --model cursor/grok-4.6

# Force Cursor SDK local-agent backend streams to HTTP/1.1/SSE instead of HTTP/2.
env 'PI_CURSOR_HTTP_1_1=true' pi --model cursor/grok-4.6
# Or toggle it inside an interactive Cursor session.
/cursor-http on

# Disable bootstrap callable-surface manifest (on by default).
PI_CURSOR_TOOL_MANIFEST=0 pi --model cursor/grok-4.6

# Emit scrubbed bridge diagnostics as JSONL to stderr with prefix [pi-cursor-sdk:bridge].
PI_CURSOR_PI_TOOL_BRIDGE_DEBUG=1 pi --model cursor/grok-4.6
```

On bootstrap sends, a compact **callable tool surfaces** block is injected into the Cursor prompt by default. It reminds the model that Cursor host/configured MCP tools are controlled by Cursor, while pi tool toggles only affect pi tools/bridge exposure; when bridge tools are exposed, it lists the current `pi__*` names. Disable with `PI_CURSOR_TOOL_MANIFEST=0`.

`PI_CURSOR_PI_TOOL_BRIDGE=0` is the supported rollback flag and disables the bridge entirely. The flag treats `false`, `off`, `none`, `no`, and `disabled` as off; `1`, `true`, `on`, `yes`, and `enabled` as on. `PI_CURSOR_EXPOSE_BUILTIN_TOOLS=1` opts in to exposing overlapping pi tool names that Cursor already has native equivalents for. The installed Cursor SDK uses a 60-second MCP protocol default with no public per-server timeout option. pi-cursor-sdk overrides that seam in two directions by default: MCP `callTool` requests are extended to 3600 seconds for long-running local MCP tools (including the pi bridge and configured Cursor MCP servers), and known MCP initialize/listTools requests on first send are shortened to 10 seconds so unavailable configured MCP servers fail fast instead of blocking for a full minute. Unknown Cursor SDK MCP protocol timeout stacks keep the SDK default instead of being shortened. Override tool-call timeouts with `PI_CURSOR_MCP_TOOL_TIMEOUT_MS` or `PI_CURSOR_MCP_TOOL_TIMEOUT_SECONDS`, and first-send initialize/listTools timeouts with `PI_CURSOR_MCP_CONNECT_TIMEOUT_MS` or `PI_CURSOR_MCP_CONNECT_TIMEOUT_SECONDS`. Bridged calls also have a local fail-closed deadline that defaults to the effective MCP tool timeout; lower it with `PI_CURSOR_PI_BRIDGE_CALL_TIMEOUT_MS` when a lost pi result should fail sooner. On expiry, the bridge rejects and removes the pending call and aborts active pi execution when available. The bridge's `listTools` handler returns its snapshot synchronously, so a Cursor UI label such as `GetMcpTools` does not by itself identify a `listTools` deadlock; the durable bridge waiter is `CallTool` awaiting its matching pi result.

`PI_CURSOR_HTTP_1_1=true` maps to the Cursor SDK `Cursor.configure({ local: { useHttp1ForAgent: true } })` compatibility mode for corporate VPN/proxy environments where HTTP/2 streams fail. In interactive sessions, `/cursor-http on`, `/cursor-http off`, and `/cursor-http toggle` set the branch-scoped session preference and save the user default as `local.useHttp1ForAgent` in `~/.pi/agent/cursor-sdk.json`; `/cursor-http` with no argument reports the effective state. Precedence is session command/history, explicit `PI_CURSOR_HTTP_1_1`, user config, then the built-in unset default; project config is ignored for this user-level compatibility choice. Unset performs no SDK configuration, preserving the existing default path. Session shutdown clears extension-owned SDK transport state before module reload. Changing the effective setting splits the local agent pool so an agent created under another transport is not reused. When enabled, the Cursor footer shows `http1` (for example `cursor · fast:on · http1`). This affects Cursor SDK local-agent backend streams, which are all provider streams. It does not configure HTTP proxies, TLS certificates, or HTTP/3.

`PI_CURSOR_PI_TOOL_BRIDGE_DEBUG=1` is off by default and emits typed, allowlisted, scrubbed single-line JSONL records to `process.stderr`. These records are operational diagnostics, not anonymous telemetry: they intentionally include tool names, safe correlation IDs, bridge run state, exposed pi↔MCP name pairs, queued requests, result resolution, rejection, cancellation, and pending counts. They must not include endpoint URLs, endpoint path components, endpoint tokens, raw args/results, stdout/stderr payloads, file contents, Cursor settings output, API keys, bearer tokens, cookies, session credentials, or secrets. Do not enable or share bridge debug logs where tool names themselves are sensitive.

### Maintainer release evidence

For Cursor provider/runtime changes, the current fork release evidence bar is:

- `npm test`
- `npm run typecheck`
- `npm pack --dry-run`
- one live print-mode Cursor run with `cursor/grok-4.6`
- `npm run smoke:visual -- --label release-check --prompt 'Read ./package.json and reply with its package name.'`

The visual smoke captures an offscreen PTY, renders it through browser/xterm, and saves PNG screenshots with Playwright or `agent_browser`. Its default matrix is native replay only: native replay registration is forced on, Cursor setting sources are disabled, the pi bridge is off, overlapping built-in pi tools are not exposed, and inherited Cursor SDK event-debug artifact env is cleared. The visible TUI/output, rendered screenshots, scrubbed diagnostics, and persisted JSONL must agree. See [Cursor live smoke checklist](docs/cursor-live-smoke-checklist.md) and [Cursor testing lessons](docs/cursor-testing-lessons.md).

The Crabbox-backed macOS, Ubuntu, and Windows native platform matrix is deferred. Issue [#2](https://github.com/emmaneugene/pi-cursor-sdk/issues/2) tracks the infrastructure and evidence needed to reintroduce it as a release gate.

### Maintainer Cursor SDK event capture

Use `npm run debug:sdk-events` to capture timestamped `run.stream()`, `onDelta`, and `onStep` timelines for one direct `@cursor/sdk` run.

Use `npm run debug:provider-events` to capture the same `onDelta`/`onStep` payloads **through pi's Cursor provider** (session agent reuse, bridge, native replay, send planning). Artifacts default under gitignored `.debug/cursor-sdk-events/`. Interactive multi-turn pi sessions group turns under `.debug/cursor-sdk-events/sessions/<session-slug>/turn-NNN-.../` with a `session.json` index. You can also opt in during any pi run with `PI_CURSOR_SDK_EVENT_DEBUG=1`; capture is file-only by default so the pi TUI stays normal. Each cumulative JSONL artifact is capped at 2 MiB, ends with an `artifact_truncated` record when capped, and is listed in `summary.json` under `truncatedJsonlFiles`.

See [Cursor testing lessons](docs/cursor-testing-lessons.md#cursor-sdk-event-capture-probe) for usage, artifact layout, and safety notes.

## Fallback models

If startup has no stored `/login` key or `CURSOR_API_KEY`, model discovery fails, or discovery returns no models, the extension registers a bundled fallback snapshot of the latest reviewed Cursor SDK model catalog and notifies interactive users when possible. Pi CLI `--api-key` remains available to provider turns but is not parsed independently during startup discovery.

The fallback snapshot includes Grok 4.6, Composer 2.5, Composer 2, Cursor's GPT-5.6 Luna/Sol/Terra models, Claude, Gemini, Grok 4.5, Kimi, and other model IDs exposed by the reviewed `Cursor.models.list()` output. Recommended local/smoke runs use `cursor/grok-4.6`. Pi's separate `openai-codex` catalog is owned by Pi itself; Pi 0.84.0 includes native `gpt-5.6-luna`, `gpt-5.6-sol`, and `gpt-5.6-terra` support. The exact checked-in Cursor snapshot lives in `src/cursor-fallback-models.generated.ts`. A dated maintainer capture documents the assistant-visible [Cursor system prompts and tool guidance](https://github.com/emmaneugene/pi-cursor-sdk/blob/main/docs/evidence/cursor-system-prompts-2026-08-02/README.md) for Grok 4.5, Opus 5, Fable 5, and the GPT-5.6 Sol/Terra/Luna family.

Actual Cursor runs still need a key from `/login`, `CURSOR_API_KEY`, or `--api-key`. If you add auth after startup, run `/cursor-refresh-models` to refresh the full live Cursor model catalog without restarting pi.

## Limits

- **The pi tool bridge is local and MCP-backed.** Bridgeable active pi tools are exposed to local Cursor agents through a tokenized `127.0.0.1` MCP endpoint; internal Cursor replay activity names are excluded, and overlapping built-in pi tools are hidden by default. Set `PI_CURSOR_PI_TOOL_BRIDGE=0` to disable it or `PI_CURSOR_EXPOSE_BUILTIN_TOOLS=1` to expose overlapping built-ins too. Hide individual pi tools from Cursor with `bridge.excludeTools` in `~/.pi/agent/cursor-sdk.json` or trusted `.pi/cursor-sdk.json`.
- **Cursor native tool replay is display-only.** Replay renders recorded Cursor SDK activity and never re-runs Cursor-side commands, reapplies Cursor edits, calls MCP servers, or mutates pi state. Workflow tools such as Cursor mode/task/todo/plan activity are not pi workflow controls. See [Cursor native tool replay](docs/cursor-native-tool-replay.md) for supported replay cards, ordering, conflict handling, and opt-out flags.
- **Cursor run state can span tool-use turns.** Within a pi session, the extension reuses one Cursor SDK agent across compatible follow-up turns and sends incremental prompts when context still matches. It recreates the agent when context diverges, after compaction or `/tree` navigation, on API key changes, after send errors, after five minutes without a successful send, or on session shutdown. Idle recreate uses `Agent.create`, not `Agent.resume`. For bridged pi tools, the matching pi `toolResult` resolves into the same live Cursor SDK run without creating a new `Agent`, unless the run was disposed, aborted, or cancelled. Replay can also split one live Cursor SDK run across pi `toolUse` turns for display.
- **Final assistant text is the last non-empty text part.** Composer responses can produce one assistant message with early progress `text`, thinking/tool metadata, and a later final `text` report. Consumers that need a final answer should scan assistant message content from the end and use the last non-empty `text` part, not the first. Cursor `thinking` deltas are shown as thinking traces when the SDK emits them; those traces can include draft answers or copied exact-output targets and are intentionally not collapsed by this extension.
- **Cursor setting sources default to all.** The extension passes `local.settingSources: ["all"]` by default so configured Cursor MCP servers, plugin tools, project/user settings, and related Cursor-native capabilities are available like they are in Cursor. To narrow loading, set a comma-separated list such as `PI_CURSOR_SETTING_SOURCES=project,user,plugins`. To disable ambient setting sources, set `PI_CURSOR_SETTING_SOURCES=none`. Direct Cursor SDK bootstrap logs (settings, skills, hook-load compatibility warnings, and similar) are suppressed so they do not pollute the TUI.
- **AGENTS.md / CLAUDE.md are not duplicated on Cursor models when Cursor loads the same rules.** Pi discovers global and project context files (`AGENTS.md`, `CLAUDE.md`, and case variants) unless you start with `-nc`. On `cursor/*` models the extension removes only `<project_instructions>` blocks that overlap Cursor `settingSources` via the `before_agent_start` hook: `user` for `~/.pi/agent/AGENTS.md`, `project` for repo/parent `AGENTS.md` and `CLAUDE.md` (verified Cursor behavior: local agents load project `AGENTS.md` and `CLAUDE.md` alongside Cursor rules). `~/.pi/agent/CLAUDE.md` is not stripped (Cursor user rules use `~/.claude/CLAUDE.md`, not pi's agent dir). With `PI_CURSOR_SETTING_SOURCES=none` or `plugins`-only, pi context is left intact. Set `PI_CURSOR_PRESERVE_PI_AGENTS_MD=1` to keep duplicate injection.
- **Max Mode is not a manual pi variant.** Cursor's SDK may enable Max Mode automatically for models that require it. This extension uses each model's default Cursor context and cached checkpoint evidence for pi context accounting.
- **Output token limits are conservative.** Cursor SDK model metadata does not currently expose output token limits directly.
- **Local token usage uses Cursor SDK data when safely attributable.** For local turns with in-time SDK usage, pi records the latest per-turn raw `turn-ended` `inputTokens`, `outputTokens`, `cacheReadTokens`, and `cacheWriteTokens`; that raw local shape keeps full-prompt `inputTokens` with cache as a partition (published SDK `toTokenUsage` totals differ), so pi maps disjoint components (`input = inputTokens - cacheRead - cacheWrite`, plus cache fields) and sets `totalTokens = inputTokens + outputTokens` for occupancy/compaction. If the local SDK reports no usage in time, the extension falls back to local `input/output` activity estimates while setting `totalTokens` to the current replayable context estimate so the footer/compaction percentage does not collapse after split tool turns. Later usage for that live run is ignored rather than risk applying stale usage to the wrong pi turn. Cursor SDK cost is not exposed, so pi cost remains zero/absent.

## Environment variable reference

All `PI_CURSOR_*` overrides in one list. They are otherwise documented where each feature is explained; this section is the index. Boolean flags accept `1`, `true`, `on`, `yes`, `enabled` for on and `0`, `false`, `off`, `none`, `no`, `disabled` for off (case-insensitive); invalid boolean tokens fall back to each flag's default. Non-boolean variables use the parsing and error behavior stated in their row. For timeout pairs, a valid positive `_MS` value wins; an invalid or non-positive `_MS` value is ignored, allowing a valid `_SECONDS` value to apply. Many settings also have CLI flags, `/cursor-*` session commands, or `cursor-sdk.json` keys with their own precedence; see the linked sections.

### Authentication and model catalog

| Variable | Default | Effect |
|---|---|---|
| `CURSOR_API_KEY` | Unset | Authenticates Cursor SDK requests. The stored `/login` credential is preferred; the env var is the fallback. See [Configure your Cursor SDK API key](#configure-your-cursor-sdk-api-key). |
| `PI_CURSOR_SDK_MODEL_CACHE_TTL_MS` | `86400000` (24h) | Fresh-cache lifetime for the discovered model catalog. Parsing uses a leading non-negative base-10 integer (`12.9` and `12junk` become `12`); negative values or values without a numeric prefix fall back to 24h. `0` disables fresh-cache hits but keeps the stale-cache fallback after a discovery failure. See [Model catalog cache](#model-catalog-cache). |
| `PI_CURSOR_SDK_DISABLE_MODEL_CACHE` | Off | Skips model-list cache reads and writes; discovery uses the live catalog when possible. |

### Local runtime and agent behavior

| Variable | Default | Effect |
|---|---|---|
| `PI_CURSOR_LOCAL_FORCE` | Off | Passes `{ local: { force: true } }` to the next local `Agent.send()`; the override is consumed once. |
| `PI_CURSOR_LOCAL_RESUME` | On | Allows reuse of a matching persisted local agent. `PI_CURSOR_LOCAL_RESUME=0` opts out. |
| `PI_CURSOR_SANDBOX` | Off | Passes local sandbox enablement into Cursor SDK agent options. Only enabled values are sent. The SDK runs `cursorsandbox` from the platform package; the extension points the SDK locator at that package during local `Agent.create` / `Agent.resume`. |
| `PI_CURSOR_AUTO_REVIEW` | Off | Passes `autoReview: true` into Cursor SDK agent options. Only enabled values are sent. |
| `PI_CURSOR_HTTP_1_1` | Off | Forces Cursor SDK local-agent streams to HTTP/1.1/SSE for VPN/proxy environments. Session `/cursor-http` commands win over env; project config is ignored. See the `PI_CURSOR_HTTP_1_1` notes under [Cursor provider tool contract](#cursor-provider-tool-contract). |
| `PI_CURSOR_SETTING_SOURCES` | `all` | Cursor SDK setting sources. `all`, `1`, `true`, and `on` select all sources; `none`, `0`, `false`, `off`, `omit`, and `disabled` disable ambient sources. Other comma-separated names such as `project,user,plugins` narrow loading and are forwarded without validation. See [Limits](#limits) and [Cursor tool surfaces in pi](docs/cursor-tool-surfaces.md). |
| `PI_CURSOR_PRESERVE_PI_AGENTS_MD` | Off | Keeps pi `AGENTS.md`/`CLAUDE.md` context injection even when Cursor setting sources load the same rules. |
| `CURSOR_RIPGREP_PATH` | Bundled SDK `rg` when available | Ripgrep executable for the local SDK agent. Only an absolute path is honored; the extension sets the bundled default itself at turn prepare. |
| `CURSOR_TREE_SITTER_VENDOR_DIR` | Bundled SDK `vendor/` when available | Vendored tree-sitter natives for the local SDK agent. Only an absolute path is honored; the extension sets the bundled default itself at turn prepare. |

### Pi tool bridge and tool surfaces

| Variable | Default | Effect |
|---|---|---|
| `PI_CURSOR_PI_TOOL_BRIDGE` | On | Master switch for exposing active pi tools to local Cursor agents through the loopback MCP bridge. `0` rolls back to Cursor SDK tools/settings/MCP only. |
| `PI_CURSOR_EXPOSE_BUILTIN_TOOLS` | Off | Also exposes overlapping pi built-ins (`read`, `bash`, `write`, `edit`, `grep`, `find`, `ls`) that Cursor already implements natively. |
| `PI_CURSOR_TOOL_MANIFEST` | On | Injects the compact callable-surface guidance block on bootstrap sends. |
| `PI_CURSOR_MCP_TOOL_TIMEOUT_MS` / `PI_CURSOR_MCP_TOOL_TIMEOUT_SECONDS` | `3600000` (1h) | Overrides SDK MCP `callTool` timeout for bridged pi tools and configured Cursor MCP servers. Clamped to 60s–~24.8d. |
| `PI_CURSOR_MCP_CONNECT_TIMEOUT_MS` / `PI_CURSOR_MCP_CONNECT_TIMEOUT_SECONDS` | `10000` (10s) | Overrides known MCP initialize/listTools timeouts on first send so dead servers fail fast. Clamped to 1s–60s. Unknown MCP protocol stacks keep the SDK default. |
| `PI_CURSOR_PI_BRIDGE_CALL_TIMEOUT_MS` | Effective MCP tool timeout | Local fail-closed deadline for a stranded bridged `CallTool` awaiting its pi result. Lower it to fail sooner. |
| `PI_CURSOR_PI_TOOL_BRIDGE_DEBUG` | Off | Emits scrubbed single-line JSONL bridge diagnostics to stderr. Do not share logs where tool names are sensitive. |
| `PI_CURSOR_PI_TOOL_BRIDGE_DEBUG_FILE` | Unset | Appends the same JSONL bridge diagnostics to the given file path, independent of the stderr flag. |

See [Cursor provider tool contract](#cursor-provider-tool-contract) for the narrative version of this table.

### Display and replay

| Variable | Default | Effect |
|---|---|---|
| `PI_CURSOR_NATIVE_TOOL_DISPLAY` | TTY/mode-dependent | Requests native rendering of Cursor tool cards. `tui`, `json`, and `rpc` default on; any other explicit mode defaults off. When no mode is supplied, the default follows `stdout.isTTY`. See [Cursor native tool replay](docs/cursor-native-tool-replay.md). |
| `PI_CURSOR_REGISTER_NATIVE_TOOLS` | Follows native-display request; always off in `print` mode | Registers Cursor-native replay tools. Setting it to true does not override `PI_CURSOR_NATIVE_TOOL_DISPLAY=0`; setting it to false disables registration everywhere. |
| `PI_CURSOR_TASK_PRESENTATION` | `subagent-meta` | Task activity titles and transcript headers: exact `task`, `subagent`, or `subagent-meta`. |

### Maintainer debug capture

| Variable | Default | Effect |
|---|---|---|
| `PI_CURSOR_SDK_EVENT_DEBUG` | Off | Captures provider/SDK event artifacts (deltas, steps, replay/drain/bridge decisions) as files only, so the TUI stays normal. See [Maintainer Cursor SDK event capture](#maintainer-cursor-sdk-event-capture) and [Cursor testing lessons](docs/cursor-testing-lessons.md). |
| `PI_CURSOR_SDK_EVENT_DEBUG_DIR` | `.debug/cursor-sdk-events` under cwd | Base directory for debug session artifacts. |
| `PI_CURSOR_SDK_EVENT_DEBUG_RUN_DIR` | Unset | Pins one turn's artifacts to an exact directory, bypassing session grouping. |
| `PI_CURSOR_SDK_EVENT_DEBUG_SESSION_DIR` | Unset | Pins the session's turn grouping and manifest to an exact directory. |
| `PI_CURSOR_SDK_EVENT_DEBUG_STDERR` | Off | Also prints the debug summary (and discarded incomplete-tool records) to stderr. |

Not listed: `PI_CURSOR_BRIDGE_TOOL_CALL_ID` is an internal cancellation marker injected by the bridge on some platforms, not a user setting. `*_SMOKE_*` and `PLATFORM_*` names belong to maintainer smoke scripts, not the extension runtime.

## Troubleshooting

### I can see Cursor models, but runs fail

You may be seeing fallback startup models or a missing/invalid Cursor SDK API key. Cursor Agent CLI/Desktop login is not reused by this extension. In interactive pi, run `/login`, choose `Use an API key`, choose `Cursor`, paste the key, then run `/cursor-refresh-models`.

When a Cursor run fails after auth is configured, pi now surfaces scrubbed provider detail instead of only `Cursor SDK run failed`. Generic SDK failures include safe run metadata such as model id, a short run id prefix, and duration when available, and are phrased as pi retryable provider errors so automatic retry/backoff can recover transient SDK failures.

Aborted runs now include a likely cause when determinable, for example `Cancelled: prompt interrupted.` for user cancel or `Cancelled: Cursor SDK run was cancelled.` for SDK-side cancellation.

Network failures from the Cursor SDK connect layer (for example `ConnectError: read ETIMEDOUT` or `ConnectError: [aborted] read ECONNRESET`) surface as scrubbed `Network error` messages instead of crashing pi, matching pi's native auto-retry classifier. The exact Cursor SDK 1.0.23-provenance `WriteIterableClosedError: WritableIterable is closed` race is contained for the Pi session lifecycle because controlled-exec can reject after the originating provider turn; Connect/network suppression remains active-turn scoped; raw Cursor SDK `AbortError` DOMExceptions are suppressed while any provider turn or session process-error guard is active (stall/inter-turn timers). Unrelated failures remain fatal. The observed raw `write EPIPE` uncaught exception (SDK 1.0.23 local shell executor writes child stdin without a stream error listener; 1.0.27 attaches a no-op listener before that write) is still contained only for that exact one-frame shape and only while a local Cursor provider turn is active; a contained closed pipe marks that turn's pooled/resumable agent transport dead so the next turn recreates it. EPIPE outside an active local turn, and the multi-frame synchronous write-path EPIPE from pi's own piped stdout or a dead terminal, stay fatal. The affected run may still report its underlying transport or tool failure normally. Persistent failures may indicate a transient Cursor service or network issue.

You can also restart pi with a key in the same shell or launcher that starts pi:

```bash
export CURSOR_API_KEY="your-key"
pi --model cursor/grok-4.6
```

Or run a one-shot command:

```bash
pi --api-key "your-key" --model cursor/grok-4.6 -p "Say ok only"
```

### `pi --list-models cursor` shows no Cursor models

Confirm the package is installed:

```bash
pi list
```

Then reinstall if needed:

```bash
pi install npm:@emmaneugene/pi-cursor-sdk
```

### `pi --list-models` shows `thinking=no`

That does not mean the model cannot think. It means the Cursor SDK does not expose a pi-controllable thinking parameter for that model. The model may still think internally and may still emit thinking deltas that pi renders natively.

### I do not see `cursor` or `plan` in the footer

The Cursor footer appears only while a Cursor model is active. Fast-capable models show `cursor · fast:on` or `cursor · fast:off`; Cursor models without a fast parameter show `cursor · fast:n/a`. Cursor SDK mode is the default `agent` mode when `plan` is absent. When plan mode is active, pi shows one combined Cursor status such as `cursor · fast:on · plan`.

### My Cursor app settings or rules do not seem to apply

Cursor setting sources are loaded with `PI_CURSOR_SETTING_SOURCES=all` by default. To narrow loading, set `PI_CURSOR_SETTING_SOURCES=project,user,plugins` or another comma-separated list. If you explicitly disabled sources with `PI_CURSOR_SETTING_SOURCES=none`, remove that override.

### Cursor does not call my web search MCP/tool

Cursor SDK local agents load MCP servers from Cursor setting sources and inline SDK config. This extension enables all Cursor setting sources by default, so a missing web search tool usually means it is not configured in Cursor or the run was started with a narrowing/disable override such as `PI_CURSOR_SETTING_SOURCES=none`.

### I do not see Cursor web search or web fetch in pi's tool UI

pi shows **Cursor web search** / **Cursor web fetch** activity cards only when the installed `@cursor/sdk` reports completed replayable tool data. Supported sources are SDK `mcp` completions whose `toolName` is `WebSearch` / `web_search` / `WebFetch` / similar, host tool names that normalize to those labels, and local Cursor transcript `webSearchToolCall` / `webFetchToolCall` records available through `Agent.messages.list()` after the run. This is separate from SDK `semSearch`, which is semantic **codebase** search.

Known SDK boundary: some local Cursor web search activity is not emitted through live `onDelta`, `onStep`, or `run.stream()` tool events. When that happens, pi can only reconstruct a card from the local agent transcript after `run.wait()` finishes, so the **Cursor web search** card may appear after assistant text rather than as a live in-progress card. Buffering all assistant text until `run.wait()` would make the ordering prettier but would break normal streaming, so pi does not do that.

Known SDK boundary: Cursor SDK `task` activity is shown as **Cursor subagent** because it represents Cursor-spawned child-agent work, but the SDK does not always emit a live nested subagent action stream. Pi shows the subagent start, final output, kind/model/short-ID metadata, and any `conversationSteps` tool-call summaries Cursor returns. If Cursor only returns final subagent text, pi cannot show the subagent's internal read/shell/MCP steps.

Many runs never expose web activity as replayable SDK tool completions or local transcript web tool records. The model may still answer from internal Cursor web tooling or only mention search in assistant text/thinking. In that case pi cannot render a tool card because there is no completed SDK tool-call payload to replay. Capture a run with `npm run debug:provider-events` when investigating; if `on-delta.jsonl`, `on-step.jsonl`, `stream-events.jsonl`, `coordinator-events.jsonl`, and `display-decisions.jsonl` have no completed or transcript web tool data, the limitation is on the Cursor SDK surface, not pi replay registration.

**Web fetch:** `pi-cursor-sdk` can display `webFetchToolCall` transcript records and web-fetch-shaped MCP/host completions when Cursor reports them. It cannot make Cursor expose or execute a `WebFetch` tool. If Cursor's current local SDK tool set does not include WebFetch, pi cannot fetch a URL through Cursor web fetch; use an allowed browser/shell/MCP tool instead.

### I disabled MCP in pi but Cursor still has extra tools

pi extension toggles and pi's MCP catalog do not control Cursor ambient MCP. Local Cursor agents load MCP servers from Cursor setting sources (`PI_CURSOR_SETTING_SOURCES=all` by default), including `~/.cursor/mcp.json`. To remove a server, edit or clear that file (or Cursor MCP settings) and restart the pi session, or narrow/disable sources with `PI_CURSOR_SETTING_SOURCES=none` or a comma-separated subset. See [Cursor tool surfaces in pi](docs/cursor-tool-surfaces.md).

### Cursor does not call my pi extension tool

The local pi bridge only exposes tools that are active in the current pi session and present in pi's tool registry at Cursor run start. By default, it does not expose overlapping pi tool names that Cursor already has native equivalents for (`read`, `bash`, `write`, `edit`, `grep`, `find`, and `ls`). Opt in if you intentionally want Cursor to see both the Cursor-native tool and an overlapping built-in pi tool:

```bash
PI_CURSOR_EXPOSE_BUILTIN_TOOLS=1 pi --model cursor/grok-4.6
```

To disable the bridge for rollback or isolation, start pi with:

```bash
PI_CURSOR_PI_TOOL_BRIDGE=0 pi --model cursor/grok-4.6
```

### First Cursor message is slow (10+ seconds)

The extension loads Cursor setting sources with `PI_CURSOR_SETTING_SOURCES=all` by default, which includes user MCP servers from `~/.cursor/mcp.json`. On the first send of a session, the Cursor SDK connects to each configured MCP server before streaming a reply. pi-cursor-sdk shortens the known MCP initialize/listTools timeout path to **10 seconds by default** (the raw Cursor SDK default is 60 seconds), so a dead server should fail fast instead of blocking for a full minute. Unknown MCP protocol timeout stacks keep the SDK default instead of being shortened. A slow or unavailable server can still add roughly that connect timeout before the first reply. Tighten further with:

```bash
PI_CURSOR_MCP_CONNECT_TIMEOUT_SECONDS=5 pi --model cursor/grok-4.6
PI_CURSOR_MCP_CONNECT_TIMEOUT_MS=5000 pi --model cursor/grok-4.6
```

Workarounds if you do not need user-level MCP in pi:

```bash
PI_CURSOR_SETTING_SOURCES=project,plugins,team pi --model cursor/grok-4.6
```

Or fix/disable the slow MCP server in Cursor settings. Maintainer timing probe: `npm run debug:mcp-coldstart`.

### A Cursor MCP tool times out

The extension raises Cursor SDK's MCP tool-call timeout from 60 seconds to 3600 seconds by default for Cursor SDK MCP `callTool` requests, including the local pi bridge and configured Cursor MCP servers. For longer local MCP tools, set one override:

```bash
PI_CURSOR_MCP_TOOL_TIMEOUT_SECONDS=7200 pi --model cursor/grok-4.6
PI_CURSOR_MCP_TOOL_TIMEOUT_MS=7200000 pi --model cursor/grok-4.6
```

A bridged pi call additionally uses a local deadline capped by that effective MCP timeout. To fail a stranded bridge call sooner without shortening other MCP servers:

```bash
PI_CURSOR_PI_BRIDGE_CALL_TIMEOUT_MS=120000 pi --model cursor/grok-4.6
```

### Tool calls appear as a plain text list instead of pi tool cards

This usually needs session JSONL to classify. Common cases:

- **Model text echo:** Assistant `text` blocks contain lines like `Tool call`, `Cursor activity`, or `call cursor-replay-…` without matching `toolCall` blocks — the Cursor model narrated pi prompt transcript format instead of invoking SDK tools. See [Tool calls listed as plain text (#40 triage)](docs/cursor-testing-lessons.md#tool-calls-listed-as-plain-text-40-triage).
- **Stale replay routing / plan-strip:** Error `toolResult` or error assistant messages contain `Tool grep/cursor/find/ls not found`, or provider debug shows `inactive_trace` after plan-mode execute stripped active tools — tracked in **#52** (distinct from model text echo and #55).
- **Replay vs execution:** `cursor-replay-*` IDs and neutral **Cursor MCP** activity cards are display-only recorded Cursor results; they do not re-run browser/MCP work. See [Cursor native tool replay](docs/cursor-native-tool-replay.md).
- **Run failure / discarded tools:** A red toast with scrubbed detail may indicate an SDK failure (#55). Started-but-never-completed Cursor tools surface neutral **Cursor … did not complete** activity cards with a bounded reason when the run failed, was aborted, or produced no assistant text. After a successful text-producing run, missing-completion starts are debug-only for all tools: the installed Cursor SDK emits `tool-call-started` with no completion delta, step, or conversation entry when a permission policy or hook denies a call, and offers no way to distinguish such denials from lost completions, so suppression is the deliberate choice over false error cards. Maintainer debug for the same gap remains in **#52** (`PI_CURSOR_SDK_EVENT_DEBUG=1`).
- **Hard SDK crash:** pi exited with an uncaught Cursor SDK `ConnectError` or `WriteIterableClosedError` instead of showing a normal run error — capture the stack/session tail as a process-guard regression, not #40 text echo.

Capture `pi --version`, extension version, model, flags, the exact prompt, and a redacted session dir before filing bugs.

### Cursor native tool cards conflict with another extension

Cursor native replay is a display enhancement for TUI sessions and structured JSON/RPC consumers. It replays recorded Cursor SDK activity without re-running tools, and print mode remains text-first. See [Cursor native tool replay](docs/cursor-native-tool-replay.md) for conflict behavior and opt-out flags.

## Development

Run checks:

```bash
npm test
npm run typecheck
```

Check the reviewable Cursor fallback catalog against the authenticated live catalog before releases:

```bash
CURSOR_API_KEY="your-key" npm run check:cursor-snapshots
```

Refresh it after Cursor model changes:

```bash
CURSOR_API_KEY="your-key" npm run refresh:cursor-snapshots -- --write
```

Refresh the bundled default/non-Max context-window snapshot only when checkpoint-derived context windows have been collected from live local runs:

```bash
CURSOR_API_KEY="your-key" npm run refresh:cursor-snapshots -- --write \
  --context-windows ~/.pi/agent/cursor-sdk-context-windows.json
```

The check and refresh modes fetch and sort the same sanitized live catalog. Check mode byte-compares the generated fallback without writing; generated provenance records the installed `@cursor/sdk` version and model count. Both modes print public model metadata only and scrub known auth material from SDK errors. Do not run them with shell tracing that would echo API keys.

Local development run:

```bash
npm install
CURSOR_API_KEY="your-key" pi -ne --approve -e . --model cursor/grok-4.6
```

After editing `src/`, run `npm run build` before the next `pi -e .` run, or pi loads the previous build.

Maintainer design notes live in [`docs/cursor-model-ux-spec.md`](docs/cursor-model-ux-spec.md).

## License

MIT
