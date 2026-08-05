-- ============================================================================
-- 007 · Modalidad del proceso
--
-- La matriz de flujo tiene una columna por modalidad y marca SI/NO en cada una
-- de las 63 actividades: la modalidad determina qué actividades aplican al
-- proceso. Enajenación de bienes por subasta, por ejemplo, no pasa por el PAA
-- ni por el CDP.
--
-- Por eso la modalidad deja de ser un dato del estudio previo y pasa a pedirse
-- al crear el proceso: sin ella no se puede armar el flujo. El motor que
-- instancia las actividades según la matriz es una HU aparte; aquí solo se
-- captura y valida el dato para que los procesos nazcan con él.
--
-- Sobre la actividad 3.1 no cambia nada: la matriz la marca SI en las once
-- modalidades, así que el estudio previo se elabora igual en todas.
-- ============================================================================

-- ------------------------------------------------ catálogo de modalidades ---
-- En tabla y no en un CHECK: el catálogo lo administra la Dirección de
-- Contratación y cambia con la normativa (el régimen especial 092/2017 es de
-- 2017; mañana puede haber otro). Un CHECK obligaría a migrar para agregar una.
CREATE TABLE IF NOT EXISTS hiring.modalidades (
  codigo        varchar(60)  PRIMARY KEY,
  nombre        varchar(160) NOT NULL,
  -- Orden de la columna en la matriz de flujo; conserva su lectura.
  orden         int          NOT NULL,
  -- Las modalidades derogadas dejan de ofrecerse sin romper los procesos que
  -- ya las usan.
  activa        boolean      NOT NULL DEFAULT true,
  created_at    timestamptz  NOT NULL DEFAULT now()
);

INSERT INTO hiring.modalidades (codigo, nombre, orden) VALUES
  ('LICITACION_PUBLICA',        'Licitación Pública',                              10),
  ('ABREVIADA_MENOR_CUANTIA',   'Selección Abreviada de Menor Cuantía',            20),
  ('ABREVIADA_SUBASTA_INVERSA', 'Selección Abreviada por Subasta Inversa',         30),
  ('ENAJENACION_SUBASTA',       'Enajenación de Bienes por Subasta',               40),
  ('ABREVIADA_TVEC',            'Selección Abreviada por TVEC',                    50),
  ('ABREVIADA_BOLSA_MERCANTIL', 'Selección Abreviada por Bolsa Mercantil',         60),
  ('CONCURSO_MERITOS_ABIERTO',  'Concurso de Méritos Abierto',                     70),
  ('CONCURSO_MERITOS_PRECAL',   'Concurso de Méritos con Precalificación',         80),
  ('MINIMA_CUANTIA',            'Mínima Cuantía',                                  90),
  ('REGIMEN_ESPECIAL_092',      'Régimen Especial Decreto 092 de 2017',           100),
  ('CONTRATACION_DIRECTA',      'Contratación Directa',                           110)
ON CONFLICT (codigo) DO NOTHING;

-- ------------------------------------------------- modalidad del proceso ----
-- 006 la agregó como texto libre. Pasa a referenciar el catálogo.
ALTER TABLE hiring.procesos
  ADD COLUMN IF NOT EXISTS modalidad varchar(60);

-- Los procesos creados antes de esta migración no tienen modalidad. Se dejan
-- en NULL a propósito: inventarles una falsearía el expediente. La columna
-- queda nullable y es el DTO el que la exige en las creaciones nuevas.
ALTER TABLE hiring.procesos
  ALTER COLUMN modalidad TYPE varchar(60);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_procesos_modalidad'
  ) THEN
    ALTER TABLE hiring.procesos
      ADD CONSTRAINT fk_procesos_modalidad
      FOREIGN KEY (modalidad) REFERENCES hiring.modalidades (codigo);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_procesos_modalidad ON hiring.procesos (modalidad);

-- ------------------------------------------- modalidad en el estudio previo -
-- El campo del formulario deja de pedirse: la modalidad ya viene del proceso y
-- pedirla dos veces abre la puerta a que se contradigan. Se conserva la fila
-- desactivada para no perder los valores ya diligenciados.
UPDATE hiring.campos_formulario
   SET activo = false
 WHERE numeral = '3.1' AND codigo = 'modalidad_propuesta';
