-- ============================================================================
-- EFDS-1374 - Catálogo de AULAS y regla de publicación
--
-- ⚠️ DATOS DE AULAS PROVISIONALES (C-4). El catálogo oficial de aulas no ha
-- llegado; se siembra un conjunto mínimo marcado como provisional para poder
-- construir y demostrar el bloqueo de aula. Cuando llegue el catálogo real, es
-- carga de datos: se reemplazan estas filas, no el modelo.
--
-- El bloqueo de aula (un salón no puede alojar dos sesiones que se cruzan en día
-- y hora) se valida en la capa de aplicación reusando `seSolapan`, no con una
-- exclusion constraint, porque la franja guarda hora como texto y la ventana se
-- compara con la misma granularidad que el resto del horario.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "academic-schedule".aula (
    codigo        VARCHAR(40) PRIMARY KEY,
    nombre        VARCHAR(120) NOT NULL,
    sede_codigo   VARCHAR(40),
    capacidad     INT CHECK (capacidad IS NULL OR capacidad >= 0),
    -- Deja explícito que es aprovisionamiento, no dato oficial.
    provisional   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE "academic-schedule".aula IS
  'Aulas para el bloqueo de espacio (EFDS-1374). Datos provisionales (C-4) hasta que llegue el catálogo oficial.';

-- Semilla provisional: unas pocas aulas en la sede central.
INSERT INTO "academic-schedule".aula (codigo, nombre, sede_codigo, capacidad, provisional)
SELECT v.codigo, v.nombre, 'SC', v.capacidad, TRUE
  FROM (VALUES
    ('AULA-101', 'Aula 101 (Bloque A) — PROVISIONAL', 40),
    ('AULA-102', 'Aula 102 (Bloque A) — PROVISIONAL', 35),
    ('AULA-201', 'Aula 201 (Bloque B) — PROVISIONAL', 30),
    ('LAB-COMP-1', 'Laboratorio de Cómputo 1 — PROVISIONAL', 25),
    ('AUD-PRINCIPAL', 'Auditorio Principal — PROVISIONAL', 120)
  ) AS v(codigo, nombre, capacidad)
 WHERE NOT EXISTS (SELECT 1 FROM "academic-schedule".aula a WHERE a.codigo = v.codigo);

-- Índice para el bloqueo de aula: buscar sesiones por aula, día y hora.
CREATE INDEX IF NOT EXISTS idx_franja_aula_dia_horario
    ON "academic-schedule".franja_horaria (aula_codigo, dia_semana, hora_inicio, hora_fin)
    WHERE aula_codigo IS NOT NULL;

-- Estado de publicación del grupo/oferta. 'PROGRAMADO' es el borrador;
-- 'PUBLICADO' exige aula en todas las franjas (regla de negocio, no esquema:
-- las columnas siguen nullable desde 1371 porque el horario se arma antes de
-- asignar salón).
ALTER TABLE "academic-schedule".grupo
    ADD COLUMN IF NOT EXISTS publicado_en TIMESTAMPTZ;

COMMENT ON COLUMN "academic-schedule".grupo.publicado_en IS
  'Cuándo se publicó la oferta del grupo. Publicar exige aula en todas las franjas (EFDS-1374).';
