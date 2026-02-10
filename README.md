<p align="center">
  <img src="screenshot.png" alt="Companion" width="100%" />
</p>

<h1 align="center">Companion</h1>

<p align="center">
  A browser-based UI for Claude Code, built on a reverse-engineered WebSocket protocol.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/companion"><img src="https://img.shields.io/npm/v/companion.svg?style=flat-square&color=cb3837" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/companion"><img src="https://img.shields.io/npm/dm/companion.svg?style=flat-square&color=cb3837" alt="npm downloads" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="MIT License" /></a>
</p>

---

Claude Code is powerful but stuck in a terminal. Companion gives it a proper interface — multiple sessions, streaming responses, tool call visibility, and permission control. No API key needed, it runs on your existing Claude Code subscription.

```bash
bunx companion
```

Open [localhost:3456](http://localhost:3456).

## Features

**Multiple sessions** — Run several Claude Code instances side by side. Each gets its own process, model, and permission settings.

**Real-time streaming** — Responses render token by token as the agent writes them.

**Tool call visibility** — Every Bash command, file read, edit, and grep is visible in collapsible blocks with syntax highlighting.

**Subagent nesting** — When an agent spawns sub-agents, their work renders hierarchically so you can follow the full chain.

**Permission control** — Four modes, from auto-approve everything to manual approval for each tool call.

**Session persistence** — Sessions save to disk and auto-recover with `--resume` after server restarts or CLI crashes.

**Environment profiles** — Store API keys and config per-project in `~/.companion/envs/` without touching your shell.

**Git worktrees** — Spin up isolated branches per session so parallel agents don't collide.

**Desktop app** — Electron wrapper available for macOS, Windows, and Linux.

## How it works

The Claude Code CLI has a hidden `--sdk-url` flag. When set, it connects to a WebSocket server instead of running in a terminal. The protocol is NDJSON (newline-delimited JSON). Companion sits in the middle and bridges that protocol to the browser.

```
Claude Code CLI  ◄── NDJSON WebSocket ──►  Bun + Hono Server  ◄── JSON WebSocket ──►  Browser (React)
  /ws/cli/:id                                    :3456                                /ws/browser/:id
```

1. You type a prompt in the browser
2. Server spawns `claude --sdk-url ws://localhost:3456/ws/cli/SESSION_ID`
3. CLI connects back over WebSocket
4. Messages flow both ways — your prompts to the CLI, streaming responses back
5. Tool calls show up as approval prompts in the browser

The full protocol (13 control subtypes, permission flow, reconnection logic, session lifecycle) is documented in [`WEBSOCKET_PROTOCOL_REVERSED.md`](WEBSOCKET_PROTOCOL_REVERSED.md).

## Development

```bash
git clone https://github.com/The-Vibe-Company/companion.git
cd companion/web
bun install
bun run dev
```

This starts the Hono backend on `:3456` and Vite with HMR on `:5174`.

```bash
bun run build && bun run start    # production build, serves on :3456
bun run typecheck                 # type checking
bun test                          # run tests
```

### Desktop app

Requires `make dev` running separately for dev mode.

```bash
npm run electron:dev              # dev mode
npm run electron:start            # production build + launch
npm run electron:pack             # package distributable
```

## Tech stack

Bun, Hono, React 19, Zustand, Tailwind CSS v4, Vite, Electron.

## Contributing

Check [open issues](https://github.com/The-Vibe-Company/companion/issues), fork, branch, PR. For protocol-level work, read the [WebSocket spec](WEBSOCKET_PROTOCOL_REVERSED.md) first.

## License

[MIT](LICENSE)
