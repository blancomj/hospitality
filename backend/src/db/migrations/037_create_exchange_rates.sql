-- ============================================
-- TASAS DE CAMBIO DE REFERENCIA (CU-46)
-- Solo para mostrar precio aproximado, nunca para cobrar
-- ============================================
CREATE TABLE IF NOT EXISTS exchange_rates (
  currency_code CHAR(3) PRIMARY KEY,           -- 'USD', 'EUR', etc.
  rate_to_cop DECIMAL(12,4) NOT NULL,          -- 1 unidad de esta moneda = X COP
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Insertar tasas iniciales de referencia (actualizar con cron)
INSERT INTO exchange_rates (currency_code, rate_to_cop) VALUES
  ('USD', 4200.0000),
  ('EUR', 4500.0000),
  ('COP', 1.0000)
ON DUPLICATE KEY UPDATE rate_to_cop = VALUES(rate_to_cop);
