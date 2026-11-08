const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{
 const root=path.resolve('dist');
 const server=http.createServer((req,res)=>{const file=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);if(!file.startsWith(root+'/')){res.writeHead(403);return res.end();}try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
 browser=await chromium.launch({headless:true,...(process.env.BT_CHROMIUM?{executablePath:process.env.BT_CHROMIUM}:{})});
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
 const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#roleSelect').selectOption('finanzas');await page.locator('#btnEntrar').click();
 await page.evaluate(()=>{S.egresos=[];S.compras=[];save();go('proveedores');abrirFacturaProveedor();});
 await page.locator('#fp_folio').fill('TEST-001');await page.locator('#fp_proveedor').fill('Proveedor de prueba');await page.locator('#fp_fecha').fill('2026-10-15');await page.locator('#fp_monto').fill('1000');await page.locator('#fp_sucursal').selectOption('Granjero');
 await page.getByRole('button',{name:'Guardar factura pendiente',exact:true}).click();
 assert.equal(await page.evaluate(()=>S.compras.length),1);assert.equal(await page.evaluate(()=>S.egresos.length),0);
 await page.getByRole('button',{name:'Registrar pago',exact:true}).click();await page.locator('#sp_fecha').fill('2026-10-29');await page.locator('#sp_metodo').selectOption('Tarjeta');await page.getByRole('button',{name:'Guardar pago',exact:true}).click();
 assert.deepEqual(await page.evaluate(()=>{const r=comprasVsSalidas({start:'2026-10-01',end:'2026-10-31'},null);return [r.registrado,r.salidas,r.deudaTarjeta,r.deudaProveedores];}),[1000,0,1000,0]);
 await page.evaluate(()=>abrirLiquidarCargo(0));await page.locator('#lt_fecha').fill('2026-11-20');await page.locator('#lt_monto').fill('400');await page.getByRole('button',{name:'Confirmar pago y actualizar saldo'}).click();
 assert.deepEqual(await page.evaluate(()=>{const r=comprasVsSalidas({start:'2026-11-01',end:'2026-11-30'},null);return [r.registrado,r.salidas,r.deudaTarjeta];}),[0,400,600]);
 await page.reload();await page.locator('#btnEntrar').click();assert.equal(await page.evaluate(()=>S.compras.filter(x=>x.facturaRegistrada).length),1);
 await page.evaluate(()=>{go('finanzas');});assert.ok(await page.getByText('Compras del mes vs. salidas de dinero',{exact:false}).count());
 await page.evaluate(()=>{go('servicio');imprimirEtiqueta(0);});assert.equal(await page.locator('#bt-ticket-size').inputValue(),'76.2');assert.equal(await page.locator('#bt-label-size').inputValue(),'2x1');
 await page.evaluate(()=>{closeModal();role='ventas_g';applyPerms();go('proveedores');});assert.ok(await page.getByText('Acceso restringido',{exact:true}).count());
 assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS desktop/mobile: invoice → credit card → partial settlement, report months, reload, permissions and print sizes');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
