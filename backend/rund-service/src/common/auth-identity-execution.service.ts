import { BadRequestException, ConflictException, Controller, Get, Header, Injectable, Module, NotFoundException, Param, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Public } from '../auth/auth.decorators';
import { InternalServiceGuard } from '../internal/internal-service.guard';
import { identityWriteFingerprint } from './auth-identity-command';
import { AuthIdentityOperationClient, AuthIdentityOperationModule } from './auth-identity-operation.client';
import { AuthIdentityCoordinationModule, AuthIdentityCoordinationService } from './auth-identity-coordination.service';
import { AuthIdentityNativeCommitModule, AuthIdentityNativeCommitService } from './auth-identity-native-commit.service';
import { AuthIdentityCompensationModule } from './auth-identity-compensation.service';
import { AuthIdentityReviewModule } from './auth-identity-review.controller';
import { nativeBusinessFingerprint, restoreNativeBusinessContext } from '../modules/banco-docentes/rund-native-business-context';
import type { RundNativeWriteInput } from '../modules/banco-docentes/rund-native-profile-write';

export type IdentityAbortReason='FALLO_NEGOCIO'|'CANCELACION_SOLICITUD';

/** Ejecutor servidor preparatorio. La compensacion y el correo no se infieren de un aborto local. */
@Injectable()
export class AuthIdentityExecutionService {
  constructor(private readonly db:DataSource,private readonly coordination:AuthIdentityCoordinationService,
    private readonly native:AuthIdentityNativeCommitService,private readonly auth:AuthIdentityOperationClient) {}

  private id(value:string) {
    if(typeof value!=='string'||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value))throw new BadRequestException('Intencion de ejecucion invalida.');
    return value.toLowerCase();
  }

  async preparar(value:string,command:unknown,input:Omit<RundNativeWriteInput,'identity'>) {
    const id=this.id(value);await this.native.preparar(id,command,input);return this.consultar(id);
  }

  async consultar(value:string) {
    const [row]=await this.db.query(`SELECT e.*,j.operacion_auth_id,j.huella_comando,j.estado AS estado_auth,
      n.estado AS estado_nativo,n.resultado_nativo,r.recibo_auth AS resolucion_auth,c.caso_id,c.estado AS estado_revision FROM rund.identidad_ejecucion e
      JOIN rund.identidad_operacion j USING (intencion_id) JOIN rund.identidad_contexto_nativo n USING (intencion_id)
      LEFT JOIN rund.identidad_resolucion_auth r USING (intencion_id)
      LEFT JOIN rund.identidad_revision c USING (intencion_id)
      WHERE e.intencion_id=$1`,[this.id(value)]);
    if(!row)throw new NotFoundException('Ejecucion de identidad no registrada.');
    return {intencionId:row.intencion_id,operacionAuthId:row.operacion_auth_id,huellaComando:row.huella_comando,huellaContexto:row.huella_contexto,
      decisionNativa:row.decision,preparadaEn:new Date(row.preparada_en).toISOString(),abortadaEn:row.abortada_en?new Date(row.abortada_en).toISOString():null,
      motivoAborto:row.motivo_aborto,estadoAuth:row.estado_auth,estadoNativo:row.estado_nativo,resultadoNativo:row.resultado_nativo,
      resolucionAuth:row.resolucion_auth||null,revisionAuthRequerida:row.resolucion_auth?.estado==='REVISION_REQUERIDA',
      casoRevision:row.caso_id?{casoId:row.caso_id,estado:row.estado_revision}:null,
      resolucionAuthPendiente:row.decision==='ABORTADA'&&row.estado_auth!=='CANCELADA'&&row.resolucion_auth?.estado!=='COMPENSADA'};
  }

  async abortar(value:string,reason:IdentityAbortReason) {
    const id=this.id(value);
    if(!['FALLO_NEGOCIO','CANCELACION_SOLICITUD'].includes(reason))throw new BadRequestException('Motivo de aborto incompatible.');
    await this.db.transaction(async manager=>{
      await manager.query("SET LOCAL lock_timeout='5s'");
      const [journal]=await manager.query('SELECT * FROM rund.identidad_operacion WHERE intencion_id=$1 FOR UPDATE',[id]);
      const [native]=await manager.query('SELECT * FROM rund.identidad_contexto_nativo WHERE intencion_id=$1 FOR UPDATE',[id]);
      const [execution]=await manager.query('SELECT * FROM rund.identidad_ejecucion WHERE intencion_id=$1 FOR UPDATE',[id]);
      if(!journal||!native||!execution)throw new NotFoundException('Ejecucion de identidad no registrada.');
      if(native.estado==='CONFIRMADA')throw new ConflictException('Un commit nativo confirmado no se puede abortar.');
      if(execution.decision==='ABORTADA') {
        if(execution.motivo_aborto!==reason)throw new ConflictException('El aborto ya tiene otro motivo confirmado.');
        return;
      }
      const [updated]=await manager.query(`WITH abortada AS (UPDATE rund.identidad_ejecucion
        SET decision='ABORTADA',abortada_en=CURRENT_TIMESTAMP,motivo_aborto=$2
        WHERE intencion_id=$1 AND decision='EN_CURSO' RETURNING *) SELECT * FROM abortada`,[id,reason]);
      if(!updated)throw new ServiceUnavailableException('RUND no confirmo la decision de aborto.');
    });
    return this.consultar(id);
  }

  /** Solo concilia hechos Auth; nunca vuelve a aplicar identidad o escribe el perfil. */
  async recuperar(value:string) {
    const id=this.id(value);await this.consultar(id);await this.coordination.reconciliar(id);return this.consultar(id);
  }

  /** Hecho local irreversible. No expone comando, identidad, perfil o recibo Auth. */
  async pruebaAborto(value:string) {
    const current=await this.consultar(value);
    this.exigirAborto(current);
    return {version:1 as const,intencionId:current.intencionId,operacionAuthId:current.operacionAuthId,
      huellaComando:current.huellaComando,huellaContexto:current.huellaContexto,decisionNativa:'ABORTADA' as const,
      estadoNativo:'PREPARADA' as const,abortadaEn:current.abortadaEn,motivoAborto:current.motivoAborto};
  }

  private exigirAborto(current:Awaited<ReturnType<AuthIdentityExecutionService['consultar']>>) {
    if(current.decisionNativa!=='ABORTADA'||current.estadoNativo!=='PREPARADA'||!current.abortadaEn
      ||!['FALLO_NEGOCIO','CANCELACION_SOLICITUD'].includes(current.motivoAborto))
      throw new ConflictException('La resolucion exige un aborto nativo confirmado sin commit.');
  }

  /** Resuelve solo operaciones que Auth aun no aplico. Un aplicado sigue pendiente de compensacion propietaria. */
  async resolverAborto(value:string) {
    return this.resolverAbortoConControles(value);
  }

  /** Controles de servidor previos a cada mutacion remota; el aborto permanece irreversible. */
  async resolverAbortoConControles(value:string,control?:(phase:'REGISTRAR_AUTH'|'CANCELAR_AUTH')=>Promise<void>) {
    const id=this.id(value),initial=await this.consultar(id);
    this.exigirAborto(initial);
    if(initial.estadoAuth==='CANCELADA')return initial;
    let remote=(await this.coordination.reconciliar(id)).coordinacion;
    // La ausencia observada por GET no detiene un registro en vuelo. Publicar el mismo UUID
    // permite dejar una cancelacion durable que tampoco un registro tardio puede reactivar.
    if(remote.estado==='PREPARADA'){if(control)await control('REGISTRAR_AUTH');remote=await this.coordination.registrarEnAuth(id);}
    if(remote.estado==='AUTH_REGISTRADA') {
      if(control)await control('CANCELAR_AUTH');
      try {await this.auth.cancelar(remote.operacionAuthId,remote.huellaComando);}
      catch(error) {
        if(!(error instanceof ConflictException))throw error;
        // Aplicar y cancelar compiten por la misma fila en Auth. Solo un recibo terminal
        // confirmado por GET permite resolver el conflicto, nunca el 409 por si solo.
        remote=(await this.coordination.reconciliar(id)).coordinacion;
        if(remote.estado!=='AUTH_APLICADA'&&remote.estado!=='CANCELADA')throw error;
        return this.consultar(id);
      }
      remote=(await this.coordination.reconciliar(id)).coordinacion;
    }
    if(remote.estado!=='CANCELADA'&&remote.estado!=='AUTH_APLICADA')
      throw new ServiceUnavailableException('Auth no confirma la resolucion del aborto.');
    return this.consultar(id);
  }

  private async abierta(id:string) {
    const current=await this.consultar(id);
    if(current.decisionNativa!=='EN_CURSO')throw new ConflictException('La ejecucion nativa esta abortada.');
    return current;
  }

  /** Reanuda desde el contexto congelado, con el mismo UUID Auth. No acepta otro comando de reintento. */
  async ejecutar(value:string) {
    return this.ejecutarConControles(value);
  }

  /** Controles de servidor fuera de transacciones, antes de cada mutacion. */
  async ejecutarConControles(value:string,control?:(phase:'REGISTRAR_AUTH'|'APLICAR_AUTH'|'CONFIRMAR_NATIVO')=>Promise<void>) {
    const id=this.id(value),initial=await this.consultar(id);
    if(initial.estadoNativo==='CONFIRMADA')return initial;
    await this.abierta(id);
    const [stored]=await this.db.query('SELECT * FROM rund.identidad_contexto_nativo WHERE intencion_id=$1',[id]);
    const context=restoreNativeBusinessContext(stored?.contexto);
    if(nativeBusinessFingerprint(context)!==initial.huellaContexto||identityWriteFingerprint(context.comandoAuth)!==initial.huellaComando)
      throw new ConflictException('El contexto de ejecucion no corresponde a la intencion.');
    let remote=(await this.coordination.reconciliar(id)).coordinacion;
    if(remote.estado==='PREPARADA') {if(control)await control('REGISTRAR_AUTH');await this.abierta(id);remote=await this.coordination.registrarEnAuth(id);}
    if(remote.estado==='CANCELADA')throw new ConflictException('Auth confirmo la cancelacion de esta intencion.');
    if(remote.estado==='AUTH_REGISTRADA') {
      if(control)await control('APLICAR_AUTH');
      await this.abierta(id);
      await this.auth.aplicar(remote.operacionAuthId,context.comandoAuth);
      remote=(await this.coordination.reconciliar(id)).coordinacion;
    }
    if(remote.estado!=='AUTH_APLICADA')throw new ServiceUnavailableException('Auth aun no confirma la aplicacion de identidad.');
    // confirmarNativo decide bajo los mismos bloqueos que abortar, aun si el aborto gano mientras habia HTTP en vuelo.
    if(control)await control('CONFIRMAR_NATIVO');
    await this.native.confirmarNativo(id);
    return this.consultar(id);
  }
}

/** Ruta preparatoria interna; el modulo sigue sin import desde AppModule. */
@Public()
@UseGuards(InternalServiceGuard)
@Controller('internal/rund/v1/identidad/intenciones')
export class AuthIdentityAbortProofController {
  constructor(private readonly execution:AuthIdentityExecutionService) {}

  @Get(':intencionId/aborto')
  @Header('Cache-Control','private, no-store')
  async consultar(@Param('intencionId') id:string) {return {pruebaAborto:await this.execution.pruebaAborto(id)};}
}

// Sin import desde AppModule o worker. Autorizacion/OTP, compensacion, preview y correo se cierran antes de activar.
@Module({imports:[AuthIdentityCoordinationModule,AuthIdentityNativeCommitModule,AuthIdentityOperationModule,AuthIdentityCompensationModule,AuthIdentityReviewModule],
  controllers:[AuthIdentityAbortProofController],providers:[AuthIdentityExecutionService,InternalServiceGuard],exports:[AuthIdentityExecutionService,AuthIdentityCompensationModule,AuthIdentityReviewModule]})
export class AuthIdentityExecutionModule {}
