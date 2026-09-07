-- Seed: parámetros iniciales para autoliquidación de viáticos
-- Decreto 314 de 2026
-- Idempotente: no duplica valores si la clave ya existe

INSERT INTO travel_expenses.liquidation_params (clave, valor, tipo, descripcion) VALUES
    ('SMMLV_2026', '1423500', 'NUMBER', 'Salario mínimo mensual vigente 2026'),
    ('FACTOR_CONTRATISTA', '0.8', 'NUMBER', 'Factor de descuento para contratistas'),
    ('FACTOR_SIN_PERNOCTA', '0.5', 'NUMBER', 'Factor aplicado cuando no hay pernocta'),
    ('ANO_VIGENCIA_ESCALAS', '2026', 'NUMBER', 'Año de vigencia de las escalas de viáticos'),
    ('CACHE_TTL_MINUTES', '5', 'NUMBER', 'Tiempo de vida del caché en memoria')
ON CONFLICT (clave) DO NOTHING;
