import { Injectable, Module, ServiceUnavailableException } from '@nestjs/common';

export interface SeccionalCatalogo { id: string; nombre: string | null }
export interface TerritorialCatalogo { codigo: string; nombre: string }
export interface TerritorialBancoCatalogo { id: string; nombre: string; codigo: string | null }
export interface PtaNombreHistorico {
  personaId: string; primer_nombre: string | null; segundo_nombre: string | null;
  primer_apellido: string | null; segundo_apellido: string | null;
}
export interface PtaIdentidadHistorica extends PtaNombreHistorico { identificacion: string | null }
export interface PtaProgramaHistorico { id: string; nombre: string }
type CatalogoConsulta = { personaIds: string[] } | { programaIds: string[] };
const int8Id = (id: unknown): string | null => {
  if (typeof id !== 'string' || !/^[+-]?\d+$/.test(id)) return null;
  const value = BigInt(id);
  return value >= -9223372036854775808n && value <= 9223372036854775807n ? String(value) : null;
};
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

@Injectable()
export class RundCatalogosClient {
  private async read<T>(base: string, token: string, recurso: string,
    validate: (value: unknown) => value is T, key: (value: T) => string, grupo = 'catalogos', consulta?: CatalogoConsulta): Promise<T[]> {
    try {
      if (!token.trim()) throw new Error();
      const url = new URL(base);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error();
      url.pathname = url.pathname.replace(/\/$/, '') + '/internal/rund/v1/' + grupo + '/' + recurso;
      const res = await fetch(url.toString(), { method: consulta ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { 'x-internal-service-token': token.trim(), Accept: 'application/json', ...(consulta ? { 'Content-Type': 'application/json' } : {}) },
        ...(consulta ? { body: JSON.stringify(consulta) } : {}) });
      // Un 404 de esta ruta significa contrato ausente, no catálogo vacío.
      if (!res.ok) throw new Error();
      const body: unknown = await res.json();
      if (!record(body) || ('success' in body && body.success !== true)) throw new Error();
      const data = 'data' in body ? body.data : body;
      if (!record(data) || !Array.isArray(data.items) || !Number.isSafeInteger(data.total)
        || data.total !== data.items.length || !data.items.every(validate)) throw new Error();
      if (consulta) {
        const field = 'personaIds' in consulta ? 'personaIds' : 'programaIds';
        const expected = 'personaIds' in consulta ? consulta.personaIds : consulta.programaIds;
        if (!record(data.consulta) || !Array.isArray(data.consulta[field]) || data.consulta[field].length !== expected.length
          || !data.consulta[field].every((id, i) => id === expected[i])) throw new Error();
      }
      const items = data.items as T[];
      if (new Set(items.map(key)).size !== items.length) throw new Error();
      return items;
    } catch { throw new ServiceUnavailableException('No fue posible confirmar el catálogo ' + recurso + ' de su servicio propietario.'); }
  }

  seccionales(): Promise<SeccionalCatalogo[]> {
    return this.read(process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
      process.env.AUTH_INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '', 'seccionales',
      (value): value is SeccionalCatalogo => record(value) && typeof value.id === 'string'
        && /^(?:0|-?[1-9]\d*)$/.test(value.id) && (value.nombre === null || typeof value.nombre === 'string'), value => value.id);
  }

  territoriales(): Promise<TerritorialCatalogo[]> {
    return this.read(process.env.ACADEMIC_WORK_PLAN_SERVICE_URL || 'http://academic-work-plan-service:3003',
      process.env.PTA_INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '', 'territoriales',
      (value): value is TerritorialCatalogo => record(value) && typeof value.codigo === 'string'
        && typeof value.nombre === 'string', value => value.codigo);
  }

  territorialesBanco(): Promise<TerritorialBancoCatalogo[]> {
    return this.read(process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
      process.env.AUTH_INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '', 'territoriales-banco',
      (value): value is TerritorialBancoCatalogo => record(value) && typeof value.id === 'string'
        && /^(?:0|-?[1-9]\d*)$/.test(value.id) && typeof value.nombre === 'string'
        && (value.codigo === null || typeof value.codigo === 'string'), value => value.id);
  }

  async periodoActivo(): Promise<string | null> {
    const items = await this.read<{ codigo: string; estado: 'en_curso' }>(
      process.env.ACADEMIC_WORK_PLAN_SERVICE_URL || 'http://academic-work-plan-service:3003',
      process.env.PTA_INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '', 'periodo-activo',
      (value): value is { codigo: string; estado: 'en_curso' } => record(value) && typeof value.codigo === 'string'
        && value.codigo.trim().length > 0 && value.codigo.length <= 10 && value.estado === 'en_curso', value => value.codigo);
    if (items.length > 1) throw new ServiceUnavailableException('No fue posible confirmar un único período activo de PTA.');
    return items[0]?.codigo ?? null;
  }

  async nombreHistorico(personaId: string): Promise<PtaNombreHistorico | null> {
    const fields = ['primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido'];
    const items = await this.read<PtaNombreHistorico>(
      process.env.ACADEMIC_WORK_PLAN_SERVICE_URL || 'http://academic-work-plan-service:3003',
      process.env.PTA_INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '',
      encodeURIComponent(personaId) + '/nombre-historico',
      (value): value is PtaNombreHistorico => record(value) && typeof value.personaId === 'string'
        && value.personaId.toLowerCase() === personaId.toLowerCase()
        && fields.every(field => value[field] === null || typeof value[field] === 'string'),
      value => value.personaId.toLowerCase(), 'personas');
    return items[0] ?? null;
  }

  async identidadesHistoricas(personaIds: string[]): Promise<PtaIdentidadHistorica[]> {
    if (!personaIds.every(id => typeof id === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))) {
      throw new ServiceUnavailableException('Identificadores históricos incompatibles.');
    }
    const ids = [...new Set(personaIds.map(id => id.toLowerCase()))];
    const result: PtaIdentidadHistorica[] = [], fields = ['primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido', 'identificacion'];
    for (let offset = 0; offset < ids.length; offset += 500) {
      const batch = ids.slice(offset, offset + 500), requested = new Set(batch);
      const items = await this.read<PtaIdentidadHistorica>(
        process.env.ACADEMIC_WORK_PLAN_SERVICE_URL || 'http://academic-work-plan-service:3003',
        process.env.PTA_INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '', 'identidades-historicas',
        (value): value is PtaIdentidadHistorica => record(value) && typeof value.personaId === 'string'
          && requested.has(value.personaId) && fields.every(field => value[field] === null || typeof value[field] === 'string'),
        value => value.personaId.toLowerCase(), 'personas', { personaIds: batch });
      result.push(...items);
    }
    return result;
  }

  async programasHistoricos(programaIds: string[]): Promise<PtaProgramaHistorico[]> {
    if (!programaIds.every(id => int8Id(id) !== null)) throw new ServiceUnavailableException('Identificadores de programas incompatibles.');
    const ids = [...new Set(programaIds)], result = new Map<string, PtaProgramaHistorico>();
    for (let offset = 0; offset < ids.length; offset += 500) {
      const batch = ids.slice(offset, offset + 500), requested = new Set(batch.map(int8Id));
      const items = await this.read<PtaProgramaHistorico>(
        process.env.ACADEMIC_WORK_PLAN_SERVICE_URL || 'http://academic-work-plan-service:3003',
        process.env.PTA_INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '', 'programas-historicos',
        (value): value is PtaProgramaHistorico => record(value) && typeof value.id === 'string' && int8Id(value.id) === value.id
          && requested.has(value.id) && typeof value.nombre === 'string', value => value.id, 'catalogos', { programaIds: batch });
      for (const item of items) result.set(item.id, item);
    }
    return [...result.values()];
  }
}

@Module({ providers: [RundCatalogosClient], exports: [RundCatalogosClient] })
export class RundCatalogosModule {}
