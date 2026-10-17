#!/bin/sh
set -eu
export BT_DEMO=1
export BT_DEMO_PRIVATE=/private-demo
export BT_CONFIG_FILE=/private-demo/config.php
php demo/seed.php
php -S 0.0.0.0:8080 -t backend/public
