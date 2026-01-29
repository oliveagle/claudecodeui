# Multi-CLI Architecture Proposal

**Status**: Draft
**Created**: 2026-01-29
**Author**: Claude
**Tags**: architecture, scalability, containers

## Abstract

Enable a single ccui-server instance to manage multiple claude-cli containers, allowing parallel agent execution, resource isolation, and dynamic scaling.

## Motivation

### Current State
- Single server + single CLI container
- Only one agent task can run at a time
- CLI updates require rebuilding ~250MB image
- No resource isolation between projects/users

### Problems
1. **Serial execution** - Multiple users/projects must wait for each other
2. **Wasted resources** - Server sits idle during long-running tasks
3. **No isolation** - All tasks share the same CLI environment
4. **Monolithic updates** - CLI changes affect entire deployment

### Benefits
1. **Parallel execution** - Multiple agents run simultaneously
2. **Better utilization** - Make full use of available resources
3. **Isolation** - Separate environments per project/user
4. **Dynamic scaling** - Create/destroy CLI instances on demand

## Proposed Design

### Architecture

```
┌─────────────────────────────────────────┐
│           ccui-server (1 instance)       │
│  ┌───────────────────────────────────┐  │
│  │  Task Scheduler / Queue Manager   │  │
│  │  - Queue incoming tasks           │  │
│  │  - Assign to available CLI pool   │  │
│  │  - Manage container lifecycle     │  │
│  └───────────────────────────────────┘  │
│               │                          │
│      ┌────────┴────────┐                 │
│      │                 │                 │
│      ▼                 ▼                 │
│ ┌─────────┐      ┌─────────┐            │
│ │  Web    │      │  API    │            │
│ │  UI     │      │  Server │            │
│ └─────────┘      └─────────┘            │
└─────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
   ┌────────┐  ┌────────┐  ┌────────┐
   │ cli-1  │  │ cli-2  │  │ cli-N  │
   │ Project│  │ Project│  │ On-demand│
   │   A    │  │   B    │  │        │
   └────────┘  └────────┘  └────────┘
```

### Components

#### 1. Task Scheduler
- Queue-based task management
- Priority scheduling (FIFO, priority-based)
- Status tracking (pending, running, completed, failed)

#### 2. CLI Pool Manager
- Static pool: Always-running CLI instances
- Dynamic pool: Create on-demand, destroy when idle
- Health checking and auto-recovery

#### 3. Container API Wrapper
```javascript
// Interface for executing commands in CLI containers
class CLIExecutor {
  async execute(command, options) {
    // Find or create CLI instance
    const container = await this.acquireContainer(options);

    // Execute command via podman exec
    const result = await this.execInContainer(container, command);

    // Return container to pool or destroy if dynamic
    await this.releaseContainer(container, options);

    return result;
  }

  async acquireContainer({ projectId, userId }) {
    // 1. Check for project-specific container
    // 2. Check for idle container in pool
    // 3. Create new container if needed
  }
}
```

### Implementation Plan

#### Phase 1: Basic Multi-CLI Support
- [ ] CLI pool manager with static configuration
- [ ] Container allocation logic
- [ ] Basic `podman exec` wrapper
- [ ] Status tracking

#### Phase 2: Dynamic Scaling
- [ ] On-demand container creation
- [ ] Idle timeout and cleanup
- [ ] Resource limits (CPU, memory)

#### Phase 3: Advanced Features
- [ ] Per-project isolation
- [ ] Priority queuing
- [ ] Task history and logs
- [ ] Web UI for monitoring

### Configuration

```yaml
# docker-compose.yml
services:
  server:
    image: ccui-server:latest
    environment:
      - CLI_POOL_SIZE=3           # Static pool size
      - CLI_MAX_CONTAINERS=10     # Max including dynamic
      - CLI_IDLE_TIMEOUT=300      # Seconds before cleanup

  cli-pool:
    image: claude-cli:latest
    deploy:
      replicas: 3                 # Initial pool size
```

### API Changes

```typescript
// New API endpoints
POST /api/tasks                    // Submit task to queue
GET  /api/tasks/:id                // Get task status
GET  /api/tasks                    // List all tasks
GET  /api/cli/containers           // List CLI containers
POST /api/cli/containers/:id/exec  // Execute in container
```

## Alternatives Considered

### Alternative 1: Single CLI with Concurrency
Run multiple Claude Code instances in one container.
- **Pros**: Simpler deployment
- **Cons**: No isolation, resource contention
- **Decision**: Rejected due to isolation concerns

### Alternative 2: K8s/Orchestration
Use Kubernetes for full orchestration.
- **Pros**: Production-grade scaling
- **Cons**: Complex setup, overkill for current scale
- **Decision**: Defer until scale demands it

## Open Questions

1. **State management**: How to handle database/connections per CLI?
   - Option A: Shared volume with subdirectories
   - Option B: Separate state per container

2. **Authentication**: How to secure container access?
   - Option A: Internal network only
   - Option B: mTLS between containers

3. **Resource limits**: What are reasonable defaults?
   - CPU per container?
   - Memory per container?

## Migration Path

1. Deploy new server with multi-CLI support
2. Existing single-CLI setup continues working
3. Gradually enable features via configuration
4. Deprecate single-CLI mode after validation

## References

- [Docker exec API](https://docs.docker.com/engine/api/v1.45/#tag/Container/operation/ContainerExec)
- [Podman exec](https://docs.podman.io/en/latest/markdown/podman-exec.1.html)
- Current architecture: `CLAUDE.md` - Split Container Architecture
