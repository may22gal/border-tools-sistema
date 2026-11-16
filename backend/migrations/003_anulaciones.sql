-- Only for an EXISTING schema created before direct voids (abonos, supplier invoices, cash movements).
-- New installations already include these columns in 001_initial.sql.
-- Run once during a controlled deployment, before activating the new application. No data is changed.
ALTER TABLE cobranzas ADD COLUMN anulado BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN fechaAnulacion DATETIME(6) NULL, ADD COLUMN motivoAnulacion TEXT NULL;
ALTER TABLE compras ADD COLUMN anulado BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN fechaAnulacion DATETIME(6) NULL, ADD COLUMN motivoAnulacion TEXT NULL;
ALTER TABLE cajaMovimientos ADD COLUMN anulado BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN fechaAnulacion DATETIME(6) NULL, ADD COLUMN motivoAnulacion TEXT NULL;
ALTER TABLE egresos ADD COLUMN motivoAnulacion TEXT NULL;
INSERT INTO schema_migrations(version) VALUES ('003_anulaciones');
