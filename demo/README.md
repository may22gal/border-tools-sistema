# Demostración del sistema existente conectado a MySQL

Esta demostración utiliza PHP 8.4 + MySQL 8.0 con la interfaz original.
No es una simulación de la API, no usa localStorage para registros y no contiene
información real. WordPress, cPanel y la demo de main quedan fuera.

## Ejecutar en una computadora con Docker
Desde la raíz de la rama migration/php-mysql:

```
sh demo/start-demo.sh
```

Abrir http://localhost:8080/app.php. El arranque muestra el usuario demo_direccion y
una contraseña temporal generada al crear el entorno. Las cuentas de prueba son
`demo_direccion`, `demo_finanzas`, `demo_ventas_g`, `demo_ventas_t`,
`demo_facturacion`, `demo_ecommerce`, `demo_servicio`. Comparten la contraseña de
prueba generada para ese entorno. Los nombres no corresponden a personas reales.
Si se reinicia un entorno existente, la contraseña se conserva. Se puede consultar
desde la raíz del repositorio con:

```
docker compose --env-file demo/.private/compose.env -f demo/compose.yml exec app php -r '$c=json_decode(file_get_contents("/private-demo/credentials.json"),true); echo $c["direccion"]["username"].PHP_EOL.$c["direccion"]["password"].PHP_EOL;'
```

Los datos ficticios cubren ambas sucursales, cortes SICAR, créditos, cobranza,
proveedores, gastos, nómina, comisiones, caja, saldos, servicio, facturación,
inventario, oportunidades, compras y seguimiento manual de Mercado Libre.

Abrir dos navegadores o dos perfiles con distintas cuentas para probar información
compartida. El sistema consulta cambios cada cinco segundos y al recuperar foco.
No refresca arrays debajo de un formulario abierto. Una edición obsoleta se rechaza,
sin sobrescribir la corrección hecha por otra persona.

La contraseña SQL se genera en demo/.private/compose.env, ignorado por Git.
Los PDF y configuración residen en un volumen privado, fuera del directorio público.
MySQL no publica un puerto al exterior; la app solo publica 127.0.0.1:8080.
Las capturas persisten entre reinicios del entorno mediante los volúmenes Docker.
`docker compose --env-file demo/.private/compose.env -f demo/compose.yml stop`
detiene la demo sin borrar sus volúmenes. No utilizar `down -v`
si se quiere conservar las pruebas. El seed se niega a sobrescribir una base con usuarios.

## Entorno de desarrollo opcional
`.devcontainer` prepara la misma aplicación y MySQL para un Codespace o VS Code.
Crear un entorno en la nube es opcional y puede consumir la cuota del proveedor;
no se ha creado ninguno automáticamente. La variante de desarrollo solo usa datos
ficticios y una base interna sin acceso público. No reutilizar esta configuración
para producción ni introducir información real.

## Qué se comprueba
GitHub Actions ejecuta las 23 pantallas en Chromium de escritorio y un viewport de
celular, más formularios y escenarios de red. El reporte incluye capturas de cada
pantalla. Se comprueban por separado el motor financiero original, transacciones y
concurrencia de MySQL. Los resultados exactos se registran al terminar la ejecución.

## Separación de la demo original
index.html permanece idéntico al original en main. `backend/public/app.php` lo
renderiza y añade el adaptador `assets/connected.js`. Se conservan sus estilos,
formularios, menús y cálculos. El selector libre de rol se convierte en el campo de
usuario individual dentro del mismo formulario de acceso. La etiqueta indica que
se está usando el sistema conectado. El reinicio local de ejemplos queda inhabilitado.
La importación Excel conserva su alcance original: identifica archivo, no importa datos.

## Límites de producción
No está instalado en cPanel. No introducir datos reales en estos entornos.
Faltan respaldos automáticos con restauración y aprobación explícita de instalación.
La sincronización es por consultas periódicas; no existe captura sin conexión.
Un fallo de red conserva el formulario y no anuncia un guardado inexistente.
Los identificadores de reintento se guardan en sessionStorage sin importes ni datos
administrativos, para comprobar envíos dudosos tras una recarga.
