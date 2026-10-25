import { getApiGatewayBaseUrl } from '../../../config/environment';
import { invalidarProgramacion } from '../actualizacionProgramacion';
import { pedirJson } from './catalogoApi';

export interface CandidatoArea {
  documento: string; nombre: string; vinculacion: string | null; perfil: string | null;
  titulos: Record<'pregrado' | 'especializacion' | 'maestria' | 'doctorado' | 'posdoctorado', string | null>;
  nucleos: { area: string; origen: 'rund' | 'puente'; texto: string }[];
  origenArea: 'rund' | 'puente'; horasProgramadas: number | null; horasImpacto: number | null; tope: number | null;
  cruce: boolean; motivos: { regla: string; mensaje: string }[]; asignable: boolean;
}
export interface CandidatosArea {
  grupo: string;
  franjas: { idFranja: string; diaSemana: string; horaInicio: string; horaFin: string; docenteActual: string | null }[];
  area: { codigo: string; nombre: string; nucleoAsignatura: string | null } | null;
  candidatos: CandidatoArea[];
  sugerido: { documento: string; nombre: string; razones: string[] } | null;
  mensaje: string | null;
}
const BASE = '/programacion-academica/api/v1/asignaciones';
export const getCandidatosArea = (grupo: string, franjas: string[]) => pedirJson<CandidatosArea>(`${BASE}/candidatos?grupo=${encodeURIComponent(grupo)}&franjas=${encodeURIComponent(franjas.join(','))}`, { method: 'GET' });

export async function asignarFranjas(idGrupo: string, documento: string, franjas: string[]) {
  const res = await fetch(`${getApiGatewayBaseUrl()}${BASE}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idGrupo, documento, franjas }) });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || `No se pudo asignar (error ${res.status}).`);
  const data = (body.data ?? body) as { asignado: boolean; motivos?: { regla: string; mensaje: string }[] };
  // Un 200 con asignado:false es una escritura rechazada: no invalida nada.
  if (data.asignado) invalidarProgramacion('programacion', 'horarios', 'portal-docente', 'acumulado', `grupo:${idGrupo}`);
  return data;
}
