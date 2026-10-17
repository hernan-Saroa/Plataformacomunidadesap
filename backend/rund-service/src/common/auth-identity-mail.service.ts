import { BadRequestException, ConflictException, Injectable, Module, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { AuthIdentityMailClient, IdentityWelcomeMail } from './auth-identity-mail.client';
import { AuthIdentityMailValidationClient } from './auth-identity-mail-validation.client';
import { identityWriteFingerprint } from './auth-identity-command';
import { AuthIdentityMailReconciliationService } from './auth-identity-mail-reconciliation.service';
import { nativeBusinessFingerprint, restoreNativeBusinessContext } from '../modules/banco-docentes/rund-native-business-context';

export interface IdentityMailReceipt {
  intencionId: string;
  estado: 'PENDIENTE' | 'ENVIANDO' | 'ENVIADO' | 'INCIERTO';
  requiereRevision: boolean;
}

/** Consumidor servidor opcional. No tiene rutas, timers, cron o import en AppModule. */
@Injectable()
export class AuthIdentityMailService {
  constructor(private readonly db: DataSource, private readonly client: AuthIdentityMailClient,
    private readonly validation: AuthIdentityMailValidationClient = new AuthIdentityMailValidationClient(),
    private readonly reconciliation: AuthIdentityMailReconciliationService = new AuthIdentityMailReconciliationService(db)) {}

  private id(value: string) {
    if (typeof value !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value))
      throw new BadRequestException('Identificador de correo RUND invalido.');
    return value.toLowerCase();
  }

  private receipt(row: any): IdentityMailReceipt {
    if (!row || !['PENDIENTE', 'ENVIANDO', 'ENVIADO', 'INCIERTO'].includes(row.estado))
      throw new ServiceUnavailableException('RUND no confirma el estado del correo.');
    return { intencionId: row.intencion_id, estado: row.estado, requiereRevision: row.estado === 'INCIERTO' };
  }

  private async requireNotOmitted(manager: Pick<DataSource,'query'>, id: string) {
    const [result] = await manager.query('SELECT EXISTS(SELECT 1 FROM rund.identidad_correo_omision WHERE intencion_id=$1) AS omitida',[id]);
    if (typeof result?.omitida !== 'boolean') throw new Error();
    if (result.omitida) throw new ConflictException('La bienvenida fue omitida explicitamente; no admite envio.');
  }

  async consultar(value: string): Promise<IdentityMailReceipt> {
    const id = this.id(value);
    try {
      const [row] = await this.db.query('SELECT intencion_id,estado FROM rund.identidad_correo WHERE intencion_id=$1', [id]);
      if (!row) throw new NotFoundException('Aviso de correo RUND no registrado.');
      return this.receipt(row);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new ServiceUnavailableException('RUND no confirma el estado del correo.');
    }
  }

  async enviarPendiente(value: string): Promise<IdentityMailReceipt> {
    const id = this.id(value);
    let claimed: { row: any; mail?: IdentityWelcomeMail };
    try {
      // La consulta propietaria ocurre fuera de la transacción RUND. Un rechazo o
      // fallo no reserva intento y no permite enviar usando el snapshot como fallback.
      const projection = `SELECT m.*,n.contexto,n.huella_contexto,n.resultado_nativo,
        o.operacion_auth_id,o.huella_comando,
        rund.correo_bienvenida_elegible(m.intencion_id) AS elegible FROM rund.identidad_correo m
        JOIN rund.identidad_contexto_nativo n USING(intencion_id)
        JOIN rund.identidad_operacion o USING(intencion_id) WHERE m.intencion_id=$1`;
      const [pending] = await this.db.query(projection, [id]);
      if (!pending) throw new NotFoundException('Aviso de correo RUND no registrado.');
      if (pending.estado !== 'PENDIENTE') return this.receipt(pending);
      await this.requireNotOmitted(this.db,id);
      const context = restoreNativeBusinessContext(pending.contexto), command = context.comandoAuth;
      if (!pending.elegible || nativeBusinessFingerprint(context) !== pending.huella_contexto
        || pending.resultado_nativo?.email !== command.emailFinal || pending.resultado_nativo?.authUserCreated !== true
        || pending.huella_comando !== identityWriteFingerprint(command)) throw new Error();
      await this.reconciliation.verificarDisponible();
      const approved = await this.validation.validar(pending.operacion_auth_id, command);
      if (approved.apta !== true || approved.operacionId !== pending.operacion_auth_id
        || approved.huellaComando !== pending.huella_comando || approved.version !== 1 || approved.motivo !== null) throw new Error();
      claimed = await this.db.transaction(async manager => {
        await manager.query("SET LOCAL lock_timeout='5s'");
        const [row] = await manager.query(projection + ' FOR UPDATE OF m', [id]);
        if (!row) throw new NotFoundException('Aviso de correo RUND no registrado.');
        if (row.estado !== 'PENDIENTE') { this.receipt(row); return { row }; }
        await this.requireNotOmitted(manager,id);
        if (!row.elegible) throw new Error();
        const context = restoreNativeBusinessContext(row.contexto), command = context.comandoAuth;
        if (nativeBusinessFingerprint(context) !== row.huella_contexto || row.resultado_nativo?.email !== command.emailFinal
          || row.resultado_nativo?.authUserCreated !== true || row.huella_contexto !== pending.huella_contexto
          || row.operacion_auth_id !== pending.operacion_auth_id || row.huella_comando !== pending.huella_comando) throw new Error();
        // La política vigente de Auth inicializa la contraseña temporal desde documento.
        // Se deriva solo del contexto servidor; no se duplica en el outbox o recibos.
        const mail = { to: command.emailFinal, username: command.emailFinal,
          temporaryPassword: command.payload.documentNumber, fullName: command.finalFullName };
        const [updated] = await manager.query(`WITH reservada AS (UPDATE rund.identidad_correo SET estado='ENVIANDO',intento_id=$2,
          iniciada_en=clock_timestamp() WHERE intencion_id=$1 AND estado='PENDIENTE' RETURNING *) SELECT * FROM reservada`, [id, randomUUID()]);
        if (!updated) throw new Error();
        return { row: updated, mail };
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) throw error;
      throw new ServiceUnavailableException('No fue posible reservar el intento de correo RUND.');
    }
    if (!claimed.mail) return this.receipt(claimed.row);
    // La reserva está confirmada antes del HTTP. Un crash nunca recupera ENVIANDO
    // como PENDIENTE: el contrato SMTP actual no garantiza deduplicación remota.
    let accepted = false;
    try { accepted = await this.client.enviar(claimed.mail); } catch { /* Resultado incierto, sin repetir. */ }
    try {
      // Dos commits locales: si falla la proyección, el resultado ya observado
      // permanece recuperable sin volver a invocar al proveedor.
      await this.reconciliation.registrarResultado(id, claimed.row.intento_id, accepted === true ? 'ACEPTADO' : 'INCIERTO');
      const result = await this.reconciliation.conciliar(id);
      return { intencionId: result.intencionId, estado: result.estado, requiereRevision: result.requiereRevision };
    } catch {
      throw new ServiceUnavailableException('No fue posible confirmar el intento de correo RUND; requiere conciliacion.');
    }
  }
}

@Module({ providers: [AuthIdentityMailClient, AuthIdentityMailValidationClient, AuthIdentityMailReconciliationService, AuthIdentityMailService],
  exports: [AuthIdentityMailService, AuthIdentityMailReconciliationService] })
export class AuthIdentityMailModule {}
