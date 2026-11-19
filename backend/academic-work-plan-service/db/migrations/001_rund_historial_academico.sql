-- 001_rund_historial_academico.sql
-- REQ-RUND-F016 (HU 1360): el PTA escribe en el RUND el historial académico de cada periodo cuando el PTA
-- está «En Firme» (Flujo C.2). Aquí vive el historial (Macro Docente) y el permiso exclusivo de escritura.
-- Aditiva e idempotente: no modifica ni borra ningún dato existente.
--  · "clave" (UNIQUE) hace idempotente el envío: cédula + periodo + sede + programa + asignatura.
--  · "recibidoVeces", "registradoPor", "ultimoRegistradoPor", "ptaId", "estadoPta", roles e ip dan la trazabilidad.
--  · Permiso banco-docentes.rund.historial.write: solo SUPER_ADMIN lo recibe aquí; el rol del sistema PTA
--    (integración) se asigna desde Roles y Permisos. Ningún rol RUND existente (GGP, etc.) lo hereda.
BEGIN;

CREATE TABLE IF NOT EXISTS academic_work_plan."RundHistorialAcademico" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave TEXT NOT NULL,
  "docenteId" TEXT,
  cedula TEXT NOT NULL,
  periodo TEXT NOT NULL,
  setup TEXT,
  territorial TEXT,
  programa TEXT NOT NULL,
  "asignaturaCodigo" TEXT,
  asignatura TEXT NOT NULL,
  "nucleoTematico" TEXT,
  "ptaId" TEXT,
  "estadoPta" TEXT NOT NULL,
  "recibidoVeces" INTEGER NOT NULL DEFAULT 1,
  "registradoPor" TEXT NOT NULL,
  "ultimoRegistradoPor" TEXT NOT NULL,
  roles TEXT[] NOT NULL DEFAULT '{}',
  ip TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rund_historial_academico_clave
  ON academic_work_plan."RundHistorialAcademico" (clave);
CREATE INDEX IF NOT EXISTS idx_rund_historial_academico_cedula_periodo
  ON academic_work_plan."RundHistorialAcademico" (cedula, periodo);
CREATE INDEX IF NOT EXISTS idx_rund_historial_academico_docente
  ON academic_work_plan."RundHistorialAcademico" ("docenteId");

DO $$
DECLARE
  v_module_id UUID;
BEGIN
  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'gestion-profesoral';
  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'No existe el módulo gestion-profesoral en auth.module (migración 423)';
  END IF;

  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (
    gen_random_uuid(),
    'banco-docentes.rund.historial.write',
    'Escribir historial académico en RUND (PTA)',
    'Permite al sistema PTA enviar al RUND el historial académico de un periodo cuando el PTA está En Firme (REQ-RUND-F016). Uso exclusivo de la integración.',
    v_module_id,
    TRUE
  )
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, id_module = EXCLUDED.id_module, is_active = TRUE;

  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  SELECT r.id, p.id_permission, TRUE
    FROM auth.role r
    JOIN auth.permission p ON p.code = 'banco-docentes.rund.historial.write'
   WHERE r.code IN ('SUPER_ADMIN', 'super_admin')
     AND NOT EXISTS (SELECT 1 FROM auth.role_permissions x WHERE x.id_rol = r.id AND x.id_permission = p.id_permission);
END $$;

COMMIT;
