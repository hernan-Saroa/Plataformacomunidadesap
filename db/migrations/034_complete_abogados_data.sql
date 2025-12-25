-- 034_complete_abogados_data.sql
-- Migration to:
-- 1. Add cedula column to abogados
-- 2. Update existing abogados with complete data
-- 3. Add 2 new abogados
-- 4. Assign real abogados to expedientes

-- ============================================
-- 1. Add cedula column if not exists
-- ============================================
ALTER TABLE legal_management.abogados
ADD COLUMN IF NOT EXISTS cedula VARCHAR(20);

-- ============================================
-- 2. Update existing abogados with complete data
-- ============================================
UPDATE legal_management.abogados
SET 
    cedula = '79456123',
    telefono = COALESCE(telefono, '3001234567'),
    especialidad = COALESCE(especialidad, 'Derecho Administrativo')
WHERE email = 'carlos.mendoza@esap.edu.co';

UPDATE legal_management.abogados
SET 
    cedula = '52123789',
    telefono = COALESCE(telefono, '3109876543'),
    especialidad = COALESCE(especialidad, 'Derecho Laboral')
WHERE email = 'maria.torres@esap.edu.co';

-- ============================================
-- 3. Insert 2 new abogados
-- ============================================
INSERT INTO legal_management.abogados (nombre_completo, email, telefono, especialidad, fecha_ingreso, estado, cedula)
VALUES 
    ('Dr. Luis Ramírez Torres', 'luis.ramirez@esap.edu.co', '3115678901', 'Derecho Constitucional', CURRENT_DATE - INTERVAL '3 years', 'ACTIVO', '80123456'),
    ('Dra. Patricia González Ruiz', 'patricia.gonzalez@esap.edu.co', '3201234567', 'Derecho Civil', CURRENT_DATE - INTERVAL '4 years', 'ACTIVO', '52987654')
ON CONFLICT (email) DO UPDATE SET
    cedula = EXCLUDED.cedula,
    telefono = EXCLUDED.telefono,
    especialidad = EXCLUDED.especialidad;

-- ============================================
-- 4. Assign real abogados to expedientes
-- Get abogado IDs and assign to expedientes
-- ============================================

-- Expediente 1: Assign to Carlos Mendoza
UPDATE legal_management.expedientes 
SET abogado_sustanciador = (
    SELECT id::text FROM legal_management.abogados WHERE email = 'carlos.mendoza@esap.edu.co' LIMIT 1
)
WHERE radicado = '110013335002202500125';

-- Expediente 2: Assign to María Torres  
UPDATE legal_management.expedientes 
SET abogado_sustanciador = (
    SELECT id::text FROM legal_management.abogados WHERE email = 'maria.torres@esap.edu.co' LIMIT 1
)
WHERE radicado = '250002341000202400567';

-- Expediente 3: Assign to Luis Ramírez
UPDATE legal_management.expedientes 
SET abogado_sustanciador = (
    SELECT id::text FROM legal_management.abogados WHERE email = 'luis.ramirez@esap.edu.co' LIMIT 1
)
WHERE radicado = '470013333003202400890';

-- Expediente 4: Assign to Patricia González
UPDATE legal_management.expedientes 
SET abogado_sustanciador = (
    SELECT id::text FROM legal_management.abogados WHERE email = 'patricia.gonzalez@esap.edu.co' LIMIT 1
)
WHERE radicado = '050013331001202500001';

-- Expediente 5: Assign to Carlos Mendoza
UPDATE legal_management.expedientes 
SET abogado_sustanciador = (
    SELECT id::text FROM legal_management.abogados WHERE email = 'carlos.mendoza@esap.edu.co' LIMIT 1
)
WHERE radicado = '680013334004202400234';
