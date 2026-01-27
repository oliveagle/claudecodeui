default:
  @just --list

# Install dependencies
install:
  npm install

# Start dev mode (server + client)
dev:
  #!/bin/bash
  pkill -f "node server/index.js" 2>/dev/null
  pkill -f "vite" 2>/dev/null
  sleep 1
  PORT=7853 nohup npm run server > /tmp/server.log 2>&1 &
  sleep 2
  (export VITE_PORT=5174 && export PORT=7853 && nohup npx vite --host > /tmp/client.log 2>&1 &)
  echo "Server and Client started"

# Start only client in background
client:
  #!/bin/bash
  pkill -f "vite" 2>/dev/null
  sleep 1
  (export VITE_PORT=5174 && export PORT=7853 && nohup npx vite --host > /tmp/client.log 2>&1 &)
  echo "Client started on port 5174"

# Start only server
server:
  #!/bin/bash
  pkill -f "node server/index.js" 2>/dev/null
  sleep 1
  PORT=7853 nohup npm run server > /tmp/server.log 2>&1 &
  echo "Server started on port 7853"

# Build for production
build:
  npm run build

# Start production server
start: build
  npm run server

# Run tests
test:
  npm test

# Check health status of server and client
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

  # Check client process
  if pgrep -f "vite" > /dev/null; then
    echo "✓ Client process: RUNNING"
    CLIENT_PID=$(pgrep -f "vite" | head -1)
    echo "  PID: $CLIENT_PID"
  else
    echo "✗ Client process: NOT RUNNING"
  fi

  # Check client port
  if lsof -i :5174 > /dev/null 2>&1; then
    echo "✓ Client port 5174: LISTENING"
  else
    echo "✗ Client port 5174: NOT LISTENING"
  fi

  echo ""
  echo "==================="
