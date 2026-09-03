-- ============================================================================
-- 061 · La aprobación de una actividad se configura, no se programa
--
-- Siete actividades se aprueban hoy —el estudio previo, el CDP, las garantías,
-- el aval del pago…— y cada una lo hace porque alguien escribió ese ciclo
-- dentro de su panel. Lo que no existe es poder decir que otra también lo
-- exige: si Contratación decide que la 3.5 debe pasar por el Director, hoy hay
-- que programarlo y desplegar.
--
-- La exigencia pasa a ser una regla más de `reglas_actividad`, la tabla que ya
-- declara qué hay que cumplir para dar una actividad por terminada. Va ahí y no
-- en una tabla nueva porque esa ya resuelve la vigencia: un proceso aprobado en
-- marzo se sigue auditando con la regla de marzo, y cambiar hoy quién aprueba
-- no reescribe lo que se decidió antes.
--
-- `config` lleva a quién le corresponde:
--
--   { "roles": ["DIRECTOR_CONTRATACION"], "personas": ["uuid"] }
--
-- Los dos conjuntos son opcionales y se admite mezclarlos. Basta con que
-- apruebe uno: exigir unanimidad convertiría cada ausencia en un bloqueo, y
-- llevaría a configurar un solo aprobador para evitarlo, perdiendo el respaldo
-- que justificaba admitir varios.
--
-- No se siembra ninguna regla. Las actividades siguen comportándose igual que
-- hoy hasta que el área marque la primera: sembrar once «porque la matriz las
-- sugiere» sería convertir una lectura del texto de un Excel en el
-- comportamiento por defecto del sistema.
-- ============================================================================

-- ------------------------------------------------- el tipo de regla nuevo ---
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_regla_tipo'
      AND pg_get_constraintdef(oid) LIKE '%EXIGE_APROBACION%'
  ) THEN
    ALTER TABLE hiring.reglas_actividad DROP CONSTRAINT IF EXISTS ck_regla_tipo;
    ALTER TABLE hiring.reglas_actividad ADD CONSTRAINT ck_regla_tipo CHECK (tipo IN (
      'CAMPO_OBLIGATORIO',
      'DOCUMENTO_REQUERIDO',
      'RANGO_VALOR',
      'PLAZO_MINIMO',
      'BLOQUEA_AVANCE',
      'REGLA_DERIVADA',
      'EXIGE_APROBACION'
    ));
  END IF;
END $$;

-- --------------------------------------------- quién envió a aprobación -----
--
-- `proceso_actividades` ya guarda `enviado_por` y el estado EN_REVISION, que
-- usa el estudio previo. Falta el id: comparar por nombre para decidir si
-- alguien se está aprobando su propio trabajo es frágil —dos personas pueden
-- llamarse igual, y un correo corregido rompe la comparación—.
ALTER TABLE hiring.proceso_actividades
  ADD COLUMN IF NOT EXISTS enviado_por_id varchar(120);

COMMENT ON COLUMN hiring.proceso_actividades.enviado_por_id IS
  'Id del usuario que envió a aprobación. Permite impedir que quien ejecutó la actividad se la apruebe.';

-- ------------------------------------------- de dónde salen los aprobadores -
--
-- Vista de conveniencia para el selector del panel de configuración: los roles
-- que pueden aparecer como aprobadores son los que tienen algún permiso del
-- módulo. Sin esto el desplegable mostraría los 41 roles del sistema, entre
-- ellos «Revisor Verificacion Titulos» y uno llamado literalmente «asd», y
-- quien configura tendría que distinguirlos.
--
-- Un rol que el área cree y al que asigne permisos de contratación aparece
-- solo, sin tocar nada.
CREATE OR REPLACE VIEW hiring.roles_del_modulo AS
SELECT DISTINCT r.code, r.name, r.type
  FROM auth.role r
  JOIN auth.role_permissions rp ON rp.id_rol = r.id
  JOIN auth.permission p ON p.id_permission = rp.id_permission
  JOIN auth.module m ON m.id_module = p.id_module
 WHERE m.code = 'contratacion'
   AND r.is_active = true
   AND rp.is_active = true;

COMMENT ON VIEW hiring.roles_del_modulo IS
  'Roles que trabajan en contratación: los que tienen al menos un permiso del módulo. Alimenta el selector de aprobadores.';
