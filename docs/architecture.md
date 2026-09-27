# Architecture Overview

## Design Principles
- Local-first
- Desktop-optimized
- Modular backend
- AI-ready foundation

## Communication
- REST API for structured data (project structure, settings)
- WebSocket for streams (terminal, file system watcher)

## Data
- SQLite for local databases
- Filesystem for project storage

## AI Foundation
- AI panel UI decoupled from backend services
- Future tools will utilize `shared/types/ai.ts` and `backend/src/future/ai/` interfaces
