<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/bootstrap.php';
if(PHP_SAPI!=='cli')exit(1);
$path=getenv('BT_CONFIG_FILE');if(!$path||!is_file($path))throw new RuntimeException('Set BT_CONFIG_FILE to private configuration');
$db=BT\DB::connect(require $path);
if($db->query('SHOW TABLES')->fetch())throw new RuntimeException('Migration requires an empty dedicated database. No existing tables will be changed.');
$db->exec(file_get_contents(dirname(__DIR__).'/migrations/001_initial.sql'));
echo "Schema installed. No users or operational data created.\n";
