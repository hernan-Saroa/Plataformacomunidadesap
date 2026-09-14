import { sanitizeText } from '../utils/text-sanitizer';

/** Columnas del archivo RUND. Lista cerrada para conservar también el RBAC recursivo. */
export const RUND_COLUMNAS_CARGA = [
  'DOCUMENTO_IDENTIDAD', 'TIPO_DOCUMENTO', 'NOMBRE_COMPLETO', 'GENERO', 'SEXO_BIOLOGICO',
  'FECHA_NACIMIENTO', 'EDAD', 'RANGO_EDAD', 'CORREO_INSTITUCIONAL', 'CORREO_PERSONAL', 'TELEFONO',
  'VINCULACION', 'REGIMEN_NORMATIVO', 'HORAS_PTA', 'TERRITORIAL', 'DEDICACION', 'DEDICACION_HORAS_SEMANA',
  'CATEGORIA_ESCALAFON', 'INICIO_VINCULACION', 'FIN_VINCULACION', 'ESTADO_DOCENTE', 'ACTO_ADMINISTRATIVO',
  'ORIGEN_VINCULACION', 'PUNTAJE_SALARIAL', 'SITUACION_ADMINISTRATIVA', 'SITUACION_CATEGORIA',
  'NIVEL_FORMACION', 'TITULO_PREGRADO', 'TITULO_ESPECIALIZACION', 'TITULO_MAESTRIA', 'TITULO_DOCTORADO',
  'TITULO_POSDOCTORADO', 'NUCLEO_TEMATICO', 'PERFIL_ACADEMICO', 'INVESTIGACION_ACTIVA',
  'ULTIMA_EVALUACION', 'OBSERVACIONES', 'ID_RUND',
] as const;

export function capturarDatosCarga(raw: Record<string, unknown>): Record<string, string | number | null> {
  const canonical = (key: string) => sanitizeText(key).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[_-]+/g, ' ').replace(/\b(DE|DEL|LA)\b/g, '').replace(/[^A-Z0-9]/g, '');
  const values = new Map(Object.entries(raw).map(([key, value]) => [canonical(key), value]));
  return Object.fromEntries(RUND_COLUMNAS_CARGA.map(key => {
    const value = values.get(canonical(key));
    return [key, typeof value === 'number' && Number.isFinite(value) ? value
      : typeof value === 'string' ? sanitizeText(value).trim() || null
      : value instanceof Date ? value.toISOString().slice(0, 10) : null];
  }));
}

/** Fecha civil a medianoche local, para columnas timestamp SIN zona horaria de TypeORM. */
export function fechaCivilPersistencia(value: Date | null | undefined): Date | null {
  return value ? new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()) : null;
}
