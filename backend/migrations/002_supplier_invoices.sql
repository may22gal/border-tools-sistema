-- Only for an EXISTING schema created before supplier invoice support.
-- New installations already include these columns in 001_initial.sql.
-- Run once during a controlled deployment, before activating the new application.
ALTER TABLE compras ADD COLUMN facturaRegistrada BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN vencimiento DATE NULL;
ALTER TABLE egresos ADD COLUMN compraId VARCHAR(64) NULL, ADD FOREIGN KEY (compraId) REFERENCES compras(id);
INSERT INTO schema_migrations(version) VALUES ('002_supplier_invoices');
