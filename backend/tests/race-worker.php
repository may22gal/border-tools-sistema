<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/bootstrap.php';
$data=json_decode(base64_decode($argv[1]),true,512,JSON_THROW_ON_ERROR);
$db=BT\DB::connect(['dsn'=>getenv('BT_TEST_DSN')?:'mysql:host=127.0.0.1;port=3306;dbname=bt_test;charset=utf8mb4','user'=>getenv('BT_TEST_USER')?:'root','password'=>getenv('BT_TEST_PASSWORD')?:'']);
$app=new BT\App($db,new BT\Policy($data['user'],['Granjero','Troncoso']));
try{$app->command('credit.payment',$data['payload'],$argv[2]);echo '200';}catch(BT\Problem $e){echo $e->status;}
