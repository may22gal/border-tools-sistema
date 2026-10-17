import { test, expect } from '@playwright/test';
import fs from 'node:fs';
test.beforeEach(async({page})=>{page.on('dialog',d=>d.accept());});
const credentials=()=>JSON.parse(fs.readFileSync('demo/.private/credentials.json','utf8'));
async function login(page,role='direccion'){
  await page.goto('/app.php');await page.waitForFunction(()=>typeof BT!=='undefined'&&BT.csrf,null,{timeout:10000});
  const c=credentials()[role];await page.locator('#username').fill(c.username);await page.locator('#login input[type=password]').fill(c.password);await page.locator('#btnEntrar').click();await expect(page.locator('#app')).not.toHaveClass(/hidden/);
}
async function navigate(page,name){
  if(await page.locator('.mobile-btn').isVisible()){if(!await page.locator('#sidebar').evaluate(e=>e.classList.contains('open')))await page.locator('.mobile-btn').click();await expect(page.locator('#sidebar')).toHaveClass(/open/);}
  await page.locator('#nav button[data-page="'+name+'"]').click();await expect(page.locator('#view')).not.toBeEmpty();
}
async function submit(page,name='Guardar'){
  await page.locator('#modal').getByRole('button',{name,exact:true}).click();await expect(page.locator('#modal')).toHaveClass(/hidden/);await page.waitForFunction(()=>!BT.busy);
}
const pages=['home','ventas','ventas_admin','mano_obra','sucursales','proveedores','gastos','servicio','servicio_stats','credito','caja','finanzas','reportes','facturacion','inventario','ml','oportunidades','compras','clientes','nomina','comisiones','excel','permisos'];
for(const module of pages){
 test('screen '+module,async({page},info)=>{
   const errors=[];page.on('pageerror',e=>errors.push(e.message));await login(page);await navigate(page,module);
   await expect(page.locator('#view h2')).toBeVisible();await expect(page.locator('#view')).not.toContainText('undefined');
   await page.screenshot({path:info.outputPath(module+'.png'),fullPage:true});expect(errors).toEqual([]);
   const local=await page.evaluate(()=>Object.keys(localStorage));expect(local.every(k=>k==='bt_prefs')).toBeTruthy();
 });
}
test('general expense form, second computer, duplicate-click prevention and reload',async({page,browser},info)=>{
 await login(page);const other=await browser.newContext({baseURL:'http://localhost:8080',viewport:info.project.use.viewport,isMobile:info.project.use.isMobile,hasTouch:info.project.use.hasTouch});const p2=await other.newPage();await login(p2);
 await navigate(page,'gastos');await page.getByRole('button',{name:'+ Registrar gasto',exact:true}).click();
 const text='Gasto prueba '+info.project.name+' '+Date.now();await page.locator('#e_concepto').fill(text);await page.locator('#e_monto').fill('123.45');
 const button=page.locator('#modal button.primary');await button.click({clickCount:2});await expect(page.locator('#modal')).toHaveClass(/hidden/);
 await expect.poll(()=>p2.evaluate(t=>S.egresos.filter(e=>e.concepto===t).length,text),{timeout:15000}).toBe(1);
 await page.reload();await expect(page.locator('#app')).not.toHaveClass(/hidden/);expect(await page.evaluate(t=>S.egresos.filter(e=>e.concepto===t).length,text)).toBe(1);
 await other.close();
});
test('offline save retains the form and only succeeds after reconnect',async({page,context},info)=>{
 await login(page);await navigate(page,'proveedores');await page.getByRole('button',{name:'+ Registrar pago',exact:true}).click();
 const text='Proveedor offline '+info.project.name+' '+Date.now();await page.locator('#e_concepto').fill(text);await page.locator('#e_prov').fill('Proveedor ficticio');await page.locator('#e_monto').fill('33.20');
 await context.setOffline(true);await page.locator('#modal button.primary').click();await expect.poll(()=>page.evaluate(()=>BT.busy)).toBe(false);
 await expect(page.locator('#modal')).not.toHaveClass(/hidden/);await expect(page.locator('#e_concepto')).toHaveValue(text);
 expect(await page.evaluate(t=>S.egresos.some(e=>e.concepto===t),text)).toBe(false);
 await context.setOffline(false);await page.locator('#modal button.primary').click();await expect(page.locator('#modal')).toHaveClass(/hidden/);expect(await page.evaluate(t=>S.egresos.filter(e=>e.concepto===t).length,text)).toBe(1);
});
test('response lost after commit and refresh recovers one server payment',async({page},info)=>{
 await login(page);await navigate(page,'gastos');await page.getByRole('button',{name:'+ Registrar gasto',exact:true}).click();
 const text='Respuesta perdida '+info.project.name+' '+Date.now();await page.locator('#e_concepto').fill(text);await page.locator('#e_monto').fill('19.99');
 let lost=false;await page.route('**/index.php?action=expense.create',async route=>{if(!lost){lost=true;await route.fetch();await route.abort('failed');}else await route.continue();});
 await page.locator('#modal button.primary').click();await page.waitForFunction(()=>!BT.busy);await expect(page.locator('#modal')).not.toHaveClass(/hidden/);
 await page.reload();await expect(page.locator('#app')).not.toHaveClass(/hidden/);await expect.poll(()=>page.evaluate(t=>S.egresos.filter(e=>e.concepto===t).length,text)).toBe(1);
 await page.waitForFunction(()=>Object.keys(BT.receipts()).length===0);expect(await page.evaluate(t=>S.egresos.filter(e=>e.concepto===t).length,text)).toBe(1);
});
test('stale expense correction cannot overwrite another computer',async({page,browser},info)=>{
 await login(page);await navigate(page,'gastos');const other=await browser.newContext({baseURL:'http://localhost:8080',viewport:info.project.use.viewport,isMobile:info.project.use.isMobile,hasTouch:info.project.use.hasTouch});const p2=await other.newPage();await login(p2);await navigate(p2,'gastos');
 await page.locator('#view button').filter({hasText:'Editar'}).first().click();await p2.locator('#view button').filter({hasText:'Editar'}).first().click();
 await p2.locator('#ed_concepto').fill('Corrección confirmada '+info.project.name);await submit(p2,'Guardar cambios');
 await page.locator('#ed_monto').fill('99.01');await page.locator('#modal').getByRole('button',{name:'Guardar cambios',exact:true}).click();await page.waitForFunction(()=>!BT.busy);
 await expect(page.locator('#modal')).not.toHaveClass(/hidden/);await expect(page.locator('#modal')).toHaveAttribute('data-conflict','1');
 await other.close();
});
test('server permissions, CSRF, individual accounts and logout',async({page})=>{
 await login(page,'ventas_g');const session=(await page.context().cookies()).find(c=>c.name==='BTADMIN');expect(session.httpOnly).toBe(true);expect(session.secure).toBe(true);expect(session.sameSite).toBe('Strict');await expect(page.locator('#nav button[data-page=finanzas]')).toBeHidden();
 const result=await page.evaluate(async()=>{
   const state=await(await fetch('index.php?action=state')).json();
   const forbidden=await fetch('index.php?action=expense.create',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':BT.csrf,'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({})});
   const csrf=await fetch('index.php?action=sales.save',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':'invalid'},body:'{}'});
   return {forbidden:forbidden.status,csrf:csrf.status,expenseCount:state.state.egresos.length,branches:state.state.ventas.map(x=>x.sucursal)};
 });expect(result.forbidden).toBe(403);expect(result.csrf).toBe(403);expect(result.expenseCount).toBe(0);expect(result.branches.every(b=>b==='Granjero')).toBe(true);
 await page.getByRole('button',{name:'Salir',exact:true}).click();await expect(page.locator('#login')).not.toHaveClass(/hidden/);expect(await page.evaluate(async()=> (await fetch('index.php?action=state')).status)).toBe(401);
});
test('remaining catalog forms persist using existing fields',async({page},info)=>{
 await login(page);const tag=info.project.name+' '+Date.now();
 const cases=[
 ['facturacion','+ Nueva factura',{f_folio:'F-'+tag,f_cliente:'Cliente '+tag,f_total:'100.01'}],
 ['inventario','+ Mínimo',{sm_prod:'Producto '+tag,sm_sku:'SKU-'+tag,sm_actual:'3',sm_min:'5'}],
 ['ml','+ Agregar',{m_prod:'Publicación '+tag,m_precio:'99',m_stock:'2'}],
 ['oportunidades','+ Nueva',{op_nom:'Prospecto '+tag,op_monto:'1000'}],
 ['compras','+ Orden de compra',{c_folio:'OC-'+tag,c_prov:'Proveedor '+tag,c_monto:'100'}],
 ['clientes','+ Cliente',{b_nombre:'Empresa '+tag,b_contacto:'Prueba',b_credito:'200'}]
 ];
 for(const [name,button,fields] of cases){await navigate(page,name);await page.getByRole('button',{name:button,exact:true}).click();for(const [id,value] of Object.entries(fields))await page.locator('#'+id).fill(value);await submit(page);}
 await navigate(page,'inventario');await page.getByRole('button',{name:'+ Movimiento',exact:true}).click();await page.locator('#i_prod').fill('Producto '+tag);await page.locator('#i_sku').fill('SKU-'+tag);await page.locator('#i_cant').fill('1');await submit(page);
 await navigate(page,'nomina');await page.getByRole('button',{name:'+ Dar de alta empleado',exact:true}).click();await page.locator('#n_nombre').fill('Empleado '+tag);await page.locator('#n_sueldo').fill('100.00');await submit(page,'Guardar empleado');
 await navigate(page,'comisiones');await page.getByRole('button',{name:'+ Registrar comisión',exact:true}).click();await page.locator('#cm_periodo').fill(tag);await page.locator('#cm_monto').fill('25.00');await submit(page,'Guardar comisión');
 await page.reload();await expect(page.locator('#app')).not.toHaveClass(/hidden/);expect(await page.evaluate(t=>S.facturacion.some(x=>x.cliente==='Cliente '+t)&&S.ml.some(x=>x.producto==='Publicación '+t)&&S.nomina.some(x=>x.nombre==='Empleado '+t),tag)).toBe(true);
});
test('service reception, diagnostic, quote and authorization use original forms',async({page},info)=>{
 await login(page);await navigate(page,'servicio');await page.getByRole('button',{name:'+ Recibir herramienta',exact:true}).click();const name='Servicio UI '+info.project.name+' '+Date.now();
 await page.locator('#o_cliente').fill(name);await page.locator('#o_herr').fill('Herramienta ficticia');await submit(page,'Registrar entrada');
 const card=page.locator('.orden-card').filter({hasText:name});await card.getByRole('button',{name:'Registrar diagnóstico →'}).click();await page.locator('#diag_txt').fill('Diagnóstico de prueba');await submit(page,'Guardar diagnóstico');
 await card.getByRole('button',{name:'Enviar cotización →'}).click();await page.locator('#cot_monto').fill('400.00');await submit(page,'Enviar cotización');
 await card.getByRole('button',{name:'Registrar respuesta del cliente →'}).click();await submit(page,'✓ Autorizó');
 await expect(card).toContainText('Autorizada');await card.getByRole('button',{name:'Iniciar reparación →'}).click();await expect(card).toContainText('En reparación');
 await card.getByRole('button',{name:'Marcar como lista →'}).click();await expect(card).toContainText('Lista');await card.getByRole('button',{name:'Registrar entrega y cobro →'}).click();await submit(page,'Confirmar entrega y cobro');
 await expect(page.locator('#tablaCerradas')).toContainText(name);
});
test('SICAR PDF, credit allocation, payroll, commission and cash forms',async({page,browser},info)=>{
 await login(page);await navigate(page,'ventas');
 await page.getByRole('button',{name:'+ Registrar corte diario',exact:true}).click();
 const date=info.project.name==='desktop'?'2027-01-05':'2027-01-06';await page.locator('#v_fecha').fill(date);
 await page.locator('#v_efectivo').fill('100.00');await page.locator('#v_credito').fill('100.00');await page.locator('#v_sicar_total').fill('200.00');
 const pdf=Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
 await page.locator('#v_pdf').setInputFiles({name:'SICAR-ficticio.pdf',mimeType:'application/pdf',buffer:pdf});await submit(page,'Guardar corte');
 const receipt=await page.evaluate(d=>S.ventas.find(x=>x.fecha===d),date);expect(receipt.evidenciaId).toBeTruthy();
 const file=await page.request.get('/evidence.php?id='+receipt.evidenciaId);expect(file.status()).toBe(200);expect((await file.body()).equals(pdf)).toBe(true);
 await navigate(page,'credito');const row=page.locator('tr').filter({hasText:date}).filter({has:page.getByRole('button',{name:'Asignar a cliente'})});await row.getByRole('button',{name:'Asignar a cliente'}).click();
 await page.locator('#ac_cliente').fill('Cliente crédito UI '+info.project.name);await page.locator('#ac_monto').fill('50.00');await submit(page,'Crear cuenta por cobrar');
 const cr=page.locator('tr').filter({hasText:'Cliente crédito UI '+info.project.name});await cr.getByRole('button',{name:'Registrar abono'}).click();await page.locator('#cc_monto').fill('10.00');await submit(page,'Registrar abono');
 await navigate(page,'nomina');await page.getByRole('button',{name:'+ Registrar pago',exact:true}).first().click();await page.locator('#pg_periodo').fill('Pago UI '+info.project.name);await page.locator('#pg_monto').fill('10.00');await submit(page,'Confirmar pago');
 await navigate(page,'comisiones');await page.getByRole('button',{name:'Registrar pago',exact:true}).first().click();await page.locator('#pg_monto').fill('10.00');await submit(page,'Confirmar pago');
 await navigate(page,'caja');await page.getByRole('button',{name:'+ Movimiento de efectivo',exact:true}).click();await page.locator('#cmx_monto').fill('5.00');await page.locator('#cmx_concepto').fill('Fondo UI '+info.project.name);await submit(page,'Guardar movimiento');
 await page.getByRole('button',{name:'+ Hacer corte',exact:true}).click();await page.locator('#ccx_contado').fill('1300.00');await submit(page,'Guardar corte');
 const other=await browser.newContext({baseURL:'http://localhost:8080'});const p2=await other.newPage();await login(p2,'ventas_t');const res=await p2.request.get('/evidence.php?id='+receipt.evidenciaId);expect(res.status()).toBe(403);await other.close();
});
test('financial corrections, history and approval shared with Direction',async({page,browser},info)=>{
 await login(page,'finanzas');const other=await browser.newContext({baseURL:'http://localhost:8080'});const director=await other.newPage();await login(director);
 await navigate(page,'gastos');await page.getByRole('button',{name:'+ Registrar gasto',exact:true}).click();const text='Autorización UI '+info.project.name+' '+Date.now();await page.locator('#e_concepto').fill(text);await page.locator('#e_monto').fill('77.00');await submit(page,'Guardar gasto');
 const line=page.locator('.rline').filter({hasText:text}).first();await line.getByRole('button',{name:'Editar',exact:true}).click();await page.locator('#ed_monto').fill('78.00');await submit(page,'Guardar cambios');await line.getByRole('button',{name:'Historial',exact:true}).click();await expect(page.locator('#modal')).toContainText('78');await page.locator('#modal').getByRole('button',{name:'✕',exact:true}).click();
 await line.getByRole('button',{name:'Solicitar anulación',exact:true}).click();await page.waitForFunction(()=>!BT.busy);
 await expect.poll(()=>director.evaluate(t=>S.egresos.find(e=>e.concepto===t)?.solicitudAnulacion?.estado,text),{timeout:15000}).toBe('Pendiente');
 await navigate(director,'finanzas');director.on('dialog',d=>d.accept());await director.getByRole('button',{name:'Autorizar anulación',exact:true}).last().click();await director.waitForFunction(()=>!BT.busy);
 await expect.poll(()=>page.evaluate(t=>S.egresos.find(e=>e.concepto===t)?.anulado,text),{timeout:15000}).toBe(true);await other.close();
});
test('settings controls write only on server confirmation and restore original flag',async({page})=>{
 await login(page);await navigate(page,'permisos');const checkbox=page.locator('#chkTransfer');const initial=await checkbox.isChecked();await checkbox.setChecked(!initial);await page.waitForFunction(()=>!BT.busy);await page.reload();await expect(page.locator('#app')).not.toHaveClass(/hidden/);await navigate(page,'permisos');await expect(page.locator('#chkTransfer')).toBeChecked({checked:!initial});await page.locator('#chkTransfer').setChecked(initial);await page.waitForFunction(()=>!BT.busy);
});

test('private files and demo configuration are not web-accessible',async({page})=>{
 for(const path of ['/backend/config.php','/../src/Core.php','/demo/.private/credentials.json','/.htaccess','/src/entities.json']){const response=await page.request.get(path);expect([400,403,404]).toContain(response.status());}
 await login(page,'facturacion');const result=await page.request.get('/evidence.php?id=unavailable');expect(result.status()).toBe(403);
});
test.describe('recorded synthetic demonstration',()=>{
 test('walk through all connected screens',async({browser},info)=>{
   const context=await browser.newContext({baseURL:'http://localhost:8080',viewport:info.project.use.viewport,isMobile:info.project.use.isMobile,hasTouch:info.project.use.hasTouch,recordVideo:{dir:info.outputPath('video')}});const page=await context.newPage();page.on('dialog',d=>d.accept());try{
   await login(page);for(const name of pages){await navigate(page,name);await expect(page.locator('#view h2')).toBeVisible();await page.waitForTimeout(250);}
   await navigate(page,'gastos');await page.getByRole('button',{name:'+ Registrar gasto',exact:true}).click();const concept='Demostración grabada '+Date.now();await page.locator('#e_concepto').fill(concept);await page.locator('#e_monto').fill('42.50');await submit(page,'Guardar gasto');await page.reload();await expect(page.locator('#app')).not.toHaveClass(/hidden/);expect(await page.evaluate(t=>S.egresos.filter(e=>e.concepto===t).length,concept)).toBe(1);await navigate(page,'finanzas');
   }finally{await context.close();}
 });
});

test('deferred card charge, partial settlement and category administration',async({page},info)=>{
 await login(page);await navigate(page,'gastos');const name='Tarjeta UI '+info.project.name+' '+Date.now();
 await page.getByRole('button',{name:'+ Registrar gasto',exact:true}).click();await page.locator('#e_concepto').fill(name);await page.locator('#e_monto').fill('90.00');await page.locator('#e_metodo').selectOption('Tarjeta');await page.locator('#e_credito').selectOption('1');await submit(page,'Guardar gasto');
 await page.getByRole('button',{name:'💳 Liquidar cargos de tarjeta',exact:true}).click();await page.locator('#modal .rline').filter({hasText:name}).getByRole('button',{name:'Registrar pago',exact:true}).click();await page.locator('#lt_monto').fill('30.00');await page.locator('#lt_referencia').fill('Referencia ficticia');await submit(page,'Confirmar pago y actualizar saldo');
 const balance=await page.evaluate(n=>{const c=S.egresos.find(e=>e.concepto===n);return {pending:saldoCargoTarjeta(c),payments:S.egresos.filter(e=>e.origenCargoId===c.id).length};},name);expect(balance).toEqual({pending:60,payments:1});
 await page.getByRole('button',{name:'Administrar tipos de gasto',exact:true}).click();await page.locator('#tg_nombre').fill(name);await page.getByRole('button',{name:'+ Guardar tipo',exact:true}).click();await page.waitForFunction(()=>!BT.busy);await expect(page.locator('#modal .rline').filter({hasText:name})).toBeVisible();
 await page.locator('#modal .rline').filter({hasText:name}).getByRole('button',{name:'Desactivar'}).click();await page.waitForFunction(()=>!BT.busy);expect(await page.evaluate(n=>S.categoriasGastos.find(c=>c.nombre===n).activo,name)).toBe(false);
});
test('manual credit, pending transfer approval, balances and received purchase',async({page},info)=>{
 await login(page);const name='Manual UI '+info.project.name+' '+Date.now();await navigate(page,'credito');await page.getByRole('button',{name:'+ Crédito manual',exact:true}).click();await page.locator('#cr_cliente').fill(name);await page.locator('#cr_monto').fill('100.00');await submit(page,'Guardar crédito');
 await page.locator('tr').filter({hasText:name}).getByRole('button',{name:'Registrar abono'}).click();await page.locator('#cc_metodo').selectOption('Transferencia');await page.locator('#cc_status').selectOption('Pendiente');await page.locator('#cc_monto').fill('25.00');await submit(page,'Registrar abono');
 await navigate(page,'finanzas');await page.locator('#cardTransfer tr').filter({hasText:name}).getByRole('button',{name:'✓ Confirmar',exact:true}).click();await page.waitForFunction(()=>!BT.busy);expect(await page.evaluate(n=>S.cobranzas.find(c=>c.cliente===n).transferenciaStatus,name)).toBe('Aprobada');
 await page.getByRole('button',{name:'Saldos disponibles',exact:true}).click();await page.locator('#sd_cuenta').fill(name);await page.locator('#sd_saldo').fill('200.25');await submit(page,'Guardar saldo');
 await page.getByRole('button',{name:'Saldos disponibles',exact:true}).click();await page.locator('#modal .rline').filter({hasText:name}).getByRole('button',{name:'Quitar'}).click();await page.waitForFunction(()=>!BT.busy);expect(await page.evaluate(n=>S.saldos.some(c=>c.cuenta===n),name)).toBe(false);await page.locator('#modal').getByRole('button',{name:'✕',exact:true}).click();
 await navigate(page,'compras');await page.getByRole('button',{name:'+ Orden de compra',exact:true}).click();await page.locator('#c_folio').fill(name);await page.locator('#c_prov').fill('Proveedor ficticio');await page.locator('#c_monto').fill('80.00');await submit(page);await page.locator('tr').filter({hasText:name}).getByRole('button',{name:'Marcar recibida'}).click();await page.waitForFunction(()=>!BT.busy);await expect(page.locator('tr').filter({hasText:name})).toContainText('Recibida');
});

test('edited uncertain submission cannot create a second expense',async({page},info)=>{
 await login(page);await navigate(page,'gastos');await page.getByRole('button',{name:'+ Registrar gasto',exact:true}).click();const concept='Envío incierto editado '+info.project.name+' '+Date.now();await page.locator('#e_concepto').fill(concept);await page.locator('#e_monto').fill('18.00');let lost=false;
 await page.route('**/index.php?action=expense.create',async route=>{if(!lost){lost=true;await route.fetch();await route.abort('failed');}else await route.continue();});await page.locator('#modal button.primary').click();await page.waitForFunction(()=>!BT.busy);await expect(page.locator('#modal')).not.toHaveClass(/hidden/);
 await page.locator('#e_monto').fill('28.00');await page.locator('#modal button.primary').click();await expect(page.locator('#modal')).toHaveClass(/hidden/);await page.waitForFunction(()=>!BT.busy);expect(await page.evaluate(t=>S.egresos.filter(e=>e.concepto===t).map(e=>e.monto),concept)).toEqual([18]);
});
