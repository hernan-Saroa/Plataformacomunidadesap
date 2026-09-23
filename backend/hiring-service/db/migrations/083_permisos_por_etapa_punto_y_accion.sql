-- ============================================================================
-- 083 · Permisos por etapa, punto y acción
--
-- El módulo llegó a treinta y seis permisos y ninguno sabe de etapas.
-- `actividad.edit` protege cincuenta y cuatro endpoints de la 3 a la 10 y
-- `proceso.view` otros cincuenta y cinco: quien puede editar, puede editar los
-- sesenta puntos. Los otros veinte y tantos son en realidad «acción + etapa»
-- fosilizados con otro nombre —`presupuesto.gestionar` es editar la 4.2 y la
-- 4.3, expedir en la 8.3, pagar en la 9.4—, y cada vez que un punto tuvo un
-- responsable distinto se inventó uno más.
--
-- A partir de aquí la autorización se parte en dos capas:
--
--   QUÉ   · cuatro permisos de acción en `auth.permission`, que el backoffice
--           asigna a los roles como siempre: ver, editar, aprobar y decidir.
--   DÓNDE · `hiring.alcances_permiso`, que dice en qué etapas, puntos o
--           trámites aplica cada acción de cada rol.
--
-- Hacen falta las dos. El permiso sin alcance no abre nada, y el alcance de un
-- rol al que el backoffice le quitó el permiso tampoco: así quien administra
-- roles puede retirar una facultad entera sin entrar a la matriz del módulo.
--
-- Meter la etapa en el código del permiso (`ver_etapa_3`, `ver_punto_7_2`) se
-- descartó: con sesenta puntos y cuatro acciones son doscientas cuarenta
-- casillas en un backoffice que es de toda la plataforma.
--
-- ------------------------------------------------------- las cuatro acciones --
--
--   ver      consultar el punto, sus documentos y su historial.
--   editar   diligenciar, adjuntar, enviar a revisión, solicitar, radicar.
--   aprobar  el visto bueno intermedio: aprobar, devolver, avalar, dar el
--            respaldo presupuestal.
--   decidir  el acto que obliga a la entidad: adjudicar, expedir, pagar,
--            conceder, sancionar, designar, archivar.
--
-- Aprobar y decidir no se funden porque tres puntos tienen tres actores en fila
-- y el alcance por punto no alcanza a separarlos: en la 9.4 radica el gestor,
-- avala el supervisor y paga la Financiera; en la 9.5 solicita el gestor, da el
-- respaldo la Financiera y concede el Ordenador; en la 8.3 solicita el gestor y
-- la Financiera expide el RP.
--
-- Editar, aprobar o decidir en un alcance implican verlo. Eso lo resuelve el
-- código y no se siembra como filas de «ver».
--
-- --------------------------------------------------- los que no cambian ----
--
-- Cinco permisos no dependen de ninguna etapa y se quedan con su código:
-- `proceso.view-all` (sobre qué procesos, no sobre qué punto), `proceso.assign`
-- (el reparto de la Dirección), `config.manage`, `reporte.view` y
-- `plazo.terminar`. Los treinta y uno restantes se desactivan cuando el último
-- endpoint deje de nombrarlos, no aquí: mientras convivan, el guard viejo sigue
-- funcionando.
--
-- Idempotente y aditiva, como la 060: solo inserta lo que falta, y lo que la
-- entidad haya ajustado desde la pantalla sobrevive a reaplicarla.
-- ============================================================================

-- ------------------------------------------------- los permisos de acción ----
INSERT INTO auth.permission (code, name, description, id_module, is_active)
SELECT v.code, v.name, v.description, m.id_module, true
FROM auth.module m
CROSS JOIN (VALUES
  ('contratacion.ver',
   'Ver',
   'Consultar las etapas y puntos del proceso que el alcance del rol le asigna.'),
  ('contratacion.editar',
   'Editar',
   'Diligenciar, adjuntar, enviar a revisión y solicitar en los puntos que el alcance del rol le asigna.'),
  ('contratacion.aprobar',
   'Aprobar',
   'Aprobar, devolver o avalar lo que otro diligenció, en los puntos que el alcance del rol le asigna.'),
  ('contratacion.decidir',
   'Decidir',
   'Emitir el acto que obliga a la entidad —adjudicar, expedir, pagar, conceder, sancionar, designar, archivar— en los puntos que el alcance del rol le asigna.')
) AS v(code, name, description)
WHERE m.code = 'contratacion'
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------------------------ la tabla -----
--
-- Una fila es «este rol puede hacer esta acción aquí». El «aquí» tiene cuatro
-- formas y a lo sumo una columna llena:
--
--   etapa, numeral y trámite vacíos   todo el módulo
--   etapa                             la etapa entera, con todos sus puntos
--   numeral                           ese punto y nada más
--   trámite                           INC.1 (reporte de presunto
--                                     incumplimiento) o INC.2 (trámite
--                                     sancionatorio), que no tienen numeral
--                                     en la matriz
--
-- El incumplimiento va aparte y no dentro de la etapa 9 a propósito: con una
-- sola casilla, el supervisor que reporta el hecho podría también instruir el
-- trámite que lo juzga. Solo «todo el módulo» cubre los dos trámites.
--
-- `rol_id` apunta a auth.role por id y no por código: el administrador puede
-- renombrar el rol desde el backoffice y su alcance tiene que seguirlo. Es la
-- primera FK de `hiring` hacia `auth`; se acepta porque la alternativa —el
-- código como texto— es justo lo que el renombrado rompería, y el ON DELETE
-- CASCADE hace que borrar un rol no deje alcances huérfanos.
--
-- `confirmado`, como los plazos y los umbrales: la siembra de abajo reproduce
-- lo que hace hoy cada rol, pero nadie de Contratación la ha ratificado.
CREATE TABLE IF NOT EXISTS hiring.alcances_permiso (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rol_id      uuid NOT NULL REFERENCES auth.role(id) ON DELETE CASCADE,
  accion      varchar(10) NOT NULL,
  etapa       smallint,
  numeral     varchar(20) REFERENCES hiring.actividades(numeral),
  tramite     varchar(10),
  confirmado  boolean NOT NULL DEFAULT false,
  activo      boolean NOT NULL DEFAULT true,
  created_by  varchar(150),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ck_alcance_accion
    CHECK (accion IN ('ver', 'editar', 'aprobar', 'decidir')),
  CONSTRAINT ck_alcance_etapa
    CHECK (etapa IS NULL OR etapa BETWEEN 1 AND 10),
  CONSTRAINT ck_alcance_tramite
    CHECK (tramite IS NULL OR tramite IN ('INC.1', 'INC.2')),
  CONSTRAINT ck_alcance_una_forma
    CHECK (num_nonnulls(etapa, numeral, tramite) <= 1)
);

-- Una fila vigente por rol, acción y lugar. Índice parcial y no UNIQUE a
-- secas: retirar un alcance es apagarlo, y volver a darlo no debe chocar con
-- la fila apagada.
CREATE UNIQUE INDEX IF NOT EXISTS uq_alcance_vigente
  ON hiring.alcances_permiso (
    rol_id, accion, COALESCE(etapa, 0), COALESCE(numeral, ''), COALESCE(tramite, '')
  )
  WHERE activo;

-- La consulta de cada petición autorizada: los alcances de estos roles.
CREATE INDEX IF NOT EXISTS ix_alcances_rol
  ON hiring.alcances_permiso (rol_id)
  WHERE activo;

-- ------------------------------------------- lo que hace hoy cada rol ----
--
-- Se siembra la equivalencia del comportamiento actual, rol por rol, para que
-- el día que los endpoints cambien de guard nadie gane ni pierda acceso sin
-- que alguien lo haya decidido. Sale de cruzar los 225 decoradores con el
-- numeral de cada controlador. Cuatro excepciones son a propósito y se dicen
-- en su fila.
--
-- El lugar va como texto y se reparte en su columna al insertar: 'TODO', 'E5'
-- para una etapa, '4.2' para un punto, 'INC.1' para un trámite.
INSERT INTO hiring.alcances_permiso (rol_id, accion, etapa, numeral, tramite, created_by)
SELECT r.id,
       v.accion,
       CASE WHEN v.lugar ~ '^E[0-9]+$' THEN substring(v.lugar FROM 2)::smallint END,
       CASE WHEN v.lugar ~ '^[0-9]+\.[0-9]+$' THEN v.lugar END,
       CASE WHEN v.lugar LIKE 'INC.%' THEN v.lugar END,
       'migracion-083'
FROM (VALUES
  -- Gestor: el trámite corriente del expediente. `actividad.edit` le abría
  -- todos los puntos; aquí se enumeran los que de verdad tocan sus endpoints,
  -- sin la 4.2 y la 4.3 (Financiera), la 6.3 (el comité) ni la 10.1 (el
  -- supervisor), que hoy protege otro permiso.
  ('GESTOR_CONTRATACION', 'ver',     'TODO'),
  ('GESTOR_CONTRATACION', 'editar',  '3.1'),
  ('GESTOR_CONTRATACION', 'editar',  '3.2'),
  ('GESTOR_CONTRATACION', 'editar',  '3.3'),   -- tomar de la bandeja (proceso.take)
  ('GESTOR_CONTRATACION', 'editar',  '3.5'),
  ('GESTOR_CONTRATACION', 'editar',  '3.6'),
  ('GESTOR_CONTRATACION', 'editar',  '3.7'),
  ('GESTOR_CONTRATACION', 'editar',  '4.1'),
  ('GESTOR_CONTRATACION', 'editar',  '4.4'),
  ('GESTOR_CONTRATACION', 'editar',  'E5'),
  ('GESTOR_CONTRATACION', 'editar',  '6.1'),
  ('GESTOR_CONTRATACION', 'editar',  '6.4'),
  ('GESTOR_CONTRATACION', 'editar',  '6.5'),
  ('GESTOR_CONTRATACION', 'editar',  '6.6'),
  ('GESTOR_CONTRATACION', 'editar',  '6.7'),
  ('GESTOR_CONTRATACION', 'editar',  '6.8'),
  ('GESTOR_CONTRATACION', 'editar',  '6.9'),
  ('GESTOR_CONTRATACION', 'editar',  '6.10'),
  ('GESTOR_CONTRATACION', 'editar',  'E7'),    -- proyectar; adjudicar es decidir
  ('GESTOR_CONTRATACION', 'editar',  'E8'),
  ('GESTOR_CONTRATACION', 'editar',  '9.1'),   -- acta de inicio
  ('GESTOR_CONTRATACION', 'editar',  '9.2'),   -- seguimiento
  ('GESTOR_CONTRATACION', 'editar',  '9.4'),   -- radicar la cuenta
  ('GESTOR_CONTRATACION', 'editar',  '9.5'),   -- solicitar la modificación
  ('GESTOR_CONTRATACION', 'editar',  '10.2'),
  ('GESTOR_CONTRATACION', 'editar',  '10.4'),  -- publicar el acta
  ('GESTOR_CONTRATACION', 'editar',  'INC.2'), -- instruir el sancionatorio
  ('GESTOR_CONTRATACION', 'decidir', '10.3'),  -- cierre definitivo
  ('GESTOR_CONTRATACION', 'decidir', '10.4'),  -- archivar y reabrir

  -- Director: lee todo, aprueba lo de la Dirección y decide lo que la
  -- matriz le reconoce. Primera excepción: hoy puede conceder una
  -- modificación porque aprobarla exige `solicitar` (modificaciones.controller
  -- :279); aquí la concede por `decidir` en la 9.5, que es lo que la 060 quiso.
  ('DIRECTOR_CONTRATACION', 'ver',     'TODO'),
  ('DIRECTOR_CONTRATACION', 'editar',  '3.3'),
  ('DIRECTOR_CONTRATACION', 'editar',  '9.5'),
  ('DIRECTOR_CONTRATACION', 'editar',  '10.4'),
  ('DIRECTOR_CONTRATACION', 'editar',  'INC.2'),
  ('DIRECTOR_CONTRATACION', 'aprobar', 'E3'),
  ('DIRECTOR_CONTRATACION', 'aprobar', 'E4'),
  ('DIRECTOR_CONTRATACION', 'aprobar', 'E5'),
  ('DIRECTOR_CONTRATACION', 'aprobar', 'E6'),
  ('DIRECTOR_CONTRATACION', 'aprobar', 'E7'),
  ('DIRECTOR_CONTRATACION', 'aprobar', 'E8'),
  ('DIRECTOR_CONTRATACION', 'decidir', '9.5'),
  ('DIRECTOR_CONTRATACION', 'decidir', '10.4'),
  ('DIRECTOR_CONTRATACION', 'decidir', 'INC.2'),

  -- Revisor (el abogado): aprueba de la 3 a la 8, que es donde
  -- `actividad.approve` protege algo.
  ('REVISOR_CONTRATACION', 'ver',     'TODO'),
  ('REVISOR_CONTRATACION', 'aprobar', 'E3'),
  ('REVISOR_CONTRATACION', 'aprobar', 'E4'),
  ('REVISOR_CONTRATACION', 'aprobar', 'E5'),
  ('REVISOR_CONTRATACION', 'aprobar', 'E6'),
  ('REVISOR_CONTRATACION', 'aprobar', 'E7'),
  ('REVISOR_CONTRATACION', 'aprobar', 'E8'),

  -- Estructurador técnico. Segunda excepción: `actividad.edit` le abría todos
  -- los puntos, y la 060 se lo dio solo para que «elabore estudios previos».
  -- Aquí queda en la 3.1 y la 3.2, que es lo que dice el formato.
  ('ESTRUCTURADOR_TECNICO', 'ver',    'E1'),
  ('ESTRUCTURADOR_TECNICO', 'ver',    'E2'),
  ('ESTRUCTURADOR_TECNICO', 'ver',    'E3'),
  ('ESTRUCTURADOR_TECNICO', 'ver',    'E4'),
  ('ESTRUCTURADOR_TECNICO', 'ver',    'E5'),
  ('ESTRUCTURADOR_TECNICO', 'ver',    'E6'),
  ('ESTRUCTURADOR_TECNICO', 'ver',    'E7'),
  ('ESTRUCTURADOR_TECNICO', 'ver',    'E8'),
  ('ESTRUCTURADOR_TECNICO', 'editar', '3.1'),
  ('ESTRUCTURADOR_TECNICO', 'editar', '3.2'),

  -- Dirección Financiera: lo que era `presupuesto.gestionar`, punto por punto.
  -- Tercera excepción, a su favor: hoy no puede leer el estado de los pagos ni
  -- del cierre financiero —esos GET piden `seguimiento.ver`— aunque sea ella
  -- quien paga y cierra. Como la acción implica ver, eso se arregla solo.
  ('ESTRUCTURADOR_FINANCIERO', 'ver',     'E1'),
  ('ESTRUCTURADOR_FINANCIERO', 'ver',     'E2'),
  ('ESTRUCTURADOR_FINANCIERO', 'ver',     'E3'),
  ('ESTRUCTURADOR_FINANCIERO', 'ver',     'E4'),
  ('ESTRUCTURADOR_FINANCIERO', 'ver',     'E5'),
  ('ESTRUCTURADOR_FINANCIERO', 'ver',     'E6'),
  ('ESTRUCTURADOR_FINANCIERO', 'ver',     'E7'),
  ('ESTRUCTURADOR_FINANCIERO', 'ver',     'E8'),
  ('ESTRUCTURADOR_FINANCIERO', 'editar',  '4.2'),  -- tomar, verificar, rechazar
  ('ESTRUCTURADOR_FINANCIERO', 'editar',  '4.3'),  -- expedir el CDP
  ('ESTRUCTURADOR_FINANCIERO', 'editar',  '4.4'),
  ('ESTRUCTURADOR_FINANCIERO', 'editar',  '10.3'), -- cierre financiero
  ('ESTRUCTURADOR_FINANCIERO', 'aprobar', '9.5'),  -- respaldo de la modificación
  ('ESTRUCTURADOR_FINANCIERO', 'decidir', '8.3'),  -- expedir el RP
  ('ESTRUCTURADOR_FINANCIERO', 'decidir', '9.4'),  -- tramitar el pago

  -- Ordenador del Gasto: los actos que comprometen a la entidad. Hoy no tiene
  -- `proceso.view` y no lo gana: ve la ejecución y lo que decide.
  ('ORDENADOR_GASTO', 'ver',     'E9'),
  ('ORDENADOR_GASTO', 'ver',     'E10'),
  ('ORDENADOR_GASTO', 'ver',     'INC.1'),
  ('ORDENADOR_GASTO', 'ver',     'INC.2'),
  ('ORDENADOR_GASTO', 'editar',  '9.1'),   -- acta de inicio
  ('ORDENADOR_GASTO', 'editar',  '9.4'),   -- radicar la cuenta: hoy lo hace con
                                           -- `acta-inicio.suscribir`, y se
                                           -- conserva hasta que alguien lo corrija
  ('ORDENADOR_GASTO', 'decidir', '6.2'),   -- designar el comité
  ('ORDENADOR_GASTO', 'decidir', '7.4'),   -- adjudicar
  ('ORDENADOR_GASTO', 'decidir', '8.1'),   -- firmar el contrato por la entidad.
                                           -- Cuarta excepción: hoy no puede,
                                           -- porque firmar exige `actividad.edit`
                                           -- y el service reserva esa firma al
                                           -- ordenador; no la registraba nadie
  ('ORDENADOR_GASTO', 'decidir', '8.2'),   -- designar al supervisor
  ('ORDENADOR_GASTO', 'decidir', '9.3'),   -- reasignar la supervisión
  ('ORDENADOR_GASTO', 'decidir', '9.5'),   -- conceder la modificación
  ('ORDENADOR_GASTO', 'decidir', 'INC.2'), -- decidir el sancionatorio

  -- Supervisor del contrato.
  ('SUPERVISOR_CONTRATO', 'ver',     'E9'),
  ('SUPERVISOR_CONTRATO', 'ver',     'E10'),
  ('SUPERVISOR_CONTRATO', 'ver',     'INC.2'),
  ('SUPERVISOR_CONTRATO', 'editar',  '9.1'),
  ('SUPERVISOR_CONTRATO', 'editar',  '9.2'),
  ('SUPERVISOR_CONTRATO', 'editar',  '9.4'),
  ('SUPERVISOR_CONTRATO', 'editar',  '10.1'),  -- informe final
  ('SUPERVISOR_CONTRATO', 'editar',  'INC.1'), -- reportar el incumplimiento
  ('SUPERVISOR_CONTRATO', 'aprobar', '9.4'),   -- avalar la cuenta

  -- Apoyo a la supervisión: solo lectura, sin el incumplimiento (que hoy
  -- tampoco ve).
  ('APOYO_SUPERVISION', 'ver', 'E1'),
  ('APOYO_SUPERVISION', 'ver', 'E2'),
  ('APOYO_SUPERVISION', 'ver', 'E3'),
  ('APOYO_SUPERVISION', 'ver', 'E4'),
  ('APOYO_SUPERVISION', 'ver', 'E5'),
  ('APOYO_SUPERVISION', 'ver', 'E6'),
  ('APOYO_SUPERVISION', 'ver', 'E7'),
  ('APOYO_SUPERVISION', 'ver', 'E8'),
  ('APOYO_SUPERVISION', 'ver', 'E9'),
  ('APOYO_SUPERVISION', 'ver', 'E10'),

  -- El comité evaluador: registra en la 6.3 y consulta lo que viene después,
  -- que hoy le abren los GET que aceptan `evaluacion.registrar`. La membresía
  -- del comité de cada proceso sigue decidiendo quién registra (EFDS-1438).
  ('EVALUADOR_JURIDICO',   'editar', '6.3'),
  ('EVALUADOR_JURIDICO',   'ver',    '6.4'),
  ('EVALUADOR_JURIDICO',   'ver',    '6.5'),
  ('EVALUADOR_JURIDICO',   'ver',    '7.1'),
  ('EVALUADOR_JURIDICO',   'ver',    '7.3'),
  ('EVALUADOR_JURIDICO',   'ver',    '7.4'),
  ('EVALUADOR_FINANCIERO', 'editar', '6.3'),
  ('EVALUADOR_FINANCIERO', 'ver',    '6.4'),
  ('EVALUADOR_FINANCIERO', 'ver',    '6.5'),
  ('EVALUADOR_FINANCIERO', 'ver',    '7.1'),
  ('EVALUADOR_FINANCIERO', 'ver',    '7.3'),
  ('EVALUADOR_FINANCIERO', 'ver',    '7.4'),
  ('EVALUADOR_TECNICO',    'editar', '6.3'),
  ('EVALUADOR_TECNICO',    'ver',    '6.4'),
  ('EVALUADOR_TECNICO',    'ver',    '6.5'),
  ('EVALUADOR_TECNICO',    'ver',    '7.1'),
  ('EVALUADOR_TECNICO',    'ver',    '7.3'),
  ('EVALUADOR_TECNICO',    'ver',    '7.4'),

  -- Archivo de Gestión: la custodia del expediente y la consulta de auditoría.
  ('ARCHIVO_GESTION_DC', 'ver',     'TODO'),
  ('ARCHIVO_GESTION_DC', 'editar',  '10.4'),
  ('ARCHIVO_GESTION_DC', 'decidir', '10.4'),

  -- Ente de control: `expediente.auditar` pasa a ser ver todo el módulo. Qué
  -- procesos alcanza lo sigue decidiendo `proceso.view-all`, que no tiene.
  ('ENTE_DE_CONTROL', 'ver', 'TODO'),

  -- Superadministrador: todas las acciones en todo el módulo.
  ('SUPER_ADMIN', 'ver',     'TODO'),
  ('SUPER_ADMIN', 'editar',  'TODO'),
  ('SUPER_ADMIN', 'aprobar', 'TODO'),
  ('SUPER_ADMIN', 'decidir', 'TODO')
) AS v(rol, accion, lugar)
JOIN auth.role r ON r.code = v.rol
ON CONFLICT DO NOTHING;

-- ADMINISTRADOR_CONTRATACION no tiene alcance: configura y genera informes, y
-- eso lo siguen dando `config.manage` y `reporte.view`, que no son de etapa.

-- ------------------------------------- el permiso que acompaña al alcance --
--
-- Cada rol recibe el permiso de las acciones en las que tiene algún alcance.
-- Se deriva de la tabla y no se escribe a mano para que las dos capas no
-- puedan discrepar el día de la siembra.
INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT DISTINCT a.rol_id, p.id_permission, true
FROM hiring.alcances_permiso a
JOIN auth.permission p ON p.code = 'contratacion.' || a.accion
WHERE a.activo
ON CONFLICT (id_rol, id_permission) DO NOTHING;
