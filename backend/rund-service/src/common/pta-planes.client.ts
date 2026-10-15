import { Injectable, Module, ServiceUnavailableException } from '@nestjs/common';

export interface PtaPlanesConsulta { docenteId?: string; periodo?: string }
export interface PtaPlanHistorico {
  id: string;
  docenteId: string;
  periodo: string;
  estado: string;
  datosEstructurados: { asignaturas: any };
}

const ESTADOS_FIRMES = ['APROBADO', 'APROBADO_DEF', 'EN_FIRME', 'RADICADO', 'EN_EJECUCION', 'FINALIZADO', 'TERMINADO'];
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

@Injectable()
export class PtaPlanesClient {
  async planesFirmes(filters: PtaPlanesConsulta): Promise<PtaPlanHistorico[]> {
    try {
      const consulta: PtaPlanesConsulta = {};
      for (const field of ['docenteId', 'periodo'] as const) {
        if (filters[field] !== undefined) {
          if (typeof filters[field] !== 'string' || !filters[field]) throw new Error();
          consulta[field] = filters[field];
        }
      }
      if (!consulta.docenteId && !consulta.periodo) throw new Error();
      const token = (process.env.PTA_INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '').trim();
      if (!token) throw new Error();
      const url = new URL(process.env.ACADEMIC_WORK_PLAN_SERVICE_URL || 'http://academic-work-plan-service:3003');
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error();
      url.pathname = url.pathname.replace(/\/$/, '') + '/internal/rund/v1/planes/historial-firme';
      const response = await fetch(url.toString(), { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { 'x-internal-service-token': token, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(consulta) });
      if (!response.ok) throw new Error();
      const body: unknown = await response.json();
      if (!record(body) || ('success' in body && body.success !== true)) throw new Error();
      const data = 'data' in body ? body.data : body;
      if (!record(data) || !record(data.consulta) || !Array.isArray(data.items)
        || !Number.isSafeInteger(data.total) || data.total !== data.items.length
        || Object.keys(data.consulta).length !== Object.keys(consulta).length
        || Object.keys(consulta).some(key => data.consulta[key] !== consulta[key])) throw new Error();
      const ids = new Set<string>();
      for (const item of data.items) {
        if (!record(item) || typeof item.id !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(item.id)
          || ids.has(item.id) || typeof item.docenteId !== 'string' || typeof item.periodo !== 'string'
          || typeof item.estado !== 'string' || !ESTADOS_FIRMES.includes(item.estado)
          || (consulta.docenteId !== undefined && item.docenteId !== consulta.docenteId)
          || (consulta.periodo !== undefined && item.periodo !== consulta.periodo)
          || !record(item.datosEstructurados) || !Object.prototype.hasOwnProperty.call(item.datosEstructurados, 'asignaturas')) throw new Error();
        ids.add(item.id);
      }
      return data.items as PtaPlanHistorico[];
    } catch { throw new ServiceUnavailableException('No fue posible confirmar los planes firmes de PTA.'); }
  }
}

@Module({ providers: [PtaPlanesClient], exports: [PtaPlanesClient] })
export class PtaPlanesModule {}
