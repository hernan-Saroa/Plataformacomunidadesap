import { ConflictException, Injectable, Module, ServiceUnavailableException } from '@nestjs/common';

export const identityReviewReasons=['SIN_PREIMAGEN','PREIMAGEN_INCOMPATIBLE','ALTA_IDENTIDAD','CAMBIOS_POSTERIORES','OTRA_OPERACION_POSTERIOR','CORREO_REUTILIZADO'] as const;
export interface AuthIdentityResolution {
  version:1;operacionId:string;intencionId:string;huellaComando:string;estado:'COMPENSADA'|'REVISION_REQUERIDA';
  motivo:typeof identityReviewReasons[number]|null;resueltaEn:string;identidadRevertida:boolean;
}
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v:unknown,keys:string[]):v is Record<string,unknown>=>record(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(v,k));
const fingerprint=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);

/** El recibo minimo no permite importar preimagenes o datos de identidad al RUND. */
export function authIdentityResolution(raw:unknown,op:string,intention:string,hash:string):AuthIdentityResolution {
  if(!exact(raw,['version','operacionId','intencionId','huellaComando','estado','motivo','resueltaEn','identidadRevertida'])
    ||raw.version!==1||raw.operacionId!==op||raw.intencionId!==intention||raw.huellaComando!==hash
    ||typeof raw.resueltaEn!=='string'||!/^\d{4}-\d\d-\d\dT/.test(raw.resueltaEn)||!Number.isFinite(Date.parse(raw.resueltaEn))
    ||new Date(raw.resueltaEn).toISOString()!==raw.resueltaEn
    ||(raw.estado==='COMPENSADA'?raw.identidadRevertida!==true||raw.motivo!==null:
      raw.estado!=='REVISION_REQUERIDA'||raw.identidadRevertida!==false||typeof raw.motivo!=='string'||!identityReviewReasons.includes(raw.motivo as any)))
    throw new Error('Recibo de resolucion Auth incompatible.');
  return raw as unknown as AuthIdentityResolution;
}

@Injectable()
export class AuthIdentityCompensationClient {
  private async request(op:string,intention:string,hash:string,method:'GET'|'POST'):Promise<AuthIdentityResolution|null> {
    try {
      if(!uuid(op)||!uuid(intention)||!fingerprint(hash))throw new Error();
      op=op.toLowerCase();intention=intention.toLowerCase();
      const token=(process.env.AUTH_INTERNAL_SERVICE_TOKEN||process.env.INTERNAL_SERVICE_TOKEN||'').trim();
      if(!token)throw new Error();
      const url=new URL(process.env.AUTH_SERVICE_URL||'http://auth-service:3001');
      if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw new Error();
      url.pathname=url.pathname.replace(/\/$/,'')+'/internal/rund/v1/personas/escritura/operaciones/'+encodeURIComponent(op)
        +(method==='GET'?'/compensacion':'/compensar');
      const response=await fetch(url.toString(),{method,redirect:'error',signal:AbortSignal.timeout(10000),
        headers:{'x-internal-service-token':token,Accept:'application/json',...(method==='POST'?{'Content-Type':'application/json'}:{})},
        ...(method==='POST'?{body:JSON.stringify({intencionId:intention,huellaComando:hash})}:{})});
      if(method==='POST'&&response.status===409)throw new ConflictException('Auth no admite compensar esta intencion.');
      if(!response.ok)throw new Error();
      const raw:unknown=await response.json();
      if(!record(raw)||('success'in raw&&raw.success!==true))throw new Error();
      const data='data'in raw?raw.data:raw;
      if(method==='GET') {
        if(!exact(data,['consulta','encontrada','resolucion'])||!exact(data.consulta,['operacionId'])
          ||data.consulta.operacionId!==op||typeof data.encontrada!=='boolean')throw new Error();
        if(!data.encontrada) {if(data.resolucion!==null)throw new Error();return null;}
      }else if(!exact(data,['resolucion']))throw new Error();
      return authIdentityResolution((data as Record<string,unknown>).resolucion,op,intention,hash);
    }catch(error){
      if(error instanceof ConflictException)throw error;
      throw new ServiceUnavailableException('No fue posible confirmar la resolucion propietaria en Auth.');
    }
  }
  consultar(operacionId:string,intencionId:string,huella:string) {return this.request(operacionId,intencionId,huella,'GET');}
  compensar(operacionId:string,intencionId:string,huella:string) {return this.request(operacionId,intencionId,huella,'POST') as Promise<AuthIdentityResolution>;}
}

@Module({providers:[AuthIdentityCompensationClient],exports:[AuthIdentityCompensationClient]})
export class AuthIdentityCompensationClientModule {}
