import { getApiGatewayBaseUrl } from '../../../config/environment';
import { invalidarProgramacion } from '../actualizacionProgramacion';

export interface PeriodoPlataforma {
  idPeriodo: string;
  modelo: 'plataforma';
  codigo: string;
  anio: number;
  semestre: 1 | 2;
  fechaInicio: string;
  fechaFin: string;
  estadoPlataforma: 'planeacion' | 'concertacion' | 'en_curso' | 'cerrado';
  programacion: { estado: 'abierta' | 'cerrada'; cerradaEn: string | null };
  programable: boolean;
  esActivo: boolean;
}

export interface PeriodoLegado {
  idPeriodo: string;
  modelo: 'legado';
  codigo: string;
  nombre: string;
  tipo: 'periodo_regular' | 'creditos_virtual' | 'interperiodo';
  estado: 'planeacion' | 'activo' | 'cerrado';
  motivo: string;
}

export type PeriodoVista = PeriodoPlataforma | PeriodoLegado;

export interface RespuestaPeriodos {
  periodos: PeriodoPlataforma[];
  legado: PeriodoLegado[];
  permisos: { crear: boolean; activar: boolean; cerrarProgramacion: boolean; importar: boolean };
}

export interface ImpactoActivacion {
  codigo: string;
  yaActivo: string | null;
  ptasATerminar: number | null;
  porPeriodo: { codigo: string; ptas: number }[];
  periodosACerrar: string[];
  periodosAPlaneacion: string[];
  advertencia: string | null;
}

export interface ResultadoImportacion {
  success: boolean;
  dry_run: boolean;
  periodo: string;
  carga?: {
    asignaturas?: { creados: number; actualizados: number; omitidos: number };
    programas?: { creados: number; actualizados: number; omitidos: number };
  };
  advertencias?: string[];
  errores?: string[];
  relaciones_cruzadas?: { codigo_programa: string; errores: string[] }[];
}

async function peticion<T>(ruta: string, init: RequestInit = {}, permitirResultadoInvalido = false): Promise<T> {
  const res = await fetch(`${getApiGatewayBaseUrl()}${ruta}`, {
    credentials: 'include',
    ...init,
    headers: init.body instanceof FormData ? init.headers : { 'Content-Type': 'application/json', ...init.headers },
  });
  let cuerpo: any = null;
  try { cuerpo = await res.json(); } catch { /* 204 o respuesta sin JSON */ }
  if (!res.ok || (!permitirResultadoInvalido && cuerpo?.success === false)) {
    const mensaje = cuerpo?.message ?? cuerpo?.error ?? cuerpo?.errores?.join('; ');
    throw new Error(Array.isArray(mensaje) ? mensaje.join('; ') : mensaje || `La solicitud falló (${res.status}).`);
  }
  return (cuerpo?.data ?? cuerpo) as T;
}

const BASE = '/programacion-academica/api/v1/periodos';
const PTA = '/pta/api/v1/periodos-academicos';

export const getPeriodos = () => peticion<RespuestaPeriodos>(BASE);

export async function crearPeriodoPlataforma(datos: {
  anio: number; semestre: 1 | 2; fechaInicio: string; fechaFin: string;
}): Promise<unknown> {
  const creado = await peticion(PTA, { method: 'POST', body: JSON.stringify(datos) });
  invalidarProgramacion('periodos', 'programacion');
  return creado;
}

export const getImpactoActivacion = (idPeriodo: string) =>
  peticion<ImpactoActivacion>(`${PTA}/${encodeURIComponent(idPeriodo)}/impacto-activacion`);

export async function activarPeriodoPlataforma(idPeriodo: string): Promise<void> {
  await peticion(`${PTA}/${encodeURIComponent(idPeriodo)}`, {
    method: 'PATCH', body: JSON.stringify({ estado: 'en_curso' }),
  });
  invalidarProgramacion('periodos', 'programacion');
}

export async function importarAsignaturas(
  codigo: string, archivo: File, dryRun: boolean,
): Promise<ResultadoImportacion> {
  const form = new FormData();
  form.append('file', archivo);
  const query = new URLSearchParams({ periodo_codigo: codigo, dry_run: String(dryRun) });
  const resultado = await peticion<ResultadoImportacion>(
    `/pta/api/v1/asignaturas-import/upload?${query}`, { method: 'POST', body: form }, true,
  );
  if (!dryRun && resultado.success) invalidarProgramacion('catalogo', 'programacion', 'periodos');
  return resultado;
}
