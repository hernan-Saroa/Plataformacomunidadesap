import { invalidarProgramacion } from '../actualizacionProgramacion';
import { pedirJson } from './catalogoApi';

/** Grupo virtual asignado al docente, con el horario que él define (migración 063). */
export interface GrupoVirtualDocente {
  idGrupo: string;
  numeroGrupo: number;
  codigoAsignatura: string;
  asignatura: string;
  programa: string;
  nivel: string | null;
  idPeriodo: string | null;
  periodoCodigo: string | null;
  cicloInicio: string | null;
  cicloFin: string | null;
  horasRequeridas: number | null;
  horasProgramadas: number | null;
  horasMaximas: number | null;
  franjas: Array<{
    idFranja: string; diaSemana: string; horaInicio: string; horaFin: string;
    estado: string; definidaPor: 'programador' | 'docente';
  }>;
  editable: boolean;
  motivoNoEditable: string | null;
}

const BASE = '/programacion-academica/api/v1/portal-docente/grupos-virtuales';

export const getGruposVirtuales = () => pedirJson<GrupoVirtualDocente[]>(BASE, { method: 'GET' });

/** Agrega una sesión: el servidor valida choques, horas del grupo y tope antes de guardar. */
export async function definirFranjaVirtual(idGrupo: string, franja: { diaSemana: string; horaInicio: string; horaFin: string }) {
  const r = await pedirJson<{ idFranja: string }>(`${BASE}/${encodeURIComponent(idGrupo)}/franjas`, {
    method: 'POST', body: JSON.stringify(franja),
  });
  invalidarProgramacion('portal-docente', 'programacion', 'horarios', 'acumulado', `grupo:${idGrupo}`);
  return r;
}

/** Quita una sesión que el docente definió. */
export async function quitarFranjaVirtual(idGrupo: string, idFranja: string) {
  const r = await pedirJson<{ eliminada: true }>(`${BASE}/${encodeURIComponent(idGrupo)}/franjas/${encodeURIComponent(idFranja)}`, {
    method: 'DELETE',
  });
  invalidarProgramacion('portal-docente', 'programacion', 'horarios', 'acumulado', `grupo:${idGrupo}`);
  return r;
}
