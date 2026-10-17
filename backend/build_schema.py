"""Development-only schema generator. No credentials, no application seed data."""
import json
from pathlib import Path
M='DECIMAL(18,2) NOT NULL DEFAULT 0'
T='VARCHAR(255) NOT NULL DEFAULT \'\''
D='DATE NULL'
B='BOOLEAN NOT NULL DEFAULT FALSE'
J='JSON NULL'
def fields(**kw): return kw
entities={
'categoriasGastos': fields(nombre=T,fijo=B,activo='BOOLEAN NOT NULL DEFAULT TRUE'),
'ventas':fields(fecha=D,sucursal=T,responsable=T,efectivo=M,transferencia=M,transferenciaStatus=T,tarjeta=M,cheque=M,credito=M,creditoAsignado=M,manoObra=M,totalVentaSicar=M,observacion='TEXT NULL',sicarArchivo=T,evidenciaId='CHAR(36) NULL'),
'facturacion':fields(folio=T,cliente=T,rfc=T,fecha=D,total=M,sucursal=T,estado=T),
'inventario':fields(tipo=T,producto=T,sku=T,cantidad='DECIMAL(18,4) NOT NULL DEFAULT 0',sucursal=T,responsable=T,fecha=D),
'ml':fields(producto=T,precio='DECIMAL(18,2) NULL',mercado=T,stock='DECIMAL(18,4) NOT NULL DEFAULT 0',sucursal=T,estado=T),
'oportunidades':fields(tipo=T,nombre=T,contacto=T,monto=M,sucursal=T,estado=T),
'servicio':fields(folio=T,cliente=T,tel=T,herramienta=T,modelo=T,serie=T,sucursal=T,falla='TEXT NULL',entrada=D,estado=T,diagnostico='TEXT NULL',diagnosticoCosto=M,diagnosticoCobrado=M,diagnosticoFechaCobro=D,diagnosticoMetodo=T,diagnosticoSicar=T,responsableDiagnostico=T,reparacionBruta=M,cotizacion=M,autorizado=B,entrega=D,cobro=M,cobrado=B,garantia=B,notas='TEXT NULL',formaPago=T,reparacionSicar=T),
'egresos':fields(fecha=D,grupo=T,concepto=T,categoria=T,proveedor=T,monto=M,sucursal=T,metodo=T,impactaCajaFisica=B,cajaSucursal=T,pagoAplazado=B,anulado=B,fechaAnulacion='DATETIME(6) NULL',origenCargoId='VARCHAR(64) NULL',origenId='VARCHAR(64) NULL',empleadoId='VARCHAR(64) NULL',periodo=T),
'nomina':fields(nombre=T,rol=T,sucursal=T,sueldo=M,ultimoPago=D,estado=T),
'comisiones':fields(nombre=T,sucursal=T,tipo=T,periodo=T,monto=M,estado=T,fechaPago=D,empleadoId='VARCHAR(64) NULL'),
'compras':fields(folio=T,proveedor=T,fecha=D,monto=M,sucursal=T,estado=T,entrega=D),
'clientesB2B':fields(nombre=T,contacto=T,sucursal=T,compras=M,credito=M,saldo=M),
'creditos':fields(cliente=T,clienteId='VARCHAR(64) NULL',fecha=D,sucursal=T,monto=M,saldo=M,estado=T,origenCorte='VARCHAR(64) NULL'),
'cobranzas':fields(fecha=D,creditoId='VARCHAR(64) NULL',clienteId='VARCHAR(64) NULL',cliente=T,sucursal=T,metodo=T,transferenciaStatus=T,monto=M,metodoOriginal=T),
'stockMin':fields(producto=T,sku=T,actual='DECIMAL(18,4) NOT NULL DEFAULT 0',minimo='DECIMAL(18,4) NOT NULL DEFAULT 0',sucursal=T),
'cortesCaja':fields(fecha=D,sucursal=T,fondo=M,esperado=M,contado=M,diferencia=M,retiro=M,queda=M,responsable=T,cajaId=T),
'cajaMovimientos':fields(fecha=D,sucursal=T,tipo=T,metodo=T,concepto=T,entrada=M,salida=M),
'saldos':fields(archived=B,cuenta=T,tipo=T,sucursal=T,saldo=M,fecha=D),
}
sql=['-- MySQL 8.0+, InnoDB; apply only to a NEW dedicated database. No DROP or TRUNCATE.',
'''CREATE TABLE schema_migrations (version VARCHAR(100) PRIMARY KEY, applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)) ENGINE=InnoDB;
CREATE TABLE branches (name VARCHAR(255) PRIMARY KEY) ENGINE=InnoDB;
INSERT INTO branches VALUES ('Granjero'), ('Troncoso');
CREATE TABLE roles (name VARCHAR(32) PRIMARY KEY) ENGINE=InnoDB;
INSERT INTO roles VALUES ('direccion'),('ventas_g'),('ventas_t'),('finanzas'),('facturacion'),('ecommerce'),('servicio');
CREATE TABLE users (id CHAR(36) PRIMARY KEY, username VARCHAR(100) NOT NULL UNIQUE, display_name VARCHAR(160) NOT NULL, password_hash VARCHAR(255) NOT NULL, role VARCHAR(32) NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, auth_version INT NOT NULL DEFAULT 1, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), FOREIGN KEY (role) REFERENCES roles(name)) ENGINE=InnoDB;
CREATE TABLE user_branches (user_id CHAR(36) NOT NULL, branch_name VARCHAR(255) NOT NULL, PRIMARY KEY(user_id,branch_name), FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(branch_name) REFERENCES branches(name)) ENGINE=InnoDB;
CREATE TABLE user_permissions (user_id CHAR(36) NOT NULL, permission VARCHAR(100) NOT NULL, allowed BOOLEAN NOT NULL, PRIMARY KEY(user_id,permission), FOREIGN KEY(user_id) REFERENCES users(id)) ENGINE=InnoDB;
CREATE TABLE app_settings (id INT PRIMARY KEY, config JSON NOT NULL, version BIGINT NOT NULL DEFAULT 1) ENGINE=InnoDB;
INSERT INTO app_settings VALUES (1, '{"diagnosticoEstandar":250,"requireTransferApproval":false,"moduleFlags":{}}', 1);
CREATE TABLE write_mutex (id INT PRIMARY KEY) ENGINE=InnoDB;
INSERT INTO write_mutex VALUES (1);
CREATE TABLE sequences (name VARCHAR(40) PRIMARY KEY, next_value BIGINT NOT NULL) ENGINE=InnoDB;
INSERT INTO sequences VALUES ('service',1027);
CREATE TABLE login_attempts (bucket CHAR(64) PRIMARY KEY, failures INT NOT NULL DEFAULT 0, blocked_until DATETIME(6) NULL, updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)) ENGINE=InnoDB;
CREATE TABLE requests (user_id CHAR(36) NOT NULL, request_key VARCHAR(100) NOT NULL, fingerprint CHAR(64) NOT NULL, response JSON NOT NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY(user_id,request_key), FOREIGN KEY(user_id) REFERENCES users(id)) ENGINE=InnoDB;
CREATE TABLE change_log (seq BIGINT AUTO_INCREMENT PRIMARY KEY, user_id CHAR(36) NOT NULL, action VARCHAR(100) NOT NULL, entity VARCHAR(100) NOT NULL, record_id VARCHAR(64) NULL, branch_name VARCHAR(255) NULL, before_data JSON NULL, after_data JSON NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), FOREIGN KEY(user_id) REFERENCES users(id), INDEX(branch_name,seq)) ENGINE=InnoDB;
CREATE TABLE evidence (id CHAR(36) PRIMARY KEY, storage_name VARCHAR(100) NOT NULL UNIQUE, original_name VARCHAR(255) NOT NULL, sha256 CHAR(64) NOT NULL, size_bytes BIGINT NOT NULL, branch_name VARCHAR(255) NOT NULL, uploaded_by CHAR(36) NOT NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), FOREIGN KEY(uploaded_by) REFERENCES users(id), FOREIGN KEY(branch_name) REFERENCES branches(name)) ENGINE=InnoDB;''']
uniques={'ventas':['fecha,sucursal'],'cortesCaja':['fecha,sucursal'],'stockMin':['sku,sucursal'],'categoriasGastos':['nombre'],'servicio':['folio'],'nomina':['nombre,sucursal'],'saldos':['cuenta']}
for name,cols in entities.items():
    defs=['`id` VARCHAR(64) PRIMARY KEY','`_version` BIGINT NOT NULL DEFAULT 1','`_createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)','`_updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)']
    defs += [f'`{k}` {v}' for k,v in cols.items()]
    defs += ['UNIQUE ('+','.join('`'+x+'`' for x in u.split(','))+')' for u in uniques.get(name,[])]
    if 'sucursal' in cols: defs += ['INDEX (`sucursal`)']
    if 'fecha' in cols: defs += ['INDEX (`fecha`)']
    sql += [f'CREATE TABLE `{name}` (\n  '+',\n  '.join(defs)+'\n) ENGINE=InnoDB;']
sql += ['''ALTER TABLE ventas ADD FOREIGN KEY(evidenciaId) REFERENCES evidence(id);
ALTER TABLE creditos ADD FOREIGN KEY(origenCorte) REFERENCES ventas(id), ADD FOREIGN KEY(clienteId) REFERENCES clientesB2B(id);
ALTER TABLE cobranzas ADD FOREIGN KEY(creditoId) REFERENCES creditos(id), ADD FOREIGN KEY(clienteId) REFERENCES clientesB2B(id), ADD CHECK(monto > 0);
ALTER TABLE comisiones ADD FOREIGN KEY(empleadoId) REFERENCES nomina(id);
ALTER TABLE egresos ADD FOREIGN KEY(origenCargoId) REFERENCES egresos(id), ADD FOREIGN KEY(empleadoId) REFERENCES nomina(id), ADD CHECK(monto > 0);
ALTER TABLE creditos ADD CHECK(saldo >= 0 AND saldo <= monto);
ALTER TABLE ventas ADD CHECK(creditoAsignado >= 0 AND creditoAsignado <= credito), ADD CHECK(manoObra >= 0 AND manoObra <= totalVentaSicar);
CREATE TABLE payroll_payments (expense_id VARCHAR(64) PRIMARY KEY, employee_id VARCHAR(64) NOT NULL, commission_id VARCHAR(64) NULL, FOREIGN KEY(expense_id) REFERENCES egresos(id), FOREIGN KEY(employee_id) REFERENCES nomina(id), FOREIGN KEY(commission_id) REFERENCES comisiones(id)) ENGINE=InnoDB;
CREATE TABLE service_items (id CHAR(36) PRIMARY KEY, service_id VARCHAR(64) NOT NULL, position INT NOT NULL, descripcion TEXT NOT NULL, monto DECIMAL(18,2) NOT NULL, FOREIGN KEY(service_id) REFERENCES servicio(id), CHECK(monto >= 0), UNIQUE(service_id,position)) ENGINE=InnoDB;
CREATE TABLE service_history (id BIGINT AUTO_INCREMENT PRIMARY KEY, service_id VARCHAR(64) NOT NULL, user_id CHAR(36) NOT NULL, texto TEXT NOT NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), FOREIGN KEY(service_id) REFERENCES servicio(id), FOREIGN KEY(user_id) REFERENCES users(id)) ENGINE=InnoDB;
CREATE TABLE expense_approvals (expense_id VARCHAR(64) PRIMARY KEY, state VARCHAR(20) NOT NULL, requested_by CHAR(36) NOT NULL, resolved_by CHAR(36) NULL, requested_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), resolved_at DATETIME(6) NULL, FOREIGN KEY(expense_id) REFERENCES egresos(id), FOREIGN KEY(requested_by) REFERENCES users(id), FOREIGN KEY(resolved_by) REFERENCES users(id)) ENGINE=InnoDB;
CREATE TABLE notifications (id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, texto TEXT NOT NULL, orden VARCHAR(64) NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), FOREIGN KEY(user_id) REFERENCES users(id)) ENGINE=InnoDB;
CREATE TABLE notification_reads (notification_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL, read_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY(notification_id,user_id), FOREIGN KEY(notification_id) REFERENCES notifications(id), FOREIGN KEY(user_id) REFERENCES users(id)) ENGINE=InnoDB;
INSERT INTO schema_migrations(version) VALUES ('001_initial');''']
root=Path(__file__).parent
(root/'migrations/001_initial.sql').write_text('\n\n'.join(sql)+'\n')
(root/'src/entities.json').write_text(json.dumps(entities,indent=2)+'\n')
