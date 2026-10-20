import { BadRequestException, ConflictException, Injectable, Module, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthIdentityCoordinationModule, AuthIdentityCoordinationService } from './auth-identity-coordination.service';
import { identityWriteFingerprint } from './auth-identity-command';
import { BancoDocentesService } from '../modules/banco-docentes/banco-docentes.service';
import { BancoDocentesModule } from '../modules/banco-docentes/banco-docentes.module';
import { nativeBusinessContext, nativeBusinessFingerprint, restoreNativeBusinessContext } from '../modules/banco-docentes/rund-native-business-context';
import type { RundNativeWriteInput } from '../modules/banco-docentes/rund-native-profile-write';
import { lockRundExtractionSuggestions, confirmExtractionSuggestions } from '../modules/banco-docentes/rund-extraccion-fields';

@Injectable()
export class AuthIdentityNativeCommitService {
  constructor(private readonly db:DataSource,private readonly coordination:AuthIdentityCoordinationService,private readonly banco:BancoDocentesService) {}

  private id(value:string) {
    if(typeof value!=='string'||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value))throw new BadRequestException('Intencion nativa invalida.');
    return value.toLowerCase();
  }

  async preparar(value:string,command:unknown,input:Omit<RundNativeWriteInput,'identity'>) {
    const id=this.id(value);
    let context:ReturnType<typeof nativeBusinessContext>;
    try{context=nativeBusinessContext(command,input);}catch{throw new BadRequestException('Contexto de negocio incompatible.');}
    const fingerprint=nativeBusinessFingerprint(context);
    // Todavia no hay HTTP: si falla el contexto queda una intencion sin publicar, recuperable por el mismo ID.
    const local=await this.coordination.preparar(id,context.comandoAuth);
    return this.db.transaction(async manager=>{
      await manager.query("SET LOCAL lock_timeout='5s'");
      const [journal]=await manager.query('SELECT * FROM rund.identidad_operacion WHERE intencion_id=$1 FOR UPDATE',[id]);
      if(!journal||journal.huella_comando!==local.huellaComando)throw new ConflictException('Intencion nativa incompatible.');
      const [existing]=await manager.query('SELECT * FROM rund.identidad_contexto_nativo WHERE intencion_id=$1',[id]);
      if(existing){
        if(existing.huella_contexto!==fingerprint)throw new ConflictException('La intencion ya tiene otro contexto de negocio.');
        await this.prepararDecision(manager,id,fingerprint);
        return this.dto(existing);
      }
      if(journal.estado!=='PREPARADA')throw new ConflictException('El contexto debe persistir antes de publicar la intencion en Auth.');
      const [inserted]=await manager.query(`INSERT INTO rund.identidad_contexto_nativo (intencion_id,huella_contexto,contexto)
        VALUES ($1,$2,$3::jsonb) RETURNING *`,[id,fingerprint,JSON.stringify(context)]);
      if(!inserted)throw new ServiceUnavailableException('RUND no confirmo el contexto nativo.');
      await this.prepararDecision(manager,id,fingerprint);
      return this.dto(inserted);
    });
  }

  private async prepararDecision(manager:any,id:string,fingerprint:string) {
    await manager.query(`INSERT INTO rund.identidad_ejecucion (intencion_id,huella_contexto)
      VALUES ($1,$2) ON CONFLICT (intencion_id) DO NOTHING`,[id,fingerprint]);
    const [decision]=await manager.query('SELECT * FROM rund.identidad_ejecucion WHERE intencion_id=$1',[id]);
    if(!decision||decision.huella_contexto!==fingerprint)throw new ConflictException('Decision nativa incompatible.');
  }

  private dto(row:any) {
    return {intencionId:row.intencion_id,huellaContexto:row.huella_contexto,estado:row.estado,
      preparadaEn:new Date(row.preparada_en).toISOString(),confirmadaEn:row.confirmada_en?new Date(row.confirmada_en).toISOString():null,
      docenteId:row.docente_id,resultado:row.resultado_nativo};
  }

  async consultar(value:string) {
    const [row]=await this.db.query('SELECT * FROM rund.identidad_contexto_nativo WHERE intencion_id=$1',[this.id(value)]);
    if(!row)throw new NotFoundException('Contexto nativo no registrado.');
    return this.dto(row);
  }

  /** Sin HTTP o correo. Solo confirma si perfil, evidencias y auditoria y recibo nativo comparten commit. */
  async confirmarNativo(value:string) {
    const id=this.id(value);
    return this.db.transaction(async manager=>{
      await manager.query("SET LOCAL lock_timeout='5s'");
      const [journal]=await manager.query('SELECT * FROM rund.identidad_operacion WHERE intencion_id=$1 FOR UPDATE',[id]);
      const [native]=await manager.query('SELECT * FROM rund.identidad_contexto_nativo WHERE intencion_id=$1 FOR UPDATE',[id]);
      if(!journal||!native)throw new NotFoundException('Intencion o contexto nativo no registrado.');
      if(native.estado==='CONFIRMADA')return this.dto(native);
      if(journal.estado!=='AUTH_APLICADA'||!journal.recibo_auth?.identidadAplicada||!journal.recibo_auth.resultado)
        throw new ConflictException('Auth aun no confirma la identidad de esta operacion.');
      const [execution]=await manager.query('SELECT * FROM rund.identidad_ejecucion WHERE intencion_id=$1 FOR UPDATE',[id]);
      if(!execution||execution.decision!=='EN_CURSO'||execution.huella_contexto!==native.huella_contexto)
        throw new ConflictException('La decision nativa no permite confirmar esta operacion.');
      const context=restoreNativeBusinessContext(native.contexto);
      if(nativeBusinessFingerprint(context)!==native.huella_contexto||identityWriteFingerprint(context.comandoAuth)!==journal.huella_comando)
        throw new ConflictException('La identidad y el contexto persistidos no coinciden.');
      const result=journal.recibo_auth.resultado;
      const review = context.escritura.options.extractionReview;
      if (review && result.personaId !== review.identity.personaId)
        throw new ConflictException('Auth no confirmó la identidad del perfil revisado.');
      const suggestions = review ? await lockRundExtractionSuggestions(manager, review.docenteId, review.ids, review.values, review.identity) : [];
      const written=await this.banco.persistirPerfilNativoConManager(manager,{...context.escritura,identity:{
        authPersonId:result.personaId,authUser:{id_user:result.usuarioId},authUserCreated:result.usuarioCreado,
        personaChangedFields:[...result.camposModificados],profileChanges:structuredClone(result.cambios),
      }});
      if (review) {
        if (written.docenteId !== review.docenteId) throw new ConflictException('La escritura no corresponde al perfil revisado.');
        await confirmExtractionSuggestions(manager, suggestions, review.values, context.escritura.options.audit.actorId,
          String(context.escritura.options.audit.observacion || '').trim());
      }
      // El escritor heredado tolera fallos JS al inicializar bloques. El coordinador nuevo no confirma un alta incompleta.
      if(written.action==='insert'&&!await this.banco.bloquesInicialesCompletosConManager(manager,written.docenteId))
        throw new ServiceUnavailableException('La creacion nativa no completo sus bloques.');
      const [updated]=await manager.query(`WITH confirmada AS (UPDATE rund.identidad_contexto_nativo
        SET estado='CONFIRMADA',confirmada_en=CURRENT_TIMESTAMP,docente_id=$2,resultado_nativo=$3::jsonb
        WHERE intencion_id=$1 AND estado='PREPARADA' RETURNING *) SELECT * FROM confirmada`,[id,written.docenteId,JSON.stringify(written)]);
      if(!updated)throw new ServiceUnavailableException('RUND no confirmo el recibo nativo.');
      return this.dto(updated);
    });
  }
}

// Preparacion sin rutas, worker o import desde AppModule; la activacion remota sigue pendiente.
@Module({imports:[AuthIdentityCoordinationModule,BancoDocentesModule],providers:[AuthIdentityNativeCommitService],exports:[AuthIdentityNativeCommitService]})
export class AuthIdentityNativeCommitModule {}
