default:
  @just --list

# Install dependencies
install:
  npm install

# Start dev server
dev:
  #!/bin/bash
  pkill -f "node server/index.js" 2>/dev/null
  sleep 1
  PORT=7853 nohup npm run server > /tmp/server.log 2>&1 &
  echo "Dev server started on port 7853"

# Start server (alias for dev)
server: dev

# Build for production
build:
  npm run build

# Start production server
start: build
  npm run server

# Run tests
test:
  npm test

# Build Docker image locally
docker-build:
  podman build --network=host --ulimit nofile=262144:262144 -f Dockerfile.server -t ccui-server:local .

# Check health status
health:
  #!/bin/bash
  echo "=== Health Check ==="
  echo ""

  # Check server process
  if pgrep -f "node server/index.js" > /dev/null; then
    echo "✓ Server process: RUNNING"
    SERVER_PID=$(pgrep -f "node server/index.js")
    echo "  PID: $SERVER_PID"
  else
    echo "✗ Server process: NOT RUNNING"
  fi

  # Check server port
  if lsof -i :7853 > /dev/null 2>&1; then
    echo "✓ Server port 7853: LISTENING"
  else
    echo "✗ Server port 7853: NOT LISTENING"
  fi

  echo ""
  echo "==================="

# Show current version
version:
  @cat VERSION

# Bump patch version (1.0.0 -> 1.0.1)
version-bump:
  #!/bin/bash
  current=$(cat VERSION)
  IFS='.' read -r major minor patch <<< "$current"
  patch=$((patch + 1))
  new="${major}.${minor}.${patch}"
  echo "$new" > VERSION
  node -e "const p=require('./package.json');p.version='$new';fs.writeFileSync('package.json',JSON.stringify(p,null,2));"
  echo "Bumped version: $current -> $new"

# Bump minor version (1.0.1 -> 1.1.0)
version-bump-minor:
  #!/bin/bash
  current=$(cat VERSION)
  IFS='.' read -r major minor patch <<< "$current"
  minor=$((minor + 1))
  patch=0
  new="${major}.${minor}.${patch}"
  echo "$new" > VERSION
  node -e "const p=require('./package.json');p.version='$new';fs.writeFileSync('package.json',JSON.stringify(p,null,2));"
  echo "Bumped version: $current -> $new"

# Create git tag for current version
version-tag:
  #!/bin/bash
  v=$(cat VERSION)
  git tag -a "v$v" -m "Release v$v"
  git push fork "v$v"
  echo "Created and pushed tag: v$v"

# Start production service with podman compose (port 7853, latest image)
up:
  #!/bin/bash
  echo "Starting production service on port 7853 (latest image)"
  podman compose -f docker-compose.yml down 2>/dev/null || true
  podman compose -f docker-compose.yml up -d

# Stop production service
down:
  podman compose -f docker-compose.yml down

# Start previous working version (MANUALLY MAINTAINED for extreme cases)
# Uses port 7854 to avoid conflict with main service
# Update the image version manually when a new stable version is confirmed
prev-working:
  #!/bin/bash
  VERSION="1.15.1"
  PORT="7854"
  echo "Starting previous working version: $VERSION on port $PORT"
  podman compose -f docker-compose.yml down 2>/dev/null || true
  IMAGE="ghcr.io/oliveagle/claudecodeui/ccui-server:${VERSION}" \
  HOST_PORT="${PORT}" \
  podman compose -f docker-compose.yml up -d
