<?php
declare(strict_types=1);
// Development/demo server only. Production exposes public files through the web server.
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
$root=realpath($_SERVER['DOCUMENT_ROOT']??__DIR__)?:__DIR__;
if($path==='/'){require $root.'/app.php';return true;}
$file=realpath($root.$path);
if($file&&str_starts_with($file,$root.DIRECTORY_SEPARATOR)&&is_file($file)&&!str_starts_with(basename($file),'.'))return false;
http_response_code(404);echo 'No encontrado';return true;
