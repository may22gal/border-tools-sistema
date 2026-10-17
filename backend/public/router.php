<?php
declare(strict_types=1);
// Development/demo server only. Production exposes public files through the web server.
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
if($path==='/'){require __DIR__.'/app.php';return true;}
$file=realpath(__DIR__.$path);
if($file&&str_starts_with($file,__DIR__.DIRECTORY_SEPARATOR)&&is_file($file)&&!str_starts_with(basename($file),'.'))return false;
http_response_code(404);echo 'No encontrado';return true;
