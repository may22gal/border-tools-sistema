-- MySQL 8.0+, InnoDB; apply only to a NEW dedicated database. No DROP or TRUNCATE.

CREATE TABLE schema_migrations (version VARCHAR(100) PRIMARY KEY, applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE branches (name VARCHAR(255) PRIMARY KEY) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO branches VALUES ('Granjero'), ('Troncoso');
CREATE TABLE roles (name VARCHAR(32) PRIMARY KEY) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO roles VALUES ('direccion'),('ventas_g'),('ventas_t'),('finanzas'),('facturacion'),('ecommerce'),('servicio');
CREATE TABLE users (id CHAR(36) PRIMARY KEY, username VARCHAR(100) NOT NULL UNIQUE, display_name VARCHAR(160) NOT NULL, password_hash VARCHAR(255) NOT NULL, role VARCHAR(32) NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, auth_version INT NOT NULL DEFAULT 1, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), FOREIGN KEY (role) REFERENCES roles(name)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE user_branches (user_id CHAR(36) NOT NULL, branch_name VARCHAR(255) NOT NULL, PRIMARY KEY(user_id,branch_name), FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(branch_name) REFERENCES branches(name)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE user_permissions (user_id CHAR(36) NOT NULL, permission VARCHAR(100) NOT NULL, allowed BOOLEAN NOT NULL, PRIMARY KEY(user_id,permission), FOREIGN KEY(user_id) REFERENCES users(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE app_settings (id INT PRIMARY KEY, config JSON NOT NULL, version BIGINT NOT NULL DEFAULT 1) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO app_settings VALUES (1, '{"diagnosticoEstandar":250,"requireTransferApproval":false,"moduleFlags":{}}', 1);
CREATE TABLE write_mutex (id INT PRIMARY KEY) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO write_mutex VALUES (1);
CREATE TABLE sequences (name VARCHAR(40) PRIMARY KEY, next_value BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO sequences VALUES ('service',1027);
CREATE TABLE login_attempts (bucket CHAR(64) PRIMARY KEY, failures INT NOT NULL DEFAULT 0, blocked_until DATETIME(6) NULL, updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE requests (user_id CHAR(36) NOT NULL, request_key VARCHAR(100) NOT NULL, fingerprint CHAR(64) NOT NULL, response JSON NOT NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY(user_id,request_key), FOREIGN KEY(user_id) REFERENCES users(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE change_log (seq BIGINT AUTO_INCREMENT PRIMARY KEY, user_id CHAR(36) NOT NULL, action VARCHAR(100) NOT NULL, entity VARCHAR(100) NOT NULL, record_id VARCHAR(64) NULL, branch_name VARCHAR(255) NULL, before_data JSON NULL, after_data JSON NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), FOREIGN KEY(user_id) REFERENCES users(id), INDEX(branch_name,seq)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE evidence (id CHAR(36) PRIMARY KEY, storage_name VARCHAR(100) NOT NULL UNIQUE, original_name VARCHAR(255) NOT NULL, sha256 CHAR(64) NOT NULL, size_bytes BIGINT NOT NULL, branch_name VARCHAR(255) NOT NULL, uploaded_by CHAR(36) NOT NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), FOREIGN KEY(uploaded_by) REFERENCES users(id), FOREIGN KEY(branch_name) REFERENCES branches(name)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `categoriasGastos` (
  `id` VARCHAR(64) PRIMARY KEY,
  `_version` BIGINT NOT NULL DEFAULT 1,
  `_createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `_updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `nombre` VARCHAR(255) NOT NULL DEFAULT '',
  `fijo` BOOLEAN NOT NULL DEFAULT FALSE,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ventas` (
  `id` VARCHAR(64) PRIMARY KEY,
  `_version` BIGINT NOT NULL DEFAULT 1,
  `_createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `_updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `fecha` DATE NULL,
  `sucursal` VARCHAR(255) NOT NULL DEFAULT '',
  `responsable` VARCHAR(255) NOT NULL DEFAULT '',
  `efectivo` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `transferencia` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `transferenciaStatus` VARCHAR(255) NOT NULL DEFAULT '',
  `tarjeta` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `cheque` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `credito` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `creditoAsignado` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `manoObra` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `totalVentaSicar` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `observacion` TEXT NULL,
  `sicarArchivo` VARCHAR(255) NOT NULL DEFAULT '',
  `evidenciaId` CHAR(36) NULL,
  UNIQUE (`fecha`,`sucursal`),
  INDEX (`sucursal`),
  INDEX (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `facturacion` (
  `id` VARCHAR(64) PRIMARY KEY,
  `_version` BIGINT NOT NULL DEFAULT 1,
  `_createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `_updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `folio` VARCHAR(255) NOT NULL DEFAULT '',
  `cliente` VARCHAR(255) NOT NULL DEFAULT '',
  `rfc` VARCHAR(255) NOT NULL DEFAULT '',
  `fecha` DATE NULL,
  `total` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `sucursal` VARCHAR(255) NOT NULL DEFAULT '',
  `estado` VARCHAR(255) NOT NULL DEFAULT '',
  INDEX (`sucursal`),
  INDEX (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `inventario` (
  `id` VARCHAR(64) PRIMARY KEY,
  `_version` BIGINT NOT NULL DEFAULT 1,
  `_createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `_updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `tipo` VARCHAR(255) NOT NULL DEFAULT '',
  `producto` VARCHAR(255) NOT NULL DEFAULT '',
  `sku` VARCHAR(255) NOT NULL DEFAULT '',
  `cantidad` DECIMAL(18,4) NOT NULL DEFAULT 0,
  `sucursal` VARCHAR(255) NOT NULL DEFAULT '',
  `responsable` VARCHAR(255) NOT NULL DEFAULT '',
  `fecha` DATE NULL,
  INDEX (`sucursal`),
  INDEX (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ml` (
  `id` VARCHAR(64) PRIMARY KEY,
  `_version` BIGINT NOT NULL DEFAULT 1,
  `_createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `_updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `producto` VARCHAR(255) NOT NULL DEFAULT '',
  `precio` DECIMAL(18,2) NULL,
  `mercado` VARCHAR(255) NOT NULL DEFAULT '',
  `stock` DECIMAL(18,4) NOT NULL DEFAULT 0,
  `sucursal` VARCHAR(255) NOT NULL DEFAULT '',
  `estado` VARCHAR(255) NOT NULL DEFAULT '',
  INDEX (`sucursal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `oportunidades` (
  `id` VARCHAR(64) PRIMARY KEY,
  `_version` BIGINT NOT NULL DEFAULT 1,
  `_createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `_updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `tipo` VARCHAR(255) NOT NULL DEFAULT '',
  `nombre` VARCHAR(255) NOT NULL DEFAULT '',
  `contacto` VARCHAR(255) NOT NULL DEFAULT '',
  `monto` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `sucursal` VARCHAR(255) NOT NULL DEFAULT '',
  `estado` VARCHAR(255) NOT NULL DEFAULT '',
  INDEX (`sucursal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `servicio` (
  `id` VARCHAR(64) PRIMARY KEY,
  `_version` BIGINT NOT NULL DEFAULT 1,
  `_createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `_updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `folio` VARCHAR(255) NOT NULL DEFAULT '',
  `cliente` VARCHAR(255) NOT NULL DEFAULT '',
  `tel` VARCHAR(255) NOT NULL DEFAULT '',
  `herramienta` VARCHAR(255) NOT NULL DEFAULT '',
  `modelo` VARCHAR(255) NOT NULL DEFAULT '',
  `serie` VARCHAR(255) NOT NULL DEFAULT '',
  `sucursal` VARCHAR(255) NOT NULL DEFAULT '',
  `falla` TEXT NULL,
  `entrada` DATE NULL,
  `estado` VARCHAR(255) NOT NULL DEFAULT '',
  `diagnostico` TEXT NULL,
  `diagnosticoCosto` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `diagnosticoCobrado` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `diagnosticoFechaCobro` DATE NULL,
  `diagnosticoMetodo` VARCHAR(255) NOT NULL DEFAULT '',
  `diagnosticoSicar` VARCHAR(255) NOT NULL DEFAULT '',
  `responsableDiagnostico` VARCHAR(255) NOT NULL DEFAULT '',
  `reparacionBruta` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `cotizacion` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `autorizado` BOOLEAN NOT NULL DEFAULT FALSE,
  `entrega` DATE NULL,
  `cobro` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `cobrado` BOOLEAN NOT NULL DEFAULT FALSE,
  `garantia` BOOLEAN NOT NULL DEFAULT FALSE,
  `notas` TEXT NULL,
  `formaPago` VARCHAR(255) NOT NULL DEFAULT '',
  `reparacionSicar` VARCHAR(255) NOT NULL DEFAULT '',
  UNIQUE (`folio`),
  INDEX (`sucursal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `egresos` (
  `id` VARCHAR(64) PRIMARY KEY,
  `_version` BIGINT NOT NULL DEFAULT 1,
  `_createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `_updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `fecha` DATE NULL,
  `grupo` VARCHAR(255) NOT NULL DEFAULT '',
  `concepto` VARCHAR(255) NOT NULL DEFAULT '',
  `categoria` VARCHAR(255) NOT NULL DEFAULT '',
  `proveedor` VARCHAR(255) NOT NULL DEFAULT '',
  `monto` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `sucursal` VARCHAR(255) NOT NULL DEFAULT '',
  `metodo` VARCHAR(255) NOT NULL DEFAULT '',
  `impactaCajaFisica` BOOLEAN NOT NULL DEFAULT FALSE,
  `cajaSucursal` VARCHAR(255) NOT NULL DEFAULT '',
  `pagoAplazado` BOOLEAN NOT NULL DEFAULT FALSE,
  `anulado` BOOLEAN NOT NULL DEFAULT FALSE,
  `fechaAnulacion` DATETIME(6) NULL,
  `origenCargoId` VARCHAR(64) NULL,
  `origenId` VARCHAR(64) NULL,
  `empleadoId` VARCHAR(64) NULL,
  `periodo` VARCHAR(255) NOT NULL DEFAULT '',
  INDEX (`sucursal`),
  INDEX (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `nomina` (
  `id` VARCHAR(64) PRIMARY KEY,
  `_version` BIGINT NOT NULL DEFAULT 1,
  `_createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `_updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `nombre` VARCHAR(255) NOT NULL DEFAULT '',
  `rol` VARCHAR(255) NOT NULL DEFAULT '',
  `sucursal` VARCHAR(255) NOT NULL DEFAULT '',
  `sueldo` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `ultimoPago` DATE NULL,
  `estado` VARCHAR(255) NOT NULL DEFAULT '',
  UNIQUE (`nombre`,`sucursal`),
  INDEX (`sucursal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `comisiones` (
  `id` VARCHAR(64) PRIMARY KEY,
  `_version` BIGINT NOT NULL DEFAULT 1,
  `_createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `_updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `nombre` VARCHAR(255) NOT NULL DEFAULT '',
  `sucursal` VARCHAR(255) NOT NULL DEFAULT '',
  `tipo` VARCHAR(255) NOT NULL DEFAULT '',
  `periodo` VARCHAR(255) NOT NULL DEFAULT '',
  `monto` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `estado` VARCHAR(255) NOT NULL DEFAULT '',
  `fechaPago` DATE NULL,
  `empleadoId` VARCHAR(64) NULL,
  INDEX (`sucursal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `compras` (
  `id` VARCHAR(64) PRIMARY KEY,
  `_version` BIGINT NOT NULL DEFAULT 1,
  `_createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `_updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `folio` VARCHAR(255) NOT NULL DEFAULT '',
  `proveedor` VARCHAR(255) NOT NULL DEFAULT '',
  `fecha` DATE NULL,
  `monto` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `sucursal` VARCHAR(255) NOT NULL DEFAULT '',
  `estado` VARCHAR(255) NOT NULL DEFAULT '',
  `entrega` DATE NULL,
  INDEX (`sucursal`),
  INDEX (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `clientesB2B` (
  `id` VARCHAR(64) PRIMARY KEY,
  `_version` BIGINT NOT NULL DEFAULT 1,
  `_createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `_updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `nombre` VARCHAR(255) NOT NULL DEFAULT '',
  `contacto` VARCHAR(255) NOT NULL DEFAULT '',
  `sucursal` VARCHAR(255) NOT NULL DEFAULT '',
  `compras` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `credito` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `saldo` DECIMAL(18,2) NOT NULL DEFAULT 0,
  INDEX (`sucursal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `creditos` (
  `id` VARCHAR(64) PRIMARY KEY,
  `_version` BIGINT NOT NULL DEFAULT 1,
  `_createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `_updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `cliente` VARCHAR(255) NOT NULL DEFAULT '',
  `clienteId` VARCHAR(64) NULL,
  `fecha` DATE NULL,
  `sucursal` VARCHAR(255) NOT NULL DEFAULT '',
  `monto` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `saldo` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `estado` VARCHAR(255) NOT NULL DEFAULT '',
  `origenCorte` VARCHAR(64) NULL,
  INDEX (`sucursal`),
  INDEX (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cobranzas` (
  `id` VARCHAR(64) PRIMARY KEY,
  `_version` BIGINT NOT NULL DEFAULT 1,
  `_createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `_updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `fecha` DATE NULL,
  `creditoId` VARCHAR(64) NULL,
  `clienteId` VARCHAR(64) NULL,
  `cliente` VARCHAR(255) NOT NULL DEFAULT '',
  `sucursal` VARCHAR(255) NOT NULL DEFAULT '',
  `metodo` VARCHAR(255) NOT NULL DEFAULT '',
  `transferenciaStatus` VARCHAR(255) NOT NULL DEFAULT '',
  `monto` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `metodoOriginal` VARCHAR(255) NOT NULL DEFAULT '',
  INDEX (`sucursal`),
  INDEX (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `stockMin` (
  `id` VARCHAR(64) PRIMARY KEY,
  `_version` BIGINT NOT NULL DEFAULT 1,
  `_createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `_updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `producto` VARCHAR(255) NOT NULL DEFAULT '',
  `sku` VARCHAR(255) NOT NULL DEFAULT '',
  `actual` DECIMAL(18,4) NOT NULL DEFAULT 0,
  `minimo` DECIMAL(18,4) NOT NULL DEFAULT 0,
  `sucursal` VARCHAR(255) NOT NULL DEFAULT '',
  UNIQUE (`sku`,`sucursal`),
  INDEX (`sucursal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cortesCaja` (
  `id` VARCHAR(64) PRIMARY KEY,
  `_version` BIGINT NOT NULL DEFAULT 1,
  `_createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `_updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `fecha` DATE NULL,
  `sucursal` VARCHAR(255) NOT NULL DEFAULT '',
  `fondo` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `esperado` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `contado` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `diferencia` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `retiro` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `queda` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `responsable` VARCHAR(255) NOT NULL DEFAULT '',
  `cajaId` VARCHAR(255) NOT NULL DEFAULT '',
  UNIQUE (`fecha`,`sucursal`),
  INDEX (`sucursal`),
  INDEX (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cajaMovimientos` (
  `id` VARCHAR(64) PRIMARY KEY,
  `_version` BIGINT NOT NULL DEFAULT 1,
  `_createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `_updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `fecha` DATE NULL,
  `sucursal` VARCHAR(255) NOT NULL DEFAULT '',
  `tipo` VARCHAR(255) NOT NULL DEFAULT '',
  `metodo` VARCHAR(255) NOT NULL DEFAULT '',
  `concepto` VARCHAR(255) NOT NULL DEFAULT '',
  `entrada` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `salida` DECIMAL(18,2) NOT NULL DEFAULT 0,
  INDEX (`sucursal`),
  INDEX (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `saldos` (
  `id` VARCHAR(64) PRIMARY KEY,
  `_version` BIGINT NOT NULL DEFAULT 1,
  `_createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `_updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `archived` BOOLEAN NOT NULL DEFAULT FALSE,
  `cuenta` VARCHAR(255) NOT NULL DEFAULT '',
  `tipo` VARCHAR(255) NOT NULL DEFAULT '',
  `sucursal` VARCHAR(255) NOT NULL DEFAULT '',
  `saldo` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `fecha` DATE NULL,
  UNIQUE (`cuenta`),
  INDEX (`sucursal`),
  INDEX (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE ventas ADD FOREIGN KEY(evidenciaId) REFERENCES evidence(id);
ALTER TABLE creditos ADD FOREIGN KEY(origenCorte) REFERENCES ventas(id), ADD FOREIGN KEY(clienteId) REFERENCES clientesB2B(id);
ALTER TABLE cobranzas ADD FOREIGN KEY(creditoId) REFERENCES creditos(id), ADD FOREIGN KEY(clienteId) REFERENCES clientesB2B(id), ADD CHECK(monto > 0);
ALTER TABLE comisiones ADD FOREIGN KEY(empleadoId) REFERENCES nomina(id);
ALTER TABLE egresos ADD FOREIGN KEY(origenCargoId) REFERENCES egresos(id), ADD FOREIGN KEY(empleadoId) REFERENCES nomina(id), ADD CHECK(monto > 0);
ALTER TABLE creditos ADD CHECK(saldo >= 0 AND saldo <= monto);
ALTER TABLE ventas ADD CHECK(creditoAsignado >= 0 AND creditoAsignado <= credito), ADD CHECK(manoObra >= 0 AND manoObra <= totalVentaSicar);
CREATE TABLE payroll_payments (expense_id VARCHAR(64) PRIMARY KEY, employee_id VARCHAR(64) NOT NULL, commission_id VARCHAR(64) NULL, FOREIGN KEY(expense_id) REFERENCES egresos(id), FOREIGN KEY(employee_id) REFERENCES nomina(id), FOREIGN KEY(commission_id) REFERENCES comisiones(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE service_items (id CHAR(36) PRIMARY KEY, service_id VARCHAR(64) NOT NULL, position INT NOT NULL, descripcion TEXT NOT NULL, monto DECIMAL(18,2) NOT NULL, FOREIGN KEY(service_id) REFERENCES servicio(id), CHECK(monto >= 0), UNIQUE(service_id,position)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE service_history (id BIGINT AUTO_INCREMENT PRIMARY KEY, service_id VARCHAR(64) NOT NULL, user_id CHAR(36) NOT NULL, texto TEXT NOT NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), FOREIGN KEY(service_id) REFERENCES servicio(id), FOREIGN KEY(user_id) REFERENCES users(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE expense_approvals (expense_id VARCHAR(64) PRIMARY KEY, state VARCHAR(20) NOT NULL, requested_by CHAR(36) NOT NULL, resolved_by CHAR(36) NULL, requested_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), resolved_at DATETIME(6) NULL, FOREIGN KEY(expense_id) REFERENCES egresos(id), FOREIGN KEY(requested_by) REFERENCES users(id), FOREIGN KEY(resolved_by) REFERENCES users(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE notifications (id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, texto TEXT NOT NULL, orden VARCHAR(64) NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), FOREIGN KEY(user_id) REFERENCES users(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE notification_reads (notification_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL, read_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY(notification_id,user_id), FOREIGN KEY(notification_id) REFERENCES notifications(id), FOREIGN KEY(user_id) REFERENCES users(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
ALTER TABLE ventas ADD CHECK(sucursal IN ('Granjero','Troncoso')), ADD CHECK(efectivo>=0 AND transferencia>=0 AND tarjeta>=0 AND cheque>=0 AND credito>=0 AND totalVentaSicar>0);
ALTER TABLE creditos ADD CHECK(sucursal IN ('Granjero','Troncoso'));
ALTER TABLE cobranzas ADD CHECK(sucursal IN ('Granjero','Troncoso'));
ALTER TABLE servicio ADD CHECK(sucursal IN ('Granjero','Troncoso'));
ALTER TABLE cortesCaja ADD CHECK(sucursal IN ('Granjero','Troncoso')), ADD CHECK(contado>=0 AND retiro>=0 AND retiro<=contado AND fondo>=0);
ALTER TABLE egresos ADD CHECK(sucursal IN ('Granjero','Troncoso','Ambas')), ADD CHECK(impactaCajaFisica=0 OR (metodo='Efectivo' AND cajaSucursal IN ('Granjero','Troncoso')));
INSERT INTO categoriasGastos(id,nombre,fijo,activo) VALUES
(UUID(),'SAT / Impuestos',1,1),(UUID(),'IMSS / SIPARE',1,1),(UUID(),'ISN',1,1),(UUID(),'Infonavit',1,1),(UUID(),'Renta',1,1),(UUID(),'Luz',1,1),(UUID(),'Agua',1,1),(UUID(),'Internet / Telefonía',1,1),(UUID(),'Contador',1,1),(UUID(),'SICAR / Software',1,1),(UUID(),'Comisión terminal',1,1),(UUID(),'Consumibles',0,1),(UUID(),'Papelería',0,1),(UUID(),'Mantenimiento',0,1),(UUID(),'Pago de tarjeta de crédito',0,1),(UUID(),'Otros',0,1);
INSERT INTO schema_migrations(version) VALUES ('001_initial');
