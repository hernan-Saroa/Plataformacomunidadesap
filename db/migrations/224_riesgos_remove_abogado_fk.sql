-- Eliminar la llave foránea de responsable_id en riesgos hacia abogados locales
-- Ya que el ID almacenado proviene del servicio de autenticación global (users)
ALTER TABLE legal_management.riesgos DROP CONSTRAINT IF EXISTS riesgos_responsable_id_fkey;
