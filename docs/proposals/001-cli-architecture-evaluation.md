# CLI Architecture Evaluation

**Status:** Draft
**Created:** 2025-01-29
**Context:** Evaluating options for true server-CLI separation in multi-provider architecture

## Background

Current split architecture (v1.15.2+) aims to separate:
- **ccui-server**: Web UI and API service (~50MB)
- **claude-cli**: Claude Code CLI execution (~250MB)

**Goal:** Enable server to execute claude commands in CLI containers for multi-provider support.

## Current State

### What Works Now
```
┌─────────────────────────┐
│    ccui-server          │
│  - Web UI (port 7853)   │
│  - API server           │
│  - claude CLI installed │ ← Direct execution
│  - SQLite database      │
│  - Static frontend      │
└─────────────────────────┘
```

Server currently runs `claude` commands directly within its own container, not using CLI containers.

### What Doesn't Work
- CLI containers exist but are idle (`tail -f /dev/null`)
- No true separation between server and CLI execution
- Each provider's CLI container is unused

## Technical Challenges

### Why Nested Container Execution Fails

**Challenge 1: PTY (Pseudo-Terminal) Requirements**
```bash
# What server needs to do:
podman exec -it claude-cli claude --resume <session-id>
```

Claude CLI requires:
- PTY master/slave for TUI interaction
- Bidirectional data flow (stdin/stdout)
- Terminal size synchronization (SIGWINCH)
- Signal propagation

**Challenge 2: Nested Podman Issues**
```
host → podman → ccui-server → podman exec → claude-cli
        ↓                              ↓
    podman socket                  overlayfs conflict
```

Errors encountered:
- `overlayfs not supported`: Storage driver conflicts
- `permission denied`: User namespace isolation
- `lstat /run/user/1000/libpod`: Socket access issues

**Challenge 3: SDK Limitations**
```javascript
import { query } from '@anthropic-ai/claude-agent-sdk';

// SDK only supports local process spawning
const queryInstance = query({ prompt, options });
// Internally: spawn('claude', args)
```

The SDK (v0.1.29) doesn't support:
- Remote transport
- Custom command execution
- Container-aware execution

## Solution Options

### Option 1: Accept Current Architecture (Recommended)

**Description:** Server runs claude directly, remove unused CLI containers.

**Pros:**
- ✅ Works now
- ✅ Simple architecture
- ✅ Lower maintenance cost
- ✅ Better performance (no container overhead)

**Cons:**
- ❌ No true container separation
- ❌ Server image larger (includes claude)
- ❌ Provider switching via environment variables only

**Implementation:**
```yaml
# docker-compose.yml - Simplified
services:
  server:
    image: ccui-server:latest  # Includes claude CLI
    # Remove: cli, cli-bigmodel, cli-minimax
```

**Effort:** ⭐ (Low) - Just remove unused containers

---

### Option 2: HTTP/WebSocket Proxy Service

**Description:** Add proxy layer to forward commands from server to CLI containers.

```
┌─────────────────────────────────────────────────────────┐
│                    ccui-server                           │
│  ┌──────────────┐         ┌────────────────────────────┐ │
│  │   Web UI     │────────▶│   CLI Proxy Service        │ │
│  │              │         │   - Receive claude commands │ │
│  └──────────────┘         │   - Forward via podman exec │ │
│                           │   - Handle PTY streams      │ │
│                           └────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                                    │ HTTP/WebSocket
                                    ▼
┌─────────────────────────────────────────────────────────┐
│                claude-cli (container)                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │   HTTP Endpoint → claude execution               │  │
│  │   - Receive commands from server                 │  │
│  │   - Execute claude with PTY                      │  │
│  │   - Stream TUI output back                        │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Pros:**
- ✅ True container separation
- ✅ Multi-provider support via routing
- ✅ CLI containers fully utilized
- ✅ Can scale horizontally

**Cons:**
- ❌ Complex implementation (4/5 effort)
- ❌ Need to implement PTY stream forwarding
- ❌ Need to handle terminal control sequences
- ❌ Debugging is harder

**Technical Requirements:**

1. **CLI Container HTTP Service:**
```javascript
// New service needed in CLI container
app.post('/api/claude/exec', async (req, res) => {
  const { sessionId, command, projectPath } = req.body;

  // Execute claude with PTY
  const pty = spawn('claude', ['--resume', sessionId], {
    cwd: projectPath,
    stdio: ['pty', 'pty', 'pipe']
  });

  // Stream output via WebSocket
  pty.stdout.on('data', (data) => ws.send(data));
});
```

2. **Server Proxy Layer:**
```javascript
// Modify server/index.js
async function executeInCLIContainer(provider, command, options) {
  const container = getProviderContainer(provider);
  const response = await fetch(`http://${container}/api/claude/exec`, {
    method: 'POST',
    body: JSON.stringify({ command, options })
  });

  // Handle WebSocket stream
  return response.body;
}
```

3. **PTY Stream Handling:**
- Terminal resize events
- ANSI escape sequences
- Signal forwarding (SIGINT, SIGTSTP)

**Effort:** ⭐⭐⭐⭐ (High) - 2-3 weeks development

---

### Option 3A: SSH to CLI Containers

**Description:** Server connects to CLI containers via SSH.

```bash
# Server executes:
ssh cli-container "claude --resume <session-id>"
```

**Pros:**
- ✅ Uses existing SSH protocol
- ✅ Built-in PTY support

**Cons:**
- ❌ Need sshd in CLI containers
- ❌ Key management complexity
- ❌ Performance overhead
- ❌ Security concerns

**Effort:** ⭐⭐⭐ (Medium)

---

### Option 3B: PID Namespace Sharing

**Description:** Share process namespace between containers.

```yaml
# docker-compose.yml
services:
  server:
    pid: container:claude-cli  # Not well supported in podman
```

**Pros:**
- ✅ Can see CLI processes
- ✅ Direct process communication

**Cons:**
- ❌ Podman has limited support
- ❌ Still need IPC mechanism
- ❌ Security implications

**Effort:** ⭐ (Low) but ⭐⭐⭐⭐ feasibility (unlikely to work)

---

### Option 3C: Unix Socket / Named Pipe

**Description:** CLI containers create Unix sockets, server connects directly.

```bash
# CLI container
claude --socket /tmp/claude.sock

# Server
nc -U /shared/socket/claude.sock
```

**Pros:**
- ✅ Low overhead
- ✅ Native IPC

**Cons:**
- ❌ Claude CLI doesn't support socket mode
- ❌ Would need to fork claude-code
- ❌ Need to implement protocol

**Effort:** ⭐⭐⭐⭐⭐ (Very High) - Requires forking upstream

---

## Comparison Matrix

| Option | Separation | Complexity | Performance | Multi-Provider | Effort |
|--------|-----------|------------|-------------|----------------|--------|
| Option 1: Current | ❌ | ⭐ | ⭐⭐⭐⭐⭐ | ⭐ (via env) | ⭐ |
| Option 2: HTTP Proxy | ✅ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ | ⭐⭐⭐⭐ |
| Option 3A: SSH | ✅ | ⭐⭐⭐ | ⭐⭐⭐ | ✅ | ⭐⭐⭐ |
| Option 3B: PID NS | ⚠️ | ⭐⭐ | ⭐⭐⭐⭐ | ✅ | ⭐⭐⭐⭐ |
| Option 3C: Socket | ✅ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ | ⭐⭐⭐⭐⭐ |

---

## Recommendation

### Short-term: Option 1 (Accept Current)

Keep current architecture where server runs claude directly:
- Remove unused CLI containers to simplify
- Switch providers via environment variables
- Document as single-container architecture

### Long-term: Option 2 (HTTP Proxy) if Separation Needed

If true separation becomes critical (e.g., resource isolation, security):
- Implement HTTP/WebSocket proxy service
- Add to CLI containers as sidecar
- Maintain backward compatibility

### Decision Criteria

Choose Option 2 if:
- ✅ Need resource isolation per provider
- ✅ Need to run CLI containers on different hosts
- ✅ Need different resource limits per provider
- ✅ Need to monitor/provider-specific metrics

Choose Option 1 if:
- ✅ Simple deployment is priority
- ✅ All providers run on same host
- ✅ Resource usage is not a concern

---

## References

- Current architecture: `../features/provider-switching.md`
- Multi-CLI proposal: `./000-multi-cli-architecture.md`
- Docker Compose config: `../../docker-compose.yml`
- Server SDK integration: `../../server/claude-sdk.js`
