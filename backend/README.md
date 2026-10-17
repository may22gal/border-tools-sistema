# Base PHP/MySQL del sistema existente

Estado: backend para desarrollo e integración. **No instalado, no autorizado para producción.**
La interfaz original de `index.html` permanece intacta. `public/app.php` la conecta a la API mediante `assets/connected.js`, sin sustituir sus pantallas.
No hay contraseñas reales, cuentas personales ni datos operativos en esta carpeta.

## Estructura
- `migrations/001_initial.sql`: esquema MySQL 8, InnoDB, claves e índices.
- `src`: PDO, sesiones, permisos, repositorio, motor financiero y comandos de negocio.
- `public/index.php`: API JSON con sesión, CSRF e idempotencia.
- `public/evidence.php`: subida PDF y descarga privada autorizada.
- `bin`: instalación inicial en una base VACÍA y aprovisionamiento CLI de cuentas/permisos.
- `tests`: referencia del JS original, paridad financiera y operaciones MySQL/concurrencia.

## Requisitos y aislamiento
PHP 8.3+ (cPanel observado: 8.4), PDO MySQL, fileinfo, JSON, sesiones y HTTPS.
MySQL 8.0.16+ con CHECK efectivo. Sin dependencias Composer ni servicios externos.
Configurar `BT_CONFIG_FILE` con la ruta a una configuración PRIVADA basada en
`config.example.php`. No subir configuración, src, SQL o almacenamiento a la raíz pública.
La configuración real utiliza un usuario SQL exclusivo con permisos solo sobre la nueva base.
No reutilizar credenciales, archivos o directorio público de WordPress.
`bin/migrate.php` se niega a actuar si encuentra cualquier tabla existente; no contiene DROP.
MySQL hace commits implícitos en DDL: si una instalación vacía falla parcialmente,
no reintentar sobre esa base sin revisión y autorización. Nunca ejecutar contra WordPress.

Solo futura instalación, requiere autorización adicional:
```
BT_CONFIG_FILE=/ruta/privada/config.php php backend/bin/migrate.php
```
Crear usuarios con `bin/create-user.php username display-name role sucursales`,
contraseña por STDIN, nunca por argumento o archivo versionado. Roles y sucursales
reales de Daniel/Pamela requieren confirmación. `set-access.php` permite restringir
páginas de un usuario y revoca sus sesiones existentes.

## Contrato de la integración
1. GET `index.php?action=csrf` obtiene CSRF con cookie de sesión.
2. POST `?action=login`, JSON `{username,password}`, `X-CSRF-Token` y Origin exacto.
   Devuelve usuario de servidor y un NUEVO token CSRF.
3. GET `?action=state` devuelve `{state,user,branches,revision,settingsVersion}`.
4. POST `?action=<comando>` con JSON, CSRF y `Idempotency-Key` único de 16-100
   caracteres. Reutilizar la misma clave SOLO al reintentar la misma acción/entrada.
5. GET `?action=request.status&key=...` consulta el recibo de un envío incierto del usuario actual.
6. POST `?action=logout` invalida sesión. No se permite CORS.

Los registros incluyen `id` estable y `_version`. Una actualización envía
`{id,version: Number(_version), ...campos}`. Un conflicto devuelve 409 y no guarda.
No enviar el objeto S completo. No usar índices de arrays como identificadores.
Los importes llegan como cadenas decimales desde PDO; la capa de adaptación
normaliza los campos numéricos que la interfaz usa con `+=` sin perder el ID/versión.
Fechas sin captura son null, no un dato de ejemplo. No ejecutar `loadState()`/seedData
como recuperación de fallos de red en la versión conectada.

Un error de red no debe cerrar formularios ni mostrar “guardado”. El cliente debe esperar
el commit y manejar 401/403/409/422/503; refrescar datos sin sobrescribir un formulario abierto.
`revision` sirve para detectar nuevos movimientos, pero el sondeo y el manejo de conflictos
en la interfaz están implementados en assets/connected.js. No hay WebSocket; la sincronización es por consultas periódicas.

| Comando | Campos particulares |
|---|---|
| sales.save | fecha, sucursal, totales originales; id/version para reemplazo; evidenciaId opcional |
| credit.create | cliente, clienteId opcional, fecha, sucursal, monto |
| credit.assign | id/version del corte, cliente, clienteId opcional, monto |
| credit.payment / b2b.payment | id/version de crédito/cliente, fecha, monto, metodo, transferenciaStatus |
| transfer.decide | tipo venta/abono, id, version, approved boolean |
| payment.correctMethod | id/version de cobranza, metodo |
| expense.create / expense.edit | campos originales de gasto, metodo, impactaCajaFisica, cajaSucursal, pagoAplazado |
| expense.settle | id/version del cargo, monto, fecha, metodo, referencia opcional |
| expense.requestVoid / expense.resolveVoid | id/version; approved para resolución de Dirección |
| payroll.pay | tipo nomina/comisiones, id/version, fecha, periodo, monto, datos de pago; confirmAdditional para nómina adicional |
| cash.movement | fecha, sucursal, tipo Entrada/Salida, monto, concepto |
| cash.close | fecha, sucursal, fondo, contado, retiro; esperado calculado en servidor |
| service.create | datos actuales de recepción; folio generado por servidor |
| service.transition | id/version, operation y campos del paso |
| inventory.move / stock.save | campos actuales de movimiento/mínimo |
| balance.save / balance.remove | saldo y cuenta, o id/version para archivar sin borrar |
| catalog.create | entity facturacion/ml/oportunidades/compras/clientesB2B/nomina/comisiones/categoriasGastos y sus campos |
| purchase.receive / category.deactivate | id/version y entrega en recepción |
| settings.update | version, diagnosticoEstandar, requireTransferApproval, moduleFlags |
| notification.read | ids de avisos leídos por el director actual |

Servicio: `operation` = diagnose, quote, editQuote, authorize, reject,
chargeDiagnostic, start, ready, deliver. Cotización utiliza `items` con descripcion/monto.
Diagnóstico cobrado utiliza diagnosticoCobrado/diagnosticoFechaCobro/diagnosticoMetodo.
Cobros de servicio NO crean ventas adicionales.

Evidencia: POST multipart a `evidence.php` con `pdf` y `sucursal`, CSRF y Origin.
Respuesta `{evidenciaId,sicarArchivo}` para enlazar al guardar corte.
GET `evidence.php?id=...` permite descarga solo si está enlazada a un corte autorizado.
Almacenamiento privado, nombre aleatorio, tipo/tamaño y hash verificados; no ejecutar PDF.
Una subida sin corte puede dejar un archivo huérfano, no accesible por descarga: falta
implementar limpieza programada con política de retención antes de producción.

## Consistencia y seguridad
Todas las operaciones de negocio usan transacción y un mutex de escritura en MySQL.
Es una decisión conservadora para el volumen inicial del hosting compartido: evita carreras
entre operaciones relacionadas; limita el paralelismo de escritura. La misma clave repetida
no produce otro pago. La clave con otros datos/permisos recibe 409.
La auditoría completa persiste en `change_log`; los resúmenes visibles pueden limitarse.
Los historiales de órdenes y autorizaciones se guardan por separado. No hay borrado físico
de movimientos financieros ni endpoint de reinicio de demo.
La normalización técnica de IDs protege relaciones sin modificar folios visibles.

Las lecturas de state se hacen dentro de una transacción consistente, filtran sucursales
antes de responder y no incluyen colecciones de módulos sin permiso. Los roles conservan
PERMS/ACTIONS existentes, con restricciones por usuario y flags de módulo.
Antes de producción: revisar también permisos por campo y cargas grandes/paginación.

## Pruebas
```
node backend/tests/reference.mjs
php backend/tests/finance.php
# SOLO una base efímera VACÍA, jamás cPanel o producción:
BT_TEST_DSN='mysql:host=127.0.0.1;dbname=bt_test;charset=utf8mb4' php backend/tests/integration.php
```
La referencia valida el hash del index original, las 23 rutas y genera 360 escenarios
sintéticos usando el propio JS: efectivo, cheque, transferencias, crédito, Ambas,
caja, anulaciones, cargos aplazados, fechas y mano de obra. PHP compara cada resultado.
La integración usa MySQL real, IDs relacionados, rollback, reintentos, permisos,
sesiones, CSRF, revocación y dos procesos compitiendo por el mismo saldo.
El workflow ejecuta lint, paridad y pruebas MySQL en la rama de migración.

## Límites de esta entrega
Los botones/formularios de las 23 pantallas se conectan en app.php. No se importa información local ni se migra información real automáticamente.
Conservar el demo funcional no significa que sus datos ya estén sincronizados.
La importación Excel sigue siendo solo un aviso, como en el original; no se implementa
integración nueva con Mercado Libre ni timbrado CFDI.
Mantiene reglas actuales de redondeo y “flujo no es utilidad”. Dos comportamientos
originales deben revisarse en aceptación sin cambiarlos silenciosamente: inventario
se limita a cero al salir más de lo disponible; entrega con Crédito marca cobrado.

Faltan completar aceptación operativa, carga, extensiones del hosting, seguridad del
directorio real del subdominio y respaldo/RESTAURACIÓN
comprobada de SQL+PDF+configuración con copia fuera del hosting. Producción bloqueada
hasta completar estos puntos y recibir autorización. No se ha tocado cPanel.

## Ubicación privada para una futura instalación
La configuración de despliegue debe definir, únicamente para el subdominio:
`BT_BACKEND_ROOT` (carpeta privada que contiene src), `BT_UI_SOURCE` (index original
privado) y `BT_CONFIG_FILE` (configuración privada). En desarrollo se usan las rutas
relativas del repositorio. Esto permite colocar código, configuración y PDF fuera
de todo public_html y copiar solo public/ a la raíz independiente del subdominio.
No se ha creado ni cambiado ninguna de estas rutas en cPanel.
