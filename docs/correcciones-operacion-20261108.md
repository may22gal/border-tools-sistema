# Correcciones de operación y caso de tarjeta solicitado por Dirección

## Caso solicitado

La mercancía o consumible se registra en la fecha de compra. Si se paga con tarjeta de crédito, no representa todavía una salida del banco/caja. El proveedor sí queda pagado. La salida se registra en la fecha real de cada liquidación de tarjeta, incluso en otro mes. No se suma de nuevo como compra.

Ejemplo verificado: factura recibida de $10,000 en octubre, pagada al proveedor con tarjeta el 29 de octubre; liquidación de $4,000 el 20 de noviembre y $6,000 el 3 de diciembre.

| Período | Compra | Salida de dinero | Deuda de tarjeta al cierre |
|---|---:|---:|---:|
| Octubre | $10,000 | $0 | $10,000 |
| Noviembre | $0 | $4,000 | $6,000 |
| Diciembre | $0 | $6,000 | $0 |

También se verifica una compra directa de consumibles de $300 con tarjeta, liquidada con $100 y $200 en meses posteriores. Esto se refiere al flujo de dinero, no a cambiar el tratamiento fiscal de un gasto.

## Cambios

- Rechazar una transferencia de abono restituye la cuenta por cobrar. Repetir el rechazo no duplica la deuda; aprobarla otra vez o corregir su forma de pago la aplica una vez. Si otro pago ya liquidó la cuenta, se bloquea la reaplicación para evitar un saldo negativo.
- Clientes B2B muestra el saldo de sus créditos relacionados por ID o por nombre exacto y sucursal. Se actualiza al crear crédito, asignarlo desde un corte, cobrarlo o rechazar su transferencia. Los perfiles que pueden ver Clientes pero no Crédito conservan el saldo correcto proporcionado por el servidor.
- Un nuevo crédito que supera el límite requiere confirmación explícita. En PHP la autorización queda en la bitácora. No se oculta una venta ya realizada por falta de límite: el responsable debe reconocer la excepción al registrar su deuda.
- Un saldo antiguo sin cuentas relacionadas no se descarta: bloquea agregar nuevo crédito hasta conciliarlo. Los nombres duplicados en una sucursal requieren revisión.
- Las salidas de inventario superiores a la existencia se rechazan sin guardar el movimiento ni modificar stock. Se requiere SKU y existencia registrada en la sucursal, también para las entradas.
- La ayuda detecta correctamente la versión conectada al servidor.
- La ayuda explica la diferencia entre impresión con QZ Tray y el diálogo del navegador.
- Las correcciones están compartidas entre la demo y la interfaz PHP; el servidor valida independientemente dinero, permisos, límites y existencias.

## Qué se conserva

El HTML original, la ayuda de Claude y el rescate permanecen. Vercel sigue siendo una prueba local por navegador y PHP/MySQL el destino portable para Sivendex u otro hosting compatible. No se cambian datos reales ni se ejecutan migraciones al publicar la demo. No hay cambios de esquema en esta corrección.

## Pruebas

Regresiones de demo con cuentas y pagos ficticios; transacciones MySQL para rechazo/aprobación, límites, saldo B2B, permisos y rollback de inventario; flujo de factura a tarjeta y pago en noviembre/diciembre; gastos directos con tarjeta; interfaz de escritorio y móvil; compilación de demo y paquete cPanel.

## Revisión antes de uso real

Los registros antiguos ya inconsistentes necesitan conciliación: no se recalculan indiscriminadamente todos los créditos porque podrían existir saldos iniciales sin todo su historial. La corrección protege las nuevas operaciones; conservar respaldos y comparar saldos antes de importar las capturas del demo. Las impresoras físicas, instalación de QZ y caja siguen pendientes de validación con los modelos reales. No se añadió una nueva administración de usuarios ni integración fiscal/ML en este cambio.
