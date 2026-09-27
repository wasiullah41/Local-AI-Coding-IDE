# Local AI Coding IDE

A professional desktop development environment built with Electron, React, and Node.js. Designed as a fully local IDE with an architecture ready for future AI coding agent integration.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron |
| Frontend | React · TypeScript · Vite |
| Editor | Monaco Editor |
| State | Zustand |
| Backend | Node.js · Express · TypeScript |
| Real-time | WebSocket |
| Database | SQLite |
| Icons | Lucide |

## Project Structure

```
local-ai-coding-ide/
├── frontend/       Electron + React application
├── backend/        Node.js + Express IDE services
├── shared/         Shared TypeScript types and constants
├── docs/           Architecture and design docs
├── scripts/        Setup and utility scripts
├── package.json    Root orchestration
└── README.md
```

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- Git
- Windows 10/11 (primary target; macOS/Linux planned)

## Quick Start

```bash
# 1. Install all dependencies
npm run install:all

# 2. Start development mode (backend + frontend concurrently)
npm run dev
```

The IDE window will open automatically via Electron.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend and frontend in dev mode |
| `npm run dev:frontend` | Start only the frontend |
| `npm run dev:backend` | Start only the backend |
| `npm run build` | Build shared, backend, and frontend for production |
| `npm run test` | Run all tests |
| `npm run lint` | Lint all packages |
| `npm run install:all` | Install dependencies for all packages |
| `npm run clean` | Remove build artifacts |

## Architecture

### Frontend ↔ Backend Communication

- **REST API** for request/response operations (file read/write, search, git commands)
- **WebSocket** for streaming events (terminal I/O, file watch events, real-time updates)

### Security

- Electron runs with `contextIsolation: true` and `nodeIntegration: false`
- All Node.js access goes through a secure preload bridge
- Backend validates all file paths against workspace boundaries
- No arbitrary filesystem or shell access exposed via API

### AI-Ready Design

The architecture reserves integration points for a future local AI coding agent:

- `shared/types/ai.ts` — message, tool, plan, and agent interfaces
- `backend/src/future/ai/` — tool registry and agent context stubs
- `frontend/src/components/ai/` — AI panel UI placeholder
- `frontend/src/stores/aiStore.ts` — AI state management stub
- WebSocket events for AI streaming already defined

The AI layer will connect a local LLM to the existing backend services (filesystem, terminal, git, search) through a tool registry, without rewriting the IDE core.

## Current Capabilities (v0.1)

- [x] Open local project folders
- [x] File explorer with real filesystem
- [x] Monaco editor with multi-language syntax highlighting
- [x] Integrated terminal (PowerShell / CMD)
- [x] Project-wide search (text, regex, filters)
- [x] Git integration (status, stage, commit, diff, branches)
- [x] Command palette
- [x] Persistent settings
- [x] Extension architecture foundation
- [ ] AI coding agent (planned)
- [ ] Voice assistant (planned)
- [ ] Multi-agent system (planned)

## License

Private — All rights reserved.
