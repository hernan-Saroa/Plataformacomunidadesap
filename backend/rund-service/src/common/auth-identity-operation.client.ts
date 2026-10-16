import { ConflictException, Injectable, Module, ServiceUnavailableException } from '@nestjs/common';
import { identityWriteCommand, identityWriteFingerprint, IdentityWriteCommand } from './auth-identity-command';

export interface AuthIdentityWriteResult {
  personaId: string; usuarioId: string; usuarioCreado: boolean; camposModificados: string[];
  cambios: Record<string,{anterior:string|null;nuevo:string|null}>;
}

export interface AuthIdentityOperation {
  operacionId: string; version: 1; huellaComando: string; estado: 'REGISTRADA' | 'CANCELADA' | 'APLICADA';
  registradaEn: string; canceladaEn: string | null; identidadAplicada: boolean;
  aplicadaEn?: string; resultado?: AuthIdentityWriteResult;
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
const fingerprint = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const timestamp = (v: unknown) => typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v));
const fields=['tip_identificacion','nom_largo','nom_tercero','pri_apellido','seg_apellido','gen_tercero','fec_nacimiento','dir_email','tel_celular','id_seccional','username'];
function resultValid(v:unknown):boolean {
  if (!record(v)||Object.keys(v).length!==5||!uuid(v.personaId)||!uuid(v.usuarioId)||typeof v.usuarioCreado!=='boolean'
    ||!Array.isArray(v.camposModificados)||!v.camposModificados.every(f=>typeof f==='string'&&fields.includes(f))
    ||new Set(v.camposModificados).size!==v.camposModificados.length||!record(v.cambios)
    ||Object.keys(v.cambios).length!==v.camposModificados.length) return false;
  return v.camposModificados.every(field=>{const value=v.cambios[field];return record(value)&&Object.keys(value).length===2
    &&['anterior','nuevo'].every(key=>Object.prototype.hasOwnProperty.call(value,key)&&(value[key]===null||typeof value[key]==='string'));});
}

/** Contrato preparatorio; no está conectado al escritor activo ni reintenta escrituras automáticamente. */
@Injectable()
export class AuthIdentityOperationClient {
  private async request(id: string, method: 'GET' | 'POST', suffix: string, body?: unknown, expectedHash?: string): Promise<AuthIdentityOperation | null> {
    try {
      if (!uuid(id) || (method === 'POST' && !fingerprint(expectedHash))) throw new Error();
      const canonicalId = id.toLowerCase();
      const token = (process.env.AUTH_INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '').trim();
      if (!token) throw new Error();
      const url = new URL(process.env.AUTH_SERVICE_URL || 'http://auth-service:3001');
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error();
      url.pathname = url.pathname.replace(/\/$/, '') + '/internal/rund/v1/personas/escritura/operaciones' + suffix;
      const response = await fetch(url.toString(), { method, redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { 'x-internal-service-token': token, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}) });
      if (response.status === 409 && method === 'POST') throw new ConflictException('La operación de identidad corresponde a otro comando.');
      if (!response.ok) throw new Error();
      const raw: unknown = await response.json();
      if (!record(raw) || ('success' in raw && raw.success !== true)) throw new Error();
      const data = 'data' in raw ? raw.data : raw;
      if (!record(data)) throw new Error();
      if (method === 'GET') {
        if (!record(data.consulta) || Object.keys(data.consulta).length !== 1 || data.consulta.operacionId !== canonicalId
          || typeof data.encontrada !== 'boolean') throw new Error();
        if (data.encontrada === false) {
          if (data.operacion !== null) throw new Error();
          return null;
        }
      }
      const op = data.operacion;
      if (!record(op) || Object.keys(op).length !== (op.estado==='APLICADA'?9:7) || op.operacionId !== canonicalId || op.version !== 1
        || !fingerprint(op.huellaComando) || (expectedHash !== undefined && op.huellaComando !== expectedHash)
        || !timestamp(op.registradaEn)
        || (op.estado==='APLICADA' ? op.identidadAplicada!==true||op.canceladaEn!==null||!timestamp(op.aplicadaEn)||!resultValid(op.resultado)
          : op.identidadAplicada!==false||(op.estado==='REGISTRADA'?op.canceladaEn!==null:op.estado!=='CANCELADA'||!timestamp(op.canceladaEn)))
        || (suffix.endsWith('/aplicar') && op.estado!=='APLICADA')
        || (suffix.endsWith('/cancelar') && op.estado !== 'CANCELADA')) throw new Error();
      return op as unknown as AuthIdentityOperation;
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new ServiceUnavailableException('No fue posible confirmar la intención de escritura en Auth.');
    }
  }

  registrar(operacionId: string, huellaComando: string): Promise<AuthIdentityOperation> {
    return this.request(operacionId, 'POST', '', { version: 1, operacionId: String(operacionId).toLowerCase(), huellaComando }, huellaComando) as Promise<AuthIdentityOperation>;
  }
  consultar(operacionId: string): Promise<AuthIdentityOperation | null> {
    return this.request(operacionId, 'GET', '/' + encodeURIComponent(String(operacionId).toLowerCase()));
  }
  cancelar(operacionId: string, huellaComando: string): Promise<AuthIdentityOperation> {
    return this.request(operacionId, 'POST', '/' + encodeURIComponent(String(operacionId).toLowerCase()) + '/cancelar', { huellaComando }, huellaComando) as Promise<AuthIdentityOperation>;
  }
  async aplicar(operacionId:string,input:IdentityWriteCommand):Promise<AuthIdentityOperation> {
    let comando:IdentityWriteCommand;
    try {comando=identityWriteCommand(input);} catch {throw new ServiceUnavailableException('Comando de identidad incompatible.');}
    const huellaComando=identityWriteFingerprint(comando);
    return this.request(operacionId,'POST','/'+encodeURIComponent(String(operacionId).toLowerCase())+'/aplicar',{comando,huellaComando},huellaComando) as Promise<AuthIdentityOperation>;
  }
}

@Module({ providers: [AuthIdentityOperationClient], exports: [AuthIdentityOperationClient] })
export class AuthIdentityOperationModule {}
