#!/usr/bin/env bash
set -euo pipefail

java -jar app.jar &
java_pid=$!

node ./node_modules/tsx/dist/cli.mjs src/main/server/server.ts &
node_pid=$!

terminate() {
    kill "$java_pid" "$node_pid" 2>/dev/null || true
}

trap terminate SIGINT SIGTERM

set +e
wait -n "$java_pid" "$node_pid"
status=$?
set -e

terminate
wait "$java_pid" "$node_pid" 2>/dev/null || true
exit "$status"
