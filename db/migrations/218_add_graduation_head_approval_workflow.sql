-- Agrega el tercer nivel del flujo de verificacion de titulos:
-- Revisor -> Aprobador -> Jefe de Registro Academico.
-- La migracion es idempotente y no modifica asignaciones de usuarios.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE academic_registration.graduation_certificate_requests
  ADD COLUMN IF NOT EXISTS head_decision VARCHAR(50),
  ADD COLUMN IF NOT EXISTS head_notes TEXT,
  ADD COLUMN IF NOT EXISTS head_reviewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS head_reviewed_by VARCHAR(100),
  ADD COLUMN IF NOT EXISTS head_reviewer_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_graduation_requests_head_reviewed_at
  ON academic_registration.graduation_certificate_requests (head_reviewed_at);

COMMENT ON COLUMN academic_registration.graduation_certificate_requests.approval_status
  IS 'Estado de flujo: PENDING_APPROVAL, PENDING_HEAD_APPROVAL, APPROVED_FINAL, REJECTED_FINAL, OBSERVATION o HEAD_OBSERVATION.';

COMMENT ON COLUMN academic_registration.graduation_certificate_requests.head_decision
  IS 'Decision del jefe de registro academico: APPROVED, REJECTED u OBSERVATION.';

COMMENT ON COLUMN academic_registration.graduation_certificate_requests.head_notes
  IS 'Observaciones o justificacion del jefe de registro academico.';

COMMENT ON COLUMN academic_registration.graduation_certificate_requests.head_reviewed_at
  IS 'Fecha en que el jefe emitio decision final u observacion.';

COMMENT ON COLUMN academic_registration.graduation_certificate_requests.head_reviewed_by
  IS 'Identificador del usuario jefe que emitio la decision.';

COMMENT ON COLUMN academic_registration.graduation_certificate_requests.head_reviewer_name
  IS 'Nombre del usuario jefe que emitio la decision.';

DO $$
DECLARE
  v_graduates_module_id uuid;
  v_certificates_module_id uuid;
  v_revisor_role_id uuid;
  v_aprobador_role_id uuid;
  v_jefe_role_id uuid;
BEGIN
  INSERT INTO auth.module (
    id_module,
    code,
    name,
    description,
    icon,
    color,
    display_order,
    category,
    is_active,
    created_at,
    updated_at
  )
  VALUES
    (
      gen_random_uuid(),
      'graduates',
      'Graduados',
      'Gestion de graduados',
      'Award',
      '#003DA5',
      8,
      'backoffice',
      true,
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      'graduates-certificates',
      'Verificacion de Titulos',
      'Verificacion de titulos para registro academico',
      'Award',
      '#003DA5',
      9,
      'backoffice',
      true,
      NOW(),
      NOW()
    )
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        icon = EXCLUDED.icon,
        color = EXCLUDED.color,
        display_order = EXCLUDED.display_order,
        category = EXCLUDED.category,
        is_active = true,
        updated_at = NOW();

  SELECT id_module INTO v_graduates_module_id
  FROM auth.module
  WHERE code = 'graduates';

  SELECT id_module INTO v_certificates_module_id
  FROM auth.module
  WHERE code = 'graduates-certificates';

  INSERT INTO auth.permission (
    id_permission,
    code,
    name,
    description,
    id_module,
    is_active,
    created_at,
    updated_at
  )
  VALUES
    (gen_random_uuid(), 'graduates.edit', 'Editar Graduado', 'Modificar datos de graduado', v_graduates_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'graduates.export', 'Exportar Graduados', 'Descargar datos de graduados', v_graduates_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'graduates.verify_certificate', 'Verificar Certificado', 'Validar autenticidad mediante QR', v_graduates_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'graduates-certificates.solicitude.aprobar', 'Aprobar Solicitudes', 'Permite aprobar solicitudes de revision', v_certificates_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'graduates-certificates.certificates.view', 'Certificados Generados', 'Permite ver certificados emitidos', v_certificates_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'graduates-certificates.certificates.edit', 'Editar Certificados', 'Permite editar certificados emitidos', v_certificates_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'graduates-certificates.solicitude.review', 'Enviar a Revision', 'Permite enviar solicitudes de revision', v_certificates_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'graduates-certificates.certificates.export', 'Exportar Certificados', 'Permite descargar certificados emitidos', v_certificates_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'graduates-certificates.solicitude.rechazar', 'Rechazar Solicitudes', 'Permite rechazar solicitudes de revision', v_certificates_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'graduates-certificates.certificates.reenviar', 'Reenviar Certificados', 'Permite reenviar certificados emitidos', v_certificates_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'graduates-certificates.solicitude.view', 'Solicitudes de Revision', 'Permite ver solicitudes de revision', v_certificates_module_id, true, NOW(), NOW())
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        id_module = EXCLUDED.id_module,
        is_active = true,
        updated_at = NOW();

  INSERT INTO auth.role (
    id,
    code,
    name,
    description,
    category,
    icon,
    color,
    type,
    is_active,
    requires_2fa,
    created_by,
    updated_by,
    created_at,
    updated_at
  )
  VALUES
    (
      gen_random_uuid(),
      'REGISTRO_ACADEMICO_REVISOR_TITULOS',
      'Revisor Verificacion Titulos',
      'Carga informacion y soportes de solicitudes de revision de titulos.',
      'academico',
      'Award',
      '#10B981',
      'personalizado',
      true,
      false,
      'migration_218',
      'migration_218',
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      'REGISTRO_ACADEMICO_APROBADOR_TITULOS',
      'Aprobador Verificacion Titulos',
      'Emite preconceptos y observaciones sobre solicitudes revisadas.',
      'academico',
      'ShieldCheck',
      '#F59E0B',
      'personalizado',
      true,
      false,
      'migration_218',
      'migration_218',
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      'JEFE_REGISTRO_ACADEMICO',
      'Jefe de Registro Academico',
      'Emite decision final sobre solicitudes de verificacion de titulos.',
      'directivo',
      'Shield',
      '#003DA5',
      'personalizado',
      true,
      false,
      'migration_218',
      'migration_218',
      NOW(),
      NOW()
    )
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        icon = EXCLUDED.icon,
        color = EXCLUDED.color,
        type = EXCLUDED.type,
        is_active = true,
        updated_by = 'migration_218',
        updated_at = NOW();

  SELECT id INTO v_revisor_role_id
  FROM auth.role
  WHERE code = 'REGISTRO_ACADEMICO_REVISOR_TITULOS';

  SELECT id INTO v_aprobador_role_id
  FROM auth.role
  WHERE code = 'REGISTRO_ACADEMICO_APROBADOR_TITULOS';

  SELECT id INTO v_jefe_role_id
  FROM auth.role
  WHERE code = 'JEFE_REGISTRO_ACADEMICO';

  DELETE FROM auth.role_permissions
  WHERE id_rol IN (v_revisor_role_id, v_aprobador_role_id, v_jefe_role_id)
    AND id_permission IN (
      SELECT id_permission
      FROM auth.permission
      WHERE code IN (
        'graduates.edit',
        'graduates.export',
        'graduates.verify_certificate',
        'graduates-certificates.solicitude.aprobar',
        'graduates-certificates.certificates.view',
        'graduates-certificates.certificates.edit',
        'graduates-certificates.solicitude.review',
        'graduates-certificates.certificates.export',
        'graduates-certificates.solicitude.rechazar',
        'graduates-certificates.certificates.reenviar',
        'graduates-certificates.solicitude.view'
      )
    );

  INSERT INTO auth.role_permissions (
    id_rol,
    id_permission,
    is_active,
    created_at,
    updated_at
  )
  SELECT role_permission.id_rol, p.id_permission, true, NOW(), NOW()
  FROM (
    VALUES
      (v_revisor_role_id, 'graduates.edit'),
      (v_revisor_role_id, 'graduates.export'),
      (v_revisor_role_id, 'graduates.verify_certificate'),
      (v_revisor_role_id, 'graduates-certificates.certificates.view'),
      (v_revisor_role_id, 'graduates-certificates.certificates.export'),
      (v_revisor_role_id, 'graduates-certificates.solicitude.rechazar'),
      (v_revisor_role_id, 'graduates-certificates.certificates.reenviar'),
      (v_revisor_role_id, 'graduates-certificates.solicitude.view'),

      (v_aprobador_role_id, 'graduates.edit'),
      (v_aprobador_role_id, 'graduates.export'),
      (v_aprobador_role_id, 'graduates.verify_certificate'),
      (v_aprobador_role_id, 'graduates-certificates.solicitude.aprobar'),
      (v_aprobador_role_id, 'graduates-certificates.certificates.view'),
      (v_aprobador_role_id, 'graduates-certificates.solicitude.review'),
      (v_aprobador_role_id, 'graduates-certificates.certificates.export'),
      (v_aprobador_role_id, 'graduates-certificates.solicitude.rechazar'),
      (v_aprobador_role_id, 'graduates-certificates.certificates.reenviar'),
      (v_aprobador_role_id, 'graduates-certificates.solicitude.view'),

      (v_jefe_role_id, 'graduates.edit'),
      (v_jefe_role_id, 'graduates.export'),
      (v_jefe_role_id, 'graduates.verify_certificate'),
      (v_jefe_role_id, 'graduates-certificates.solicitude.aprobar'),
      (v_jefe_role_id, 'graduates-certificates.certificates.view'),
      (v_jefe_role_id, 'graduates-certificates.certificates.edit'),
      (v_jefe_role_id, 'graduates-certificates.solicitude.review'),
      (v_jefe_role_id, 'graduates-certificates.certificates.export'),
      (v_jefe_role_id, 'graduates-certificates.solicitude.rechazar'),
      (v_jefe_role_id, 'graduates-certificates.certificates.reenviar'),
      (v_jefe_role_id, 'graduates-certificates.solicitude.view')
  ) AS role_permission(id_rol, permission_code)
  JOIN auth.permission p ON p.code = role_permission.permission_code
  WHERE role_permission.id_rol IS NOT NULL
  ON CONFLICT (id_rol, id_permission) DO UPDATE
    SET is_active = true,
        updated_at = NOW();
END $$;
