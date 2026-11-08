#!/bin/sh
set -eu
export BT_DEMO=1
export BT_DEMO_PRIVATE=/private-demo
export BT_CONFIG_FILE=/private-demo/config.php
if [ -n "${CODESPACE_NAME:-}" ]; then
  export BT_ORIGIN="https://${CODESPACE_NAME}-8080.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
fi
php demo/seed.php
php -S 0.0.0.0:8080 -t backend/public backend/public/router.php
