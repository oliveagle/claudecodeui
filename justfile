# ===========================================
# DEVELOPMENT WORKFLOW
# ===========================================

# Frontend only - fast iteration (localhost:5173, hot reload)
dev-frontend:
  #!/bin/bash
  echo "Starting frontend dev server on localhost:5173..."
  npm run dev

# Backend only - restart server (port 7853)
dev-backend:
  #!/bin/bash
  pkill -f "node server/index.js" 2>/dev/null || true
  sleep 1
  PORT=7853 nohup node server/index.js > /tmp/ccui-server.log 2>&1 &
  echo "Server started on port 7853 (PID: $!)"

# Full dev restart - frontend + backend
dev: dev-frontend
  @echo "Frontend started. Run 'just dev-backend' to start server."

# ===========================================
# PRODUCTION DEPLOY
# ===========================================

# Pull pre-built image from GitHub (recommended)
docker-pull version="latest":
  #!/bin/bash
  echo "Pulling ghcr.io/oliveagle/claudecodeui/ccui-server:{{version}}..."
  podman pull ghcr.io/oliveagle/claudecodeui/ccui-server:{{version}}

# Start production service
up:
  #!/bin/bash
  echo "Starting production service on port 7853..."
  podman compose -f docker-compose.yml up -d

# Stop production service
down:
  podman compose -f docker-compose.yml down

# ===========================================
# DEVELOPMENT CONTAINER MODE (single container with hot reload)
# ===========================================

# Start dev container with hot reload (single container, frontend + backend)
# Frontend: http://localhost:5174
# Backend API: http://localhost:7853
dev-up:
  #!/bin/bash
  echo "Starting dev container with hot reload..."
  echo "Frontend: http://localhost:5174"
  echo "Backend:  http://localhost:7853"
  podman compose -f docker-compose.dev.yml up -d

# Stop dev container
dev-down:
  podman compose -f docker-compose.dev.yml down

# View dev container logs
dev-logs:
  podman compose -f docker-compose.dev.yml logs -f

# Restart dev container
dev-restart:
  just dev-down && just dev-up

# ===========================================
# UNIFIED DEPLOY COMMANDS
# ===========================================

# Deploy: Pull latest from GitHub and restart
deploy-latest:
  @just docker-pull && just down && just up

# Deploy
deploy: deploy-latest

# Run previous working version on port 7854 (for rollback testing)
prev-work version:
  just prev-working {{version}}

# Run previous working version on port 7854 (for rollback testing)
prev-working version:
  #!/bin/bash
  echo "Starting previous working version {{version}} on port 7854..."
  podman run -d \
    --name ccui-server-prev \
    --restart unless-stopped \
    -p 7854:3000 \
    -v /home/oliveagle/.claude:/home/oliveagle/.claude:ro \
    -v /home/oliveagle/.claude-code:/home/oliveagle/.claude-code:ro \
    -v /home/oliveagle/.claude-code-ui:/home/oliveagle/.claude-code-ui \
    -v /home/oliveagle/.anthropic:/home/oliveagle/.anthropic:ro \
    -v /home/oliveagle/.openrouter:/home/oliveagle/.openrouter:ro \
    -v /home/oliveagle/.openai:/home/oliveagle/.openai:ro \
    -v /home/oliveagle/.gemini:/home/oliveagle/.gemini:ro \
    -v /home/oliveagle/.deepseek:/home/oliveagle/.deepseek:ro \
    -v /home/oliveagle/.siliconflow:/home/oliveagle/.siliconflow:ro \
    -v /home/oliveagle/.modelscope:/home/oliveagle/.modelscope:ro \
    -v /home/oliveagle/.dashscope:/home/oliveagle/.dashscope:ro \
    -v /home/oliveagle/.giteeai:/home/oliveagle/.giteeai:ro \
    -v /home/oliveagle/.github:/home/oliveagle/.github:ro \
    -v /home/oliveagle/.vscode:/home/oliveagle/.vscode:ro \
    -v /home/oliveagle/.continue:/home/oliveagle/.continue:ro \
    -v /home/oliveagle/.aider:/home/oliveagle/.aider:ro \
    -v /home/oliveagle/workspace:/home/oliveagle/workspace \
    -v /mnt/volume3/data/repos:/mnt/volume3/data/repos \
    -e HOME=/home/oliveagle \
    ghcr.io/oliveagle/claudecodeui/ccui-server:{{version}}
  echo "Previous version {{version}} is now running on http://localhost:7854"

# Stop previous working version
prev-working-stop:
  #!/bin/bash
  echo "Stopping previous working version..."
  podman stop ccui-server-prev 2>/dev/null || true
  podman rm ccui-server-prev 2>/dev/null || true
  echo "Previous working version stopped"

# ===========================================
# UTILITIES
# ===========================================

# Check health status
health:
  #!/usr/bin/env bash
  echo "=== CCUI Health Check ==="
  echo ""

  # Check container
  if podman ps -a --format '{{ '{{' }}.Names{{ '}}' }}' 2>/dev/null | grep -q ccui-server; then
    STATUS=$(podman ps --format '{{ '{{' }}.Status{{ '}}' }}' --filter name=ccui-server 2>/dev/null)
    echo "✓ Container: RUNNING ($STATUS)"
  else
    echo "✗ Container: NOT RUNNING"
  fi

  # Check port
  if lsof -i :7853 > /dev/null 2>&1; then
    echo "✓ Port 7853: LISTENING"
  else
    echo "✗ Port 7853: NOT LISTENING"
  fi

  echo ""
  echo "==================="

# View server logs
logs:
  podman compose -f docker-compose.yml logs -f

# Restart service (no rebuild)
restart:
  just down && just up

# ===========================================
# VERSION MANAGEMENT
# ===========================================

version:
  @cat VERSION

version-bump:
  #!/bin/bash
  current=$(cat VERSION)
  IFS='.' read -r major minor patch <<< "$current"
  patch=$((patch + 1))
  new="${major}.${minor}.${patch}"
  echo "$new" > VERSION
  node -e "const p=require('./package.json');p.version='$new';fs.writeFileSync('package.json',JSON.stringify(p,null,2));"
  echo "Bumped: $current → $new"

version-bump-minor:
  #!/bin/bash
  current=$(cat VERSION)
  IFS='.' read -r major minor patch <<< "$current"
  minor=$((minor + 1))
  patch=0
  new="${major}.${minor}.${patch}"
  echo "$new" > VERSION
  node -e "const p=require('./package.json');p.version='$new';fs.writeFileSync('package.json',JSON.stringify(p,null,2));"
  echo "Bumped: $current → $new"

# ===========================================
# LEGACY ALIASES (for compatibility)
# ===========================================

default:
  @just --list

install:
  npm install

build:
  npm run build

start: build
  npm run server

test:
  npm test

server: dev

version-tag:
  #!/bin/bash
  v=$(cat VERSION)
  git tag -a "v$v" -m "Release v$v"
  git push fork "v$v"
  echo "Tag v$v created and pushed"
