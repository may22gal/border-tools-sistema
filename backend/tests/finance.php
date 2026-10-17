<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/bootstrap.php';
use BT\{Finance,Money,Policy,Problem};
$count=0;
function check(bool $ok,string $label): void {global $count;$count++;if(!$ok)throw new RuntimeException('FAIL '.$label);}
function rejects(callable $fn,int $status): void {try{$fn();}catch(Problem $e){check($e->status===$status,'expected rejection '.$status);return;}throw new RuntimeException('Expected rejection');}
foreach(json_decode(file_get_contents(__DIR__.'/generated/finance.json'),true) as $i=>$f){
    $got=Finance::totals($f['state'],$f['period'],$f['branch']);foreach($f['expected'] as $k=>$v)check(abs($got[$k]-$v)<0.000001,"totals $i $k expected $v got ".$got[$k]);
    $labor=Finance::labor($f['state']['ventas']);foreach($f['labor'] as $k=>$v)check(abs($labor[$k]-$v)<0.000001,"labor $i $k");
}
check(Money::cents('0.01')===1,'exact cent');check(Money::cents('-1.02')===-102,'negative cent');check(Money::decimal(-102)==='-1.02','decimal');rejects(fn()=>Money::cents('1.001'),422);rejects(fn()=>Money::cents('1e3'),422);rejects(fn()=>Money::positive(0),422);
$p=new Policy(['role'=>'ventas_g'],['Granjero']);check($p->page('ventas'),'sales page');check(!$p->page('finanzas'),'finance denied');rejects(fn()=>$p->branch('Troncoso'),403);rejects(fn()=>$p->branch('Ambas'),403);rejects(fn()=>$p->action('approve'),403);
$p=new Policy(['role'=>'finanzas'],['Granjero','Troncoso'],['nomina'=>false],['gastos'=>false]);check(!$p->page('nomina'),'user override denied');check(!$p->page('gastos'),'module denied');check($p->page('finanzas'),'finance allowed');
$p=new Policy(['role'=>'direccion'],['Granjero','Troncoso'],[],['gastos'=>false]);check($p->page('gastos'),'director sees disabled module');
echo "PASS $count financial parity and policy assertions\n";
