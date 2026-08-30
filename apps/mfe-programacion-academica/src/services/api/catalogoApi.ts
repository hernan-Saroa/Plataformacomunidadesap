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

const BASE = '/programacion-academica/catalogo';

async function pedir<T>(ruta: string): Promise<T> {
  const res = await fetch(`${getApiGatewayBaseUrl()}${ruta}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) {
    // 403 es un caso esperado (RN-08), no un fallo del sistema: se propaga con
    // un mensaje que la UI pueda mostrar tal cual.
    if (res.status === 403) {
      throw new Error('No tiene permisos de programación sobre este nivel académico.');
    }
    throw new Error(`No se pudo consultar el catálogo (error ${res.status}).`);
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
