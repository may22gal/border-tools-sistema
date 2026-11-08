/* Ayuda y preguntas frecuentes. Shared by the PHP/MySQL app and the Vercel demo.
   Each topic names the screen it belongs to; a user only sees topics for screens their role can open. */
(function(){
'use strict';
const connected=()=>!!(window.BT&&'csrf' in window.BT);
// page: null = everyone. tags: extra words people might type when searching.
const TOPICS=[
 {page:null,cat:'Primeros pasos',q:'¿Cómo entro al sistema?',a:'Escribe tu usuario y contraseña y presiona «Entrar». Cada usuario ve solo las secciones de su puesto. Si te falta una sección que necesitas, pídesela a Dirección.',tags:'login entrar usuario contraseña acceso sesión'},
 {page:null,cat:'Primeros pasos',q:'No veo una sección que antes veía',a:'Dirección puede encender o apagar secciones, y cada puesto tiene sus propias secciones. Si crees que te falta una, avísale a Dirección.',tags:'permisos menú falta oculto apagado módulo'},
 {page:null,cat:'Primeros pasos',q:'¿Por qué no veo lo que capturó otra persona?',a:()=>connected()?'Todos guardan en la misma base de datos. Si no lo ves, revisa las fechas del período, la sucursal seleccionada arriba y que tu puesto tenga permiso para esa sección. La pantalla se actualiza sola cada pocos segundos.':'En esta versión cada computadora guarda sus propios datos, así que lo capturado en otra computadora no aparece aquí. Esto se resuelve al instalar el sistema en el servidor de la empresa, donde todos comparten la misma información.',tags:'sincronizar compartir otra computadora no aparece corte alex pamela datos'},
 {page:null,cat:'Primeros pasos',q:'¿Cómo cambio las fechas que estoy viendo?',a:'Arriba de los reportes hay botones de Semana, Mes y Rango. Elige uno y usa las flechas para moverte de período. Todo lo que ves se recalcula con esas fechas.',tags:'periodo semana mes rango fecha filtro'},
 {page:null,cat:'Primeros pasos',q:'¿Cómo cambio a tema oscuro o hago las tablas más compactas?',a:'Usa los botones de arriba a la derecha: la luna cambia entre claro y oscuro, y las tres líneas cambian el tamaño de las tablas.',tags:'oscuro claro tema tamaño letra compacto'},
 {page:null,cat:'Primeros pasos',q:'¿Cómo respaldo lo que hay en esta computadora?',a:()=>connected()?'Los datos se guardan en el servidor, no en tu computadora. Los respaldos los hace el administrador del sistema.':'Abre la página de rescate (tu dirección del sistema con /rescate al final) y descarga el archivo. Ahí queda todo lo capturado en este navegador, incluso los PDF de SICAR.',tags:'respaldo rescate exportar guardar copia perder datos'},
 {page:'ventas',cat:'Ventas y cortes',q:'¿Cómo registro el corte del día?',a:'Ventas · cortes SICAR → «+ Registrar corte diario». Puedes subir el PDF de SICAR, pegar los totales o escribirlos a mano. Cada sucursal captura una sola vez el corte de cada día.',tags:'corte diario sicar pdf venta cierre capturar'},
 {page:'ventas',cat:'Ventas y cortes',q:'Me equivoqué en un corte, ¿cómo lo corrijo?',a:'Busca el corte en la lista y usa «Corregir». Si ya tiene movimientos relacionados, el sistema te pedirá solicitar la corrección a Dirección.',tags:'error corregir editar corte equivocado'},
 {page:'mano_obra',cat:'Ventas y cortes',q:'¿Qué es la mano de obra?',a:'Es la parte de la venta de SICAR que corresponde a reparaciones. Ya viene incluida en el total del corte; aquí solo se ve por separado.',tags:'mano obra reparación servicio'},
 {page:'credito',cat:'Crédito y cobranza',q:'¿Cómo registro un abono de un cliente?',a:'Crédito / Cobranza → busca el crédito → «Registrar abono». Escribe el importe y cómo pagó. Cada abono se registra una sola vez y reduce el saldo.',tags:'abono pago cliente cobrar crédito saldo'},
 {page:'credito',cat:'Crédito y cobranza',q:'¿Una venta a crédito cuenta como dinero cobrado?',a:'No. Cuenta como venta, pero el dinero entra hasta que el cliente abona.',tags:'crédito venta cobrado dinero'},
 {page:'proveedores',cat:'Proveedores y tarjeta',q:'Recibí mercancía pero todavía no la pago',a:'Pago a proveedores → «+ Registrar factura pendiente». Queda como deuda con el proveedor y no cuenta como dinero que salió. No uses «Registrar pago» hasta que realmente pagues.',tags:'mercancía recibida factura pendiente deuda proveedor austromex crédito'},
 {page:'proveedores',cat:'Proveedores y tarjeta',q:'Pagué una factura del proveedor con tarjeta de crédito',a:'En la factura pendiente usa «Registrar pago», elige Tarjeta y «Tarjeta de crédito: la pagaré después». El proveedor queda pagado y la deuda pasa a la tarjeta. El dinero cuenta como salida hasta que pagues la tarjeta.',tags:'tarjeta crédito proveedor pagar factura'},
 {page:'proveedores',cat:'Proveedores y tarjeta',q:'¿Puedo pagar una factura en partes?',a:'Sí. En «Registrar pago» escribe solo lo que pagaste. El saldo pendiente se actualiza y puedes registrar otro pago después.',tags:'abono parcial partes pago proveedor'},
 {page:'gastos',cat:'Proveedores y tarjeta',q:'Compré gasolina, papelería o algo local con tarjeta de crédito',a:'Gastos generales → «Registrar gasto». En forma de pago elige Tarjeta y «Tarjeta de crédito: la pagaré después». Se registra la compra, pero el dinero sale hasta que pagues la tarjeta.',tags:'gasolina papelería consumibles compra local tarjeta crédito gasto'},
 {page:'gastos',cat:'Proveedores y tarjeta',q:'Ya pagué la tarjeta de crédito, ¿dónde lo registro?',a:'Gastos generales o Finanzas → «💳 Liquidar cargos de tarjeta». Elige el cargo, escribe la fecha y el importe que pagaste. Puedes pagar en partes. No registres el pago de la tarjeta como un gasto nuevo, porque se contaría dos veces.',tags:'liquidar pagar tarjeta estado de cuenta banco'},
 {page:'gastos',cat:'Proveedores y tarjeta',q:'Me equivoqué en un gasto',a:'Usa «Corregir a…» en el movimiento. Si ya tiene pagos relacionados, solicita la anulación y Dirección la autoriza.',tags:'error corregir anular gasto equivocado'},
 {page:'finanzas',cat:'Reportes',q:'¿Qué diferencia hay entre «Compras del mes» y «Salidas de dinero»?',a:'«Compras del mes» es todo lo que se compró o gastó en esas fechas, aunque se haya pagado con tarjeta o siga pendiente. «Salidas de dinero» es lo que realmente salió del banco o caja. Ejemplo: compra de $10,000 en octubre con tarjeta cuenta como compra en octubre y como salida en noviembre, cuando pagas la tarjeta.',tags:'compras salidas dinero reporte mensual tarjeta doble'},
 {page:'finanzas',cat:'Reportes',q:'¿El flujo neto es la utilidad?',a:'No. Es dinero que entró menos dinero que salió en el período. La utilidad necesita costos de mercancía e inventario.',tags:'flujo utilidad ganancia'},
 {page:'reportes',cat:'Reportes',q:'¿Dónde veo cuánto debemos a la tarjeta y a proveedores?',a:'Reportes → «Compras vs. salidas de dinero». Muestra lo que se debía al cierre del período elegido.',tags:'deuda tarjeta proveedores saldo debemos'},
 {page:'caja',cat:'Caja',q:'¿Cómo hago el corte de caja?',a:'Caja / Corte → «+ Hacer corte». Cuenta el efectivo físico y escríbelo. Tarjeta y transferencias no entran a la caja.',tags:'caja corte efectivo contar diferencia'},
 {page:'nomina',cat:'Nómina y comisiones',q:'¿Cómo registro un pago de nómina?',a:'Primero da de alta al empleado con «+ Dar de alta empleado». Después, en su renglón, usa «+ Registrar pago» con la fecha real y la forma de pago.',tags:'nómina sueldo pago empleado'},
 {page:'comisiones',cat:'Nómina y comisiones',q:'¿Cómo registro una comisión?',a:'Comisiones → «+ Registrar comisión». Elige al empleado y marca el pago cuando realmente se entregue.',tags:'comisión vendedor pago'},
 {page:'servicio',cat:'Centro de Diagnóstico',q:'¿Cómo recibo una herramienta para reparación?',a:'Centro de Diagnóstico → «+ Recibir herramienta». Captura cliente, teléfono, herramienta y falla. Después avanza la orden: recibida, en reparación, lista y entregada.',tags:'recibir herramienta reparación orden makita'},
 {page:'servicio',cat:'Centro de Diagnóstico',q:'¿Cómo imprimo la etiqueta o el recibo?',a:'En la orden usa «🏷 Etiqueta». La primera vez, en cada computadora elige la impresora de etiquetas y la de recibos, y haz una impresión de prueba. Después cada botón imprime en su impresora.',tags:'imprimir etiqueta recibo impresora térmica ticket'},
 {page:'servicio',cat:'Centro de Diagnóstico',q:'¿El cobro del diagnóstico se registra aquí?',a:'El cobro se hace en SICAR. Aquí solo se relaciona con la orden con «Cobrar diagnóstico», para no contarlo dos veces.',tags:'diagnóstico cobro sicar'},
 {page:'inventario',cat:'Inventario',q:'¿Cómo registro una entrada o salida de inventario?',a:'Inventario → «+ Movimiento». Elige Entrada o Salida, el producto y la cantidad. Con «+ Mínimo» el sistema te avisa cuando quede poco.',tags:'inventario entrada salida stock mínimo existencia'},
 {page:'clientes',cat:'Clientes',q:'¿Cómo doy de alta un cliente con crédito?',a:'Clientes B2B → «+ Cliente». Escribe su límite de crédito. Sus ventas a crédito y abonos aparecen en Crédito / Cobranza.',tags:'cliente alta b2b crédito límite'},
 {page:'facturacion',cat:'Facturación',q:'¿Cómo registro una factura emitida?',a:'Facturación → «+ Nueva factura». Captura folio, cliente, total y si está pendiente o pagada.',tags:'factura emitida cliente rfc'},
 {page:'excel',cat:'Excel',q:'¿Cómo saco la información a Excel?',a:'Excel / Importar, o los botones «Exportar» de cada sección. Se descarga un archivo que puedes abrir en Excel.',tags:'excel exportar descargar archivo'},
 {page:'permisos',cat:'Dirección',q:'¿Cómo apago o enciendo una sección para los demás?',a:'Control del sistema → enciende o apaga cada módulo. Tú lo sigues viendo; los demás no.',tags:'apagar encender módulo permisos control'},
];
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const answer=t=>typeof t.a==='function'?t.a():t.a;
const visible=()=>TOPICS.filter(t=>!t.page||(typeof canSee==='function'&&canSee(t.page)));
function list(query){
 const words=norm(query).split(/\s+/).filter(Boolean);
 const rows=visible().filter(t=>{const hay=norm(t.cat+' '+t.q+' '+answer(t)+' '+t.tags);return words.every(w=>hay.includes(w));});
 if(!rows.length)return '<p class="muted">No encontré nada con esas palabras. Prueba con otra palabra, por ejemplo «tarjeta», «corte» o «abono».</p>';
 let html='',cat='';
 for(const t of rows){if(t.cat!==cat){cat=t.cat;html+=`<h3 style="margin:14px 0 6px">${h(cat)}</h3>`;}
  html+=`<details class="card" style="margin:6px 0;padding:10px 12px"${words.length?' open':''}><summary style="cursor:pointer;font-weight:700">${h(t.q)}</summary><p style="margin:8px 0 0">${h(answer(t))}</p></details>`;}
 return html;
}
window.filtrarAyuda=function(){const el=document.getElementById('ayuda_lista');if(el)el.innerHTML=list(val('ayuda_buscar'));};
window.abrirAyuda=function(){
 openModal('Ayuda y preguntas frecuentes',`<div class="field full"><label for="ayuda_buscar">Busca con tus palabras</label><input id="ayuda_buscar" type="search" placeholder="Ej. tarjeta, corte, abono, imprimir" oninput="filtrarAyuda()" autocomplete="off"></div><div id="ayuda_lista">${list('')}</div><p class="small muted" style="margin-top:12px">Solo aparecen los temas de las secciones que tu usuario puede abrir. ¿No encuentras algo? Pregúntale a Dirección.</p>`);
 setTimeout(()=>{const i=document.getElementById('ayuda_buscar');if(i)i.focus();},50);
};
window.ayudaTemasVisibles=()=>visible().map(t=>t.q);
function mount(){
 const user=document.querySelector('.topbar .userbox');
 if(user&&!document.getElementById('helpBtn'))user.insertAdjacentHTML('afterbegin','<button class="pref-btn" id="helpBtn" onclick="abrirAyuda()" title="Ayuda y preguntas frecuentes" aria-label="Ayuda">❓</button>');
 const nav=document.getElementById('nav');
 if(nav&&!document.getElementById('helpNav'))nav.insertAdjacentHTML('beforeend','<div class="help-group"><div class="section">Ayuda</div><button id="helpNav" onclick="abrirAyuda()"><span class="ico">❓</span> Ayuda y preguntas</button></div>');
}
mount();
})();
