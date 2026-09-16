-- Migración 424: responsable_id en legal_management.actuaciones
--
-- Agrega la columna responsable_id (id de auth."user") a las actuaciones, para poder
-- notificar (in-app + correo) al usuario asignado como responsable de una actuación
-- recién registrada. La columna usuario_responsable existente solo guarda el nombre
-- para mostrar y no basta para resolver a quién notificar.

START TRANSACTION;

ALTER TABLE "legal_management"."actuaciones"
ADD COLUMN IF NOT EXISTS "responsable_id" VARCHAR(255) NULL;

COMMIT;
