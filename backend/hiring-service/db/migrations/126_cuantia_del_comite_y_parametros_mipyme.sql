-- ============================================================================
-- 126 · Cuantía general del Comité de Contratación y parámetros MiPyme 2026
--
-- Revisión de QA (2026-10-15):
--
-- EFDS-1147 · El comité solo conoce los procesos que superan 1.000 SMMLV, sin
-- importar la modalidad. Hasta aquí solo la directa tenía umbral (071); las
-- demás modalidades con 3.7 iban siempre. Se agrega el parámetro general
-- `cuantia_minima_comite` en `parametros_alerta`, que se edita desde la misma
-- pantalla de parámetros. Una fila propia en `umbrales_comite_contratacion`
-- sigue mandando sobre él para su modalidad. Lo que la matriz excluye (menor y
-- mínima cuantía, enajenación) sigue en NO_APLICA.
--
-- EFDS-1151 · Parámetros MiPyme vigentes en 2026 según Colombia Compra
-- Eficiente: 2 manifestaciones (antes 3) y tope de $511.708.497 en pesos
-- (antes 300 SMMLV, una derivación del equipo). La 5.5 ya estaba excluida en
-- licitación pública (112).
--
-- Idempotente.
-- ============================================================================

BEGIN;

INSERT INTO hiring.parametros_alerta (clave, valor, minimo, maximo, descripcion)
VALUES ('cuantia_minima_comite', 1000, 1, 100000,
        'SMMLV que debe superar el valor del proceso para pasar por el Comité de Contratación, en las modalidades sin umbral propio')
ON CONFLICT (clave) DO NOTHING;

UPDATE hiring.parametros_mipyme
   SET valor = 2,
       fundamento = 'Revisión de QA de EFDS-1151 (2026-10-15): dos manifestaciones de interés de MiPyme, según Colombia Compra Eficiente para 2026.',
       updated_at = now()
 WHERE clave = 'MINIMO_MANIFESTACIONES';

UPDATE hiring.parametros_mipyme
   SET valor = 511708497,
       unidad = 'PESOS',
       fundamento = 'Revisión de QA de EFDS-1151 (2026-10-15): umbral vigente 2026 de $511.708.497 publicado por Colombia Compra Eficiente.',
       updated_at = now()
 WHERE clave = 'TOPE_VALOR';

COMMIT;
