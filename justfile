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
  echo "Starting dev server on port 7853..."
  PORT=7853 npm run server

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

# Build frontend only (server images must be built via GitHub Actions)
docker-build:
  npm run build

# Build and run frontend-only container (fast, for frontend development)
docker-frontend:
  #!/bin/bash
  echo "Building frontend-only image..."
  podman build -f Dockerfile.frontend -t ccui-frontend:local .
  echo "Starting frontend on http://localhost:3000"
  podman run -d --rm -p 3000:80 --name ccui-frontend ccui-frontend:local

# Stop frontend container
docker-frontend-stop:
  podman stop ccui-frontend 2>/dev/null || true

# Pull and use pre-built server image from GitHub (required - local builds don't work)
docker-pull version="latest":
  #!/bin/bash
  echo "Pulling pre-built server image from GitHub (local builds have compatibility issues)..."
  podman pull ghcr.io/oliveagle/claudecodeui/ccui-server:{{version}}
  podman tag ghcr.io/oliveagle/claudecodeui/ccui-server:{{version}} localhost/ccui-server:local
  echo "Image tagged as localhost/ccui-server:local"
  echo "Run 'just up' to start the service"

# Show build workflow (server builds MUST use GitHub Actions)
docker-workflow:
  #!/bin/bash
  echo "=== Docker Build Workflow ==="
  echo ""
  echo "❌ DO NOT build server images locally - better-sqlite3 will fail"
  echo ""
  echo "Frontend changes:"
  echo "  1. just docker-build    # Builds frontend only"
  echo "  2. just up              # Restart service"
  echo ""
  echo "Server changes:"
  echo "  1. Commit and push to GitHub"
  echo "  2. Wait for GitHub Actions to build image"
  echo "  3. just docker-pull <version>    # e.g., just docker-pull 1.15.2"
  echo "  4. just up"
  echo ""
  echo "Quick start (use latest):"
  echo "  1. just docker-pull"
  echo "  2. just up"

# Start production service with podman compose
up:
  #!/bin/bash
  echo "Starting production service on port 7853"
  podman compose -f docker-compose.yml up -d

# Stop production service
down:
  podman compose -f docker-compose.yml down

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
