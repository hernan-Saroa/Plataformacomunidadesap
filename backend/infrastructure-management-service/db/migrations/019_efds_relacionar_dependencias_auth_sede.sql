BEGIN;
SET LOCAL search_path = "infrastructure-management", auth, public;

-- =============================================================================
-- 019: Relacionar auth.dependencias con sedes del módulo UMI (infrastructure-management.sede)
--
-- Contexto: El formulario "Radicación Solicitud" reemplazó el input de texto libre
-- del Área solicitante por un SELECT del catálogo auth.dependencias (6 filas activas
-- DEP-PLAN-01, DEP-ACAD-01, DEP-ADM-01, DEP-TH-01, DEP-OFI-JUR-01, DEP-CONT-INT-01).
-- Para filtrar dependencias por sede en próximas iteraciones, se relaciona cada
-- dependencia con el id_sede bigint de su sede principal. auth.sedes está vacía (0 rows),
-- por lo tanto la relación se alinea con infrastructure-management.sede referenciando
-- por código/nombre y guardando el ID numérico (id_sede numeric = id_sede bigint del
-- catalogo auth) para mantener el tipo esperado por auth.dependencias.id_sede.
--
-- Valores de sedes activas con alcance UMI = true:
--   70790e25-da03-4822-b067-359cb0de16c1 · TERR-PRUEBA      · Nombre sede prueba
--   51a430c0-b1fa-4a47-b464-41f77816d7c9 · SEDE-ROSALES     · Sede Alterna Rosales
--   55d37fca-799a-48b8-9486-0367a7be1d15 · SEDE-TEUSAQUILLO · Sede Alterna Teusaquillo
--   0930584e-d881-412f-a271-9e3526918e51 · SEDE-CENTRAL     · Sede Central - Bogotá D.C.
--
-- Distribución semántica por defecto (ajustar si la asignación real difiere):
--   - Todas las direcciones/subdirecciones operan desde SEDE-CENTRAL (1).
--   - Se deja comentado cómo asignar Teusaquillo/Rosales si hay divisiones.
--
-- Idempotente: UPDATE ... WHERE id_sede IS NULL; si ya estaba seteado = skip.
-- =============================================================================

DO $$
DECLARE
  v_id_central       NUMERIC := 1;
  v_id_teusaquillo   NUMERIC := 2;
  v_id_rosales       NUMERIC := 3;
  v_id_prueba        NUMERIC := 4;
BEGIN
  -- Asignación por defecto: SEDE CENTRAL (1) = Oficinas administrativas principales
  UPDATE auth.dependencias
  SET    id_sede = v_id_central
  WHERE  id_sede IS NULL
    AND  cod_dependencia IN (
           'DEP-PLAN-01',      -- Subdirección de Planificación
           'DEP-ACAD-01',      -- Subdirección Académica
           'DEP-ADM-01',       -- Subdirección Administrativa y Financiera
           'DEP-TH-01',        -- Subdirección de Talento Humano
           'DEP-OFI-JUR-01',   -- Oficina Asesora Jurídica
           'DEP-CONT-INT-01'   -- Oficina de Control Interno
         );

  -- Nota: Si más adelante se requiere distribuir geográficamente:
  --   UPDATE auth.dependencias SET id_sede = v_id_teusaquillo WHERE cod_dependencia = 'DEP-TH-01'   AND id_sede IS NULL;
  --   UPDATE auth.dependencias SET id_sede = v_id_rosales     WHERE cod_dependencia = 'DEP-ACAD-01' AND id_sede IS NULL;

  -- Si mañana se agrega el mapeo UUID<->Numeric a auth.sedes se puede sincronizar
  -- el FK con la PK real; mientras tanto el valor numeric 1..4 sirve de join estable
  -- entre front/consolidados (ej: ?codigoSede=SEDE-CENTRAL filtra dependencias.id_sede=1).
END $$;

COMMIT;
