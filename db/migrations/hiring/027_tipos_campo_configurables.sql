-- Los tipos de campo que Contratación puede pedir desde la configuración.
--
-- El catálogo original solo cubría lo que el estudio previo necesitaba:
-- texto, número, moneda y lista. La configuración de etapas pide además
-- adjuntar un archivo, registrar una fecha, marcar una casilla y pedirle el
-- visto bueno a alguien, que son las formas en que se cierran las actividades
-- del resto de etapas.
--
-- `responsable` guarda a quién se le pide la aprobación, pero no lo fija la
-- configuración: quién aprueba cambia de un proceso a otro, así que lo elige
-- el gestor al diligenciar. Aquí solo se declara que la actividad lo exige.

ALTER TABLE hiring.campos_formulario
  DROP CONSTRAINT IF EXISTS ck_campo_tipo;

ALTER TABLE hiring.campos_formulario
  ADD CONSTRAINT ck_campo_tipo
  CHECK (tipo IN (
    'texto',
    'texto_largo',
    'numero',
    'moneda',
    'seleccion',
    'archivo',
    'fecha',
    'casilla',
    'responsable'
  ));
