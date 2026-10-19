import { ConflictException, Injectable, Module, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'crypto';

export type AuthCorrectionCode = 'VALOR_PREVIO_CAMBIO' | 'DOCUMENTO_DUPLICADO' | 'OPERACION_DISTINTA' | 'CAMBIOS_POSTERIORES';
export const AUTH_CORRECTION_FIELDS = ['documentNumber', 'documentType', 'nombreCompleto', 'genero', 'fechaNacimiento'] as const;
export type AuthCorrectionField = typeof AUTH_CORRECTION_FIELDS[number];

export interface AuthIdentityCorrection {
  version: 1; operacionId: string; personaId: string; campo: AuthCorrectionField;
  valorPrevio: string | null; valorNuevo: string; actorId: string; sugerenciaId: string | null;
}
export interface AuthIdentityCorrectionReceipt {
  operacionId: string; personaId: string; campo: string; valorPrevio: string | null; valorNuevo: string;
  huella: string; estado: 'APLICADA' | 'COMPENSADA'; aplicadaEn: string; compensadaEn: string | null;
}

/** Rechazo de negocio de Auth (el valor cambió, documento duplicado...): no es una caída y no se reintenta igual. */
export class AuthIdentityCorrectionConflict extends ConflictException {
  constructor(message: string, readonly code: AuthCorrectionCode) { super(message); }
}

const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const timestamp = (v: unknown) => typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v));
const CODES: AuthCorrectionCode[] = ['VALOR_PREVIO_CAMBIO', 'DOCUMENTO_DUPLICADO', 'OPERACION_DISTINTA', 'CAMBIOS_POSTERIORES'];
const RECEIPT_KEYS = ['operacionId', 'personaId', 'campo', 'valorPrevio', 'valorNuevo', 'huella', 'estado', 'aplicadaEn', 'compensadaEn'];

/** Mismo orden de claves que el propietario: la huella debe coincidir en ambos servicios. */
export function authCorrection(input: AuthIdentityCorrection): AuthIdentityCorrection {
  return { version: 1, operacionId: input.operacionId.toLowerCase(), personaId: input.personaId.toLowerCase(), campo: input.campo,
    valorPrevio: input.valorPrevio, valorNuevo: input.valorNuevo, actorId: input.actorId, sugerenciaId: input.sugerenciaId };
}
export const authCorrectionFingerprint = (input: AuthIdentityCorrection) => createHash('sha256').update(JSON.stringify(authCorrection(input))).digest('hex');

/**
 * Cliente de la API de correcciones de identidad de Auth (propietario de auth.personas).
 * Toda respuesta se valida contra lo pedido: una respuesta parcial o distinta nunca se toma por éxito.
 */
@Injectable()
export class AuthIdentityCorrectionClient {
  get enabled(): boolean { return process.env.RUND_OCR_IDENTITY_VIA_AUTH_API === 'true'; }

  private async request(method: 'GET' | 'POST', suffix: string, body?: unknown): Promise<{ status: number; data: Record<string, unknown> }> {
    let response: Response;
    try {
      const token = (process.env.AUTH_INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '').trim();
      if (!token) throw new Error();
      const url = new URL(process.env.AUTH_SERVICE_URL || 'http://auth-service:3001');
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error();
      url.pathname = url.pathname.replace(/\/$/, '') + '/internal/rund/v1/personas/correcciones' + suffix;
      response = await fetch(url.toString(), { method, redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { 'x-internal-service-token': token, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}) });
    } catch { throw new ServiceUnavailableException('No fue posible comunicarse con Auth para corregir la identidad.'); }
    let parsed: unknown;
    try { parsed = await response.json(); } catch { parsed = undefined; }
    const envelope = record(parsed) ? parsed : undefined;
    if (response.status === 409) {
      const payload = envelope && record(envelope.data) ? envelope.data : envelope;
      // Auth conserva el motivo en el campo error de su filtro de excepciones.
      const code = payload && typeof payload.error === 'string' ? payload.error : '';
      if (!CODES.includes(code as AuthCorrectionCode)) throw new ServiceUnavailableException('Auth rechazó la corrección sin un motivo reconocido.');
      throw new AuthIdentityCorrectionConflict(String(payload?.message || 'Auth rechazó la corrección.'), code as AuthCorrectionCode);
    }
    if (response.status === 404) return { status: 404, data: {} };
    if (!response.ok || !envelope || ('success' in envelope && envelope.success !== true)) {
      throw new ServiceUnavailableException('Auth no confirmó la corrección de identidad.');
    }
    const data = 'data' in envelope ? envelope.data : envelope;
    if (!record(data)) throw new ServiceUnavailableException('Auth no confirmó la corrección de identidad.');
    return { status: response.status, data };
  }

  private receipt(raw: unknown, expected: { operacionId: string; huella?: string; personaId?: string; campo?: string; valorPrevio?: string | null; valorNuevo?: string }): AuthIdentityCorrectionReceipt {
    const bad = () => new ServiceUnavailableException('Auth devolvió un recibo de corrección incompatible.');
    if (!record(raw) || Object.keys(raw).length !== RECEIPT_KEYS.length || !RECEIPT_KEYS.every(k => Object.prototype.hasOwnProperty.call(raw, k))) throw bad();
    if (raw.operacionId !== expected.operacionId || !uuid(raw.personaId) || typeof raw.campo !== 'string'
      || !(raw.valorPrevio === null || typeof raw.valorPrevio === 'string') || typeof raw.valorNuevo !== 'string'
      || typeof raw.huella !== 'string' || !/^[a-f0-9]{64}$/.test(raw.huella) || !['APLICADA', 'COMPENSADA'].includes(String(raw.estado))
      || !timestamp(raw.aplicadaEn) || (raw.estado === 'APLICADA' ? raw.compensadaEn !== null : !timestamp(raw.compensadaEn))) throw bad();
    for (const key of ['huella', 'personaId', 'campo', 'valorPrevio', 'valorNuevo'] as const) {
      if (key in expected && expected[key] !== undefined && raw[key] !== expected[key]) throw bad();
    }
    return raw as unknown as AuthIdentityCorrectionReceipt;
  }

  async aplicar(input: AuthIdentityCorrection): Promise<AuthIdentityCorrectionReceipt> {
    const command = authCorrection(input), huella = authCorrectionFingerprint(command);
    const { data } = await this.request('POST', '', command);
    const receipt = this.receipt(data.correccion, { operacionId: command.operacionId, huella, personaId: command.personaId, campo: command.campo,
      valorPrevio: command.valorPrevio, valorNuevo: command.valorNuevo });
    if (receipt.estado !== 'APLICADA') throw new ServiceUnavailableException('Auth no aplicó la corrección de identidad.');
    return receipt;
  }

  /** null cuando Auth confirma que no existe la corrección (la solicitud pudo no llegar). */
  async consultar(operacionId: string): Promise<AuthIdentityCorrectionReceipt | null> {
    if (!uuid(operacionId)) throw new ServiceUnavailableException('ID de corrección inválido.');
    const id = operacionId.toLowerCase();
    const { data } = await this.request('GET', '/' + encodeURIComponent(id));
    if (!record(data.consulta) || data.consulta.operacionId !== id || typeof data.encontrada !== 'boolean') {
      throw new ServiceUnavailableException('Auth devolvió una consulta de corrección incompatible.');
    }
    if (!data.encontrada) {
      if (data.correccion !== null) throw new ServiceUnavailableException('Auth devolvió una consulta de corrección incompatible.');
      return null;
    }
    return this.receipt(data.correccion, { operacionId: id });
  }

  async compensar(operacionId: string, huella: string): Promise<AuthIdentityCorrectionReceipt> {
    if (!uuid(operacionId) || !/^[a-f0-9]{64}$/.test(huella)) throw new ServiceUnavailableException('Compensación de corrección inválida.');
    const id = operacionId.toLowerCase();
    const { status, data } = await this.request('POST', '/' + encodeURIComponent(id) + '/compensar', { huella });
    if (status === 404) throw new ServiceUnavailableException('Auth no tiene registrada la corrección a compensar.');
    const receipt = this.receipt(data.correccion, { operacionId: id, huella });
    if (receipt.estado !== 'COMPENSADA') throw new ServiceUnavailableException('Auth no confirmó la compensación.');
    return receipt;
  }
}

@Module({ providers: [AuthIdentityCorrectionClient], exports: [AuthIdentityCorrectionClient] })
export class AuthIdentityCorrectionModule {}
