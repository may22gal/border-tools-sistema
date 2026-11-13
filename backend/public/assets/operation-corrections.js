/* Shared validation and demo equivalents of the server's balance transactions. */
(function(){
'use strict';
const linked=c=>S.creditos.filter(x=>x.sucursal===c.sucursal&&(c.id&&x.clienteId?x.clienteId===c.id:!x.clienteId&&x.cliente===c.nombre));
const debt=c=>{const rows=linked(c);return rows.length?r2(rows.reduce((s,x)=>s+Number(x.saldo),0)):Number(c.saldo||0);};
const client=(name,branch)=>S.clientesB2B.find(c=>c.nombre===name&&c.sucursal===branch);
function sync(c){if(c&&linked(c).length)c.saldo=debt(c);}
window.creditLimitApproval=function(name,branch,amount){
 const matches=S.clientesB2B.filter(c=>c.nombre===name&&c.sucursal===branch),c=matches[0];
 if(matches.length>1){toast('Hay clientes duplicados con ese nombre. Revisa el catálogo antes de continuar.');return {ok:false};}
 if(!c)return {ok:true,confirmLimit:false};
 if(!linked(c).length&&Number(c.saldo)>0){toast('Este cliente tiene un saldo anterior sin cuenta relacionada. Hay que conciliarlo antes de agregar crédito.');return {ok:false};}
 if(r2(debt(c)+amount)<=Number(c.credito))return {ok:true,confirmLimit:false};
 const ok=confirm('El saldo quedaría en '+moneyC(debt(c)+amount)+' y el límite es '+moneyC(c.credito)+'. ¿Confirmas registrar este crédito por encima del límite?');
 return {ok,confirmLimit:ok};
};
const originalClients=clientes;
clientes=function(){const original=S.clientesB2B;S.clientesB2B=original.map(c=>({...c,saldo:debt(c)}));try{return originalClients();}finally{S.clientesB2B=original;}};PAGES.clientes=clientes;
// In connected mode the server supplies authoritative client balances, including for roles without credit access.
const connected=typeof BT!=='undefined'&&'csrf' in BT;
if(connected)return;
const uid=()=> 'DEMO-'+crypto.randomUUID();
function transaction(fn,page=currentPage){const before=JSON.stringify(S);try{fn();if(!save()){S=JSON.parse(before);return false;}closeModal();render(page);toast('Guardado ✓');return true;}catch(e){S=JSON.parse(before);toast(e.message);return false;}}
const requireValue=(ok,msg)=>{if(!ok)throw new Error(msg);};
const originalB2B=openAbonoB2B;
openAbonoB2B=function(i){const c=S.clientesB2B[i],rows=linked(c),x=rows.find(x=>x.saldo>0);if(x)return openCobroCredito(S.creditos.indexOf(x));if(rows.length)return toast('Este cliente no tiene cuentas pendientes.');return originalB2B(i);};
function createCredit(fromSale,i){
 if(!can('abonar')||!canSee('credito'))return toast('Tu usuario no registra créditos.');
 const sale=fromSale?S.ventas[i]:null,branch=sale?sale.sucursal:val('cr_suc'),name=val(fromSale?'ac_cliente':'cr_cliente').trim(),amount=r2(num(fromSale?'ac_monto':'cr_monto'));
 if(!name||!Number.isFinite(amount)||amount<=0||sale&&amount>creditoSinAsignar(sale))return toast('Revisa el cliente y el importe disponible.');
 const approval=creditLimitApproval(name,branch,amount);if(!approval.ok)return;
 return transaction(()=>{const c=client(name,branch);S.creditos.unshift({id:uid(),cliente:name,...(c?.id?{clienteId:c.id}:{}),fecha:sale?sale.fecha:val('cr_fecha'),sucursal:branch,monto:amount,saldo:amount,estado:'Pendiente',...(sale?{origenCorte:sale.id}:{})});if(sale)sale.creditoAsignado=r2(Number(sale.creditoAsignado||0)+amount);sync(c);logAct((approval.confirmLimit?'Crédito por encima del límite autorizado: ':'Crédito registrado: ')+name+' · '+moneyC(amount),branch);},'credito');
}
saveCredito=()=>createCredit(false);
saveAsignarCredito=i=>createCredit(true,i);
saveCobroCredito=function(i){if(!can('abonar'))return toast('Tu usuario no registra abonos.');return transaction(()=>{const x=S.creditos[i],ab=registrarAbono('cc',{id:uid(),creditoId:x.id,cliente:x.cliente,sucursal:x.sucursal,...(x.clienteId?{clienteId:x.clienteId}:{})});requireValue(ab&&Number.isFinite(ab.monto)&&ab.monto>0&&ab.monto<=x.saldo,'Revisa el importe del abono.');requireValue(ab.fecha>=x.fecha,'El abono no puede ser anterior al crédito.');x.saldo=r2(x.saldo-ab.monto);x.estado=x.saldo>0?'Pendiente':'Pagado';S.cobranzas.unshift(ab);sync(client(x.cliente,x.sucursal));logAct('Abono '+ab.monto+' · '+x.cliente,x.sucursal);},'credito');};
function adjust(ab,wasRejected,isRejected){
 if(wasRejected===isRejected)return;
 const delta=Number(ab.monto)*(isRejected?1:-1),x=S.creditos.find(x=>x.id===ab.creditoId),c=client(ab.cliente,ab.sucursal);
 if(x){const balance=r2(x.saldo+delta);requireValue(balance>=0&&balance<=x.monto,'La deuda cambió; concilia los pagos antes de reaplicar esta transferencia.');x.saldo=balance;x.estado=balance>0?'Pendiente':'Pagado';sync(c);}
 else {requireValue(c&&!linked(c).length,'No se encontró una cuenta única para ajustar este abono.');requireValue(c.saldo+delta>=0,'El pago supera el saldo.');c.saldo=r2(c.saldo+delta);}
}
aprobarTransferencia=function(type,i,ok){if(!can('aprobarTransferencia'))return toast('Solo Dirección confirma transferencias.');return transaction(()=>{const x=(type==='venta'?S.ventas:S.cobranzas)[i];requireValue(x,'Movimiento no disponible.');if(type!=='venta')adjust(x,x.transferenciaStatus==='Rechazada',!ok);x.transferenciaStatus=ok?'Aprobada':'Rechazada';logAct('Transferencia '+x.transferenciaStatus+' · '+(x.cliente||x.fecha),x.sucursal);});};
corregirMetodo=function(i,method){if(!can('abonar')||!METODOS.includes(method))return;return transaction(()=>{const x=S.cobranzas[i];adjust(x,x.metodo==='Transferencia'&&x.transferenciaStatus==='Rechazada',false);x.metodoOriginal=x.metodo;x.metodo=method;if(method==='Transferencia')x.transferenciaStatus='Pendiente';});};
saveMov=function(){if(!canSee('inventario'))return toast('Sin permiso para inventario.');return transaction(()=>{const x={fecha:val('i_fecha'),tipo:val('i_tipo'),producto:val('i_prod').trim(),sku:val('i_sku').trim(),cantidad:num('i_cant'),sucursal:val('i_suc'),responsable:val('i_resp')};requireValue(x.producto&&x.sku&&Number.isFinite(x.cantidad)&&x.cantidad>0,'Captura producto, SKU y cantidad válida.');const stock=S.stockMin.find(a=>a.sku===x.sku&&a.sucursal===x.sucursal);requireValue(stock,'Primero registra la existencia de ese SKU y sucursal con el botón Mínimo.');requireValue(['Entrada','Salida','Salida (Refacción)'].includes(x.tipo),'Tipo de movimiento inválido.');requireValue(x.tipo==='Entrada'||x.cantidad<=stock.actual,'No hay suficientes piezas. Disponible: '+stock.actual);stock.actual=Number(stock.actual)+(x.tipo==='Entrada'?1:-1)*x.cantidad;S.inventario.unshift(x);},'inventario');};
})();
