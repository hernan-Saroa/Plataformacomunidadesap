-- APROVISIONAMIENTO DE DESARROLLO EXCLUSIVO EFDS-1311. NO EJECUTAR EN PRODUCCIÓN.
-- Idempotente. No modifica COM-2026-0001 ni configuraciones compartidas.
BEGIN;
INSERT INTO travel_expenses.comisionados
  (id, numero_documento, primer_nombre, primer_apellido, email, telefono_contacto, tipo_comisionado, origen_datos)
SELECT ('13110000-0000-4000-8000-00000000900' || n)::uuid, 'TEST1311900' || n,
  'Prueba1311', 'Caso900' || n, 'efds1311-' || n || '@example.invalid', '0000000000', 'FUNCIONARIO', 'ESAP'
FROM generate_series(1,3) n ON CONFLICT DO NOTHING;
INSERT INTO travel_expenses.solicitudes_comision
  (id, consecutivo_unico, comisionado_id, destino_ciudad, destino_departamento, fecha_inicio, fecha_fin,
   objeto_comision, prioridad, rubro_presupuestal, estado_solicitud, creado_por_usuario_id, modalidad_pago)
SELECT ('13110000-0001-4000-8000-00000000900' || n)::uuid, 'COM-2026-900' || n,
  ('13110000-0000-4000-8000-00000000900' || n)::uuid, 'Bogotá', 'Bogotá D.C.', '2026-09-01', '2026-09-03',
  'Prueba de desarrollo EFDS-1311', 'MEDIA', 'Prueba EFDS-1311',
  CASE n WHEN 1 THEN 'LEGALIZADO' WHEN 2 THEN 'PENDIENTE_LEGALIZACION' ELSE 'PAGADA' END,
  '13110000-0002-4000-8000-000000009001'::uuid, 'AVANCE'
FROM generate_series(1,3) n ON CONFLICT DO NOTHING;
COMMIT;
