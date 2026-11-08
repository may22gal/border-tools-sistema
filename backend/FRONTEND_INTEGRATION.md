# Integración de la interfaz existente

Rama exclusiva: `migration/php-mysql`. La demo de `main` conserva su `index.html`
original, cuyo blob Git es `b014daa1720500958aa16590693c4f922859d5ed`.
No se ha instalado nada en cPanel ni se han cambiado WordPress o WooCommerce.

## Funcionamiento
`public/app.php` renderiza el documento original y carga `assets/connected.js`.
No se reemplazan pantallas, estilos, fórmulas ni formularios. Se sustituye la
selección libre de rol por usuario individual en el mismo campo del acceso.
La etiqueta identifica el modo conectado y se inhabilita reiniciar datos de demo.

El estado administrativo nace vacío hasta obtener una sesión y una lectura de MySQL.
No se importa ni se guarda el objeto `S` en localStorage. Solo las preferencias de
apariencia siguen siendo locales. sessionStorage conserva identificadores y hashes
para consultar envíos inciertos; no contiene capturas, importes ni contraseñas.

Cada formulario envía una operación específica con CSRF, clave de idempotencia y,
cuando actualiza un registro, ID y versión del servidor. Se espera el commit y una
lectura actualizada antes de cerrar o mostrar éxito. La falta de conexión conserva
el formulario. Si se pierde la respuesta después del commit, el recibo permite
recuperar la confirmación tras recargar. Si no hubo commit y se descarta el formulario,
no se promete recuperar campos descartados: el navegador avisa antes de salir.

El sondeo es cada cinco segundos y al recuperar foco/conexión. Se respeta el menú
móvil y el formulario abierto, incluso si una consulta ya estaba en vuelo. Un
conflicto de edición no sobrescribe otro equipo; conserva la captura y exige revisión.
Los permisos, sucursales, importes, saldos y autorizaciones se comprueban en PHP.

## Cobertura de las 23 pantallas
Las pantallas de lectura utilizan el estado autorizado del servidor y el motor
original de la interfaz. Las acciones se resumen aquí; contratos en README.md.

| Pantalla original | Integración |
|---|---|
| Resumen | Estado autorizado, indicadores, avisos e historial central |
| Ventas / SICAR | sales.save, PDF privado y confirmación de transferencias |
| Administración de ventas | Cortes y cobranza central, transfer.decide |
| Mano de obra | Cortes SICAR centrales y cálculos originales |
| Comparativo sucursales | Lecturas centrales por sucursal y consolidado autorizado |
| Proveedores | expense.create/edit/settle y flujo de anulación |
| Gastos | Egresos, tarjetas, categorías, correcciones e historial |
| Servicio | Recepción, diagnóstico, cotización, autorización, reparación y entrega |
| Estadísticas de servicio | Órdenes e historial del servidor |
| Crédito / Cobranza | credit.create/assign/payment, corrección y transferencias |
| Caja / Corte | cash.movement, cash.close y cálculo de esperado en servidor |
| Finanzas | Información central, aprobaciones, saldos y liquidaciones |
| Reportes | Datos centrales, fórmulas originales y exportaciones existentes |
| Facturación | catalog.create y consultas; no se agrega timbrado |
| Inventario | stock.save, inventory.move y mínimos actuales |
| Mercado Libre | Registros actuales vía catalog.create, sin integración externa nueva |
| Oportunidades | catalog.create y consultas autorizadas |
| Compras | catalog.create y purchase.receive; no genera egreso duplicado |
| Clientes B2B | catalog.create, créditos vinculados y abonos |
| Nómina | Empleados y payroll.pay con período, relación e historial |
| Comisiones | Registro y payroll.pay sin repetir un pago confirmado |
| Excel / Importar | Conserva exactamente el aviso del original; no importa registros |
| Control del sistema | settings.update; permisos efectivos del servidor y preferencias locales |

## Demostración y pruebas
Ver `demo/README.md` para ejecutar el entorno ficticio PHP 8.4 / MySQL 8.0.
El workflow `PHP MySQL migration checks` crea dos bases efímeras separadas:
una para paridad/integración y otra para formularios reales desde Chromium.

- La referencia ejecuta el JS original en 360 escenarios financieros sintéticos.
- Las pruebas PHP comprueban importes, políticas, transacciones, rollback,
  autenticación, revocación y pagos concurrentes en MySQL real.
- Playwright abre las 23 pantallas en escritorio y viewport de iPhone 13.
- Comprueba formularios prioritarios y secundarios, dos sesiones, doble clic,
  desconexión, respuesta perdida, recarga y edición obsoleta.
- Incluye solicitudes de anulación, autorización de Dirección, historial,
  crédito SICAR/manual, transferencias, nómina, comisiones, caja, cargos y
  liquidaciones parciales de tarjeta, saldos, categorías y recepción de compras.
- Revisa CSRF, cookies de sesión, roles, filtrado de sucursal, PDF privado,
  denegación de descarga ajena y rutas privadas inaccesibles.
- Guarda 46 capturas, videos de recorrido con un gasto que sobrevive a recarga,
  reporte HTML y un ZIP del código probado. Los artefactos duran 14 días;
  el código y las instrucciones quedan en la rama.

La emulación móvil de Chromium no sustituye una aceptación en dispositivos físicos.
Las capturas verifican renderizado; el hash del original demuestra que no se editó
su diseño. No se afirma una comparación automática de píxeles contra una captura
anterior, ni que se hayan probado todas las combinaciones posibles de campos y roles.
Los resultados concretos y su ejecución se registran en INTEGRATION_RESULTS.md.

## Antes de producción
No introducir información real. Quedan aceptación operativa con las observaciones
históricas de Pamela, pruebas de volumen, comprobación del alojamiento autorizado y
respaldos programados de SQL/PDF/configuración con restauración demostrada y copia
fuera del hosting. Falta definir la limpieza con retención de PDF huérfanos.
Se conservan dos reglas originales que necesitan aceptación: inventario se limita a
cero al sacar más de lo existente; la entrega con Crédito se marca cobrada.
La revisión no autoriza instalar ni modificar cPanel. Se necesita autorización
explícita antes de cualquier trabajo allí.
