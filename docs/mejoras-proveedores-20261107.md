# Proveedores, tarjetas y datos compartidos

Implementación para la versión conectada PHP/MySQL. Las capturas muestran DEMO en Vercel: su estado se guarda en localStorage. El servidor conectado ya usa una base central y sondeo; no se debe prometer que las computadoras de Alex y Pamela comparten datos hasta publicar esa versión y verificar sus cuentas reales.

Permisos: Finanzas tiene ventas, crédito, proveedores y ambas sucursales si su cuenta las tiene asignadas. Ventas Granjero se limita a su sucursal; no puede registrar egresos. Las diferencias de menú son intencionales y no justifican que Finanzas pierda un corte autorizado. Se agregaron pruebas de lectura idéntica del corte entre perfiles, restricciones de sucursal y denegaciones específicas. Las asignaciones reales de Pamela/Alex aún requieren inspección en el servidor. No se modificaron cuentas ni se ampliaron los permisos de Ventas.

En Proveedores aparece «Registrar factura pendiente»: puede vincularse a una compra existente o crear un registro de mercancía recibida/en tránsito. Se separan recepción, deuda con proveedor, pago al proveedor y deuda con tarjeta. No se infiere deuda a partir de compras históricas. No recapturar Austromex sin conciliar su registro antiguo, que podría estar marcado como pagado.

Los pagos admiten abonos y conservan el vínculo con la factura. El servidor impide exceder el saldo, repetir la factura por proveedor/sucursal y guardar pagos con fecha anterior. Al pagar con tarjeta de crédito el proveedor queda pagado, pero no sale efectivo. Liquidar la tarjeta registra la salida real, con pagos parciales en distintos meses. Se conserva el motor financiero original, probado por paridad. La pantalla de captura distingue crédito de débito y propone crédito al elegir tarjeta. No se permite liquidar una tarjeta mediante otra tarjeta como si fuera efectivo.

Los pagos vinculados no se editan libremente: utilizan el flujo de anulación existente. Al anular un pago al proveedor, se recupera su saldo; un cargo de tarjeta con liquidaciones no se puede anular. La caja física solo se afecta con Efectivo y selección de caja.

## Instalación futura

Para bases nuevas, usar 001_initial.sql actualizado. Para una base existente anterior a esta mejora, aplicar 002_supplier_invoices.sql una sola vez, antes de activar el código y tras revisar el esquema. No ejecutar 002 sobre una instalación nueva que ya tiene las columnas. Nunca borrar datos ni reinstalar el esquema para actualizar.

El empaquetador incluye supplier-finance.js y conserva index.html original. Esta rama parte de migration/php-mysql; no modifica el PR de impresoras. No se desplegó en cPanel, no se importaron datos locales y no se ejecutaron migraciones en el alojamiento.
