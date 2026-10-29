-- Diagnóstico de estructura exclusivamente de lectura.
-- Ejecutar conectado a Isolucion5Esap. No contiene credenciales ni lee documentos.
-- No asumir el esquema dbo: localizar primero el objeto proporcionado.
SET NOCOUNT ON;
SET LOCK_TIMEOUT 5000;

SELECT
    SCHEMA_NAME(v.schema_id) AS esquema,
    v.name AS vista,
    HAS_PERMS_BY_NAME(QUOTENAME(SCHEMA_NAME(v.schema_id)) + N'.' + QUOTENAME(v.name), N'OBJECT', N'SELECT') AS puede_consultar
FROM sys.views AS v
WHERE v.name = N'VW_LISTADOMAESTRODOCUMENTOS';

SELECT
    SCHEMA_NAME(v.schema_id) AS esquema,
    v.name AS vista,
    c.column_id AS posicion,
    c.name AS columna,
    t.name AS tipo,
    c.max_length AS longitud_maxima_bytes,
    c.is_nullable AS admite_nulos
FROM sys.views AS v
INNER JOIN sys.columns AS c ON c.object_id = v.object_id
INNER JOIN sys.types AS t ON t.user_type_id = c.user_type_id
WHERE v.name = N'VW_LISTADOMAESTRODOCUMENTOS'
ORDER BY esquema, vista, c.column_id;
