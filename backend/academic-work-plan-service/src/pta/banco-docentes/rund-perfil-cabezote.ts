/**
 * REQ-RUND-F002 — Cabezote del perfil docente.
 *
 * Contrato único de los siete campos del encabezado del perfil RUND:
 * nombre completo, tipo de vinculación, categoría/escalafón, territorial,
 * estado de vinculación, puntaje salarial y última evaluación.
 *
 * El cabezote es SIEMPRE de solo lectura: no expone acciones de edición ni
 * campos editables. La protección del puntaje salarial no se resuelve aquí:
 * este módulo entrega el valor crudo y `protectRundSensitiveData` lo anula
 * para los roles sin acceso completo (catálogo central en
 * `banco-docentes-sensitive-data.ts`). Por eso el cabezote no deriva ningún
 * texto a partir del puntaje: cualquier etiqueta se construye en la vista a
 * partir de `proteccion_datos.acceso_completo`.
 */

export const RUND_CABEZOTE_CAMPOS = [
  'NOMBRE_COMPLETO',
  'TIPO_VINCULACION',
  'CATEGORIA_ESCALAFON',
  'TERRITORIAL',
  'ESTADO_VINCULACION',
  'PUNTAJE_SALARIAL',
  'ULTIMA_EVALUACION',
] as const;

export type RundCabezoteCampo = typeof RUND_CABEZOTE_CAMPOS[number];

/**
 * Origen del dato "última evaluación" mientras no exista el módulo de
 * evaluación docente. El valor persiste en
 * `academic_work_plan."Docente"."ultimaEvaluacion"` y llega por el canal que
 * creó o actualizó el perfil RUND. Cuando exista la evaluación docente, este
 * resolutor es el único punto de integración que debe cambiar.
 */
export type RundUltimaEvaluacionOrigen =
  | 'CARGA_MASIVA_RUND'
  | 'REGISTRO_MANUAL_RUND'
  | 'INTEROPERABILIDAD'
  | 'AUTOGESTION_DOCENTE'
  | 'REGISTRO_RUND'
  | 'SIN_REGISTRO';

export interface RundPerfilCabezote {
  docente_id: string | null;
  persona_id: string | null;
  nombre_completo: string;
  tipo_vinculacion: string | null;
  categoria: string | null;
  territorial: string | null;
  territorial_pendiente_validacion: boolean;
  estado_vinculacion: 'ACTIVO' | 'INACTIVO';
  estado_vinculacion_detalle: string | null;
  puntaje_salarial: number | null;
  ultima_evaluacion: string | null;
  ultima_evaluacion_origen: RundUltimaEvaluacionOrigen;
  id_rund: string | null;
  periodo_carga: string | null;
  solo_lectura: true;
  campos: readonly RundCabezoteCampo[];
}

/** Misma clasificación que `estado_efectivo` en el SQL del listado RUND. */
const ESTADOS_INACTIVOS = new Set([
  'INACTIVO',
  'RETIRADO',
  'RETIRADO_DOCENTE',
  'TERMINADO',
  'DESVINCULADO',
]);

const VALORES_VACIOS = new Set([
  '',
  'N/A',
  'NA',
  'NULL',
  'UNDEFINED',
  '-',
  '--',
  'SIN DATO',
  'SIN INFORMACION',
]);

/** Mismo criterio de normalización que el catálogo de datos sensibles RUND. */
function sinTildes(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function texto(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const clean = String(value).replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  return VALORES_VACIOS.has(sinTildes(clean)) ? null : clean;
}

function primerTexto(source: Record<string, any>, keys: string[]): string | null {
  for (const key of keys) {
    const value = texto(source?.[key]);
    if (value !== null) return value;
  }
  return null;
}

function numero(value: unknown): number | null {
  if (texto(value) === null) return null;
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * El puntaje puede llegar anulado por RBAC. `null` significa "no disponible en
 * esta respuesta" y nunca debe interpretarse como "el docente no tiene
 * puntaje": esa distinción se resuelve con `proteccion_datos`.
 */
function primerNumero(source: Record<string, any>, keys: string[]): number | null {
  for (const key of keys) {
    if (source?.[key] === null || source?.[key] === undefined) continue;
    const value = numero(source[key]);
    if (value !== null) return value;
  }
  return null;
}

export function normalizarEstadoVinculacion(source: Record<string, any> = {}): {
  codigo: 'ACTIVO' | 'INACTIVO';
  detalle: string | null;
} {
  const detalle = primerTexto(source, [
    'estado',
    'estado_docente',
    'estadoDocente',
    'estado_vinculacion',
    'estadoVinculacion',
  ]);
  if (detalle) {
    const upper = sinTildes(detalle).replace(/\s+/g, '_');
    return { codigo: ESTADOS_INACTIVOS.has(upper) ? 'INACTIVO' : 'ACTIVO', detalle };
  }
  const activo = source?.activo_efectivo ?? source?.activo;
  if (activo === false) return { codigo: 'INACTIVO', detalle: null };
  return { codigo: 'ACTIVO', detalle: null };
}

const CANAL_A_ORIGEN: Record<string, RundUltimaEvaluacionOrigen> = {
  MASIVO: 'CARGA_MASIVA_RUND',
  MODAL: 'REGISTRO_MANUAL_RUND',
  API: 'INTEROPERABILIDAD',
  AUTOGESTION: 'AUTOGESTION_DOCENTE',
};

/**
 * EFDS-1898 — Origen e integración de "última evaluación".
 * Devuelve el valor persistido y el canal que lo registró. Sin valor el origen
 * es `SIN_REGISTRO`, nunca un canal: no se afirma la procedencia de un dato
 * que no existe.
 */
export function resolverUltimaEvaluacion(source: Record<string, any> = {}): {
  valor: string | null;
  origen: RundUltimaEvaluacionOrigen;
} {
  const valor = primerTexto(source, ['ultima_evaluacion', 'ultimaEvaluacion', 'ULTIMA_EVALUACION']);
  if (!valor) return { valor: null, origen: 'SIN_REGISTRO' };
  const canal = primerTexto(source, ['canal_origen', 'canalOrigen']);
  const clave = canal ? canal.toUpperCase() : '';
  return { valor, origen: CANAL_A_ORIGEN[clave] || 'REGISTRO_RUND' };
}

function resolverNombreCompleto(source: Record<string, any>): string {
  const directo = primerTexto(source, ['nombre_completo', 'nombreCompleto', 'nom_largo', 'NOMBRE_COMPLETO']);
  if (directo) return directo;
  const partes = ['primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido']
    .map((key) => texto(source?.[key]))
    .filter(Boolean) as string[];
  return partes.length ? partes.join(' ') : 'Docente sin nombre registrado';
}

/**
 * Construye el cabezote a partir de cualquier proyección del perfil RUND
 * (fila del listado, perfil por cédula o respuesta de autogestión). Tolera
 * `snake_case` y `camelCase` porque las tres fuentes difieren.
 */
export function buildRundPerfilCabezote(source: Record<string, any> | null | undefined): RundPerfilCabezote {
  const perfil = source && typeof source === 'object' ? source : {};
  const estado = normalizarEstadoVinculacion(perfil);
  const evaluacion = resolverUltimaEvaluacion(perfil);
  const territorial = primerTexto(perfil, ['territorial', 'territorial_nombre', 'territorialNombre']);

  return {
    docente_id: primerTexto(perfil, ['docente_id', 'docenteId', 'id']),
    persona_id: primerTexto(perfil, ['persona_id', 'personaId']),
    nombre_completo: resolverNombreCompleto(perfil),
    tipo_vinculacion: primerTexto(perfil, [
      'vinculacion',
      'tipo_vinculacion',
      'tipoVinculacion',
      'vinculacionDisplay',
      'vinculacion_codigo',
    ]),
    categoria: primerTexto(perfil, ['categoria', 'escalafon', 'categoria_escalafon', 'categoriaEscalafon']),
    territorial,
    territorial_pendiente_validacion: !territorial && Boolean(primerTexto(perfil, ['territorial_id', 'territorialId'])),
    estado_vinculacion: estado.codigo,
    estado_vinculacion_detalle: estado.detalle,
    puntaje_salarial: primerNumero(perfil, ['puntaje_salarial', 'puntajeSalarial']),
    ultima_evaluacion: evaluacion.valor,
    ultima_evaluacion_origen: evaluacion.origen,
    id_rund: primerTexto(perfil, ['id_rund', 'idRund']),
    periodo_carga: primerTexto(perfil, ['periodo_carga', 'periodoCarga']),
    solo_lectura: true,
    campos: RUND_CABEZOTE_CAMPOS,
  };
}
