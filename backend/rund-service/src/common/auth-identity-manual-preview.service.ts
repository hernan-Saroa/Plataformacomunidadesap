import { ConflictException, ForbiddenException, HttpException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { AuthIdentityManualEntryService } from './auth-identity-manual-entry.service';
import type { ManualExecutionActor } from './auth-identity-manual-execution.service';
import { AuthIdentityValidationClient } from './auth-identity-validation.client';
import { AuthIdentityClient } from './auth-identity.client';
import { RUND_BANK_PERMISSIONS } from '../auth/rund-permission-catalog';

const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);

/** Observación sin captura, journal, reserva, identidad, perfil o correo. No habilita ejecución. */
@Injectable()
export class AuthIdentityManualPreviewService {
  constructor(private readonly db:DataSource,private readonly entries:AuthIdentityManualEntryService,
    private readonly validation:AuthIdentityValidationClient,private readonly identities:AuthIdentityClient) {}
  private async authorize(actor:ManualExecutionActor){
    if(!uuid(actor.actorId)||!Number.isFinite(actor.expiresAt)||actor.expiresAt<=Date.now()/1000)
      throw new UnauthorizedException('La sesion requiere autenticacion vigente.');
    if(actor.roles.some(role=>['GESTION_PROFESORAL','SUPER_ADMIN','ADMIN'].includes(role)))return;
    let permissions:string[];
    try{permissions=await this.identities.permisosRoles(actor.roles);}catch{throw new ForbiddenException('No se pudo confirmar la autorizacion RUND vigente.');}
    if(!permissions.includes(RUND_BANK_PERMISSIONS.MANAGE))throw new ForbiddenException('La previsualizacion requiere autorizacion RUND vigente.');
    if(actor.expiresAt<=Date.now()/1000)throw new UnauthorizedException('La sesion requiere autenticacion vigente.');
  }
  async previsualizar(actor:ManualExecutionActor,raw:unknown){
    const current={...actor,actorId:typeof actor?.actorId==='string'?actor.actorId.toLowerCase():'',
      roles:Array.isArray(actor?.roles)?actor.roles.filter(role=>typeof role==='string'):[]};
    try{
      await this.authorize(current);
      const {context}=await this.entries.proponer(current,raw);
      await this.authorize(current);
      const check=await this.validation.validar({version:1,operacionId:randomUUID(),documento:context.comandoAuth.payload.documentNumber,
        correo:context.comandoAuth.emailFinal,resolverPorCorreo:false});
      await this.authorize(current);
      if(check.resultado.conflictoCorreo)throw new ConflictException('El correo no es compatible con la identidad solicitada.');
      if(!check.resultado.rolDocenteId)throw new ServiceUnavailableException('Auth no confirma el rol docente configurado.');
      if(check.resultado.personaId){
        const existing=await this.db.query('SELECT id FROM rund."Docente" WHERE "personaId"=$1 AND "periodoCarga"=$2 LIMIT 1',
          [check.resultado.personaId,context.escritura.payload.periodoCarga]);
        await this.authorize(current);
        if(existing.length)throw new ConflictException('Ya existe un perfil para la identidad y periodo solicitados.');
      }
      return {version:1,compatibilidad:'COMPATIBLE_AL_CONSULTAR',reserva:false,solicitudCreada:false,ejecucionAutorizada:false,requierePreparacion:true};
    }catch(error){if(error instanceof HttpException)throw error;throw new ServiceUnavailableException('No fue posible confirmar la previsualizacion manual.');}
  }
}
