-- Update descriptions after allowing an authorized uploader to review their own
-- evidence. Do not alter grants, user assignments, active flags or RUND records.
UPDATE auth.permission
SET description = 'Consulta RUND y registra datos y soportes de contratación. Este permiso no concede edición general ni aprobación.'
WHERE code = 'banco-docentes.rund.incorporacion';

UPDATE auth.role
SET description = 'Revisión documental según los permisos asignados.'
WHERE code = 'RUND_APROBADOR';
