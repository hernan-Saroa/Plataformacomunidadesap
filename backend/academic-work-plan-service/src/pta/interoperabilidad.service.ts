import {
  BadRequestException, CanActivate, ConflictException, ExecutionContext, ForbiddenException, Injectable, Logger, OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { Request } from 'express';

import {
  CLAVE_INTEROPERABILIDAD, CORTE_VALIDO, ConfigInteroperabilidad, leerInteroperabilidad,
  registrarFuenteInteroperabilidad, sembrarInteroperabilidad,
} from './interoperabilidad';
import { ESTADO_APAGADA, ESTADO_CONFLICTO_MANUAL, aplicarDecision } from './docencia-programacion';

/** Permiso propio del interruptor (migración 690). El superusuario también pasa. */
export const PTA_INTEROPERABILIDAD_PERMISSION = 'pta.backoffice.interoperabilidad';

@Injectable()
export class PtaInteroperabilidadGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { ptaAuth } = context.switchToHttp().getRequest<Request>();
    if (ptaAuth?.isSuperUser || ptaAuth?.permissions.has(PTA_INTEROPERABILIDAD_PERMISSION)) return true;
    throw new ForbiddenException('No tiene permiso para ver ni cambiar la interoperabilidad con Programación Académica.');
  }
}

export interface ImpactoInteroperabilidad {
  /** Concertaciones aún en camino (no aceptadas ni aprobadas del todo). */
  concertacionesEnCurso: number;
  /** PTA que tienen docencia aplicada desde Programación Académica. */
  ptasConDocenciaAplicada: number;
  /** Decisiones aceptadas que esperan a que se encienda la integración. */
  decisionesPendientes: number;
}

export interface ResultadoEncendido { aplicadas: number; conflicto: number; omitidas: number; errores: string[] }

const ESTADOS_EN_CURSO = ['ENVIADA', 'REVISADA', 'POR_ACEPTAR'];

@Injectable()
export class InteroperabilidadService implements OnModuleInit {
  private readonly logger = new Logger(InteroperabilidadService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Registra la fuente y siembra el valor inicial (solo si no hay fila). Escribe la configuración efectiva en el log. */
  async onModuleInit(): Promise<void> {
    registrarFuenteInteroperabilidad(this.dataSource);
    try {
      const r = await sembrarInteroperabilidad(this.dataSource);
      this.logger.log(
        `Interoperabilidad con Programación Académica: ${r.config.habilitada ? 'ENCENDIDA' : 'APAGADA (modo manual)'}; ` +
        `corte ${r.config.desdePeriodo}; origen ${r.sembrada ? 'variable de entorno (sembrada ahora)' : 'base de datos'}`);
      if (r.difiereDeVariable) {
        this.logger.warn(
          `PROG_CONCERTACION_HABILITADA difiere de lo guardado en la base (${r.config.habilitada}): manda la base; la variable solo siembra el valor inicial.`);
      }
    } catch (e: any) {
      // Sin tabla (ambiente sin migrar) o sin base: se avisa; la lectura cae a la variable (apagada si no está).
      this.logger.error(`No se pudo leer/sembrar la interoperabilidad: ${e?.message ?? e}. Se usa la variable de entorno.`);
    }
  }

  async estado(): Promise<ConfigInteroperabilidad & { impacto: ImpactoInteroperabilidad }> {
    return { ...(await leerInteroperabilidad(this.dataSource)), impacto: await this.impacto() };
  }

  async impacto(): Promise<ImpactoInteroperabilidad> {
    const [enCurso] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS n FROM "academic-schedule".concertacion_docencia WHERE estado = ANY($1::text[])`, [ESTADOS_EN_CURSO])
      .catch(() => [{ n: 0 }]); // sin el esquema de Programación Académica: no hay concertaciones
    const [aplicados] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS n FROM academic_work_plan."PlanTrabajoAcademico" p
        WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(p."datosEstructurados"->'asignaturas', '[]'::jsonb)) a
                       WHERE a->>'origen' = 'programacion')`);
    const [pendientes] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS n FROM academic_work_plan.docencia_concertada
        WHERE estado_aplicacion IN ($1, $2)`, [ESTADO_APAGADA, ESTADO_CONFLICTO_MANUAL]);
    return { concertacionesEnCurso: enCurso?.n ?? 0, ptasConDocenciaAplicada: aplicados?.n ?? 0, decisionesPendientes: pendientes?.n ?? 0 };
  }

  /**
   * Cambia el interruptor y/o el periodo de corte. Motivo obligatorio (≥10), confirmación explícita y
   * auditoría con valor anterior y nuevo. Al ENCENDER aplica lo pendiente (una transacción por docente).
   */
  async cambiar(
    body: { habilitada?: unknown; desdePeriodo?: unknown; motivo?: unknown; confirmacion?: unknown },
    actor: { userId: string | null; email: string | null; roles: string[]; name?: string | null },
  ) {
    if (typeof body?.habilitada !== 'boolean') throw new BadRequestException('habilitada debe ser verdadero o falso.');
    const motivo = String(body?.motivo ?? '').trim();
    if (motivo.length < 10) throw new BadRequestException('Explique el motivo del cambio (mínimo 10 caracteres).');
    if (body?.confirmacion !== true) throw new BadRequestException('Falta la confirmación del cambio.');
    const actual = await leerInteroperabilidad(this.dataSource);
    const corte = body?.desdePeriodo === undefined || body?.desdePeriodo === null || body?.desdePeriodo === ''
      ? actual.desdePeriodo : String(body.desdePeriodo).trim();
    if (!CORTE_VALIDO.test(corte)) throw new BadRequestException('El periodo de corte debe tener la forma AAAA-S (por ejemplo 2026-1).');

    const nuevoValor = {
      habilitada: body.habilitada, desdePeriodo: corte, motivo, cambiadoPor: actor.userId, cambiadoEn: new Date().toISOString(),
      cambiadoPorCorreo: actor.email,
    };
    const antesDe = { habilitada: actual.habilitada, desdePeriodo: actual.desdePeriodo };
    // Un solo UPSERT: atómico, y dos cambios simultáneos quedan en el orden en que la base los reciba.
    await this.dataSource.query(
      `INSERT INTO academic_work_plan."ConfiguracionSistema" (clave, valor, "updatedAt") VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "updatedAt" = NOW()`,
      [CLAVE_INTEROPERABILIDAD, JSON.stringify(nuevoValor)]);
    await this.auditar(actor, antesDe, { habilitada: nuevoValor.habilitada, desdePeriodo: corte }, motivo);

    let resultado: ResultadoEncendido | null = null;
    if (body.habilitada === true) resultado = await this.aplicarPendientes();
    this.logger.log(`Interoperabilidad cambiada a ${body.habilitada ? 'ENCENDIDA' : 'APAGADA'} (corte ${corte}) por ${actor.email ?? actor.userId}.`);
    return { config: await leerInteroperabilidad(this.dataSource), resultado, impacto: await this.impacto() };
  }

  /**
   * Apagado → encendido: aplica las decisiones aceptadas mientras estuvo apagada. Una transacción por
   * decisión; un PTA con docencia manual NO se pisa (queda pendiente por conflicto); un PTA enviado o
   * firmado no se toca (aplicarDecision ya lo respeta).
   */
  async aplicarPendientes(): Promise<ResultadoEncendido> {
    const pendientes: Array<{ id: string }> = await this.dataSource.query(
      `SELECT id_concertacion::text AS id FROM academic_work_plan.docencia_concertada
        WHERE estado_aplicacion IN ($1, $2, 'no_aplica_apagada') ORDER BY id_concertacion`,
      [ESTADO_APAGADA, ESTADO_CONFLICTO_MANUAL]);
    const r: ResultadoEncendido = { aplicadas: 0, conflicto: 0, omitidas: 0, errores: [] };
    for (const p of pendientes) {
      try {
        const estado = await this.dataSource.transaction((m) => aplicarDecision(m, p.id));
        if (estado === 'aplicada') r.aplicadas++;
        else if (estado === ESTADO_CONFLICTO_MANUAL) r.conflicto++;
        else r.omitidas++;
      } catch (e: any) {
        r.omitidas++;
        r.errores.push(`${p.id}: ${String(e?.message ?? e).slice(0, 200)}`);
      }
    }
    return r;
  }

  /** Auditoría en el audit-service existente (POST /logs). Si no responde, se registra en el log y el cambio ya quedó. */
  private async auditar(
    actor: { userId: string | null; email: string | null; roles: string[] },
    anterior: { habilitada: boolean; desdePeriodo: string }, nuevo: { habilitada: boolean; desdePeriodo: string }, motivo: string,
  ): Promise<void> {
    const base = process.env.AUDIT_SERVICE_URL || 'http://audit-service:3011';
    const ruta = '/pta/api/v1/configuracion/interoperabilidad';
    const entrada = {
      method: 'PUT', url: ruta, path: ruta, module: 'academic-work-plan', submodule: 'interoperabilidad-programacion',
      action: 'cambiar_interoperabilidad', userEmail: actor.email ?? undefined, userRole: actor.roles?.[0] ?? undefined,
      statusCode: 200, responseTimeMs: 0, entityName: 'ConfiguracionSistema', entityId: CLAVE_INTEROPERABILIDAD,
      previousData: anterior, newData: { ...nuevo, motivo, usuario: actor.userId, correo: actor.email },
    };
    try {
      const res = await fetch(`${base}/logs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entrada) });
      if (!res.ok) throw new ConflictException(`audit-service respondió ${res.status}`);
    } catch (e: any) {
      this.logger.error(`No se pudo registrar la auditoría de la interoperabilidad: ${e?.message ?? e}`);
    }
  }
}
