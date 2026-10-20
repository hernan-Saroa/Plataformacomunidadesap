import { BadRequestException, Body, ConflictException, Controller, Get, Header, HttpCode, Injectable, NotFoundException, Param, Post, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { isDeepStrictEqual } from 'util';
import { Public } from '../auth/decorators/public.decorator';
import { RundIdentityGuard } from './rund-identity.controller';
import { RundIdentityAbortClient } from './rund-identity-abort.client';
import { identityImage, imageValues, lockIdentityEffects, restoreIdentityEffects, restoredValues, validIdentityImage } from './rund-identity-effects';

const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
type ReviewReason='SIN_PREIMAGEN'|'PREIMAGEN_INCOMPATIBLE'|'ALTA_IDENTIDAD'|'CAMBIOS_POSTERIORES'|'OTRA_OPERACION_POSTERIOR'|'CORREO_REUTILIZADO';

@Injectable()
export class RundIdentityCompensationService {
  constructor(private readonly db:DataSource,private readonly config:ConfigService,private readonly rund:RundIdentityAbortClient) {}
  private id(value:string) {if(!uuid(value))throw new BadRequestException('Operacion de compensacion invalida.');return value.toLowerCase();}
  private enabled() {
    if(String(this.config.get('RUND_IDENTITY_COMPENSATION_ENABLED')||'').toLowerCase()!=='true')
      throw new ServiceUnavailableException('Compensacion propietaria de identidad no habilitada.');
  }
  private dto(row:any) {
    return {version:1,operacionId:row.operacion_id,intencionId:row.intencion_id,huellaComando:row.huella_comando,
      estado:row.estado,motivo:row.motivo,resueltaEn:new Date(row.resuelta_en).toISOString(),identidadRevertida:row.estado==='COMPENSADA'};
  }
  async consultar(value:string) {
    this.enabled();const id=this.id(value);
    const [row]=await this.db.query('SELECT * FROM auth.rund_identidad_compensacion WHERE operacion_id=$1',[id]);
    return {consulta:{operacionId:id},encontrada:!!row,resolucion:row?this.dto(row):null};
  }
  private compatible(row:any,intencionId:string,hash:string) {
    if(row.intencion_id!==intencionId||row.huella_comando!==hash)throw new ConflictException('La resolucion pertenece a otra intencion.');
    return {resolucion:this.dto(row)};
  }
  private applied(op:any,hash:string) {
    if(!op)throw new NotFoundException('Operacion de identidad no registrada.');
    if(op.estado!=='APLICADA'||op.huella_comando!==hash)throw new ConflictException('La operacion no admite compensacion aplicada.');
  }
  async compensar(value:string,raw:unknown) {
    this.enabled();const id=this.id(value),body=raw as any;
    if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==2
      ||!uuid(body.intencionId)||typeof body.huellaComando!=='string'||!/^[a-f0-9]{64}$/.test(body.huellaComando))
      throw new BadRequestException('Solicitud de compensacion invalida.');
    const intencionId=body.intencionId.toLowerCase(),hash=body.huellaComando;
    const [initial]=await this.db.query('SELECT * FROM auth.rund_identidad_operacion WHERE operacion_id=$1',[id]);
    this.applied(initial,hash);
    const [known]=await this.db.query('SELECT * FROM auth.rund_identidad_compensacion WHERE operacion_id=$1',[id]);
    if(known)return this.compatible(known,intencionId,hash);
    // El aborto es irreversible; verificarlo antes de abrir bloqueos Auth evita HTTP dentro de su transaccion.
    const proof=await this.rund.consultar(intencionId,id,hash);
    return this.db.transaction(async manager=>{
      await manager.query("SET LOCAL lock_timeout='5s'");
      await manager.query('SELECT pg_advisory_xact_lock($1,$2)',[7184,63]);
      const [op]=await manager.query('SELECT * FROM auth.rund_identidad_operacion WHERE operacion_id=$1 FOR UPDATE',[id]);
      this.applied(op,hash);
      const [resolution]=await manager.query('SELECT * FROM auth.rund_identidad_compensacion WHERE operacion_id=$1',[id]);
      if(resolution)return this.compatible(resolution,intencionId,hash);
      const [effect]=await manager.query('SELECT * FROM auth.rund_identidad_efecto WHERE operacion_id=$1',[id]);
      const finish=async(reason:ReviewReason|null)=>{
        const [row]=await manager.query(`INSERT INTO auth.rund_identidad_compensacion
          (operacion_id,intencion_id,huella_comando,estado,motivo,prueba_aborto) VALUES ($1,$2,$3,$4,$5,$6::jsonb) RETURNING *`,
          [id,intencionId,hash,reason?'REVISION_REQUERIDA':'COMPENSADA',reason,JSON.stringify(proof)]);
        if(!row)throw new Error('Auth no confirmo la resolucion propietaria.');
        return {resolucion:this.dto(row)};
      };
      if(!effect)return finish('SIN_PREIMAGEN');
      const before=effect.preimagen,after=effect.postimagen;
      if(effect.version!==1||effect.huella_comando!==hash||!validIdentityImage(before)||!validIdentityImage(after)
        ||effect.persona_id!==op.resultado?.personaId||effect.usuario_id!==op.resultado?.usuarioId
        ||after.persona?.id!==effect.persona_id||!after.usuarios.some(u=>u.id===effect.usuario_id)
        ||(before.persona&&before.persona.id!==effect.persona_id)
        ||before.usuarios.some(u=>!after.usuarios.some(a=>a.id===u.id))
        ||before.roles.some(r=>!after.roles.some(a=>a.usuarioId===r.usuarioId&&a.rolId===r.rolId)))return finish('PREIMAGEN_INCOMPATIBLE');
      // No se elimina una identidad nueva: puede haber sido consumida por otro propietario sin FK local.
      if(!before.persona||op.resultado.usuarioCreado||!before.usuarios.some(u=>u.id===effect.usuario_id)
        ||before.usuarios.length!==after.usuarios.length)return finish('ALTA_IDENTIDAD');
      await lockIdentityEffects(manager);
      const [later]=await manager.query('SELECT 1 FROM auth.rund_identidad_efecto WHERE persona_id=$1 AND orden>$2 LIMIT 1',[effect.persona_id,effect.orden]);
      if(later)return finish('OTRA_OPERACION_POSTERIOR');
      const current=await identityImage(manager,effect.persona_id);
      if(!isDeepStrictEqual(current,after))return finish('CAMBIOS_POSTERIORES');
      const emails=[before.persona.datos.dir_email,...before.usuarios.map(u=>u.datos.username)]
        .filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim().toLowerCase());
      const [conflict]=await manager.query(`SELECT 1 FROM (
        SELECT id_person AS owner,LOWER(BTRIM(dir_email)) AS correo FROM auth.personas
        UNION ALL SELECT id_person AS owner,LOWER(BTRIM(username)) AS correo FROM auth."user"
        ) claims WHERE correo=ANY($1::text[]) AND (owner IS NULL OR owner<>$2::uuid) LIMIT 1`,[emails,effect.persona_id]);
      if(conflict)return finish('CORREO_REUTILIZADO');
      await restoreIdentityEffects(manager,before,after);
      if(!isDeepStrictEqual(restoredValues(await identityImage(manager,effect.persona_id)),restoredValues(before)))
        throw new Error('Auth no confirmo la restauracion completa de los efectos propios.');
      return finish(null);
    });
  }
}

@Public()
@UseGuards(RundIdentityGuard)
@Controller('internal/rund/v1/personas/escritura/operaciones')
export class RundIdentityCompensationController {
  constructor(private readonly identities:RundIdentityCompensationService) {}
  @Post(':operacionId/compensar')
  @HttpCode(200)
  @Header('Cache-Control','private, no-store')
  compensar(@Param('operacionId') id:string,@Body() raw:unknown) {return this.identities.compensar(id,raw);}
  @Get(':operacionId/compensacion')
  @Header('Cache-Control','private, no-store')
  consultar(@Param('operacionId') id:string) {return this.identities.consultar(id);}
}
