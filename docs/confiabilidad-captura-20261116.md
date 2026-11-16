# Confiabilidad de captura (16 nov 2026)

Prioridades 1 y 4 de la revisión del 16 de noviembre. Solo cambia `backend/public/assets/connected.js`; el servidor, la base de datos y los procesos no cambian.

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
