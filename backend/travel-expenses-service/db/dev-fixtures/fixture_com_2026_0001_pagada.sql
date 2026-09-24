-- ============================================================================
-- fixture_com_2026_0001_pagada.sql
--
-- ⚠️  SOLO PARA DESARROLLO LOCAL. NO ES UNA MIGRACIÓN.
--     NO ejecutar contra bases de datos compartidas (dev, qa, pre, prod).
--     Vive fuera de db/migrations/ a propósito para que
--     migrate.service.local.sh y cualquier pipeline de despliegue
--     NUNCA la ejecuten automáticamente.
--
-- Qué hace:
--   Lleva la solicitud COM-2026-0001 (sembrada por seed-comisionados.sql)
--   directamente al estado PAGADA, reproduciendo el recorrido real que se
--   verificó a mano vía API el 2026-09-23/24 sobre esta misma rama
--   (feature/via/EFDS-1309-soportes-legalizacion), paso por paso, con los
--   6 roles correctos (SECRETARIO, ANALISTA, CONTROL_VIATICOS,
--   SUBDIRECCION_GESTION_CORPORATIVA, GRUPO_PRESUPUESTO, TESORERIA) y las
--   validaciones de Segregación de Funciones (SoD) reales del código.
--
--   Existe para que las pruebas de la Etapa 9 (legalización) tengan un
--   punto de partida en PAGADA sin tener que repetir ese recorrido a mano
--   cada vez que alguien reconstruye su base local.
--
-- Requisito previo:
--   Haber corrido ya migrate.service.local.sh travel-expenses-service
--   (o el equivalente) para que existan comisionados/solicitudes_comision
--   sembrados por seed-comisionados.sql, incluida COM-2026-0001.
--
-- Idempotente: seguro de ejecutar varias veces.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Actores de desarrollo (auth.user + auth.user_roles + analistas_viaticos)
--    Usuarios ficticios, sin password real utilizable (password_hash es un
--    marcador, no un hash válido). Un UUID fijo y legible por rol para que
--    el historial de la solicitud sea fácil de leer.
-- ----------------------------------------------------------------------------
INSERT INTO auth.user (id_user, username, password_hash, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'dev.secretario.etapa9qa', 'DEV_FIXTURE_NO_LOGIN', true),
  ('22222222-2222-2222-2222-222222222222', 'dev.analista.etapa9qa', 'DEV_FIXTURE_NO_LOGIN', true),
  ('33333333-3333-3333-3333-333333333333', 'dev.control.etapa9qa', 'DEV_FIXTURE_NO_LOGIN', true),
  ('44444444-4444-4444-4444-444444444444', 'dev.subdireccion.etapa9qa', 'DEV_FIXTURE_NO_LOGIN', true),
  ('55555555-5555-5555-5555-555555555555', 'dev.presupuesto.etapa9qa', 'DEV_FIXTURE_NO_LOGIN', true),
  ('66666666-6666-6666-6666-666666666666', 'dev.tesoreria.etapa9qa', 'DEV_FIXTURE_NO_LOGIN', true)
ON CONFLICT (id_user) DO NOTHING;

DO $$
DECLARE
  v_role_id UUID;
BEGIN
  SELECT id INTO v_role_id FROM auth.role WHERE code = 'SECRETARIO';
  IF v_role_id IS NOT NULL THEN
    INSERT INTO auth.user_roles (id_user, id_rol) VALUES ('11111111-1111-1111-1111-111111111111', v_role_id) ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO v_role_id FROM auth.role WHERE code = 'ANALISTA';
  IF v_role_id IS NOT NULL THEN
    INSERT INTO auth.user_roles (id_user, id_rol) VALUES ('22222222-2222-2222-2222-222222222222', v_role_id) ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO v_role_id FROM auth.role WHERE code = 'CONTROL_VIATICOS';
  IF v_role_id IS NOT NULL THEN
    INSERT INTO auth.user_roles (id_user, id_rol) VALUES ('33333333-3333-3333-3333-333333333333', v_role_id) ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO v_role_id FROM auth.role WHERE code = 'SUBDIRECCION_GESTION_CORPORATIVA';
  IF v_role_id IS NOT NULL THEN
    INSERT INTO auth.user_roles (id_user, id_rol) VALUES ('44444444-4444-4444-4444-444444444444', v_role_id) ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO v_role_id FROM auth.role WHERE code = 'GRUPO_PRESUPUESTO';
  IF v_role_id IS NOT NULL THEN
    INSERT INTO auth.user_roles (id_user, id_rol) VALUES ('55555555-5555-5555-5555-555555555555', v_role_id) ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO v_role_id FROM auth.role WHERE code = 'TESORERIA';
  IF v_role_id IS NOT NULL THEN
    INSERT INTO auth.user_roles (id_user, id_rol) VALUES ('66666666-6666-6666-6666-666666666666', v_role_id) ON CONFLICT DO NOTHING;
  END IF;
END $$;

INSERT INTO travel_expenses.analistas_viaticos (id, usuario_id, nombre_completo, username, email, activo)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222',
  'Analista Dev Fixture (Etapa 9 QA)',
  'dev.analista.etapa9qa',
  'dev.analista.etapa9qa@dev.local',
  true
)
ON CONFLICT (usuario_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. Estado final de COM-2026-0001: PAGADA, con todos los campos que el
--    recorrido real por las Etapas 4-8 fue completando.
-- ----------------------------------------------------------------------------
UPDATE travel_expenses.solicitudes_comision
SET
  estado_solicitud = 'PAGADA',

  -- Etapa 4 (RF-REC-002): asignación a analista
  analista_asignado_id = '22222222-2222-2222-2222-222222222222',

  -- Etapa 5 (RF-REV-001/002/003): verificación, export SIIF, segunda revisión
  consulta_rut_facturador = true,
  siif_exportado = true,
  fecha_exportacion_siif = '2026-09-23 22:39:50.594',
  usuario_exportador_id = '22222222-2222-2222-2222-222222222222',
  revisor_control_id = '33333333-3333-3333-3333-333333333333',
  fecha_segunda_revision = '2026-09-23 22:39:59.714',
  observaciones_segunda_revision = 'Revisión de segundo nivel OK, soportes conformes.',

  -- Etapa 6 (RF-AUT-001): autorización corporativa de gasto e itinerario
  autorizador_id = '44444444-4444-4444-4444-444444444444',
  fecha_autorizacion = '2026-09-23 22:40:19.502',
  observaciones_autorizacion = 'Aprobado el gasto e itinerario conforme a disponibilidad presupuestal.',

  -- Etapa 7 (RF-PRE-001/003): envío a Presupuesto y expedición de RP
  enviado_presupuesto = true,
  fecha_envio_presupuesto = '2026-09-23 22:40:37.311-05',
  enviado_presupuesto_por_id = '22222222-2222-2222-2222-222222222222',
  observaciones_envio_presupuesto = 'Paquete completo, listo para expedición de RP.',
  numero_rp = '24567',
  fecha_rp = '2026-09-23',
  valor_comprometido = 1500000.00,
  rubro_rp = 'C-2101-0100-0-2101010-02-00-00',
  rubro_presupuestal_rp = 'C-2101-0100-0-2101010-02-00-00',
  codigo_rp = '2026-09-24_RP_24567',
  usuario_presupuesto_id = '55555555-5555-5555-5555-555555555555',
  fecha_registro_rp = '2026-09-23 22:42:22.857-05',
  expedido_rp_por_id = '55555555-5555-5555-5555-555555555555',
  fecha_expedicion_rp = '2026-09-23 22:42:22.857-05',
  observaciones_rp = 'RP expedido para pruebas de fixture Etapa 9.',
  modalidad_pago = 'RECONOCIMIENTO_POSTERIOR',
  fecha_calculo_modalidad = '2026-09-23 22:42:22.857',

  -- Etapa 8 (RF-PAG-001/002/003): obligación SIIF, notificación SST y pago
  numero_obligacion = 'OBL-2026-00481',
  fecha_obligacion = '2026-09-23',
  valor_obligacion = 1500000.00,
  observaciones_obligacion = 'Obligación creada para fixture Etapa 9.',
  obligado_por_id = '55555555-5555-5555-5555-555555555555',
  fecha_registro_obligacion = '2026-09-23 22:42:34.274-05',
  notificado_sst = true,
  fecha_pago = '2026-09-23',
  valor_pagado = 1500000.00,
  numero_orden_pago = 'OP-SIIF-2026-98124',
  observaciones_pago = 'Pago procesado para fixture Etapa 9.',
  pagado_por_id = '66666666-6666-6666-6666-666666666666',
  fecha_registro_pago = '2026-09-23 22:42:43.003-05',

  actualizado_en = now()
WHERE consecutivo_unico = 'COM-2026-0001'
  AND estado_solicitud <> 'PAGADA';

-- ----------------------------------------------------------------------------
-- 3. Historial de estados (trazabilidad), solo si aún no existe (idempotente).
-- ----------------------------------------------------------------------------
INSERT INTO travel_expenses.solicitudes_historial_estados
  (solicitud_id, estado_anterior, estado_nuevo, usuario_id, comentarios, creado_en)
SELECT s.id, h.estado_anterior, h.estado_nuevo, h.usuario_id::uuid, h.comentarios, h.creado_en::timestamp
FROM travel_expenses.solicitudes_comision s
CROSS JOIN (VALUES
  ('SOLICITADO',     'EN_VERIFICACION', '11111111-1111-1111-1111-111111111111', 'Asignada a analista dev.analista.etapa9qa', '2026-09-23 22:39:22.813'),
  ('EN_VERIFICACION','VERIFICADA',      '22222222-2222-2222-2222-222222222222', '{"tipo":"VERIFICACION_ANALISTA","seguridad_social_vigente":true,"consulta_rut_facturador":true}', '2026-09-23 22:39:32.039'),
  ('VERIFICADA',     'SOLICITADA_SIIF', '22222222-2222-2222-2222-222222222222', 'Exportado a SIIF Nación', '2026-09-23 22:39:50.583'),
  ('SOLICITADA_SIIF','VERIFICADA',      '33333333-3333-3333-3333-333333333333', 'Segunda revisión: Revisión de segundo nivel OK, soportes conformes.', '2026-09-23 22:39:59.710'),
  ('VERIFICADA',     'EN_AUTORIZACION', '33333333-3333-3333-3333-333333333333', 'Llegada a la Subdirección de Gestión Corporativa para visto bueno de gasto e itinerario', '2026-09-23 22:40:11.970'),
  ('EN_AUTORIZACION','AUTORIZADA',      '44444444-4444-4444-4444-444444444444', 'Autorización corporativa de gasto e itinerario: Aprobado el gasto e itinerario conforme a disponibilidad presupuestal.', '2026-09-23 22:40:19.494'),
  ('AUTORIZADA',     'AUTORIZADA',      '22222222-2222-2222-2222-222222222222', 'Enviado a Presupuesto: paquete completo, listo para expedición de RP.', '2026-09-23 22:40:37.336'),
  ('AUTORIZADA',     'COMPROMETIDA',    '55555555-5555-5555-5555-555555555555', 'Registro Presupuestal expedido en SIIF Nación. Código: 2026-09-24_RP_24567.', '2026-09-23 22:42:22.834'),
  ('COMPROMETIDA',   'OBLIGADA',        '55555555-5555-5555-5555-555555555555', '[RF-PAG-001] Obligación registrada en SIIF Nación: OBL-2026-00481. Modalidad: RECONOCIMIENTO_POSTERIOR. RP: 2026-09-24_RP_24567. Valor obligado: $1.500.000.', '2026-09-23 22:42:34.276'),
  ('OBLIGADA',       'PAGADA',          '66666666-6666-6666-6666-666666666666', '[RF-PAG-003] Pago procesado por Tesorería. Estado: PAGADA. Valor desembolsado: $1.500.000. Modalidad: RECONOCIMIENTO_POSTERIOR. Obligación SIIF: OBL-2026-00481. Orden Pago: OP-SIIF-2026-98124.', '2026-09-23 22:42:43.005')
) AS h(estado_anterior, estado_nuevo, usuario_id, comentarios, creado_en)
WHERE s.consecutivo_unico = 'COM-2026-0001'
  AND NOT EXISTS (
    SELECT 1 FROM travel_expenses.solicitudes_historial_estados
    WHERE solicitud_id = s.id AND estado_nuevo = 'PAGADA'
  );

-- ----------------------------------------------------------------------------
-- Verificación rápida
-- ----------------------------------------------------------------------------
-- SELECT consecutivo_unico, estado_solicitud, numero_rp, numero_obligacion, valor_pagado
-- FROM travel_expenses.solicitudes_comision WHERE consecutivo_unico = 'COM-2026-0001';
