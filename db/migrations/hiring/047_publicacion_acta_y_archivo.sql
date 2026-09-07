-- ============================================================================
-- 047 · Publicación del acta de liquidación y archivo del expediente (10.4)
--
-- EFDS-1174 (RF-LIQ-04, RF-SIS-04): liquidado y cerrado financieramente el
-- contrato, el Archivo de Gestión publica el acta y archiva el expediente, que
-- queda disponible para consulta y auditoría.
--
-- **Sin integración con Active Document** (RF-SIS-04), mismo alcance que SECOP
-- II en toda la etapa 5 y que KLIC en el cierre financiero: aquí se registra el
-- radicado del archivo documental y su soporte; el archivo ocurre por fuera.
-- Cuando la integración entre, lo que cambia es de dónde sale la confirmación,
-- no estas tablas.
--
-- Es la última actividad de la matriz: la 10.4, «Archivar expediente
-- contractual». La publicación del acta no tiene numeral propio —la matriz no
-- se lo da—, y RF-LIQ-04 las enuncia juntas, así que las dos cumplen la 10.4.
-- ============================================================================

-- --------------------------------------------- el plazo para publicarla --
-- Fila única y parametrizable, con el mismo criterio del plazo de publicación
-- del contrato (migración 040): la cifra legal la confirma la Dirección de
-- Contratación, y hasta entonces se muestra advertida en vez de darse por
-- buena.
CREATE TABLE IF NOT EXISTS hiring.plazo_publicacion_acta (
  id             int          PRIMARY KEY DEFAULT 1,
  dias_habiles   int          NOT NULL,
  fundamento     text,
  confirmado     boolean      NOT NULL DEFAULT false,
  actualizado_at timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT ck_plazo_acta_unico CHECK (id = 1),
  CONSTRAINT ck_plazo_acta_dias CHECK (dias_habiles > 0)
);

-- VALOR TENTATIVO. Se siembra el mismo plazo general de publicación en el SECOP
-- —tres días hábiles desde la expedición del documento, Decreto 1082 de 2015,
-- art. 2.2.1.1.1.7.1— porque el acta de liquidación es uno de los documentos
-- del proceso. Ni la matriz ni el requerimiento fijan uno propio.
INSERT INTO hiring.plazo_publicacion_acta (id, dias_habiles, fundamento, confirmado)
VALUES (
  1, 3,
  'Decreto 1082 de 2015, art. 2.2.1.1.1.7.1 — tentativo: ninguna fuente del proyecto fija un plazo propio para el acta de liquidación. Confirmar con la Dirección de Contratación.',
  false
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE hiring.plazo_publicacion_acta IS
  'Plazo para publicar el acta de liquidación, parametrizable y marcado si está sin confirmar (EFDS-1174).';

-- --------------------------------------------- la publicación del acta --
/*
 * La FK va al ACTA y no al contrato, a diferencia de `publicaciones_contrato`.
 *
 * El acta de liquidación se puede anular (EFDS-1172) y en su lugar se firma
 * otra. Colgando la publicación del contrato quedaría dicho que «se publicó
 * algo», pero no cuál de las actas; colgándola del acta, anular la que se
 * publicó deja a la vista que lo publicado ya no es lo vigente.
 *
 * Tampoco se reutiliza `publicaciones_contrato` sumándole un tipo: su
 * `UNIQUE (contrato_id, destino)` habría que ampliarlo, y esa tabla responde
 * por la publicación del contrato (8.8), que es otro hecho con otro plazo.
 */
CREATE TABLE IF NOT EXISTS hiring.publicaciones_acta (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acta_id             uuid         NOT NULL REFERENCES hiring.actas_liquidacion(id) ON DELETE CASCADE,

  -- Mismo par de destinos que la publicación del contrato y por la misma razón:
  -- la historia dice SECOP II y la matriz habla de la página web de la ESAP.
  destino             varchar(20)  NOT NULL,

  -- La real, no la del registro: es la que cuenta para el plazo. Alguien puede
  -- registrar el lunes lo que publicó el viernes.
  fecha_publicacion   date         NOT NULL,

  -- Plazo vigente el día del registro, congelado. Si mañana cambia el
  -- parámetro, esta publicación se siguió juzgando con el de su momento.
  plazo_dias_habiles  int,
  fecha_limite        date,

  secop_numero        varchar(80),
  secop_url           text,

  -- Obligatoria: sin soporte no hay publicación registrada, solo la afirmación
  -- de que se hizo.
  documento_id        uuid         NOT NULL REFERENCES hiring.documentos(id),

  publicado_por       varchar(200),
  created_at          timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT ck_publicacion_acta_destino CHECK (destino IN ('SECOP_II', 'WEB_ESAP')),
  -- El plazo y su fecha límite van juntos o no van: uno sin el otro dejaría el
  -- control a medias.
  CONSTRAINT ck_publicacion_acta_plazo CHECK (
    (plazo_dias_habiles IS NULL) = (fecha_limite IS NULL)
  ),
  -- Una sola publicación por destino: registrar dos veces el mismo sitio sería
  -- contar dos veces el mismo hecho.
  CONSTRAINT uq_publicacion_acta_destino UNIQUE (acta_id, destino)
);

CREATE INDEX IF NOT EXISTS ix_publicaciones_acta
  ON hiring.publicaciones_acta (acta_id);

COMMENT ON TABLE hiring.publicaciones_acta IS
  'Publicaciones del acta de liquidación con su destino, evidencia y control de plazo (EFDS-1174).';

-- ------------------------------------------- el archivo del expediente --
/*
 * El expediente ya existe desde la migración 003 y ya tiene `estado` con
 * default 'ABIERTO' —pero sin CHECK, así que hasta hoy admitía cualquier
 * cadena—. Archivar es su segundo estado, y aquí se cierra esa puerta.
 *
 * No se crea una tabla de «archivos»: el expediente es único por proceso
 * (RF-SIS-04) y archivarlo es un estado suyo, no una entidad aparte. Una tabla
 * 1-a-1 solo agregaría un JOIN.
 */
ALTER TABLE hiring.expedientes
  ADD COLUMN IF NOT EXISTS archivado_at              timestamptz,
  ADD COLUMN IF NOT EXISTS archivado_por             varchar(200),
  /*
   * El índice documental congelado: qué contenía el expediente el día en que se
   * cerró, con el hash de cada documento.
   *
   * Mismo criterio del informe final, el acta y el cierre financiero, y aquí es
   * el que da sentido a la custodia: si mañana aparece un documento de más —o
   * falta uno—, el índice lo delata. Calcularlo al consultar diría siempre que
   * todo está en orden, que es justo lo que no se quiere.
   */
  ADD COLUMN IF NOT EXISTS indice_documental         jsonb,
  -- El radicado que devuelve Active Document, transcrito. Mientras no exista la
  -- integración es la única prueba de que el archivo documental se tramitó.
  ADD COLUMN IF NOT EXISTS radicado_active_document  varchar(120),
  ADD COLUMN IF NOT EXISTS observaciones_archivo     text,

  -- La reapertura: un expediente archivado que hay que volver a mover. Se
  -- guarda la última, porque el historial completo vive en trazabilidad.
  ADD COLUMN IF NOT EXISTS reabierto_at              timestamptz,
  ADD COLUMN IF NOT EXISTS reabierto_por             varchar(200),
  ADD COLUMN IF NOT EXISTS motivo_reapertura         text;

-- El estado que faltaba acotar. Se agrega con el patrón idempotente del resto
-- del módulo: las migraciones se aplican a mano y volver a correrlas no puede
-- fallar.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_expediente_estado'
  ) THEN
    ALTER TABLE hiring.expedientes
      ADD CONSTRAINT ck_expediente_estado
      CHECK (estado IN ('ABIERTO', 'ARCHIVADO'));
  END IF;
END $$;

-- Un expediente archivado dice cuándo se archivó y qué contenía. Sin el índice
-- el archivo no probaría nada, que es la mitad de lo que RF-SIS-04 pide.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_expediente_archivado'
  ) THEN
    ALTER TABLE hiring.expedientes
      ADD CONSTRAINT ck_expediente_archivado
      CHECK (
        estado <> 'ARCHIVADO'
        OR (archivado_at IS NOT NULL AND indice_documental IS NOT NULL)
      );
  END IF;
END $$;

-- Reabrir dice siempre por qué: el expediente ya se había declarado completo
-- ante entes de control, y volver a tocarlo tiene consecuencias fuera de la
-- plataforma. Mismo criterio que la reversión del cierre financiero.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_expediente_reabierto'
  ) THEN
    ALTER TABLE hiring.expedientes
      ADD CONSTRAINT ck_expediente_reabierto
      CHECK (reabierto_at IS NULL OR motivo_reapertura IS NOT NULL);
  END IF;
END $$;

-- Para responder «qué expedientes siguen abiertos», que es la pregunta del
-- Archivo de Gestión al cerrar la vigencia.
CREATE INDEX IF NOT EXISTS ix_expedientes_estado
  ON hiring.expedientes (estado);

COMMENT ON COLUMN hiring.expedientes.indice_documental IS
  'Índice congelado: qué documentos tenía el expediente el día en que se archivó (EFDS-1174).';

-- ------------------------------------------------ el rol que faltaba --
-- Mismo caso de las migraciones 015 y 025: el módulo va a exigir un rol que en
-- auth.role no existe, y sin sembrarlo la actividad queda inejecutable salvo
-- para un superadministrador.
--
-- Sembrar el rol NO es asignárselo a nadie: quién lo tiene se decide en el
-- backoffice de usuarios, que es de otro equipo y no se toca desde aquí.
INSERT INTO auth.role (id, code, name, description, category, type, is_active, color, icon, sistema_destino)
VALUES
  (uuid_generate_v4(),
   'ARCHIVO_GESTION_DC',
   'Archivo de Gestión DC',
   'Organiza y custodia los expedientes contractuales en su totalidad: publica el acta de liquidación y archiva el expediente al cierre del proceso.',
   'backoffice', 'sistema', true, '#6D28D9', 'Archive', 'Backoffice')
ON CONFLICT (code) DO NOTHING;
