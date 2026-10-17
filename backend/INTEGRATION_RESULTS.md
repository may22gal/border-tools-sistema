# Resultados de la integración frontend PHP/MySQL

Código probado: `6b9359bd7b33e62800e6e6b6dfc56945f1837214`.
Rama: `migration/php-mysql`. Ejecución terminada correctamente el 17 de octubre de 2026.

[GitHub Actions: ejecución completa 39007166967](https://github.com/may22gal/border-tools-sistema/actions/runs/39007166967)

| Verificación | Resultado confirmado |
|---|---|
| Interfaz original | Blob `b014daa1720500958aa16590693c4f922859d5ed`, idéntico al de main |
| Referencia financiera | 23 pantallas y 360 escenarios sintéticos ejecutados con el JavaScript original |
| Finanzas y políticas | 12,982 aserciones aprobadas |
| Integración PHP/MySQL | 58 aserciones aprobadas, con transacciones y pagos concurrentes |
| Navegador conectado | 76 pruebas aprobadas, 38 por viewport, sin fallos |
| HTML generado | Script original intacto, adaptador único, configuración conectada y sin arranque de datos locales |
| Demostración | PHP 8.4 y MySQL 8.0 reales con datos exclusivamente ficticios |

Las pruebas PHP se ejecutaron en el runner con PHP 8.3 y PDO MySQL; las pruebas de
navegador, con PHP 8.4. El servidor MySQL de las pruebas fue 8.0.46. Se usaron bases
efímeras independientes, nunca la base de WordPress ni el alojamiento de cPanel.

## Flujos comprobados

Las 23 pantallas se abrieron con la API real en Chromium de escritorio 1440×1000
y un dispositivo iPhone 13 emulado en Chromium. Se guardaron capturas de las 46
combinaciones. La cobertura de formularios y seguridad incluye:

- Gastos y proveedores: creación, edición, historial legible, solicitud de
  anulación, autorización de Dirección y actualización de otra sesión.
- Tarjeta: cargo aplazado, liquidación parcial, saldo restante y un solo pago asociado.
- SICAR: corte, PDF privado, vinculación de crédito, cobranza y permisos por sucursal.
- Crédito manual y confirmación de transferencia, nómina, comisiones, caja y corte.
- Facturación, mínimos y movimientos de inventario, publicaciones, oportunidades,
  compras, recepción, clientes y alta de empleados/comisiones.
- Saldos y archivo recuperable, categorías y desactivación, configuración confirmada.
- Servicio: recepción, diagnóstico y responsable capturado, cotización, autorización,
  reparación, herramienta lista, entrega y cobro sin duplicar SICAR.
- Dos sesiones independientes simulando equipos, doble clic, persistencia tras
  recarga y rechazo de una edición obsoleta.
- Internet caído antes de guardar: formulario abierto y sin éxito falso; reintento
  correcto al recuperar conexión.
- Respuesta perdida después del commit: recuperación tras recarga sin segundo pago.
- Edición del formulario después de perder la respuesta: se conserva el primer
  movimiento confirmado y no se crea otro con el importe modificado.
- Cuenta individual, sesión Secure/HttpOnly/SameSite Strict, CSRF, permisos efectivos,
  filtrado de sucursal, logout e invalidación de acceso posterior.
- Denegación de PDF de otra sucursal, rol sin permiso y acceso HTTP a rutas privadas.

El conjunto PHP también valida rollback de sobrepagos, relaciones, reversión de
comisiones al anular, saldos no negativos, reautorización de cotizaciones y dos
procesos que compiten por el mismo saldo. El registro de auditoría conserva la cuenta
real que ejecuta cada acción, separado del responsable capturado en formularios.

## Demostración disponible

En los artefactos de la ejecución:

- [Código de la demostración](https://github.com/may22gal/border-tools-sistema/actions/runs/39007166967/artifacts/12091003256): ZIP del commit probado, sin credenciales ni datos privados.
- [Evidencia visual y reporte](https://github.com/may22gal/border-tools-sistema/actions/runs/39007166967/artifacts/12091168018): capturas, reporte HTML, videos y log del servidor de prueba.

Los videos recorren las 23 pantallas y registran un gasto ficticio que sigue presente
al recargar. Los artefactos se conservan 14 días; código e instrucciones permanecen
en la rama. Para ejecutar la demo con Docker, ver [demo/README.md](../demo/README.md).
No se creó un Codespace ni se publicó una aplicación conectada en Internet.

## Alcance y pendientes

El resultado demuestra los escenarios enumerados; no garantiza todas las combinaciones
posibles de datos, roles y dispositivos. La revisión móvil fue emulada, no en teléfonos
físicos. No se realizó una comparación automática de píxeles con capturas anteriores.
No se alteraron los estilos ni el archivo original de la demo.

Antes de datos reales siguen pendientes la aceptación operativa, revisión de volumen,
validación del servidor autorizado, respaldo automatizado y restauración comprobada
de SQL/PDF/configuración, copia fuera del hosting y retención de PDF huérfanos.
Las reglas originales señaladas en FRONTEND_INTEGRATION.md se conservan para aceptación.
La importación Excel mantiene su alcance original; no se agregan integraciones nuevas.

No se modificaron main, cPanel, WordPress, WooCommerce ni su base de datos. Esta
entrega no constituye una autorización ni una puesta en producción.
