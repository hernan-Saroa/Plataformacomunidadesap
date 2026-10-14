import { Injectable, ServiceUnavailableException } from '@nestjs/common';

export function carpetaSessionToken(req?: { headers?: { authorization?: string; cookie?: string } }): string | undefined {
  const bearer = req?.headers?.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const cookie = String(req?.headers?.cookie || '').split(';').map(part => part.trim())
    .find(part => part.startsWith('esap_access_token='))?.slice('esap_access_token='.length);
  return bearer || cookie || undefined;
}

@Injectable()
export class RundCarpetaClient {
  get enabled(): boolean { return process.env.RUND_CARPETA_ENABLED === 'true'; }

  async profiles(personaId: string, userToken?: string): Promise<any[]> {
    if (!this.enabled) return [];
    const token=String(process.env.RUND_CARPETA_INTERNAL_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '').trim();
    if (!token) throw new ServiceUnavailableException('La integración documental RUND no está configurada.');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(personaId)) throw new ServiceUnavailableException('Identidad documental inválida.');
    const base=String(process.env.RUND_SERVICE_URL || 'http://localhost:3016').replace(/\/+$/,'');
    try {
      const response=await fetch(`${base}/internal/carpeta-digital/personas/${personaId}/perfiles`,{
        method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json','X-Rund-Carpeta-Token':token},
        body:JSON.stringify(userToken?{userToken}:{})});
      if (!response.ok) throw new Error();
      let body=await response.json();
      for(let i=0;i<3 && body && 'data' in body;i++){if(body.success===false)throw new Error();body=body.data;}
      if(body?.success===false || body?.propietario!=='rund' || body.persona_id!==personaId || body.complete!==true || !Array.isArray(body.perfiles)
        || body.perfiles.length>200 || new Set(body.perfiles.map(p=>p?.id)).size!==body.perfiles.length
        || body.perfiles.some(p=>!p || typeof p.id!=='string' || !p.id || p.persona_id!==personaId
          || !(p.periodo_carga===null || typeof p.periodo_carga==='string') || typeof p.estado!=='string')) throw new Error();
      return body.perfiles;
    } catch { throw new ServiceUnavailableException('No fue posible confirmar los perfiles del propietario RUND.'); }
  }

  async stats(personas: string[], userToken?: string): Promise<Map<string, any>> {
    const result = new Map<string, any>();
    if (!this.enabled || !personas.length) return result;
    const token = String(process.env.RUND_CARPETA_INTERNAL_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '').trim();
    if (!token) throw new ServiceUnavailableException('La integración documental RUND no está configurada.');
    const base = String(process.env.RUND_SERVICE_URL || 'http://localhost:3016').replace(/\/+$/, '');
    try {
      for (let start = 0; start < personas.length; start += 200) {
        const personaIds = personas.slice(start, start + 200);
        const response = await fetch(`${base}/internal/carpeta-digital/estadisticas`, {
          method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
          headers: { 'Content-Type': 'application/json', 'X-Rund-Carpeta-Token': token },
          body: JSON.stringify({ personaIds, ...(userToken ? { userToken } : {}) }),
        });
        if (!response.ok) throw new Error();
        let body = await response.json();
        for (let depth = 0; depth < 3 && body && 'data' in body; depth++) {
          if (body.success === false) throw new Error(); body = body.data;
        }
        if (body?.success === false || body?.propietario !== 'rund' || body.complete !== true || !Array.isArray(body.personas) || body.personas.length !== personaIds.length) throw new Error();
        for (const row of body.personas) {
          const values = ['total_documentos','documentos_completos','documentos_pendientes','documentos_rechazados','documentos_vencidos'].map(k => row?.[k]);
          if (!row || !personaIds.includes(row.persona_id) || result.has(row.persona_id) || values.some(n => !Number.isSafeInteger(n) || n < 0)
            || values[0] !== values.slice(1).reduce((a,b) => a+b,0)) throw new Error();
          result.set(row.persona_id, row);
        }
      }
      return result;
    } catch { throw new ServiceUnavailableException('No fue posible confirmar los contadores del servicio RUND.'); }
  }

  async getDocumento(id: string, userToken?: string): Promise<any> {
    const match = id.match(/^rund-service:(documento|soporte):([0-9a-f-]{36})$/i);
    if (!match || !this.enabled) throw new ServiceUnavailableException('La consulta de este documento RUND no está disponible.');
    const token = String(process.env.RUND_CARPETA_INTERNAL_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '').trim();
    const base = String(process.env.RUND_SERVICE_URL || 'http://localhost:3016').replace(/\/+$/, '');
    if (!token) throw new ServiceUnavailableException('La integración documental RUND no está configurada.');
    try {
      const response = await fetch(`${base}/internal/carpeta-digital/documentos/${match[1]}/${match[2]}`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: { 'Content-Type': 'application/json', 'X-Rund-Carpeta-Token': token },
        body: JSON.stringify(userToken ? { userToken } : {}),
      });
      if (!response.ok) throw new Error();
      let value: any = await response.json();
      for (let depth = 0; depth < 3 && value && 'data' in value; depth++) {
        if (value.success === false) throw new Error();
        value = value.data;
      }
      if (!value || value.success === false || value.id !== id || value.servicio_propietario !== 'rund'
        || typeof value.contenido_restringido !== 'boolean') throw new Error();
      return value;
    } catch { throw new ServiceUnavailableException('No fue posible consultar este documento RUND.'); }
  }

  async listDocumentos(personaId: string, userToken?: string): Promise<any[]> {
    if (!this.enabled) return [];
    const token = String(process.env.RUND_CARPETA_INTERNAL_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '').trim();
    const base = String(process.env.RUND_SERVICE_URL || 'http://localhost:3016').replace(/\/+$/, '');
    if (!token) throw new ServiceUnavailableException('La integración documental RUND no está configurada.');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(personaId)) {
      throw new ServiceUnavailableException('No fue posible resolver la identidad documental.');
    }
    try {
      const response = await fetch(`${base}/internal/carpeta-digital/personas/${encodeURIComponent(personaId)}/documentos`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: { 'Content-Type': 'application/json', 'X-Rund-Carpeta-Token': token },
        body: JSON.stringify(userToken ? { userToken } : {}),
      });
      if (!response.ok) throw new Error('RUND no confirmó la consulta.');
      let body: any = await response.json();
      for (let depth = 0; depth < 3; depth++) {
        if (Array.isArray(body)) break;
        if (!body || typeof body !== 'object' || body.success === false || !Object.prototype.hasOwnProperty.call(body, 'data')) {
          throw new Error('Respuesta documental no válida.');
        }
        body = body.data;
      }
      if (!Array.isArray(body) || body.some(doc => !doc || typeof doc !== 'object'
        || doc.servicio_propietario !== 'rund' || doc.origen !== 'rund-service'
        || doc.persona_id !== personaId || typeof doc.id !== 'string' || !doc.id.startsWith('rund-service:')
        || typeof doc.contenido_restringido !== 'boolean')) throw new Error('Contrato documental no válido.');
      return body;
    } catch {
      // Una caída nunca se convierte en un listado vacío exitoso ni se reintenta.
      throw new ServiceUnavailableException('No fue posible consultar los documentos del servicio RUND.');
    }
  }
}
