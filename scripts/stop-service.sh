#!/usr/bin/env bash
set -euo pipefail

pid_file="${SERVICE_PID_FILE:-}"
if [ -z "$pid_file" ] || [ ! -f "$pid_file" ]; then
  exit 0
fi

pid="$(cat "$pid_file")"
if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
  kill "$pid"
  wait "$pid" 2>/dev/null || true
fi
