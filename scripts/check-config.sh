#!/usr/bin/env bash
# ==============================================================================
# Configuration drift check.
# ==============================================================================
# docker-compose.yml deliberately carries `${VAR:-default}` fallbacks so a bare
# `docker compose up` — which reads no env file at all — still produces a
# correct stack. config/settings.env repeats those same values as the editable
# single source of truth.
#
# That duplication is only safe while the two agree. If they drift, the central
# file quietly becomes a lie: someone edits it, runs plain `docker compose up`,
# and gets the stale inline default instead. This script makes that impossible
# to miss by comparing every variable the two files share.
#
# Run directly (`npm run config:check`); also invoked by scripts/rebuild.sh.
# ==============================================================================
set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SETTINGS="${PROJECT_ROOT}/config/settings.env"
COMPOSE="${PROJECT_ROOT}/docker-compose.yml"

BOLD=$'\033[1m'; RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RESET=$'\033[0m'
[[ -t 1 ]] || { BOLD=""; RED=""; GREEN=""; YELLOW=""; RESET=""; }

[[ -f "$SETTINGS" ]] || { echo "${RED}✗${RESET} missing ${SETTINGS}"; exit 1; }
[[ -f "$COMPOSE"  ]] || { echo "${RED}✗${RESET} missing ${COMPOSE}";  exit 1; }

python3 - "$SETTINGS" "$COMPOSE" <<'PY'
import re, sys

settings_path, compose_path = sys.argv[1], sys.argv[2]

settings = {}
for raw in open(settings_path, encoding='utf-8'):
    line = raw.strip()
    if not line or line.startswith('#') or '=' not in line:
        continue
    key, _, value = line.partition('=')
    settings[key.strip()] = value.strip()

compose_text = open(compose_path, encoding='utf-8').read()

# Capture ${VAR:-default}. The default runs to the matching brace; values here
# never contain one, so a negated class is sufficient and avoids over-matching.
defaults = {}
for key, default in re.findall(r'\$\{([A-Za-z_][A-Za-z0-9_]*):-([^}]*)\}', compose_text):
    defaults.setdefault(key, default)

# Variables referenced with no fallback at all: a bare `docker compose up`
# would silently substitute an empty string.
bare = {
    k for k in re.findall(r'\$\{([A-Za-z_][A-Za-z0-9_]*)\}', compose_text)
    if k not in defaults
}

drift, missing_in_settings = [], []
for key, default in sorted(defaults.items()):
    if key not in settings:
        missing_in_settings.append((key, default))
    elif settings[key] != default:
        drift.append((key, settings[key], default))

unused = sorted(k for k in settings if k not in defaults and k not in bare)

problems = False

if drift:
    problems = True
    print(f"\033[31m✗\033[0m {len(drift)} setting(s) disagree with the docker-compose.yml fallback:\n")
    for key, s_val, c_val in drift:
        print(f"    \033[1m{key}\033[0m")
        print(f"      config/settings.env : {s_val or '(empty)'}")
        print(f"      docker-compose.yml  : {c_val or '(empty)'}")
    print("\n    A bare `docker compose up` reads no env file, so it would use the")
    print("    compose value. Make the two match.\n")

if missing_in_settings:
    problems = True
    print(f"\033[31m✗\033[0m {len(missing_in_settings)} compose variable(s) are not listed in config/settings.env:\n")
    for key, default in missing_in_settings:
        print(f"    {key}={default or '(empty)'}")
    print("\n    Add them so every knob stays discoverable in one place.\n")

if bare:
    problems = True
    print(f"\033[31m✗\033[0m {len(bare)} compose variable(s) have no `:-default` fallback:\n")
    for key in sorted(bare):
        print(f"    {key}")
    print("\n    Without a fallback these resolve to an empty string when no env\n"
          "    file is passed. Give each one a default matching settings.env.\n")

if unused:
    print(f"\033[33m!\033[0m {len(unused)} setting(s) in config/settings.env are not referenced by docker-compose.yml:")
    for key in unused:
        print(f"    {key}")
    print("    (Fine if consumed elsewhere — otherwise they do nothing.)\n")

if problems:
    sys.exit(1)

print(f"\033[32m✓\033[0m config/settings.env and docker-compose.yml agree "
      f"({len(defaults)} settings checked).")
PY
