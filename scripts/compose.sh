#!/usr/bin/env bash
# ==============================================================================
# `docker compose` with the project's configuration chain wired up.
# ==============================================================================
# Plain `docker compose` does not read config/settings.env, so edits made there
# appear to have no effect. This wrapper passes the chain for you:
#
#   npm run compose -- up -d
#   npm run compose -- logs -f personal-library-app
#   npm run compose -- ps
#
# Everything after `--` is handed to docker compose untouched.
# ==============================================================================
set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/compose-env.sh
source "${PROJECT_ROOT}/scripts/lib/compose-env.sh"

cd "$PROJECT_ROOT"
compose_env_args_into "$PROJECT_ROOT" ENV_ARGS
exec docker compose "${ENV_ARGS[@]}" "$@"
