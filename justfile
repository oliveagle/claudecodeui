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
# UNIFIED DEPLOY COMMANDS
# ===========================================

# Deploy: Pull latest from GitHub and restart
deploy-latest:
  @just docker-pull && just down && just up

# Deploy
deploy: deploy-latest

# ===========================================
# UTILITIES
# ===========================================

# Check health status
health:
  #!/bin/bash
  echo "=== CCUI Health Check ==="
  echo ""

  # Check container
  if podman ps --format '{{.Names}}' | grep -q ccui-server; then
    STATUS=$(podman ps --format '{{.Status}}' --filter name=ccui-server)
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
