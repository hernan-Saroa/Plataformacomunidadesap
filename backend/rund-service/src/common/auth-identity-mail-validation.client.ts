import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { identityWriteCommand, identityWriteFingerprint, IdentityWriteCommand } from './auth-identity-command';

export interface AuthIdentityMailValidation {
  version: 1; operacionId: string; huellaComando: string; apta: boolean;
  motivo: 'OPERACION_NO_ELEGIBLE' | 'IDENTIDAD_NO_VIGENTE' | 'CREDENCIALES_NO_VIGENTES' | null;
}
const exact = (v: unknown, keys: string[]): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
  && Object.keys(v).length === keys.length && keys.every(k => Object.prototype.hasOwnProperty.call(v, k));

/** Consulta de vigencia por intento; sin caché, retries o copia de credenciales Auth. */
@Injectable()
export class AuthIdentityMailValidationClient {
  async validar(value: string, input: IdentityWriteCommand): Promise<AuthIdentityMailValidation> {
    try {
      if (typeof value !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value)) throw new Error();
      const id = value.toLowerCase(), comando = identityWriteCommand(input), hash = identityWriteFingerprint(comando);
      const token = (process.env.AUTH_INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '').trim();
      if (!token) throw new Error();
      const url = new URL(process.env.AUTH_SERVICE_URL || 'http://auth-service:3001');
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error();
      url.pathname = url.pathname.replace(/\/$/, '') + '/internal/rund/v1/personas/escritura/operaciones/' + id + '/correo/validar';
      const response = await fetch(url.toString(), {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000), cache: 'no-store',
        headers: { 'x-internal-service-token': token, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ comando, huellaComando: hash }),
      });
      if (response.status !== 200) throw new Error();
      const raw: unknown = await response.json();
      const data = exact(raw, ['validacion']) ? raw :
        raw && typeof raw === 'object' && !Array.isArray(raw) && (raw as any).success === true ? (raw as any).data : null;
      if (!exact(data, ['validacion']) || !exact(data.validacion, ['version', 'operacionId', 'huellaComando', 'apta', 'motivo'])) throw new Error();
      const v = data.validacion;
      if (v.version !== 1 || v.operacionId !== id || v.huellaComando !== hash || typeof v.apta !== 'boolean'
        || (v.apta ? v.motivo !== null : !['OPERACION_NO_ELEGIBLE', 'IDENTIDAD_NO_VIGENTE', 'CREDENCIALES_NO_VIGENTES'].includes(v.motivo as string))) throw new Error();
      return v as unknown as AuthIdentityMailValidation;
    } catch {
      throw new ServiceUnavailableException('No fue posible confirmar la vigencia del correo con Auth.');
    }
  }
}
