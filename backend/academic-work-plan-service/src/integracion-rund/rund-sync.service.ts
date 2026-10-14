import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RundDocentesClient } from './rund-docentes.client';

const TABLA = 'academic_work_plan."Docente"';
const INDICE_PERSONA_PERIODO = 'Docente_personaId_periodoCarga_key';

export interface ResultadoSincronizacion {
  procesados: number;
  errores: number;
}

/**
 * Mantiene `academic_work_plan."Docente"` como COPIA DE SOLO LECTURA del RUND.
 *
 * El RUND (rund-service) es el dueño del dato y el único que lo escribe. PTA conserva la tabla porque
 * sus planes, solicitudes y consultas hacen JOIN y clave foránea contra ella; este servicio la alimenta
 * por la API interna de rund-service:
 *  - con `RUND_SYNC_ENABLED=true`, al arrancar y cada `RUND_SYNC_INTERVAL_MINUTES` (por defecto 10) se recorre todo el RUND;
 *  - bajo demanda, cuando PTA necesita un docente que todavía no tiene copia.
 *
 * Las filas que existen solo en PTA (aprovisionadas para no violar una FK) no se tocan ni se borran.
 */
@Injectable()
export class RundSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RundSyncService.name);
  private columnas: string[] | null = null;
  private enCurso = false;
  private temporizadores: NodeJS.Timeout[] = [];

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly rund: RundDocentesClient,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test' || process.env.RUND_SYNC_ENABLED !== 'true') return;
    const minutos = Math.max(Number(process.env.RUND_SYNC_INTERVAL_MINUTES) || 10, 1);
    const ejecutar = () => this.sincronizarTodo().catch((e) => this.logger.warn(`Sincronización con RUND falló: ${e?.message}`));
    // El primer pase espera a que rund-service pueda haber arrancado también.
    this.temporizadores.push(setTimeout(ejecutar, 15_000), setInterval(ejecutar, minutos * 60_000));
    this.temporizadores.forEach((t) => t.unref?.());
  }

  onModuleDestroy() {
    this.temporizadores.forEach((t) => clearTimeout(t));
    this.temporizadores = [];
  }

  /** Recorre todo el RUND y actualiza la copia local. Un docente que falla no detiene a los demás. */
  async sincronizarTodo(): Promise<ResultadoSincronizacion> {
    if (this.enCurso) return { procesados: 0, errores: 0 };
    this.enCurso = true;
    const resultado: ResultadoSincronizacion = { procesados: 0, errores: 0 };
    try {
      let cursor: string | null = null;
      do {
        const pagina = await this.rund.paginaParaSincronizar(cursor, 200);
        for (const fila of pagina.items) {
          try {
            await this.guardarCopia(fila);
            resultado.procesados++;
          } catch (error: any) {
            resultado.errores++;
            this.logger.warn(`No se pudo copiar el docente ${fila?.id}: ${error?.message}`);
          }
        }
        cursor = pagina.nextCursor;
      } while (cursor);
      this.logger.log(`Sincronización con RUND: ${resultado.procesados} docentes, ${resultado.errores} con error.`);
      return resultado;
    } finally {
      this.enCurso = false;
    }
  }

  /**
   * Trae un docente puntual (por id propio o id de persona) y devuelve el id de su copia local, o `null`
   * si el RUND no lo tiene. Si rund-service no responde propaga el error: el llamador decide.
   */
  async sincronizarDocente(clave: string, periodo?: string | null): Promise<string | null> {
    const fila = await this.rund.resolver(clave, periodo);
    if (!fila) return null;
    return this.guardarCopia(fila);
  }

  private async columnasDeLaTabla(): Promise<string[]> {
    if (!this.columnas) {
      const filas: Array<{ column_name: string }> = await this.dataSource.query(
        `SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'academic_work_plan' AND table_name = 'Docente' ORDER BY ordinal_position`,
      );
      this.columnas = filas.map((f) => f.column_name);
    }
    return this.columnas;
  }

  /** Inserta o actualiza la copia. Devuelve el id local de la fila. */
  private async guardarCopia(fila: Record<string, any>): Promise<string> {
    const columnas = await this.columnasDeLaTabla();
    const q = (c: string) => `"${c.replace(/"/g, '""')}"`;
    const actualizables = columnas.filter((c) => c !== 'id');
    const json = JSON.stringify(fila);
    try {
      await this.dataSource.query(
        `INSERT INTO ${TABLA}
         SELECT * FROM jsonb_populate_record(NULL::${TABLA}, $1::jsonb)
         ON CONFLICT (id) DO UPDATE SET ${actualizables.map((c) => `${q(c)} = EXCLUDED.${q(c)}`).join(', ')}`,
        [json],
      );
      return String(fila.id);
    } catch (error: any) {
      if (!(error?.code === '23505' && String(error?.constraint ?? error?.message).includes(INDICE_PERSONA_PERIODO))) throw error;
      // Ya hay una fila local de esa persona y período con otro id (p. ej. aprovisionada por PTA): se
      // actualiza esa fila conservando su id, para no romper los planes que ya la referencian.
      const filas = await this.dataSource.query(
        `UPDATE ${TABLA} t SET ${actualizables.map((c) => `${q(c)} = r.${q(c)}`).join(', ')}
           FROM jsonb_populate_record(NULL::${TABLA}, $1::jsonb) r
          WHERE t."personaId" = r."personaId" AND COALESCE(t."periodoCarga", '') = COALESCE(r."periodoCarga", '')
          RETURNING t.id`,
        [json],
      );
      const id = Array.isArray(filas?.[0]) ? filas[0][0]?.id : filas?.[0]?.id;
      if (!id) throw error;
      return String(id);
    }
  }
}
