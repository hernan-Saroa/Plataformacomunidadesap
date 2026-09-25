-- EFDS-1311: registra la capacidad sin asignarla a ningún rol por inferencia.
INSERT INTO auth.permission (code, name, description, id_module, is_active)
SELECT 'travel_expenses:paz_y_salvo.manage', 'Emitir paz y salvo de Viáticos',
       'Consultar pendientes, firmar por OTP y descargar paz y salvos con trazabilidad', id_module, true
FROM auth.module WHERE code = 'viaticos'
ON CONFLICT (code) DO NOTHING;
