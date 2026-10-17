<?php
declare(strict_types=1);
require dirname(__DIR__).'/backend/src/bootstrap.php';
use BT\{DB,Policy,App};
if(PHP_SAPI!=='cli'||getenv('BT_DEMO')!=='1')throw new RuntimeException('Synthetic demo only, BT_DEMO=1 required');
$private=getenv('BT_DEMO_PRIVATE')?:__DIR__.'/.private';if(!is_dir($private))mkdir($private,0700,true);
foreach(['storage','sessions'] as $dir)if(!is_dir($private.'/'.$dir))mkdir($private.'/'.$dir,0700,true);
$config=['dsn'=>getenv('BT_TEST_DSN')?:'mysql:host=mysql;dbname=bt_demo;charset=utf8mb4','user'=>getenv('BT_TEST_USER')?:'bt_demo','password'=>getenv('BT_TEST_PASSWORD')?:'','origin'=>getenv('BT_ORIGIN')?:'http://localhost:8080','storage'=>$private.'/storage','session_path'=>$private.'/sessions','allow_http_test'=>true,'demo_mode'=>true];
file_put_contents($private.'/config.php',"<?php\nreturn ".var_export($config,true).";\n");chmod($private.'/config.php',0600);
$db=DB::connect($config);
if(!$db->query('SHOW TABLES')->fetch())$db->exec(file_get_contents(dirname(__DIR__).'/backend/migrations/001_initial.sql'));
if((int)$db->query('SELECT COUNT(*) FROM users')->fetchColumn()>0){echo "Demo already initialized; no data overwritten.\n";exit;}
$creds=[];$users=[];$password=bin2hex(random_bytes(12));
foreach(array_keys(Policy::PAGES) as $role){$u=['id'=>BT\uuid(),'username'=>'demo_'.$role,'display_name'=>'Prueba '.ucfirst($role),'role'=>$role];$q=$db->prepare('INSERT INTO users(id,username,display_name,password_hash,role) VALUES (?,?,?,?,?)');$q->execute([$u['id'],$u['username'],$u['display_name'],password_hash($password,PASSWORD_DEFAULT),$role]);$branches=match($role){'ventas_g'=>['Granjero'],'ventas_t'=>['Troncoso'],default=>['Granjero','Troncoso']};$q=$db->prepare('INSERT INTO user_branches VALUES (?,?)');foreach($branches as $branch)$q->execute([$u['id'],$branch]);$users[$role]=$u;$creds[$role]=['username'=>$u['username'],'password'=>$password];}
file_put_contents($private.'/credentials.json',json_encode($creds,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));chmod($private.'/credentials.json',0600);
$app=new App($db,new Policy($users['direccion'],['Granjero','Troncoso']));$n=0;$run=static function($action,$data)use($app,&$n){return $app->command($action,$data,'synthetic-demo-'.str_pad((string)++$n,8,'0',STR_PAD_LEFT));};
$date=date('Y-m-d');$ident=fn($row)=>['id'=>$row['id'],'version'=>(int)$row['_version']];
foreach(['Granjero','Troncoso'] as $branch){
 $client=$run('catalog.create',['entity'=>'clientesB2B','nombre'=>'Cliente ficticio '.$branch,'contacto'=>'Contacto de prueba','sucursal'=>$branch,'credito'=>'5000.00']);
 $sale=$run('sales.save',['fecha'=>$date,'sucursal'=>$branch,'efectivo'=>'1250.00','transferencia'=>'500.00','transferenciaStatus'=>'Pendiente','tarjeta'=>'250.00','cheque'=>'0.00','credito'=>'400.00','manoObra'=>'150.00','totalVentaSicar'=>'2400.00','observacion'=>'Datos ficticios para demostrar conexión MySQL']);
 $credit=$run('credit.assign',$ident($sale)+['cliente'=>$client['nombre'],'clienteId'=>$client['id'],'monto'=>'300.00']);
 $run('credit.payment',$ident($credit)+['fecha'=>$date,'monto'=>'50.00','metodo'=>'Efectivo']);
 foreach(['gastos','proveedores'] as $group)$run('expense.create',['fecha'=>$date,'sucursal'=>$branch,'grupo'=>$group,'categoria'=>$group==='gastos'?'Renta':'Mercancía / Proveedores','concepto'=>'Movimiento ficticio '.$group,'proveedor'=>'Proveedor ficticio','monto'=>'100.00','metodo'=>'Transferencia']);
 $employee=$run('catalog.create',['entity'=>'nomina','nombre'=>'Empleado ficticio '.$branch,'rol'=>'Puesto de prueba','sucursal'=>$branch,'sueldo'=>'500.00']);
 $run('payroll.pay',$ident($employee)+['tipo'=>'nomina','fecha'=>$date,'periodo'=>'Período de prueba','monto'=>'500.00','metodo'=>'Transferencia']);
 $run('catalog.create',['entity'=>'comisiones','empleadoId'=>$employee['id'],'periodo'=>'Prueba','monto'=>'100.00']);
 $run('cash.close',['fecha'=>$date,'sucursal'=>$branch,'fondo'=>'0.00','contado'=>'1300.00','retiro'=>'0.00']);
 $run('stock.save',['sku'=>'FICTICIO-'.$branch,'producto'=>'Herramienta ficticia','sucursal'=>$branch,'actual'=>'4','minimo'=>'5']);
 $run('inventory.move',['sku'=>'FICTICIO-'.$branch,'producto'=>'Herramienta ficticia','fecha'=>$date,'sucursal'=>$branch,'tipo'=>'Entrada','cantidad'=>'1']);
 $run('catalog.create',['entity'=>'facturacion','folio'=>'F-DEMO-'.$branch,'cliente'=>'Cliente ficticio','fecha'=>$date,'total'=>'100.00','sucursal'=>$branch,'estado'=>'Pendiente']);
 $run('catalog.create',['entity'=>'compras','folio'=>'OC-DEMO-'.$branch,'proveedor'=>'Proveedor ficticio','fecha'=>$date,'monto'=>'100.00','sucursal'=>$branch]);
 $run('catalog.create',['entity'=>'oportunidades','nombre'=>'Prospecto ficticio '.$branch,'contacto'=>'Contacto de prueba','monto'=>'2500.00','tipo'=>'Prospecto B2B','sucursal'=>$branch,'estado'=>'Cotización']);
 $run('catalog.create',['entity'=>'ml','producto'=>'Publicación ficticia '.$branch,'precio'=>'100.00','mercado'=>'Referencia ficticia','stock'=>'1','sucursal'=>$branch,'estado'=>'Competitivo']);
 $service=$run('service.create',['cliente'=>'Servicio ficticio '.$branch,'herramienta'=>'Herramienta ficticia','modelo'=>'Modelo de prueba','serie'=>'FICTICIO','tel'=>'','sucursal'=>$branch,'entrada'=>$date,'falla'=>'Falla simulada','diagnosticoCosto'=>'250.00']);
 $service=$run('service.transition',$ident($service)+['operation'=>'diagnose','diagnostico'=>'Diagnóstico ficticio']);
 $run('service.transition',$ident($service)+['operation'=>'quote','items'=>[['descripcion'=>'Trabajo ficticio','monto'=>'500.00']]]);
}
$run('balance.save',['cuenta'=>'Cuenta ficticia de prueba','tipo'=>'Banco','sucursal'=>'Consolidado','saldo'=>'10000.00','fecha'=>$date]);
$run('expense.create',['fecha'=>$date,'sucursal'=>'Ambas','grupo'=>'gastos','categoria'=>'Consumibles','concepto'=>'Cargo ficticio a tarjeta','monto'=>'500.00','metodo'=>'Tarjeta','pagoAplazado'=>true]);
echo "Demo conectada, únicamente datos ficticios.\nUsuario: demo_direccion\nContraseña temporal: $password\n";
