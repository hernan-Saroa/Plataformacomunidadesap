/**
 * REQ-RUND-F002 — Modelo de vista del cabezote del perfil docente.
 *
 * Espeja el contrato del backend
 * (`backend/academic-work-plan-service/src/pta/banco-docentes/rund-perfil-cabezote.ts`)
 * y resuelve los textos que se pintan en pantalla. Es una función pura: no
 * consulta el API y no depende de React, para poder probarla aparte de la vista.
 *
 * Regla de seguridad: el puntaje salarial NUNCA se deduce del valor recibido.
 * Solo se muestra cuando `proteccion_datos.acceso_completo` es exactamente
 * `true`. El backend ya lo anula para los roles sin acceso; aquí se evita
 * además que un `null` de RBAC se lea como "el docente no tiene puntaje".
 */

export type CabezoteOrigenEvaluacion =
  | 'CARGA_MASIVA_RUND'
  | 'REGISTRO_MANUAL_RUND'
  | 'INTEROPERABILIDAD'
  | 'AUTOGESTION_DOCENTE'
  | 'REGISTRO_RUND'
  | 'SIN_REGISTRO';

export type CabezoteCampoClave =
  | 'TIPO_VINCULACION'
  | 'CATEGORIA_ESCALAFON'
  | 'TERRITORIAL'
  | 'ESTADO_VINCULACION'
  | 'PUNTAJE_SALARIAL'
  | 'ULTIMA_EVALUACION';

export interface CabezoteCampoVista {
  clave: CabezoteCampoClave;
  etiqueta: string;
  valor: string;
  /** No hay dato registrado: la vista lo atenúa en lugar de dejar el hueco vacío. */
  ausente: boolean;
  /** El rol de la sesión no puede ver el dato. */
  restringido: boolean;
  /** Pie de apoyo, hoy solo el origen de la última evaluación. */
  nota: string | null;
}

export interface CabezotePerfilDocenteVista {
  nombreCompleto: string;
  iniciales: string;
  idRund: string | null;
  periodoCarga: string | null;
  estado: { codigo: 'ACTIVO' | 'INACTIVO'; etiqueta: string; activo: boolean };
  accesoCompleto: boolean;
  puntajeRestringido: boolean;
  campos: CabezoteCampoVista[];
  soloLectura: true;
}

export const CABEZOTE_ETIQUETAS: Record<CabezoteCampoClave, string> = {
  TIPO_VINCULACION: 'Tipo de vinculación',
  CATEGORIA_ESCALAFON: 'Categoría',
  TERRITORIAL: 'Territorial',
  ESTADO_VINCULACION: 'Estado de vinculación',
  PUNTAJE_SALARIAL: 'Puntaje salarial',
  ULTIMA_EVALUACION: 'Última evaluación',
};

export const CABEZOTE_ORIGEN_EVALUACION: Record<CabezoteOrigenEvaluacion, string> = {
  CARGA_MASIVA_RUND: 'Origen: carga masiva RUND',
  REGISTRO_MANUAL_RUND: 'Origen: registro manual RUND',
  INTEROPERABILIDAD: 'Origen: interoperabilidad',
  AUTOGESTION_DOCENTE: 'Origen: autogestión del docente',
  REGISTRO_RUND: 'Origen: registro RUND',
  SIN_REGISTRO: 'Pendiente del módulo de evaluación docente',
};

export const CABEZOTE_SIN_DATO = 'No registrado';
export const CABEZOTE_RESTRINGIDO = 'Información restringida';

const ESTADOS_INACTIVOS = new Set(['INACTIVO', 'RETIRADO', 'RETIRADO_DOCENTE', 'TERMINADO', 'DESVINCULADO']);
const VALORES_VACIOS = new Set(['', 'N/A', 'NA', 'NULL', 'UNDEFINED', '-', '--', 'SIN DATO', 'SIN INFORMACION']);

const CANAL_A_ORIGEN: Record<string, CabezoteOrigenEvaluacion> = {
  MASIVO: 'CARGA_MASIVA_RUND',
  MODAL: 'REGISTRO_MANUAL_RUND',
  API: 'INTEROPERABILIDAD',
  AUTOGESTION: 'AUTOGESTION_DOCENTE',
};

function sinTildes(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function texto(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') {
    const nested = (value as any).nombre ?? (value as any).codigo ?? null;
    return nested === null ? null : texto(nested);
  }
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

function formatearPuntaje(value: unknown): string | null {
  if (texto(value) === null) return null;
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  if (!Number.isFinite(parsed)) return texto(value);
  try {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(parsed);
  } catch {
    return String(parsed);
  }
}

function calcularIniciales(nombre: string): string {
  const partes = nombre.split(' ').filter(Boolean);
  if (!partes.length) return 'D';
  const iniciales = partes.slice(0, 2).map((parte) => parte.charAt(0)).join('');
  return iniciales.toUpperCase() || 'D';
}

/** Devuelve `null` cuando el perfil no trae nombre, para no derivar iniciales de un texto de relleno. */
function resolverNombreCompleto(source: Record<string, any>): string | null {
  const directo = primerTexto(source, ['nombre_completo', 'nombreCompleto', 'nom_largo']);
  if (directo) return directo;
  const partes = ['primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido']
    .map((key) => texto(source?.[key]))
    .filter(Boolean) as string[];
  return partes.length ? partes.join(' ') : null;
}

function resolverEstado(source: Record<string, any>): { codigo: 'ACTIVO' | 'INACTIVO'; activo: boolean; etiqueta: string } {
  const detalle = primerTexto(source, ['estado', 'estado_vinculacion', 'estadoVinculacion', 'estado_docente']);
  if (detalle) {
    const codigo = ESTADOS_INACTIVOS.has(sinTildes(detalle).replace(/\s+/g, '_')) ? 'INACTIVO' : 'ACTIVO';
    return { codigo, activo: codigo === 'ACTIVO', etiqueta: codigo === 'ACTIVO' ? 'Activo' : 'Inactivo' };
  }
  const activo = source?.activo_efectivo ?? source?.activo;
  if (activo === false) return { codigo: 'INACTIVO', activo: false, etiqueta: 'Inactivo' };
  return { codigo: 'ACTIVO', activo: true, etiqueta: 'Activo' };
}

function resolverOrigenEvaluacion(source: Record<string, any>, tieneValor: boolean): CabezoteOrigenEvaluacion {
  if (!tieneValor) return 'SIN_REGISTRO';
  const declarado = primerTexto(source, ['ultima_evaluacion_origen', 'ultimaEvaluacionOrigen']);
  if (declarado && declarado.toUpperCase() in CABEZOTE_ORIGEN_EVALUACION) {
    return declarado.toUpperCase() as CabezoteOrigenEvaluacion;
  }
  const canal = primerTexto(source, ['canal_origen', 'canalOrigen']);
  return (canal && CANAL_A_ORIGEN[canal.toUpperCase()]) || 'REGISTRO_RUND';
}

function campo(
  clave: CabezoteCampoClave,
  valor: string | null,
  extra?: { restringido?: boolean; nota?: string | null; textoAusente?: string },
): CabezoteCampoVista {
  const restringido = Boolean(extra?.restringido);
  const ausente = !restringido && !valor;
  return {
    clave,
    etiqueta: CABEZOTE_ETIQUETAS[clave],
    valor: restringido ? CABEZOTE_RESTRINGIDO : (valor || extra?.textoAusente || CABEZOTE_SIN_DATO),
    ausente,
    restringido,
    nota: extra?.nota ?? null,
  };
}

/**
 * Construye el cabezote desde cualquier proyección del perfil RUND: la fila
 * del listado, la respuesta de `GET /banco-docentes/:id/cabezote` o el perfil
 * de autogestión. Todas llegan ya protegidas por RBAC desde el servidor.
 */
export function buildCabezotePerfilDocente(
  source: Record<string, any> | null | undefined,
): CabezotePerfilDocenteVista {
  const perfil = source && typeof source === 'object' ? source : {};
  const nombre = resolverNombreCompleto(perfil);
  const nombreCompleto = nombre || 'Docente sin nombre registrado';
  const estado = resolverEstado(perfil);

  // Solo la autorización explícita del servidor permite mostrar el puntaje.
  const puntajeRestringido = perfil?.proteccion_datos?.acceso_completo !== true;
  const accesoCompleto = !puntajeRestringido;
  const puntajeFormateado = puntajeRestringido
    ? null
    : formatearPuntaje(perfil.puntaje_salarial ?? perfil.puntajeSalarial);

  const ultimaEvaluacion = primerTexto(perfil, ['ultima_evaluacion', 'ultimaEvaluacion']);
  const origenEvaluacion = resolverOrigenEvaluacion(perfil, Boolean(ultimaEvaluacion));

  return {
    nombreCompleto,
    iniciales: nombre ? calcularIniciales(nombre) : 'D',
    idRund: primerTexto(perfil, ['id_rund', 'idRund']),
    periodoCarga: primerTexto(perfil, ['periodo_carga', 'periodoCarga']),
    estado,
    accesoCompleto,
    puntajeRestringido,
    soloLectura: true,
    campos: [
      campo('TIPO_VINCULACION', primerTexto(perfil, [
        'tipo_vinculacion',
        'vinculacion',
        'tipoVinculacion',
        'vinculacionDisplay',
        'vinculacion_codigo',
      ])),
      campo('CATEGORIA_ESCALAFON', primerTexto(perfil, ['categoria', 'escalafon', 'categoria_escalafon', 'categoriaEscalafon'])),
      campo('TERRITORIAL', primerTexto(perfil, ['territorial', 'territorial_nombre', 'territorialNombre']), {
        textoAusente: perfil.territorial_pendiente_validacion ? 'Pendiente de validar' : CABEZOTE_SIN_DATO,
        nota: perfil.territorial_pendiente_validacion ? 'La territorial registrada no coincide con el catálogo vigente.' : null,
      }),
      campo('ESTADO_VINCULACION', estado.etiqueta),
      campo('PUNTAJE_SALARIAL', puntajeFormateado, { restringido: puntajeRestringido }),
      campo('ULTIMA_EVALUACION', ultimaEvaluacion, {
        nota: CABEZOTE_ORIGEN_EVALUACION[origenEvaluacion],
        textoAusente: 'Sin evaluación registrada',
      }),
    ],
  };
}
