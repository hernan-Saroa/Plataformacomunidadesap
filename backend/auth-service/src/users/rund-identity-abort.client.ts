import { ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface IdentityAbortProof {
  version:1;intencionId:string;operacionAuthId:string;huellaComando:string;huellaContexto:string;
  decisionNativa:'ABORTADA';estadoNativo:'PREPARADA';abortadaEn:string;motivoAborto:'FALLO_NEGOCIO'|'CANCELACION_SOLICITUD';
}
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);

/** Auth consulta el hecho al propietario RUND; nunca confia en una prueba aportada por el body. */
@Injectable()
export class RundIdentityAbortClient {
  constructor(private readonly config:ConfigService) {}
  async consultar(intencionId:string,operacionAuthId:string,huellaComando:string):Promise<IdentityAbortProof> {
    try {
      if(!uuid(intencionId)||!uuid(operacionAuthId)||!/^[a-f0-9]{64}$/.test(huellaComando))throw new Error();
      const token=String(this.config.get('INTERNAL_SERVICE_TOKEN')||'').trim();
      if(!token)throw new Error();
      const url=new URL(String(this.config.get('RUND_SERVICE_URL')||''));
      if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw new Error();
      url.pathname=url.pathname.replace(/\/$/,'')+'/internal/rund/v1/identidad/intenciones/'+encodeURIComponent(intencionId.toLowerCase())+'/aborto';
      const response=await fetch(url.toString(),{method:'GET',redirect:'error',signal:AbortSignal.timeout(10000),
        headers:{'x-internal-service-token':token,Accept:'application/json'}});
      if(response.status===409)throw new ConflictException('RUND no confirma un aborto sin commit.');
      if(!response.ok)throw new Error();
      const raw:unknown=await response.json();
      if(!record(raw)||('success'in raw&&raw.success!==true))throw new Error();
      const data='data'in raw?raw.data:raw;
      if(!record(data)||Object.keys(data).length!==1||!record(data.pruebaAborto))throw new Error();
      const proof=data.pruebaAborto;
      if(Object.keys(proof).length!==9||proof.version!==1||proof.intencionId!==intencionId.toLowerCase()
        ||proof.operacionAuthId!==operacionAuthId.toLowerCase()||proof.huellaComando!==huellaComando
        ||typeof proof.huellaContexto!=='string'||!/^[a-f0-9]{64}$/.test(proof.huellaContexto)
        ||proof.decisionNativa!=='ABORTADA'||proof.estadoNativo!=='PREPARADA'||typeof proof.abortadaEn!=='string'
        ||!/^\d{4}-\d\d-\d\dT/.test(proof.abortadaEn)||!Number.isFinite(Date.parse(proof.abortadaEn))
        ||typeof proof.motivoAborto!=='string'||!['FALLO_NEGOCIO','CANCELACION_SOLICITUD'].includes(proof.motivoAborto))throw new Error();
      return proof as unknown as IdentityAbortProof;
    }catch(error){
      if(error instanceof ConflictException)throw error;
      throw new ServiceUnavailableException('No fue posible verificar el aborto durable en RUND.');
    }
  }
}
