-- ============================================================================
-- 091 · El soporte de una devolución
--
-- Devolver una actividad solo admitía texto. Quien revisa un estudio previo de
-- veinte páginas suele tener las correcciones marcadas sobre el propio
-- documento, y resumirlas en un párrafo pierde justo lo que el área necesita
-- para corregir. El módulo disciplinario ya lo resuelve así: devolver lleva
-- motivo, observaciones y, si hace falta, un archivo.
--
-- El archivo se guarda como cualquier documento del expediente —con su hash y
-- su traza— y la decisión lo señala. Va en la revisión y no en la actividad
-- porque es de esa vuelta: si la vuelven a devolver, la nueva decisión trae su
-- propio soporte y el anterior queda con la suya.
--
-- Opcional y aditiva: las revisiones que ya existen se quedan sin soporte.
-- ============================================================================

BEGIN;

ALTER TABLE hiring.revisiones
  ADD COLUMN IF NOT EXISTS soporte_documento_id uuid NULL
    REFERENCES hiring.documentos (id);

COMMENT ON COLUMN hiring.revisiones.soporte_documento_id IS
  'Archivo que acompaña una devolución: las correcciones marcadas sobre el documento. Solo lo adjunta quien devolvió.';

COMMIT;
