import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthIdentityClient } from './auth-identity.client';
import type { ManualExecutionActor } from './auth-identity-manual-execution.service';
import { RUND_BANK_PERMISSIONS } from '../auth/rund-permission-catalog';

const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);

/** Abandono local sin operación Auth reservada; jamás aborta, cancela o compensa identidad. */
@Injectable()
export class AuthIdentityManualAbandonService {
  constructor(private readonly db:DataSource,private readonly identities:AuthIdentityClient) {}
  private async authorize(actor:ManualExecutionActor) {
    if(!uuid(actor?.actorId)||!Number.isFinite(actor.expiresAt)||actor.expiresAt<=Date.now()/1000)
      throw new UnauthorizedException('La sesion requiere autenticacion vigente.');
    if(actor.roles.some(role=>['GESTION_PROFESORAL','SUPER_ADMIN','ADMIN'].includes(role)))return;
    let permissions:string[];
    try{permissions=await this.identities.permisosRoles(actor.roles);}catch{throw new ForbiddenException('No se pudo confirmar la autorizacion RUND vigente.');}
    if(!permissions.includes(RUND_BANK_PERMISSIONS.MANAGE))throw new ForbiddenException('El abandono requiere autorizacion RUND vigente.');
    if(actor.expiresAt<=Date.now()/1000)throw new UnauthorizedException('La sesion requiere autenticacion vigente.');
  }
  private ids(requestId:string,actor:ManualExecutionActor) {
    if(!uuid(requestId))throw new BadRequestException('Solicitud manual invalida.');
    return {id:requestId.toLowerCase(),current:{...actor,actorId:actor?.actorId?.toLowerCase(),roles:[...(actor?.roles||[])]}};
  }
  private async receipt(id:string,actorId:string) {
    const [row]=await this.db.query('SELECT solicitud_id FROM rund.identidad_abandono_manual WHERE actor_id=$1 AND solicitud_id=$2',[actorId,id]);
    if(!row)throw new NotFoundException('Abandono no registrado para este actor.');
    return {solicitudId:id,estado:'ABANDONADA' as const,puedeIniciarOtra:true as const};
  }
  async consultar(requestId:string,actor:ManualExecutionActor) {
    const {id,current}=this.ids(requestId,actor);await this.authorize(current);
    const result=await this.receipt(id,current.actorId);await this.authorize(current);return result;
  }
  async abandonar(requestId:string,actor:ManualExecutionActor) {
    const {id,current}=this.ids(requestId,actor);await this.authorize(current);
    try{
      await this.db.transaction(async manager=>{
        await manager.query("SET LOCAL lock_timeout='5s'");
        // La migración 015 excluye atómicamente captura/reserva tardías bajo el mismo ID.
        await manager.query(`INSERT INTO rund.identidad_abandono_manual(actor_id,solicitud_id)
          VALUES ($1,$2) ON CONFLICT (actor_id,solicitud_id) DO NOTHING`,[current.actorId,id]);
      });
    }catch(error){
      if(['P7601','P7602'].includes((error as any)?.driverError?.code||(error as any)?.code))
        throw new ConflictException('La solicitud ya avanzo o esta abandonada; consulte su estado antes de continuar.');
      throw error;
    }
    // Si se perdió permiso después del commit, conservar el ID y recuperar el recibo con otra sesión válida.
    const result=await this.receipt(id,current.actorId);await this.authorize(current);return result;
  }
}
