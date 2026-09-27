# Phase 9: AI Coding Agent Foundation

This document outlines the architecture, implementation, and current status of the Local AI Coding Agent within the project.

## Architecture

The agent is designed as a secure, restricted orchestration system consisting of:

- **AgentOrchestrator**: The core loop that receives user tasks, interacts with the LLM to get actions, validates them, and executes tools.
- **AgentState**: Tracks the state of the agent's execution.
- **ContextBuilder**: Constructs the context sent to the LLM, ensuring strict boundaries to protect secrets and system environment.
- **ToolRegistry**: Central place for registering and executing AI tools, enforcing security policies and permissions.
- **PermissionManager**: Manages permissions and policies for tools.
- **LLMProvider**: Abstraction for interacting with LLMs.
- **MockLLMProvider**: Deterministic LLM provider for E2E testing.

## Implementation Status

- **AgentOrchestrator**: Partially Implemented (needs robust parsing and iteration control).
- **AgentState**: Implemented.
- **ContextBuilder**: Implemented.
- **ToolRegistry/Tools**: 10 tools implemented.
- **PermissionManager**: Implemented.
- **MockLLMProvider**: Implemented.

## Security Boundaries

- Tools are registered with specific permissions (`READ`, `WRITE`, `DELETE`, `TERMINAL`, etc.).
- `PermissionManager` enforces a policy (default policies enforce confirmation for dangerous actions).
- `ContextBuilder` intentionally censors sensitive information like environment variables and API keys from the LLM.
- The `AgentOrchestrator` execution loop limits iterations to prevent infinite loops.
- Terminal commands are restricted through a policy-based approach.

## UI Status

PHASE 9 UI IS NOT IMPLEMENTED.
