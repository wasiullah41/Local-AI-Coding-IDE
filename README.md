# ForgeAI Studio

A local-first AI-powered coding environment built with Electron, React, and Node.js. It pairs a real
code editor, terminal, and Git integration with a tool-calling AI agent that can act on the open
workspace under explicit consent.

Everything runs on your machine. The editor and its assets are bundled locally, so the UI works with
no network access; only the LLM endpoint is external, and it is yours to choose.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron |
| Frontend | React · TypeScript · Vite |
| Editor | Monaco Editor (bundled locally, lazily loaded) |
| State | Zustand |
| Backend | Node.js · Express · TypeScript |
| Real-time | WebSocket (shared terminal + agent channel) |
| Database | SQLite |
| Icons | Lucide |

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- Git on `PATH`
- Windows 10/11 (primary target; macOS/Linux planned)
- Optional, for the AI agent: [Ollama](https://ollama.com/) or another OpenAI-compatible server

## Quick Start

```bash
# 1. Install all dependencies
npm run install:all

# 2. Start development mode (backend + frontend + Electron, concurrently)
npm run dev
```

The Electron window opens automatically.

To run the agent, copy the backend env template and point it at a model you have pulled:

```bash
cp backend/.env.example backend/.env
# then edit LLM_MODEL / LLM_PROVIDER as needed
ollama pull llama3.1
```

Without a reachable LLM the IDE is fully usable; the agent panel reports the provider as
unavailable rather than failing silently.

## Scripts

Run from the repository root:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend, frontend, and Electron together |
| `npm run dev:frontend` | Start only the Vite dev server |
| `npm run dev:backend` | Start only the backend (`tsx watch`) |
| `npm run dev:electron` | Compile and launch the Electron shell |
| `npm run build` | Build shared, then backend, then frontend |
| `npm run test` | Run backend (Jest) and frontend (Vitest) tests |
| `npm run lint` | Lint the frontend (backend lint is currently a no-op) |
| `npm run install:all` | Install dependencies in all four packages |
| `npm run clean` | Remove build artifacts |

`npm run build:backend` is plain `tsc`, and `backend/tsconfig.json` sets `rootDir: "./src"`. This is
load-bearing: `npm start` runs `dist/server.js`, so changing `rootDir` would silently leave
`dist/server.js` stale.

## Windows Installer

The Electron shell is packaged with `electron-builder` (configuration lives in
`frontend/package.json` under `build`). Run from the repository root:

```
npm run install:all
npm run build                      # shared + backend + frontend
cd frontend
npm run dist                       # build the frontend, then package the NSIS installer
```

Outputs land in `frontend/release`:

| Artifact | Description |
|----------|-------------|
| `ForgeAI Studio Setup 0.1.0.exe` | NSIS installer, per-user by default, lets you choose the install directory |
| `win-unpacked/ForgeAI Studio.exe` | Unpacked build, useful for testing without installing |

Start Menu and Desktop shortcuts are both named `ForgeAI Studio`. The install directory follows the
product name, so it is `%LOCALAPPDATA%\Programs\ForgeAI Studio`.

Notes on the current packaging:

- **Identity:** product name `ForgeAI Studio`, app id `com.forgeai.studio`, description
  `Local-first AI-powered coding environment`.
- **The backend is not bundled.** The installer ships the Electron shell and the built
  renderer only. Start the backend separately with `npm start`; the app shows
  `Backend connected` in the status bar once it reaches `http://127.0.0.1:3001`.
- **The default Electron icon is used**, because no `build.win.icon` is configured. The
  installer is also unsigned, so Windows SmartScreen will warn on first run.
- The renderer is loaded over `file://` in production. Monaco and its language workers are
  bundled as real chunks (`?worker` imports) and load from inside `app.asar`; the CSP keeps
  `worker-src 'self' blob:` so no CDN or remote code is involved.

## Architecture

### Frontend ↔ Backend Communication

- **REST** for request/response operations: workspace, filesystem, search, Git, settings,
  extensions, terminal, and agent control.
- **WebSocket** for streaming events. Terminal I/O and agent events deliberately share a single
  connection (`frontend/src/services/api/ideWebSocket.ts`) with reconnect backoff from 600 ms to 8 s,
  so one dropped socket cannot leave half the IDE disconnected.

Default endpoints: frontend `http://localhost:5173`, backend `http://127.0.0.1:3001`,
API `http://127.0.0.1:3001/api`, WebSocket `ws://127.0.0.1:3001/ws`. The frontend honours
`VITE_API_URL`, `VITE_BACKEND_HOST`, and `VITE_BACKEND_PORT`.

### Security

- Electron runs with `contextIsolation: true` and `nodeIntegration: false`; all privileged access goes
  through the preload bridge.
- The backend validates every file path against the active workspace boundary and rejects traversal
  with a 403.
- Git runs through `execFile` with argument arrays, so commit messages and paths are passed verbatim
  and never interpreted by a shell. A failing git command is reported as a 400 carrying git's own
  explanation, not a generic 500.
- The renderer Content-Security-Policy blocks external origins, and no asset is fetched from a CDN.
- API keys are read from the environment at runtime and never persisted.

### AI Agent

The agent is implemented, not a placeholder. It lives in `backend/src/ai/`, and reaches the IDE
through a tool registry rather than through ad-hoc calls.

Registered tools: `read_file`, `list_directory`, `create_file`, `edit_file`, `delete_file`,
`search_files`, `git_status`, `git_diff`, `terminal`, and `verify`.

Sensitive actions request consent first. A permission request is emitted over the WebSocket, the UI
shows it, and the agent waits for a response; unanswered requests are denied. The timeout is 120
seconds with denial as the default. Running tasks can be cancelled, and cancellation propagates to
the underlying tool calls.

Agent endpoints: `GET /api/agent/status`, `GET /api/agent/permissions`, `POST /api/agent/task`,
`POST /api/agent/cancel`, `POST /api/agent/permission/respond`, `GET /api/agent/task/:taskId`.

Prompts are assembled in `agentOrchestrator.buildMessages()`, which combines a system prompt with
bounded context from `ContextBuilder`: the active task, the open files, prior tool results, and
recent conversation turns. Tool observations are replayed as provider-compatible user turns
prefixed with `Tool result:` so models that reject assistant-role tool messages still receive the
history.

## Capabilities

- [x] Open local project folders
- [x] File explorer backed by the real filesystem
- [x] Monaco editor with multi-language syntax highlighting and light/dark themes
- [x] Integrated terminal with one PTY per session
- [x] Project-wide search (text, regex, filters)
- [x] Git integration (status, stage, unstage, commit, per-file diff)
- [x] Command palette
- [x] Persistent, per-window-resizable layout
- [x] Settings and extension architecture
- [x] AI agent with tool use, consent prompts, and cancellation
- [ ] Voice assistant (planned)
- [ ] Multi-agent system (planned)

## Testing

`npm run test` runs both suites. Coverage includes the agent prompt and context assembly, agent
failure and cancellation paths, filesystem boundary enforcement, Git error reporting and shell-safe
argument handling, and the frontend layout and store behavior.

## License

Private — All rights reserved.
