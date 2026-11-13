import { getApiGatewayBaseUrl } from '../../../config/environment';
import { invalidarProgramacion } from '../actualizacionProgramacion';
import type { HorasGrupo, TipoSesion } from './catalogoApi';

export interface LoteSesiones {
  idGrupo: string; dias: string[]; horaInicio: string; horaFin: string; tipoSesion: TipoSesion; aulaCodigo: string | null;
}
export interface ValidacionDias {
  valido: boolean;
  dias: { diaSemana: string; ok: boolean; conflictos: { tipo: 'INTRA_GRUPO' | 'AULA' | 'FORMA'; mensaje: string }[] }[];
  horas: { programadasDespues: number; requeridas: number; excede: boolean };
}
export class ErrorHorario extends Error {
  constructor(message: string, readonly code: string | undefined, readonly datos: any) { super(message); }
}
async function pedir<T>(ruta: string, method: string, body?: unknown): Promise<T> {
  const r = await fetch(`${getApiGatewayBaseUrl()}/programacion-academica/api/v1/horarios${ruta}`, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const json = await r.json().catch(() => null);
  if (!r.ok || json?.success === false) throw new ErrorHorario(json?.message || `No se pudo guardar el horario (${r.status}).`, json?.code, json?.data ?? json);
  return (json?.data ?? json) as T;
}
const refrescar = (idGrupo: string) => invalidarProgramacion('programacion', 'horarios', 'portal-docente', 'concertacion', 'acumulado', `grupo:${idGrupo}`);
export const validarDias = (datos: LoteSesiones) => pedir<ValidacionDias>('/lote/validar', 'POST', datos);
export async function crearDias(datos: LoteSesiones) {
  const r = await pedir<{ creadas: unknown[]; horas: HorasGrupo }>('/lote', 'POST', datos); refrescar(datos.idGrupo); return r;
}
export async function editarSesion(id: string, idGrupo: string, datos: Partial<{ diaSemana: string; horaInicio: string; horaFin: string; tipoSesion: TipoSesion; aulaCodigo: string | null }> & { confirmarDevolucion?: boolean }) {
  const r = await pedir<{ franja: unknown; horas: HorasGrupo; concertacionDevuelta: string | null }>(`/${encodeURIComponent(id)}`, 'PATCH', datos); refrescar(idGrupo); return r;
}
export async function borrarSesion(id: string, idGrupo: string, confirmarDevolucion = false) {
  const r = await pedir<{ eliminado: boolean; horas: HorasGrupo; concertacionDevuelta: string | null }>(`/${encodeURIComponent(id)}?confirmarDevolucion=${confirmarDevolucion}`, 'DELETE');
  if (r.eliminado) refrescar(idGrupo); return r;
}
