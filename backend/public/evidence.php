<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/src/bootstrap.php';
use BT\{DB,Auth,Problem};
header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');
$target=null;
try{
    $path=getenv('BT_CONFIG_FILE');BT\requireThat($path&&is_file($path),'Configuration unavailable',503);$config=require $path;$db=DB::connect($config);$auth=new Auth($db,$config);$auth->session();$p=$auth->policy();
    BT\requireThat($p->page('ventas')||$p->page('ventas_admin')||$p->page('reportes'),'Evidence denied',403);
    $storage=realpath($config['storage']);$doc=realpath($_SERVER['DOCUMENT_ROOT']??__DIR__);BT\requireThat($storage&&$doc&&!str_starts_with($storage.DIRECTORY_SEPARATOR,$doc.DIRECTORY_SEPARATOR),'Private storage must be outside webroot',503);
    if($_SERVER['REQUEST_METHOD']==='GET'){
        $q=$db->prepare('SELECT e.* FROM evidence e JOIN ventas v ON v.evidenciaId=e.id WHERE e.id=? LIMIT 1');$q->execute([$_GET['id']??'']);$e=$q->fetch();BT\requireThat((bool)$e,'Evidence not found',404);$p->branch($e['branch_name']);$file=$storage.'/'.$e['storage_name'];BT\requireThat(is_file($file)&&hash_equals($e['sha256'],hash_file('sha256',$file)),'Evidence integrity check failed',503);
        header('Content-Type: application/pdf');header('Content-Disposition: attachment; filename="SICAR.pdf"');header('Content-Length: '.filesize($file));readfile($file);exit;
    }
    BT\requireThat($_SERVER['REQUEST_METHOD']==='POST','Method not allowed',405);$auth->csrf();$p->action('sale');$p->demand('ventas');$branch=$_POST['sucursal']??'';$p->branch($branch);BT\requireThat(in_array($branch,['Granjero','Troncoso'],true),'Invalid branch');
    $f=$_FILES['pdf']??null;BT\requireThat($f&&$f['error']===UPLOAD_ERR_OK&&$f['size']>0&&$f['size']<=10485760&&is_uploaded_file($f['tmp_name']),'Invalid or oversized PDF');
    BT\requireThat((new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name'])==='application/pdf'&&file_get_contents($f['tmp_name'],false,null,0,5)==='%PDF-','PDF required');
    $id=BT\uuid();$name=bin2hex(random_bytes(24)).'.pdf';$target=$storage.'/'.$name;$original=basename(str_replace('\\','/',$f['name']));BT\requireThat(strlen($original)<=255,'Filename too long');
    $db->beginTransaction();$db->query('SELECT id FROM write_mutex WHERE id=1 FOR UPDATE');
    BT\requireThat(move_uploaded_file($f['tmp_name'],$target),'Upload failed',503);chmod($target,0600);$q=$db->prepare('INSERT INTO evidence(id,storage_name,original_name,sha256,size_bytes,branch_name,uploaded_by) VALUES (?,?,?,?,?,?,?)');$q->execute([$id,$name,$original,hash_file('sha256',$target),filesize($target),$branch,$p->user['id']]);$db->commit();$target=null;header('Content-Type: application/json');echo json_encode(['evidenciaId'=>$id,'sicarArchivo'=>$original]);
}catch(Problem $e){if(isset($db)&&$db->inTransaction())$db->rollBack();if($target&&is_file($target))unlink($target);http_response_code($e->status);header('Content-Type: application/json');echo json_encode(['error'=>$e->getMessage()]);}
catch(Throwable){if(isset($db)&&$db->inTransaction())$db->rollBack();if($target&&is_file($target))unlink($target);http_response_code(503);header('Content-Type: application/json');echo '{"error":"Evidence operation failed"}';}
