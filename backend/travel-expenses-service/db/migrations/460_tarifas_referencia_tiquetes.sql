SET client_encoding = 'UTF8';

-- Migration 460: Crear tabla de tarifas de referencia de tiquetes aéreos (Modelo Híbrido API/Paramétrico)
-- Fecha: 2026-10-05

CREATE TABLE IF NOT EXISTS travel_expenses.tarifas_referencia_tiquetes (
  id serial PRIMARY KEY,
  origen_ciudad varchar(100) NOT NULL,
  destino_ciudad varchar(100) NOT NULL,
  origen_iata varchar(10) NOT NULL,
  destino_iata varchar(10) NOT NULL,
  tarifa_estimada numeric(14,2) NOT NULL DEFAULT 0,
  tarifa_minima numeric(14,2) NULL,
  tarifa_maxima numeric(14,2) NULL,
  fuente varchar(50) NOT NULL DEFAULT 'PARAMETRICO_ESAP',
  notas varchar(255) NULL,
  ultima_actualizacion timestamp NOT NULL DEFAULT now(),
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamp NOT NULL DEFAULT now(),
  actualizado_en timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_tarifas_referencia_ruta UNIQUE (origen_iata, destino_iata)
);

CREATE INDEX IF NOT EXISTS idx_tarifas_ref_ciudades ON travel_expenses.tarifas_referencia_tiquetes(origen_ciudad, destino_ciudad);
CREATE INDEX IF NOT EXISTS idx_tarifas_ref_iatas ON travel_expenses.tarifas_referencia_tiquetes(origen_iata, destino_iata);
CREATE INDEX IF NOT EXISTS idx_tarifas_ref_activo ON travel_expenses.tarifas_referencia_tiquetes(activo);

-- Poblar rutas de referencia nacionales prioritarias para la ESAP (Valores paramétricos de referencia base)
INSERT INTO travel_expenses.tarifas_referencia_tiquetes 
  (origen_ciudad, destino_ciudad, origen_iata, destino_iata, tarifa_estimada, tarifa_minima, tarifa_maxima, fuente, notas, activo)
VALUES
  ('BOGOTÁ, D.C.', 'MEDELLÍN', 'BOG', 'MDE', 380000.00, 290000.00, 480000.00, 'PARAMETRICO_ESAP', 'Ruta troncal principal BOG-MDE', true),
  ('MEDELLÍN', 'BOGOTÁ, D.C.', 'MDE', 'BOG', 380000.00, 290000.00, 480000.00, 'PARAMETRICO_ESAP', 'Ruta troncal principal MDE-BOG', true),
  ('BOGOTÁ, D.C.', 'CALI', 'BOG', 'CLO', 360000.00, 280000.00, 450000.00, 'PARAMETRICO_ESAP', 'Ruta troncal principal BOG-CLO', true),
  ('CALI', 'BOGOTÁ, D.C.', 'CLO', 'BOG', 360000.00, 280000.00, 450000.00, 'PARAMETRICO_ESAP', 'Ruta troncal principal CLO-BOG', true),
  ('BOGOTÁ, D.C.', 'BARRANQUILLA', 'BOG', 'BAQ', 420000.00, 310000.00, 530000.00, 'PARAMETRICO_ESAP', 'Ruta Costa Caribe BOG-BAQ', true),
  ('BARRANQUILLA', 'BOGOTÁ, D.C.', 'BAQ', 'BOG', 420000.00, 310000.00, 530000.00, 'PARAMETRICO_ESAP', 'Ruta Costa Caribe BAQ-BOG', true),
  ('BOGOTÁ, D.C.', 'CARTAGENA', 'BOG', 'CTG', 440000.00, 320000.00, 560000.00, 'PARAMETRICO_ESAP', 'Ruta Costa Caribe BOG-CTG', true),
  ('CARTAGENA', 'BOGOTÁ, D.C.', 'CTG', 'BOG', 440000.00, 320000.00, 560000.00, 'PARAMETRICO_ESAP', 'Ruta Costa Caribe CTG-BOG', true),
  ('BOGOTÁ, D.C.', 'BUCARAMANGA', 'BOG', 'BGA', 350000.00, 260000.00, 440000.00, 'PARAMETRICO_ESAP', 'Ruta Santander BOG-BGA', true),
  ('BUCARAMANGA', 'BOGOTÁ, D.C.', 'BGA', 'BOG', 350000.00, 260000.00, 440000.00, 'PARAMETRICO_ESAP', 'Ruta Santander BGA-BOG', true),
  ('BOGOTÁ, D.C.', 'PEREIRA', 'BOG', 'PEI', 330000.00, 250000.00, 420000.00, 'PARAMETRICO_ESAP', 'Ruta Eje Cafetero BOG-PEI', true),
  ('PEREIRA', 'BOGOTÁ, D.C.', 'PEI', 'BOG', 330000.00, 250000.00, 420000.00, 'PARAMETRICO_ESAP', 'Ruta Eje Cafetero PEI-BOG', true),
  ('BOGOTÁ, D.C.', 'CÚCUTA', 'BOG', 'CUC', 390000.00, 290000.00, 490000.00, 'PARAMETRICO_ESAP', 'Ruta Norte de Santander BOG-CUC', true),
  ('CÚCUTA', 'BOGOTÁ, D.C.', 'CUC', 'BOG', 390000.00, 290000.00, 490000.00, 'PARAMETRICO_ESAP', 'Ruta Norte de Santander CUC-BOG', true),
  ('BOGOTÁ, D.C.', 'SANTA MARTA', 'BOG', 'SMR', 430000.00, 320000.00, 540000.00, 'PARAMETRICO_ESAP', 'Ruta Magdalena BOG-SMR', true),
  ('SANTA MARTA', 'BOGOTÁ, D.C.', 'SMR', 'BOG', 430000.00, 320000.00, 540000.00, 'PARAMETRICO_ESAP', 'Ruta Magdalena SMR-BOG', true),
  ('BOGOTÁ, D.C.', 'MONTERÍA', 'BOG', 'MTR', 410000.00, 300000.00, 520000.00, 'PARAMETRICO_ESAP', 'Ruta Córdoba BOG-MTR', true),
  ('MONTERÍA', 'BOGOTÁ, D.C.', 'MTR', 'BOG', 410000.00, 300000.00, 520000.00, 'PARAMETRICO_ESAP', 'Ruta Córdoba MTR-BOG', true),
  ('BOGOTÁ, D.C.', 'PASTO', 'BOG', 'PSO', 460000.00, 340000.00, 580000.00, 'PARAMETRICO_ESAP', 'Ruta Nariño BOG-PSO', true),
  ('PASTO', 'BOGOTÁ, D.C.', 'PSO', 'BOG', 460000.00, 340000.00, 580000.00, 'PARAMETRICO_ESAP', 'Ruta Nariño PSO-BOG', true),
  ('BOGOTÁ, D.C.', 'VALLEDUPAR', 'BOG', 'VUP', 450000.00, 330000.00, 570000.00, 'PARAMETRICO_ESAP', 'Ruta Cesar BOG-VUP', true),
  ('VALLEDUPAR', 'BOGOTÁ, D.C.', 'VUP', 'BOG', 450000.00, 330000.00, 570000.00, 'PARAMETRICO_ESAP', 'Ruta Cesar VUP-BOG', true),
  ('BOGOTÁ, D.C.', 'NEIVA', 'BOG', 'NVA', 340000.00, 250000.00, 430000.00, 'PARAMETRICO_ESAP', 'Ruta Huila BOG-NVA', true),
  ('NEIVA', 'BOGOTÁ, D.C.', 'NVA', 'BOG', 340000.00, 250000.00, 430000.00, 'PARAMETRICO_ESAP', 'Ruta Huila NVA-BOG', true),
  ('BOGOTÁ, D.C.', 'VILLAVICENCIO', 'BOG', 'VVC', 280000.00, 210000.00, 360000.00, 'PARAMETRICO_ESAP', 'Ruta Meta BOG-VVC', true),
  ('VILLAVICENCIO', 'BOGOTÁ, D.C.', 'VVC', 'BOG', 280000.00, 210000.00, 360000.00, 'PARAMETRICO_ESAP', 'Ruta Meta VVC-BOG', true),
  ('BOGOTÁ, D.C.', 'ARMENIA', 'BOG', 'AXM', 340000.00, 250000.00, 430000.00, 'PARAMETRICO_ESAP', 'Ruta Quindío BOG-AXM', true),
  ('ARMENIA', 'BOGOTÁ, D.C.', 'AXM', 'BOG', 340000.00, 250000.00, 430000.00, 'PARAMETRICO_ESAP', 'Ruta Quindío AXM-BOG', true),
  ('BOGOTÁ, D.C.', 'POPAYÁN', 'BOG', 'PPN', 420000.00, 310000.00, 530000.00, 'PARAMETRICO_ESAP', 'Ruta Cauca BOG-PPN', true),
  ('POPAYÁN', 'BOGOTÁ, D.C.', 'PPN', 'BOG', 420000.00, 310000.00, 530000.00, 'PARAMETRICO_ESAP', 'Ruta Cauca PPN-BOG', true),
  ('BOGOTÁ, D.C.', 'RIOHACHA', 'BOG', 'RCH', 470000.00, 350000.00, 590000.00, 'PARAMETRICO_ESAP', 'Ruta La Guajira BOG-RCH', true),
  ('RIOHACHA', 'BOGOTÁ, D.C.', 'RCH', 'BOG', 470000.00, 350000.00, 590000.00, 'PARAMETRICO_ESAP', 'Ruta La Guajira RCH-BOG', true),
  ('BOGOTÁ, D.C.', 'FLORENCIA', 'BOG', 'FLA', 410000.00, 300000.00, 520000.00, 'PARAMETRICO_ESAP', 'Ruta Caquetá BOG-FLA', true),
  ('FLORENCIA', 'BOGOTÁ, D.C.', 'FLA', 'BOG', 410000.00, 300000.00, 520000.00, 'PARAMETRICO_ESAP', 'Ruta Caquetá FLA-BOG', true),
  ('BOGOTÁ, D.C.', 'QUIBDÓ', 'BOG', 'UIB', 390000.00, 290000.00, 490000.00, 'PARAMETRICO_ESAP', 'Ruta Chocó BOG-UIB', true),
  ('QUIBDÓ', 'BOGOTÁ, D.C.', 'UIB', 'BOG', 390000.00, 290000.00, 490000.00, 'PARAMETRICO_ESAP', 'Ruta Chocó UIB-BOG', true),
  ('BOGOTÁ, D.C.', 'YOPAL', 'BOG', 'EYP', 350000.00, 260000.00, 440000.00, 'PARAMETRICO_ESAP', 'Ruta Casanare BOG-EYP', true),
  ('YOPAL', 'BOGOTÁ, D.C.', 'EYP', 'BOG', 350000.00, 260000.00, 440000.00, 'PARAMETRICO_ESAP', 'Ruta Casanare EYP-BOG', true),
  ('BOGOTÁ, D.C.', 'LETICIA', 'BOG', 'LET', 680000.00, 510000.00, 850000.00, 'PARAMETRICO_ESAP', 'Ruta Amazonas BOG-LET', true),
  ('LETICIA', 'BOGOTÁ, D.C.', 'LET', 'BOG', 680000.00, 510000.00, 850000.00, 'PARAMETRICO_ESAP', 'Ruta Amazonas LET-BOG', true),
  ('BOGOTÁ, D.C.', 'SAN ANDRÉS', 'BOG', 'ADZ', 580000.00, 430000.00, 730000.00, 'PARAMETRICO_ESAP', 'Ruta Insular BOG-ADZ', true),
  ('SAN ANDRÉS', 'BOGOTÁ, D.C.', 'ADZ', 'BOG', 580000.00, 430000.00, 730000.00, 'PARAMETRICO_ESAP', 'Ruta Insular ADZ-BOG', true)
ON CONFLICT (origen_iata, destino_iata) DO NOTHING;
