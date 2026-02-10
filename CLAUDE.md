# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Companion — a web UI for Claude Code. It reverse-engineers the undocumented `--sdk-url` WebSocket protocol in the Claude Code CLI to provide a browser-based interface for running multiple Claude Code sessions with streaming, tool call visibility, and permission control.

## Development Commands

```bash
# Dev server (Hono backend on :3456 + Vite HMR on :5174)
cd web && bun install && bun run dev

# Or from repo root
make dev

# Type checking
cd web && bun run typecheck

# Run tests
cd web && bun test                          # all tests
cd web && bun test server/__tests__/git-utils.test.ts  # single file

# Production build + serve
cd web && bun run build && bun run start
```

### Electron (desktop app)

```bash
# Dev mode (requires `make dev` running separately)
npm run electron:dev

# Production build + launch
npm run electron:start

# Package distributable
npm run electron:pack
```

## Architecture

### Data Flow

```
Browser (React) ←→ WebSocket ←→ Hono Server (Bun) ←→ WebSocket (NDJSON) ←→ Claude Code CLI
     :5174              /ws/browser/:id        :3456        /ws/cli/:id         (--sdk-url)
```

1. Browser sends a "create session" REST call to the server
2. Server spawns `claude --sdk-url ws://localhost:3456/ws/cli/SESSION_ID` as a subprocess
3. CLI connects back to the server over WebSocket using NDJSON protocol
4. Server bridges messages between CLI WebSocket and browser WebSocket
5. Tool calls arrive as `control_request` (subtype `can_use_tool`) — browser renders approval UI, server relays `control_response` back

In dev mode, Vite on `:5174` proxies `/api` and `/ws` to the Hono backend on `:3456` (configured in `web/vite.config.ts`).

### All code lives under `web/`

- **`web/server/`** — Hono + Bun backend (runs on port 3456)
  - `index.ts` — Server bootstrap, Bun.serve with dual WebSocket upgrade (CLI vs browser). Sets `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.
  - `ws-bridge.ts` — Core message router. Maintains per-session state (CLI socket, browser sockets, message history, pending permissions). Parses NDJSON from CLI, translates to typed JSON for browsers.
  - `cli-launcher.ts` — Spawns/kills/relaunches Claude Code CLI processes. Handles `--resume` for session recovery. Persists session state across server restarts.
  - `session-store.ts` — JSON file persistence to `$TMPDIR/vibe-sessions/`. Debounced writes.
  - `session-types.ts` — All TypeScript types for CLI messages (NDJSON), browser messages, session state, permissions.
  - `routes.ts` — REST API: session CRUD, filesystem browsing, environment management, git worktree operations.
  - `env-manager.ts` — CRUD for environment profiles stored in `~/.companion/envs/`.
  - `git-utils.ts` — Git operations: repo info, branch listing, worktree create/remove.
  - `worktree-tracker.ts` — Tracks session-to-worktree mappings, persisted to `~/.companion/worktrees.json`.

- **`web/src/`** — React 19 frontend
  - `store.ts` — Zustand store. All state keyed by session ID (messages, streaming text, permissions, tasks, connection status). Persists to localStorage with `cc-` prefix keys.
  - `ws.ts` — Browser WebSocket client. Connects per-session, handles all incoming message types, auto-reconnects. Extracts task items from `TaskCreate`/`TaskUpdate`/`TodoWrite` tool calls.
  - `types.ts` — Re-exports server types + client-only types (`ChatMessage`, `TaskItem`, `SdkSessionInfo`).
  - `api.ts` — REST client for session management.
  - `App.tsx` — Root layout with sidebar, chat view, task panel. Hash routing (`#/playground`).
  - `components/` — UI: `ChatView`, `MessageFeed`, `MessageBubble`, `ToolBlock`, `Composer`, `Sidebar`, `TopBar`, `HomePage`, `TaskPanel`, `PermissionBanner`, `EnvManager`, `Playground`, `CommandPalette`, `Toast`, `Lightbox`.

- **`web/bin/cli.ts`** — CLI entry point (`bunx companion`). Sets `__VIBE_PACKAGE_ROOT` and imports the server.

- **`electron/`** — Electron wrapper (desktop app)
  - `main.ts` — BrowserWindow creation, spawns Bun server in production or connects to dev Vite URL.
  - `bun-server.ts` — Manages the Bun subprocess for the packaged Electron app.
  - `port-finder.ts` / `menu.ts` / `preload.ts` — Supporting Electron plumbing.

### WebSocket Protocol

The CLI uses NDJSON (newline-delimited JSON). Key message types from CLI: `system` (init/status), `assistant`, `result`, `stream_event`, `control_request`, `tool_progress`, `tool_use_summary`, `keep_alive`, `auth_status`. Messages to CLI: `user`, `control_response`, `control_request` (for interrupt/set_model/set_permission_mode).

Full protocol documentation is in `WEBSOCKET_PROTOCOL_REVERSED.md`.

### Session Lifecycle

Sessions persist to disk (`$TMPDIR/vibe-sessions/`) and survive server restarts. On restart, live CLI processes are detected by PID and given a grace period (10s) to reconnect their WebSocket. If they don't, they're killed and relaunched with `--resume` using the CLI's internal session ID.

### Release Process

Releases are automated via release-please on push to `main`. On release creation, GitHub Actions publishes to npm (from `web/`) and builds Electron distributables (macOS/Windows/Linux).

## Key Conventions

- **Tech stack**: Bun runtime, Hono server, React 19, Zustand, Tailwind CSS v4, Vite
- **Styling**: Tailwind v4 with custom CSS theme variables prefixed `--color-cc-*` (defined in `web/src/index.css`). Use `bg-cc-*`, `text-cc-*`, etc. utility classes.
- **State**: All frontend state lives in one Zustand store (`web/src/store.ts`). State is keyed by session ID — never use global singletons for per-session data.
- **Types**: Shared types live in `web/server/session-types.ts` and are re-exported by `web/src/types.ts`. Don't duplicate type definitions between frontend and backend.
- **Tests**: Use `bun:test` (not Jest/Vitest). Test files go in `__tests__/` directories adjacent to source.

## Browser Exploration

Always use `agent-browser` CLI command to explore the browser. Never use playwright or other browser automation libraries.

## Pull Requests

When submitting a pull request:
- Use commitizen to format the commit message and the PR title
- Add a screenshot of the changes in the PR description if it's a visual change
- Explain simply what the PR does and why it's needed
- Tell me if the code was reviewed by a human or simply generated directly by an AI
