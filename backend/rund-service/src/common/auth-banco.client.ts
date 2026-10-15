import { Injectable, Module, ServiceUnavailableException } from '@nestjs/common';

export interface AuthBancoSnapshot {
  version: 1;
  items: Record<string, unknown>[];
  total: number;
  seccionales: Record<string, unknown>[];
  seccionalesTotal: number;
  sedes: Record<string, unknown>[];
  sedesTotal: number;
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const uuid = (v: unknown) => typeof v === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
const nullableText = (v: unknown) => v === null || typeof v === 'string';
const bigint = (v: unknown) => typeof v === 'string' && /^(?:0|-?[1-9]\d*)$/.test(v)
  && BigInt(v) >= -9223372036854775808n && BigInt(v) <= 9223372036854775807n;
const timestamp = (v: unknown) => v === null || (typeof v === 'string' && Number.isFinite(Date.parse(v)));
const textFields = ['username', 'num_identificacion', 'tip_identificacion', 'nom_largo', 'nom_tercero',
  'pri_apellido', 'seg_apellido', 'gen_tercero', 'fec_nacimiento', 'dir_email', 'tel_celular'];
function collection(value: unknown, total: unknown, id: string, validate: (row: Record<string, unknown>) => boolean): boolean {
  if (!Array.isArray(value) || !Number.isSafeInteger(total) || total !== value.length) return false;
  const ids = new Set();
  return value.every(row => {
    if (!record(row) || !validate(row)) return false;
    const key = String(row[id]).toLowerCase();
    if (ids.has(key)) return false;
    ids.add(key); return true;
  });
}
function snapshot(v: unknown): v is AuthBancoSnapshot {
  return record(v) && v.version === 1
    && collection(v.items, v.total, 'id_user', row => uuid(row.id_user) && uuid(row.id_person)
      && textFields.every(field => nullableText(row[field]))
      && (row.is_active === null || typeof row.is_active === 'boolean')
      && timestamp(row.created_at) && timestamp(row.updated_at)
      && (row.id_seccional === null || bigint(row.id_seccional)) && (row.id_sede === null || bigint(row.id_sede))
      && Array.isArray(row.roles) && row.roles.every(nullableText))
    && collection(v.seccionales, v.seccionalesTotal, 'id_seccional', row => bigint(row.id_seccional)
      && nullableText(row.nom_seccional) && nullableText(row.cod_seccional))
    && collection(v.sedes, v.sedesTotal, 'id_sede', row => bigint(row.id_sede) && nullableText(row.nom_sede));
}

@Injectable()
export class AuthBancoClient {
  async proyeccion(): Promise<AuthBancoSnapshot> {
    const token = String(process.env.AUTH_INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '').trim();
    if (!token) throw new ServiceUnavailableException('Falta la credencial interna del banco Auth.');
    let url: URL;
    try {
      url = new URL(process.env.AUTH_SERVICE_URL || 'http://auth-service:3001');
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error();
      url.pathname = url.pathname.replace(/\/$/, '') + '/internal/rund/v1/banco/proyeccion';
    } catch { throw new ServiceUnavailableException('La dirección del servicio Auth no es válida.'); }
    try {
      const response = await fetch(url.toString(), { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { 'x-internal-service-token': token, Accept: 'application/json' } });
      if (!response.ok) throw new Error();
      const body: unknown = await response.json();
      if (!record(body) || ('success' in body && body.success !== true)) throw new Error();
      const data = 'data' in body ? body.data : body;
      if (!snapshot(data)) throw new Error();
      return data;
    } catch { throw new ServiceUnavailableException('No fue posible confirmar los datos del banco en Auth.'); }
  }
}

@Module({ providers: [AuthBancoClient], exports: [AuthBancoClient] })
export class AuthBancoModule {}
