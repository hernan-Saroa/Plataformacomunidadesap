import { HttpException, Injectable, Logger, Module, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { InternalServiceGuard } from '../internal/internal-service.guard';
import { AuthIdentityCompensationModule, AuthIdentityCompensationService } from './auth-identity-compensation.service';
import { AuthIdentityCoordinationModule } from './auth-identity-coordination.service';
import { AuthIdentityAbortProofController, AuthIdentityExecutionService } from './auth-identity-execution.service';
import { AuthIdentityNativeCommitModule } from './auth-identity-native-commit.service';
import { AuthIdentityOperationModule } from './auth-identity-operation.client';
import { RUND_IDENTITY_WRITER, RundIdentityWriter, RundIdentityWritePlan, identityWritePlan, identityWriteViaAuthEnabled } from '../modules/banco-docentes/rund-identity-writer';

const businessFailure = (error: unknown) => error instanceof HttpException && error.getStatus() >= 400 && error.getStatus() < 500;

/**
 * Escritor de identidad por API: sustituye al SQL sobre auth.* del escritor anterior.
 *
 * Flujo (motor ya existente de coordinación): preparar (contexto congelado + intención) → Auth aplica por API con
 * UUID estable → RUND confirma perfil, bloques, auditoría y recibo en UN commit nativo.
 * Un fallo de negocio del commit nativo (p. ej. "ya existe", soporte rechazado) conserva la semántica atómica anterior:
 * se aborta y Auth restaura la identidad. Un fallo técnico (caída/timeout) deja la intención para el recuperador.
 */
@Injectable()
export class RundIdentityWriteViaAuth implements RundIdentityWriter {
  private readonly logger = new Logger(RundIdentityWriteViaAuth.name);
  constructor(private readonly execution: AuthIdentityExecutionService, private readonly compensation: AuthIdentityCompensationService) {}

  plan(input: Parameters<RundIdentityWriter['plan']>[0]): RundIdentityWritePlan { return identityWritePlan(input); }

  async write(plan: Extract<RundIdentityWritePlan, { ok: true }>) {
    const id = randomUUID();
    await this.execution.preparar(id, plan.command, plan.input);
    return this.run(id);
  }

  /** Ejecuta (o reanuda) una intención; ante un rechazo de negocio la revierte. */
  async run(id: string) {
    try {
      const done = await this.execution.ejecutar(id);
      if (done.estadoNativo !== 'CONFIRMADA' || !done.resultadoNativo) throw new ServiceUnavailableException('RUND no confirmó el perfil nativo.');
      return done.resultadoNativo;
    } catch (error) {
      if (businessFailure(error)) await this.rollback(id).catch(e => this.logger.warn(`Reversión pendiente de ${id}: ${e?.message || e}`));
      throw error;
    }
  }

  /** Aborta la intención y pide a Auth restaurar o cancelar lo que corresponda. No toca una confirmada. */
  async rollback(id: string) {
    const current = await this.execution.consultar(id);
    if (current.estadoNativo === 'CONFIRMADA') return current;
    if (current.decisionNativa === 'EN_CURSO') await this.execution.abortar(id, 'FALLO_NEGOCIO');
    return this.settleAborted(id);
  }

  /** Resuelve en Auth una intención ya abortada: cancela si no se aplicó, compensa si se aplicó. */
  async settleAborted(id: string) {
    const current = await this.execution.consultar(id);
    if (current.decisionNativa !== 'ABORTADA' || current.estadoAuth === 'CANCELADA'
      || ['COMPENSADA', 'REVISION_REQUERIDA'].includes(current.resolucionAuth?.estado)) return current;
    if (current.estadoAuth === 'AUTH_APLICADA') await this.compensation.resolver(id);
    else await this.execution.resolverAborto(id);
    return this.execution.consultar(id);
  }
}

/**
 * Cierra lo que quedó a medias si el proceso cayó entre pasos:
 *  - intención que nunca llegó a Auth y lleva tiempo detenida: se cancela (la solicitud original ya falló);
 *  - intención con Auth ya involucrado: se reanuda hacia adelante con el mismo UUID (idempotente);
 *  - intención abortada sin resolver en Auth: se resuelve.
 */
@Injectable()
export class RundIdentityWriteRecovery implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RundIdentityWriteRecovery.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  constructor(private readonly db: DataSource, private readonly writer: RundIdentityWriteViaAuth) {}

  onModuleInit() {
    if (!identityWriteViaAuthEnabled()) return;
    this.timer = setInterval(() => void this.recover(), Number(process.env.RUND_IDENTITY_WRITE_RECOVERY_MS) || 60_000);
    this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  async recover(limit = 20, idleSeconds = Number(process.env.RUND_IDENTITY_WRITE_IDLE_SECONDS) || 120): Promise<{ resumed: number; cancelled: number; settled: number }> {
    const result = { resumed: 0, cancelled: 0, settled: 0 };
    if (!identityWriteViaAuthEnabled() || this.running) return result;
    this.running = true;
    try {
      const open: Array<{ intencion_id: string; estado_auth: string }> = await this.db.query(
        `SELECT e.intencion_id, j.estado AS estado_auth FROM rund.identidad_ejecucion e
         JOIN rund.identidad_contexto_nativo n USING (intencion_id) JOIN rund.identidad_operacion j USING (intencion_id)
         WHERE e.decision='EN_CURSO' AND n.estado='PREPARADA' AND e.preparada_en < clock_timestamp() - make_interval(secs => $1)
         ORDER BY e.preparada_en LIMIT $2`, [idleSeconds, limit]);
      for (const row of open) {
        try {
          if (row.estado_auth === 'PREPARADA') { await this.writer.rollback(row.intencion_id); result.cancelled++; }
          else { await this.writer.run(row.intencion_id); result.resumed++; }
        } catch (error: any) { this.logger.warn(`No se pudo recuperar la intención ${row.intencion_id}: ${error?.message || error}`); }
      }
      const aborted: Array<{ intencion_id: string }> = await this.db.query(
        `SELECT e.intencion_id FROM rund.identidad_ejecucion e JOIN rund.identidad_operacion j USING (intencion_id)
         LEFT JOIN rund.identidad_resolucion_auth r USING (intencion_id)
         WHERE e.decision='ABORTADA' AND j.estado <> 'CANCELADA' AND r.intencion_id IS NULL
           AND e.abortada_en < clock_timestamp() - make_interval(secs => $1) ORDER BY e.abortada_en LIMIT $2`, [idleSeconds, limit]);
      for (const row of aborted) {
        try { await this.writer.settleAborted(row.intencion_id); result.settled++; }
        catch (error: any) { this.logger.warn(`No se pudo resolver el aborto ${row.intencion_id}: ${error?.message || error}`); }
      }
      return result;
    } finally { this.running = false; }
  }
}

/** Sin entrada manual, correo ni revisiones: solo el escritor, su recuperador y la prueba de aborto que Auth consulta. */
@Module({
  imports: [AuthIdentityCoordinationModule, AuthIdentityNativeCommitModule, AuthIdentityOperationModule, AuthIdentityCompensationModule],
  controllers: [AuthIdentityAbortProofController],
  providers: [AuthIdentityExecutionService, InternalServiceGuard, RundIdentityWriteViaAuth, RundIdentityWriteRecovery,
    { provide: RUND_IDENTITY_WRITER, useExisting: RundIdentityWriteViaAuth }],
  exports: [RUND_IDENTITY_WRITER],
})
export class RundIdentityWriteModule {}
