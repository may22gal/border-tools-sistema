<?php
declare(strict_types=1);
namespace BT;
use PDO;
final class App {
    private Repo $r;
    public const READ=[
        'categoriasGastos'=>['gastos','proveedores','finanzas'], 'ventas'=>['ventas','ventas_admin','mano_obra','credito','finanzas','caja','reportes','sucursales'],
        'facturacion'=>['facturacion'],'inventario'=>['inventario'],'ml'=>['ml'],'oportunidades'=>['oportunidades'],
        'servicio'=>['servicio','servicio_stats','ventas','reportes'],'egresos'=>['gastos','proveedores','nomina','comisiones','finanzas','caja','reportes','sucursales'],
        'nomina'=>['nomina','comisiones'],'comisiones'=>['comisiones'],'compras'=>['compras'],'clientesB2B'=>['clientes','credito'],
        'creditos'=>['credito','finanzas','reportes'],'cobranzas'=>['credito','finanzas','caja','reportes','ventas'],
        'stockMin'=>['inventario'],'cortesCaja'=>['caja','reportes'],'cajaMovimientos'=>['caja','finanzas','reportes'], 'saldos'=>['finanzas']
    ];
    public function __construct(private PDO $db,private Policy $p){$this->r=new Repo($db,$p);}
    public function config(): array {return json_decode($this->db->query('SELECT config FROM app_settings WHERE id=1')->fetchColumn(),true,512,JSON_THROW_ON_ERROR);}
    private function audit(string $action,string $entity,?array $before,?array $after): void {
        $q=$this->db->prepare('INSERT INTO change_log(user_id,action,entity,record_id,branch_name,before_data,after_data) VALUES (?,?,?,?,?,?,?)');
        $q->execute([$this->p->user['id'],$action,$entity,$after['id']??$before['id']??null,$after['sucursal']??$before['sucursal']??null,$before?json_encode($before,JSON_THROW_ON_ERROR):null,$after?json_encode($after,JSON_THROW_ON_ERROR):null]);
    }
    private function add(string $t,array $d,string $a): array {$n=$this->r->insert($t,$d);$this->audit($a,$t,null,$n);return $n;}
    private function edit(string $t,array $old,array $d,int $v,string $a): array {$n=$this->r->update($t,$old,$d,$v);$this->audit($a,$t,$old,$n);return $n;}
    private function old(string $t,array $d): array {
        requireThat(isset($d['id'],$d['version'])&&is_int($d['version']),'ID and integer version required');$x=$this->r->get($t,(string)$d['id'],true);requireThat((int)$x['_version']===$d['version'],'Record changed',409);return $x;
    }
    private function pick(array $d,array $keys): array {return array_intersect_key($d,array_flip($keys));}
    private function required(array $d,array $keys): void {foreach($keys as $k)requireThat(isset($d[$k])&&$d[$k]!==''&&$d[$k]!==null,'Required '.$k);}
    private function payment(array $d): array {
        $m=$d['metodo']??'';requireThat(in_array($m,Finance::METHODS,true),'Invalid payment method');
        $cash=$m==='Efectivo'&&!empty($d['impactaCajaFisica']);$cs=$cash?($d['cajaSucursal']??$d['sucursal']??''):'';
        if($cash){requireThat(in_array($cs,['Granjero','Troncoso'],true),'Choose physical cash branch');$this->p->branch($cs);}
        return ['metodo'=>$m,'impactaCajaFisica'=>$cash,'cajaSucursal'=>$cs];
    }
    public function state(): array {
        $s=['version'=>'2.4','config'=>$this->config()];
        foreach(self::READ as $t=>$pages){$allowed=false;foreach($pages as $page)if($this->p->page($page)){$allowed=true;break;}$s[$t]=$allowed?$this->r->all($t):[];}
        foreach($s['servicio'] as &$x){$q=$this->db->prepare('SELECT descripcion,monto FROM service_items WHERE service_id=? ORDER BY position');$q->execute([$x['id']]);$x['cotItems']=$q->fetchAll();$q=$this->db->prepare('SELECT texto,created_at AS ts FROM service_history WHERE service_id=? ORDER BY id');$q->execute([$x['id']]);$x['historial']=$q->fetchAll();}unset($x);
        foreach($s['egresos'] as &$e){
            $q=$this->db->prepare('SELECT state AS estado,requested_at AS fecha,resolved_at AS fechaResolucion,requested_by AS usuario FROM expense_approvals WHERE expense_id=?');$q->execute([$e['id']]);$e['solicitudAnulacion']=$q->fetch()?:null;
            $q=$this->db->prepare("SELECT c.action AS accion,c.created_at AS fecha,u.display_name AS usuario,c.before_data,c.after_data FROM change_log c JOIN users u ON u.id=c.user_id WHERE c.entity='egresos' AND c.record_id=? AND c.before_data IS NOT NULL ORDER BY seq");$q->execute([$e['id']]);$e['historialCambios']=[];
            foreach($q as $h)$e['historialCambios'][]=['accion'=>$h['accion'],'fecha'=>$h['fecha'],'usuario'=>$h['usuario'],'anterior'=>json_decode($h['before_data'],true),'nuevo'=>json_decode($h['after_data'],true)];
        }unset($e);
        // Do not expose payroll records merely because a user can view general expenses.
        if(!$this->p->page('finanzas')&&!$this->p->page('caja')&&!$this->p->page('reportes')&&!$this->p->page('sucursales'))$s['egresos']=array_values(array_filter($s['egresos'],fn($e)=>$this->p->page(Finance::group($e))));
        // Audit payloads are not included in activity summaries.

        $s['activity']=[];$q=$this->db->prepare('SELECT action,branch_name,created_at FROM change_log WHERE user_id=? OR ?=1 ORDER BY seq DESC LIMIT 60');$q->execute([$this->p->user['id'],$this->p->user['role']==='direccion'&&count($this->p->branches)===2?1:0]);foreach($q as $a)$s['activity'][]=['texto'=>$a['action'],'suc'=>$a['branch_name']==='Granjero'?'g':($a['branch_name']==='Troncoso'?'t':'sys'),'ts'=>$a['created_at']];
        $s['notifications']=[];
        if($this->p->user['role']==='direccion'){
            $q=$this->db->prepare('SELECT n.id,n.texto,n.orden,n.created_at AS ts,u.display_name AS `by`,(r.user_id IS NOT NULL) AS `read` FROM notifications n JOIN users u ON u.id=n.user_id LEFT JOIN notification_reads r ON r.notification_id=n.id AND r.user_id=? ORDER BY n.created_at DESC LIMIT 50');$q->execute([$this->p->user['id']]);$s['notifications']=$q->fetchAll();
        }
        return ['permissions'=>array_values(array_filter(Policy::PAGES['direccion'],fn($page)=>$this->p->page($page))),'settingsVersion'=>(int)$this->db->query('SELECT version FROM app_settings WHERE id=1')->fetchColumn(),'state'=>$s,'user'=>$this->p->user,'branches'=>$this->p->branches,'revision'=>(int)$this->db->query('SELECT COALESCE(MAX(seq),0) FROM change_log')->fetchColumn()];
    }
    public function receipt(string $key): array {
        requireThat((bool)preg_match('/^[a-zA-Z0-9_-]{16,100}$/D',$key),'Invalid receipt');
        $this->db->beginTransaction();
        try{$this->db->query('SELECT id FROM write_mutex WHERE id=1 FOR UPDATE');
            $q=$this->db->prepare('SELECT 1 FROM requests WHERE user_id=? AND request_key=?');$q->execute([$this->p->user['id'],$key]);$confirmed=(bool)$q->fetchColumn();$this->db->commit();return ['confirmed'=>$confirmed];
        }catch(\Throwable $e){if($this->db->inTransaction())$this->db->rollBack();throw $e;}
    }
    public function report(array $period,?string $branch): array {
        requireThat($this->p->page('finanzas')||$this->p->page('reportes')||$this->p->page('sucursales'),'Financial report denied',403);
        foreach(['start','end'] as $key){$dt=\DateTimeImmutable::createFromFormat('!Y-m-d',$period[$key]??'');requireThat($dt&&$dt->format('Y-m-d')===$period[$key],'Invalid report date');}
        requireThat($period['start']<=$period['end'],'Invalid report period');
        if($branch!==null)$this->p->branch($branch);else requireThat(count($this->p->branches)===2,'Consolidated report denied',403);
        requireThat($branch===null||in_array($branch,['Granjero','Troncoso'],true),'Invalid report branch');
        $state=['config'=>$this->config()];foreach(['ventas','cobranzas','egresos','cajaMovimientos'] as $t)$state[$t]=$this->r->all($t);
        return ['period'=>$period,'branch'=>$branch,'totals'=>Finance::totals($state,$period,$branch),'labor'=>Finance::labor(array_values(array_filter($state['ventas'],fn($x)=>$x['fecha']>=$period['start']&&$x['fecha']<=$period['end']&&($branch===null||$x['sucursal']===$branch))))];
    }
    public function command(string $action,array $d,string $key): array {
        requireThat((bool)preg_match('/^[a-zA-Z0-9_-]{16,100}$/D',$key),'Idempotency-Key required');
        $this->db->beginTransaction();
        try {
            // A small shared-hosting deployment serializes business writes. No client snapshot replacement.
            $this->db->query('SELECT id FROM write_mutex WHERE id=1 FOR UPDATE')->fetch();
            // Re-check current account/permissions after acquiring the write lock.
            $auth=new Auth($this->db,[]);if(isset($_SESSION['uid'])){$fresh=$auth->policy();$this->p=$fresh;$this->r->policy=$fresh;}
            $fingerprint=hash('sha256',json_encode([$action,$d,$this->p->user['role'],$this->p->user['auth_version']??0,$this->p->branches,$this->p->overrides,$this->p->flags],JSON_THROW_ON_ERROR));
            $q=$this->db->prepare('SELECT fingerprint,response FROM requests WHERE user_id=? AND request_key=?');$q->execute([$this->p->user['id'],$key]);
            if($x=$q->fetch()){requireThat(hash_equals($x['fingerprint'],$fingerprint),'Idempotency key already used for different input',409);$this->db->commit();return json_decode($x['response'],true,512,JSON_THROW_ON_ERROR);}
            $out=$this->dispatch($action,$d);
            $q=$this->db->prepare('INSERT INTO requests(user_id,request_key,fingerprint,response) VALUES (?,?,?,?)');$q->execute([$this->p->user['id'],$key,$fingerprint,json_encode($out,JSON_THROW_ON_ERROR)]);
            $this->db->commit();return $out;
        }catch(\Throwable $e){if($this->db->inTransaction())$this->db->rollBack();throw $e;}
    }
    private function dispatch(string $a,array $d): array {
        return match($a){
            'sales.save'=>$this->sale($d),'credit.assign'=>$this->assign($d),'credit.create'=>$this->manualCredit($d),'credit.payment'=>$this->creditPayment($d,false),'b2b.payment'=>$this->creditPayment($d,true),
            'transfer.decide'=>$this->transfer($d),'payment.correctMethod'=>$this->correctMethod($d),
            'expense.create'=>$this->expense($d),'expense.edit'=>$this->expenseEdit($d),'expense.settle'=>$this->settle($d),'expense.requestVoid'=>$this->requestVoid($d),'expense.resolveVoid'=>$this->void($d),
            'payroll.pay'=>$this->pay($d),'cash.movement'=>$this->cashMovement($d),'cash.close'=>$this->cashClose($d),
            'service.create'=>$this->serviceCreate($d),'service.transition'=>$this->serviceTransition($d),
            'inventory.move'=>$this->inventory($d),'stock.save'=>$this->stock($d),'balance.save'=>$this->balance($d),'balance.remove'=>$this->removeBalance($d),
            'catalog.create'=>$this->catalog($d),'purchase.receive'=>$this->receive($d),'category.deactivate'=>$this->deactivate($d),
            'settings.update'=>$this->settings($d),'notification.read'=>$this->readNotifications($d),
            default=>throw new Problem(404,'Unknown operation'),
        };
    }
    private function sale(array $d): array {
        $this->p->action('sale');$this->p->demand('ventas');$this->required($d,['fecha','sucursal','totalVentaSicar']);
        $fields=['fecha','sucursal','efectivo','transferencia','tarjeta','cheque','credito','manoObra','totalVentaSicar','observacion','sicarArchivo','evidenciaId'];$v=$this->pick($d,$fields);
        foreach(['efectivo','transferencia','tarjeta','cheque','credito','manoObra','totalVentaSicar'] as $k){$v[$k]=Money::decimal(Money::cents($v[$k]??0));requireThat(Money::cents($v[$k])>=0,'Negative sales amount');}
        requireThat(Money::cents($v['totalVentaSicar'])>0&&Money::cents($v['manoObra'])<=Money::cents($v['totalVentaSicar']),'Invalid SICAR total');
        $v['responsable']=$this->p->user['display_name'];$v['transferenciaStatus']=$d['transferenciaStatus']??'Aprobada';requireThat(in_array($v['transferenciaStatus'],['Aprobada','Pendiente'],true),'Invalid transfer status');
        if(!empty($v['evidenciaId'])){$q=$this->db->prepare('SELECT branch_name,original_name FROM evidence WHERE id=?');$q->execute([$v['evidenciaId']]);$e=$q->fetch();requireThat($e&&$e['branch_name']===$v['sucursal'],'Invalid evidence');$v['sicarArchivo']=$e['original_name'];}
        if(isset($d['id'])){$x=$this->old('ventas',$d);requireThat($x['sucursal']===$v['sucursal']&&$x['fecha']===$v['fecha'],'Cannot change cut identity');requireThat(Money::cents($v['credito'])>=Money::cents($x['creditoAsignado']),'Credit already assigned');return $this->edit('ventas',$x,$v,$d['version'],'sales.replace');}
        return $this->add('ventas',$v,'sales.create');
    }
    private function manualCredit(array $d): array {
        $this->p->action('credit');$this->p->demand('credito');$this->required($d,['cliente','sucursal','fecha','monto']);$v=$this->pick($d,['cliente','sucursal','fecha','monto','clienteId']);$v['monto']=Money::positive($d['monto']);$v['saldo']=$v['monto'];$v['estado']='Pendiente';$this->validateClient($v);return $this->add('creditos',$v,'credit.create');
    }
    private function validateClient(array $v): void {if(!empty($v['clienteId'])){$c=$this->r->get('clientesB2B',$v['clienteId'],true);requireThat($c['sucursal']===$v['sucursal']&&$c['nombre']===$v['cliente'],'Client does not match branch');}}
    private function assign(array $d): array {
        $this->p->action('credit');$this->p->demand('credito');$x=$this->old('ventas',$d);$m=Money::cents(Money::positive($d['monto']??0));$this->required($d,['cliente']);
        requireThat($m<=Money::cents($x['credito'])-Money::cents($x['creditoAsignado']),'Exceeds unassigned credit',409);
        $v=['cliente'=>$d['cliente'],'clienteId'=>$d['clienteId']??null,'fecha'=>$x['fecha'],'sucursal'=>$x['sucursal'],'monto'=>Money::decimal($m),'saldo'=>Money::decimal($m),'estado'=>'Pendiente','origenCorte'=>$x['id']];$this->validateClient($v);
        $c=$this->add('creditos',$v,'credit.assign');$this->edit('ventas',$x,['creditoAsignado'=>Money::decimal(Money::cents($x['creditoAsignado'])+$m)],$d['version'],'credit.assign');return $c;
    }
    private function creditPayment(array $d,bool $b2b): array {
        $this->p->action('credit');$this->p->demand($b2b?'clientes':'credito');$x=$this->old($b2b?'clientesB2B':'creditos',$d);
        if($b2b){$q=$this->db->prepare('SELECT id FROM creditos WHERE clienteId=? AND saldo>0');$q->execute([$x['id']]);requireThat(!$q->fetch(),'Apply payment to existing credit',409);}
        $m=Money::cents(Money::positive($d['monto']??0));requireThat($m<=Money::cents($x['saldo']),'Payment exceeds balance',409);$this->required($d,['fecha','metodo']);
        $v=['fecha'=>$d['fecha'],'creditoId'=>$b2b?null:$x['id'],'clienteId'=>$b2b?$x['id']:$x['clienteId'],'cliente'=>$b2b?$x['nombre']:$x['cliente'],'sucursal'=>$x['sucursal'],'metodo'=>$d['metodo'],'monto'=>Money::decimal($m)];
        requireThat(in_array($v['metodo'],Finance::METHODS,true),'Invalid payment method');if($v['metodo']==='Transferencia'){$v['transferenciaStatus']=$d['transferenciaStatus']??'Aprobada';requireThat(in_array($v['transferenciaStatus'],['Aprobada','Pendiente'],true),'Invalid transfer status');}
        $n=$this->add('cobranzas',$v,'credit.payment');$changes=['saldo'=>Money::decimal(Money::cents($x['saldo'])-$m)];if(!$b2b)$changes['estado']=Money::cents($changes['saldo'])>0?'Pendiente':'Pagado';$this->edit($b2b?'clientesB2B':'creditos',$x,$changes,$d['version'],'credit.payment');
        if(!$b2b&&!empty($x['clienteId'])){$c=$this->r->get('clientesB2B',$x['clienteId'],true);$this->edit('clientesB2B',$c,['saldo'=>Money::decimal(max(0,Money::cents($c['saldo'])-$m))],(int)$c['_version'],'credit.payment');}return $n;
    }
    private function transfer(array $d): array {
        $this->p->action('approve');$t=($d['tipo']??'')==='venta'?'ventas':'cobranzas';$this->p->demand($t==='ventas'?'ventas':'credito');$x=$this->old($t,$d);
        requireThat($t==='ventas'?Money::cents($x['transferencia'])>0:$x['metodo']==='Transferencia','Not a transfer');requireThat(is_bool($d['approved']??null),'Decision required');return $this->edit($t,$x,['transferenciaStatus'=>$d['approved']?'Aprobada':'Rechazada'],$d['version'],'transfer.decide');
    }
    private function correctMethod(array $d): array {
        $this->p->action('credit');$this->p->demand('credito');$x=$this->old('cobranzas',$d);requireThat(in_array($d['metodo']??'',Finance::METHODS,true),'Invalid method');$v=['metodoOriginal'=>$x['metodo'],'metodo'=>$d['metodo']];if($d['metodo']==='Transferencia')$v['transferenciaStatus']='Pendiente';return $this->edit('cobranzas',$x,$v,$d['version'],'payment.correctMethod');
    }
    private function expense(array $d): array {
        $this->p->action('expense');$g=$d['grupo']??'gastos';requireThat(in_array($g,['gastos','proveedores'],true),'Use payroll operation');$this->p->demand($g);$this->required($d,['fecha','sucursal','concepto','categoria']);if($g==='proveedores')$this->required($d,['proveedor']);
        $v=$this->pick($d,['fecha','sucursal','concepto','categoria','proveedor']);$v+=['grupo'=>$g,'monto'=>Money::positive($d['monto']??0)]+$this->payment($d);$v['pagoAplazado']=$v['metodo']==='Tarjeta'&&!empty($d['pagoAplazado']);requireThat(!($v['pagoAplazado']&&$v['categoria']==='Pago de tarjeta de crédito'),'Invalid deferred payment');return $this->add('egresos',$v,'expense.create');
    }
    private function settlements(array $x): int {$q=$this->db->prepare('SELECT COALESCE(SUM(monto),0) FROM egresos WHERE origenCargoId=? AND anulado=0');$q->execute([$x['id']]);return Money::cents($q->fetchColumn());}
    private function expensePage(array $x): void {$this->p->demand(Finance::group($x));}
    private function expenseEdit(array $d): array {
        $this->p->action('expense');$x=$this->old('egresos',$d);$this->expensePage($x);
        $q=$this->db->prepare("SELECT state FROM expense_approvals WHERE expense_id=?");$q->execute([$x['id']]);
        requireThat(!$x['anulado']&&!$x['origenId']&&!$x['origenCargoId']&&$this->settlements($x)===0&&in_array(Finance::group($x),['gastos','proveedores'],true)&&$q->fetchColumn()!=='Pendiente','Expense cannot be edited',409);
        $v=$this->pick($d,['fecha','sucursal','concepto','categoria','proveedor']);$v['monto']=Money::positive($d['monto']??0);$v+=$this->payment($d);$v['pagoAplazado']=$v['metodo']==='Tarjeta'&&!empty($d['pagoAplazado']);$this->required($v,['fecha','sucursal','concepto','categoria']);if(Finance::group($x)==='proveedores')$this->required($v,['proveedor']);requireThat(!($v['pagoAplazado']&&$v['categoria']==='Pago de tarjeta de crédito'),'Invalid deferred payment');return $this->edit('egresos',$x,$v,$d['version'],'expense.edit');
    }
    private function settle(array $d): array {
        $this->p->action('expense');$x=$this->old('egresos',$d);$this->expensePage($x);requireThat($x['pagoAplazado']&&!$x['anulado'],'Invalid card charge');$m=Money::cents(Money::positive($d['monto']??0));requireThat($m<=Money::cents($x['monto'])-$this->settlements($x),'Exceeds card balance',409);$this->required($d,['fecha']);
        $v=['fecha'=>$d['fecha'],'grupo'=>'gastos','categoria'=>'Pago de tarjeta de crédito','concepto'=>'Liquidación tarjeta · '.$x['concepto'],'proveedor'=>$d['referencia']??$x['proveedor'],'sucursal'=>$x['sucursal'],'monto'=>Money::decimal($m),'origenCargoId'=>$x['id']]+$this->payment($d+['sucursal'=>$x['sucursal']]);
        $n=$this->add('egresos',$v,'expense.settle');$this->edit('egresos',$x,['monto'=>$x['monto']],$d['version'],'expense.settle');return $n;
    }
    private function canVoid(array $x): void {requireThat(!$x['anulado']&&(!$x['pagoAplazado']||$this->settlements($x)===0),'Cannot void charge with payments',409);}
    private function requestVoid(array $d): array {
        $this->p->action('expense');$x=$this->old('egresos',$d);$this->expensePage($x);$this->canVoid($x);
        $q=$this->db->prepare('SELECT state FROM expense_approvals WHERE expense_id=?');$q->execute([$x['id']]);requireThat($q->fetchColumn()!=='Pendiente','Void request already pending',409);
        $q=$this->db->prepare("INSERT INTO expense_approvals(expense_id,state,requested_by) VALUES (?,'Pendiente',?) ON DUPLICATE KEY UPDATE state='Pendiente',requested_by=VALUES(requested_by),requested_at=UTC_TIMESTAMP(6),resolved_by=NULL,resolved_at=NULL");$q->execute([$x['id'],$this->p->user['id']]);return $this->edit('egresos',$x,['monto'=>$x['monto']],$d['version'],'expense.requestVoid');
    }
    private function void(array $d): array {
        $this->p->action('approve');$x=$this->old('egresos',$d);$this->expensePage($x);$this->canVoid($x);requireThat(is_bool($d['approved']??null),'Decision required');
        $q=$this->db->prepare('INSERT INTO expense_approvals(expense_id,state,requested_by,resolved_by,resolved_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE state=VALUES(state),resolved_by=VALUES(resolved_by),resolved_at=VALUES(resolved_at)');$q->execute([$x['id'],$d['approved']?'Aprobada':'Rechazada',$this->p->user['id'],$this->p->user['id']]);
        $v=['monto'=>$x['monto']];if($d['approved']){$v['anulado']=true;$v['fechaAnulacion']=gmdate('Y-m-d H:i:s');}$n=$this->edit('egresos',$x,$v,$d['version'],'expense.resolveVoid');
        if($d['approved']&&!empty($x['origenId'])&&in_array($x['grupo'],['nomina','comisiones'],true)){$t=$x['grupo'];$doc=$this->r->get($t,$x['origenId'],true);$q=$this->db->prepare('SELECT fecha FROM egresos WHERE origenId=? AND anulado=0 ORDER BY fecha DESC LIMIT 1');$q->execute([$x['origenId']]);$date=$q->fetchColumn();$v=$t==='nomina'?['ultimoPago'=>$date?:null,'estado'=>$date?'Pagado':'Activo']:['fechaPago'=>$date?:null,'estado'=>$date?'Pagada':'Pendiente'];$this->edit($t,$doc,$v,(int)$doc['_version'],'expense.reverseLinkedPayment');}return $n;
    }
    private function pay(array $d): array {
        $this->p->action('expense');$t=$d['tipo']??'';requireThat(in_array($t,['nomina','comisiones'],true),'Invalid payroll type');$this->p->demand($t);$x=$this->old($t,$d);$this->required($d,['fecha','periodo']);$m=Money::positive($d['monto']??0);
        if($t==='comisiones')requireThat($x['estado']!=='Pagada','Commission already paid',409);
        $q=$this->db->prepare('SELECT id FROM egresos WHERE origenId=? AND periodo=? AND anulado=0');$q->execute([$x['id'],$d['periodo']]);requireThat(!$q->fetch()||($t==='nomina'&&($d['confirmAdditional']??false)===true),'Additional payroll payment requires confirmation',409);
        $v=['grupo'=>$t,'fecha'=>$d['fecha'],'periodo'=>$d['periodo'],'concepto'=>($t==='nomina'?'Pago nómina':'Pago comisión').' · '.$x['nombre'],'categoria'=>$t==='nomina'?'Nómina':'Comisiones vendedores','proveedor'=>$x['nombre'],'monto'=>$m,'sucursal'=>$x['sucursal'],'origenId'=>$x['id'],'empleadoId'=>$t==='nomina'?$x['id']:$x['empleadoId']]+$this->payment($d+['sucursal'=>$x['sucursal']]);
        $n=$this->add('egresos',$v,'payroll.pay');$q=$this->db->prepare('INSERT INTO payroll_payments(expense_id,employee_id,commission_id) VALUES (?,?,?)');$q->execute([$n['id'],$v['empleadoId'],$t==='comisiones'?$x['id']:null]);$this->edit($t,$x,$t==='nomina'?['estado'=>'Pagado','ultimoPago'=>$d['fecha']]:['estado'=>'Pagada','fechaPago'=>$d['fecha']],$d['version'],'payroll.pay');return $n;
    }
    private function cashMovement(array $d): array {
        $this->p->action('cash');$this->p->demand('caja');$this->required($d,['fecha','sucursal','tipo','concepto']);requireThat(in_array($d['tipo'],['Entrada','Salida'],true),'Invalid cash type');$m=Money::positive($d['monto']??0);return $this->add('cajaMovimientos',$this->pick($d,['fecha','sucursal','tipo','concepto'])+['metodo'=>'Efectivo','entrada'=>$d['tipo']==='Entrada'?$m:'0.00','salida'=>$d['tipo']==='Salida'?$m:'0.00'],'cash.movement');
    }
    private function cashClose(array $d): array {
        $this->p->action('cash');$this->p->demand('caja');$this->required($d,['fecha','sucursal','contado']);$s=$d['sucursal'];$this->p->branch($s);requireThat(in_array($s,['Granjero','Troncoso'],true),'Invalid cash branch');$state=['config'=>$this->config()];foreach(['ventas','cobranzas','egresos','cajaMovimientos'] as $t)$state[$t]=$this->r->all($t);$tot=Finance::totals($state,['start'=>$d['fecha'],'end'=>$d['fecha']],$s);
        $f=Money::cents($d['fondo']??0);$c=Money::cents($d['contado']);$r=Money::cents($d['retiro']??0);requireThat($f>=0&&$c>=0&&$r>=0&&$r<=$c,'Invalid cash amounts');$expected=$f+Money::cents($tot['cashExpected']);
        $v=['fecha'=>$d['fecha'],'sucursal'=>$s,'fondo'=>Money::decimal($f),'esperado'=>Money::decimal($expected),'contado'=>Money::decimal($c),'diferencia'=>Money::decimal($c-$expected),'retiro'=>Money::decimal($r),'queda'=>Money::decimal($c-$r),'responsable'=>$this->p->user['display_name'],'cajaId'=>$s.' · Caja 1'];
        if(isset($d['id'])){$old=$this->old('cortesCaja',$d);requireThat($old['fecha']===$v['fecha']&&$old['sucursal']===$v['sucursal'],'Cannot change cash cut identity');return $this->edit('cortesCaja',$old,$v,$d['version'],'cash.close');}return $this->add('cortesCaja',$v,'cash.close');
    }
    private function history(string $id,string $text): void {
        $q=$this->db->prepare('INSERT INTO service_history(service_id,user_id,texto) VALUES (?,?,?)');$q->execute([$id,$this->p->user['id'],$text]);
    }
    private function serviceCreate(array $d): array {
        $this->p->demand('servicio');$this->required($d,['cliente','herramienta','sucursal','entrada']);
        $n=(int)$this->db->query("SELECT next_value FROM sequences WHERE name='service' FOR UPDATE")->fetchColumn();$this->db->exec("UPDATE sequences SET next_value=next_value+1 WHERE name='service'");
        $v=$this->pick($d,['cliente','tel','herramienta','modelo','serie','sucursal','falla','entrada','garantia']);$v['diagnosticoCosto']=!empty($d['garantia'])?'0.00':Money::decimal(Money::cents($d['diagnosticoCosto']??$this->config()['diagnosticoEstandar']));requireThat(Money::cents($v['diagnosticoCosto'])>=0,'Invalid diagnostic cost');$v+=['folio'=>'SR-'.$n,'estado'=>'Recibida'];
        $x=$this->add('servicio',$v,'service.create');$this->history($x['id'],'Recibida en sucursal '.$x['sucursal']);return $x;
    }
    private function diagnosticPayment(array $d,array $x): array {
        requireThat(!$x['garantia']&&Money::cents($x['diagnosticoCobrado'])===0,'Diagnostic already paid or warranty',409);$this->required($d,['diagnosticoFechaCobro','diagnosticoMetodo']);requireThat(in_array($d['diagnosticoMetodo'],Finance::METHODS,true),'Invalid diagnostic method');
        return ['diagnosticoCobrado'=>Money::positive($d['diagnosticoCobrado']??0)]+$this->pick($d,['diagnosticoFechaCobro','diagnosticoMetodo','diagnosticoSicar']);
    }
    private function serviceTransition(array $d): array {
        $this->p->demand('servicio');$x=$this->old('servicio',$d);$op=$d['operation']??'';$v=[];$text='';$state=$x['estado'];
        switch($op){
            case 'diagnose':requireThat($state==='Recibida','Invalid service transition',409);$v=$this->pick($d,['diagnostico','notas']);$v['garantia']=(bool)($d['garantia']??$x['garantia']);$v['diagnosticoCosto']=$v['garantia']?'0.00':Money::decimal(Money::cents($d['diagnosticoCosto']??$x['diagnosticoCosto']));requireThat(Money::cents($v['diagnosticoCosto'])>=0,'Invalid diagnostic cost');$v['responsableDiagnostico']=$this->p->user['display_name'];$v['estado']='Diagnóstico';if(!empty($d['diagnosticoCobrado']))$v+=$this->diagnosticPayment($d,array_replace($x,$v));$text='Diagnóstico completado';break;
            case 'quote':
            case 'editQuote':
                requireThat($op==='quote'?$state==='Diagnóstico':in_array($state,['Cotizada','Autorizada'],true),'Invalid quotation transition',409);
                $items=$d['items']??[];requireThat(is_array($items)&&count($items)>0&&count($items)<=100,'Quotation items required');$sum=0;
                foreach($items as $it){$this->required($it,['descripcion','monto']);requireThat(is_string($it['descripcion'])&&strlen($it['descripcion'])<=2000,'Invalid item');$m=Money::cents($it['monto']);requireThat($m>=0,'Negative item');$sum+=$m;}
                requireThat($sum>0,'Quotation must be positive');$v=['reparacionBruta'=>Money::decimal($sum),'cotizacion'=>Money::decimal($sum),'estado'=>'Cotizada','autorizado'=>false];
                $q=$this->db->prepare('DELETE FROM service_items WHERE service_id=?');$q->execute([$x['id']]);$q=$this->db->prepare('INSERT INTO service_items(id,service_id,position,descripcion,monto) VALUES (?,?,?,?,?)');foreach($items as $i=>$it)$q->execute([uuid(),$x['id'],$i,$it['descripcion'],Money::decimal(Money::cents($it['monto']))]);
                $text=($op==='editQuote'?'Cotización modificada; requiere autorización':'Cotización enviada').' · '.implode('; ',array_map(fn($item)=>$item['descripcion'].' '.$item['monto'],$items));
                // Full item revision is included in the immutable audit, not discarded on replace.
                $this->audit('service.quotationItems','servicio',$x,['id'=>$x['id'],'sucursal'=>$x['sucursal'],'items'=>$items]);
                if($op==='editQuote'&&$this->p->user['role']!=='direccion'){$q=$this->db->prepare('INSERT INTO notifications(id,user_id,texto,orden) VALUES (?,?,?,?)');$q->execute([uuid(),$this->p->user['id'],'Cotización modificada '.$x['folio'],$x['folio']]);}break;
            case 'authorize':requireThat($state==='Cotizada','Invalid service transition',409);$v=['estado'=>'Autorizada','autorizado'=>true];$text='Cliente autorizó por '.($d['via']??'Presencial');break;
            case 'reject':requireThat($state==='Cotizada','Invalid service transition',409);$this->required($d,['fecha']);$v=['estado'=>'Rechazada','autorizado'=>false,'entrega'=>$d['fecha']];if(!empty($d['diagnosticoCobrado']))$v+=$this->diagnosticPayment($d,$x);$v['cobrado']=Money::cents($v['diagnosticoCobrado']??$x['diagnosticoCobrado'])>0;$text='Cliente rechazó cotización';break;
            case 'chargeDiagnostic':requireThat(in_array($state,['Diagnóstico','Cotizada','Rechazada'],true),'Invalid diagnostic collection state',409);$v=$this->diagnosticPayment($d,$x);if($state==='Rechazada')$v['cobrado']=true;$text='Diagnóstico cobrado; registrado en SICAR';break;
            case 'start':requireThat($state==='Autorizada'&&(bool)$x['autorizado'],'Authorization required',409);$v=['estado'=>'En reparación'];$text='Inició reparación';break;
            case 'ready':requireThat($state==='En reparación','Invalid service transition',409);$v=['estado'=>'Lista'];$text='Lista para entregar';break;
            case 'deliver':requireThat($state==='Lista','Invalid service transition',409);$this->required($d,['entrega','formaPago','cobro']);requireThat(in_array($d['formaPago'],[...Finance::METHODS,'Crédito'],true),'Invalid method');$v=$this->pick($d,['entrega','formaPago','reparacionSicar']);$v['cobro']=Money::decimal(Money::cents($d['cobro']));requireThat(Money::cents($v['cobro'])>=0,'Negative charge');$v+=['estado'=>'Entregada','cobrado'=>true];$text='Entregada; cobro registrado en SICAR, sin generar otra venta';break;
            default:throw new Problem(422,'Unknown service transition');
        }
        if(isset($d['nota'])){requireThat(is_string($d['nota'])&&strlen($d['nota'])<=2000,'Invalid note');$text.=' · '.$d['nota'];}
        $new=$this->edit('servicio',$x,$v,$d['version'],'service.'.$op);$this->history($x['id'],$text);return $new;
    }
    private function stock(array $d): array {
        $this->p->demand('inventario');$this->required($d,['sku','sucursal']);$v=$this->pick($d,['producto','sku','actual','minimo','sucursal']);foreach(['actual','minimo'] as $k)requireThat(is_numeric($v[$k]??null)&&(float)$v[$k]>=0,'Invalid stock');return isset($d['id'])?$this->edit('stockMin',$this->old('stockMin',$d),$v,$d['version'],'stock.save'):$this->add('stockMin',$v,'stock.save');
    }
    private function inventory(array $d): array {
        $this->p->demand('inventario');$this->required($d,['fecha','tipo','producto','sucursal','cantidad']);requireThat(in_array($d['tipo'],['Entrada','Salida','Salida (Refacción)'],true)&&is_numeric($d['cantidad'])&&(float)$d['cantidad']>0,'Invalid movement');
        $v=$this->pick($d,['fecha','tipo','producto','sku','sucursal','cantidad']);$v['responsable']=$this->p->user['display_name'];$n=$this->add('inventario',$v,'inventory.move');
        $q=$this->db->prepare('SELECT id FROM stockMin WHERE sku=? AND sucursal=?');$q->execute([$d['sku']??'',$d['sucursal']]);if($id=$q->fetchColumn()){$x=$this->r->get('stockMin',$id,true);$value=max(0,(float)$x['actual']+($d['tipo']==='Entrada'?1:-1)*(float)$d['cantidad']);$this->edit('stockMin',$x,['actual'=>number_format($value,4,'.','')],(int)$x['_version'],'inventory.stock');}return $n;
    }
    private function removeBalance(array $d): array {
        $this->p->action('balance');$this->p->demand('finanzas');$x=$this->old('saldos',$d);
        return $this->edit('saldos',$x,['archived'=>true],$d['version'],'balance.remove');
    }
    private function balance(array $d): array {
        $this->p->action('balance');$this->p->demand('finanzas');$this->required($d,['cuenta','tipo','sucursal','fecha','saldo']);if(!isset($d['id'])){$q=$this->db->prepare('SELECT id,_version FROM saldos WHERE cuenta=? AND archived=1');$q->execute([$d['cuenta']]);if($archived=$q->fetch()){$d['id']=$archived['id'];$d['version']=(int)$archived['_version'];$d['archived']=false;}}$v=$this->pick($d,['cuenta','tipo','sucursal','fecha','saldo','archived']);return isset($d['id'])?$this->edit('saldos',$this->old('saldos',$d),$v,$d['version'],'balance.save'):$this->add('saldos',$v,'balance.save');
    }
    private function catalog(array $d): array {
        $t=$d['entity']??'';$maps=[
            'facturacion'=>['facturacion',['folio','cliente','rfc','fecha','total','sucursal','estado']],
            'ml'=>['ml',['producto','precio','mercado','stock','sucursal','estado']],
            'oportunidades'=>['oportunidades',['tipo','nombre','contacto','monto','sucursal','estado']],
            'compras'=>['compras',['folio','proveedor','fecha','monto','sucursal','entrega']],
            'clientesB2B'=>['clientes',['nombre','contacto','sucursal','credito']],
            'nomina'=>['nomina',['nombre','rol','sucursal','sueldo']],
            'comisiones'=>['comisiones',['empleadoId','periodo','monto']],
            'categoriasGastos'=>['gastos',['nombre','fijo']],
        ];requireThat(isset($maps[$t]),'Unknown catalog');[$page,$keys]=$maps[$t];$this->p->demand($page);if(in_array($t,['nomina','comisiones','categoriasGastos'],true))$this->p->action('expense');$v=$this->pick($d,$keys);
        $required=match($t){'facturacion'=>['folio','cliente','fecha','sucursal','total'],'ml'=>['producto','sucursal'],'oportunidades'=>['nombre','tipo','sucursal'],'compras'=>['folio','proveedor','fecha','sucursal'],'clientesB2B'=>['nombre','sucursal'],'nomina'=>['nombre','sucursal'],'comisiones'=>['empleadoId','periodo','monto'],default=>['nombre']};$this->required($v,$required);
        if($t==='facturacion'){$v['total']=Money::positive($v['total']);requireThat(in_array($v['estado']??'', ['Pendiente','Pagada'],true),'Invalid invoice status');}
        if($t==='compras')$v['estado']='En tránsito';if($t==='nomina'){$v['estado']='Activo';requireThat(Money::cents($v['sueldo']??0)>=0,'Invalid salary');}
        if($t==='clientesB2B'){requireThat(Money::cents($v['credito']??0)>=0,'Invalid credit');$v+=['compras'=>'0.00','saldo'=>'0.00'];}
        if($t==='comisiones'){$x=$this->r->get('nomina',$v['empleadoId'],true);requireThat($x['estado']!=='Inactivo','Inactive employee');$v+=['nombre'=>$x['nombre'],'sucursal'=>$x['sucursal'],'estado'=>'Pendiente'];$v['monto']=Money::positive($v['monto']);}
        if($t==='categoriasGastos'){
            $v['activo']=true;$q=$this->db->prepare('SELECT id FROM categoriasGastos WHERE nombre=?');$q->execute([$v['nombre']]);
            if($id=$q->fetchColumn()){$x=$this->r->get('categoriasGastos',$id,true);requireThat(!$x['activo'],'Category already exists',409);return $this->edit('categoriasGastos',$x,$v,(int)$x['_version'],'category.reactivate');}
        }return $this->add($t,$v,'catalog.'.$t.'.create');
    }
    private function receive(array $d): array {$this->p->demand('compras');$x=$this->old('compras',$d);requireThat($x['estado']==='En tránsito','Already received',409);$this->required($d,['entrega']);return $this->edit('compras',$x,['estado'=>'Recibida','entrega'=>$d['entrega']],$d['version'],'purchase.receive');}
    private function deactivate(array $d): array {$this->p->action('approve');$this->p->demand('gastos');$x=$this->old('categoriasGastos',$d);requireThat($x['nombre']!=='Otros','Cannot deactivate Otros');return $this->edit('categoriasGastos',$x,['activo'=>false],$d['version'],'category.deactivate');}
    private function settings(array $d): array {
        $this->p->action('settings');$this->p->demand('permisos');$q=$this->db->query('SELECT config,version FROM app_settings WHERE id=1 FOR UPDATE');$x=$q->fetch();requireThat(($d['version']??null)===(int)$x['version'],'Settings changed',409);$v=json_decode($x['config'],true,512,JSON_THROW_ON_ERROR);
        if(isset($d['requireTransferApproval'])){requireThat(is_bool($d['requireTransferApproval']),'Invalid approval flag');$v['requireTransferApproval']=$d['requireTransferApproval'];}
        if(isset($d['diagnosticoEstandar'])){$m=Money::cents($d['diagnosticoEstandar']);requireThat($m>0,'Invalid standard diagnostic cost');$v['diagnosticoEstandar']=(float)Money::decimal($m);}
        if(isset($d['moduleFlags'])){requireThat(is_array($d['moduleFlags']),'Invalid flags');foreach($d['moduleFlags'] as $k=>$b){requireThat(in_array($k,Policy::MODULES,true)&&is_bool($b),'Invalid module flag');$v['moduleFlags'][$k]=$b;}}
        $q=$this->db->prepare('UPDATE app_settings SET config=?,version=version+1 WHERE id=1');$q->execute([json_encode($v,JSON_THROW_ON_ERROR)]);$this->audit('settings.update','config',['id'=>'1','config'=>$x['config']],['id'=>'1','config'=>$v]);return ['config'=>$v,'version'=>(int)$x['version']+1];
    }
    private function readNotifications(array $d): array {
        $this->p->action('approve');$q=$this->db->prepare('INSERT IGNORE INTO notification_reads(notification_id,user_id) SELECT id,? FROM notifications WHERE id=?');foreach($d['ids']??[] as $id)$q->execute([$this->p->user['id'],$id]);return ['ok'=>true];
    }
}
