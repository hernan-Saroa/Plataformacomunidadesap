import { BadRequestException, ConflictException, Injectable, Module, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { identityWriteFingerprint } from './auth-identity-command';
import { AuthIdentityExecutionModule, AuthIdentityExecutionService } from './auth-identity-execution.service';
import { nativeBusinessContext, nativeBusinessFingerprint } from '../modules/banco-docentes/rund-native-business-context';
import { normalizeBancoDocentePayload, normalizePhoneForAuth, validateManualBancoDocentePayload, validatePayload } from '../modules/banco-docentes/banco-docentes.service';
import type { RundNativeWriteInput } from '../modules/banco-docentes/rund-native-profile-write';

const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);

/** Entrada servidor preparatoria. El llamador debe autenticar/autorizar cada intento antes de invocarla. */
@Injectable()
export class AuthIdentityRequestService {
  constructor(private readonly db:DataSource,private readonly execution:AuthIdentityExecutionService) {}

  private ids(request:unknown,actor:unknown) {
    if(!uuid(request)||!uuid(actor))throw new BadRequestException('Solicitud o actor de identidad invalido.');
    return {request:request.toLowerCase(),actor:actor.toLowerCase()};
  }
  private dto(row:any) {
    return {solicitudId:row.solicitud_id,actorId:row.actor_id,intencionId:row.intencion_id,origen:row.origen,
      huellaComando:row.huella_comando,huellaContexto:row.huella_contexto,creadaEn:row.creada_en};
  }
  private async registro(request:string,actor:string) {
    const [row]=await this.db.query(`SELECT *,to_char(creada_en AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS creada_en
      FROM rund.identidad_solicitud WHERE actor_id=$1 AND solicitud_id=$2`,[actor,request]);
    if(!row)throw new NotFoundException('Solicitud de identidad no registrada para este actor.');return row;
  }
  async consultar(solicitudId:string,actorId:string) {
    const ids=this.ids(solicitudId,actorId),row=await this.registro(ids.request,ids.actor);
    // Una caída tras reservar y antes de preparar es un estado recuperable, nunca un éxito nativo.
    const [prepared]=await this.db.query(`SELECT n.intencion_id FROM rund.identidad_contexto_nativo n
      JOIN rund.identidad_ejecucion e USING(intencion_id) WHERE n.intencion_id=$1
      AND n.huella_contexto=$2 AND e.huella_contexto=$2`,[row.intencion_id,row.huella_contexto]);
    return {...this.dto(row),preparacion:prepared?'LISTA':'PENDIENTE'};
  }
  async preparar(solicitudId:string,actorId:string,command:unknown,input:Omit<RundNativeWriteInput,'identity'>) {
    const ids=this.ids(solicitudId,actorId);
    let context:ReturnType<typeof nativeBusinessContext>;
    try{context=nativeBusinessContext(command,input);}catch{throw new BadRequestException('Contexto de solicitud incompatible.');}
    const options=context.escritura.options,audit=options.audit;
    if(context.comandoAuth.actorId!==ids.actor||audit.actorId!==ids.actor||audit.canalOrigen!=='MODAL'||audit.accion!=='CREAR'
      ||!options.rejectExisting||options.bulkImport||options.relaxValidation||options.preserveTerritorial||!context.escritura.territorial?.id)
      throw new BadRequestException('La solicitud solo admite creacion manual autorizada.');
    // Mismas reglas obligatorias y estrictas del modal activo, antes de reservar IDs.
    const payload=normalizeBancoDocentePayload(input.rawPayload);
    validatePayload(payload);validateManualBancoDocentePayload(payload,input.rawPayload);
    const normalized=nativeBusinessContext(context.comandoAuth,{...input,payload});
    if(nativeBusinessFingerprint(normalized)!==nativeBusinessFingerprint(context))
      throw new BadRequestException('El contexto no coincide con el formulario normalizado.');
    const commandHash=identityWriteFingerprint(context.comandoAuth),contextHash=nativeBusinessFingerprint(context);
    const expectedCommand={...context.comandoAuth,payload:{documentNumber:payload.documentNumber,documentType:payload.documentType,
      primer_nombre:payload.primer_nombre||null,primer_apellido:payload.primer_apellido||null,segundo_apellido:payload.segundo_apellido||null,
      genero:payload.genero,fechaNacimiento:payload.fechaNacimiento?payload.fechaNacimiento.toISOString().slice(0,10):null},
      emailFinal:payload.correoInstitucional.toLowerCase().trim(),phoneFinal:normalizePhoneForAuth(payload.telefono),finalFullName:payload.fullName};
    if(identityWriteFingerprint(expectedCommand)!==commandHash)
      throw new BadRequestException('El comando Auth no coincide con el formulario normalizado.');
    // Autocommit anterior a cualquier preparación/HTTP: no se pierde el ID por rollback de negocio.
    await this.db.query(`INSERT INTO rund.identidad_solicitud(actor_id,solicitud_id,huella_comando,huella_contexto)
      VALUES ($1,$2,$3,$4) ON CONFLICT (actor_id,solicitud_id) DO NOTHING`,[ids.actor,ids.request,commandHash,contextHash]);
    const row=await this.registro(ids.request,ids.actor);
    if(row.huella_comando!==commandHash||row.huella_contexto!==contextHash)
      throw new ConflictException('La solicitud ya tiene otro contenido confirmado.');
    await this.execution.preparar(row.intencion_id,context.comandoAuth,context.escritura);
    const result=await this.consultar(ids.request,ids.actor);
    if(result.preparacion!=='LISTA')throw new ServiceUnavailableException('RUND no confirmo la preparacion de la solicitud.');
    return result;
  }
}

// Sin rutas ni import en módulos activos: no concede permisos ni ejecuta el contexto.
@Module({imports:[AuthIdentityExecutionModule],providers:[AuthIdentityRequestService],exports:[AuthIdentityRequestService]})
export class AuthIdentityRequestModule {}
