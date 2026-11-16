# Confiabilidad de captura (16 nov 2026)

Prioridades 1 a 4 de la revisión del 16 de noviembre. No cambia servicios a crédito, cortes ni permisos de puestos sin confirmar.

## 1. No perder movimientos cuando falla internet

Antes: si un envío quedaba en duda y se capturaba otro movimiento distinto del mismo tipo, se reutilizaba la clave del primero. El servidor rechazaba el segundo y la pantalla decía «ya estaba guardado». El segundo se perdía.

Ahora, antes de enviar otra captura del mismo tipo, el sistema pregunta al servidor por el envío anterior:

| Resultado del envío anterior | Qué hace |
|---|---|
| No llegó al servidor | Envía la captura actual con la misma clave: se guarda una sola vez. |
| Sí quedó guardado | Avisa cuál fue (concepto e importe) y pregunta si la captura actual es otro movimiento. Aceptar = se guarda con su propia clave. Cancelar = no se guarda nada más. |
| No se puede comprobar (sin internet) | No envía nada y deja la captura abierta. |
| La misma captura enviada otra vez | Usa la misma clave: el servidor no la duplica. |

## 4. La actualización automática ya no borra lo que se escribe

La pantalla se sigue consultando cada 5 segundos, pero solo se vuelve a dibujar cuando los datos cambiaron, y nunca mientras alguien usa un campo de la pantalla (fecha, selector, texto). Los datos nuevos aparecen poco después de salir del campo. Las ventanas de captura ya estaban protegidas.

## Verificación

- Navegador Chromium con servidor simulado: los cuatro casos de la tabla, más los campos de fecha de Reportes con y sin datos nuevos.
- Nueva prueba en `backend/tests/browser/connected.spec.mjs`: un gasto distinto después de uno guardado en duda también se guarda (se ejecuta con PHP y MySQL en GitHub Actions).

## 2. Transferencias: las confirma quien maneja la caja

Decisión de operación (16 nov): el dueño no entra a autorizar. Quien maneja la caja (hoy los puestos Finanzas y Dirección) puede capturar una transferencia como confirmada o confirmarla después. Los demás la capturan como «Pendiente»; el servidor lo obliga aunque alguien intente enviar «Confirmada».

- Reemplazar un corte sin cambiar el monto de la transferencia conserva su estado. Si cambia el monto, vuelve a «Pendiente».
- La opción «Confirmar transferencias» de Control del sistema sigue igual: decide si las pendientes cuentan como cobradas.

## 3. Anular movimientos con motivo, sin esperar autorización

Quien maneja la caja anula directamente, con motivo obligatorio: gastos (incluye pagos a proveedor y nómina), abonos, facturas de proveedor y movimientos manuales de caja.

| Movimiento | Qué pasa al anular |
|---|---|
| Abono | El saldo del crédito o cliente vuelve a quedar pendiente, una sola vez. Si era una transferencia ya rechazada, no se suma otra vez. |
| Factura de proveedor | Deja de contar como deuda. Si tiene pagos, primero se anulan los pagos (misma regla que los cargos de tarjeta). Su folio se puede volver a registrar. |
| Movimiento de caja | Deja de contar en la caja. Si ese día ya tiene corte de caja, se avisa y el corte no se recalcula. |
| Gasto | Igual que antes (se conserva como anulado, nómina y comisiones se revierten), pero sin pasar por Dirección. |

Para corregir: anular y volver a capturar. Las solicitudes de anulación que ya existieran siguen pudiéndose resolver como antes.

**Dirección ve todo:** en Control del sistema, la sección «Anulaciones y confirmaciones» lista cada anulación y cada confirmación de transferencia con fecha, hora, usuario, importe, sucursal y motivo. Es solo consulta.

**Base de datos:** las instalaciones nuevas ya traen las columnas. Una base que ya exista necesita `backend/migrations/003_anulaciones.sql` una vez, antes de activar esta versión (solo agrega columnas, no cambia datos).

## Verificación local (PHP 8.3 + MariaDB 10.11)

- `php backend/tests/integration.php`: 123 comprobaciones, 26 nuevas (transferencias, anulaciones, saldos, sección de Dirección, permisos).
- `npx playwright test`: 90 de 90 pruebas de pantalla en escritorio y celular, incluidas 2 nuevas.
- `php backend/tests/finance.php`: 12,982 comprobaciones de cálculos sin cambios.
