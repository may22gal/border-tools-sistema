<?php
declare(strict_types=1);
// Copy OUTSIDE the web root. Actual credentials are never committed.
return [
    'dsn' => getenv('BT_DB_DSN') ?: '',
    'user' => getenv('BT_DB_USER') ?: '',
    'password' => getenv('BT_DB_PASSWORD') ?: '',
    'origin' => getenv('BT_ORIGIN') ?: 'https://sistema.border-tools.com',
    'storage' => getenv('BT_PRIVATE_STORAGE') ?: '',
    'session_path' => getenv('BT_SESSION_PATH') ?: '',
    'allow_http_test' => false,
];
