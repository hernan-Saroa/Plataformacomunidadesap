import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AuthIdentityClient } from './auth-identity.client';
import { AuthIdentityMailValidationClient } from './auth-identity-mail-validation.client';
import type { MailReviewActor } from './auth-identity-mail-review.service';
import { identityWriteFingerprint } from './auth-identity-command';
import { nativeBusinessFingerprint, restoreNativeBusinessContext } from '../modules/banco-docentes/rund-native-business-context';
import { RUND_BANK_PERMISSIONS } from '../auth/rund-permission-catalog';

const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
const reasons = ['OPERACION_NO_ELEGIBLE','IDENTIDAD_NO_VIGENTE','CREDENCIALES_NO_VIGENTES'];
const projection = `SELECT m.intencion_id,m.estado,m.intento_id,n.contexto,n.huella_contexto,n.resultado_nativo,
  o.operacion_auth_id,o.huella_comando,rund.correo_bienvenida_elegible(m.intencion_id) AS elegible,
  x.intencion_id AS omision_id,x.version,x.motivo,x.omitida_por,
  to_char(x.omitida_en AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS fecha_omitida
  FROM rund.identidad_correo m JOIN rund.identidad_contexto_nativo n USING(intencion_id)
  JOIN rund.identidad_operacion o USING(intencion_id)
  LEFT JOIN rund.identidad_correo_omision x USING(intencion_id) WHERE m.intencion_id=$1`;

/** Omisión administrativa explícita: sin SMTP, corrección de identidad o reapertura. */
@Injectable()
export class AuthIdentityMailOmissionService {
  constructor(private readonly db: DataSource, private readonly identities: AuthIdentityClient,
    private readonly validation: AuthIdentityMailValidationClient) {}
  private actor(a: MailReviewActor): MailReviewActor {
    return {actorId:typeof a?.actorId==='string'?a.actorId.toLowerCase():'',
      roles:Array.isArray(a?.roles)?a.roles.filter(r=>typeof r==='string'):[],expiresAt:a?.expiresAt};
  }
  private id(v: unknown) { if(!uuid(v))throw new BadRequestException('Identificador de correo RUND invalido.');return v.toLowerCase(); }
  private async authorize(a: MailReviewActor) {
    if(!uuid(a.actorId)||!Number.isFinite(a.expiresAt)||a.expiresAt<=Date.now()/1000)
      throw new UnauthorizedException('La sesion requiere autenticacion vigente.');
    if(a.roles.some(r=>['GESTION_PROFESORAL','SUPER_ADMIN','ADMIN'].includes(r)))return;
    let permissions: string[];
    try{permissions=await this.identities.permisosRoles(a.roles);}catch{throw new ForbiddenException('No se pudo confirmar la autorizacion RUND vigente.');}
    if(!permissions.includes(RUND_BANK_PERMISSIONS.MANAGE))throw new ForbiddenException('La omision requiere autorizacion RUND vigente.');
    if(a.expiresAt<=Date.now()/1000)throw new UnauthorizedException('La sesion requiere autenticacion vigente.');
  }
  private async safe<T>(work:()=>Promise<T>):Promise<T> {
    try{return await work();}catch(e){if(e instanceof HttpException)throw e;throw new ServiceUnavailableException('No fue posible confirmar la omision del correo RUND.');}
  }
  private async read(manager:Pick<EntityManager,'query'>,id:string,lock=false){
    const [r]=await manager.query(projection+(lock?' FOR UPDATE OF m':''),[id]);
    if(!r)throw new NotFoundException('Aviso de correo RUND no registrado.');
    if(r.intencion_id!==id||!['PENDIENTE','ENVIANDO','ENVIADO','INCIERTO'].includes(r.estado)
      ||(r.estado==='PENDIENTE'?r.intento_id!==null:!uuid(r.intento_id)))throw new Error();
    return r;
  }
  private dto(r:any){
    const omitted=r.omision_id!==null;
    if(omitted?(r.omision_id!==r.intencion_id||r.estado!=='PENDIENTE'||r.intento_id!==null||r.version!==1
      ||!uuid(r.omitida_por)||!reasons.includes(r.motivo)||typeof r.fecha_omitida!=='string'
      ||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(r.fecha_omitida)
      ||!Number.isFinite(Date.parse(r.fecha_omitida))):[r.version,r.motivo,r.omitida_por,r.fecha_omitida].some(v=>v!==null))throw new Error();
    return{version:1 as const,intencionId:r.intencion_id,omitida:omitted,motivo:omitted?r.motivo:null,
      omitidaPor:omitted?r.omitida_por:null,omitidaEn:omitted?r.fecha_omitida:null,envioBloqueado:omitted};
  }
  async consultar(value:string,actor:MailReviewActor){
    const id=this.id(value),a=this.actor(actor);await this.authorize(a);
    return this.safe(async()=>{const result=this.dto(await this.read(this.db,id));await this.authorize(a);return result;});
  }
  async omitir(value:string,actor:MailReviewActor){
    const id=this.id(value),a=this.actor(actor);await this.authorize(a);
    return this.safe(async()=>{
      const initial=await this.read(this.db,id),previous=this.dto(initial);
      if(previous.omitida){
        if(previous.omitidaPor!==a.actorId)throw new ConflictException('El aviso ya fue omitido por otra cuenta.');
        await this.authorize(a);return previous;
      }
      if(initial.estado!=='PENDIENTE')throw new ConflictException('Un intento reservado no admite omision.');
      const context=restoreNativeBusinessContext(initial.contexto),command=context.comandoAuth;
      if(initial.elegible!==true||!uuid(initial.operacion_auth_id)||nativeBusinessFingerprint(context)!==initial.huella_contexto
        ||identityWriteFingerprint(command)!==initial.huella_comando||initial.resultado_nativo?.email!==command.emailFinal
        ||initial.resultado_nativo?.authUserCreated!==true)throw new Error();
      // Fuera de SQL; solo un rechazo propietario explícito permite esta decisión.
      const rejected=await this.validation.validar(initial.operacion_auth_id,command);
      if(rejected.version!==1||rejected.operacionId!==initial.operacion_auth_id||rejected.huellaComando!==initial.huella_comando
        ||typeof rejected.apta!=='boolean'||(rejected.apta?rejected.motivo!==null:!reasons.includes(rejected.motivo as string)))throw new Error();
      if(rejected.apta)throw new ConflictException('Auth no confirma un rechazo de vigencia para omitir.');
      await this.authorize(a);
      return this.db.transaction(async manager=>{
        await manager.query("SET LOCAL lock_timeout='5s'");
        await this.read(manager,id,true);
        // Nueva sentencia tras adquirir el bloqueo: observa una omisión concurrente ya confirmada.
        const current=await this.read(manager,id),existing=this.dto(current);
        if(existing.omitida){
          if(existing.omitidaPor!==a.actorId)throw new ConflictException('El aviso ya fue omitido por otra cuenta.');
        }else{
          if(current.estado!=='PENDIENTE'||JSON.stringify(current)!==JSON.stringify(initial))
            throw new ConflictException('El aviso cambio durante la consulta de vigencia.');
          const [saved]=await manager.query(`INSERT INTO rund.identidad_correo_omision(intencion_id,motivo,omitida_por)
            VALUES($1,$2,$3) RETURNING intencion_id`,[id,rejected.motivo,a.actorId]);
          if(saved?.intencion_id!==id)throw new Error();
        }
        const result=this.dto(await this.read(manager,id));await this.authorize(a);return result;
      });
    });
  }
}
