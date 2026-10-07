#!/usr/bin/env bash
# ==============================================================================
# Shared Compose environment-file chain.
# ==============================================================================
# Sourced by scripts/rebuild.sh and scripts/compose.sh so every entrypoint in
# the project resolves configuration identically.
#
# Compose only auto-loads a dotenv file from the project root. It never picks up
# config/settings.env on its own, so any wrapper that wants the central file to
# take effect has to pass it explicitly — that is this helper's whole job.
#
# Order matters: a later --env-file wins, so the committed shared defaults go
# first and the developer's personal (gitignored) overrides go last. Variables
# already exported in the shell outrank both, which is what makes a one-off run
# such as `LIBRARY_DNS=1.2.3.4 npm run rebuild` work.
#
# Both files are optional. docker-compose.yml carries inline defaults that match
# config/settings.env exactly (enforced by scripts/check-config.sh), so the
# stack still comes up correctly when neither file is present.
# ==============================================================================

# Emits the --env-file arguments for `docker compose`, one token per line, so a
# caller can read them into an array and keep paths with spaces intact.
compose_env_args() {
  local root="${1:?compose_env_args requires the project root}"
  local f
  for f in "${root}/config/settings.env" "${root}/.env"; do
    if [[ -f "$f" ]]; then
      printf '%s\n%s\n' "--env-file" "$f"
    fi
  done
}

# Reads those tokens into the array variable named by $2.
compose_env_args_into() {
  local root="${1:?project root required}"
  local target="${2:?array name required}"
  local -a args=()
  local line
  while IFS= read -r line; do
    [[ -n "$line" ]] && args+=("$line")
  done < <(compose_env_args "$root")
  eval "${target}=(\"\${args[@]}\")"
}
