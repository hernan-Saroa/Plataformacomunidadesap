import { BadRequestException } from '@nestjs/common';

export function convocatoriaName(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new BadRequestException('El nombre de la convocatoria no es válido.');
  }
  const name = value.normalize('NFC').trim().replace(/\s+/g, ' ');
  if (name.length > 150) throw new BadRequestException('La convocatoria admite hasta 150 caracteres.');
  return name || null;
}

export function convocatoriaKey(value: unknown): string | null {
  return convocatoriaName(value)?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() || null;
}

export function convocatoriaPeriod(value: unknown): string {
  if (typeof value !== 'string' || !/^20\d{2}-[12]$/.test(value)) {
    throw new BadRequestException('Seleccione un período académico para asociar la convocatoria.');
  }
  return value;
}

// El recibo inmutable incluye también SIN_CAMBIOS. No inferir pertenencia a
// partir del último perfil ni de las auditorías, que solo registran cambios.
// DISTINCT evita contar dos veces al docente cuando se vuelve a cargar.
export const CONVOCATORIA_MEMBERS_SQL = `SELECT DISTINCT
  b.resumen->>'convocatoriaClave' AS clave,
  b.resumen->>'convocatoria' AS nombre,
  b.resumen->>'convocatoriaPeriodo' AS periodo,
  r->>'docenteId' AS docente_id
  FROM rund."RundCargaMasiva" b
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(b.resumen->'trazabilidad'->'registros','[]'::jsonb)) r
  WHERE b.resumen->>'convocatoriaClave' IS NOT NULL
    AND r->>'periodo'=b.resumen->>'convocatoriaPeriodo'
    AND r->>'resultado' IN ('CREADO','ACTUALIZADO','SIN_CAMBIOS')
    AND r->>'docenteId' IS NOT NULL`;
