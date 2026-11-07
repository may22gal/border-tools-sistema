# Impresión de recibo y etiqueta, Centro de Servicio

Se reemplaza el botón antiguo **Etiqueta** por **Recibo y etiqueta**, sin alterar la estructura de órdenes ni los registros guardados. Disponible tanto en la tarjeta de una orden activa como en su vista **Detalle** (incluye cerradas).

## Flujo operativo

1. Abrir Centro de Servicio y registrar la herramienta. La orden se guarda primero.
2. Pulsar **Recibo y etiqueta** para ver los dos documentos lado a lado.
3. Elegir el ancho del papel del recibo, **3 pulgadas exactas (76.2 mm), 80 o 58 mm**, y el formato de etiqueta: **4 × 6, 3 × 2, 2 × 3 o 2 × 1 pulgadas**.
4. Abrir **Configurar impresoras de este equipo**. Elegir impresión por navegador o envío a impresoras asignadas mediante QZ Tray. En modo navegador cada botón abre el diálogo para escoger destino; en modo directo se utiliza la asignación local de recibos o etiquetas.
5. Se conservan las últimas medidas elegidas en la preferencia local `bt_servicio_papel_v1`; no se guardan datos financieros ni de clientes en esa preferencia.

El recibo contiene: folio, fecha de recepción, sucursal, cliente, teléfono, herramienta, modelo, serie, falla, garantía y costo de diagnóstico como **información, no comprobante de pago**. Es comprobante de recepción, no factura ni ticket fiscal.

La etiqueta tiene el folio visible, identificación de herramienta, modelo y serie. En tamaños no compactos también incluye cliente, teléfono, sucursal, fecha y falla reportada. La etiqueta 2 × 1 es compacta y contiene solo identificación básica.

## Restricciones y pruebas antes de uso real

- Confirmar modelos exactos de ambas impresoras y medidas reales del rollo, márgenes, orientación y controladores en la computadora de la sucursal.
- El modo navegador usa el diálogo de impresión. El modo directo requiere QZ Tray abierto y los controladores de Windows; la integración no implica impresión silenciosa sin confirmaciones.
- La vista previa es orientativa. Verificar con impresión física y configurar la escala al 100 % y márgenes adecuados en el diálogo.
- `service-print.js` usa los datos existentes de `S.servicio`, escapa HTML con el ayudante `h` y **no modifica, envía, borra ni importa datos**.
- No se publica automáticamente en cPanel. `main` y la migración `migration/php-mysql` están separados.

## Integración a la futura versión PHP/MySQL

Esta rama contiene cambios a `index.html` y los archivos `service-print.js`, `printer-settings.js` y `vendor/`. La rama de migración **conserva intencionalmente el HTML original por hash**, por lo que **NO** hay que fusionar a ciegas ni editar el hash para saltarse validaciones.

Cuando Work integre la mejora:
1. Revisar/actualizar explícitamente la referencia de interfaz y las pruebas de integridad en `migration/php-mysql`, después de integrar los cambios aprobados.
2. Incluir el JS de impresión en el empaquetado de cPanel y cargarlo después de la lógica de la interfaz y del adaptador de API.
3. Verificar la acción en órdenes guardadas y recuperadas por PHP/MySQL, en escritorio y dispositivos físicos.
4. Mantener la impresión separada de la transacción de guardado: no imprimir una orden que todavía no confirmó el servidor.

Los formatos de papel son provisionales hasta conocer las impresoras y rollos del establecimiento.


## Configuración por los vendedores en Windows

1. Instalar ambas impresoras y sus controladores oficiales. Para imprimir HTML mediante QZ hace falta un controlador que acepte impresión gráfica, no solamente un controlador de texto genérico.
2. Descargar QZ Tray desde https://qz.io/download/ e instalarlo en cada computadora. Esta rama no instala software ni compra certificados. El software gratuito puede pedir confirmación en la conexión y en los trabajos. No se implementaron firmas ni se incluyeron claves privadas; no se promete impresión totalmente silenciosa.
3. En una orden guardada, abrir **Recibo y etiqueta**, seleccionar el papel real y después **Configurar impresoras de este equipo**.
4. Pulsar **Buscar impresoras en Windows**, permitir la conexión de este sitio en QZ y seleccionar las dos colas por su nombre. Activar **Enviar a las impresoras asignadas** y guardar.
5. Pulsar **Probar recibo** y **Probar etiqueta**. Las pruebas tienen datos ficticios y no crean órdenes. Los tamaños son los seleccionados anteriormente; si no hay preferencias, se usan 3 pulgadas y 2 × 1 pulgadas. Una selección previa de 58/80 mm u otro tamaño se conserva.
6. Volver a abrir **Recibo y etiqueta** desde la orden y usar cada botón. No hace falta que Mayra haga la asignación, puede hacerlo el vendedor en esa computadora. Si instalar controladores requiere permisos de administrador de Windows, deberá ayudar quien los tenga.

Las asignaciones se guardan en `bt_impresoras_v1` en el navegador. Son compartidas por los usuarios del mismo perfil de navegador; no son globales por vendedor ni se sincronizan entre sucursales. No contienen clientes ni datos financieros. Se conserva `bt_servicio_papel_v1` para el papel. El modo directo se activa expresamente; por defecto se usa el navegador.

Si se renombra, elimina o desconecta una cola, se informa el problema. Nunca se cambia automáticamente a otra impresora ni se reintenta un envío fallido, para evitar duplicados. Un envío correcto significa aceptación por el servicio de impresión, no salida física comprobada. Ante un error, comprobar la cola de Windows antes de volver a enviar. Para usar el navegador como alternativa, cambiar el modo y guardar.

Los recibos usan altura calculada según el contenido; las etiquetas usan su ancho y alto exactos. El controlador de la impresora debe soportar el papel elegido. Tres pulgadas son 76.2 mm, no 80 mm: confirmar el ancho del rollo el lunes. No se envían comandos específicos de corte, cajón, ZPL o TSPL sin conocer el modelo.

## Dependencia y comprobación

El conector QZ JavaScript 2.3.0 se incluye localmente, sin CDN, en `vendor/qz-tray-2.3.0.js` (paquete npm `qz-tray@2.3.0`, sin modificaciones, LGPL-2.1-only; licencia en `vendor/QZ-LICENSE.txt`, fuente https://github.com/qzind/tray). Se carga únicamente al buscar impresoras o enviar en modo directo. No se alteran las medidas de confianza ni los avisos de QZ.

Ejecutar `npm ci`, `npx playwright install chromium` y `npm run test:print`. El flujo `Service printing` comprueba dimensiones, asignación independiente, persistencia, compatibilidad con preferencias anteriores, caracteres HTML y errores sin reintentos usando QZ simulado. **No sustituye la prueba física de Windows/QZ/impresoras**, pendiente de recibir modelos y conexión el lunes.

Esta actualización queda en el PR #6. No está fusionada en main ni integrada a la migración PHP/MySQL ni desplegada en cPanel. Al empaquetar la migración deben incluirse ambos scripts y `vendor/`, en el orden de carga de esta rama.
