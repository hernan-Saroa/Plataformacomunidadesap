-- EFDS-2452: un profesional OCI puede tener varios roles (p. ej. el Jefe OCI que también audita).
-- rol_ocig sigue siendo el rol principal; roles_adicionales guarda los demás para no tener que
-- eliminar y volver a agregar al profesional cuando cambia lo que hace.
ALTER TABLE control_interno.configuracion_profesionales_ocig
  ADD COLUMN IF NOT EXISTS roles_adicionales text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN control_interno.configuracion_profesionales_ocig.roles_adicionales IS
  'Roles OCI además del principal (rol_ocig): Jefe OCI, Auditor o Aprobador Plan Anual';
