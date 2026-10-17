import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const gitHash=crypto.createHash('sha1').update('blob '+Buffer.byteLength(html)+'\0').update(html).digest('hex');
assert.equal(gitHash,'b014daa1720500958aa16590693c4f922859d5ed','Original UI must be unchanged');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const element={setAttribute(){},addEventListener(){},classList:{toggle(){}},style:{}};
const ctx=vm.createContext({window:{},document:{documentElement:element,getElementById(){return element},querySelectorAll(){return []}},localStorage:{getItem(){return null}},console,Intl,Date,setTimeout,clearTimeout});
vm.runInContext(script,ctx);
assert.equal(vm.runInContext('Object.keys(PAGES).length',ctx),23);
const original=crypto.createHash('sha256').update(html).digest('hex');
fs.mkdirSync(new URL('./generated/',import.meta.url),{recursive:true});
let seed=89123;const rand=n=>{seed=(seed*1664525+1013904223)>>>0;return seed%n;};
const amount=()=> (rand(2000000)/100).toFixed(2);
const fixtures=[];
for(let i=0;i<120;i++){
  const state={config:{requireTransferApproval:i%2===0},ventas:[],cobranzas:[],egresos:[],cajaMovimientos:[]};
  for(let j=0;j<8;j++){
    const suc=j%2?'Troncoso':'Granjero',fecha=j%3?'2026-01-15':'2026-02-15';
    state.ventas.push({fecha,sucursal:suc,efectivo:amount(),transferencia:amount(),tarjeta:amount(),cheque:amount(),credito:amount(),creditoAsignado:0,manoObra:amount(),totalVentaSicar:amount(),transferenciaStatus:['Aprobada','Pendiente','Rechazada'][rand(3)]});
    state.cobranzas.push({fecha,sucursal:suc,monto:amount(),metodo:['Efectivo','Transferencia','Tarjeta','Cheque','INVALID'][rand(5)],transferenciaStatus:['Aprobada','Pendiente','Rechazada'][rand(3)]});
    state.egresos.push({fecha,sucursal:j%3?'Ambas':suc,monto:amount(),anulado:rand(5)===0,pagoAplazado:rand(3)===0,impactaCajaFisica:rand(2)===0,cajaSucursal:suc});
    state.cajaMovimientos.push({fecha,sucursal:suc,entrada:amount(),salida:amount()});
  }
  for(const suc of [null,'Granjero','Troncoso']){
    const period={start:'2026-01-01',end:'2026-01-31'};
    ctx.fixture=state;ctx.period=period;ctx.branch=suc;
    const expected=vm.runInContext('S=fixture; btTotals(period,branch)',ctx);
    const labor=vm.runInContext('manoPorMetodo(S.ventas)',ctx);
    fixtures.push({state,period,branch:suc,expected:JSON.parse(JSON.stringify(expected)),labor:JSON.parse(JSON.stringify(labor))});
  }
}
fs.writeFileSync(new URL('./generated/finance.json',import.meta.url),JSON.stringify(fixtures));
fs.writeFileSync(new URL('./generated/reference.json',import.meta.url),JSON.stringify({sha256:original,pages:23,scenarios:fixtures.length,perms:vm.runInContext('PERMS',ctx)}));
console.log(`Original JavaScript: 23 screens; ${fixtures.length} synthetic financial scenarios generated.`);
