# Migración del sistema actual a PHP y MySQL
Fecha de revisión: 2026-10-16, Ciudad Juárez.
Base: main, commit 04204fa22cdbb1e68dd24a5bed7a723052b5c30a.
Estado: análisis y preparación, NO backend implementado ni producción autorizada.

## Alcance obligatorio
Migrar el sistema existente. Conservar CSS, pantallas, 23 rutas de PAGES, formularios,
cálculos, flujos y módulos. No sustituirlo por una aplicación nueva.
Mantener main y la demo Vercel funcionales. Implementar y probar en esta rama.
WordPress, WooCommerce, su PHP, archivos, plugins y btools_wp_ify0t quedan fuera.
No usar datos reales hasta verificar respaldos y restauración.
No hacer cambios destructivos ni cambios compartidos de hosting sin autorización.
La identificación individual en el acceso requerirá adaptar los campos indispensables
del formulario existente, conservando su diseño. El rol no lo puede elegir libremente
el navegador en producción.

## Arquitectura observada
El árbol completo contiene index.html (229466 bytes) y vercel.json.
index.html contiene estilos, HTML, seedData, estado S, permisos, funciones de negocio,
formularios y generación de reportes. vercel.json solo activa cleanUrls.
Dependencias externas: Google Fonts y PDF.js 3.11.174 con su worker en cdnjs.
No hay PHP, rutas API, esquema SQL ni autenticación de servidor en esta versión.
Los 23 destinos de PAGES son: home, ventas, ventas_admin, mano_obra, sucursales,
proveedores, gastos, servicio, servicio_stats, credito, caja, finanzas, reportes,
facturacion, inventario, ml, oportunidades, compras, clientes, nomina, comisiones,
excel, permisos.

## Persistencia y accesos actuales
| Código | Comportamiento actual | Migración |
|---|---|---|
| STORE_KEY=bt_control_v23; loadState() | Lee todo S de localStorage; si falta, carga seedData y normaliza | Consultas autenticadas y limitadas por usuario, sucursal y módulo. Nunca insertar ejemplos por fallo de conexión |
| save() | Escribe S entero de forma síncrona | Cada acción espera confirmación de su operación PHP, con transacción y control de versión |
| resetDemo() | Sustituye S por ejemplos | Conservar exclusivamente en demo; nunca permitir reinicio de producción |
| bt_prefs; savePrefs() | Tema y densidad | Puede seguir local, no contiene datos administrativos |
| EVI.open/put/get | PDF en IndexedDB bt_evidencias_sicar, almacén pdf | Archivos privados de servidor, con metadatos SQL y autorización en descarga |
| openSicar() | PDF accesible solo en navegador de origen | Descarga autenticada en cualquier equipo autorizado |
| enter(), cerrarSesion() | El selector determina rol; contraseña no se consulta | Usuario individual, password_hash/password_verify, sesión de servidor, cierre e invalidación |
| PERMS, ACTIONS, lockedSuc, roleHas, canSee, can, moduleOn | Restricciones ejecutadas en cliente | Mismas reglas en cada lectura y escritura PHP; la interfaz conserva su comportamiento |
| logAct(), notifyDirector(), verNotificaciones() | Historial y avisos locales; lectura modifica S | Auditoría persistente con actor y fecha del servidor; avisos compartidos y lectura por usuario |
| toggleModule y onchange de permisos() | Configuración modificada directamente desde HTML | Operaciones de Dirección autenticadas; también migrar estos manejadores inline |

ARRAY_KEYS tiene 20 colecciones: categoriasGastos, ventas, facturacion, inventario, ml,
oportunidades, servicio, egresos, nomina, comisiones, compras, clientesB2B, creditos,
cobranzas, stockMin, cortesCaja, cajaMovimientos, saldos, activity, notifications.
Además S.config contiene diagnosticoEstandar, requireTransferApproval y moduleFlags.

Todas las funciones que mutan S dependen indirectamente de localStorage aunque no
lo mencionen. Cambiar solamente save() no es suficiente: los llamadores muestran
éxito inmediatamente y usan índices de arrays que pueden cambiar con otra captura.

## Mapa de operaciones de servidor
| Área | Funciones actuales a conectar | Garantía requerida |
|---|---|---|
| Cortes SICAR | saveVenta, aprobarTransferencia | Un corte por fecha/sucursal; reemplazo versionado; conservar vínculos con créditos y evidencia; validación de permisos |
| Crédito | saveAsignarCredito, saveCredito, saveCobroCredito, corregirMetodo | Asignación, crédito y abono atómicos; saldo no negativo; autorización y versión |
| B2B | saveCliente, saveAbonoB2B, openAbonoB2B | Evitar doble cobranza; vincular por ID de cliente y crédito, no solo nombre |
| Caja | saveCorteCaja, saveMovimientoCaja | Recalcular esperado en servidor; corte único fecha/sucursal; conservar revisión anterior |
| Egresos | saveEgreso, guardarEdicionEgreso | Un registro por operación; conservar anterior/nuevo; respetar restricciones por pagos relacionados |
| Anulaciones | solicitarAnulacionEgreso, resolverAnulacionEgreso | Dirección autoriza; conservar movimiento anulado, motivo y actor; actualizar nómina/comisiones en la misma transacción |
| Tarjetas | guardarLiquidacionCargo | Pago parcial/completo ligado al cargo, bloqueo y rechazo de sobrepago concurrente |
| Categorías | guardarCategoriaGasto, desactivarCategoriaGasto | No eliminar referencias históricas; Dirección desactiva |
| Saldos | saveSaldo, borrarSaldo | Identificadores estables, permisos y registro de cambios; no borrado irreversible |
| Servicio | saveOrden, guardarDiag, guardarCot, guardarAuth, confirmRechazo, saveCobroDiag, guardarEntrega, guardarEdicionCot, avanzar | Folio único generado en servidor; transiciones válidas; historial duradero; nueva autorización si cambia cotización |
| Nómina | saveEmpleado, savePago | Alta separada del gasto; pago y actualización de empleado atómicos; respetar confirmación de pago adicional |
| Comisiones | saveComision, savePago, deshacerPago | Alta no equivale a pago; evitar pago duplicado; conservar origenId/empleadoId |
| Inventario | saveStockMin, saveMov | Movimiento y existencia en una transacción; evitar pérdida de actualizaciones |
| Facturación | saveFact | Validación, folio y sucursal; no equivale a emitir CFDI |
| Compras | saveCompra, recibirCompra | Actualización versionada; compra recibida no registra automáticamente pago |
| Seguimiento comercial | saveML, saveOpo | CRUD autorizado conservando campos y módulos |
| Configuración/avisos | toggleModule, manejadores inline de permisos, verNotificaciones | Permisos comprobados en servidor; lectura de avisos por usuario |

## Funciones que pueden permanecer en el navegador
Plantillas de pantallas, filtros visuales, modales, formato de moneda/fechas, impresión
de etiquetas, vista previa de WhatsApp, parseSicarTotales, parseManoDeObra y lectura
PDF pueden conservarse. Los importes extraídos siguen siendo datos no confiables y
deben validarse al guardar. No enviar mensajes WhatsApp automáticamente.
btTotals, manoPorMetodo, calcCorte y auxiliares siguen como referencia de comportamiento
y presentación; los resultados financieros autorizados también se verifican en servidor.
Exportar CSV puede usar datos ya autorizados, nunca descargar colecciones ocultas.
Las preferencias visuales pueden seguir en localStorage.

## Reglas financieras que deben conservarse
1. Venta generada = totalVentaSicar, incluido crédito y servicio.
2. Cobrado = formas de pago válidas del corte + abonos que cuentan, una sola vez.
3. Diagnóstico y reparación ya están dentro del corte SICAR; no sumar otra venta.
4. Transferencia rechazada no cuenta; pendiente cuenta según requireTransferApproval.
5. Mano de obra por método se distribuye proporcionalmente al corte.
6. Egreso Ambas se reparte 50/50 por sucursal y completo consolidado.
7. La caja física solo baja por el egreso marcado y su cajaSucursal.
8. Tarjeta/transferencia/cheque no equivalen a efectivo físico.
9. Cargo aplazado no es salida pagada; liquidaciones generan salida en fecha de pago.
10. Nómina y comisiones producen un solo egreso al pagarse; alta no genera egreso.
11. Anulación conserva historial y elimina el efecto del movimiento en totales.
12. Cambiar cotización autorizada exige nueva autorización según la regla actual.
13. Flujo neto no es utilidad ni saldo bancario.

No corregir silenciosamente comportamientos financieros durante la migración.
Documentar discrepancias y resolverlas antes de la aceptación.

## Riesgos concretos encontrados
- S completo reside en cliente: ocultar una página no protege datos.
- Varias acciones comprueban permiso solo al abrir formulario, no al guardar.
- Índices i de arrays y folios calculados con longitud/máximo no son seguros con
  varios equipos. Usar IDs estables y secuencias de servidor sin cambiar folios visibles.
- save() puede fallar y los llamadores aun así muestran éxito. No cerrar formulario
  ni anunciar guardado antes del commit del servidor.
- loadState añade colecciones seedData cuando faltan. En producción no debe introducir
  ejemplos al fallar o al recibir datos parciales por permisos.
- Reemplazar un corte crea otro id y conserva solo créditoAsignado limitado; puede
  dejar origenCorte sin correspondencia. Conservar ID y versiones al migrar.
- Clientes se relacionan por nombre y openAbonoB2B busca crédito sin sucursal en
  esa búsqueda. Reemplazar relación técnica por IDs y alcance autorizado.
- activity se limita a 60 entradas y notifications a 50. Conservar presentación
  limitada, pero no truncar la auditoría persistente.
- ExportarEgresos filtra período, pero no filterSuc. El servidor debe aplicar acceso
  aunque el cliente o filtros se manipulen.
- Importación Excel solo muestra un aviso del nombre del archivo. No existe aún
  importación real ni mapeo. Conservar este alcance; no añadirla como función nueva.
- Mercado Libre es seguimiento manual; no hay integración API en este código.
- Facturación es registro manual; no hay timbrado CFDI en este código.
- Inventario usa Math.max(0, existencia-cantidad), ocultando un posible faltante.
  Documentar y comprobar, no introducir política distinta sin validación.
- En servicio, entrega con método Crédito marca cobrado=true. Requiere caso de
  regresión y aclaración si contradice la operación; no cambiarlo silenciosamente.
- Montos JS son números binarios. SQL debe usar DECIMAL o centavos enteros,
  con pruebas de paridad y redondeo, especialmente división Ambas y mano de obra.

## Diseño de migración
Mantener HTML/CSS del sistema como interfaz; sustituir las operaciones de persistencia
y autenticación, sin reescribir pantallas.
PHP + PDO MySQL y tablas InnoDB en btools_sistema.
Credenciales y archivos privados fuera del directorio público del subdominio.
No utilizar credenciales de WordPress.
Tablas por entidad para cortes, créditos, cobranzas, clientes, egresos, empleados,
comisiones, caja, servicio y sus conceptos/historial, inventario y catálogos.
Usuarios, roles/permisos/sucursales, configuración, auditoría, avisos y evidencia
como tablas propias. Mantener todos los campos actuales; JSON solo para estructuras
auxiliares donde no comprometa relaciones, importes o controles.
Claves foráneas e índices, versionado por registro y transacciones por acción compuesta.
Cada escritura lleva clave de idempotencia. Un reintento de red no crea otro pago.
No aceptar un PUT del S completo ni un guardado genérico sin reglas de negocio.
Consultar solo datos permitidos y no entregar información de otras sucursales oculta en UI.
Refrescar cambios al recuperar foco y periódicamente, sin reemplazar un formulario
abierto; detectar conflictos al guardar y preservar lo capturado.
No prometer sincronización ya implementada: todavía requiere backend y pruebas.

Seguridad mínima:
- password_hash/password_verify; sesiones con cookie Secure, HttpOnly, SameSite,
  regeneración al acceder, expiración y cierre real.
- CSRF en escrituras; consultas preparadas; validación de entradas; denegar por defecto.
- Restricción de intentos de acceso sin revelar existencia de cuentas.
- Actor, timestamp y autorización obtenidos de sesión, nunca del cuerpo enviado.
- Escape de contenido también al imprimir e importar/exportar; revisar fórmulas CSV.
- PDF validado por tipo/contenido/tamaño; nombres internos aleatorios, hash SHA-256,
  fuera de webroot; descarga con autorización.
- Sin errores detallados ni secretos en respuestas, repositorio o directorios públicos.
- PHP/configuración del subdominio únicamente; no cambiar PHP o seguridad global.
- HTTPS obligatorio y directorio sin listado antes de instalar.

## Etapas y criterios de aceptación
1. Inventario técnico y referencia: este documento; rama aislada; casos de regresión
   del motor y de las 23 pantallas. No cambiar main.
2. Esquema y base PHP en desarrollo: conexión, migraciones versionadas, sesiones y
   permisos. Probar instalación vacía sin seedData automático.
3. Cortes, créditos, cobros, egresos y caja: migrar cada acción con paridad de totales,
   transacciones, ID estables y pruebas concurrentes.
4. Servicio, inventario, nómina, comisiones y demás módulos: conservar flujos,
   etiquetas, reportes y archivos.
5. Pruebas integrales con datos ficticios: todos los roles, ambas sucursales,
   dos sesiones/equipos, errores de conexión y reintentos.
6. Respaldos automáticos de SQL y archivos privados/configuración, retención y
   copia recuperable fuera del hosting. Probar restauración en una base aparte,
   comparar conteos, relaciones, hashes de PDF y totales. Nunca restaurar sobre WP.
7. Instalación de prueba aislada y revisión de aceptación. Carga real y puesta en
   producción requieren autorización; no asumirla por preparar esta rama.

Daniel y Pamela tendrán cuentas individuales; no inferir sus roles por sus nombres.
La asignación concreta debe confirmarse antes de activar sus cuentas.

## Matriz mínima de pruebas
- Todas las 23 rutas y formularios conservados, comparación visual en PC y celular.
- Cada rol puede leer y escribir solo lo permitido, probando acceso directo a API,
  modificación de sucursal, IDs ajenos, módulos apagados y sesión cerrada.
- Transferencias aprobadas, pendientes y rechazadas con la regla activa/inactiva.
- Crédito: asignación parcial/completa, abono, exceso, B2B y doble envío simultáneo.
- Reemplazo de corte con crédito/evidencia existentes, sin perder relaciones.
- Egresos Ambas, caja pagadora, métodos no efectivos, tarjeta parcial/completa.
- Edición, solicitud de anulación, rechazo y autorización, auditoría de cada actor.
- Nómina y comisiones: alta sin gasto, pago único, pago adicional confirmado,
  anulación relacionada y conciliación de reportes.
- Servicio: cada transición, garantía, rechazo, diagnóstico antes/después,
  edición posterior a autorización, entrega y ausencia de doble ingreso.
- Inventario: movimientos simultáneos y mismo SKU en sucursales diferentes.
- PDF disponible desde otro usuario autorizado y denegado a uno sin permiso.
- Una computadora captura y otra consulta; conflicto simultáneo no pierde datos.
- Respuesta perdida tras commit y reintento no duplican operación.
- Fallo antes de commit revierte toda operación compuesta.
- Exportaciones respetan rol/sucursal; comprobación de integridad de respaldo restaurado.

## Entorno confirmado previamente en cPanel
MySQL 8.0.37; PHP 8.4 por dominio; aproximadamente 8.35 GB libres; cuenta con 1 GB RAM.
Base nueva vacía btools_sistema; subdominio con raíz
/home/btools/public_html/bt-admin-public por restricción del hosting.
DNS observado 31.200.246.46; HTTPS accesible y certificado Let’s Encrypt reconocido
por cPanel. No se ha instalado la aplicación.
Extensiones PDO MySQL, mbstring, fileinfo, openssl y capacidades de respaldo/cron
aún requieren comprobación para el runtime efectivo del subdominio.
No cambiar la versión de PHP del dominio principal.
