-- Migration 446: Crear tabla de tarifas de transporte a terminales aéreos y poblar datos según resolución
-- Fecha: 2026-09-24

CREATE TABLE IF NOT EXISTS travel_expenses.tarifas_transporte_terminal (
  id serial PRIMARY KEY,
  departamento varchar(100) NOT NULL DEFAULT '',
  departamento_id integer NULL,
  ciudad varchar(100) NULL,
  ciudad_aeropuerto varchar(150) NOT NULL,
  valor_maximo numeric(12,2) NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamp NOT NULL DEFAULT now(),
  actualizado_en timestamp NOT NULL DEFAULT now()
);

-- Asegurar columnas departamento y departamento_id si la tabla ya existía
ALTER TABLE travel_expenses.tarifas_transporte_terminal ADD COLUMN IF NOT EXISTS departamento varchar(100) DEFAULT '';
ALTER TABLE travel_expenses.tarifas_transporte_terminal ADD COLUMN IF NOT EXISTS departamento_id integer NULL;
ALTER TABLE travel_expenses.tarifas_transporte_terminal ADD COLUMN IF NOT EXISTS ciudad varchar(100) NULL;

CREATE INDEX IF NOT EXISTS idx_tarifas_transporte_terminal_departamento ON travel_expenses.tarifas_transporte_terminal(departamento);
CREATE INDEX IF NOT EXISTS idx_tarifas_transporte_terminal_depto_id ON travel_expenses.tarifas_transporte_terminal(departamento_id);

-- Insertar tarifas iniciales si está vacía
INSERT INTO travel_expenses.tarifas_transporte_terminal (departamento, departamento_id, ciudad, ciudad_aeropuerto, valor_maximo, activo)
SELECT departamento, departamento_id, ciudad, ciudad_aeropuerto, valor_maximo, activo FROM (VALUES
  ('Antioquia', 5, 'ANTIOQUIA', 'ANTIOQUIA (Rionegro)', 162634.00, true),
  ('Atlántico', 8, 'ATLANTICO', 'ATLANTICO (Soledad)', 130704.00, true),
  ('Córdoba', 23, 'CORDOBA', 'CORDOBA (Los Garzones)', 118731.00, true),
  ('Magdalena', 47, 'MAGDALENA', 'MAGDALENA (Santa Marta)', 129708.00, true),
  ('Nariño', 52, 'NARIÑO', 'NARIÑO (Chachagui)', 186581.00, true),
  ('Otros', NULL, 'Otros', 'Otros', 50689.00, true),
  ('Putumayo', 86, 'PUTUMAYO', 'PUTUMAYO (Puerto Asís)', 93788.00, true),
  ('Quindío', 63, 'QUINDIO (ARMENIA)', 'QUNDIO (La Tebaida)', 186581.00, true),
  ('Santander', 68, 'SANTANDER', 'SANTANDER (Lebrija)', 186581.00, true),
  ('Sucre', 70, 'SUCRE', 'SUCRE (Corozal)', 162634.00, true),
  ('Valle del Cauca', 76, 'VALLE DEL CAUCA', 'VALLE DEL CAUCA (Palmira)', 186581.00, true)
) AS v(departamento, departamento_id, ciudad, ciudad_aeropuerto, valor_maximo, activo)
WHERE NOT EXISTS (SELECT 1 FROM travel_expenses.tarifas_transporte_terminal);

-- Si ya existían registros antiguos sin departamento, actualizar sus valores
UPDATE travel_expenses.tarifas_transporte_terminal SET departamento = 'Antioquia', departamento_id = 5 WHERE (departamento IS NULL OR departamento = '') AND (ciudad ILIKE '%antioquia%' OR ciudad_aeropuerto ILIKE '%rionegro%');
UPDATE travel_expenses.tarifas_transporte_terminal SET departamento = 'Atlántico', departamento_id = 8 WHERE (departamento IS NULL OR departamento = '') AND (ciudad ILIKE '%atlantico%' OR ciudad_aeropuerto ILIKE '%soledad%');
UPDATE travel_expenses.tarifas_transporte_terminal SET departamento = 'Córdoba', departamento_id = 23 WHERE (departamento IS NULL OR departamento = '') AND (ciudad ILIKE '%cordoba%' OR ciudad_aeropuerto ILIKE '%garzones%');
UPDATE travel_expenses.tarifas_transporte_terminal SET departamento = 'Magdalena', departamento_id = 47 WHERE (departamento IS NULL OR departamento = '') AND (ciudad ILIKE '%magdalena%' OR ciudad_aeropuerto ILIKE '%santa marta%');
UPDATE travel_expenses.tarifas_transporte_terminal SET departamento = 'Nariño', departamento_id = 52 WHERE (departamento IS NULL OR departamento = '') AND (ciudad ILIKE '%nari%' OR ciudad_aeropuerto ILIKE '%chachagui%');
UPDATE travel_expenses.tarifas_transporte_terminal SET departamento = 'Putumayo', departamento_id = 86 WHERE (departamento IS NULL OR departamento = '') AND (ciudad ILIKE '%putumayo%' OR ciudad_aeropuerto ILIKE '%puerto as%');
UPDATE travel_expenses.tarifas_transporte_terminal SET departamento = 'Quindío', departamento_id = 63 WHERE (departamento IS NULL OR departamento = '') AND (ciudad ILIKE '%quindio%' OR ciudad_aeropuerto ILIKE '%tebaida%');
UPDATE travel_expenses.tarifas_transporte_terminal SET departamento = 'Santander', departamento_id = 68 WHERE (departamento IS NULL OR departamento = '') AND (ciudad ILIKE '%santander%' OR ciudad_aeropuerto ILIKE '%lebrija%');
UPDATE travel_expenses.tarifas_transporte_terminal SET departamento = 'Sucre', departamento_id = 70 WHERE (departamento IS NULL OR departamento = '') AND (ciudad ILIKE '%sucre%' OR ciudad_aeropuerto ILIKE '%corozal%');
UPDATE travel_expenses.tarifas_transporte_terminal SET departamento = 'Valle del Cauca', departamento_id = 76 WHERE (departamento IS NULL OR departamento = '') AND (ciudad ILIKE '%valle%' OR ciudad_aeropuerto ILIKE '%palmira%');
UPDATE travel_expenses.tarifas_transporte_terminal SET departamento = 'Otros' WHERE (departamento IS NULL OR departamento = '');
