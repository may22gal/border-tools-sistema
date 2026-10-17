# Resultados de validación de la base PHP/MySQL

Fecha: 2026-10-16, Ciudad Juárez.
Código probado: `27dfb41f3c19cc38d3f40984fd80bc4ab0031efa`.
[GitHub Actions, ejecución aprobada](https://github.com/may22gal/border-tools-sistema/actions/runs/39004948347).

| Verificación ejecutada | Resultado |
|---|---|
| Sintaxis de los 14 archivos PHP | Aprobada |
| PHP y PDO MySQL | PHP 8.3.6, extensión disponible |
| Migración real de esquema | MySQL 8.0, 37 tablas y 28 claves foráneas |
| Interfaz original | Hash Git b014daa1720500958aa16590693c4f922859d5ed sin cambios |
| Navegación original | 23 rutas conservadas |
| Referencia financiera original | 360 escenarios sintéticos generados con el JavaScript actual |
| Paridad financiera y permisos | 12,982 comprobaciones aprobadas |
| Integración | 55 comprobaciones aprobadas |

Las comprobaciones de integración incluyen creación de cortes, reintento idempotente,
rechazo de clave reutilizada con datos distintos, asignación de crédito con vínculo al
corte, abonos, rechazo de sobrepago/versiones obsoletas, reemplazo de corte sin perder
su ID, gasto y edición, liquidación parcial de tarjeta, restricciones de anulación,
pago de comisión y su reversión relacionada, caja calculada en servidor, movimiento
que actualiza inventario, secuencia de servicio, transiciones, diagnóstico, cotización
y reautorización, entrega sin venta duplicada, archivo recuperable de saldo,
compras, otros catálogos, categorías reactivadas, historial, configuración versionada,
restricciones por rol/sucursal/usuario, rollback, contraseña real generada solo en la
prueba, CSRF, revocación de sesión y dos conexiones cobrando simultáneamente.

## Hallazgo resuelto
La primera comparación detectó una diferencia de un centavo por orden y redondeo
binario del reporte original. El motor de reportes PHP conserva ahora la evaluación
IEEE-754 del JavaScript y su r2, sin alterar las reglas ni relajar la tolerancia de la
prueba. Los cambios de saldos se calculan en centavos y los importes se almacenan
como DECIMAL, evitando aritmética binaria en los pagos.

## Comprobación del repositorio
Después de las pruebas se consultó GitHub: main continúa en
04204fa22cdbb1e68dd24a5bed7a723052b5c30a, con sus dos archivos originales.
El index.html de la rama de migración conserva el mismo blob original.
No se hizo ningún cambio en cPanel, WordPress o WooCommerce durante esta etapa.

## Lo que estas pruebas NO certifican
- La interfaz todavía usa el almacenamiento de la demo. Falta conectar sus operaciones
  al backend, normalizar datos de respuesta y manejar versiones/conflictos en formularios.
- No se han probado las 23 pantallas contra la API desde un navegador.
- Falta una prueba HTTP integral de cookies, subida/descarga PDF y errores de red.
- La ejecución aprobada usa PHP 8.3; falta validar el runtime efectivo PHP 8.4 del hosting.
- No se ha hecho prueba de carga ni de límites de almacenamiento del hosting.
- Respaldo automático y restauración de SQL, PDF y configuración siguen pendientes.
- No hay cuentas de personas reales, credenciales de hosting ni datos reales en el código.

La entrega es una base de backend aprobada por esta suite, no una autorización de
producción. Integración, aceptación, respaldos y autorización siguen siendo requisitos.
