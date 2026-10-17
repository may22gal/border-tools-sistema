/* Connects the original 23 screens. No business records are persisted in browser storage. */
'use strict';
const BT = {
  csrf: '', user: null, branches: [], pages: [], settingsVersion: 0, busy: false,
  syncing: false, dirty: false, revision: -1, pendingStorage: 'bt_pending_receipts_v1',
  records: new Map(), // IDs and versions captured when a modal opens, not array positions.
  async request(action, data, key) {
    const opts={credentials:'same-origin',cache:'no-store',headers:{}};
    if(data!==undefined){opts.method='POST';opts.headers={'Content-Type':'application/json','X-CSRF-Token':this.csrf};if(key)opts.headers['Idempotency-Key']=key;opts.body=JSON.stringify(data);}
    const response=await fetch('index.php?action='+encodeURIComponent(action),opts);
    let out;try{out=await response.json();}catch{throw Object.assign(new Error('El servidor no devolvió una respuesta válida. Tu captura sigue abierta.'),{uncertain:true});}
    if(!response.ok){if(response.status===401&&this.user)this.lock();const messages={401:'Tu sesión terminó. Inicia sesión para continuar.',403:'Tu usuario no tiene permiso para esta operación.',409:'El registro cambió o la operación ya existe. Revisa los datos actualizados antes de guardar.',422:'Revisa los campos de la captura.',429:'Demasiados intentos. Inténtalo más tarde.',503:'El servidor no está disponible. Puedes reintentar sin duplicar el movimiento.'};throw Object.assign(new Error(messages[response.status]||out.error||'No se pudo guardar.'),{status:response.status,detail:out.error});}
    return out;
  },
  lock() {
    this.suspended={userId:this.user?.id,modalOpen:!document.getElementById('modal').classList.contains('hidden')};
    this.user=null;document.getElementById('app').classList.add('hidden');document.getElementById('modal').classList.add('hidden');document.getElementById('login').classList.remove('hidden');
    toast('Tu sesión terminó. Inicia sesión para continuar.');
  },
  receipts() {try{return JSON.parse(sessionStorage.getItem(this.pendingStorage)||'{}');}catch{return {};}},
  saveReceipts(value) {sessionStorage.setItem(this.pendingStorage,JSON.stringify(value));},
  async receipt(action,data) {
    const bytes=new TextEncoder().encode(JSON.stringify([action,data]));
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    const fingerprint=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    const entries=this.receipts();
    if(entries[fingerprint])return {fingerprint,...entries[fingerprint]};
    // An uncertain submission keeps its key even if the form is edited or reopened.
    // The server can commit one payload for that key, never a second payment.
    const pending=Object.entries(entries).find(([,entry])=>entry.action===action);
    if(pending)return {fingerprint:pending[0],...pending[1]};
    entries[fingerprint]={key:crypto.randomUUID(),action};this.saveReceipts(entries);
    return {fingerprint,...entries[fingerprint]};
  },
  removeReceipt(fp) {const r=this.receipts();delete r[fp];this.saveReceipts(r);},
  stampUTC(value) {
    if(!value)return value;
    const iso=/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)?value.replace(' ','T')+'Z':value;
    const d=new Date(iso);return Number.isNaN(d.getTime())?value:d.toLocaleString('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  },
  normalize(packet) {
    const numeric=new Set(['_version','efectivo','transferencia','tarjeta','cheque','credito','creditoAsignado','manoObra','totalVentaSicar','total','cantidad','precio','stock','monto','diagnosticoCosto','diagnosticoCobrado','reparacionBruta','cotizacion','cobro','sueldo','compras','saldo','actual','minimo','fondo','esperado','contado','diferencia','retiro','queda','entrada','salida']);
    const bools=new Set(['fijo','activo','autorizado','cobrado','garantia','impactaCajaFisica','pagoAplazado','anulado','read','archived']);
    for(const key of ARRAY_KEYS){packet.state[key]??=[];for(const row of packet.state[key]){
      for(const [field,value] of Object.entries(row)){if(numeric.has(field)&&!(field==='entrada'&&key==='servicio')&&value!==null&&value!=='')row[field]=Number(value);if(bools.has(field))row[field]=value===true||value===1||value==='1';}
      if(key==='servicio'){row.entrada=row.entrada||'';row.entrega=row.entrega||'';row.historial??=[];for(const item of row.cotItems||[])item.monto=Number(item.monto);}
      if(row.ts)row.ts=this.stampUTC(row.ts);if(row.historial)for(const item of row.historial)if(item.ts)item.ts=this.stampUTC(item.ts);if(row.historialCambios)for(const item of row.historialCambios){if(item.fecha)item.fecha=this.stampUTC(item.fecha);for(const side of ['anterior','nuevo']){if(item.accion!=='Corrección de egreso'){item[side]=null;continue;}const fields=new Set(['fecha','sucursal','concepto','proveedor','categoria','monto','metodo','pagoAplazado','impactaCajaFisica','cajaSucursal']);item[side]=Object.fromEntries(Object.entries(item[side]||{}).filter(([k])=>fields.has(k)).map(([k,v])=>[k,numeric.has(k)?Number(v):bools.has(k)?v===true||v===1||v==='1':v]));}}
      if(key==='nomina')row.ultimoPago||='—';if(key==='comisiones')row.fechaPago||='—';if(key==='compras')row.entrega||='—';
    }}
    return packet;
  },
  apply(packet, repaint=true) {
    const p=this.normalize(packet);S=p.state;this.user=p.user;this.branches=p.branches;this.pages=p.permissions;this.settingsVersion=p.settingsVersion;this.revision=p.revision;
    role=p.user.role;const lock=lockedSuc();if(lock)currentSuc=lock;
    document.getElementById('roleName').textContent=p.user.display_name;
    document.getElementById('avatarEl').textContent=AVATARS[role]||'B';applyPerms();actualizarNotif();
    if(repaint)render(roleHas(currentPage)?currentPage:'home');
  },
  async sync(force=false) {
    if(this.syncing||(!force&&(this.busy||!this.user||document.getElementById('sidebar').classList.contains('open')||!document.getElementById('modal').classList.contains('hidden'))))return;
    this.syncing=true;try{const packet=await this.request('state');if(force||(!this.busy&&document.getElementById('modal').classList.contains('hidden')&&!document.getElementById('sidebar').classList.contains('open')))this.apply(packet);}finally{this.syncing=false;}
  },
  capture() {
    this.records.clear();for(const key of ARRAY_KEYS)for(let i=0;i<(S[key]||[]).length;i++)this.records.set(key+':'+i,structuredClone(S[key][i]));
  },
  row(key,i) {return document.getElementById('modal').classList.contains('hidden')?S[key]?.[i]:(this.records.get(key+':'+i)||S[key]?.[i]);},
  identity(row) {if(!row)throw new Error('El registro ya no está disponible.');return {id:row.id,version:Number(row._version)};},
  async mutate(action,data,{page=currentPage,message='Guardado ✓',close=true,after}={}) {
    if(this.busy)return false;this.busy=true;
    const buttons=[...document.querySelectorAll('#modal button,.orden-actions button,.btn-row button')];const states=buttons.map(b=>b.disabled);buttons.forEach(b=>b.disabled=true);
    let receipt,committed=false;
    try{
      receipt=await this.receipt(action,data);
      await this.request(action,data,receipt.key);committed=true;
      // A confirmed write and a refreshed authoritative state are both required before closing.
      const packet=await this.request('state');this.apply(packet,false);
      this.removeReceipt(receipt.fingerprint);if(close)closeModal();if(after)after();render(roleHas(page)?page:'home');if(after)after(true);toast(message);return true;
    }catch(e){
      if(receipt&&e.status===409){
        try{const status=await this.request('request.status&key='+receipt.key);if(status.confirmed){committed=true;this.apply(await this.request('state'),false);this.removeReceipt(receipt.fingerprint);if(close)closeModal();render(roleHas(page)?page:'home');toast('El envío anterior ya estaba guardado. Se actualizaron sus datos; no se creó otro movimiento.');return true;}}catch{toast('No se pudo comprobar el envío anterior. Conserva la captura y reintenta con conexión.');return false;}
      }
      if(receipt&&e.status&&e.status<500)this.removeReceipt(receipt.fingerprint);
      if(e.status===409){await this.syncConflict();}
      toast(committed?'El servidor guardó el movimiento, pero falta actualizar la pantalla. Reintenta para consultar el mismo guardado.':(e.message||'Sin conexión. No se confirmó el guardado; reintenta cuando vuelva internet.'));
      return false;
    }finally{this.busy=false;buttons.forEach((b,i)=>{if(b.isConnected)b.disabled=states[i];});}
  },
  async syncConflict() {
    // Keep the open form and its captured ID/version. Do not apply a new array under its index.
    try{const p=await this.request('state');if(document.getElementById('modal').classList.contains('hidden'))this.apply(p);else document.getElementById('modal').dataset.conflict='1';}catch{}
  },
  async recover() {
    if(!this.user||this.busy)return;
    for(const [fp,receipt] of Object.entries(this.receipts())){
      try{const s=await this.request('request.status&key='+receipt.key);if(s.confirmed&&document.getElementById('modal').classList.contains('hidden')){await this.sync();this.removeReceipt(fp);toast('El movimiento pendiente quedó guardado en el servidor ✓');}}catch{}
    }
  }
};
// State endpoints with query arguments are built without accepting arbitrary destinations.
const btRequest=BT.request.bind(BT);
BT.request=async function(action,data,key){
  if(action.startsWith('request.status&key=')){
    const response=await fetch('index.php?action=request.status&key='+encodeURIComponent(action.split('&key=')[1]),{credentials:'same-origin',cache:'no-store'});
    const out=await response.json();if(!response.ok)throw Object.assign(new Error(out.error||'No disponible'),{status:response.status});return out;
  }
  return btRequest(action,data,key);
};
const btModal=openModal;
openModal=function(title,body){BT.capture();btModal(title,body);delete document.getElementById('modal').dataset.conflict;};
const btClose=closeModal;
closeModal=function(){BT.dirty=false;btClose();if(BT.user&&!BT.busy)BT.sync().catch(()=>{});};
roleHas=page=>BT.pages.includes(page);
lockedSuc=()=>BT.branches.length===1?BT.branches[0].toLowerCase():null;
sucOptions=function(selected,{ambas=false}={}){
  const list=BT.branches.concat(ambas&&BT.branches.length===2?['Ambas']:[]);return list.map(s=>'<option '+(s===(selected||list[0])?'selected':'')+'>'+h(s)+'</option>').join('');
};
save=function(){throw new Error('El guardado local está desactivado. Usa la operación del servidor.');};
loadState=function(){throw new Error('Los datos administrativos se consultan en el servidor.');};
resetDemo=function(){toast('El reinicio de datos está desactivado en el sistema conectado.');};
enter=async function(){
  if(BT.busy)return;BT.busy=true;const button=document.getElementById('btnEntrar');button.disabled=true;
  try{BT.csrf=(await BT.request('csrf')).csrf;const previousUser=BT.user?.id||sessionStorage.getItem('bt_receipt_owner');const out=await BT.request('login',{username:val('username'),password:document.querySelector('#login input[type=password]').value});BT.csrf=out.csrf;if(previousUser&&previousUser!==out.user.id)BT.saveReceipts({});sessionStorage.setItem('bt_receipt_owner',out.user.id);
    currentPage='home';currentSuc='all';BT.apply(await BT.request('state'));document.getElementById('login').classList.add('hidden');document.getElementById('app').classList.remove('hidden');document.querySelector('#login input[type=password]').value='';if(BT.suspended?.modalOpen&&BT.suspended.userId===out.user.id)document.getElementById('modal').classList.remove('hidden');else{document.getElementById('modal').innerHTML='';BT.records.clear();}BT.suspended=null;await BT.recover();
  }catch(e){toast(e.message||'No se pudo iniciar sesión.');}finally{BT.busy=false;button.disabled=false;}
};
cerrarSesion=async function(){
  try{await BT.request('logout',{});BT.user=null;BT.pages=[];S={config:{moduleFlags:{}}};ARRAY_KEYS.forEach(k=>S[k]=[]);btClose();document.getElementById('modal').innerHTML='';document.getElementById('view').innerHTML='';BT.records.clear();document.getElementById('app').classList.add('hidden');document.getElementById('login').classList.remove('hidden');BT.csrf=(await BT.request('csrf')).csrf;}catch{toast('No se confirmó el cierre de sesión. Reintenta con conexión.');}
};
const btPermissionPage=permisos;
permisos=function(){return btPermissionPage().replace('Datos del demo','Datos del sistema').replace('Restablecer datos de ejemplo','Restablecimiento desactivado').replace('En la etapa demo estas solicitudes solo se comparten en este navegador.','Las solicitudes se comparten con Dirección.');};
PAGES.permisos=permisos;
const btAnulaciones=solicitudesAnulacionHtml;
solicitudesAnulacionHtml=function(){return btAnulaciones().replace('En la etapa demo estas solicitudes solo se comparten en este navegador.','Solicitudes compartidas con Dirección.');};
// Every handler below captures inputs and submits a command, without mutating S.
const fields=(mapping)=>Object.fromEntries(Object.entries(mapping).map(([key,id])=>[key,val(id)]));
const ident=(key,i)=>BT.identity(BT.row(key,i));
const payFields=prefix=>({metodo:val(prefix+'_metodo'),impactaCajaFisica:val(prefix+'_metodo')==='Efectivo'&&val(prefix+'_caja')==='1',cajaSucursal:val(prefix+'_cajasuc')});
const abonoFields=prefix=>fields({fecha:prefix+'_fecha',metodo:prefix+'_metodo',monto:prefix+'_monto',transferenciaStatus:prefix+'_status'});
function matchingClient(name,sucursal){return S.clientesB2B.find(c=>c.nombre===name&&c.sucursal===sucursal);}
saveVenta=async function(){
  if(BT.busy||saveVenta.preparing)return;
  const d=fields({fecha:'v_fecha',sucursal:'v_suc',efectivo:'v_efectivo',transferencia:'v_transfer',tarjeta:'v_tarjeta',cheque:'v_cheque',credito:'v_credito',manoObra:'v_mano',totalVentaSicar:'v_sicar_total',transferenciaStatus:'v_transfer_status',observacion:'v_obs'});
  const old=S.ventas.find(x=>x.fecha===d.fecha&&x.sucursal===d.sucursal);
  if(old){if(!confirm(`Ya existe un corte de ${d.sucursal} del ${d.fecha}. ¿Reemplazarlo?`))return;Object.assign(d,BT.identity(old));}
  const file=document.getElementById('v_pdf')?.files?.[0];
  if(file){
    saveVenta.preparing=true;
    try{if(saveVenta.upload?.file===file&&saveVenta.upload.branch===d.sucursal){Object.assign(d,saveVenta.upload.data);}else{const form=new FormData();form.append('pdf',file);form.append('sucursal',d.sucursal);const res=await fetch('evidence.php',{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':BT.csrf},body:form});const e=await res.json();if(!res.ok)throw new Error('No se guardó el PDF. Conserva la captura y reintenta.');Object.assign(d,e);saveVenta.upload={file,branch:d.sucursal,data:e};}}catch(e){toast(e.message||'No se pudo subir la evidencia.');return;}finally{saveVenta.preparing=false;}
  }
  return BT.mutate('sales.save',d,{page:'ventas',message:'Corte diario guardado ✓'});
};
saveEgreso=grupo=>BT.mutate('expense.create',{...fields({fecha:'e_fecha',sucursal:'e_suc',concepto:'e_concepto',categoria:'e_cat',proveedor:'e_prov',monto:'e_monto'}),grupo,...payFields('e'),pagoAplazado:val('e_credito')==='1'},{page:grupo==='proveedores'?'proveedores':'gastos'});
guardarEdicionEgreso=i=>BT.mutate('expense.edit',{...ident('egresos',i),...fields({fecha:'ed_fecha',sucursal:'ed_suc',concepto:'ed_concepto',categoria:'ed_cat',proveedor:'ed_prov',monto:'ed_monto'}),...payFields('ed'),pagoAplazado:val('ed_credito')==='1'});
guardarLiquidacionCargo=i=>BT.mutate('expense.settle',{...ident('egresos',i),...fields({fecha:'lt_fecha',monto:'lt_monto',referencia:'lt_referencia'}),...payFields('lt')});
solicitarAnulacionEgreso=i=>BT.mutate('expense.requestVoid',ident('egresos',i),{close:false,message:'Solicitud enviada a Dirección ✓'});
resolverAnulacionEgreso=function(i,approved){const x=BT.row('egresos',i);if(approved&&!confirm('¿Anular el movimiento de '+x.concepto+' por '+x.monto+'? Se conservará en el historial.'))return;return BT.mutate('expense.resolveVoid',{...BT.identity(x),approved},{close:false,message:approved?'Movimiento anulado ✓':'Solicitud rechazada'});};
saveEmpleado=()=>BT.mutate('catalog.create',{entity:'nomina',...fields({nombre:'n_nombre',sucursal:'n_suc',rol:'n_rol',sueldo:'n_sueldo'}),sueldo:val('n_sueldo')||'0'},{page:currentPage==='comisiones'?'comisiones':'nomina'});
saveComision=()=>BT.mutate('catalog.create',{entity:'comisiones',...fields({empleadoId:'cm_empleado',periodo:'cm_periodo',monto:'cm_monto'})},{page:'comisiones'});
savePago=function(tipo,i){
  const x=BT.row(tipo,i),d={...BT.identity(x),tipo,...fields({fecha:'pg_fecha',periodo:'pg_periodo',monto:'pg_monto'}),...payFields('pg')};
  if(tipo==='nomina'&&S.egresos.some(e=>!e.anulado&&e.origenId===x.id&&e.periodo.trim().toLowerCase()===d.periodo.trim().toLowerCase())){if(!confirm('Ya existe un pago de este empleado para ese período. ¿Registrar otro pago adicional?'))return;d.confirmAdditional=true;}
  return BT.mutate('payroll.pay',d,{page:tipo,after:()=>{reportMode='week';reportAnchor=d.fecha;reportCustomStart='';reportCustomEnd='';},message:'Pago guardado ✓ · visible en el período de pago'});
};
saveCredito=function(){const d=fields({cliente:'cr_cliente',fecha:'cr_fecha',sucursal:'cr_suc',monto:'cr_monto'}),c=matchingClient(d.cliente,d.sucursal);if(c)d.clienteId=c.id;return BT.mutate('credit.create',d,{page:'credito'});};
saveAsignarCredito=function(i){const x=BT.row('ventas',i),d={...BT.identity(x),cliente:val('ac_cliente').trim(),monto:val('ac_monto')},c=matchingClient(d.cliente,x.sucursal);if(c)d.clienteId=c.id;return BT.mutate('credit.assign',d,{page:'credito'});};
saveCobroCredito=i=>BT.mutate('credit.payment',{...ident('creditos',i),...abonoFields('cc')},{page:'credito',message:'Abono registrado ✓'});
saveAbonoB2B=i=>BT.mutate('b2b.payment',{...ident('clientesB2B',i),...abonoFields('ab')},{page:'clientes',message:'Abono registrado ✓'});
// Match by server ID and branch first; legacy name is only a display fallback.
openAbonoB2B=function(i){const x=S.clientesB2B[i],ci=S.creditos.findIndex(c=>c.saldo>0&&c.sucursal===x.sucursal&&(c.clienteId===x.id||(!c.clienteId&&c.cliente===x.nombre)));if(ci>=0)return openCobroCredito(ci);openModal('Registrar abono · '+h(x.nombre),'<div class="callout">Saldo: <b>'+moneyC(x.saldo)+'</b></div><div class="form-grid">'+camposAbono('ab',x.saldo,x.saldo)+'</div><div style="margin-top:14px"><button class="primary" onclick="saveAbonoB2B('+i+')">Registrar abono</button></div>');};
corregirMetodo=(i,metodo)=>metodo&&BT.mutate('payment.correctMethod',{...ident('cobranzas',i),metodo},{close:false});
aprobarTransferencia=(tipo,i,approved)=>BT.mutate('transfer.decide',{...ident(tipo==='venta'?'ventas':'cobranzas',i),tipo,approved},{close:false});
saveCorteCaja=function(){return BT.mutate('cash.close',{...fields({fecha:'ccx_fecha',sucursal:'ccx_suc',fondo:'ccx_fondo',contado:'ccx_contado',retiro:'ccx_retiro'}),...(()=>{const x=S.cortesCaja.find(x=>x.fecha===val('ccx_fecha')&&x.sucursal===val('ccx_suc'));return x?BT.identity(x):{};})()},{page:'caja'});};
saveMovimientoCaja=()=>BT.mutate('cash.movement',fields({fecha:'cmx_fecha',sucursal:'cmx_suc',tipo:'cmx_tipo',monto:'cmx_monto',concepto:'cmx_concepto'}),{page:'caja'});
saveSaldo=function(){const d=fields({cuenta:'sd_cuenta',tipo:'sd_tipo',sucursal:'sd_suc',saldo:'sd_saldo',fecha:'sd_fecha'}),x=S.saldos.find(x=>x.cuenta.toLowerCase()===d.cuenta.toLowerCase());return BT.mutate('balance.save',{...d,...(x?BT.identity(x):{})});};
borrarSaldo=i=>BT.mutate('balance.remove',ident('saldos',i),{after:finished=>{if(finished)openSaldos();}});
guardarCategoriaGasto=()=>BT.mutate('catalog.create',{entity:'categoriasGastos',nombre:val('tg_nombre').trim(),fijo:val('tg_fijo')==='1'},{after:finished=>{if(finished)administrarCategoriasGastos();}});
desactivarCategoriaGasto=function(encoded){const name=decodeURIComponent(encoded),x=S.categoriasGastos.find(x=>x.nombre===name);if(!x||!confirm('¿Desactivar el tipo de gasto '+name+'? No se borran registros anteriores.'))return;return BT.mutate('category.deactivate',BT.identity(x),{after:finished=>{if(finished)administrarCategoriasGastos();}});};
function BTSettings(changes){return BT.mutate('settings.update',{version:BT.settingsVersion,...changes},{page:'permisos',close:false}).then(ok=>{if(!ok)render('permisos');});}
toggleModule=(key,on)=>BTSettings({moduleFlags:{[key]:on}});
// Remaining operational modules use their existing forms unchanged.
saveFact=()=>BT.mutate('catalog.create',{entity:'facturacion',...fields({folio:'f_folio',cliente:'f_cliente',rfc:'f_rfc',fecha:'f_fecha',total:'f_total',sucursal:'f_suc',estado:'f_estado'})},{page:'facturacion'});
saveStockMin=function(){const d=fields({producto:'sm_prod',sku:'sm_sku',actual:'sm_actual',minimo:'sm_min',sucursal:'sm_suc'}),x=S.stockMin.find(x=>x.sku===d.sku&&x.sucursal===d.sucursal);return BT.mutate('stock.save',{...d,...(x?BT.identity(x):{})},{page:'inventario'});};
saveMov=()=>BT.mutate('inventory.move',fields({fecha:'i_fecha',tipo:'i_tipo',producto:'i_prod',sku:'i_sku',cantidad:'i_cant',sucursal:'i_suc',responsable:'i_resp'}),{page:'inventario'});
saveML=()=>BT.mutate('catalog.create',{entity:'ml',...fields({producto:'m_prod',precio:'m_precio',mercado:'m_mercado',stock:'m_stock',sucursal:'m_suc',estado:'m_estado'})},{page:'ml'});
saveOpo=()=>BT.mutate('catalog.create',{entity:'oportunidades',...fields({tipo:'op_tipo',nombre:'op_nom',contacto:'op_cont',monto:'op_monto',sucursal:'op_suc',estado:'op_est'})},{page:'oportunidades'});
saveCompra=()=>BT.mutate('catalog.create',{entity:'compras',...fields({folio:'c_folio',proveedor:'c_prov',fecha:'c_fecha',monto:'c_monto',sucursal:'c_suc'}),entrega:val('c_entrega')||null},{page:'compras'});
recibirCompra=i=>BT.mutate('purchase.receive',{...ident('compras',i),entrega:todayBiz()},{page:'compras',close:false});
saveCliente=()=>BT.mutate('catalog.create',{entity:'clientesB2B',...fields({nombre:'b_nombre',contacto:'b_contacto',sucursal:'b_suc',credito:'b_credito'})},{page:'clientes'});
saveOrden=()=>BT.mutate('service.create',{...fields({cliente:'o_cliente',tel:'o_tel',herramienta:'o_herr',modelo:'o_modelo',serie:'o_serie',sucursal:'o_suc',falla:'o_falla',entrada:'o_fecha',diagnosticoCosto:'o_diag'}),garantia:val('o_gar')==='1'},{page:'servicio'});
const service=(i,operation,d={})=>BT.mutate('service.transition',{...ident('servicio',i),operation,...d},{page:'servicio'});
const diagnosticFields=prefix=>({diagnosticoCobrado:val(prefix+'_monto'),diagnosticoFechaCobro:val(prefix+'_fecha'),diagnosticoMetodo:val(prefix+'_metodo'),diagnosticoSicar:val(prefix+'_sicar')});
guardarDiag=function(i){const d={...fields({diagnostico:'diag_txt',diagnosticoCosto:'diag_costo',notas:'diag_notas',responsableDiagnostico:'diag_resp'}),garantia:val('diag_gar')==='1'};if(val('diag_paid')==='1'&&!d.garantia)Object.assign(d,{diagnosticoCobrado:val('diag_costo'),diagnosticoFechaCobro:val('diag_fecha'),diagnosticoMetodo:val('diag_metodo'),diagnosticoSicar:val('diag_sicar')});return service(i,'diagnose',d);};
guardarCot=i=>service(i,'quote',{items:[{descripcion:'Reparación',monto:val('cot_monto')}],via:val('cot_via')});
guardarEdicionCot=i=>service(i,'editQuote',{items:leerItemsCotEdit().map(it=>({...it,monto:it.monto.toFixed(2)}))});
const btAuth=guardarAuth;
guardarAuth=function(i,ok){if(ok)return service(i,'authorize',{via:val('auth_via'),nota:val('auth_nota')});return btAuth(i,false);};
confirmRechazo=function(i){const d={fecha:todayBiz()};if(val('rej_paid')==='1')Object.assign(d,diagnosticFields('rej'));return service(i,'reject',d);};
saveCobroDiag=i=>service(i,'chargeDiagnostic',diagnosticFields('cd'));
guardarEntrega=i=>service(i,'deliver',fields({entrega:'ent_fecha',cobro:'ent_cobro',formaPago:'ent_pago',reparacionSicar:'ent_sicar'}));
const btAdvance=avanzar;
avanzar=function(i){const x=S.servicio[i];if(x.estado==='Autorizada')return service(i,'start');if(x.estado==='En reparación')return service(i,'ready');return btAdvance(i);};
openSicar=async function(i){const x=S.ventas[i];if(!x?.evidenciaId)return toast('Este corte no tiene PDF adjunto.');try{const response=await fetch('evidence.php?id='+encodeURIComponent(x.evidenciaId),{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw new Error();const url=URL.createObjectURL(await response.blob());const a=document.createElement('a');a.href=url;a.download=x.sicarArchivo||'SICAR.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}catch{toast('No se pudo consultar el PDF. Revisa tu conexión y permisos.');}};
verNotificaciones=async function(){if(role!=='direccion')return;const ns=S.notifications;openModal('Avisos al Director',ns.length?ns.map(x=>'<div class="card" style="margin-top:8px"><b>'+h(x.texto)+'</b><div class="small muted">'+h(x.by)+' · '+h(x.ts)+'</div></div>').join(''):'<div class="card muted">No hay avisos.</div>');await BT.mutate('notification.read',{ids:ns.filter(x=>!x.read).map(x=>x.id)},{close:false});};
// Export protection: spreadsheet formulas must remain text, not execute when opened.
const btExport=exportarCSV;
exportarCSV=function(name,cols,rows){return btExport(name,cols,rows.map(row=>row.map(v=>typeof v==='string'&&/^[\s]*[=+@-]/.test(v)?"'"+v:v)));};
// Individual account replaces freely chosen demo role in the existing login field.
const roleSelect=document.getElementById('roleSelect');
const username=document.createElement('input');username.id='username';username.name='username';username.autocomplete='username';username.required=true;roleSelect.replaceWith(username);username.parentElement.querySelector('label').textContent='Usuario';
const password=document.querySelector('#login input[type=password]');password.value='';password.autocomplete='current-password';password.required=true;
document.getElementById('loginTip').textContent='Ingresa con tu cuenta individual. Los datos se guardan y comparten de forma segura desde el servidor.';
document.querySelector('.demo-badge').textContent='SISTEMA CONECTADO';
password.addEventListener('keydown',e=>{if(e.key==='Enter')enter();});
setInterval(()=>BT.sync().then(()=>BT.recover()).catch(()=>{}),5000);
window.addEventListener('focus',()=>{BT.sync().then(()=>BT.recover()).catch(()=>{});});
window.addEventListener('online',()=>{BT.sync().then(()=>BT.recover()).catch(()=>{});});
document.getElementById('modal').addEventListener('input',()=>{BT.dirty=true;});
window.addEventListener('beforeunload',e=>{if(BT.busy||BT.dirty||Object.keys(BT.receipts()).length){e.preventDefault();e.returnValue='';}});
(async()=>{try{BT.csrf=(await BT.request('csrf')).csrf;const p=await BT.request('state');if(sessionStorage.getItem('bt_receipt_owner')&&sessionStorage.getItem('bt_receipt_owner')!==p.user.id)BT.saveReceipts({});sessionStorage.setItem('bt_receipt_owner',p.user.id);BT.apply(p);document.getElementById('login').classList.add('hidden');document.getElementById('app').classList.remove('hidden');await BT.recover();}catch(e){if(e.status!==401)toast(e.message||'No se pudo conectar al servidor.');}})();
