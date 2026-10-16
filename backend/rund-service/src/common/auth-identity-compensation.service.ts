import { BadRequestException, ConflictException, Injectable, Module, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthIdentityCompensationClient, AuthIdentityCompensationClientModule, AuthIdentityResolution, authIdentityResolution } from './auth-identity-compensation.client';

export interface IdentityCompensationCoordination {
  intencionId:string;operacionAuthId:string;huellaComando:string;huellaContexto:string;
  decisionNativa:string;estadoNativo:string;estadoAuth:string;reciboResolucion:AuthIdentityResolution|null;registradaEn:string|null;
}

/** Resolucion explicita del aborto aplicado. Sin SQL Auth, commit nativo o envio de correo. */
@Injectable()
export class AuthIdentityCompensationService {
  constructor(private readonly db:DataSource,private readonly auth:AuthIdentityCompensationClient) {}
  private id(value:string) {
    if(typeof value!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value))throw new BadRequestException('Intencion de resolucion invalida.');
    return value.toLowerCase();
  }
  async consultar(value:string):Promise<IdentityCompensationCoordination> {
    const [row]=await this.db.query(`SELECT e.intencion_id,e.huella_contexto,e.decision,n.estado AS estado_nativo,
      j.estado AS estado_auth,j.operacion_auth_id,j.huella_comando,r.recibo_auth,r.registrada_en
      FROM rund.identidad_ejecucion e JOIN rund.identidad_operacion j USING (intencion_id)
      JOIN rund.identidad_contexto_nativo n USING (intencion_id)
      LEFT JOIN rund.identidad_resolucion_auth r USING (intencion_id) WHERE e.intencion_id=$1`,[this.id(value)]);
    if(!row)throw new NotFoundException('Intencion de resolucion no registrada.');
    return {intencionId:row.intencion_id,operacionAuthId:row.operacion_auth_id,huellaComando:row.huella_comando,huellaContexto:row.huella_contexto,
      decisionNativa:row.decision,estadoNativo:row.estado_nativo,estadoAuth:row.estado_auth,reciboResolucion:row.recibo_auth||null,
      registradaEn:row.registrada_en?new Date(row.registrada_en).toISOString():null};
  }
  private exigirAbortoAplicado(local:IdentityCompensationCoordination) {
    if(local.decisionNativa!=='ABORTADA'||local.estadoNativo!=='PREPARADA'||local.estadoAuth!=='AUTH_APLICADA')
      throw new ConflictException('La compensacion exige identidad aplicada y aborto nativo sin commit.');
  }
  /** Solo GET al propietario y persistencia del recibo; no solicita una compensacion. */
  async reconciliar(value:string):Promise<{coordinacion:IdentityCompensationCoordination;consultaAuth:'CONFIRMADA'|'NO_ENCONTRADA'}> {
    const local=await this.consultar(value);this.exigirAbortoAplicado(local);
    if(local.reciboResolucion)return {coordinacion:local,consultaAuth:'CONFIRMADA'};
    const receipt=await this.auth.consultar(local.operacionAuthId,local.intencionId,local.huellaComando);
    if(receipt===null) {
      // Un GET iniciado antes del commit remoto puede llegar despues de otra persistencia local.
      const latest=await this.consultar(local.intencionId);this.exigirAbortoAplicado(latest);
      return {coordinacion:latest,consultaAuth:latest.reciboResolucion?'CONFIRMADA':'NO_ENCONTRADA'};
    }
    return {coordinacion:await this.guardarRecibo(local.intencionId,receipt),consultaAuth:'CONFIRMADA'};
  }
  /** El mismo UUID sobrevive a respuesta perdida o fallo local posterior al commit Auth. */
  async resolver(value:string) {
    return this.resolverConControles(value);
  }
  /** Control opcional de servidor antes de solicitar una compensacion al propietario. */
  async resolverConControles(value:string,control?:()=>Promise<void>) {
    const local=(await this.reconciliar(value)).coordinacion;
    if(local.reciboResolucion)return local;
    if(control)await control();
    const receipt=await this.auth.compensar(local.operacionAuthId,local.intencionId,local.huellaComando);
    return this.guardarRecibo(local.intencionId,receipt);
  }
  private async guardarRecibo(intencionId:string,receipt:AuthIdentityResolution) {
    // HTTP finalizado. Orden de bloqueo compartido con aborto y confirmacion nativa.
    await this.db.transaction(async manager=>{
      await manager.query("SET LOCAL lock_timeout='5s'");
      const [journal]=await manager.query('SELECT * FROM rund.identidad_operacion WHERE intencion_id=$1 FOR UPDATE',[intencionId]);
      const [native]=await manager.query('SELECT * FROM rund.identidad_contexto_nativo WHERE intencion_id=$1 FOR UPDATE',[intencionId]);
      const [execution]=await manager.query('SELECT * FROM rund.identidad_ejecucion WHERE intencion_id=$1 FOR UPDATE',[intencionId]);
      if(!journal||!native||!execution)throw new NotFoundException('Intencion de resolucion no registrada.');
      if(journal.estado!=='AUTH_APLICADA'||native.estado!=='PREPARADA'||execution.decision!=='ABORTADA'
        ||execution.huella_contexto!==native.huella_contexto)throw new ConflictException('El estado local no admite una resolucion aplicada.');
      try {authIdentityResolution(receipt,journal.operacion_auth_id,intencionId,journal.huella_comando);}
      catch {throw new ConflictException('El recibo de resolucion no corresponde a esta intencion.');}
      const [known]=await manager.query(`SELECT *,recibo_auth=$2::jsonb AS recibo_igual
        FROM rund.identidad_resolucion_auth WHERE intencion_id=$1`,[intencionId,JSON.stringify(receipt)]);
      if(known) {
        if(!known.recibo_igual)throw new ServiceUnavailableException('Auth contradice una resolucion ya confirmada.');
        return;
      }
      const [stored]=await manager.query(`INSERT INTO rund.identidad_resolucion_auth
        (intencion_id,operacion_auth_id,huella_comando,huella_contexto,estado,motivo,recibo_auth)
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING intencion_id`,
        [intencionId,journal.operacion_auth_id,journal.huella_comando,native.huella_contexto,receipt.estado,receipt.motivo,JSON.stringify(receipt)]);
      if(!stored)throw new ServiceUnavailableException('RUND no confirmo el recibo de resolucion Auth.');
    });
    return this.consultar(intencionId);
  }
}

// Preparacion inactiva: sin import desde AppModule, ruta de mutacion o worker.
@Module({imports:[AuthIdentityCompensationClientModule],providers:[AuthIdentityCompensationService],exports:[AuthIdentityCompensationService]})
export class AuthIdentityCompensationModule {}
