/* Configuración local de impresoras, independiente de datos de clientes y ventas. */
(function () {
  'use strict';
  const KEY = 'bt_impresoras_v1';
  const SCRIPT = new URL('vendor/qz-tray-2.3.0.js', document.currentScript.src).href;
  let loading, connecting, busy = false;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function read() {
    let p;
    try { p = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) {}
    p = p && typeof p === 'object' ? p : {};
    return {mode:p.mode === 'direct' ? 'direct' : 'browser', receipt:typeof p.receipt === 'string' ? p.receipt : '', label:typeof p.label === 'string' ? p.label : ''};
  }
  function save(p) {
    try { localStorage.setItem(KEY, JSON.stringify(p)); return true; }
    catch (_) { toast('No se pudo guardar. Permite el almacenamiento del navegador e intenta de nuevo.'); return false; }
  }
  function status(message) {
    const el = document.getElementById('bt-printer-status');
    if (el) el.textContent = message;
  }
  async function connect() {
    if (!window.qz) {
      if (!loading) loading = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = SCRIPT;
        s.onload = () => window.qz ? resolve() : reject(new Error('Conector no disponible.'));
        s.onerror = () => { s.remove(); reject(new Error('No se pudo cargar el conector.')); };
        document.head.appendChild(s);
      }).catch(error => { loading = null; throw error; });
      await loading;
    }
    if (!qz.websocket.isActive()) {
      if (!connecting) connecting = qz.websocket.connect({retries:0}).finally(() => { connecting = null; });
      await connecting;
    }
  }
  async function names() {
    await connect();
    const result = await qz.printers.find();
    return (Array.isArray(result) ? result : [result]).filter(x => typeof x === 'string' && x);
  }
  function selected() {
    const mode = document.getElementById('bt-printer-mode');
    return mode ? {mode:mode.value,receipt:document.getElementById('bt-receipt-printer').value,label:document.getElementById('bt-label-printer').value} : read();
  }
  function open() {
    const p = read();
    const option = name => '<option value="">Seleccionar impresora</option>' + (name ? '<option selected value="'+esc(name)+'">'+esc(name)+' (guardada, por comprobar)</option>' : '');
    openModal('Impresoras de esta computadora',
      '<div class="callout">Configura una sola vez. Después, cada botón enviará el documento a su impresora. Esta configuración es para quienes usan este navegador en esta computadora.</div>'
      + '<div class="field"><label>Cómo imprimir</label><select id="bt-printer-mode"><option value="browser"'+(p.mode==='browser'?' selected':'')+'>Elegir en la ventana del navegador</option><option value="direct"'+(p.mode==='direct'?' selected':'')+'>Enviar a las impresoras asignadas (QZ Tray)</option></select></div>'
      + '<p>1. Conecta las dos impresoras y comprueba que aparezcan en Windows.<br>2. Instala y abre <a href="https://qz.io/download/" target="_blank" rel="noopener noreferrer">QZ Tray</a>. 3. Pulsa Buscar impresoras, acepta el permiso, elige cada impresora y guarda. Puede solicitar confirmación al imprimir; no requiere contratar un certificado para este modo.</p>'
      + '<button onclick="btBuscarImpresoras()">Buscar impresoras en Windows</button>'
      + '<div class="form-grid" style="margin-top:12px"><div class="field"><label>Impresora de recibos</label><select id="bt-receipt-printer">'+option(p.receipt)+'</select></div>'
      + '<div class="field"><label>Impresora de etiquetas</label><select id="bt-label-printer">'+option(p.label)+'</select></div></div>'
      + '<p id="bt-printer-status" role="status" aria-live="polite">Pendiente de comprobar las impresoras en este equipo.</p>'
      + '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="primary" onclick="btGuardarImpresoras()">Guardar configuración</button>'
      + '<button onclick="btPruebaImpresora(\'recibo\')">Probar recibo</button><button onclick="btPruebaImpresora(\'etiqueta\')">Probar etiqueta</button></div>'
      + '<p>Las pruebas usan datos ficticios y los tamaños elegidos en «Recibo y etiqueta». Confirma el papel y la escala en el controlador de Windows. Si cambias de computadora o borras los datos del navegador, configura de nuevo.</p>');
  }
  window.btBuscarImpresoras = async function () {
    status('Conectando con QZ Tray…');
    const original = document.getElementById('bt-printer-status');
    try {
      const list = await names();
      if (document.getElementById('bt-printer-status') !== original) return;
      ['bt-receipt-printer','bt-label-printer'].forEach(id => {
        const el = document.getElementById(id), previous = el.value;
        el.innerHTML = '<option value="">Seleccionar impresora</option>'+list.map(name => '<option value="'+esc(name)+'">'+esc(name)+'</option>').join('');
        if (list.includes(previous)) el.value = previous;
      });
      status(list.length ? 'Impresoras encontradas. Selecciona el destino de cada documento y guarda.' : 'Windows no devolvió impresoras. Revisa la instalación.');
    } catch (_) { status('No se pudo conectar. Abre QZ Tray, permite la conexión y comprueba que las impresoras estén instaladas en Windows.'); }
  };
  window.btGuardarImpresoras = function () {
    const p = selected();
    if (p.mode === 'direct' && (!p.receipt || !p.label)) return status('Selecciona ambas impresoras antes de activar el envío directo.');
    if (save(p)) status('Configuración guardada para este navegador. Haz una prueba de cada documento.');
  };
  async function send(job, preferences) {
    if (busy) throw new Error('Espera a que termine el envío anterior.');
    busy = true;
    try {
      const printer = job.type === 'etiqueta' ? preferences.label : preferences.receipt;
      if (!printer) throw new Error('Falta asignar la impresora. Abre Configurar impresoras.');
      const list = await names();
      if (!list.includes(printer)) throw new Error('La impresora guardada no está disponible en Windows. Revisa Configurar impresoras.');
      const config = qz.configs.create(printer, {units:'mm',size:{width:job.width,height:job.height},margins:0,scaleContent:false,copies:1,jobName:job.title});
      await qz.print(config, [{type:'pixel',format:'html',flavor:'plain',data:job.html,options:{pageWidth:job.width / 25.4,pageHeight:job.height / 25.4}}]);
    } finally { busy = false; }
  }
  window.btPruebaImpresora = async function (type) {
    const p = selected();
    if (p.mode !== 'direct') return status('Selecciona el modo de envío directo para probar la impresora asignada.');
    status('Enviando prueba…');
    try {
      await send(window.btDocumentoPrueba(type), p);
      status('Prueba enviada a la cola de Windows. Comprueba el papel, tamaño y legibilidad; esto no confirma que haya salido físicamente.');
    } catch (error) { status(error.message + ' No se reintentó ni se imprimió en otra impresora.'); }
  };
  window.BTPrinters = {open, read, send:job => send(job, read())};
})();
