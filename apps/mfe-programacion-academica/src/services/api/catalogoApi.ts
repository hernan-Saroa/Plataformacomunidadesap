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
}

const BASE_GRUPOS = '/programacion-academica/api/v1/grupos';

async function pedirJson<T>(ruta: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${getApiGatewayBaseUrl()}${ruta}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...init,
  });
  if (!res.ok) {
    if (res.status === 403) throw new Error('No tiene permisos para gestionar grupos de esta asignatura.');
    // El backend explica el motivo (p. ej. contra qué sesión cruza la franja):
    // se propaga tal cual, porque es lo que le dice al programador qué corregir.
    let detalle = "";
    try { const cuerpo = await res.json(); detalle = cuerpo?.message || cuerpo?.error || ""; } catch { /* sin cuerpo util */ }
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

const BASE_HORARIOS = '/programacion-academica/api/v1/horarios';

export function getSesiones(idGrupo: string): Promise<Sesion[]> {
  return pedirJson<Sesion[]>(`${BASE_HORARIOS}?grupo=${encodeURIComponent(idGrupo)}`, { method: 'GET' });
}

export function crearSesion(datos: {
  idGrupo: string; diaSemana: string; horaInicio: string; horaFin: string;
  tipoSesion: TipoSesion; aulaCodigo?: string | null;
}): Promise<Sesion> {
  return pedirJson<Sesion>(BASE_HORARIOS, { method: 'POST', body: JSON.stringify(datos) });
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
