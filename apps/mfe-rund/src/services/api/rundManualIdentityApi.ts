import { apiClient } from './apiClient';
import { validateManualCapture } from './rundManualIdentityCapture';
import { validateManualClose } from './rundManualIdentityClose';
import { validateManualMail } from './rundManualIdentityMail';
import { RundMailOperationsClient } from './rundMailOperationsApi';
import { manualPreviewFailure, validateManualPreview } from './rundManualIdentityPreview';

export interface ManualExecutionReceipt {
  solicitudId:string; intencionId:string; estado:'PENDIENTE'|'ABORTADA'|'CONFIRMADA';
  decisionNativa:'EN_CURSO'|'ABORTADA'|null;
  estadoAuth:'PREPARADA'|'AUTH_REGISTRADA'|'AUTH_APLICADA'|'CANCELADA'|null;
  estadoNativo:'PREPARADA'|'CONFIRMADA'|null; docenteId:string|null; confirmadaEn:string|null; correo:'PENDIENTE';
}
export interface ManualAbandonmentReceipt { solicitudId:string; estado:'ABANDONADA'; puedeIniciarOtra:true }
type Transport=Pick<typeof apiClient,'get'|'post'>;
type RequestStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
const options={retries:0,skipAuthRefresh:true,skipErrorLog:true,skipErrorToast:true,cache:'no-store' as RequestCache};
const base='/rund/api/v1/banco-docentes/identidad/solicitudes-manuales';
const failure=()=>new Error('No fue posible confirmar el estado de la solicitud RUND.');
function abandonment(raw:any,id:string):ManualAbandonmentReceipt {
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).length!==3||raw.solicitudId!==id
    ||raw.estado!=='ABANDONADA'||raw.puedeIniciarOtra!==true)throw failure();return raw;
}
function receipt(raw:any,id:string):ManualExecutionReceipt {
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).length!==9||raw.solicitudId!==id||!uuid(raw.intencionId)
    ||!['PENDIENTE','ABORTADA','CONFIRMADA'].includes(raw.estado)||!['EN_CURSO','ABORTADA',null].includes(raw.decisionNativa)
    ||!['PREPARADA','AUTH_REGISTRADA','AUTH_APLICADA','CANCELADA',null].includes(raw.estadoAuth)
    ||!['PREPARADA','CONFIRMADA',null].includes(raw.estadoNativo)||raw.correo!=='PENDIENTE')throw failure();
  if(raw.estado==='CONFIRMADA') {
    if(raw.estadoNativo!=='CONFIRMADA'||raw.decisionNativa!=='EN_CURSO'||raw.estadoAuth!=='AUTH_APLICADA'
      ||typeof raw.docenteId!=='string'||!raw.docenteId.trim()||raw.docenteId.includes('\0')||raw.docenteId.length>200
      ||typeof raw.confirmadaEn!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(raw.confirmadaEn)
      ||!Number.isFinite(Date.parse(raw.confirmadaEn))||new Date(raw.confirmadaEn).toISOString()!==raw.confirmadaEn.replace(/(\.\d{3})\d{3}Z$/,'$1Z'))throw failure();
  }else if(raw.docenteId!==null||raw.confirmadaEn!==null||raw.estadoNativo==='CONFIRMADA'
    ||(raw.estado==='ABORTADA')!==(raw.decisionNativa==='ABORTADA'))throw failure();
  return raw;
}

/** Conexión opcional al modal; el llamador activo no la proporciona. Guarda solo UUID. */
export class RundManualIdentityClient {
  private readonly key:string;
  private running:Promise<ManualExecutionReceipt>|null=null;
  private mailOperations:RundMailOperationsClient|null=null;
  constructor(private readonly actorId:string,private readonly storage:RequestStorage=window.sessionStorage,
    private readonly transport:Transport=apiClient,private readonly newUuid:()=>string=()=>crypto.randomUUID()) {
    if(!uuid(actorId))throw failure();this.key='rund:creacion-manual:'+actorId.toLowerCase();
  }
  pendiente():string|null {
    const id=this.storage.getItem(this.key);if(id!==null&&!uuid(id))throw failure();return id;
  }
  operacionesCorreo():RundMailOperationsClient {
    if(!this.mailOperations)this.mailOperations=new RundMailOperationsClient(this.actorId,this.transport);
    return this.mailOperations;
  }
  async previsualizar(formulario:Record<string,unknown>,signal?:AbortSignal) {
    try {
      if(signal?.aborted)throw manualPreviewFailure();
      // No consulta almacenamiento, genera UUID o inicia una solicitud. Copia antes del I/O.
      const body=JSON.parse(JSON.stringify({formulario}));
      const data=await this.transport.post(`${base}/previsualizar`,body,{...options,signal});
      if(signal?.aborted)throw manualPreviewFailure();
      return validateManualPreview(data);
    }catch { throw manualPreviewFailure(); }
  }
  iniciar():string {
    const current=this.pendiente();if(current)return current;
    const id=this.newUuid().toLowerCase();if(!uuid(id))throw failure();this.storage.setItem(this.key,id);return id;
  }
  private id():string {const id=this.pendiente();if(!id)throw failure();return id;}
  async preparar(formulario:Record<string,unknown>) {
    const id=this.iniciar();
    // ApiClient serializa antes de esperar HTTP: el llamador no puede cambiar el body en vuelo.
    const data:any=await this.transport.post(`${base}/${id}/preparar`,{formulario},options);
    if(!data||data.solicitudId!==id||!uuid(data.intencionId)||data.preparacion!=='LISTA'||data.entradaCapturada!==true
      ||data.prevalidacion?.estado!=='COMPATIBLE'||data.prevalidacion?.reserva!==false)throw failure();
    return data;
  }
  async reanudar() {
    const id=this.id(),data:any=await this.transport.post(`${base}/${id}/reanudar-preparacion`,{},options);
    if(!data||data.solicitudId!==id||!uuid(data.intencionId)||data.preparacion!=='LISTA'||data.entradaCapturada!==true
      ||data.prevalidacion?.estado!=='COMPATIBLE'||data.prevalidacion?.reserva!==false)throw failure();return data;
  }
  ejecutar():Promise<ManualExecutionReceipt> {
    if(this.running)return this.running;
    const id=this.id();
    const pending=this.transport.post(`${base}/${id}/ejecutar`,{},options).then(data=>{
      const result=receipt(data,id);if(result.estado!=='CONFIRMADA')throw failure();return result;
    });
    const tracked=pending.finally(()=>{if(this.running===tracked)this.running=null;});this.running=tracked;return tracked;
  }
  async consultarEjecucion():Promise<ManualExecutionReceipt> {
    const id=this.id();return receipt(await this.transport.get(`${base}/${id}/ejecucion`,undefined,options),id);
  }
  async revisarCaptura() {
    const id=this.id();return validateManualCapture(await this.transport.get(`${base}/${id}/captura`,undefined,options),id);
  }
  async abandonar():Promise<ManualAbandonmentReceipt> {
    if(this.running)throw failure();const id=this.id();
    return abandonment(await this.transport.post(`${base}/${id}/abandonar`,{},options),id);
  }
  async consultarAbandono():Promise<ManualAbandonmentReceipt> {
    const id=this.id();return abandonment(await this.transport.get(`${base}/${id}/abandono`,undefined,options),id);
  }
  async cerrarAbandonada() {
    if(this.running)throw failure();const id=this.id();
    // No admite recibos elegidos por el llamador: exige confirmación vigente del servidor.
    const confirmed=await this.consultarAbandono();
    if(this.running||this.id()!==id||confirmed.solicitudId!==id)throw failure();
    this.storage.removeItem(this.key);
  }
  async cerrarOperacion() {
    if(this.running)throw failure();const id=this.id();
    return validateManualClose(await this.transport.post(`${base}/${id}/cerrar`,{},options),id);
  }
  async consultarCierre() {
    const id=this.id();return validateManualClose(await this.transport.get(`${base}/${id}/cierre`,undefined,options),id);
  }
  async liberarCerrada() {
    if(this.running)throw failure();const id=this.id(),known=await this.consultarCierre();
    if(this.running||this.id()!==id||known.estado!=='CERRADA'||!known.puedeIniciarOtra)throw failure();
    this.storage.removeItem(this.key);
  }
  async consultarCorreo() {
    const id=this.id();
    const known=validateManualMail(await this.transport.get(`${base}/${id}/correo`,undefined,options),id);
    if(this.id()!==id)throw failure();
    return known;
  }
  cerrar(raw:ManualExecutionReceipt) {
    const id=this.id(),confirmed=receipt(raw,id);if(confirmed.estado!=='CONFIRMADA'||this.running)throw failure();
    this.storage.removeItem(this.key);
  }
}
