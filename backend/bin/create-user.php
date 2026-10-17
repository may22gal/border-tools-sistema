<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/bootstrap.php';
if(PHP_SAPI!=='cli')exit(1);
// Provisioning only. Password comes from STDIN (not arguments, repository or logs).
[$script,$username,$name,$role,$branchList]=array_pad($argv,5,'');
if(!isset(BT\Policy::PAGES[$role])||!$username||!$name)throw new RuntimeException('Usage: create-user.php username display-name role Granjero,Troncoso');
$branches=explode(',',$branchList);if(array_diff($branches,['Granjero','Troncoso'])||!$branches)throw new RuntimeException('Invalid branches');
if($role==='ventas_g'&&$branches!==['Granjero']||$role==='ventas_t'&&$branches!==['Troncoso'])throw new RuntimeException('Sales role branch mismatch');
$password=rtrim(stream_get_contents(STDIN),"\r\n");if(strlen($password)<12||strlen($password)>72)throw new RuntimeException('Password must have 12 to 72 bytes');
$path=getenv('BT_CONFIG_FILE');if(!$path||!is_file($path))throw new RuntimeException('Set BT_CONFIG_FILE');$db=BT\DB::connect(require $path);$db->beginTransaction();
try{$id=BT\uuid();$q=$db->prepare('INSERT INTO users(id,username,display_name,password_hash,role) VALUES (?,?,?,?,?)');$q->execute([$id,$username,$name,password_hash($password,PASSWORD_DEFAULT),$role]);$q=$db->prepare('INSERT INTO user_branches VALUES (?,?)');foreach(array_unique($branches) as $b)$q->execute([$id,$b]);$db->commit();echo "User provisioned. No password is printed.\n";}catch(Throwable $e){$db->rollBack();throw $e;}
