import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource, QueryRunner } from 'typeorm';
import { lockEvidenceProfile } from './rund-evidence-workflow';
import {
  CICLO_ACCIONES_AUDITORIA, CICLO_TIPO_SOPORTE, ESTADOS_RECATEGORIZACION, RESULTADOS_INCORPORACION,
  cicloDocenteInfo, decisionIncorporacionPermitida, etapaCicloDocente, recategorizacionPermitida,
  validarDecisionIncorporacion, validarDecisionRecategorizacion, validarRecategorizacion, validarRevisionRecategorizacion,
  type DecisionComiteIncorporacion,
} from './rund-ciclo-docente';

type Db = Pick<QueryRunner, 'query'>;
type Cambios = Record<string, { anterior: unknown; nuevo: unknown }>;

interface Actor { actorId: string; ip?: string }

/**
 * HU 2349 — Decisión del comité para la incorporación y recategorización del docente.
 * Cada operación corre en una transacción con el perfil bloqueado y deja su rastro en RundAprobacionLog.
 */
export class RundCicloDocente {
  constructor(private readonly db: DataSource) {}

  private async transaction<T>(docenteId: string, work: (runner: QueryRunner, docente: any) => Promise<T>): Promise<T> {
    const runner = this.db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const result = await work(runner, await lockEvidenceProfile(runner, docenteId));
      await runner.commitTransaction();
      return result;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  private assertPeriodo(docente: any, requested: unknown) {
    if (requested && String(requested) !== String(docente.periodoCarga || '')) {
      throw new BadRequestException('La operación solo puede aplicarse al perfil del periodo seleccionado.');
    }
  }

  /** El soporte debe existir, ser del docente, estar cargado y no devuelto. */
  private async loadSupports(runner: Db, docenteId: string, ids: string[]): Promise<Array<{ id: string; nombre_archivo: string | null }>> {
    const rows: Array<{ id: string; nombre_archivo: string | null }> = await runner.query(
      `SELECT id::text AS id, nombre_archivo FROM academic_work_plan."RundSoporteCampo"
       WHERE id::text = ANY($1::text[]) AND docente_id::text = $2 AND tipo_soporte = $3
         AND documento_carpeta_id IS NOT NULL AND COALESCE(estado, '') <> 'Rechazado'`,
      [ids, docenteId, CICLO_TIPO_SOPORTE],
    );
    const found = new Set(rows.map((row) => row.id));
    if (ids.some((id) => !found.has(id))) {
      throw new BadRequestException('Un soporte no existe o no pertenece al perfil docente.');
    }
    return rows;
  }

  private async audit(runner: Db, entry: {
    docenteId: string; bloque: string; accion: string; actor: Actor; cambios?: Cambios;
    observacion?: string | null; soporteId?: string | null; metadata?: Record<string, unknown>;
  }) {
    const keys = Object.keys(entry.cambios || {});
    const single = keys.length === 1 ? entry.cambios![keys[0]] : null;
    const text = (value: unknown) => (value === null || value === undefined ? null : String(value));
    await runner.query(
      `INSERT INTO academic_work_plan."RundAprobacionLog"
       (id, docente_id, bloque, accion, actor_id, canal_origen, campo_afectado, dato_previo, dato_nuevo,
        observacion, soporte_id, ip, metadata, "createdAt")
       VALUES ($1,$2,$3,$4,$5,'MODAL',$6,$7,$8,$9,$10,$11,$12::jsonb,NOW())`,
      [
        randomUUID(), entry.docenteId, entry.bloque, entry.accion, entry.actor.actorId,
        keys.join(', ') || null, single ? text(single.anterior) : null, single ? text(single.nuevo) : null,
        entry.observacion || null, entry.soporteId || null, entry.actor.ip || null,
        JSON.stringify({ ...(entry.metadata || {}), ...(entry.cambios ? { cambios: entry.cambios } : {}) }),
      ],
    );
  }

  /* ─────────────── CA-01: decisión del comité → Apto para incorporación / Activo ─────────────── */

  async registrarDecisionIncorporacion(docenteId: string, body: any, actor: Actor) {
    const entrada = validarDecisionIncorporacion(body);
    return this.transaction(docenteId, async (runner, docente) => {
      this.assertPeriodo(docente, body?.periodoCarga);
      const previa: DecisionComiteIncorporacion | null = docente.decisionComiteIncorporacion || null;
      const estadoActual = String(docente.estado || 'ACTIVO').toUpperCase() === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO';

      // Reenvío idéntico (doble clic o reintento): ya está registrado, no se duplica ni la decisión ni el historial.
      if (previa && previa.resultado === entrada.resultado && previa.fechaComite === entrada.fechaComite
        && previa.soporteId === entrada.soporteId && (previa.motivo ?? null) === entrada.motivo
        && (previa.observacion ?? null) === entrada.observacion) {
        return { id: docenteId, resultado: previa.resultado, estado: estadoActual, ciclo: cicloDocenteInfo({ estado: estadoActual, estadoAprobacion: docente.estadoAprobacion, decision: previa }) };
      }
      if (previa?.resultado === 'FAVORABLE') {
        throw new ConflictException('El docente ya tiene la decisión favorable del comité. Para cambiar su estado use activar o inactivar.');
      }
      const etapa = etapaCicloDocente({ estado: estadoActual, estadoAprobacion: docente.estadoAprobacion, decision: previa });
      const bloqueo = decisionIncorporacionPermitida({ etapa, previa });
      if (bloqueo) throw new BadRequestException(bloqueo);

      const [soporte] = await this.loadSupports(runner, docenteId, [entrada.soporteId]);
      const decision: DecisionComiteIncorporacion = {
        resultado: entrada.resultado,
        resultadoEtiqueta: RESULTADOS_INCORPORACION[entrada.resultado],
        fechaComite: entrada.fechaComite,
        motivo: entrada.motivo,
        observacion: entrada.observacion,
        soporteId: entrada.soporteId,
        soporteNombre: soporte.nombre_archivo ?? null,
        registradoPor: actor.actorId,
        registradoEn: new Date().toISOString(),
        estadoAnterior: estadoActual,
      };
      await runner.query(
        `UPDATE academic_work_plan."Docente" SET "decisionComiteIncorporacion" = $2::jsonb, estado = $3, "updatedAt" = NOW() WHERE id::text = $1`,
        [docenteId, JSON.stringify(decision), entrada.resultado === 'FAVORABLE' ? 'ACTIVO' : estadoActual],
      );
      const etapaNueva = etapaCicloDocente({ estado: 'ACTIVO', estadoAprobacion: docente.estadoAprobacion, decision });
      const cambios: Cambios = { ETAPA_DOCENTE: { anterior: cicloDocenteInfo({ estado: estadoActual, estadoAprobacion: docente.estadoAprobacion, decision: previa }).etapaEtiqueta, nuevo: cicloDocenteInfo({ estado: 'ACTIVO', estadoAprobacion: docente.estadoAprobacion, decision }).etapaEtiqueta } };
      await this.audit(runner, {
        docenteId, bloque: 'GENERAL', accion: CICLO_ACCIONES_AUDITORIA.COMITE_INCORPORACION, actor, cambios,
        observacion: entrada.motivo || entrada.observacion, soporteId: entrada.soporteId,
        metadata: {
          resultado: entrada.resultado, resultadoEtiqueta: decision.resultadoEtiqueta, fechaComite: entrada.fechaComite,
          motivo: entrada.motivo, observacion: entrada.observacion, soporteNombre: decision.soporteNombre,
          periodoCarga: docente.periodoCarga || null, correccion: Boolean(previa),
        },
      });
      return {
        id: docenteId, resultado: entrada.resultado, estado: entrada.resultado === 'FAVORABLE' ? 'ACTIVO' : estadoActual,
        ciclo: cicloDocenteInfo({ estado: entrada.resultado === 'FAVORABLE' ? 'ACTIVO' : estadoActual, estadoAprobacion: docente.estadoAprobacion, decision }),
        etapa: etapaNueva,
      };
    });
  }

  /* ─────────────── CA-03: recategorización ─────────────── */

  async listarRecategorizaciones(docenteId: string) {
    const rows = await this.db.query(
      `SELECT id::text AS id, estado, justificacion, propuesta, soporte_ids, revision, decision_comite, aplicado, creado_por,
              "createdAt", "updatedAt"
       FROM academic_work_plan."RundRecategorizacion" WHERE docente_id::text = $1 ORDER BY "createdAt" DESC, id DESC`,
      [docenteId],
    );
    return rows.map((row: any) => this.presentar(row));
  }

  private presentar(row: any) {
    return {
      id: row.id,
      estado: row.estado,
      estadoEtiqueta: (ESTADOS_RECATEGORIZACION as Record<string, string>)[row.estado] || row.estado,
      justificacion: row.justificacion,
      propuesta: row.propuesta || {},
      soporteIds: row.soporte_ids || [],
      revision: row.revision || null,
      decisionComite: row.decision_comite || null,
      aplicado: row.aplicado || null,
      creadoPor: row.creado_por,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async iniciarRecategorizacion(docenteId: string, body: any, actor: Actor) {
    const entrada = validarRecategorizacion(body);
    return this.transaction(docenteId, async (runner, docente) => {
      this.assertPeriodo(docente, body?.periodoCarga);
      const [abierta] = await runner.query(
        `SELECT 1 AS abierta FROM academic_work_plan."RundRecategorizacion" WHERE docente_id::text = $1 AND estado IN ('EN_REVISION','EN_COMITE') LIMIT 1`,
        [docenteId],
      );
      const bloqueo = recategorizacionPermitida({ estado: docente.estado, abierta: Boolean(abierta) });
      if (bloqueo) throw new BadRequestException(bloqueo);
      const soportes = await this.loadSupports(runner, docenteId, entrada.soporteIds);

      const id = randomUUID();
      await runner.query(
        `INSERT INTO academic_work_plan."RundRecategorizacion"
         (id, docente_id, estado, justificacion, propuesta, soporte_ids, creado_por, "createdAt", "updatedAt")
         VALUES ($1,$2,'EN_REVISION',$3,$4::jsonb,$5::jsonb,$6,NOW(),NOW())`,
        [id, docenteId, entrada.justificacion, JSON.stringify(entrada.propuesta), JSON.stringify(entrada.soporteIds), actor.actorId],
      );
      // La información vigente NO se toca: solo queda constancia de la solicitud.
      await this.audit(runner, {
        docenteId, bloque: 'VINCULACION', accion: CICLO_ACCIONES_AUDITORIA.RECATEGORIZACION_INICIAR, actor,
        observacion: entrada.justificacion, soporteId: entrada.soporteIds[0],
        metadata: {
          recategorizacionId: id, propuesta: entrada.propuesta, soportes: soportes.map((s) => ({ id: s.id, nombre: s.nombre_archivo })),
          vigente: { escalafon: docente.escalafon ?? null, puntajeSalarial: docente.puntajeSalarial ?? null },
          periodoCarga: docente.periodoCarga || null,
        },
      });
      const [row] = await runner.query(`SELECT *, id::text AS id FROM academic_work_plan."RundRecategorizacion" WHERE id::text = $1`, [id]);
      return this.presentar(row);
    });
  }

  private async cargarAbierta(runner: Db, docenteId: string, recategorizacionId: string) {
    const [row] = await runner.query(
      `SELECT *, id::text AS id FROM academic_work_plan."RundRecategorizacion" WHERE id::text = $1 AND docente_id::text = $2 FOR UPDATE`,
      [recategorizacionId, docenteId],
    );
    if (!row) throw new NotFoundException('Recategorización no encontrada para este docente.');
    return row;
  }

  /** Revisión de los soportes por el responsable operativo del GGP: cumple → comité; no cumple → rechazada con motivo. */
  async revisarRecategorizacion(docenteId: string, recategorizacionId: string, body: any, actor: Actor) {
    const entrada = validarRevisionRecategorizacion(body);
    return this.transaction(docenteId, async (runner, docente) => {
      const row = await this.cargarAbierta(runner, docenteId, recategorizacionId);
      if (row.estado !== 'EN_REVISION') throw new ConflictException(`La recategorización ya no está en revisión (${row.estado}).`);
      const nuevoEstado = entrada.resultado === 'CUMPLE' ? 'EN_COMITE' : 'RECHAZADA';
      const revision = { resultado: entrada.resultado, observacion: entrada.observacion, revisadoPor: actor.actorId, revisadoEn: new Date().toISOString() };
      await runner.query(
        `UPDATE academic_work_plan."RundRecategorizacion" SET estado = $2, revision = $3::jsonb, "updatedAt" = NOW() WHERE id::text = $1`,
        [recategorizacionId, nuevoEstado, JSON.stringify(revision)],
      );
      await this.audit(runner, {
        docenteId, bloque: 'VINCULACION', accion: CICLO_ACCIONES_AUDITORIA.RECATEGORIZACION_REVISAR, actor,
        cambios: { RECATEGORIZACION: { anterior: ESTADOS_RECATEGORIZACION.EN_REVISION, nuevo: (ESTADOS_RECATEGORIZACION as Record<string, string>)[nuevoEstado] } },
        observacion: entrada.observacion,
        metadata: { recategorizacionId, resultado: entrada.resultado, periodoCarga: docente.periodoCarga || null },
      });
      const [fresh] = await runner.query(`SELECT *, id::text AS id FROM academic_work_plan."RundRecategorizacion" WHERE id::text = $1`, [recategorizacionId]);
      return this.presentar(fresh);
    });
  }

  /** Decisión del comité: solo aquí cambia la información vigente (escalafón y puntaje), y con la propuesta ya revisada. */
  async decidirRecategorizacion(docenteId: string, recategorizacionId: string, body: any, actor: Actor) {
    const entrada = validarDecisionRecategorizacion(body);
    return this.transaction(docenteId, async (runner, docente) => {
      const row = await this.cargarAbierta(runner, docenteId, recategorizacionId);
      if (row.estado !== 'EN_COMITE') {
        throw new ConflictException(row.estado === 'EN_REVISION'
          ? 'Los soportes aún no fueron revisados: registre la revisión antes de pasar al comité.'
          : `La recategorización ya fue resuelta (${row.estado}).`);
      }
      const [soporte] = await this.loadSupports(runner, docenteId, [entrada.soporteId]);
      const aprobada = entrada.resultado === 'APROBADA';
      const propuesta = row.propuesta || {};
      const vigente = { escalafon: docente.escalafon ?? null, puntajeSalarial: docente.puntajeSalarial ?? null };
      const cambios: Cambios = {};
      if (aprobada) {
        if ((vigente.escalafon ?? null) !== (propuesta.escalafon ?? null)) cambios.ESCALAFON = { anterior: vigente.escalafon, nuevo: propuesta.escalafon ?? null };
        if (propuesta.puntajeSalarial !== null && propuesta.puntajeSalarial !== undefined
          && Number(vigente.puntajeSalarial) !== Number(propuesta.puntajeSalarial)) {
          cambios.PUNTAJE_SALARIAL = { anterior: vigente.puntajeSalarial, nuevo: propuesta.puntajeSalarial };
        }
        await runner.query(
          `UPDATE academic_work_plan."Docente" SET escalafon = $2, "puntajeSalarial" = COALESCE($3::float, "puntajeSalarial"), "updatedAt" = NOW() WHERE id::text = $1`,
          [docenteId, propuesta.escalafon, propuesta.puntajeSalarial ?? null],
        );
      }
      const decisionComite = {
        resultado: entrada.resultado, fechaComite: entrada.fechaComite, motivo: entrada.motivo,
        soporteId: entrada.soporteId, soporteNombre: soporte.nombre_archivo ?? null,
        registradoPor: actor.actorId, registradoEn: new Date().toISOString(),
      };
      await runner.query(
        `UPDATE academic_work_plan."RundRecategorizacion" SET estado = $2, decision_comite = $3::jsonb, aplicado = $4::jsonb, "updatedAt" = NOW() WHERE id::text = $1`,
        [recategorizacionId, entrada.resultado, JSON.stringify(decisionComite), aprobada ? JSON.stringify({ anterior: vigente, nuevo: propuesta }) : null],
      );
      await this.audit(runner, {
        docenteId, bloque: 'VINCULACION', accion: CICLO_ACCIONES_AUDITORIA.RECATEGORIZACION_DECIDIR, actor,
        cambios: aprobada && Object.keys(cambios).length ? cambios : { RECATEGORIZACION: { anterior: ESTADOS_RECATEGORIZACION.EN_COMITE, nuevo: (ESTADOS_RECATEGORIZACION as Record<string, string>)[entrada.resultado] } },
        observacion: entrada.motivo || row.justificacion, soporteId: entrada.soporteId,
        metadata: { recategorizacionId, resultado: entrada.resultado, fechaComite: entrada.fechaComite, motivo: entrada.motivo, soporteNombre: soporte.nombre_archivo ?? null, justificacion: row.justificacion, periodoCarga: docente.periodoCarga || null },
      });
      const [fresh] = await runner.query(`SELECT *, id::text AS id FROM academic_work_plan."RundRecategorizacion" WHERE id::text = $1`, [recategorizacionId]);
      return this.presentar(fresh);
    });
  }
}
