import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RundAuthStateSyncService } from './rund-auth-state-sync.service';

/** Reconciliación periódica: un fallo no bloquea las personas siguientes ni requiere reenvío del navegador. */
@Injectable()
export class RundAuthStateSyncWorker implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(RundAuthStateSyncWorker.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private stopping = false;
  private current?: Promise<void>;
  constructor(@InjectDataSource() private readonly db: DataSource, private readonly sync: RundAuthStateSyncService) {}
  onApplicationBootstrap() {
    if (!this.sync.enabled) return;
    this.timer = setInterval(() => this.schedule(), 60_000);
    this.timer.unref();
    this.schedule();
  }
  private schedule() { if (!this.running && !this.stopping) this.current = this.tick(); }
  async onModuleDestroy() { this.stopping = true; if (this.timer) clearInterval(this.timer); await this.current; }
  async tick() {
    if (this.running || this.stopping || !this.sync.enabled) return;
    this.running = true;
    try {
      const persons = await this.db.query(`SELECT d."personaId" AS persona_id FROM rund."Docente" d
        LEFT JOIN rund.carpeta_auth_sync s ON s.persona_id=d."personaId"
        WHERE d."personaId" IS NOT NULL GROUP BY d."personaId",s.last_attempt_at
        ORDER BY s.last_attempt_at ASC NULLS FIRST,d."personaId" LIMIT 25`);
      for (const person of persons) {
        if (this.stopping) break;
        try { await this.sync.syncPersona(person.persona_id); }
        catch { this.logger.warn('AUTH_STATE_UNAVAILABLE: se reintentará en otro ciclo.'); }
      }
    } catch { this.logger.warn('AUTH_STATE_POLL_UNAVAILABLE: verifique las migraciones locales.'); }
    finally { this.running = false; }
  }
}
