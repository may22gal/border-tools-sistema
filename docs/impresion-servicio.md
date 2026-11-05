# Impresión de recibo y etiqueta, Centro de Servicio

Se reemplaza el botón antiguo **Etiqueta** por **Recibo y etiqueta**, sin alterar la estructura de órdenes ni los registros guardados. Disponible tanto en la tarjeta de una orden activa como en su vista **Detalle** (incluye cerradas).

## Flujo operativo

1. Abrir Centro de Servicio y registrar la herramienta. La orden se guarda primero.
2. Pulsar **Recibo y etiqueta** para ver los dos documentos lado a lado.
3. Elegir el ancho del papel del recibo, **80 o 58 mm**, y el formato de etiqueta: **4 × 6, 3 × 2, 2 × 3 o 2 × 1 pulgadas**.
4. **Imprimir recibo** y escoger la impresora de recibos; **Imprimir etiqueta** y escoger la impresora de etiquetas. Cada botón abre su propia ventana y diálogo de impresión, no envía directamente a hardware.
5. Se conservan las últimas medidas elegidas en la preferencia local `bt_servicio_papel_v1`; no se guardan datos financieros ni de clientes en esa preferencia.

El recibo contiene: folio, fecha de recepción, sucursal, cliente, teléfono, herramienta, modelo, serie, falla, garantía y costo de diagnóstico como **información, no comprobante de pago**. Es comprobante de recepción, no factura ni ticket fiscal.

La etiqueta tiene el folio visible, identificación de herramienta, modelo y serie. En tamaños no compactos también incluye cliente, teléfono, sucursal, fecha y falla reportada. La etiqueta 2 × 1 es compacta y contiene solo identificación básica.

## Restricciones y pruebas antes de uso real

- Confirmar modelos exactos de ambas impresoras y medidas reales del rollo, márgenes, orientación y controladores en la computadora de la sucursal.
- El navegador no puede elegir silenciosamente dos impresoras distintas sin una solución local específica; el usuario seleccionará el destino en los diálogos.
- La vista previa es orientativa. Verificar con impresión física y configurar la escala al 100 % y márgenes adecuados en el diálogo.
- `service-print.js` usa los datos existentes de `S.servicio`, escapa HTML con el ayudante `h` y **no modifica, envía, borra ni importa datos**.
- No se publica automáticamente en cPanel. `main` y la migración `migration/php-mysql` están separados.

## Integración a la futura versión PHP/MySQL

Esta rama contiene cambios a `index.html` y un archivo `service-print.js`. La rama de migración **conserva intencionalmente el HTML original por hash**, por lo que **NO** hay que fusionar a ciegas ni editar el hash para saltarse validaciones.

Cuando Work integre la mejora:
1. Revisar/actualizar explícitamente la referencia de interfaz y las pruebas de integridad en `migration/php-mysql`, después de integrar los cambios aprobados.
2. Incluir el JS de impresión en el empaquetado de cPanel y cargarlo después de la lógica de la interfaz y del adaptador de API.
3. Verificar la acción en órdenes guardadas y recuperadas por PHP/MySQL, en escritorio y dispositivos físicos.
4. Mantener la impresión separada de la transacción de guardado: no imprimir una orden que todavía no confirmó el servidor.

Los formatos de papel son provisionales hasta conocer las impresoras y rollos del establecimiento.
