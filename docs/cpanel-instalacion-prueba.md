# Paquete para revisión de instalación en cPanel

Preparación de una instalación de prueba, exclusivamente con información ficticia.
No autoriza publicación, creación de tablas, cuentas, cron ni cambios de cPanel.
La interfaz y los tres controladores PHP originales se copian sin modificaciones.

## Construcción

Desde un checkout de `migration/php-mysql`, usar el SHA completo del commit:

```sh
python3 tools/build_cpanel_package.py --source-commit COMMIT_SHA_COMPLETO --output /ruta/nueva/paquete
```

El constructor no instala nada, no accede a redes ni lee configuraciones privadas.
Valida el blob original de la interfaz y crea archivos con hashes SHA-256.
Se niega a sobrescribir un paquete anterior. No empacar el repositorio completo
ni extraer `private.zip` dentro de una carpeta pública.

| Archivo | Destino propuesto, solo después de autorización |
|---|---|
| private.zip | Extraer en `/home/btools`, creando `/home/btools/bt-admin-private` |
| public.zip | Extraer solamente en `/home/btools/public_html/bt-admin-public` |
| apache-subdomain.fragment | Revisar y fusionar en el `.htaccess` del subdominio |
| manifest.json | Conservar fuera de la carpeta pública para verificar el paquete |

`public.zip` contiene cuatro archivos: app.php, index.php, evidence.php y el
adaptador assets/connected.js. No incluye .htaccess, para evitar sobrescribir
el archivo existente ni las instrucciones de PHP generadas por cPanel.
Los controladores públicos cargan el código original de la carpeta privada.
La configuración solo se aplica a cada solicitud del sistema administrativo.

La carpeta privada contiene código, SQL, interfaz original, herramientas CLI,
sembrador ficticio y carpetas vacías de PDF y sesiones. No incluye config.php,
contraseñas SQL, cuentas activadas, documentos ni datos del negocio.
Sin configuración privada, los accesos públicos responden 503.

## Estado del hosting comprobado el 19 de octubre de 2026

PHP 8.4.26; MySQL 8.0.37; PDO MySQL, OpenSSL, mbstring y fileinfo disponibles.
Consulta SELECT y apertura/rollback de transacción confirmados con el usuario
`btools_sistema_app` sobre `btools_sistema`. La base se mantiene sin tablas.
El usuario tiene SELECT, INSERT, UPDATE y DELETE, sin permisos de estructura.
El subdominio usa una carpeta propia dentro de public_html, no la raíz de WordPress.
HTTPS accesible; listado de directorios desactivado. Los diagnósticos temporales
fueron retirados; la contraseña usada para la prueba fue vaciada antes de retirar
su archivo privado. La copia anterior de .htaccess sigue en tmp, fuera del webroot.

## Secuencia propuesta para autorizar

1. Confirmar que las rutas nuevas privadas no existen y que la base está vacía.
   Guardar copia pequeña del .htaccess del subdominio. No es un respaldo del hosting.
2. Extraer cada ZIP en su destino y verificar el manifiesto. Confirmar permisos
   0700 en carpetas privadas y 0600 en configuración/contraseñas; archivos públicos
   0644. Comprobar los permisos efectivos después de extraer con cPanel.
3. Crear config.php desde el ejemplo en la carpeta privada. La contraseña SQL
   se captura únicamente en db-password.txt privado, permisos 0600, sin enviarla
   por chat ni publicarla en el repositorio. El ejemplo exige HTTPS y usa origen exacto.
4. Importar el SQL original solamente en btools_sistema, mediante phpMyAdmin o
   una herramienta CLI autorizada con permisos para crear tablas. El usuario de
   ejecución conserva sus cuatro permisos. El esquema no contiene DROP; MySQL
   confirma DDL implícitamente, de modo que una importación parcial exige revisión.
5. Preparar cuentas y datos ficticios con las herramientas CLI privadas. Confirmar
   antes un medio autorizado para ejecutarlas: no se ha confirmado Terminal/SSH.
   Si se usa una tarea cron temporal, necesita autorización y retirarla al terminar.
   No convertir estas herramientas en instaladores web públicos. demo/seed.php
   solo funciona con PHP CLI y BT_DEMO=1; nunca ejecutar en una base con datos reales.
   Su configuración auxiliar de demostración no debe sustituir el config.php HTTPS.
6. Fusionar el fragmento Apache únicamente en el .htaccess del subdominio,
   conservando PHP de cPanel. DirectoryIndex app.php abre la interfaz en la raíz.
7. Verificar HTTPS, errores sin secretos, sesiones, API, permisos por rol/sucursal,
   PDF privado, pagos y dos sesiones/equipos. Revisar PC y teléfono físico.

## Respaldo y producción

El paquete no es un respaldo de los datos. Antes de introducir información real
faltan respaldos de SQL, PDF y configuración, copia fuera del hosting y una
restauración comprobada en una base aparte. No usar WordPress como destino de
pruebas ni cambiar su base, archivos, PHP, plugins, dominio o DNS.

La prueba de SELECT y rollback confirma conexión y transacciones básicas, no
certifica los 23 módulos instalados en este hosting. La aceptación operativa,
pruebas de carga y retención de PDF huérfanos siguen pendientes para producción.
