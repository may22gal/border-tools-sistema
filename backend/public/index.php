<?php
declare(strict_types=1);
// Future document root: ONLY this public directory and the existing UI assets.
// Place backend/src, migrations, configuration and storage outside public_html.
require_once (getenv('BT_BACKEND_ROOT')?:dirname(__DIR__)).'/src/bootstrap.php';
use BT\{App,Auth,DB,Problem};
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');header('Referrer-Policy: same-origin');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
try {
    $path=getenv('BT_CONFIG_FILE');BT\requireThat($path&&is_file($path),'Backend configuration unavailable',503);$config=require $path;
    $db=DB::connect($config);$auth=new Auth($db,$config);$auth->session();$op=$_GET['action']??'state';$method=$_SERVER['REQUEST_METHOD'];
    $input=[];if($method==='POST'){$auth->csrf();BT\requireThat(str_starts_with($_SERVER['CONTENT_TYPE']??'','application/json'),'JSON required',415);BT\requireThat((int)($_SERVER['CONTENT_LENGTH']??0)<=1048576,'Request too large',413);$raw=file_get_contents('php://input',false,null,0,1048577);BT\requireThat(strlen($raw)<=1048576,'Request too large',413);$input=json_decode($raw,true,32,JSON_THROW_ON_ERROR);BT\requireThat(is_array($input),'JSON object required');}
    if($op==='csrf'){BT\requireThat($method==='GET','Method not allowed',405);$out=['csrf'=>$_SESSION['csrf']];}
    elseif($op==='login'){BT\requireThat($method==='POST','Method not allowed',405);$auth->login((string)($input['username']??''),(string)($input['password']??''),(string)($_SERVER['REMOTE_ADDR']??''));$out=['user'=>$auth->policy()->user,'csrf'=>$_SESSION['csrf']];}
    elseif($op==='logout'){BT\requireThat($method==='POST','Method not allowed',405);$auth->logout();$out=['ok'=>true];}
    else{$app=new App($db,$auth->policy());if($op==='request.status'){BT\requireThat($method==='GET','Method not allowed',405);$out=$app->receipt((string)($_GET['key']??''));}elseif($op==='reports'){BT\requireThat($method==='GET','Method not allowed',405);$db->beginTransaction();try{$out=$app->report(['start'=>$_GET['start']??'','end'=>$_GET['end']??''],($_GET['branch']??'')?:null);$db->commit();}catch(Throwable $e){$db->rollBack();throw $e;}}elseif($op==='state'){BT\requireThat($method==='GET','Method not allowed',405);$db->beginTransaction();try{$out=$app->state();$db->commit();}catch(Throwable $e){$db->rollBack();throw $e;}}else{BT\requireThat($method==='POST','Method not allowed',405);$out=$app->command($op,$input,$_SERVER['HTTP_IDEMPOTENCY_KEY']??'');}}
    echo json_encode($out,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);
}catch(Problem $e){http_response_code($e->status);echo json_encode(['error'=>$e->getMessage()]);}
catch(JsonException){http_response_code(400);echo '{"error":"Invalid JSON"}';}
catch(PDOException $e){http_response_code($e->getCode()==='23000'?409:503);echo '{"error":"Database operation rejected or unavailable"}';}
catch(Throwable){http_response_code(500);echo '{"error":"Internal operation failed"}';}
