<?php
declare(strict_types=1);
namespace BT;
use PDO;
use RuntimeException;
final class Problem extends RuntimeException {
    public function __construct(public int $status, string $message) { parent::__construct($message); }
}
function requireThat(bool $ok, string $message, int $status=422): void {
    if (!$ok) throw new Problem($status,$message);
}
function uuid(): string {
    $b=random_bytes(16); $b[6]=chr((ord($b[6])&15)|64); $b[8]=chr((ord($b[8])&63)|128);
    $h=bin2hex($b); return substr($h,0,8).'-'.substr($h,8,4).'-'.substr($h,12,4).'-'.substr($h,16,4).'-'.substr($h,20);
}
final class DB {
    public static function connect(array $c): PDO {
        requireThat(str_starts_with($c['dsn'],'mysql:'),'MySQL DSN required',500);
        $p=new PDO($c['dsn'],$c['user'],$c['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
        $p->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"); $p->exec("SET time_zone = '+00:00'");
        return $p;
    }
}
final class Money {
    public static function cents(mixed $v): int {
        $s=(string)$v;
        requireThat((bool)preg_match('/^-?\d{1,12}(?:\.\d{1,2})?$/D',$s),'Invalid amount: use at most two decimals');
        $negative=str_starts_with($s,'-'); $s=ltrim($s,'-'); $a=explode('.',$s);
        $n=(int)$a[0]*100+(int)str_pad($a[1]??'',2,'0'); return $negative?-$n:$n;
    }
    public static function decimal(int $v): string {
        return ($v<0?'-':'').intdiv(abs($v),100).'.'.str_pad((string)(abs($v)%100),2,'0',STR_PAD_LEFT);
    }
    public static function positive(mixed $v): string { $n=self::cents($v);requireThat($n>0,'Amount must be positive');return self::decimal($n); }
}
final class Policy {
    public const PAGES=[
        'direccion'=>['home','ventas','ventas_admin','mano_obra','sucursales','proveedores','gastos','servicio','servicio_stats','credito','caja','finanzas','reportes','facturacion','inventario','ml','oportunidades','compras','clientes','nomina','comisiones','excel','permisos'],
        'ventas_g'=>['home','ventas','ventas_admin','mano_obra','servicio','credito','clientes','oportunidades','inventario'],
        'ventas_t'=>['home','ventas','ventas_admin','mano_obra','servicio','clientes','oportunidades','inventario'],
        'finanzas'=>['home','ventas','ventas_admin','mano_obra','sucursales','proveedores','gastos','credito','caja','finanzas','reportes','nomina','comisiones','excel'],
        'facturacion'=>['home','facturacion','credito','clientes','excel'],
        'ecommerce'=>['home','inventario','ml','oportunidades','excel'],
        'servicio'=>['home','servicio','servicio_stats','inventario','excel'],
    ];
    public const MODULES=['ventas'=>'ventas','ventas_admin'=>'administracionVentas','mano_obra'=>'manoObra','sucursales'=>'comparativo','proveedores'=>'proveedores','gastos'=>'gastos','servicio'=>'diagnostico','servicio_stats'=>'diagnostico','credito'=>'credito','caja'=>'caja','finanzas'=>'finanzas','reportes'=>'reportes','facturacion'=>'facturacion','inventario'=>'inventario','ml'=>'ecommerce','oportunidades'=>'oportunidades','compras'=>'compras','clientes'=>'clientes','nomina'=>'nomina','comisiones'=>'comisiones'];
    public function __construct(public array $user, public array $branches, public array $overrides=[], public array $flags=[]) {}
    public function page(string $p): bool {
        $allowed=$this->overrides[$p]??in_array($p,self::PAGES[$this->user['role']]??[],true);
        return $allowed && ($this->user['role']==='direccion'||($this->flags[self::MODULES[$p]??'']??true)!==false);
    }
    public function demand(string $p): void { requireThat($this->page($p),'Access denied',403); }
    public function action(string $a): void {
        $roles=match($a){'approve','settings'=>['direccion'],'credit'=>['direccion','finanzas','facturacion'],'expense','cash','balance'=>['direccion','finanzas'],'sale'=>['direccion','ventas_g','ventas_t','finanzas'],default=>[]};
        requireThat(in_array($this->user['role'],$roles,true),'Action denied',403);
    }
    public function branch(string $s): void {
        $required=($s==='Ambas'||$s==='Consolidado')?['Granjero','Troncoso']:[$s];
        requireThat(count(array_diff($required,$this->branches))===0 && in_array($s,['Granjero','Troncoso','Ambas','Consolidado'],true),'Branch denied',403);
        if($this->user['role']==='ventas_g') requireThat($s==='Granjero','Branch denied',403);
        if($this->user['role']==='ventas_t') requireThat($s==='Troncoso','Branch denied',403);
    }
}
final class Repo {
    public array $entities;
    public function __construct(public PDO $db, public Policy $policy) { $this->entities=json_decode(file_get_contents(__DIR__.'/entities.json'),true,512,JSON_THROW_ON_ERROR); }
    public function table(string $t): void { requireThat(isset($this->entities[$t]),'Unknown entity',404); }
    public function get(string $t,string $id,bool $lock=false): array {
        $this->table($t);$q=$this->db->prepare("SELECT * FROM `$t` WHERE id=?".($lock?' FOR UPDATE':''));$q->execute([$id]);$x=$q->fetch();requireThat((bool)$x,'Record not found',404);
        if(isset($x['sucursal']))$this->policy->branch($x['sucursal']);return $x;
    }
    public function all(string $t): array {
        $this->table($t); $where=$t==='saldos'?'archived=0':'1=1'; $rows=$this->db->query("SELECT * FROM `$t` WHERE $where ORDER BY `_createdAt` DESC,id")->fetchAll();
        return array_values(array_filter($rows,function($x){try{if(isset($x['sucursal']))$this->policy->branch($x['sucursal']);return true;}catch(Problem){return false;}}));
    }
    public function insert(string $t,array $d): array {
        $this->table($t);$d=$this->validate($t,$d);$d['id']=uuid();
        $cols=array_keys($d);$q=$this->db->prepare("INSERT INTO `$t` (`".implode('`,`',$cols)."`) VALUES (".implode(',',array_fill(0,count($cols),'?')).")");$q->execute(array_values($d));return $this->get($t,$d['id']);
    }
    public function update(string $t,array $old,array $d,int $version): array {
        requireThat((int)$old['_version']===$version,'Record changed; reload before saving',409);
        $d=$this->validate($t,$d);requireThat(count($d)>0,'No changes');
        $set=implode(',',array_map(fn($k)=>"`$k`=?",array_keys($d)));
        $q=$this->db->prepare("UPDATE `$t` SET $set,`_version`=`_version`+1 WHERE id=? AND `_version`=?");$q->execute([...array_values($d),$old['id'],$version]);requireThat($q->rowCount()===1,'Record changed',409);return $this->get($t,$old['id']);
    }
    private function validate(string $t,array $d): array {
        foreach($d as $k=>&$v){
            requireThat(isset($this->entities[$t][$k]),'Unknown or protected field: '.$k);
            $type=$this->entities[$t][$k];
            if($v===null){requireThat(str_contains($type,' NULL')&&!str_contains($type,'NOT NULL'),'Required '.$k);continue;}
            if(str_starts_with($type,'DECIMAL(18,2)')) $v=Money::decimal(Money::cents($v));
            elseif(str_starts_with($type,'DECIMAL'))requireThat(is_scalar($v)&&(bool)preg_match('/^-?\d{1,10}(?:\.\d{1,4})?$/D',(string)$v),'Invalid quantity');
            elseif(str_starts_with($type,'DATE ')) { $dt=\DateTimeImmutable::createFromFormat('!Y-m-d',(string)$v);requireThat($dt&&$dt->format('Y-m-d')===$v,'Invalid date'); }
            elseif(str_starts_with($type,'BOOLEAN')) { requireThat(in_array($v,[true,false,0,1,'0','1'],true),'Invalid boolean');$v=(int)$v; }
            else {requireThat(is_string($v)&&strlen($v)<= (str_starts_with($type,'TEXT')?20000:255),'Invalid text');}
        }unset($v);
        if(isset($d['sucursal']))$this->policy->branch($d['sucursal']);return $d;
    }
}
