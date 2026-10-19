import { Injectable, ServiceUnavailableException } from '@nestjs/common';

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const falla = () => new ServiceUnavailableException('No fue posible confirmar los datos históricos de PTA.');

export interface AccesoHistoricoPta {
  actorId: string; roles: string[]; endpoint: string; recursoId: string; campos: string[];
  resultado: 'COMPLETO' | 'ENMASCARADO' | 'DENEGADO';
}

/**
 * Cliente de la API interna de PTA para los soportes y la bitácora RUND históricos.
 * PTA es su propietario: Carpeta Digital ya no lee el esquema academic_work_plan por SQL
 * cuando PTA_HISTORICO_API_ENABLED=true. Un fallo nunca se interpreta como ausencia.
 */
@Injectable()
export class PtaHistoricoClient {
  get enabled(): boolean { return process.env.PTA_HISTORICO_API_ENABLED === 'true'; }

  private async llamar(ruta: string, init: { method?: string; body?: unknown } = {}): Promise<Record<string, unknown>> {
    try {
      const token = String(process.env.PTA_INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '').trim();
      if (!token) throw new Error();
      const url = new URL(process.env.ACADEMIC_WORK_PLAN_SERVICE_URL || 'http://academic-work-plan-service:3003');
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error();
      url.pathname = url.pathname.replace(/\/$/, '') + '/internal/rund/v1/carpeta-historica/' + ruta;
      const res = await fetch(url.toString(), {
        method: init.method ?? 'GET', redirect: 'error', signal: AbortSignal.timeout(10_000),
        headers: { 'x-internal-service-token': token, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      });
      if (res.status === 404) throw Object.assign(new Error('404'), { noEncontrado: true });
      if (!res.ok) throw new Error();
      const body: unknown = await res.json();
      if (!record(body) || ('success' in body && body.success !== true)) throw new Error();
      const data = 'data' in body ? body.data : body;
      if (!record(data)) throw new Error();
      return data;
    } catch (error: any) {
      if (error?.noEncontrado) throw error;
      throw falla();
    }
  }

  private lista(data: Record<string, unknown>): any[] {
    if (!Array.isArray(data.items) || data.total !== data.items.length) throw falla();
    return data.items;
  }

  /** Soportes históricos con archivo o enlace de las personas indicadas (lotes de hasta 500). */
  async soportesPorPersonas(personaIds: string[]): Promise<any[]> {
    if (!personaIds.length) return [];
    const ids = [...new Set(personaIds.map(id => id.toLowerCase()))];
    if (!ids.every(id => UUID.test(id))) throw falla();
    const items: any[] = [];
    for (let i = 0; i < ids.length; i += 500) {
      const lote = ids.slice(i, i + 500);
      const data = await this.llamar('soportes', { method: 'POST', body: { personaIds: lote } });
      const parcial = this.lista(data);
      if (parcial.some(item => !record(item) || typeof item.id !== 'string' || typeof item.persona_id !== 'string')) throw falla();
      items.push(...parcial);
    }
    return items;
  }

  async perfilesPorPersona(personaId: string): Promise<any[]> {
    if (!UUID.test(personaId)) throw falla();
    const items = this.lista(await this.llamar('perfiles/' + encodeURIComponent(personaId)));
    if (items.length > 200) throw falla();
    return items;
  }

  /** Persona dueña de un soporte histórico; null si PTA confirma que no existe. */
  async personaDeSoporte(soporteId: string): Promise<string | null> {
    if (!UUID.test(soporteId)) throw falla();
    try {
      const data = await this.llamar(`soportes/${encodeURIComponent(soporteId)}/persona`);
      if (typeof data.personaId !== 'string') throw falla();
      return data.personaId;
    } catch (error: any) {
      if (error?.noEncontrado) return null;
      throw error;
    }
  }

  async esOriginalHistorico(url: string, recursoId: string, endpoints: string[]): Promise<boolean> {
    const data = await this.llamar('originales/verificar', { method: 'POST', body: { url, recursoId, endpoints } });
    if (typeof data.esOriginalHistorico !== 'boolean') throw falla();
    return data.esOriginalHistorico;
  }

  async registrarAcceso(acceso: AccesoHistoricoPta): Promise<void> {
    const data = await this.llamar('accesos', { method: 'POST', body: acceso });
    if (data.registrado !== true) throw falla();
  }
}
