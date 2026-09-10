import { getApiGatewayBaseUrl } from '../../../config/environment';

/**
 * Cliente del catálogo académico (EFDS-1368).
 *
 * El backend decide qué niveles puede ver el usuario a partir de sus permisos
 * reales (RN-08). Aquí NO se filtra por nivel ni se envía ninguna bandera de
 * permiso: el `nivel` solo expresa qué está mirando el usuario, y si pide uno
 * que no le corresponde el servicio responde 403.
 */
export type NivelAcademico = 'pregrado' | 'posgrado';

export interface ProgramaCatalogo {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  nivel: NivelAcademico;
  modalidad: string;
  horasBasePorCredito: number;
}

export interface AsignaturaCatalogo {
  id: string;
  codigo: string | null;
  nombre: string;
  creditos: number;
  pensum: string | null;
  modalidad: string;
  horasClase: number | null;
}

export interface SemestreCatalogo {
  semestreId: number;
  codigo: string;
  etiqueta: string;
  orden: number;
  asignaturas: AsignaturaCatalogo[];
}

const BASE = '/programacion-academica/api/v1/catalogo';

async function pedir<T>(ruta: string): Promise<T> {
  const res = await fetch(`${getApiGatewayBaseUrl()}${ruta}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) {
    // El backend explica el motivo: qué código no existe, o de qué nivel es la
    // asignatura que no puede ver. Se propaga tal cual porque es lo que le dice
    // al programador qué corregir; el genérico solo queda de respaldo.
    let detalle = "";
    try {
      const cuerpo = await res.json();
      detalle = cuerpo?.message || cuerpo?.error || "";
    } catch { /* respuesta sin cuerpo util */ }
    if (res.status === 403) {
      throw new Error(detalle || "No tiene permisos de programación sobre este nivel académico.");
    }
    throw new Error(detalle || `No se pudo consultar el catálogo (error ${res.status}).`);
  }
  const cuerpo = await res.json();
  return (cuerpo?.data ?? cuerpo) as T;
}

/** Programas visibles para el usuario; sin `nivel` devuelve los de todos sus niveles. */
export function getProgramas(nivel?: NivelAcademico): Promise<ProgramaCatalogo[]> {
  const query = nivel ? `?nivel=${encodeURIComponent(nivel)}` : '';
  return pedir<ProgramaCatalogo[]>(`${BASE}/programas${query}`);
}

/** Catálogo del programa agrupado por semestre del plan de estudios (AC-01). */
export function getCatalogoPorSemestre(
  idPrograma: string,
): Promise<{ programa: any; semestres: SemestreCatalogo[] }> {
  return pedir(`${BASE}/programas/${encodeURIComponent(idPrograma)}/asignaturas`);
}

// ─── Grupos (EFDS-1370) ─────────────────────────────────────────────────────

export interface Grupo {
  idGrupo: string;
  idAsignatura: string;
  idPeriodo: string | null;
  numeroGrupo: number;
  idDocente: string | null;
  cupoMaximo: number;
  estado: string;
  observaciones: string | null;
  /** Ciclo de clases del grupo. El backend ya los devolvía; faltaba declararlos. */
  fechaInicio: string | null;
  fechaFin: string | null;
}

const BASE_GRUPOS = '/programacion-academica/api/v1/grupos';

async function pedirJson<T>(ruta: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${getApiGatewayBaseUrl()}${ruta}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...init,
  });
  if (!res.ok) {
    // El backend explica el motivo (contra qué sesión cruza la franja, o qué
    // permiso falta —crear un periodo exige el de administración—): se propaga
    // TAL CUAL, porque es lo que le dice al usuario qué corregir. Este helper lo
    // comparten grupos, horarios, asignaciones, aulas y ofertas; un 403 fijo de
    // "grupos" mentía sobre las otras operaciones. El genérico queda de respaldo.
    let detalle = "";
    try { const cuerpo = await res.json(); detalle = cuerpo?.message || cuerpo?.error || ""; } catch { /* sin cuerpo util */ }
    if (res.status === 403) {
      throw new Error(detalle || 'No tiene permisos para completar esta operación.');
    }
    throw new Error(detalle || `No se pudo completar la operación (error ${res.status}).`);
  }
  const cuerpo = await res.json();
  return (cuerpo?.data ?? cuerpo) as T;
}

export function getGrupos(idAsignatura: string): Promise<Grupo[]> {
  return pedirJson<Grupo[]>(`${BASE_GRUPOS}?asignatura=${encodeURIComponent(idAsignatura)}`, { method: 'GET' });
}

/** Crea 1..N grupos. La numeración la asigna el backend (estrategia reemplazable). */
export function crearGrupos(idAsignatura: string, cantidad: number): Promise<Grupo[]> {
  return pedirJson<Grupo[]>(BASE_GRUPOS, {
    method: 'POST',
    body: JSON.stringify({ idAsignatura, cantidad }),
  });
}

export function eliminarGrupo(idGrupo: string): Promise<{ eliminado: true }> {
  return pedirJson(`${BASE_GRUPOS}/${encodeURIComponent(idGrupo)}`, { method: 'DELETE' });
}

// ─── Horario / sesiones (EFDS-1371) ─────────────────────────────────────────

/**
 * Tipo de SESIÓN. No confundir con `modalidad` de la asignatura, que es dato
 * maestro del SNIES y viene del catálogo: son campos distintos y de fuentes
 * distintas. Una asignatura virtual puede tener sesiones presenciales.
 */
export type TipoSesion = 'presencial' | 'mediada_tecnologia';

export interface Sesion {
  idFranja: string;
  idGrupo: string | null;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  tipoSesion: TipoSesion;
  jornada: string | null;
  aulaCodigo: string | null;
  estado: string;
}

/**
 * Franja con su contexto ya resuelto por el servidor: programa, asignatura y
 * docente vienen del JOIN, no de consultas por fila desde aquí.
 */
export interface FranjaConContexto extends Sesion {
  numeroGrupo: number | null;
  fechaInicioGrupo: string | null;
  fechaFinGrupo: string | null;
  asignatura: string | null;
  programa: string | null;
  docente: string | null;
}

const BASE_HORARIOS = '/programacion-academica/api/v1/horarios';

/**
 * TODAS las sesiones programadas, sin filtrar por grupo. Es lo que alimenta los
 * contadores del panel: antes salían de una constante en el front y mostraban
 * "4 franjas activas" con la base vacía.
 */
export function getTodasLasSesiones(): Promise<FranjaConContexto[]> {
  return pedirJson<FranjaConContexto[]>(BASE_HORARIOS, { method: 'GET' });
}

export function getSesiones(idGrupo: string): Promise<Sesion[]> {
  return pedirJson<Sesion[]>(`${BASE_HORARIOS}?grupo=${encodeURIComponent(idGrupo)}`, { method: 'GET' });
}

export function crearSesion(datos: {
  idGrupo: string; diaSemana: string; horaInicio: string; horaFin: string;
  tipoSesion: TipoSesion; aulaCodigo?: string | null;
}): Promise<Sesion> {
  return pedirJson<Sesion>(BASE_HORARIOS, { method: 'POST', body: JSON.stringify(datos) });
}

// ─── Asignación de docente (EFDS-1372) ──────────────────────────────────────

export interface MotivoRechazo {
  regla: string;
  mensaje: string;
}

/**
 * Ficha de SOLO LECTURA del docente para el panel de asignación (RN-09).
 * El RUND no se escribe desde la interfaz: esto es lo que la decanatura ve.
 */
export interface DocenteConsulta {
  documento: string;
  nombre: string;
  escalafon: string | null;
  vinculacionDesde: string | null;
  /** Nulo = vinculación indefinida, no dato faltante. La UI no lo pinta como error. */
  vinculacionHasta: string | null;
  horasPta: number;
  situacion: {
    descripcion: string | null;
    categoria: string | null;
    asignable: boolean;
    /** Por qué no es asignable, con la vigencia dentro del texto. */
    motivo: string | null;
    vigenteHasta: string | null;
  };
  /** Presente si se consultó con grupo: TODOS los motivos, no el primero. */
  motivos?: MotivoRechazo[];
  asignableAlGrupo?: boolean;
  /** Impacto en horas que tendría esta asignación (factor RN-03). */
  horasImpacto?: number;
}

export interface ResultadoAsignacion {
  asignado: boolean;
  idAsignacion?: string;
  motivos?: MotivoRechazo[];
}

const BASE_ASIGN = '/programacion-academica/api/v1/asignaciones';

/** Consulta la ficha del docente. Con `idGrupo`, trae la evaluación en seco del bloqueo. */
export function consultarDocente(documento: string, idGrupo?: string): Promise<DocenteConsulta> {
  const q = idGrupo ? `?grupo=${encodeURIComponent(idGrupo)}` : '';
  return pedirJson<DocenteConsulta>(`${BASE_ASIGN}/docente/${encodeURIComponent(documento)}${q}`, { method: 'GET' });
}

/** Asigna con bloqueo duro. Devuelve `{ asignado:false, motivos }` si alguna regla falla. */
export function asignarDocente(datos: {
  idGrupo: string; documento: string; horasRequeridas?: number; observaciones?: string | null;
  /** Quién confirma la disponibilidad del docente en el periodo (AC-03, EFDS-1376). */
  disponibilidadConfirmadaPor?: string | null;
}): Promise<ResultadoAsignacion> {
  return pedirJson<ResultadoAsignacion>(BASE_ASIGN, { method: 'POST', body: JSON.stringify(datos) });
}

export function retirarAsignacion(idGrupo: string): Promise<{ retirado: boolean }> {
  return pedirJson(`${BASE_ASIGN}/grupo/${encodeURIComponent(idGrupo)}`, { method: 'DELETE' });
}

// ─── Acumulado de horas vs tope (EFDS-1373) ─────────────────────────────────

export interface ConsumoPorOferta {
  idPeriodo: string | null;
  periodo: string | null;
  horas: number;
}

export interface AcumuladoDocente {
  documento: string;
  nombre: string;
  categoriaVinculacion: string;
  /** Tope de docencia: 304 para cátedra (RN-04), horas del plan en otro caso. */
  tope: number;
  /** Horas de investigación/extensión ya comprometidas (RN-06), inalterables. */
  horasInvestigacion: number;
  totalAsignado: number;
  /** Cuánto queda antes del tope. Negativo = excedido. */
  disponible: number;
  /** Desglose por oferta académica (periodo) — la dimensión de EFDS-1375. */
  porOferta: ConsumoPorOferta[];
}

export function getAcumulado(documento: string): Promise<AcumuladoDocente> {
  return pedirJson<AcumuladoDocente>(`${BASE_ASIGN}/acumulado/${encodeURIComponent(documento)}`, { method: 'GET' });
}

export function eliminarSesion(idFranja: string): Promise<{ eliminado: true }> {
  return pedirJson(`${BASE_HORARIOS}/${encodeURIComponent(idFranja)}`, { method: 'DELETE' });
}

/** Ventana del ciclo de clases, propia de cada grupo. */
export function definirPeriodoGrupo(
  idGrupo: string,
  periodo: { fechaInicio: string | null; fechaFin: string | null },
): Promise<any> {
  return pedirJson(`${BASE_HORARIOS}/grupo/${encodeURIComponent(idGrupo)}/periodo`, {
    method: 'PUT',
    body: JSON.stringify(periodo),
  });
}

// ─── Búsqueda por código SNIES (EFDS-1369) ──────────────────────────────────

/**
 * Los siete campos maestros del SNIES, más contexto útil.
 * TODOS son de solo lectura (RN-02): el backend rechaza cualquier escritura.
 */
export interface AsignaturaSnies {
  codigo: string;
  nombre: string;
  creditos: number;
  horasClase: number | null;
  horasPta: number | null;
  programa: { id: string; codigo: string; nombre: string };
  pensum: string | null;
  modalidad: string;
  metodologia: string;
  nivel: NivelAcademico;
  semestre: { etiqueta: string; orden: number } | null;
  tipoExcepcion: string | null;
  soloLectura: boolean;
}

/** Autocompletado por llave maestra. El código no existente devuelve error controlado. */
export function getAsignaturaPorCodigo(codigo: string): Promise<AsignaturaSnies> {
  return pedir<AsignaturaSnies>(`${BASE}/asignaturas/${encodeURIComponent(codigo.trim())}`);
}

// ─── Aulas y disponibilidad (EFDS-1374) ─────────────────────────────────────

export interface Aula {
  codigo: string;
  nombre: string;
  sedeCodigo: string | null;
  capacidad: number | null;
  provisional: boolean;
}

/** Franja ocupada de un aula: SOLO día y hora (RN-07, no revela qué la ocupa). */
export interface FranjaOcupadaAula {
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
}

const BASE_AULAS = '/programacion-academica/api/v1/aulas';

export function getAulas(): Promise<Aula[]> {
  return pedirJson<Aula[]>(BASE_AULAS, { method: 'GET' });
}

/** Ocupación de un aula. El backend solo devuelve día y hora, nunca el grupo. */
export function getDisponibilidadAula(codigo: string): Promise<{ aula: string; ocupada: FranjaOcupadaAula[] }> {
  return pedirJson(`${BASE_AULAS}/${encodeURIComponent(codigo)}/disponibilidad`, { method: 'GET' });
}

/** Publica la oferta del grupo. Exige aula en todas las franjas (cierra deuda de 1371). */
export function publicarGrupo(idGrupo: string): Promise<{ publicado: boolean }> {
  return pedirJson(`${BASE_AULAS}/publicar/${encodeURIComponent(idGrupo)}`, { method: 'POST' });
}

/** Tipos de espacio válidos: el mismo conjunto cerrado del CHECK de la tabla. */
export const TIPOS_AULA = ['aula', 'auditorio'] as const;
export type TipoAula = (typeof TIPOS_AULA)[number];

export interface CrearAulaDto {
  codigo: string;
  nombre: string;
  capacidad: number | null;
  sedeCodigo: string | null;
  tipo: TipoAula | null;
  piso: number | null;
}

/**
 * El código es la PK y no se renombra; por eso no viaja en la actualización.
 * Parcial: solo los campos presentes se envían y el backend solo toca esos.
 */
export type ActualizarAulaDto = Partial<Omit<CrearAulaDto, 'codigo'>>;

/**
 * CRUD de aulas y capacidad (EFDS-1942). Administración del dato maestro: exige
 * el permiso de administración; si falta, el backend responde 403 y el mensaje
 * se muestra tal cual (pedirJson lo propaga verbatim).
 */
export function crearAula(dto: CrearAulaDto): Promise<Aula> {
  return pedirJson<Aula>(BASE_AULAS, { method: 'POST', body: JSON.stringify(dto) });
}

export function actualizarAula(codigo: string, dto: ActualizarAulaDto): Promise<Aula> {
  return pedirJson<Aula>(`${BASE_AULAS}/${encodeURIComponent(codigo)}`, {
    method: 'PATCH', body: JSON.stringify(dto),
  });
}

export function eliminarAula(codigo: string): Promise<{ eliminado: true }> {
  return pedirJson(`${BASE_AULAS}/${encodeURIComponent(codigo)}`, { method: 'DELETE' });
}

// ─── Ofertas académicas (EFDS-1375) ─────────────────────────────────────────

export interface Oferta {
  idPeriodo: string;
  codigo: string;
  nombre: string;
  tipo: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  activo: boolean;
  /** planeacion | activo | cerrado. `activo` es falso en los dos extremos. */
  estado: string;
}

export interface CrearPeriodoDto {
  codigo: string;
  nombre: string;
  tipo: string | null;
  fechaInicio: string;
  fechaFin: string;
}

const BASE_OFERTAS = '/programacion-academica/api/v1/ofertas';

export function getOfertas(): Promise<Oferta[]> {
  return pedirJson<Oferta[]>(BASE_OFERTAS, { method: 'GET' });
}

/** Consumo del docente por oferta vs tope (reusa el acumulado de 1373). */
export function getConsumoPorOferta(documento: string): Promise<AcumuladoDocente> {
  return pedirJson<AcumuladoDocente>(`${BASE_OFERTAS}/consumo/${encodeURIComponent(documento)}`, { method: 'GET' });
}

// ─── Validación de cruces del histórico (3.9) ────────────────────────────────

export interface CruceHistorico {
  tipo: 'aula' | 'docente';
  periodo: string;
  dia: string;
  horaInicio: string;
  horaFin: string;
  recurso: string;
  asignaturaA: string;
  asignaturaB: string;
  programaA: string;
  programaB: string;
}

export interface ValidacionHistorico {
  origen: string;
  periodos: string[];
  resumen: { aula: number; docente: number; total: number };
  cruces: CruceHistorico[];
}

/**
 * Cruces detectados en la programación HISTÓRICA. No son fallas del sistema:
 * el sistema no permite crearlos. Por eso van aparte del contador del panel.
 */
export function getCrucesHistoricos(): Promise<ValidacionHistorico> {
  return pedirJson<ValidacionHistorico>('/programacion-academica/api/v1/validacion/historico', { method: 'GET' });
}

/**
 * Crea un periodo. Nace en 'planeacion': activar es un acto explícito aparte.
 * Exige el permiso de administración del módulo; si falta, el backend responde
 * 403 y el mensaje se muestra tal cual.
 */
export function crearPeriodo(dto: CrearPeriodoDto): Promise<Oferta> {
  return pedirJson<Oferta>(BASE_OFERTAS, { method: 'POST', body: JSON.stringify(dto) });
}

/** Activa un periodo. Varios pueden estar activos a la vez. */
export function activarPeriodo(idPeriodo: string): Promise<Oferta> {
  return pedirJson<Oferta>(`${BASE_OFERTAS}/${encodeURIComponent(idPeriodo)}/activar`, { method: 'PATCH' });
}

// ─── Publicación de la programación (NUEVA-1 / EFDS-1937) ─────────────────────

/**
 * Estado de publicación de un periodo: conteo de sus franjas por etapa del
 * ciclo PROGRAMADO → PUBLICADA → TOMADA. Es publicación, no oferta: la oferta es
 * el periodo.
 */
export interface EstadoPublicacion {
  idPeriodo: string;
  programado: number;
  publicada: number;
  tomada: number;
  total: number;
}

const BASE_PUBLICACIONES = '/programacion-academica/api/v1/publicaciones';

export function getEstadoPublicacion(idPeriodo: string): Promise<EstadoPublicacion> {
  return pedirJson<EstadoPublicacion>(`${BASE_PUBLICACIONES}/${encodeURIComponent(idPeriodo)}`, { method: 'GET' });
}

/** Publica: valida sin cruces y pasa las franjas PROGRAMADO a PUBLICADA. */
export function publicarProgramacion(idPeriodo: string): Promise<EstadoPublicacion> {
  return pedirJson<EstadoPublicacion>(`${BASE_PUBLICACIONES}/${encodeURIComponent(idPeriodo)}/publicar`, { method: 'POST' });
}

/** Retira la publicación: solo si nadie tomó franjas (PUBLICADA → PROGRAMADO). */
export function retirarProgramacion(idPeriodo: string): Promise<EstadoPublicacion> {
  return pedirJson<EstadoPublicacion>(`${BASE_PUBLICACIONES}/${encodeURIComponent(idPeriodo)}/retirar`, { method: 'POST' });
}

// ─── Portal del docente (EFDS-1938) ──────────────────────────────────────────

/** Franja tal como la ve el docente en el portal. */
export interface FranjaPortal {
  idFranja: string;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  tipoSesion: string;
  aulaCodigo: string | null;
  estado: string;
  numeroGrupo: number | null;
  asignatura: string | null;
  programa: string | null;
}

const BASE_PORTAL = '/programacion-academica/api/v1/portal-docente';

/** Franjas publicadas que el docente puede tomar (excluye las que cruzan lo suyo). */
export function getDisponiblesPortal(): Promise<FranjaPortal[]> {
  return pedirJson<FranjaPortal[]>(`${BASE_PORTAL}/disponibles`, { method: 'GET' });
}

/** Franjas que el docente ya tomó (o le aprobaron). */
export function getMisFranjasPortal(): Promise<FranjaPortal[]> {
  return pedirJson<FranjaPortal[]>(`${BASE_PORTAL}/mis-franjas`, { method: 'GET' });
}

/** Acumulado del docente autenticado vs su tope (RN-04, solo lectura). */
export function getAcumuladoPortal(): Promise<AcumuladoDocente> {
  return pedirJson<AcumuladoDocente>(`${BASE_PORTAL}/acumulado`, { method: 'GET' });
}

/** Toma una franja: el backend usa transacción + lock de fila. */
export function tomarFranja(idFranja: string): Promise<{ tomada: true }> {
  return pedirJson(`${BASE_PORTAL}/tomar/${encodeURIComponent(idFranja)}`, { method: 'POST' });
}

/** Suelta una franja tomada (solo si no está aprobada). */
export function soltarFranja(idFranja: string): Promise<{ soltada: true }> {
  return pedirJson(`${BASE_PORTAL}/soltar/${encodeURIComponent(idFranja)}`, { method: 'POST' });
}

// ─── Aprobación de la jefatura territorial (EFDS-1939) ────────────────────────

/** Franja pendiente de decisión de la jefatura, con su docente. */
export interface FranjaAprobacion {
  idFranja: string;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  aulaCodigo: string | null;
  estado: string;
  asignatura: string | null;
  programa: string | null;
  documentoDocente: string;
  nombreDocente: string;
}

const BASE_JEFATURA = '/programacion-academica/api/v1/jefatura';

/** Franjas tomadas por docentes de la territorial de la jefatura autenticada. */
export function getPendientesJefatura(): Promise<FranjaAprobacion[]> {
  return pedirJson<FranjaAprobacion[]>(`${BASE_JEFATURA}/pendientes`, { method: 'GET' });
}

/** Aprueba una franja (TOMADA → APROBADA). */
export function aprobarFranja(idFranja: string): Promise<{ aprobada: true }> {
  return pedirJson(`${BASE_JEFATURA}/aprobar/${encodeURIComponent(idFranja)}`, { method: 'POST' });
}

/** Devuelve una franja con comentario obligatorio (TOMADA → PUBLICADA). */
export function devolverFranja(idFranja: string, comentario: string): Promise<{ devuelta: true }> {
  return pedirJson(`${BASE_JEFATURA}/devolver/${encodeURIComponent(idFranja)}`, {
    method: 'POST', body: JSON.stringify({ comentario }),
  });
}
