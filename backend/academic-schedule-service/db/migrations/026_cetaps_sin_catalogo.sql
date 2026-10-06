-- ============================================================================
-- Hallazgo documentado · CETAPs declarados sin contraparte en el catálogo
--
-- El detalle territorial declara 307 CETAPs; el catálogo autoritativo con
-- códigos reales tiene 290. Tras reconciliar por nombre (253 exactos, 5 por
-- artículo, 3 evidentes tipo Mompox/Mompós), quedan 46 declarados que NO
-- existen en el catálogo: Amalfi, Segovia, Guapi, Tumaco, Buga, Zapatoca,
-- Ambalema, los Resguardos del Huila...
--
-- NO se les inventa código. Se registran con su nombre EN TEXTO para que quien
-- tenga el catálogo oficial los resuelva. El histórico entra sin FK, así que
-- este hueco no bloquea nada; es una solicitud a Gestión Profesoral.
--
-- ⚠️ No se aplicó emparejamiento difuso: el pase con distancia <=3 producía
-- falsos positivos demostrables (Pácora->Patía, Samaná->Istmina, Cajicá->Patía).
-- Un hueco visible se arregla; un dato corrupto se propaga.
--
-- ⚠️ Aprovisionamiento de datos de DESARROLLO, no el mecanismo de producción.
-- RN-09 sigue vigente: el RUND es de solo lectura para las decanaturas.
--
-- Forward-only e idempotente. SQL puro.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "academic-schedule".cetap_sin_catalogo (
    id                 SMALLSERIAL PRIMARY KEY,
    territorial        VARCHAR(60) NOT NULL,
    nombre_declarado   VARCHAR(120) NOT NULL,
    registrado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (territorial, nombre_declarado)
);

COMMENT ON TABLE "academic-schedule".cetap_sin_catalogo IS
  'CETAPs declarados en el detalle territorial que no tienen contraparte en el catálogo oficial. Pendientes de código. No inventar: resolver con Gestión Profesoral.';

INSERT INTO "academic-schedule".cetap_sin_catalogo (territorial, nombre_declarado)
SELECT v.territorial, v.nombre
  FROM (VALUES
    ('SEDE CENTRAL', 'Sede Principal'),
    ('ANTIOQUIA', 'CETAP Amalfi'),
    ('ANTIOQUIA', 'CETAP Segovia'),
    ('ANTIOQUIA', 'CETAP Vigía del fuerte'),
    ('BOLÍVAR', 'CETAP Cerete'),
    ('BOLÍVAR', 'CETAP El Carmen de Bolivar'),
    ('BOLÍVAR', 'CETAP Isla de Providencia'),
    ('BOLÍVAR', 'CETAP San Basilio del Palenque'),
    ('BOLÍVAR', 'CETAP Since'),
    ('CALDAS', 'CETAP Pacora'),
    ('CALDAS', 'CETAP Samana'),
    ('CAUCA', 'CETAP Bordo'),
    ('CAUCA', 'CETAP Guapi'),
    ('CAUCA', 'CETAP Inza'),
    ('CAUCA', 'CETAP Morales'),
    ('CHOCÓ', 'CETAP Bahía Solano'),
    ('CHOCÓ', 'CETAP Tadó'),
    ('CUNDINAMARCA', 'CETAP Cajica'),
    ('CUNDINAMARCA', 'CETAP Gama'),
    ('CUNDINAMARCA', 'CETAP San Francisco'),
    ('CUNDINAMARCA', 'CETAP Sopó'),
    ('HUILA', 'CETAP Colombia'),
    ('HUILA', 'CETAP Iquira'),
    ('HUILA', 'CETAP Resguardo Indígena Nasa Paez'),
    ('HUILA', 'CETAP Resguardo Indígena Rumiyako'),
    ('HUILA', 'CETAP Resguardo la Gaitana'),
    ('HUILA', 'CETAP Resguardo Nasa Juan Tama'),
    ('HUILA', 'CETAP Santiago de Putumayo'),
    ('HUILA', 'CETAP Solita'),
    ('HUILA', 'CETAP Valle del Guamuez'),
    ('META', 'CETAP Cubarral'),
    ('NARIÑO', 'CETAP Cordoba - Nariño'),
    ('NARIÑO', 'CETAP El Charco'),
    ('NARIÑO', 'CETAP San Jose De Alban'),
    ('NARIÑO', 'CETAP Taminango'),
    ('NARIÑO', 'CETAP Tumaco'),
    ('NORTE DE SANTANDER', 'CETAP Cáchira'),
    ('NORTE DE SANTANDER', 'CETAP Pamplonita'),
    ('RISARALDA', 'CETAP Cordoba -Quindío'),
    ('SANTANDER', 'CETAP Charala'),
    ('SANTANDER', 'CETAP Matanza'),
    ('SANTANDER', 'CETAP Zapatoca'),
    ('TOLIMA', 'CETAP Ambalema'),
    ('VALLE', 'CETAP Buga'),
    ('VALLE', 'CETAP Caicedonia'),
    ('VALLE', 'CETAP La union')
  ) AS v(territorial, nombre)
 WHERE NOT EXISTS (
   SELECT 1 FROM "academic-schedule".cetap_sin_catalogo x
    WHERE x.territorial = v.territorial AND x.nombre_declarado = v.nombre);

DO $$
DECLARE v_n INT; v_cat INT;
BEGIN
  SELECT COUNT(*) INTO v_n   FROM "academic-schedule".cetap_sin_catalogo;
  SELECT COUNT(*) INTO v_cat FROM academic_work_plan.cetap;
  RAISE NOTICE '026: pendientes=% catalogo=% suma=%', v_n, v_cat, v_n + v_cat;
  IF v_n <> 46 THEN
    RAISE EXCEPTION '026: se esperaban 46 pendientes y hay %', v_n;
  END IF;
END $$;
