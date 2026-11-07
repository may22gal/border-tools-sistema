// Run: NODE_PATH=<path to playwright> node tests/printer-settings.cjs
const {chromium} = require('playwright');
const {createServer} = require('node:http');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const root = join(__dirname, '..');
  const server = createServer((req,res) => {
    if(req.url === '/') { res.setHeader('Content-Type','text/html; charset=utf-8'); return res.end('<html><body><div id="modal"></div><script>window.S={servicio:[{folio:"OS-001",cliente:"<script>no</scr"+"ipt>",herramienta:"Taladro",modelo:"ABC",serie:"123",falla:"Falla de prueba"}]};window.h=x=>String(x??"").replace(/[&<>"\u0027]/g,c=>"&#"+c.charCodeAt(0)+";");window.moneyC=n=>"$"+n;window.toast=x=>window.lastToast=x;window.openModal=(t,b)=>document.getElementById("modal").innerHTML=b;</script><script src="/printer-settings.js"></script><script src="/service-print.js"></script></body></html>'); }
    try { res.setHeader('Content-Type','text/javascript');res.end(readFileSync(join(root,req.url))); } catch {res.statusCode=404;res.end();}
  }).listen(0,'127.0.0.1');
  await new Promise(r=>server.listening?r():server.once('listening',r));
  let browser;
  try {
    browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox']});
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.evaluate(()=>prepararComprobantesServicio(0));
    assert.equal(await page.locator('#bt-ticket-size').inputValue(),'76.2');
    assert.equal(await page.locator('#bt-label-size').inputValue(),'2x1');
    const job=await page.evaluate(()=>btDocumentoPrueba('etiqueta'));
    assert.equal(job.width,50.8);assert.equal(job.height,25.4);
    await page.evaluate(()=>{BTPrinters.open();btGuardarImpresoras();});
    assert.equal(await page.evaluate(()=>BTPrinters.read().mode),'browser');
    await page.selectOption('#bt-printer-mode','direct');
    await page.evaluate(()=>btGuardarImpresoras());
    assert.match(await page.locator('#bt-printer-status').textContent(),/Selecciona ambas/);
    await page.evaluate(()=>{
      window.jobs=[];window.fail=false;window.qz={websocket:{isActive:()=>true},printers:{find:async()=>['Recibos','Etiquetas']},configs:{create:(name,options)=>({name,options})},print:async(config,data)=>{if(window.fail)throw Error('Impresora desconectada');window.jobs.push({config,data});}};
    });
    await page.evaluate(()=>btBuscarImpresoras());
    await page.selectOption('#bt-receipt-printer','Recibos');
    await page.selectOption('#bt-label-printer','Etiquetas');
    await page.evaluate(()=>btGuardarImpresoras());
    await page.evaluate(()=>btPruebaImpresora('etiqueta'));
    await page.evaluate(()=>btPruebaImpresora('recibo'));
    const jobs=await page.evaluate(()=>window.jobs);
    assert.equal(jobs[0].config.name,'Etiquetas');assert.equal(jobs[1].config.name,'Recibos');
    assert.equal(jobs[0].config.options.size.width,50.8);assert.equal(jobs[1].config.options.size.width,76.2);
    assert.ok(jobs[1].config.options.size.height>=50);
    await page.evaluate(()=>prepararComprobantesServicio(0));
    await page.evaluate(()=>imprimirComprobanteServicio(0,'recibo'));
    assert.equal(await page.evaluate(()=>window.jobs.length),3);
    assert.ok(!(await page.evaluate(()=>window.jobs[2].data[0].data)).includes('<script>no'));
    await page.evaluate(()=>{window.fail=true;});
    await page.evaluate(()=>imprimirComprobanteServicio(0,'etiqueta'));
    assert.match(await page.evaluate(()=>window.lastToast),/No se reintentó/);
    assert.equal(await page.evaluate(()=>window.jobs.length),3);
    await page.evaluate(()=>{window.fail=false;qz.printers.find=async()=>['Otra'];});
    await page.evaluate(()=>imprimirComprobanteServicio(0,'etiqueta'));
    assert.match(await page.evaluate(()=>window.lastToast),/no está disponible/);
    await page.reload();
    assert.equal(await page.evaluate(()=>BTPrinters.read().receipt),'Recibos');
    await page.evaluate(()=>localStorage.setItem('bt_impresoras_v1','null'));
    assert.equal(await page.evaluate(()=>BTPrinters.read().mode),'browser');
    await page.evaluate(()=>{localStorage.setItem('bt_servicio_papel_v1',JSON.stringify({ticket:'58',label:'3x2'}));prepararComprobantesServicio(0);});
    assert.equal(await page.locator('#bt-ticket-size').inputValue(),'58');
    assert.equal(await page.locator('#bt-label-size').inputValue(),'3x2');
    await page.evaluate(()=>{localStorage.setItem('bt_servicio_papel_v1','invalid');prepararComprobantesServicio(0);window.open=()=>null;});
    await page.evaluate(()=>imprimirComprobanteServicio(0,'etiqueta'));
    assert.match(await page.evaluate(()=>lastToast),/ventanas emergentes/);
    console.log('Passed: defaults, exact dimensions, required assignment, independent routing, saved preferences, escaped content, print failures without retry, unavailable printer, invalid storage, existing paper preferences and browser fallback. QZ mocked; hardware untested.');
  } finally {if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
