/* Supplier invoices and cash-flow clarity for the centrally connected application. */
(function(){
'use strict';
const originalPage=proveedores, originalForm=openEgreso, originalEdit=egresoSePuedeEditar;
function paid(x){return r2(S.egresos.filter(e=>!e.anulado&&e.compraId===x.id).reduce((s,e)=>s+Number(e.monto),0));}
function balance(x){return Math.max(0,r2(Number(x.monto)-paid(x)));}
function invoiceStatus(x){return balance(x)<0.01?'Pagada al proveedor':paid(x)>0?'Pago parcial':'Pendiente de pago';}
function identity(x){return {id:x.id,version:Number(x._version)};}
egresoSePuedeEditar=x=>!x.compraId&&originalEdit(x);
proveedores=function(){
 const suc=sucName(), invoices=S.compras.filter(x=>x.facturaRegistrada&&egresoMontoAsignado(x,suc)>0);
 const outstanding=r2(invoices.reduce((s,x)=>s+balance(x)*(x.sucursal==='Ambas'&&suc?0.5:1),0));
 return originalPage()+`<div class="card" style="margin-top:14px"><h3>Facturas y deuda con proveedores</h3><p>Recibir mercancía no significa pagarla. Estas facturas no reducen el dinero disponible hasta registrar su pago con dinero propio.</p><button class="primary" onclick="abrirFacturaProveedor()">+ Registrar factura pendiente</button><p><b>Saldo pendiente con proveedores: ${moneyC(outstanding)}</b> · Todos los períodos</p><div class="table-wrap"><table><thead><tr><th>Factura / proveedor</th><th>Recepción</th><th>Vencimiento</th><th>Total</th><th>Pagado al proveedor</th><th>Saldo</th><th>Estado</th><th></th></tr></thead><tbody>${invoices.map(x=>`<tr><td>${h(x.folio)} · ${h(x.proveedor)}<br>${h(x.fecha)} · ${h(x.sucursal)}</td><td>${h(x.estado)}</td><td>${h(x.vencimiento||'Sin fecha')}</td><td>${moneyC(x.monto)}</td><td>${moneyC(paid(x))}</td><td>${moneyC(balance(x))}</td><td>${h(invoiceStatus(x))}</td><td>${balance(x)>0.009&&can('egreso')?`<button class="secondary" onclick="abrirPagoProveedor('${x.id}')">Registrar pago</button>`:''}</td></tr>`).join('')||'<tr><td colspan="8">Sin facturas registradas. Las compras anteriores no se convierten automáticamente en deudas.</td></tr>'}</tbody></table></div><p class="small muted">Si pagaste con tarjeta de crédito, el proveedor queda pagado y la deuda continúa en «Saldo pendiente en tarjeta». Las liquidaciones de tarjeta se muestran en Gastos generales.</p></div>`;
};
PAGES.proveedores=proveedores;
window.abrirFacturaProveedor=function(){
 const purchases=S.compras.filter(x=>!x.facturaRegistrada);
 openModal('Registrar factura pendiente',`<div class="callout">Registra lo que debes al proveedor. Guardar esta factura no registra una salida de dinero. Si ya capturaste su pago antes, revisa ese registro para no duplicarlo.</div><div class="form-grid"><div class="field full"><label>Relacionar con una compra existente (opcional)</label><select id="fp_compra" onchange="cargarCompraFactura()"><option value="">Nueva factura</option>${purchases.map(x=>`<option value="${x.id}">${h(x.folio)} · ${h(x.proveedor)}</option>`).join('')}</select></div><div class="field"><label>Factura / referencia</label><input id="fp_folio"></div><div class="field"><label>Proveedor</label><input id="fp_proveedor"></div><div class="field"><label>Fecha de factura</label><input id="fp_fecha" type="date" value="${todayBiz()}"></div><div class="field"><label>Fecha límite de pago (opcional)</label><input id="fp_vencimiento" type="date"></div><div class="field"><label>Sucursal</label><select id="fp_sucursal">${sucOptions(defaultSuc(),{ambas:true})}</select></div><div class="field"><label>Importe total</label><input id="fp_monto" type="number" step="0.01" min="0.01"></div><div class="field"><label>¿Ya recibieron la mercancía?</label><select id="fp_recibida"><option value="1">Sí, recibida</option><option value="0">No, en tránsito</option></select></div></div><button class="primary" onclick="guardarFacturaProveedor()">Guardar factura pendiente</button>`);
};
window.cargarCompraFactura=function(){const x=S.compras.find(x=>x.id===val('fp_compra'));if(!x)return;for(const k of ['folio','proveedor','fecha','sucursal','monto'])document.getElementById('fp_'+k).value=x[k];document.getElementById('fp_recibida').value=x.estado==='Recibida'?'1':'0';};
window.guardarFacturaProveedor=function(){const x=S.compras.find(x=>x.id===val('fp_compra'));return BT.mutate('supplier.invoice',{...(x?identity(x):{}),folio:val('fp_folio').trim(),proveedor:val('fp_proveedor').trim(),fecha:val('fp_fecha'),sucursal:val('fp_sucursal'),monto:val('fp_monto'),vencimiento:val('fp_vencimiento')||null,recibida:val('fp_recibida')==='1'},{page:'proveedores',message:'Factura guardada, pendiente de pago ✓'});};
window.abrirPagoProveedor=function(id){const x=S.compras.find(x=>x.id===id);if(!x)return;
 openModal('Pagar factura al proveedor',`<div class="callout">${h(x.proveedor)} · ${h(x.folio)}<br>Saldo: <b>${moneyC(balance(x))}</b>. Puedes registrar un abono.</div><div class="form-grid"><div class="field"><label>Fecha del pago al proveedor</label><input id="sp_fecha" type="date" value="${todayBiz()}"></div><div class="field"><label>Importe pagado</label><input id="sp_monto" type="number" min="0.01" step="0.01" max="${balance(x)}" value="${balance(x)}"></div>${camposPago('sp',x.sucursal==='Ambas'?defaultSuc():x.sucursal)}<div class="field full"><label>Si usas tarjeta</label><select id="sp_credito"><option value="1">Tarjeta de crédito: la pagaré después</option><option value="0">Tarjeta de débito: ya salió de mi cuenta</option></select></div></div><button class="primary" onclick="guardarPagoProveedor('${x.id}')">Guardar pago</button>`);document.getElementById('sp_metodo').value='Transferencia';syncCajaPago('sp');
};
window.guardarPagoProveedor=function(id){const x=S.compras.find(x=>x.id===id);if(!x)return;return BT.mutate('supplier.pay',{...identity(x),fecha:val('sp_fecha'),monto:val('sp_monto'),...leerPago('sp',x.sucursal),pagoAplazado:val('sp_metodo')==='Tarjeta'&&val('sp_credito')==='1'},{page:'proveedores',message:'Pago aplicado a la factura ✓'});};
openEgreso=function(grupo='gastos'){originalForm(grupo);const el=document.getElementById('e_credito');if(el){el.innerHTML='<option value="1">Tarjeta de crédito: la pagaré después</option><option value="0">Tarjeta de débito: ya salió de mi cuenta</option>';}
 // Austromex case: someone opens "Pago a proveedores" only to record received goods. Offer the pending-invoice path first.
 const callout=document.querySelector('#modal .callout');
 if(grupo==='proveedores'&&callout&&can('egreso'))callout.insertAdjacentHTML('afterend','<div class="warnbox" style="margin-top:8px"><b>¿Recibiste mercancía y todavía no la pagas?</b> No la captures aquí, porque este formulario la marca como pagada. <button class="secondary" onclick="closeModal();abrirFacturaProveedor()">Registrar factura pendiente</button></div>');
};

/* Monthly view: what was bought/registered in the period vs when money actually left. Nothing is counted twice:
   - a supplier invoice counts as a purchase on its invoice date; its later payments (compraId) are not purchases again;
   - a card charge counts as a purchase on its charge date; settling the card (origenCargoId / "Pago de tarjeta") is only a cash outflow. */
const CARD_PAYMENT='Pago de tarjeta de crédito';
function isCardPayment(e){return !!e.origenCargoId||e.categoria===CARD_PAYMENT;}
function upTo(v,end){const d=String(v||'').slice(0,10);return !!d&&d<=end;}
function share(x,suc){return egresoMontoAsignado(x,suc);}
function ratio(x,suc){const m=Number(x.monto)||0;return m>0?share(x,suc)/m:0;}
window.comprasVsSalidas=function(p,suc){
 const eg=S.egresos.filter(e=>!e.anulado&&inReportRange(e.fecha,p)&&share(e,suc)>0);
 const own=eg.filter(e=>!e.compraId&&!isCardPayment(e));
 const facturas=S.compras.filter(x=>x.facturaRegistrada&&inReportRange(x.fecha,p)&&share(x,suc)>0);
 const sum=(rows)=>r2(rows.reduce((a,x)=>a+share(x,suc),0));
 const r={
  alMomento:sum(own.filter(e=>!e.pagoAplazado)),
  conTarjeta:sum(own.filter(e=>e.pagoAplazado)),
  facturas:sum(facturas),
  pagoProveedores:sum(eg.filter(e=>e.compraId&&!e.pagoAplazado)),
  proveedoresConTarjeta:sum(eg.filter(e=>e.compraId&&e.pagoAplazado)),
  pagoTarjeta:sum(eg.filter(e=>isCardPayment(e)&&!e.pagoAplazado)),
 };
 r.registrado=r2(r.alMomento+r.conTarjeta+r.facturas);
 r.salidas=btTotals(p,suc).egresos;
 // Balances as of the last day of the period, so October's report still shows what was owed at October's close.
 r.deudaTarjeta=r2(S.egresos.filter(e=>!e.anulado&&e.pagoAplazado&&upTo(e.fecha,p.end)).reduce((a,e)=>{
   const pagado=liquidacionesDeCargo(e).filter(x=>upTo(x.fecha,p.end)).reduce((s,x)=>s+Number(x.monto||0),0);
   return a+Math.max(0,Number(e.monto||0)-pagado)*ratio(e,suc);},0));
 r.deudaProveedores=r2(S.compras.filter(x=>x.facturaRegistrada&&upTo(x.fecha,p.end)).reduce((a,x)=>{
   const pagado=S.egresos.filter(e=>!e.anulado&&e.compraId===x.id&&upTo(e.fecha,p.end)).reduce((s,e)=>s+Number(e.monto||0),0);
   return a+Math.max(0,Number(x.monto||0)-pagado)*ratio(x,suc);},0));
 return r;
};
window.comprasVsSalidasHtml=function(p,suc){
 const r=comprasVsSalidas(p,suc),line=(t,v,b)=>`<div class="rline"><span>${b?'<b>'+t+'</b>':t}</span><b>${moneyC(v)}</b></div>`;
 return `<div class="card" style="margin-top:13px"><h3>Compras del mes vs. salidas de dinero · ${periodLabel(p)}</h3>
 <div class="callout">Una compra se cuenta <b>una sola vez</b> como compra, en la fecha en que se hizo. El dinero cuenta como salida <b>cuando realmente sale</b>: al pagar al proveedor con dinero propio o al pagar la tarjeta.</div>
 <div class="grid4">${kpi('Compras y gastos del mes',money(r.registrado),'Lo que se compró o gastó, pagado o no')}${kpi('Salidas de dinero',money(r.salidas),'Lo que realmente salió del banco o caja')}${kpi('Debemos a la tarjeta',money(r.deudaTarjeta),'Al cierre del período')}${kpi('Debemos a proveedores',money(r.deudaProveedores),'Facturas sin pagar al cierre')}</div>
 <div class="grid2" style="margin-top:13px"><div><h3>Lo que se compró o gastó</h3>
 ${line('Pagado en el momento (efectivo, transferencia, débito)',r.alMomento)}
 ${line('Con tarjeta de crédito (se paga después)',r.conTarjeta)}
 ${line('Facturas de proveedor registradas',r.facturas)}
 ${line('Total del mes',r.registrado,true)}
 <div class="formula">Incluye nómina y comisiones. Las facturas cuentan aquí aunque después se paguen con tarjeta.</div></div>
 <div><h3>Lo que realmente salió</h3>
 ${line('Pagado en el momento (sin facturas ni tarjeta)',r.alMomento)}
 ${line('Pagos a proveedores con dinero propio',r.pagoProveedores)}
 ${line('Pagos de tarjeta de crédito',r.pagoTarjeta)}
 ${line('Total de salidas',r.salidas,true)}
 ${r.proveedoresConTarjeta>0.009?`<div class="formula">Facturas pagadas al proveedor con tarjeta este mes: ${moneyC(r.proveedoresConTarjeta)}. El proveedor ya quedó pagado; el dinero saldrá cuando se pague la tarjeta.</div>`:''}</div></div></div>`;
};
if(typeof REPORTES!=='undefined'&&!REPORTES.some(x=>x[0]==='compras'))REPORTES.splice(1,0,['compras','Compras vs. salidas de dinero','Lo comprado en el mes y cuándo salió el dinero']);
const originalReport=pintarReporte;
pintarReporte=function(){
 originalReport();const el=document.getElementById('btReportBody');if(!el)return;
 const p=getReportPeriod(),suc=sucName();
 if(reportView==='compras')el.innerHTML=comprasVsSalidasHtml(p,suc);
 else if(reportView==='mensual')el.insertAdjacentHTML('beforeend',comprasVsSalidasHtml(p,suc));
};
const originalFinance=finanzas;
finanzas=function(){
 const html=originalFinance(),marker='<div class="grid3" style="margin-top:13px">',i=html.indexOf(marker),extra=comprasVsSalidasHtml(getReportPeriod(),sucName());
 return i<0?html+extra:html.slice(0,i)+extra+html.slice(i);
};
PAGES.finanzas=finanzas;
// The existing adapter handles shared persistence, idempotency and refresh. No local financial snapshots.
})();
