# Correcciones de revisión

Finanzas y Reportes reciben una proyección mínima de facturas autorizadas por sucursal, aunque Compras/Proveedores estén deshabilitados. La proyección contiene importes, fechas e identificadores de relación; no nombres de proveedores ni acceso para editar. Los reportes consumen esa proyección. Ventas no la recibe.

Los saldos al cierre consideran si una anulación ocurrió después del período, incluidos pagos de tarjetas y pagos a proveedores anulados. Se interpreta la fecha de anulación UTC en America/Ciudad_Juarez. Esta corrección cubre anulaciones, no reconstruye versiones históricas de campos editados: no equivale a un cierre contable inmutable. Las salidas siguen el motor existente de movimientos vigentes.

La aplicación PHP carga ahora los scripts de impresión y el paquete incluye el conector QZ local. El botón Etiqueta abre recibo y etiqueta con sus destinos configurables. La política de conexión permite exclusivamente los puertos TLS habituales de QZ en localhost.qz.io, además de las conexiones existentes. No se instala software en las computadoras. La comprobación física y modelos siguen pendientes; puede haber confirmaciones de QZ.

CI se ejecuta también en main. No se cambió index.html ni se desplegó en cPanel. La demo estática sigue siendo local; activar datos compartidos requiere instalar la aplicación PHP y conciliar las capturas existentes.
