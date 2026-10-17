<?php
declare(strict_types=1);
// Development/demo server only. Production exposes public files through the web server.
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
if($path==='/'){require __DIR__.'/app.php';return true;}
if(is_file(__DIR__.$path))return false;
http_response_code(404);echo 'No encontrado';return true;
