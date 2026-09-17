-- ============================================================================
-- 070 · La causal de contratación deja de ser una constancia
--
-- La actividad 3.6 —3.5.1 en la matriz, que numera la causal como hija de la
-- modalidad— es la única de la etapa 3 que la matriz describe como un filtro:
-- «Causal de contratación · filtro según la modalidad». Y lo es en serio: solo
-- la marca SI en selección abreviada de menor cuantía, y en contratación
-- directa la celda ni siquiera dice SI, dice «Numeral 4 Artículo 2 de la Ley
-- 1150 de 2007». Esa celda ya está guardada como salvedad desde la 031.
--
-- Hasta ahora la 3.6 se cumplía con el registro de constancia de la 051: una
-- fecha, una nota y, si acaso, un soporte. Eso deja en el expediente que
-- alguien escribió algo el día tal, pero no **cuál** causal habilita contratar
-- por esta vía, que es lo que pide RF-EST-04 y lo que después tiene que
-- sustentar el acto administrativo de justificación de la directa —la 5.1, que
-- en esa modalidad reemplaza al pliego—. Una causal en prosa libre no se puede
-- filtrar por modalidad, ni contar, ni comprobar contra la modalidad ratificada
-- en la 3.5.
--
-- ---------------------------------------------------------------------------
-- Por qué un catálogo, si la 010 dijo que no
--
-- La 010 añadió `causal_normativa` al formulario del estudio previo como texto
-- largo y argumentó que un catálogo «obligaría a mantener un listado cerrado
-- con cada reforma». Ese campo se queda y no lo reemplaza esta migración: es
-- del **área**, en la 3.1, y sirve para que quien radica adelante la causal que
-- cree aplicable.
--
-- Lo que entra aquí es la decisión del abogado en la 3.6, y la objeción de la
-- 010 era a un listado **en código**. Este vive en base de datos, como las
-- modalidades de la 007 y por el mismo motivo: una reforma que agregue o quite
-- una causal es un INSERT o un UPDATE de `activa`, no un despliegue. Y el
-- sustento en prosa sigue existiendo —columna `causal_sustento`—, así que la
-- redacción normativa concreta y las combinaciones que la 010 quería preservar
-- caben igual.
-- ============================================================================

-- ------------------------------------------------ catálogo de causales -----
-- La modalidad es parte de la fila y no una tabla puente: una causal es de una
-- modalidad —la urgencia manifiesta no habilita una menor cuantía— y es
-- exactamente el filtro que pide la matriz. Si mañana la Dirección encuentra
-- una causal que sirve para dos, son dos filas, que es más barato que una
-- tabla de cruce para un catálogo de quince entradas.
CREATE TABLE IF NOT EXISTS hiring.causales_contratacion (
  codigo                varchar(60)  PRIMARY KEY,
  modalidad             varchar(60)  NOT NULL REFERENCES hiring.modalidades (codigo),
  nombre                varchar(300) NOT NULL,
  -- La disposición que la sustenta, tal como se cita en el expediente.
  referencia_normativa  varchar(200) NOT NULL,
  orden                 int          NOT NULL DEFAULT 0,
  -- Las derogadas dejan de ofrecerse sin romper los procesos que las usaron,
  -- igual que las modalidades de la 007.
  activa                boolean      NOT NULL DEFAULT true,
  -- Si la Dirección de Contratación ratificó la fila, con el mismo criterio de
  -- `actividades_con_soporte.confirmado` (051): lo que sale de la lectura del
  -- equipo viaja marcado como tal y no se disfraza de dato validado.
  confirmada            boolean      NOT NULL DEFAULT false,
  created_at            timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_causales_modalidad
  ON hiring.causales_contratacion (modalidad) WHERE activa;

COMMENT ON TABLE hiring.causales_contratacion IS
  'Actividad 3.6 (3.5.1 de la matriz): causales que habilitan contratar por una modalidad. La matriz la describe como «filtro según la modalidad» y solo la marca aplicable en selección abreviada de menor cuantía y en contratación directa.';

COMMENT ON COLUMN hiring.causales_contratacion.confirmada IS
  'False mientras la Dirección de Contratación no ratifique la fila. La semilla sale de la lectura del equipo sobre la Ley 1150 de 2007, no de un anexo firmado.';

-- ------------------------------------------------------------- la semilla --
-- Contratación directa · numeral 4 del artículo 2 de la Ley 1150 de 2007, que
-- es la disposición que la propia matriz escribe en la celda. El literal se
-- cita porque la enumeración de ese numeral es firme y es como el expediente
-- nombra la causal; aun así las filas entran sin confirmar.
INSERT INTO hiring.causales_contratacion
  (codigo, modalidad, nombre, referencia_normativa, orden) VALUES
  ('DIRECTA_URGENCIA_MANIFIESTA', 'CONTRATACION_DIRECTA',
   'Urgencia manifiesta',
   'Ley 1150 de 2007, art. 2, num. 4, lit. a)', 10),
  ('DIRECTA_EMPRESTITOS', 'CONTRATACION_DIRECTA',
   'Contratación de empréstitos',
   'Ley 1150 de 2007, art. 2, num. 4, lit. b)', 20),
  ('DIRECTA_INTERADMINISTRATIVO', 'CONTRATACION_DIRECTA',
   'Contratos interadministrativos',
   'Ley 1150 de 2007, art. 2, num. 4, lit. c)', 30),
  ('DIRECTA_DEFENSA_RESERVA', 'CONTRATACION_DIRECTA',
   'Bienes y servicios del sector defensa que necesiten reserva para su adquisición',
   'Ley 1150 de 2007, art. 2, num. 4, lit. d)', 40),
  ('DIRECTA_CIENCIA_Y_TECNOLOGIA', 'CONTRATACION_DIRECTA',
   'Desarrollo de actividades científicas y tecnológicas',
   'Ley 1150 de 2007, art. 2, num. 4, lit. e)', 50),
  ('DIRECTA_ENCARGO_FIDUCIARIO', 'CONTRATACION_DIRECTA',
   'Encargo fiduciario de entidades territoriales en acuerdo de reestructuración de pasivos',
   'Ley 1150 de 2007, art. 2, num. 4, lit. f)', 60),
  ('DIRECTA_SIN_PLURALIDAD', 'CONTRATACION_DIRECTA',
   'Inexistencia de pluralidad de oferentes en el mercado',
   'Ley 1150 de 2007, art. 2, num. 4, lit. g)', 70),
  ('DIRECTA_SERVICIOS_PROFESIONALES', 'CONTRATACION_DIRECTA',
   'Prestación de servicios profesionales y de apoyo a la gestión, y trabajos artísticos que solo puedan encomendarse a determinadas personas naturales',
   'Ley 1150 de 2007, art. 2, num. 4, lit. h)', 80),
  ('DIRECTA_INMUEBLES', 'CONTRATACION_DIRECTA',
   'Arrendamiento o adquisición de inmuebles',
   'Ley 1150 de 2007, art. 2, num. 4, lit. i)', 90),

  -- Selección abreviada de menor cuantía · numeral 2 del mismo artículo. Aquí
  -- la referencia se queda en el numeral y no baja al literal: el numeral 2
  -- reúne las causales de **todas** las selecciones abreviadas —la subasta
  -- inversa, la bolsa de productos, la enajenación— y cuáles de ellas se
  -- tramitan como menor cuantía en la Escuela es justo lo que la Dirección
  -- tiene que ratificar. Citar un literal que no hemos verificado pondría en el
  -- expediente una precisión que no tenemos.
  ('MENOR_CUANTIA_POR_CUANTIA', 'ABREVIADA_MENOR_CUANTIA',
   'Contratación de menor cuantía según el presupuesto de la entidad',
   'Ley 1150 de 2007, art. 2, num. 2', 10),
  ('MENOR_CUANTIA_LICITACION_DESIERTA', 'ABREVIADA_MENOR_CUANTIA',
   'Licitación pública declarada desierta',
   'Ley 1150 de 2007, art. 2, num. 2', 20),
  ('MENOR_CUANTIA_SERVICIOS_SALUD', 'ABREVIADA_MENOR_CUANTIA',
   'Prestación de servicios de salud',
   'Ley 1150 de 2007, art. 2, num. 2', 30),
  ('MENOR_CUANTIA_PROGRAMAS_PROTECCION', 'ABREVIADA_MENOR_CUANTIA',
   'Programas de protección de personas amenazadas, desmovilización y reincorporación',
   'Ley 1150 de 2007, art. 2, num. 2', 40),
  ('MENOR_CUANTIA_ACTIVIDADES_EICE', 'ABREVIADA_MENOR_CUANTIA',
   'Actividades comerciales e industriales propias de las empresas industriales y comerciales del Estado',
   'Ley 1150 de 2007, art. 2, num. 2', 50)
ON CONFLICT (codigo) DO NOTHING;

-- ------------------------------------------------- la causal del proceso ---
-- Junto a la modalidad y no en el `datos` de la actividad: la causal es del
-- proceso, la lee la 5.1 para redactar el acto de justificación y la leerán los
-- reportes de la 10.x. Enterrada en un jsonb de la 3.6, cada lector tendría que
-- saber en qué actividad buscarla.
ALTER TABLE hiring.procesos
  ADD COLUMN IF NOT EXISTS causal varchar(60),
  ADD COLUMN IF NOT EXISTS causal_sustento text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_procesos_causal'
  ) THEN
    ALTER TABLE hiring.procesos
      ADD CONSTRAINT fk_procesos_causal
      FOREIGN KEY (causal) REFERENCES hiring.causales_contratacion (codigo);
  END IF;
END $$;

COMMENT ON COLUMN hiring.procesos.causal IS
  'Causal elegida en la 3.6 por el abogado que lleva el proceso. Nula en las nueve modalidades donde la matriz no marca la actividad.';

COMMENT ON COLUMN hiring.procesos.causal_sustento IS
  'Por qué el objeto encaja en esa causal, en las palabras del abogado. Opcional: la causal es el dato, esto es la motivación que alimenta el acto de justificación.';

-- --------------------------------------------- lo que se queda como está ---
-- La fila de la 3.6 en `actividades_con_soporte` (059) no se borra. Es el mismo
-- criterio con que se quedaron las de la 3.3, la 3.4 y la 3.5 cuando esas tres
-- salieron del registro de constancia con EFDS-1183: quien manda es la lista
-- `NUMERALES_CON_REGISTRO` del servicio, la fila sobrante no habilita nada, y
-- borrarla arrastraría los registros que algún proceso ya haya guardado ahí.
--
-- Los procesos que ya cumplieron la 3.6 por esa vía tampoco se tocan: su
-- actividad sigue en APROBADO y su registro sigue en el expediente. Quedan sin
-- causal —en NULL, que es la verdad: nadie eligió ninguna— y el panel se lo
-- dice a quien lo abra, en vez de inventarle una a partir de una nota libre.
