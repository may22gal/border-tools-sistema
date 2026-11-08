# Demo en Vercel y destino definitivo

Vercel publica una demo local desde `dist`, generada con `node tools/build_vercel_demo.mjs`.
El HTML original permanece intacto para mantener el paquete PHP/MySQL revisado.
La construcción solo copia el HTML y los assets públicos permitidos; no publica código PHP, migraciones, archivos privados ni configuración de servidor.

Las dos versiones usan los mismos scripts de proveedores, reportes e impresión de `backend/public/assets`. Los cambios a esas pantallas se reflejan en ambas al reconstruir/publicar. Solo `demo/static/demo-adapter.js` simula la persistencia de las nuevas facturas y pagos mediante localStorage. No se incluye en PHP.

## Probar

Entrar como Finanzas o Dirección, Pago a proveedores, Registrar factura pendiente. Registrar un pago con tarjeta y liquidarlo desde Gastos generales en otro mes. Comparar en Finanzas / Reportes, Compras vs. salidas de dinero. Para impresión entrar a Centro de Diagnóstico y abrir Etiqueta en una orden.

La demo mantiene la clave de almacenamiento anterior para no borrar lo capturado. No transforma pagos antiguos en facturas por pagar ni cambia sus importes. Se recomienda usar datos ficticios. No autentica contraseñas y no sincroniza equipos; los perfiles permiten revisar navegación, no son una barrera de seguridad. En modo de impresión directa se envían trabajos reales si QZ y la impresora están conectados.

## Llevar al hosting definitivo

El destino sigue siendo Sivendex u otro servidor PHP/MySQL compatible. Construir con `tools/build_cpanel_package.py`, instalar en un subdominio independiente, aplicar las migraciones que correspondan y configurar la base de datos y sesiones. Nunca copiar `dist` como sustituto del backend ni incluir `demo-adapter.js` en la instalación conectada.

Los datos de prueba no se convierten automáticamente en datos de producción. Antes del inicio real, respaldar y conciliar cualquier captura que se quiera conservar mediante una importación revisada. Las impresoras se configuran de nuevo al cambiar de dominio, porque sus preferencias pertenecen a cada navegador y origen.

## Verificar

`node tools/build_vercel_demo.mjs`, `node demo/tests/adapter.cjs` y `node demo/tests/preview.cjs` (requiere Playwright con Chromium). El flujo de GitHub Actions prueba escritorio y móvil. La suite PHP/MySQL existente sigue verificando la versión conectada.

## Ayuda para usuarios

`backend/public/assets/help.js` agrega el botón ❓ arriba a la derecha y «Ayuda y preguntas» al final del menú, en la demo y en la versión PHP/MySQL. Tiene buscador por palabras (sin importar acentos) y solo muestra los temas de las secciones que el usuario puede abrir. Para agregar o cambiar preguntas, editar la lista `TOPICS` de ese archivo.
