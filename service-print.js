/* Impresiones del centro de servicio. Preferencias locales de papel, sin datos de negocio. */
(function () {
  'use strict';
  const LABELS = {
    '4x6': {w:4,h:6,name:'4 × 6 pulgadas',compact:false},
    '3x2': {w:3,h:2,name:'3 × 2 pulgadas',compact:false},
    '2x3': {w:2,h:3,name:'2 × 3 pulgadas',compact:false},
    '2x1': {w:2,h:1,name:'2 × 1 pulgadas (compacta)',compact:true}
  };
  const KEY = 'bt_servicio_papel_v1';
  const CSS = [
    '.bt-print-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px;margin-top:14px}',
    '.bt-print-column{min-width:0;background:#f3f6f9;border:1px solid #d8e1eb;border-radius:12px;padding:12px}',
    '.bt-print-column h4{font-size:13px;margin:0 0 9px;color:#12304b}',
    '.bt-print-paper{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;box-sizing:border-box;overflow-wrap:anywhere}',
    '.bt-print-ticket{padding:12px;max-width:100%;margin:0 auto;border:1px solid #d4d4d4;font-size:11px;line-height:1.4}',
    '.bt-print-ticket .bt-brand{text-align:center;font-size:17px;font-weight:900;letter-spacing:.04em}',
    '.bt-print-ticket .bt-center{text-align:center}',
    '.bt-print-ticket .bt-rule{border-top:1px dashed #333;margin:10px 0}',
    '.bt-print-ticket .bt-line{margin:5px 0}',
    '.bt-print-ticket .bt-folio{font-size:21px;font-weight:900;text-align:center;margin:9px 0}',
    '.bt-print-ticket .bt-small{font-size:10px}',
    '.bt-print-ticket .bt-bottom{text-align:center;font-weight:bold;margin-top:10px}',
    '.bt-print-tag{padding:14px;border:2px solid #111;overflow:hidden;width:100%;height:100%;display:flex;flex-direction:column;gap:9px}',
    '.bt-print-tag .bt-brand{font-size:12px;font-weight:900;letter-spacing:.02em}',
    '.bt-print-tag .bt-folio{font-size:32px;line-height:1;font-weight:900;border-bottom:2px solid #111;padding-bottom:9px}',
    '.bt-print-tag .bt-tool{font-size:17px;line-height:1.14;font-weight:800}',
    '.bt-print-tag .bt-meta{font-size:12px;line-height:1.25}',
    '.bt-print-tag .bt-reported{font-size:11px;border-top:1px solid #777;padding-top:6px;max-height:4.7em;overflow:hidden}',
    '.bt-print-tag .bt-foot{font-size:10px;margin-top:auto;border-top:1px solid #bbb;padding-top:6px}',
    '.bt-print-tag.bt-compact{padding:5px;gap:2px;border:1px solid #111}',
    '.bt-print-tag.bt-compact .bt-brand{font-size:8px}',
    '.bt-print-tag.bt-compact .bt-folio{font-size:21px;padding:0 0 2px;border-bottom:1px solid #333}',
    '.bt-print-tag.bt-compact .bt-tool{font-size:9px;line-height:1.05}',
    '.bt-print-tag.bt-compact .bt-meta{font-size:8px;line-height:1.05}',
    '.bt-print-tools{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}',
    '.bt-print-note{font-size:11px;color:#546477;line-height:1.4;margin:12px 0}',
    '@media(max-width:640px){.bt-print-grid{grid-template-columns:1fr}}'
  ].join('');
  function safe(value) { return h(value == null ? '' : String(value)); }
  function garantía(x) { return x.garantia === true || x.garantia === 1 || x.garantia === '1'; }
  function preferences() {
    let p={};
    try { p=JSON.parse(localStorage.getItem(KEY)||'{}')||{}; } catch (_) {}
    return {ticket:p.ticket==='58'?'58':'80',label:LABELS[p.label]?p.label:'4x6'};
  }
  function store(ticket,label) {
    const p={ticket:ticket==='58'?'58':'80',label:LABELS[label]?label:'4x6'};
    try { localStorage.setItem(KEY,JSON.stringify(p)); } catch (_) {}
    return p;
  }
  function receipt(x) {
    const fee=garantía(x)?'Sin costo por garantía':moneyC(Number(x.diagnosticoCosto)||0)+' (informativo, no indica pago)';
    return '<div class="bt-print-paper bt-print-ticket">'
      + '<div class="bt-brand">BORDER TOOLS</div>'
      + '<div class="bt-center"><b>CENTRO DE SERVICIO</b><br>COMPROBANTE DE RECEPCIÓN</div>'
      + '<div class="bt-rule"></div><div class="bt-folio">'+safe(x.folio)+'</div>'
      + '<div class="bt-line"><b>Fecha:</b> '+safe(x.entrada||'—')+'</div>'
      + '<div class="bt-line"><b>Sucursal:</b> '+safe(x.sucursal||'—')+'</div>'
      + '<div class="bt-line"><b>Estado:</b> '+safe(x.estado||'Recibida')+'</div>'
      + '<div class="bt-rule"></div>'
      + '<div class="bt-line"><b>Cliente:</b> '+safe(x.cliente||'—')+'</div>'
      + '<div class="bt-line"><b>Teléfono:</b> '+safe(x.tel||'—')+'</div>'
      + '<div class="bt-rule"></div>'
      + '<div class="bt-line"><b>Herramienta:</b> '+safe(x.herramienta||'—')+'</div>'
      + '<div class="bt-line"><b>Modelo:</b> '+safe(x.modelo||'—')+'</div>'
      + '<div class="bt-line"><b>Núm. de serie:</b> '+safe(x.serie||'—')+'</div>'
      + '<div class="bt-line"><b>Falla reportada:</b><div>'+safe(x.falla||'Sin descripción')+'</div></div>'
      + '<div class="bt-line"><b>Garantía:</b> '+(garantía(x)?'Sí':'No')+'</div>'
      + '<div class="bt-line"><b>Diagnóstico:</b> '+fee+'</div>'
      + '<div class="bt-rule"></div>'
      + '<div class="bt-small">Conserva este folio para consultar tu orden. Este documento confirma la recepción de la herramienta, no es factura ni comprobante de pago.</div>'
      + '<div class="bt-bottom">GRACIAS POR TU CONFIANZA</div></div>';
  }
  function label(x,size) {
    const compact=LABELS[size].compact;
    return '<div class="bt-print-paper bt-print-tag'+(compact?' bt-compact':'')+'">'
      + '<div class="bt-brand">BORDER TOOLS · SERVICIO</div>'
      + '<div class="bt-folio">'+safe(x.folio)+'</div>'
      + '<div class="bt-tool">'+safe(x.herramienta||'HERRAMIENTA')+'</div>'
      + '<div class="bt-meta"><b>Modelo:</b> '+safe(x.modelo||'—')+' &nbsp; <b>Serie:</b> '+safe(x.serie||'—')+'</div>'
      + (compact?'':'<div class="bt-meta"><b>Cliente:</b> '+safe(x.cliente||'—')+'<br><b>Tel:</b> '+safe(x.tel||'—')+'</div>')
      + (compact?'':'<div class="bt-meta"><b>Sucursal:</b> '+safe(x.sucursal||'—')+'<br><b>Recibida:</b> '+safe(x.entrada||'—')+'</div>')
      + (compact?'':'<div class="bt-reported"><b>Falla:</b> '+safe(x.falla||'Sin descripción')+'</div>')
      + (compact?'':'<div class="bt-foot">Identificación interna · '+safe(x.estado||'Recibida')+'</div>')
      + '</div>';
  }
  window.servicioActualizarComprobantes = function (i) {
    const x=S.servicio[i];
    if(!x)return;
    const t=document.getElementById('bt-ticket-size'),l=document.getElementById('bt-label-size');
    if(!t||!l)return;
    const p=store(t.value,l.value),format=LABELS[p.label];
    const ticket=document.getElementById('bt-ticket-preview'),tag=document.getElementById('bt-tag-preview');
    ticket.style.width=p.ticket==='58'?'220px':'302px';
    ticket.innerHTML=receipt(x);
    tag.style.width=(format.w/format.h>1?'270px':format.w===2?'190px':'240px');
    tag.style.aspectRatio=format.w+' / '+format.h;
    tag.innerHTML=label(x,p.label);
  };
  window.prepararComprobantesServicio = function (i) {
    const x=S.servicio[i];
    if(!x)return toast('No encontramos esta orden.');
    const p=preferences();
    const options=Object.keys(LABELS).map(k=>'<option value="'+k+'"'+(p.label===k?' selected':'')+'>'+LABELS[k].name+'</option>').join('');
    openModal('Recibo y etiqueta · '+safe(x.folio),
      '<style>'+CSS+'</style>'
      + '<div class="callout">Son <b>dos impresiones separadas</b>: entrega el recibo al cliente y pega la etiqueta en la herramienta. Elige cada impresora en la ventana de impresión.</div>'
      + '<div class="form-grid"><div class="field"><label>Papel de recibo</label><select id="bt-ticket-size" onchange="servicioActualizarComprobantes('+i+')"><option value="80"'+(p.ticket==='80'?' selected':'')+'>80 mm (común)</option><option value="58"'+(p.ticket==='58'?' selected':'')+'>58 mm (angosto)</option></select></div>'
      + '<div class="field"><label>Tamaño de etiqueta</label><select id="bt-label-size" onchange="servicioActualizarComprobantes('+i+')">'+options+'</select></div></div>'
      + '<div class="bt-print-grid">'
      + '<div class="bt-print-column"><h4>🧾 Vista previa · recibo para cliente</h4><div id="bt-ticket-preview" style="max-width:100%;margin:auto"></div>'
      + '<div class="bt-print-tools"><button class="primary" onclick="imprimirComprobanteServicio('+i+',\'recibo\')">Imprimir recibo</button></div></div>'
      + '<div class="bt-print-column"><h4>🏷️ Vista previa · etiqueta para herramienta</h4><div id="bt-tag-preview" style="max-width:100%;margin:auto"></div>'
      + '<div class="bt-print-tools"><button class="primary" onclick="imprimirComprobanteServicio('+i+',\'etiqueta\')">Imprimir etiqueta</button></div></div></div>'
      + '<div class="bt-print-note">Las medidas se guardan solo en este navegador. La impresión depende del papel real y la configuración del controlador. Revisa la primera impresión antes de usarla con clientes.</div>');
    window.servicioActualizarComprobantes(i);
  };
  window.imprimirComprobanteServicio = function (i,tipo) {
    const x=S.servicio[i];
    if(!x)return toast('No encontramos esta orden.');
    const t=document.getElementById('bt-ticket-size'),l=document.getElementById('bt-label-size');
    const p=store(t?t.value:preferences().ticket,l?l.value:preferences().label);
    const f=LABELS[p.label],isTag=tipo==='etiqueta';
    const sheet=isTag?label(x,p.label):receipt(x);
    const page=isTag?'@page{size:'+f.w+'in '+f.h+'in;margin:0}':'@page{margin:0}';
    const body=isTag?'body{margin:0;padding:0}.bt-print-tag{width:'+f.w+'in;height:'+f.h+'in;border:0;padding:'+ (f.compact?'4px':'10px') +'}':
      'body{margin:0;padding:0}.bt-print-ticket{width:'+p.ticket+'mm;border:0;padding:3mm;max-width:none}';
    const w=window.open('','_blank','width=600,height=820');
    if(!w)return toast('Permite ventanas emergentes para imprimir.');
    w.onload=function(){w.focus();w.setTimeout(function(){w.print();},200);};
    w.document.open();
    w.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
      +'<title>'+safe(x.folio)+' · '+(isTag?'Etiqueta':'Recibo')+'</title>'
      +'<style>'+CSS+page+body+'</style></head><body>'+sheet+'</body></html>');
    w.document.close();
  };
})();
