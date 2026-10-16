import { BadRequestException, Injectable, Module, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { AuthIdentityMailClient, IdentityWelcomeMail } from './auth-identity-mail.client';
import { nativeBusinessFingerprint, restoreNativeBusinessContext } from '../modules/banco-docentes/rund-native-business-context';

export interface IdentityMailReceipt {
  intencionId: string;
  estado: 'PENDIENTE' | 'ENVIANDO' | 'ENVIADO' | 'INCIERTO';
  requiereRevision: boolean;
}

/** Consumidor servidor opcional. No tiene rutas, timers, cron o import en AppModule. */
@Injectable()
export class AuthIdentityMailService {
  constructor(private readonly db: DataSource, private readonly client: AuthIdentityMailClient) {}

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
      claimed = await this.db.transaction(async manager => {
        await manager.query("SET LOCAL lock_timeout='5s'");
        const [row] = await manager.query(`SELECT m.*,n.contexto,n.huella_contexto,n.resultado_nativo,
          rund.correo_bienvenida_elegible(m.intencion_id) AS elegible FROM rund.identidad_correo m
          JOIN rund.identidad_contexto_nativo n USING(intencion_id) WHERE m.intencion_id=$1 FOR UPDATE OF m`, [id]);
        if (!row) throw new NotFoundException('Aviso de correo RUND no registrado.');
        if (row.estado !== 'PENDIENTE') { this.receipt(row); return { row }; }
        if (!row.elegible) throw new Error();
        const context = restoreNativeBusinessContext(row.contexto), command = context.comandoAuth;
        if (nativeBusinessFingerprint(context) !== row.huella_contexto || row.resultado_nativo?.email !== command.emailFinal
          || row.resultado_nativo?.authUserCreated !== true) throw new Error();
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
      if (error instanceof NotFoundException) throw error;
      throw new ServiceUnavailableException('No fue posible reservar el intento de correo RUND.');
    }
    if (!claimed.mail) return this.receipt(claimed.row);
    // La reserva está confirmada antes del HTTP. Un crash nunca recupera ENVIANDO
    // como PENDIENTE: el contrato SMTP actual no garantiza deduplicación remota.
    let accepted = false;
    try { accepted = await this.client.enviar(claimed.mail); } catch { /* Resultado incierto, sin repetir. */ }
    try {
      const [row] = await this.db.query(`WITH resuelta AS (UPDATE rund.identidad_correo SET estado=$3,resuelta_en=clock_timestamp()
        WHERE intencion_id=$1 AND intento_id=$2 AND estado='ENVIANDO' RETURNING intencion_id,estado) SELECT * FROM resuelta`,
      [id, claimed.row.intento_id, accepted === true ? 'ENVIADO' : 'INCIERTO']);
      if (!row) throw new Error();
      return this.receipt(row);
    } catch {
      throw new ServiceUnavailableException('No fue posible confirmar el intento de correo RUND; requiere conciliacion.');
    }
  }
}

@Module({ providers: [AuthIdentityMailClient, AuthIdentityMailService], exports: [AuthIdentityMailService] })
export class AuthIdentityMailModule {}
