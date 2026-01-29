# Feature Roadmap

This document tracks feature ideas, their status, and implementation priority.

## Legend

| Status | Description |
|--------|-------------|
| 💡 Idea | Initial concept, needs discussion |
| 📋 Planned | Approved, awaiting implementation |
| 🚧 In Progress | Currently being developed |
| ✅ Done | Implemented and released |
| ❌ Cancelled | Declined or no longer relevant |

## Features

### High Priority

| Feature | Status | Proposal | Description |
|---------|--------|----------|-------------|
| Split Architecture (Server + CLI) | 🚧 In Progress | - | Separate server (~50MB) and CLI (~250MB) containers |
| Multi-CLI Architecture | 📋 Planned | [000-multi-cli](../proposals/000-multi-cli-architecture.md) | Single server manages multiple CLI containers |

### Medium Priority

| Feature | Status | Proposal | Description |
|---------|--------|----------|-------------|
| Task Queue System | 💡 Idea | - | Queue and schedule agent tasks |
| Real-time Updates | 💡 Idea | - | WebSocket-based task progress updates |
| Per-Project Isolation | 💡 Idea | - | Separate CLI containers per project |

### Low Priority

| Feature | Status | Proposal | Description |
|---------|--------|----------|-------------|
| Metrics Dashboard | 💡 Idea | - | Web UI for monitoring resource usage |
| Custom Tooling | 💡 Idea | - | Allow users to add custom tools to CLI |
| Cloud Deployment | 💡 Idea | - | One-click deploy to cloud providers |

## In Progress

### 1. Split Architecture: Server + CLI (v1.15.2+)
**Status**: 🚧 In Progress (Verification phase)

Separated the monolithic container into two specialized containers:

| Container | Size | Purpose |
|-----------|------|---------|
| ccui-server | ~50MB | Web UI, API server, SQLite database |
| claude-cli | ~250MB | Claude CLI, agent execution, toolchain (just, gh, git, npm, python) |

**Benefits**:
- Server updates no longer require rebuilding 200MB+ CLI layer
- CLI can be updated independently
- Better Docker layer caching
- Foundation for multi-CLI architecture

**Files**: `Dockerfile.server`, `Dockerfile.cli`, `docker-compose.yml`

**Current Status**:
- Code changes merged
- Waiting for GitHub Actions to build images
- Server container running, CLI container pending build

**Verification Steps**:
- [ ] CLI image built successfully
- [ ] Both containers start correctly
- [ ] Health check passes for both containers
- [ ] End-to-end functionality verified

## Under Discussion

### 1. Multi-CLI Architecture
**Proposal**: [000-multi-cli](../proposals/000-multi-cli-architecture.md)

Enable parallel agent execution by managing multiple CLI containers from a single server instance.

**Open Questions**:
- How to handle state management per container?
- What resource limits are appropriate?
- Migration path from single-CLI setup?

**Next Steps**: Review proposal, define Phase 1 scope

## Contributing

To add a new feature:

1. Check if it's already listed
2. Create a proposal for major features (see `../proposals/`)
3. Add entry to appropriate priority section
4. Link to proposal or issue tracker

## Template

```markdown
### Feature Name
| Status | Proposal | Description |
|---------|----------|-------------|
| 📋 Planned | [link] | One-line description |

**Details**: Longer description if needed

**Dependencies**: What needs to be done first

**Estimated Effort**: Small | Medium | Large
```
