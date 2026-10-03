#!/bin/sh
# ==============================================================================
# Ollama entrypoint with corporate TLS trust and model preloading.
#
# The stock image starts `ollama serve` directly, which leaves no opportunity to
# register a corporate root CA. Behind a TLS-intercepting proxy, every call to
# registry.ollama.ai fails the certificate check unless the enterprise CA is
# trusted, and no model can be pulled.
#
# Any *.crt / *.pem dropped into the repository's `certs/` directory is mounted
# read-only at ENTERPRISE_CA_DIR and installed into the OS trust store here,
# before the server starts.
# ==============================================================================
set -e

ENTERPRISE_CA_DIR="${ENTERPRISE_CA_DIR:-/usr/local/share/enterprise-ca}"
OLLAMA_PRELOAD_MODELS="${OLLAMA_PRELOAD_MODELS:-}"

install_enterprise_ca() {
  if [ ! -d "$ENTERPRISE_CA_DIR" ]; then
    return 0
  fi

  installed=0
  for cert in "$ENTERPRISE_CA_DIR"/*.crt "$ENTERPRISE_CA_DIR"/*.pem; do
    [ -f "$cert" ] || continue
    # update-ca-certificates only considers files with a .crt extension.
    target="/usr/local/share/ca-certificates/$(basename "${cert%.*}").crt"
    cp "$cert" "$target"
    installed=$((installed + 1))
  done

  if [ "$installed" -gt 0 ]; then
    echo "[ollama-entrypoint] Registering $installed enterprise CA certificate(s)..."
    update-ca-certificates >/dev/null 2>&1 || true
  fi

  # SSL_CERT_FILE must point at the merged bundle. Pointing it at a single
  # corporate certificate would discard every public root CA.
  export SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
  export SSL_CERT_DIR=/etc/ssl/certs
}

# Pulls the models the Spring AI backend expects, once the server is accepting
# requests. Runs in the background so `ollama serve` stays PID 1.
preload_models() {
  [ -n "$OLLAMA_PRELOAD_MODELS" ] || return 0

  (
    for _ in $(seq 1 60); do
      if ollama list >/dev/null 2>&1; then
        break
      fi
      sleep 2
    done

    for model in $OLLAMA_PRELOAD_MODELS; do
      if ollama list 2>/dev/null | awk '{print $1}' | grep -qx "$model\(:latest\)\?"; then
        echo "[ollama-entrypoint] Model '$model' already present, skipping."
        continue
      fi
      echo "[ollama-entrypoint] Pulling model '$model'..."
      if ollama pull "$model"; then
        echo "[ollama-entrypoint] Model '$model' ready."
      else
        echo "[ollama-entrypoint] WARNING: failed to pull '$model'." >&2
      fi
    done
  ) &
}

install_enterprise_ca
preload_models

exec /bin/ollama serve
