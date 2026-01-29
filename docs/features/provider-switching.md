# Provider Switching Feature

## Overview

The Provider Switching feature allows you to use multiple Claude API providers (BigModel, MiniMax, DeepSeek, etc.) through a single UI interface. Each provider runs in its own isolated Docker container, ensuring clean separation and independent resource management.

## Architecture

```
┌─────────────────────────┐
│    ccui-server          │
│  - Web UI (port 7853)   │────▶  Provider Selection UI
│  - API server           │
│  - Runtime routing      │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│              Provider Router Layer                    │
│  Routes requests to correct container               │
└─────────────────────────────────────────────────────┘
         │                   │                   │
         ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  claude-cli    │  │ claude-cli-    │  │ claude-cli-    │
│  (default)     │  │ bigmodel      │  │ minimax       │
│  ~250MB        │  │ ~250MB        │  │ ~250MB        │
└───────────────┘  └───────────────┘  └───────────────┘
```

## Quick Start

### 1. Create Environment File

Create a `.env` file in the project root with your provider credentials:

```bash
# Default provider (Anthropic or custom)
ANTHROPIC_AUTH_TOKEN=sk-ant-your-default-token
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# BigModel provider
BIGMODEL_AUTH_TOKEN=your-bigmodel-token
BIGMODEL_BASE_URL=https://api.bigmodel.cn
BIGMODEL_MODEL=glm-4.7

# MiniMax provider
MINIMAX_AUTH_TOKEN=your-minimax-token
MINIMAX_BASE_URL=https://api.minimax.com
MINIMAX_MODEL=mini-max-model-name

# Available providers (comma-separated, must match container names)
AVAILABLE_PROVIDERS=default,bigmodel,minimax
```

### 2. Start Services

```bash
# Start all services
just up

# Or pull latest images first
just docker-pull
just up
```

### 3. Use the Feature

1. Open the web UI (http://localhost:7853)
2. Go to **Settings** → **Providers** tab
3. Click **Switch** on any available provider
4. New sessions will automatically use the selected provider

## Configuration

### Provider Settings File Format

Each provider can be configured via `~/.claude/settings.{name}.json`:

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "your-token",
    "ANTHROPIC_BASE_URL": "https://api.example.com",
    "ANTHROPIC_MODEL": "model-name"
  }
}
```

### Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `ANTHROPIC_AUTH_TOKEN` | API authentication token | `sk-ant-xxx` |
| `ANTHROPIC_BASE_URL` | API base URL | `https://api.anthropic.com` |
| `ANTHROPIC_MODEL` | Model identifier | `claude-sonnet-4-20250514` |
| `PROVIDER_NAME` | Provider identifier (auto-set) | `bigmodel` |
| `AVAILABLE_PROVIDERS` | Comma-separated list of available providers | `default,bigmodel,minimax` |

### Provider-Specific Variables

Each provider uses its own prefixed variables:

| Provider | Prefix | Variables |
|----------|--------|------------|
| Default | (none) | `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL` |
| BigModel | `BIGMODEL_` | `BIGMODEL_AUTH_TOKEN`, `BIGMODEL_BASE_URL`, `BIGMODEL_MODEL` |
| MiniMax | `MINIMAX_` | `MINIMAX_AUTH_TOKEN`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL` |
| DeepSeek | `DEEPSEEK_` | `DEEPSEEK_AUTH_TOKEN`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL` |

## Adding New Providers

### 1. Create Environment Variables

Add provider-specific variables to `.env`:

```bash
# DeepSeek provider
DEEPSEEK_AUTH_TOKEN=your-deepseek-token
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-model-name
```

### 2. Update AVAILABLE_PROVIDERS

```bash
AVAILABLE_PROVIDERS=default,bigmodel,minimax,deepseek
```

### 3. Add Container to docker-compose.yml

```yaml
  cli-deepseek:
    image: ${CLI_IMAGE:-ghcr.io/oliveagle/claudecodeui/claude-cli:latest}
    container_name: claude-cli-deepseek
    environment:
      - HOME=/workspace
      - ANTHROPIC_AUTH_TOKEN=${DEEPSEEK_AUTH_TOKEN}
      - ANTHROPIC_BASE_URL=${DEEPSEEK_BASE_URL}
      - ANTHROPIC_MODEL=${DEEPSEEK_MODEL}
      - PROVIDER_NAME=deepseek
    volumes:
      - /mnt/volume3/data:/workspace
      - ~/.claude:/workspace/.claude
      # ... other volumes
    restart: unless-stopped
    networks:
      - ccui-network
```

### 4. Update Provider Mapping in server/index.js

```javascript
function getProviderContainer(providerId) {
  const providerMap = {
    'default': 'claude-cli',
    'bigmodel': 'claude-cli-bigmodel',
    'minimax': 'claude-cli-minimax',
    'deepseek': 'claude-cli-deepseek'  // Add this
  };
  return providerMap[providerId] || `claude-cli-${providerId}`;
}
```

## Usage

### Settings UI

1. Open Settings → Providers tab
2. View available providers with their details:
   - Provider name
   - Base URL hostname
   - Model name
   - Container name
   - Availability status
3. Click **Switch** to change provider
4. Confirmation message shows the switch was successful
5. New sessions automatically use the selected provider

### Quick Settings Panel

1. Open Quick Settings (gear icon in sidebar)
2. Find "API Provider" section
3. Click to expand provider list
4. Click on any provider to switch

### API Usage

```javascript
// Get available providers
const providers = await api.providers.list();

// Get current provider
const current = await api.providers.current();

// Switch provider
await api.providers.switch('bigmodel');
```

## Troubleshooting

### Container Not Running

**Error**: `Provider container claude-cli-bigmodel is not running`

**Solution**:
```bash
# Check container status
podman ps -a | grep claude-cli

# Start specific container
podman start claude-cli-bigmodel

# Or restart all services
just down
just up
```

### Provider Not Available

**Error**: `Provider bigmodel is not available`

**Solution**:
1. Check `AVAILABLE_PROVIDERS` in `.env`
2. Ensure provider is listed: `AVAILABLE_PROVIDERS=default,bigmodel`
3. Restart services after changing `.env`

### Authentication Failed

**Error**: API returns 401 or 403

**Solution**:
1. Verify provider credentials in `.env`
2. Check token is valid and not expired
3. Ensure `BASE_URL` is correct for the provider

### Provider Switching Not Working

**Symptoms**: Switch appears successful but sessions still use old provider

**Cause**: Only **new sessions** use the new provider. Active sessions continue with their original provider.

**Solution**: Start a new session after switching providers.

## Development

### Local Development

Without Docker, providers are configured via `~/.claude/settings.{name}.json` files:

```bash
~/.claude/settings.bigmodel.json
~/.claude/settings.minimax.json
~/.claude/settings.deepseek.json
```

The UI will automatically detect and list these providers.

### Testing Provider Switching

```bash
# Start services
just up

# Check containers are running
podman ps

# Test provider API
curl http://localhost:7853/api/providers

# Switch provider
curl -X POST http://localhost:7853/api/providers/switch \
  -H "Content-Type: application/json" \
  -d '{"providerId":"bigmodel"}'

# Verify current provider
curl http://localhost:7853/api/providers/current
```

## Security Considerations

1. **Token Storage**: Never commit `.env` file to version control
2. **File Permissions**: Ensure `.env` has restricted permissions (`chmod 600 .env`)
3. **Container Isolation**: Each provider runs in isolation, preventing token leakage
4. **Network Security**: All containers communicate via private Docker network

## Performance

### Resource Usage

- Each CLI container: ~250MB RAM
- Server container: ~50MB RAM
- Total for 3 providers: ~800MB RAM

### Optimization Tips

1. **Disable unused providers**: Remove from `AVAILABLE_PROVIDERS` and stop containers
2. **Resource limits**: Add memory limits to docker-compose.yml
3. **Shared volumes**: Use volume mounts to avoid duplicating large datasets

## API Reference

### GET /api/providers

List all available providers.

**Response:**
```json
[
  {
    "id": "bigmodel",
    "name": "Bigmodel",
    "baseUrl": "https://api.bigmodel.cn",
    "model": "GLM-4.7",
    "container": "claude-cli-bigmodel",
    "available": true
  }
]
```

### GET /api/providers/current

Get current active provider.

**Response:**
```json
{
  "id": "bigmodel",
  "container": "claude-cli-bigmodel",
  "baseUrl": "https://api.bigmodel.cn",
  "model": "GLM-4.7"
}
```

### POST /api/providers/switch

Switch to a different provider.

**Request:**
```json
{
  "providerId": "bigmodel"
}
```

**Response:**
```json
{
  "success": true,
  "provider": "bigmodel",
  "container": "claude-cli-bigmodel",
  "message": "Switched to bigmodel. New sessions will use this provider."
}
```

## Related Documentation

- [Split Architecture](../proposals/000-multi-cli-architecture.md)
- [Features Overview](./README.md)
- [Docker Build Policy](../../CLAUDE.md#docker-build-policy)
