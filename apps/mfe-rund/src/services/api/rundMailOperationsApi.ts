import { apiClient } from './apiClient';
import { mailReviewPage, mailReviewQuery, type MailReviewQuery } from './rundMailReviewInboxContracts';
import { mailDiagnostic, mailOmission, mailOperationsFailure, mailReview, mailReviewClosure, mailUuid, type MailOperationsSnapshot } from './rundMailOperationsContracts';

type Transport=Pick<typeof apiClient,'get'|'post'>;
const base='/rund/api/v1/banco-docentes/identidad/correos/revisiones';
const options={retries:0,skipAuthRefresh:true,skipErrorLog:true,skipErrorToast:true,cache:'no-store' as RequestCache};
/** Cliente opcional sin caché, almacenamiento, polling o autoridad para enviar correo. */
export class RundMailOperationsClient {
  readonly actorId:string;
  private active=true;
  private readonly mutations=new Set<string>();
  constructor(actorId:string,private readonly transport:Transport=apiClient){
    if(!mailUuid(actorId))throw mailOperationsFailure();this.actorId=actorId.toLowerCase();
  }
  invalidate(){this.active=false;}
  async list(query:MailReviewQuery={},signal?:AbortSignal){
    this.check(signal);
    try{
      const filter=mailReviewQuery(query);
      const result=await this.transport.get(base,filter.params,{...options,signal});
      this.check(signal);return mailReviewPage(result,filter);
    }catch{throw mailOperationsFailure();}
  }
  private id(id:string){if(!mailUuid(id))throw mailOperationsFailure();return id.toLowerCase();}
  private check(signal?:AbortSignal){if(!this.active||signal?.aborted)throw mailOperationsFailure();}
  private async request(path:string,method:'GET'|'POST',signal?:AbortSignal):Promise<unknown>{
    this.check(signal);
    try{
      const config={...options,signal};
      const result=method==='GET'?await this.transport.get(path,undefined,config):await this.transport.post(path,{},config);
      this.check(signal);return result;
    }catch{throw mailOperationsFailure();}
  }
  private async mutate<T>(id:string,work:()=>Promise<T>):Promise<T>{
    if(this.mutations.has(id))throw mailOperationsFailure();this.mutations.add(id);
    try{return await work();}finally{this.mutations.delete(id);}
  }
  async inspect(value:string,signal?:AbortSignal):Promise<MailOperationsSnapshot>{
    const id=this.id(value);if(this.mutations.has(id))throw mailOperationsFailure();
    const omision=mailOmission(await this.request(`${base}/por-intencion/${id}/omision`,'GET',signal),id);
    if(omision.omitida)return{omision,diagnostico:null,revision:null,cierre:null};
    const diagnostico=mailDiagnostic(await this.request(`${base}/por-intencion/${id}/diagnosticar`,'POST',signal),id);
    if(!diagnostico.casoId)return{omision,diagnostico,revision:null,cierre:null};
    const caseId=diagnostico.casoId;
    const revision=mailReview(await this.request(`${base}/${caseId}`,'GET',signal),id,caseId);
    const cierre=mailReviewClosure(await this.request(`${base}/${caseId}/cierre`,'GET',signal),id,caseId);
    if(revision.estadoCorreo!==diagnostico.estadoCorreo||cierre.cerrada!==diagnostico.cierreRegistrado
      ||cierre.cerrada&&(revision.estadoCorreo!=='ENVIADO'||!revision.resultadoRegistrado||!cierre.cerradaEn||cierre.cerradaEn<revision.creadaEn
        ||revision.estado==='EN_REVISION'&&(cierre.cerradaPor!==revision.asumidaPor||!revision.asumidaEn||cierre.cerradaEn<revision.asumidaEn))
      ||diagnostico.diagnostico==='ACEPTACION_REGISTRADA'&&!revision.resultadoRegistrado)throw mailOperationsFailure();
    return{omision,diagnostico,revision,cierre};
  }
  async omit(value:string,signal?:AbortSignal){
    const id=this.id(value);return this.mutate(id,async()=>{
      const result=mailOmission(await this.request(`${base}/por-intencion/${id}/omitir-por-vigencia`,'POST',signal),id);
      if(!result.omitida||result.omitidaPor!==this.actorId)throw mailOperationsFailure();return result;
    });
  }
  async open(value:string,recordedUncertain:boolean,signal?:AbortSignal){
    const id=this.id(value);if(typeof recordedUncertain!=='boolean')throw mailOperationsFailure();return this.mutate(id,async()=>{
      const suffix=recordedUncertain?'/revisar-resultado-incierto':'';
      const result=mailReview(await this.request(`${base}/por-intencion/${id}${suffix}`,'POST',signal),id);
      if(recordedUncertain&&(result.estadoCorreo!=='INCIERTO'||!result.resultadoRegistrado))throw mailOperationsFailure();return result;
    });
  }
  async assign(value:string,caseValue:string,signal?:AbortSignal){
    const id=this.id(value),caseId=this.id(caseValue);return this.mutate(id,async()=>{
      const result=mailReview(await this.request(`${base}/${caseId}/asumir`,'POST',signal),id,caseId);
      if(result.estado!=='EN_REVISION'||result.asumidaPor!==this.actorId)throw mailOperationsFailure();return result;
    });
  }
  async close(value:string,caseValue:string,signal?:AbortSignal){
    const id=this.id(value),caseId=this.id(caseValue);return this.mutate(id,async()=>{
      const result=mailReviewClosure(await this.request(`${base}/${caseId}/cerrar`,'POST',signal),id,caseId);
      if(!result.cerrada||result.cerradaPor!==this.actorId)throw mailOperationsFailure();return result;
    });
  }
}
