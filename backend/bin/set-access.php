<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/bootstrap.php';
if(PHP_SAPI!=='cli')exit(1);
// CLI only: existing account and explicit permission overrides, with session revocation.
[$script,$username,$page,$allowed]=array_pad($argv,4,'');
if(!in_array($page,BT\Policy::PAGES['direccion'],true)||!in_array($allowed,['0','1'],true))throw new RuntimeException('Usage: set-access.php username page 0|1');
$path=getenv('BT_CONFIG_FILE');if(!$path||!is_file($path))throw new RuntimeException('Set BT_CONFIG_FILE');$db=BT\DB::connect(require $path);$db->beginTransaction();
try{$db->query('SELECT id FROM write_mutex WHERE id=1 FOR UPDATE');$q=$db->prepare('SELECT id FROM users WHERE username=? FOR UPDATE');$q->execute([$username]);$id=$q->fetchColumn();if(!$id)throw new RuntimeException('User not found');$q=$db->prepare('INSERT INTO user_permissions(user_id,permission,allowed) VALUES (?,?,?) ON DUPLICATE KEY UPDATE allowed=VALUES(allowed)');$q->execute([$id,$page,(int)$allowed]);$q=$db->prepare('UPDATE users SET auth_version=auth_version+1 WHERE id=?');$q->execute([$id]);$db->commit();echo "Permission set; existing sessions revoked.\n";}catch(Throwable $e){$db->rollBack();throw $e;}
