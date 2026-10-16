import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthIdentityClient } from './auth-identity.client';
import { AuthIdentityExecutionService } from './auth-identity-execution.service';
import { AuthIdentityManualEntryService, ManualEntryActor } from './auth-identity-manual-entry.service';
import { RUND_BANK_PERMISSIONS } from '../auth/rund-permission-catalog';

export interface ManualExecutionActor extends ManualEntryActor { expiresAt:number }
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);

/** Ejecucion explicita por solicitud y actor. No compensa/aborta automaticamente ni envia correo. */
@Injectable()
export class AuthIdentityManualExecutionService {
  constructor(private readonly db:DataSource,private readonly entries:AuthIdentityManualEntryService,
    private readonly execution:AuthIdentityExecutionService,private readonly identities:AuthIdentityClient) {}

  private async authorize(actor:ManualExecutionActor) {
    if(!uuid(actor?.actorId)||!Number.isFinite(actor.expiresAt)||actor.expiresAt<=Date.now()/1000)
      throw new UnauthorizedException('La sesion requiere autenticacion vigente.');
    if(actor.roles.some(role=>['GESTION_PROFESORAL','SUPER_ADMIN','ADMIN'].includes(role)))return;
    let permissions:string[];
    try{permissions=await this.identities.permisosRoles(actor.roles);}catch{throw new ForbiddenException('No se pudo confirmar la autorizacion RUND vigente.');}
    if(!permissions.includes(RUND_BANK_PERMISSIONS.MANAGE))throw new ForbiddenException('La ejecucion requiere autorizacion RUND vigente.');
    // El permiso HTTP puede haber tardado: no aceptar una sesion que vencio durante la consulta.
    if(actor.expiresAt<=Date.now()/1000)throw new UnauthorizedException('La sesion requiere autenticacion vigente.');
  }
  async consultar(requestId:string,actorId:string) {
    if(!uuid(requestId)||!uuid(actorId))throw new BadRequestException('Solicitud de ejecucion invalida.');
    const [row]=await this.db.query(`SELECT s.solicitud_id,s.intencion_id,s.entrada_manual IS NOT NULL AS capturada,
      e.decision,j.estado AS estado_auth,n.estado AS estado_nativo,n.docente_id,
      to_char(n.confirmada_en AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS confirmada_en
      FROM rund.identidad_solicitud s LEFT JOIN rund.identidad_operacion j USING(intencion_id)
      LEFT JOIN rund.identidad_contexto_nativo n USING(intencion_id) LEFT JOIN rund.identidad_ejecucion e USING(intencion_id)
      WHERE s.actor_id=$1 AND s.solicitud_id=$2`,[actorId.toLowerCase(),requestId.toLowerCase()]);
    if(!row)throw new NotFoundException('Solicitud no registrada para este actor.');
    if(!row.capturada)throw new ConflictException('La solicitud no conserva captura manual.');
    const confirmed=row.estado_nativo==='CONFIRMADA';
    if(confirmed&&(!row.docente_id||!row.confirmada_en))throw new ServiceUnavailableException('RUND no confirma el recibo nativo completo.');
    return {solicitudId:row.solicitud_id,intencionId:row.intencion_id,
      estado:confirmed?'CONFIRMADA':row.decision==='ABORTADA'?'ABORTADA':'PENDIENTE',
      decisionNativa:row.decision||null,estadoAuth:row.estado_auth||null,estadoNativo:row.estado_nativo||null,
      docenteId:confirmed?row.docente_id:null,confirmadaEn:confirmed?row.confirmada_en:null,correo:'PENDIENTE'};
  }
  async ejecutar(requestId:string,actor:ManualExecutionActor) {
    const current={...actor,actorId:actor?.actorId?.toLowerCase(),roles:[...(actor?.roles||[])]};
    await this.authorize(current);
    const initial=await this.consultar(requestId,current.actorId);
    if(initial.estado==='CONFIRMADA')return initial;
    if(initial.estado==='ABORTADA')throw new ConflictException('La solicitud esta abortada y no se puede reactivar.');
    try {
      await this.entries.reanudar(requestId,current.actorId);
      await this.execution.ejecutarConControles(initial.intencionId,()=>this.authorize(current));
    }catch(error) {
      // Otra instancia puede confirmar mientras prevalidabamos o se perdio una respuesta.
      await this.authorize(current);
      const latest=await this.consultar(requestId,current.actorId);
      if(latest.estado==='CONFIRMADA')return latest;
      throw error;
    }
    await this.authorize(current);
    const result=await this.consultar(requestId,current.actorId);
    if(result.estado!=='CONFIRMADA')throw new ServiceUnavailableException('RUND aun no confirma el perfil de esta solicitud.');
    return result;
  }
}
