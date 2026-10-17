#!/bin/sh
set -eu
cd "$(dirname "$0")"
mkdir -p .private
chmod 700 .private
if [ ! -f .private/compose.env ]; then
  umask 077
  printf 'BT_DEMO_DB_PASSWORD=%s\n' "$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')" > .private/compose.env
fi
printf 'Abrir http://localhost:8080/app.php cuando termine el arranque.\n'
docker compose --env-file .private/compose.env -f compose.yml up --build
