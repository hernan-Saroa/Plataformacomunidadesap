import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataSource } from 'typeorm';
import { AuthIdentityRequestService } from './auth-identity-request.service';
import { AuthIdentityCoordinationService } from './auth-identity-coordination.service';
import { AuthIdentityValidationClient } from './auth-identity-validation.client';
import { RundCatalogosClient } from './rund-catalogos.client';
import { identityWriteFingerprint } from './auth-identity-command';
import { nativeBusinessContext, nativeBusinessFingerprint, restoreNativeBusinessContext } from '../modules/banco-docentes/rund-native-business-context';
import { findTerritorialMatch, normalizeBancoDocentePayload, normalizePhoneForAuth, validateManualBancoDocentePayload, validatePayload } from '../modules/banco-docentes/banco-docentes.service';

export interface ManualEntryActor { actorId:string; roles:string[]; fullAccess:boolean; ip?:string }
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);

/** Captura/prevalidación únicamente: jamás aplica identidad, confirma perfil o envía correo. */
@Injectable()
export class AuthIdentityManualEntryService {
  constructor(private readonly db:DataSource,private readonly requests:AuthIdentityRequestService,
    private readonly coordination:AuthIdentityCoordinationService,private readonly validation:AuthIdentityValidationClient,
    private readonly catalogos:RundCatalogosClient) {}
  private ids(request:unknown,actor:unknown) {
    if(!uuid(request)||!uuid(actor))throw new BadRequestException('Solicitud manual invalida.');
    return {request:request.toLowerCase(),actor:actor.toLowerCase()};
  }
  private form(raw:unknown) {
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||![Object.prototype,null].includes(Object.getPrototypeOf(raw)))
      throw new BadRequestException('Formulario manual invalido.');
    const result:Record<string,any>={},keys=Object.keys(raw).sort();
    if(!keys.length||keys.length>150)throw new BadRequestException('Formulario manual invalido.');
    for(const key of keys) {
      const canonical=key.replace(/[^a-z0-9]/gi,'').toLowerCase(),value=(raw as any)[key];
      if(/^(?:actorid|cargadopor|canalorigen|options|audit|identity|comandoauth|intencionid|operacionauthid|territorialid|idseccional|rundsensitiveaccess|roles|permissions|password|passwordhash|authorization|cookie|jwt|otp|token|tokenacceso|constructor|prototype|proto)$/.test(canonical)
        ||/password|token|authorization|cookie|jwt|otp|secret/.test(canonical)
        ||key.includes('\0')||!(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))
        ||typeof value==='string'&&value.includes('\0'))throw new BadRequestException('El formulario contiene campos no admitidos.');
      result[key]=value;
    }
    const json=JSON.stringify(result);
    if(Buffer.byteLength(json,'utf8')>512*1024)throw new BadRequestException('Formulario manual demasiado grande.');
    return {value:result,hash:createHash('sha256').update(json).digest('hex')};
  }
  private async row(request:string,actor:string) {
    return (await this.db.query('SELECT * FROM rund.identidad_solicitud WHERE actor_id=$1 AND solicitud_id=$2',[actor,request]))[0];
  }
  private async abierta(request:string,actor:string) {
    const rows=await this.db.query('SELECT 1 FROM rund.identidad_abandono_manual WHERE actor_id=$1 AND solicitud_id=$2',[actor,request]);
    if(rows.length)throw new ConflictException('La solicitud esta abandonada y no puede reactivarse.');
  }
  async consultar(requestId:string,actorId:string) {
    const ids=this.ids(requestId,actorId),row=await this.row(ids.request,ids.actor);
    if(!row)throw new NotFoundException('Solicitud manual no registrada para este actor.');
    return {...await this.requests.consultar(ids.request,ids.actor),entradaCapturada:!!row.entrada_manual};
  }
  async preparar(requestId:string,actor:ManualEntryActor,raw:unknown) {
    const ids=this.ids(requestId,actor?.actorId),form=this.form(raw);await this.abierta(ids.request,ids.actor);
    const existing=await this.row(ids.request,ids.actor);
    if(existing) {
      if(existing.huella_formulario!==form.hash)throw new ConflictException('La solicitud ya tiene otro formulario o carece de captura original.');
      return this.complete(existing);
    }
    const {commandHash,contextHash,envelope}=await this.proposal(ids.actor,actor,form);
    await this.db.transaction(async manager=>{
      await manager.query("SET LOCAL lock_timeout='5s'");
      await manager.query(`INSERT INTO rund.identidad_solicitud(actor_id,solicitud_id,huella_comando,huella_contexto,huella_formulario,entrada_manual)
        VALUES ($1,$2,$3,$4,$5,$6::jsonb) ON CONFLICT (actor_id,solicitud_id) DO NOTHING`,
        [ids.actor,ids.request,commandHash,contextHash,form.hash,JSON.stringify(envelope)]);
    });
    const stored=await this.row(ids.request,ids.actor);
    if(!stored)throw new ServiceUnavailableException('RUND no confirmo la captura manual.');
    if(stored.huella_formulario!==form.hash)throw new ConflictException('La solicitud ya tiene otro formulario confirmado.');
    return this.complete(stored);
  }
  /** Solo servidor: misma propuesta que preparar, sin leer/reservar solicitud o escribir. */
  async proponer(actor:ManualEntryActor,raw:unknown) {
    if(!uuid(actor?.actorId))throw new BadRequestException('Operador manual invalido.');
    return this.proposal(actor.actorId.toLowerCase(),actor,this.form(raw));
  }
  private async proposal(actorId:string,actor:ManualEntryActor,form:ReturnType<AuthIdentityManualEntryService['form']>) {
    const payload=normalizeBancoDocentePayload(form.value);validatePayload(payload);validateManualBancoDocentePayload(payload,form.value);
    // HTTP antes de la transacción de captura. Misma selección estricta que el modal activo.
    const territorial=findTerritorialMatch(await this.catalogos.territorialesBanco(),payload.territorialNombre);
    if(!territorial?.id)throw new BadRequestException('La territorial no existe en el catalogo institucional.');
    const emailFinal=payload.correoInstitucional.toLowerCase().trim(),phoneFinal=normalizePhoneForAuth(payload.telefono),finalFullName=payload.fullName;
    const command={version:1,actorId,payload:{documentNumber:payload.documentNumber,documentType:payload.documentType,
      primer_nombre:payload.primer_nombre||null,primer_apellido:payload.primer_apellido||null,segundo_apellido:payload.segundo_apellido||null,
      genero:payload.genero,fechaNacimiento:payload.fechaNacimiento.toISOString().slice(0,10)},options:{relaxValidation:false,preserveTerritorial:false},
      territorial:{id:territorial.id},emailFinal,phoneFinal,finalFullName};
    const input={payload,rawPayload:{...form.value,canal_origen:'MODAL',cargadoPor:actorId},
      options:{rejectExisting:true,audit:{actorId,canalOrigen:'MODAL',accion:'CREAR',ip:actor.ip,
        metadata:{periodoCarga:payload.periodoCarga},sensitiveAccess:{roles:[...actor.roles],fullAccess:actor.fullAccess,endpoint:'CREAR_PERFIL_RUND'}}},
      territorial,emailFinal,phoneFinal,finalFullName};
    const context=nativeBusinessContext(command,input),commandHash=identityWriteFingerprint(context.comandoAuth),contextHash=nativeBusinessFingerprint(context);
    const envelope={version:1,formulario:form.value,contexto:context};
    if(Buffer.byteLength(JSON.stringify(envelope),'utf8')>768*1024)throw new BadRequestException('Entrada manual demasiado grande.');
    return {context,commandHash,contextHash,envelope};
  }
  async reanudar(requestId:string,actorId:string) {
    const ids=this.ids(requestId,actorId);await this.abierta(ids.request,ids.actor);
    const row=await this.row(ids.request,ids.actor);
    if(!row)throw new NotFoundException('Solicitud manual no registrada para este actor.');return this.complete(row);
  }
  /** Uso interno de servidor: valida la captura sin preparar, prevalidar o escribir. */
  async restaurarCaptura(requestId:string,actorId:string) {
    const ids=this.ids(requestId,actorId),row=await this.row(ids.request,ids.actor);
    if(!row)throw new NotFoundException('Solicitud manual no registrada para este actor.');
    return {intencionId:row.intencion_id,...this.restore(row)};
  }
  private restore(row:any) {
    if(!row.entrada_manual)throw new ConflictException('La solicitud no conserva captura manual; requiere recuperacion de servidor.');
    let context:ReturnType<typeof restoreNativeBusinessContext>,form:ReturnType<AuthIdentityManualEntryService['form']>;
    try {
      const envelope=row.entrada_manual;
      if(envelope.version!==1||Object.keys(envelope).length!==3)throw new Error();
      form=this.form(envelope.formulario);context=restoreNativeBusinessContext(envelope.contexto);
      if(form.hash!==row.huella_formulario||nativeBusinessFingerprint(context)!==row.huella_contexto
        ||identityWriteFingerprint(context.comandoAuth)!==row.huella_comando||context.comandoAuth.actorId!==row.actor_id)throw new Error();
    }catch{throw new ServiceUnavailableException('La captura manual no es coherente.');}
    return {context,form};
  }
  private async complete(row:any) {
    const {context,form}=this.restore(row);
    const prepared=await this.requests.preparar(row.solicitud_id,row.actor_id,context.comandoAuth,
      {...context.escritura,rawPayload:{...form.value,canal_origen:'MODAL',cargadoPor:row.actor_id}});
    const local=await this.coordination.consultar(row.intencion_id);
    const check=await this.validation.validar({version:1,operacionId:local.operacionAuthId,documento:context.comandoAuth.payload.documentNumber,
      correo:context.comandoAuth.emailFinal,resolverPorCorreo:false});
    if(check.resultado.conflictoCorreo)throw new ConflictException('El correo no es compatible con la identidad solicitada.');
    if(!check.resultado.rolDocenteId)throw new ServiceUnavailableException('Auth no confirma el rol docente configurado.');
    if(check.resultado.personaId) {
      const [existing]=await this.db.query('SELECT id FROM rund."Docente" WHERE "personaId"=$1 AND "periodoCarga"=$2 LIMIT 1',
        [check.resultado.personaId,context.escritura.payload.periodoCarga]);
      if(existing)throw new ConflictException('Ya existe un perfil para la identidad y periodo solicitados.');
    }
    // Observación fresca, sin persistir autorización o reservar identidad en Auth.
    return {...prepared,entradaCapturada:true,prevalidacion:{estado:'COMPATIBLE',reserva:false}};
  }
}
