import { Injectable, Module, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'crypto';

export interface AuthIdentityValidationQuery {
  version: 1; operacionId: string; documento: string; correo: string; resolverPorCorreo: boolean;
}
export interface AuthIdentityValidation {
  consulta: AuthIdentityValidationQuery;
  resultado: { personaId: string | null; usuarioId: string | null; rolDocenteId: string | null;
    coincidencia: 'documento' | 'correo' | 'ninguna'; conflictoCorreo: boolean };
  huella: string;
  reserva: false;
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);

/** Cliente preparatorio; no está conectado todavía a los flujos de escritura. */
@Injectable()
export class AuthIdentityValidationClient {
  async validar(input: AuthIdentityValidationQuery): Promise<AuthIdentityValidation> {
    try {
      if (!record(input) || Object.keys(input).length !== 5 || input.version !== 1 || !uuid(input.operacionId)
        || typeof input.documento !== 'string' || !input.documento.trim() || typeof input.correo !== 'string' || !input.correo
        || input.correo !== input.correo.trim().toLowerCase() || typeof input.resolverPorCorreo !== 'boolean') throw new Error();
      // Copia estable: una mutación del objeto del llamador no cambia el echo esperado durante la petición.
      const consulta: AuthIdentityValidationQuery = { version: 1, operacionId: input.operacionId, documento: input.documento,
        correo: input.correo, resolverPorCorreo: input.resolverPorCorreo };
      const token = (process.env.AUTH_INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '').trim();
      if (!token) throw new Error();
      const url = new URL(process.env.AUTH_SERVICE_URL || 'http://auth-service:3001');
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error();
      url.pathname = url.pathname.replace(/\/$/, '') + '/internal/rund/v1/personas/escritura/validar';
      const response = await fetch(url.toString(), { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { 'x-internal-service-token': token, Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(consulta) });
      if (!response.ok) throw new Error();
      const body: unknown = await response.json();
      if (!record(body) || ('success' in body && body.success !== true)) throw new Error();
      const data = 'data' in body ? body.data : body;
      if (!record(data) || !record(data.consulta) || Object.keys(data.consulta).length !== 5
        || Object.keys(consulta).some(key => data.consulta[key] !== consulta[key]) || data.reserva !== false
        || !record(data.resultado) || typeof data.huella !== 'string') throw new Error();
      const result = data.resultado;
      if (Object.keys(result).length !== 5 || ![result.personaId, result.usuarioId, result.rolDocenteId].every(id => id === null || uuid(id))
        || !['documento', 'correo', 'ninguna'].includes(result.coincidencia as string) || typeof result.conflictoCorreo !== 'boolean'
        || (result.coincidencia === 'ninguna' ? result.personaId !== null || result.usuarioId !== null : result.personaId === null)
        || (result.coincidencia === 'correo' && !consulta.resolverPorCorreo)) throw new Error();
      const huella = createHash('sha256').update(JSON.stringify([consulta.version, consulta.operacionId, consulta.documento,
        consulta.correo, consulta.resolverPorCorreo, result.personaId, result.usuarioId, result.rolDocenteId,
        result.coincidencia, result.conflictoCorreo])).digest('hex');
      if (data.huella !== huella) throw new Error();
      return data as unknown as AuthIdentityValidation;
    } catch { throw new ServiceUnavailableException('No fue posible prevalidar la escritura de identidad en Auth.'); }
  }
}

@Module({ providers: [AuthIdentityValidationClient], exports: [AuthIdentityValidationClient] })
export class AuthIdentityValidationModule {}
