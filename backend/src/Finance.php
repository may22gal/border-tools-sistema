<?php
declare(strict_types=1);
namespace BT;
final class Finance {
    public const METHODS=['Efectivo','Transferencia','Tarjeta','Cheque'];
    public static function transferCounts(array $x,array $config): bool {
        $s=($x['transferenciaStatus']??'')?:'Aprobada'; return $s!=='Rechazada' && (empty($config['requireTransferApproval'])||$s==='Aprobada');
    }
    public static function group(array $x): string {
        if(in_array($x['grupo']??'', ['proveedores','nomina','comisiones','gastos'],true))return $x['grupo'];
        $c=strtolower($x['categoria']??'');
        if(in_array($c,['nómina','nomina'],true))return 'nomina';
        if(str_starts_with($c,'comision')||str_starts_with($c,'comisión'))return 'comisiones';
        return str_contains($c,'mercanc')||$c==='refacciones'?'proveedores':'gastos';
    }
    public static function assigned(array $x,?string $s): float {
        $n=Money::cents($x['monto']??0);return !$s||$x['sucursal']===$s?$n:($x['sucursal']==='Ambas'?$n/2:0);
    }
    public static function totals(array $S,array $p,?string $s): array {
        $t=array_fill_keys(['ventas','mano','credito','vEf','vTr','vTa','vCh','aEf','aTr','aTa','aCh','trPend','trPendN','trRech','abInval','abInvalN','egresos','cashOut','manual'],0);
        $in=fn($x)=>($x['fecha']??'')>=$p['start']&&($x['fecha']??'')<=$p['end'];
        foreach($S['ventas']??[] as $x){if(!$in($x)||($s&&$x['sucursal']!==$s))continue;
            foreach(['ventas'=>'totalVentaSicar','mano'=>'manoObra','credito'=>'credito','vEf'=>'efectivo','vTa'=>'tarjeta','vCh'=>'cheque'] as $a=>$b)$t[$a]+=Money::cents($x[$b]??0);
            $tr=Money::cents($x['transferencia']??0);if(self::transferCounts($x,$S['config']))$t['vTr']+=$tr;
            if($tr&&($x['transferenciaStatus']??'')==='Pendiente'){$t['trPend']+=$tr;$t['trPendN']++;}
            if($tr&&($x['transferenciaStatus']??'')==='Rechazada')$t['trRech']+=$tr;
        }
        foreach($S['cobranzas']??[] as $x){if(!$in($x)||($s&&$x['sucursal']!==$s))continue;$m=Money::cents($x['monto']);
            if(!in_array($x['metodo'],self::METHODS,true)){$t['abInval']+=$m;$t['abInvalN']++;continue;}
            if($x['metodo']==='Transferencia'){
                if(($x['transferenciaStatus']??'')==='Pendiente'){$t['trPend']+=$m;$t['trPendN']++;}
                if(($x['transferenciaStatus']??'')==='Rechazada')$t['trRech']+=$m;
                if(!self::transferCounts($x,$S['config']))continue;
            }
            $t[match($x['metodo']){'Efectivo'=>'aEf','Transferencia'=>'aTr','Tarjeta'=>'aTa','Cheque'=>'aCh'}]+=$m;
        }
        foreach($S['egresos']??[] as $x){if(!$in($x)||!empty($x['anulado']))continue;
            if(empty($x['pagoAplazado']))$t['egresos']+=self::assigned($x,$s);
            $cs=$x['cajaSucursal']?:($x['sucursal']==='Ambas'?'':$x['sucursal']);
            if(!empty($x['impactaCajaFisica'])&&(!$s||$cs===$s))$t['cashOut']+=Money::cents($x['monto']);
        }
        foreach($S['cajaMovimientos']??[] as $x)if($in($x)&&(!$s||$x['sucursal']===$s))$t['manual']+=Money::cents($x['entrada'])-Money::cents($x['salida']);
        $t['productos']=max(0,$t['ventas']-$t['mano']);
        foreach(['efectivo'=>['vEf','aEf'],'transferencia'=>['vTr','aTr'],'tarjeta'=>['vTa','aTa'],'cheque'=>['vCh','aCh']] as $a=>$b)$t[$a]=$t[$b[0]]+$t[$b[1]];
        $t['ventasCobradas']=$t['vEf']+$t['vTr']+$t['vTa']+$t['vCh'];$t['cobranza']=$t['aEf']+$t['aTr']+$t['aTa']+$t['aCh'];
        $t['received']=$t['ventasCobradas']+$t['cobranza'];$t['cashExpected']=$t['efectivo']-$t['cashOut']+$t['manual'];$t['flujo']=$t['received']-$t['egresos'];
        foreach($t as $k=>&$v)if(!str_ends_with($k,'N'))$v=floor($v+0.5)/100;unset($v);return $t;
    }
    public static function labor(array $rows): array {
        $r=array_fill_keys(['Efectivo','Transferencia','Tarjeta','Cheque','Crédito','Sin dato','total'],0);
        foreach($rows as $x){$m=Money::cents($x['manoObra']??0);if($m<=0)continue;$r['total']+=$m;
            $parts=[];foreach(['Efectivo'=>'efectivo','Transferencia'=>'transferencia','Tarjeta'=>'tarjeta','Cheque'=>'cheque','Crédito'=>'credito'] as $a=>$b)$parts[$a]=Money::cents($x[$b]??0);
            $b=array_sum($parts);if($b<=0){$r['Sin dato']+=$m;continue;}foreach($parts as $k=>$v)$r[$k]+=$m*$v/$b;
        }foreach($r as &$v)$v=floor($v+0.5)/100;return $r;
    }
}
