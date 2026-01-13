-- ============================================
-- QUERIES PARA VERIFICAR INFORMES DE LEY
-- ============================================

-- 1. Ver todos los informes de ley registrados
SELECT 
    id,
    codigo,
    nombre,
    categoria,
    periodicidad,
    dia_presentacion,
    area,
    responsable,
    activo,
    created_at,
    updated_at
FROM control_interno.informe_ley
ORDER BY created_at DESC;

-- 2. Contar total de informes
SELECT 
    COUNT(*) as total_informes,
    COUNT(*) FILTER (WHERE activo = true) as informes_activos,
    COUNT(*) FILTER (WHERE activo = false) as informes_inactivos
FROM control_interno.informe_ley;

-- 3. Ver informes por categoría
SELECT 
    categoria,
    COUNT(*) as cantidad,
    COUNT(*) FILTER (WHERE activo = true) as activos
FROM control_interno.informe_ley
GROUP BY categoria
ORDER BY cantidad DESC;

-- 4. Ver informes por periodicidad
SELECT 
    periodicidad,
    COUNT(*) as cantidad,
    COUNT(*) FILTER (WHERE activo = true) as activos
FROM control_interno.informe_ley
GROUP BY periodicidad
ORDER BY cantidad DESC;

-- 5. Buscar un informe específico por código
SELECT 
    id,
    codigo,
    nombre,
    categoria,
    periodicidad,
    dia_presentacion,
    area,
    responsable,
    normativa,
    activo
FROM control_interno.informe_ley
WHERE codigo = 'INF-PORM';  -- Cambiar por el código que buscas

-- 6. Buscar informes por nombre (búsqueda parcial)
SELECT 
    id,
    codigo,
    nombre,
    categoria,
    periodicidad,
    activo
FROM control_interno.informe_ley
WHERE nombre ILIKE '%Pormenorizado%';  -- Cambiar por el texto que buscas

-- 7. Ver informes con sus entregas
SELECT 
    il.id,
    il.codigo,
    il.nombre,
    il.periodicidad,
    COUNT(eil.id) as total_entregas,
    COUNT(eil.id) FILTER (WHERE eil.estado = 'entregado') as entregas_completadas,
    COUNT(eil.id) FILTER (WHERE eil.estado = 'vencido') as entregas_vencidas
FROM control_interno.informe_ley il
LEFT JOIN control_interno.entrega_informe_ley eil ON eil.informe_id = il.id
GROUP BY il.id, il.codigo, il.nombre, il.periodicidad
ORDER BY il.codigo;

-- 8. Verificar si existe un informe específico
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM control_interno.informe_ley 
            WHERE codigo = 'INF-PORM'  -- Cambiar por el código que buscas
        ) THEN 'EXISTE'
        ELSE 'NO EXISTE'
    END as estado;

-- 9. Ver estructura de la tabla (columnas y tipos)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'control_interno' 
  AND table_name = 'informe_ley'
ORDER BY ordinal_position;

-- 10. Ver todos los códigos únicos de informes
SELECT 
    codigo,
    nombre,
    categoria,
    periodicidad,
    activo
FROM control_interno.informe_ley
ORDER BY codigo;
