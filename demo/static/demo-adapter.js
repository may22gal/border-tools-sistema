/* Local preview transport only. Never loaded by the PHP application. */
(function(){
'use strict';
const uid=()=> 'DEMO-'+crypto.randomUUID();
const dateOK=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&!Number.isNaN(Date.parse(v));
const fail=m=>{throw new Error(m);};
function identify(){S.compras.forEach(x=>{if(!x.id)x.id=uid();if(!x._version)x._version=1;});}
identify();
const oldLoad=loadState;
loadState=function(){const state=oldLoad();state.compras.forEach(x=>{if(!x.id)x.id=uid();if(!x._version)x._version=1;});return state;};
window.BT={mutate(action,d,options={}){
 const before=JSON.stringify(S);
 try{
  if(!can('egreso')||!canSee('proveedores'))fail('Este perfil no puede registrar facturas o pagos.');
  const monto=r2(Number(d.monto));
  if(!Number.isFinite(monto)||monto<=0)fail('Escribe un importe mayor a cero.');
  if(!dateOK(d.fecha))fail('Revisa la fecha.');
  if(!['Granjero','Troncoso','Ambas'].includes(d.sucursal||S.compras.find(x=>x.id===d.id)?.sucursal))fail('Selecciona una sucursal válida.');
  if(action==='supplier.invoice'){
   if(!d.folio||!d.proveedor)fail('Captura la factura y el proveedor.');
   if(d.vencimiento&&(!dateOK(d.vencimiento)||d.vencimiento<d.fecha))fail('El vencimiento no puede ser anterior a la factura.');
   if(S.compras.some(x=>x.facturaRegistrada&&x.folio.toLowerCase()===d.folio.toLowerCase()&&x.proveedor.toLowerCase()===d.proveedor.toLowerCase()&&x.sucursal===d.sucursal))fail('Esta factura ya está registrada para ese proveedor y sucursal.');
   let x=d.id?S.compras.find(x=>x.id===d.id):null;
   if(d.id&&(!x||x.facturaRegistrada||x._version!==d.version||x.sucursal!==d.sucursal))fail('La compra cambió. Cierra y vuelve a abrir el formulario.');
   const values={folio:d.folio,proveedor:d.proveedor,fecha:d.fecha,sucursal:d.sucursal,monto,vencimiento:d.vencimiento,facturaRegistrada:true};
   if(x)Object.assign(x,values,{_version:x._version+1});
   else S.compras.unshift({...values,id:uid(),_version:1,estado:d.recibida?'Recibida':'En tránsito',entrega:d.recibida?d.fecha:null});
  }else if(action==='supplier.pay'){
   const x=S.compras.find(x=>x.id===d.id);
   if(!x||!x.facturaRegistrada||x._version!==d.version)fail('La factura cambió. Cierra y vuelve a abrir el formulario.');
   if(d.fecha<x.fecha)fail('El pago no puede ser anterior a la factura.');
   const paid=r2(S.egresos.filter(e=>!e.anulado&&e.compraId===x.id).reduce((s,e)=>s+Number(e.monto),0));
   if(monto>r2(x.monto-paid))fail('El pago supera el saldo pendiente.');
   if(!METODOS.includes(d.metodo))fail('Selecciona la forma de pago.');
   S.egresos.unshift({id:uid(),fecha:d.fecha,grupo:'proveedores',categoria:'Mercancía / Proveedores',concepto:'Factura '+x.folio,proveedor:x.proveedor,sucursal:x.sucursal,monto,compraId:x.id,metodo:d.metodo,pagoAplazado:d.metodo==='Tarjeta'&&!!d.pagoAplazado,impactaCajaFisica:d.metodo==='Efectivo'&&!!d.impactaCajaFisica,cajaSucursal:d.cajaSucursal||''});
   x._version++;
  }else fail('Acción no disponible en esta demo.');
  if(!save()){S=JSON.parse(before);return false;}
  closeModal();render(options.page||currentPage);toast(options.message||'Guardado en este navegador');return true;
 }catch(error){S=JSON.parse(before);toast(error.message);return false;}
}};
const originalSettle=guardarLiquidacionCargo;
guardarLiquidacionCargo=function(i){
 const x=S.egresos[i];
 if(val('lt_metodo')==='Tarjeta')return toast('Paga la tarjeta con efectivo, transferencia o cheque.');
 if(x&&val('lt_fecha')<x.fecha)return toast('La liquidación no puede ser anterior al cargo.');
 return originalSettle(i);
};
const originalPurchase=saveCompra;
saveCompra=function(){originalPurchase();identify();save();};
const originalReset=resetDemo;
resetDemo=function(){originalReset();identify();};
const tip=document.getElementById('loginTip');
if(tip)tip.innerHTML='<b>Border Tools Control.</b> Elige tu usuario para entrar. ¿Dudas? Adentro está el botón ❓ Ayuda, con buscador.';
})();
