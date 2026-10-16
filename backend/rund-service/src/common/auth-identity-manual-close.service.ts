import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthIdentityClient } from './auth-identity.client';
import { AuthIdentityManualEntryService } from './auth-identity-manual-entry.service';
import { AuthIdentityExecutionService } from './auth-identity-execution.service';
import { AuthIdentityCompensationService } from './auth-identity-compensation.service';
import type { ManualExecutionActor } from './auth-identity-manual-execution.service';
import { RUND_BANK_PERMISSIONS } from '../auth/rund-permission-catalog';

const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);

/** Cierre explicito por propietario; nunca libera una revision o revierte un perfil confirmado. */
@Injectable()
export class AuthIdentityManualCloseService {
  constructor(private readonly db:DataSource,private readonly entries:AuthIdentityManualEntryService,
    private readonly execution:AuthIdentityExecutionService,private readonly compensation:AuthIdentityCompensationService,
    private readonly identities:AuthIdentityClient) {}
  private async authorize(actor:ManualExecutionActor) {
    if(!uuid(actor?.actorId)||!Number.isFinite(actor.expiresAt)||actor.expiresAt<=Date.now()/1000)
      throw new UnauthorizedException('La sesion requiere autenticacion vigente.');
    if(actor.roles.some(role=>['GESTION_PROFESORAL','SUPER_ADMIN','ADMIN'].includes(role)))return;
    let permissions:string[];
    try{permissions=await this.identities.permisosRoles(actor.roles);}catch{throw new ForbiddenException('No se pudo confirmar la autorizacion RUND vigente.');}
    if(!permissions.includes(RUND_BANK_PERMISSIONS.MANAGE))throw new ForbiddenException('El cierre requiere autorizacion RUND vigente.');
    if(actor.expiresAt<=Date.now()/1000)throw new UnauthorizedException('La sesion requiere autenticacion vigente.');
  }
  private ids(requestId:string,actor:ManualExecutionActor) {
    if(!uuid(requestId))throw new BadRequestException('Solicitud manual invalida.');
    return {id:requestId.toLowerCase(),current:{...actor,actorId:actor?.actorId?.toLowerCase(),roles:[...(actor?.roles||[])]}};
  }
  private async receipt(id:string,actorId:string) {
    const [row]=await this.db.query(`SELECT s.intencion_id,s.entrada_manual IS NOT NULL AS capturada,j.estado AS estado_auth,
      n.estado AS estado_nativo,e.decision,r.estado AS resolucion_auth,c.caso_id
      FROM rund.identidad_solicitud s LEFT JOIN rund.identidad_operacion j USING(intencion_id)
      LEFT JOIN rund.identidad_contexto_nativo n USING(intencion_id) LEFT JOIN rund.identidad_ejecucion e USING(intencion_id)
      LEFT JOIN rund.identidad_resolucion_auth r USING(intencion_id) LEFT JOIN rund.identidad_revision c USING(intencion_id)
      WHERE s.actor_id=$1 AND s.solicitud_id=$2`,[actorId,id]);
    if(!row)throw new NotFoundException('Solicitud no registrada para este actor.');
    if(!row.capturada||!row.estado_auth)throw new ConflictException('El cierre requiere una captura y operacion de identidad; consulte el abandono.');
    const confirmed=row.estado_nativo==='CONFIRMADA',aborted=row.decision==='ABORTADA';
    const closed=aborted&&row.estado_nativo==='PREPARADA'&&(row.estado_auth==='CANCELADA'||row.resolucion_auth==='COMPENSADA');
    const review=aborted&&row.estado_nativo==='PREPARADA'&&row.resolucion_auth==='REVISION_REQUERIDA';
    if(!uuid(row.intencion_id)||!['PREPARADA','AUTH_REGISTRADA','AUTH_APLICADA','CANCELADA'].includes(row.estado_auth)
      ||![null,undefined,'PREPARADA','CONFIRMADA'].includes(row.estado_nativo)||![null,undefined,'EN_CURSO','ABORTADA'].includes(row.decision)
      ||![null,undefined,'COMPENSADA','REVISION_REQUERIDA'].includes(row.resolucion_auth)
      ||review&&!uuid(row.caso_id)||row.resolucion_auth&&(!aborted||row.estado_auth!=='AUTH_APLICADA'||row.estado_nativo!=='PREPARADA')
      ||aborted&&row.estado_nativo!=='PREPARADA'||confirmed&&(row.estado_auth!=='AUTH_APLICADA'||row.decision!=='EN_CURSO'))
      throw new ServiceUnavailableException('RUND no confirma el estado de cierre completo.');
    return {solicitudId:id,intencionId:row.intencion_id,estado:confirmed?'CONFIRMADA':closed?'CERRADA':review?'REVISION_REQUERIDA':aborted?'ABORTADA':'PENDIENTE',
      estadoAuth:row.estado_auth,decisionNativa:row.decision||null,estadoNativo:row.estado_nativo||null,
      resolucionAuth:row.resolucion_auth||null,casoRevisionId:review?row.caso_id:null,puedeIniciarOtra:closed};
  }
  async consultar(requestId:string,actor:ManualExecutionActor) {
    const {id,current}=this.ids(requestId,actor);await this.authorize(current);
    const result=await this.receipt(id,current.actorId);await this.authorize(current);return result;
  }
  async cerrar(requestId:string,actor:ManualExecutionActor) {
    const {id,current}=this.ids(requestId,actor);await this.authorize(current);
    const initial=await this.receipt(id,current.actorId);
    if(initial.estado==='CONFIRMADA')throw new ConflictException('El perfil ya esta confirmado; consulte el resultado de la solicitud.');
    if(initial.estado==='CERRADA'||initial.estado==='REVISION_REQUERIDA'){
      await this.authorize(current);return initial;
    }
    const stored=await this.entries.restaurarCaptura(id,current.actorId);
    if(stored.intencionId!==initial.intencionId)throw new ConflictException('La captura no corresponde a la operacion.');
    if(initial.estadoNativo===null||initial.decisionNativa===null){
      await this.authorize(current);
      await this.execution.preparar(initial.intencionId,stored.context.comandoAuth,stored.context.escritura);
    }
    let local=await this.execution.consultar(initial.intencionId);
    if(local.estadoNativo==='CONFIRMADA')throw new ConflictException('El perfil ya esta confirmado; consulte el resultado de la solicitud.');
    if(local.decisionNativa!=='ABORTADA'){
      await this.authorize(current);await this.execution.abortar(initial.intencionId,'CANCELACION_SOLICITUD');
    }
    await this.authorize(current);
    local=await this.execution.resolverAbortoConControles(initial.intencionId,()=>this.authorize(current));
    if(local.estadoAuth==='AUTH_APLICADA'){
      await this.authorize(current);
      await this.compensation.resolverConControles(initial.intencionId,()=>this.authorize(current));
    }
    const result=await this.receipt(id,current.actorId);await this.authorize(current);
    if(!['CERRADA','REVISION_REQUERIDA'].includes(result.estado))throw new ServiceUnavailableException('RUND aun no confirma el cierre de la solicitud.');
    return result;
  }
}
