import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

type MailState = 'PENDIENTE' | 'ENVIANDO' | 'ENVIADO' | 'INCIERTO';
type ObservedResult = 'ACEPTADO' | 'INCIERTO';
export interface IdentityMailReconciliationReceipt {
  version: 1; intencionId: string; estado: MailState; resultadoRegistrado: boolean; requiereRevision: boolean;
}
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);

/** Conciliador servidor opcional: solo SQL RUND; no importa clientes SMTP/Auth. */
@Injectable()
export class AuthIdentityMailReconciliationService {
  constructor(private readonly db: DataSource) {}
  private id(v: unknown) {
    if (!uuid(v)) throw new BadRequestException('Identificador de correo RUND invalido.');
    return v.toLowerCase();
  }
  private async locked(manager: EntityManager, id: string) {
    await manager.query("SET LOCAL lock_timeout='5s'");
    const [row] = await manager.query('SELECT * FROM rund.identidad_correo WHERE intencion_id=$1 FOR UPDATE', [id]);
    if (!row) throw new NotFoundException('Aviso de correo RUND no registrado.');
    if (row.intencion_id !== id || !['PENDIENTE','ENVIANDO','ENVIADO','INCIERTO'].includes(row.estado)
      || (row.estado === 'PENDIENTE' ? row.intento_id !== null : !uuid(row.intento_id))) throw new Error();
    return row;
  }
  private async observed(manager: EntityManager, id: string, row: any) {
    const [event] = await manager.query('SELECT intencion_id,intento_id,resultado FROM rund.identidad_correo_resultado WHERE intencion_id=$1', [id]);
    if (event && (event.intencion_id !== id || event.intento_id !== row.intento_id
      || !['ACEPTADO','INCIERTO'].includes(event.resultado) || row.estado === 'PENDIENTE'
      || (row.estado !== 'ENVIANDO' && row.estado !== (event.resultado === 'ACEPTADO' ? 'ENVIADO' : 'INCIERTO')))) throw new Error();
    return event;
  }
  /** Comprobar la migración y permisos antes de reservar o iniciar SMTP. */
  async verificarDisponible() {
    try {
      const [row] = await this.db.query(`SELECT has_table_privilege(current_user,'rund.identidad_correo_resultado','SELECT')
        AND has_table_privilege(current_user,'rund.identidad_correo_resultado','INSERT') AS disponible`);
      if (row?.disponible !== true) throw new Error();
    } catch { throw new ServiceUnavailableException('RUND no confirma el registro durable de resultados de correo.'); }
  }
  /** Solo el consumidor registra lo que observó del adaptador para SU intento. */
  async registrarResultado(value: string, attemptValue: string, result: ObservedResult): Promise<void> {
    const id = this.id(value), attempt = this.id(attemptValue);
    if (!['ACEPTADO','INCIERTO'].includes(result)) throw new BadRequestException('Resultado de correo RUND invalido.');
    try {
      await this.db.transaction(async manager => {
        const row = await this.locked(manager, id), event = await this.observed(manager, id, row);
        if (row.intento_id !== attempt) throw new ConflictException('El resultado no corresponde al intento reservado.');
        if (event) {
          if (event.resultado !== result) throw new ConflictException('El intento ya conserva otro resultado observado.');
          return;
        }
        if (row.estado !== 'ENVIANDO') throw new ConflictException('El aviso no admite un nuevo resultado observado.');
        const [saved] = await manager.query(`INSERT INTO rund.identidad_correo_resultado(intencion_id,intento_id,resultado)
          VALUES($1,$2,$3) RETURNING intencion_id,intento_id,resultado`, [id, attempt, result]);
        if (saved?.intencion_id !== id || saved.intento_id !== attempt || saved.resultado !== result) throw new Error();
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) throw error;
      throw new ServiceUnavailableException('No fue posible registrar el resultado del correo RUND; requiere conciliacion.');
    }
  }
  /** Reproyecta solo hechos registrados; ausencia o incertidumbre nunca autorizan reenvío. */
  async conciliar(value: string): Promise<IdentityMailReconciliationReceipt> {
    const id = this.id(value);
    try {
      return await this.db.transaction(async manager => {
        let row = await this.locked(manager, id);
        const event = await this.observed(manager, id, row);
        if (event) {
          const target = event.resultado === 'ACEPTADO' ? 'ENVIADO' : 'INCIERTO';
          if (row.estado === 'ENVIANDO') {
            const [updated] = await manager.query(`WITH resuelta AS (UPDATE rund.identidad_correo SET estado=$3,resuelta_en=clock_timestamp()
              WHERE intencion_id=$1 AND intento_id=$2 AND estado='ENVIANDO' RETURNING *) SELECT * FROM resuelta`, [id, row.intento_id, target]);
            if (!updated || updated.intencion_id !== id || updated.intento_id !== row.intento_id || updated.estado !== target) throw new Error();
            row = updated;
          } else if (row.estado !== target) throw new Error();
        }
        return { version: 1 as const, intencionId: id, estado: row.estado, resultadoRegistrado: !!event,
          requiereRevision: row.estado === 'INCIERTO' || row.estado === 'ENVIANDO' };
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new ServiceUnavailableException('No fue posible conciliar el resultado del correo RUND.');
    }
  }
}
