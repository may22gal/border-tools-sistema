<?php
declare(strict_types=1);
namespace BT;
use PDO;
final class Auth {
    public function __construct(private PDO $db,private array $config) {}
    public function session(): void {
        requireTransport($this->config);
        ini_set('session.use_strict_mode','1');ini_set('session.use_only_cookies','1');ini_set('session.gc_maxlifetime','1800');
        if(!empty($this->config['session_path']))session_save_path($this->config['session_path']);
        session_name('BTADMIN');session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Strict']);session_start();
        $_SESSION['csrf']??=bin2hex(random_bytes(32));
    }
    public function csrf(): void {
        requireThat(hash_equals($_SESSION['csrf']??'',$_SERVER['HTTP_X_CSRF_TOKEN']??'')&&!empty($_SESSION['csrf']),'CSRF rejected',403);
        requireThat(($_SERVER['HTTP_ORIGIN']??'')===$this->config['origin'],'Origin rejected',403);
    }
    public function login(string $username,string $password,string $address): void {
        requireThat(strlen($username)<=100&&strlen($password)<=1024,'Invalid credentials',401);
        $bucket=hash('sha256',strtolower($username).'|'.$address);
        $this->db->beginTransaction();
        try{
            $q=$this->db->prepare('INSERT IGNORE INTO login_attempts(bucket) VALUES (?)');$q->execute([$bucket]);
            $q=$this->db->prepare('SELECT *, blocked_until > UTC_TIMESTAMP(6) AS blocked FROM login_attempts WHERE bucket=? FOR UPDATE');$q->execute([$bucket]);$a=$q->fetch();
            if($a['blocked']){$this->db->commit();throw new Problem(429,'Try again later');}
            $q=$this->db->prepare('SELECT * FROM users WHERE username=?');$q->execute([$username]);$u=$q->fetch();
            // A valid fixed dummy hash keeps password verification on the unknown-user path.
            $hash=$u['password_hash']??'$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
            $ok=password_verify($password,$hash)&&$u&&$u['active'];
            if(!$ok){$q=$this->db->prepare('UPDATE login_attempts SET failures=failures+1,blocked_until=IF(failures>=5,DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 15 MINUTE),NULL),updated_at=UTC_TIMESTAMP(6) WHERE bucket=?');$q->execute([$bucket]);$this->db->commit();throw new Problem(401,'Invalid credentials');}
            $q=$this->db->prepare('DELETE FROM login_attempts WHERE bucket=?');$q->execute([$bucket]);$this->db->commit();
            session_regenerate_id(true);$_SESSION=['uid'=>$u['id'],'auth_version'=>(int)$u['auth_version'],'last'=>time(),'started'=>time(),'csrf'=>bin2hex(random_bytes(32))];
        }catch(\Throwable $e){if($this->db->inTransaction())$this->db->rollBack();throw $e;}
    }
    public function policy(): Policy {
        requireThat(!empty($_SESSION['uid'])&&time()-($_SESSION['last']??0)<1800&&time()-($_SESSION['started']??0)<43200,'Sign in required',401);
        $q=$this->db->prepare('SELECT id,username,display_name,role,active,auth_version FROM users WHERE id=?');$q->execute([$_SESSION['uid']]);$u=$q->fetch();
        requireThat($u&&(bool)$u['active']&&(int)$u['auth_version']===($_SESSION['auth_version']??0),'Session revoked',401);
        $q=$this->db->prepare('SELECT branch_name FROM user_branches WHERE user_id=?');$q->execute([$u['id']]);$b=$q->fetchAll(PDO::FETCH_COLUMN);
        $q=$this->db->prepare('SELECT permission,allowed FROM user_permissions WHERE user_id=?');$q->execute([$u['id']]);$o=[];foreach($q as $r)$o[$r['permission']]=(bool)$r['allowed'];
        $c=json_decode($this->db->query('SELECT config FROM app_settings WHERE id=1')->fetchColumn(),true,512,JSON_THROW_ON_ERROR);
        $_SESSION['last']=time();return new Policy($u,$b,$o,$c['moduleFlags']);
    }
    public function logout(): void {
        $_SESSION=[];setcookie(session_name(),'', ['expires'=>time()-3600,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Strict']);session_destroy();
    }
}
