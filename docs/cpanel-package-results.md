# Validación del paquete de prueba para cPanel

Fecha: 19 de octubre de 2026, Ciudad Juárez.
Código probado: `dfad4804182aefbcff49585dafe7cd9a5651986f`.
Rama: `migration/php-mysql`.

[GitHub Actions, ejecución completa aprobada 39372157341](https://github.com/may22gal/border-tools-sistema/actions/runs/39372157341)

| Comprobación | Resultado |
|---|---|
| Interfaz original de main | Blob `b014daa1720500958aa16590693c4f922859d5ed`, sin cambios |
| Referencia JavaScript | 23 pantallas, 360 escenarios sintéticos |
| Finanzas y políticas | 12,982 aserciones aprobadas |
| Backend y MySQL real | 58 aserciones aprobadas |
| Navegador usando el paquete extraído | 76 pruebas aprobadas, 38 de escritorio y 38 de móvil emulado |
| Configuración privada ausente | Respuesta HTTP 503 comprobada antes de instalar la configuración de prueba |
| Separación de archivos | Cuatro archivos públicos; código, SQL y fuente HTML en carpeta privada |
| Integridad del paquete | ZIP válidos, manifiesto SHA-256 y verificación del HTML original |

La ejecución creó dos paquetes desde el mismo código: uno con rutas temporales del
runner para las pruebas y otro con rutas `/home/btools` para revisión de cPanel.
Las pruebas se ejecutaron contra los archivos extraídos de los ZIP, no únicamente
contra las rutas del repositorio. La configuración y las contraseñas sintéticas
del runner se añadieron después de extraer; no se incluyeron en los ZIP descargables.

Los flujos de negocio conservan las pruebas de la integración previa, incluidos
pagos concurrentes, reintentos, pérdida de respuesta, roles, sucursales, PDF privado,
sesiones, anulaciones, servicio y sincronización de dos sesiones.
El router del servidor de desarrollo ahora usa la raíz pública efectiva, para
rechazar rutas inexistentes al probar un paquete instalado fuera del repositorio.
No se cambiaron las pantallas, los cálculos ni los controladores de producción.

## Artefactos

- [Paquete de revisión de cPanel](https://github.com/may22gal/border-tools-sistema/actions/runs/39372157341/artifacts/12241922674)
- [Capturas, videos y reporte de pruebas](https://github.com/may22gal/border-tools-sistema/actions/runs/39372157341/artifacts/12241952680)
- [Demostración sintética reproducible](https://github.com/may22gal/border-tools-sistema/actions/runs/39372157341/artifacts/12241942627)

Los artefactos tienen retención de 14 días. El constructor y las instrucciones
permanecen en la rama para reconstruirlos. Ver
[instrucciones y límites de instalación](cpanel-instalacion-prueba.md).

## Alcance real

Esta ejecución no instaló archivos ni creó tablas en cPanel. En el hosting solo
se había comprobado previamente la conexión PHP 8.4.26/MySQL 8.0.37 y una transacción
de lectura, con sus diagnósticos temporales retirados. La base nueva sigue destinada
exclusivamente al sistema administrativo; WordPress queda fuera.

El paquete exige autorización antes de instalarlo, importar sus 37 tablas o
fusionar las reglas del subdominio. Sigue pendiente confirmar cómo ejecutar las
herramientas CLI privadas para crear las cuentas y datos ficticios. No se preparó
un instalador público ni una tarea cron en el hosting.

Los resultados no reemplazan las pruebas del hosting instalado, la aceptación
operativa, el teléfono físico, la prueba de carga ni los respaldos y restauración.
La producción con información real sigue bloqueada hasta completar esos puntos.
