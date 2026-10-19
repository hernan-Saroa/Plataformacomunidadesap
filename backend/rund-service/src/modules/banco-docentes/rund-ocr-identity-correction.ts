import { BadRequestException, ConflictException, Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { AuthIdentityClient } from '../../common/auth-identity.client';
import { AUTH_CORRECTION_FIELDS, AuthCorrectionField, AuthIdentityCorrection, AuthIdentityCorrectionClient, AuthIdentityCorrectionConflict,
  authCorrection, authCorrectionFingerprint } from '../../common/auth-identity-correction.client';
import { recordRundAccess, RundAccessActor } from './rund-access-audit';
import { invalidateEditedEvidence } from './rund-evidence-workflow';
import { EXTRACTION_FIELDS, ageForDate, ageRange, comparable, confirmExtractionSuggestions, extractionValue, extractionValueValidationError } from './rund-extraccion-fields';

const STALE = 'El dato del perfil cambió desde la extracción. Descarte esta sugerencia y vuelva a procesar el documento.';
const NOT_CURRENT = 'La sugerencia ya fue revisada o su PDF dejó de estar vigente. Actualice el expediente.';
const DUPLICATE = 'El número de documento reconocido ya está asociado a otra persona.';
const DOCUMENT_TYPES = ['CC', 'CE', 'PA', 'PEP'];
const LIVE = ['RESERVADA', 'APLICADA_AUTH', 'REVISION'];

interface Journal {
  operacion_id: string; sugerencia_id: string; docente_id: string; persona_id: string; campo: AuthCorrectionField;
  valor_previo: string | null; valor_nuevo: string; huella: string; actor_id: string; ip: string | null; estado: string; intentos: number;
}
const command = (j: Journal): AuthIdentityCorrection => authCorrection({ version: 1, operacionId: j.operacion_id, personaId: j.persona_id, campo: j.campo,
  valorPrevio: j.valor_previo, valorNuevo: j.valor_nuevo, actorId: j.actor_id, sugerenciaId: j.sugerencia_id });

/**
 * Confirmación OCR de un dato de identidad cuyo propietario es Auth (documento, tipo, nombre, género, nacimiento).
 *
 * RUND no escribe en auth.personas. Coordina las dos mitades con un diario durable (rund.identidad_correccion_ocr):
 *   1. Valida y reserva la corrección (RUND, transacción corta, sin tocar Auth).
 *   2. Auth la aplica por API, con ID estable y comparando el valor previo exacto (idempotente).
 *   3. RUND confirma la sugerencia, la auditoría y la evidencia en UNA transacción, junto con el diario.
 *   Si el paso 3 falla, Auth la revierte (compensación); si el servicio cae entre pasos, el reconciliador decide:
 *   nunca queda un cambio en Auth sin su confirmación en RUND.
 * Los campos que no son de identidad siguen por el flujo original.
 */
@Injectable()
export class RundOcrIdentityCorrection implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RundOcrIdentityCorrection.name);
  private timer?: NodeJS.Timeout;
  private reconciling = false;

  constructor(private readonly db: DataSource, private readonly identities: AuthIdentityClient, private readonly auth: AuthIdentityCorrectionClient) {}

  get enabled(): boolean { return this.auth.enabled; }
  handles(field: string): boolean { return this.enabled && (AUTH_CORRECTION_FIELDS as readonly string[]).includes(field); }

  onModuleInit() {
    if (!this.enabled) return;
    this.timer = setInterval(() => void this.reconcile(), Number(process.env.RUND_OCR_IDENTITY_RECONCILE_MS) || 60_000);
    this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  async confirm(docenteId: string, suggestionId: string, actor: RundAccessActor) {
    const [native] = await this.db.query(`SELECT "personaId" FROM rund."Docente" WHERE id::text=$1`, [docenteId]);
    if (!native) throw new BadRequestException('Perfil docente no encontrado.');
    // La lectura va antes de cualquier bloqueo: Auth confirma el valor exacto al aplicar (compare-and-set).
    const ficha = await this.identities.fichaPorPersona(native.personaId);
    if (!ficha) throw new BadRequestException('Perfil docente no encontrado.');

    const prepared = await this.db.transaction(async manager => {
      await manager.query('SELECT id FROM rund."Docente" WHERE id::text=$1 FOR UPDATE', [docenteId]);
      const [s] = await manager.query(`SELECT s.*, j.documento_id, j.id AS trabajo, d.estado AS documento_estado, j.estado AS trabajo_estado
        FROM rund."RundExtraccionSugerencia" s JOIN rund."RundExtraccionTrabajo" j ON j.id=s.trabajo_id
        JOIN rund."RundDocumentoPerfil" d ON d.id=j.documento_id
        WHERE s.id::text=$1 AND j.docente_id::text=$2 FOR UPDATE OF s, d`, [suggestionId, docenteId]);
      if (!s) throw new ConflictException('La sugerencia no pertenece al docente.');
      const [live] = await manager.query(`SELECT * FROM rund.identidad_correccion_ocr WHERE sugerencia_id=$1 AND estado = ANY($2::text[]) FOR UPDATE`, [s.id, LIVE]);
      if (live) {
        if (live.estado === 'REVISION') throw new ConflictException('La corrección de esta sugerencia requiere revisión de soporte.');
        return { journal: live as Journal, suggestion: s, resumed: true, outcome: null };
      }
      if (s.estado !== 'PENDIENTE' || s.documento_estado !== 'ACTIVO' || s.trabajo_estado !== 'COMPLETADO') throw new ConflictException(NOT_CURRENT);
      const value = String(s.valor || '').trim();
      const formatError = extractionValueValidationError(s.campo, value);
      if (formatError) throw new BadRequestException(formatError);
      const source = EXTRACTION_FIELDS[s.campo].source as keyof typeof ficha;
      const rawCurrent = (ficha[source] ?? null) as string | null;
      if (comparable(extractionValue(rawCurrent as any)) !== comparable(s.valor_previo)) throw new ConflictException(STALE);

      if (comparable(s.valor) === comparable(s.valor_previo)) {
        // Coincidencia verificada: no hay nada que escribir en Auth.
        await this.finishInRund(manager, docenteId, s, actor, false);
        return { journal: null, suggestion: s, resumed: false, outcome: { confirmed: true, changed: false, campo: s.campo, valor: s.valor } };
      }

      const newValue = await this.authValue(manager, s, value, ficha);
      const journal: Pick<Journal, 'operacion_id'> & Partial<Journal> = { operacion_id: randomUUID(), sugerencia_id: s.id, docente_id: docenteId, persona_id: ficha.personaId.toLowerCase(),
        campo: s.campo, valor_previo: rawCurrent, valor_nuevo: newValue, actor_id: actor.actorId, ip: actor.ip || null };
      const huella = authCorrectionFingerprint({ version: 1, operacionId: journal.operacion_id, personaId: journal.persona_id!, campo: s.campo,
        valorPrevio: rawCurrent, valorNuevo: newValue, actorId: actor.actorId, sugerenciaId: s.id });
      const [row] = await manager.query(`INSERT INTO rund.identidad_correccion_ocr
        (operacion_id,sugerencia_id,docente_id,persona_id,campo,valor_previo,valor_nuevo,huella,actor_id,ip)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [journal.operacion_id, s.id, docenteId, journal.persona_id, s.campo, rawCurrent, newValue, huella, actor.actorId, actor.ip || null]);
      return { journal: row as Journal, suggestion: s, resumed: false, outcome: null };
    });
    if (prepared.outcome) return prepared.outcome;
    return this.drive(prepared.journal!, docenteId, actor);
  }

  /** Reglas del flujo original por campo; devuelve el valor que Auth debe guardar. */
  private async authValue(manager: any, s: any, value: string, ficha: any): Promise<string> {
    switch (s.campo as AuthCorrectionField) {
      case 'documentNumber': {
        const normalized = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const [sibling] = await manager.query(`SELECT sibling.valor FROM rund."RundExtraccionSugerencia" sibling
          WHERE sibling.trabajo_id=$1 AND sibling.campo='documentType' AND sibling.estado IN ('PENDIENTE','APROBADA','CORREGIDA') LIMIT 1`, [s.trabajo_id]);
        const documentType = String(sibling?.valor || ficha.tip_identificacion || '').trim().toUpperCase();
        if (!DOCUMENT_TYPES.includes(documentType)) throw new BadRequestException('No fue posible determinar un tipo de documento válido para esta sugerencia.');
        if (documentType !== 'PA' && !/^\d{5,20}$/.test(normalized)) {
          throw new BadRequestException(`El número reconocido no es compatible con el tipo ${documentType}; debe contener únicamente dígitos.`);
        }
        return normalized;
      }
      case 'documentType': {
        const type = value.toUpperCase();
        if (!DOCUMENT_TYPES.includes(type)) throw new BadRequestException('El tipo de documento reconocido no es válido.');
        return type;
      }
      case 'genero': {
        const gender = comparable(value) === 'FEMENINO' ? 'F' : comparable(value) === 'MASCULINO' ? 'M' : '';
        if (!gender) throw new BadRequestException('El género reconocido no es válido.');
        return gender;
      }
      case 'fechaNacimiento': {
        const age = ageForDate(value);
        if (!Number.isInteger(age) || age < 18 || age > 100) throw new BadRequestException('La fecha reconocida no corresponde a una edad válida para un docente.');
        return value;
      }
      default:
        return value;
    }
  }

  /** Tramo común de RUND: sugerencia, bitácora, edad de referencia, evidencia y acceso. Se llama dentro de una transacción. */
  private async finishInRund(manager: any, docenteId: string, s: any, actor: RundAccessActor, changed: boolean) {
    const payload = { [s.campo]: String(s.valor || '').trim() };
    const reason = changed ? 'Valor OCR confirmado contra el documento original.' : 'Coincidencia OCR verificada contra el documento original.';
    await confirmExtractionSuggestions(manager, [s], payload, actor.actorId, reason);
    const protectedField = s.campo === 'documentNumber';
    await manager.query(`INSERT INTO rund."RundAprobacionLog"
      (id,docente_id,bloque,accion,actor_id,canal_origen,campo_afectado,dato_previo,dato_nuevo,observacion,soporte_id,ip,metadata,"createdAt")
      VALUES($1,$2,'IDENTIDAD',$3,$4,'OCR_LOCAL',$5,$6,$7,$8,$9,$10,$11::jsonb,NOW())`,
    [randomUUID(), docenteId, changed ? 'APLICAR_SUGERENCIA_OCR' : 'CONFIRMAR_COINCIDENCIA_OCR', actor.actorId, s.campo,
      protectedField ? '[PROTEGIDO]' : String(s.valor_previo || ''), protectedField ? '[PROTEGIDO]' : String(s.valor || ''), reason,
      s.documento_id, actor.ip || null, JSON.stringify({ sugerenciaId: s.id, validacionHumana: true })]);
    await recordRundAccess(manager, { ...actor, endpoint: 'RUND_EXTRACCION_CONFIRMAR', resourceId: s.id, docenteIds: [docenteId], fields: ['DOCUMENTO_IDENTIDAD'] });
    if (changed) {
      if (s.campo === 'fechaNacimiento') {
        const age = ageForDate(String(s.valor).trim());
        await manager.query(`UPDATE rund."Docente" SET "edadReferencia"=$2,"rangoEdad"=$3,"updatedAt"=NOW() WHERE id::text=$1`, [docenteId, age, ageRange(age)]);
      }
      await invalidateEditedEvidence(manager, docenteId, [EXTRACTION_FIELDS[s.campo].source], actor.actorId, actor.ip);
    }
  }

  private conflictFor(error: AuthIdentityCorrectionConflict): Error {
    if (error.code === 'VALOR_PREVIO_CAMBIO') return new ConflictException(STALE);
    if (error.code === 'DOCUMENTO_DUPLICADO') return new ConflictException(DUPLICATE);
    return new ServiceUnavailableException('Auth no pudo aplicar la corrección de identidad.');
  }

  private async setState(operacionId: string, from: string[], to: string, error?: string) {
    await this.db.query(`UPDATE rund.identidad_correccion_ocr SET estado=$3, error_codigo=COALESCE($4,error_codigo), actualizada_en=clock_timestamp()
      WHERE operacion_id=$1 AND estado = ANY($2::text[])`, [operacionId, from, to, error ?? null]);
  }

  private async drive(journal: Journal, docenteId: string, actor: RundAccessActor) {
    if (journal.estado === 'RESERVADA') {
      try {
        await this.auth.aplicar(command(journal));
      } catch (error) {
        if (error instanceof AuthIdentityCorrectionConflict) {
          // Rechazo de negocio: no se aplicó nada, la sugerencia sigue pendiente y puede reintentarse.
          await this.setState(journal.operacion_id, ['RESERVADA'], 'COMPENSADA', error.code);
          throw this.conflictFor(error);
        }
        // Resultado desconocido (caída/timeout): el diario conserva la reserva; reintentar o el reconciliador deciden.
        throw error;
      }
      await this.setState(journal.operacion_id, ['RESERVADA'], 'APLICADA_AUTH');
    }
    try {
      return await this.db.transaction(async manager => {
        const [row] = await manager.query('SELECT estado FROM rund.identidad_correccion_ocr WHERE operacion_id=$1 FOR UPDATE', [journal.operacion_id]);
        if (row?.estado === 'CONFIRMADA') throw new ConflictException(NOT_CURRENT);
        if (row?.estado !== 'APLICADA_AUTH') throw new ConflictException('La corrección fue revertida; repita la confirmación.');
        await manager.query('SELECT id FROM rund."Docente" WHERE id::text=$1 FOR UPDATE', [docenteId]);
        const [s] = await manager.query(`SELECT s.*, j.documento_id, d.estado AS documento_estado, j.estado AS trabajo_estado
          FROM rund."RundExtraccionSugerencia" s JOIN rund."RundExtraccionTrabajo" j ON j.id=s.trabajo_id
          JOIN rund."RundDocumentoPerfil" d ON d.id=j.documento_id
          WHERE s.id=$1 AND j.docente_id::text=$2 FOR UPDATE OF s, d`, [journal.sugerencia_id, docenteId]);
        if (!s || s.estado !== 'PENDIENTE' || s.documento_estado !== 'ACTIVO' || s.trabajo_estado !== 'COMPLETADO') throw new ConflictException(NOT_CURRENT);
        await this.finishInRund(manager, docenteId, s, actor, true);
        await manager.query(`UPDATE rund.identidad_correccion_ocr SET estado='CONFIRMADA', actualizada_en=clock_timestamp() WHERE operacion_id=$1`, [journal.operacion_id]);
        return { confirmed: true, changed: true, campo: s.campo, valor: s.valor };
      });
    } catch (error) {
      // La mitad de RUND no se confirmó: la de Auth se revierte para no dejar un cambio sin respaldo.
      await this.compensate(journal.operacion_id).catch(e => this.logger.warn(`Compensación pendiente de ${journal.operacion_id}: ${e?.message || e}`));
      throw error;
    }
  }

  /** Revierte en Auth una corrección aplicada que RUND no confirmó. Nunca toca una ya CONFIRMADA. */
  private async compensate(operacionId: string) {
    await this.db.transaction(async manager => {
      const [row] = await manager.query('SELECT * FROM rund.identidad_correccion_ocr WHERE operacion_id=$1 FOR UPDATE', [operacionId]);
      if (!row || !['RESERVADA', 'APLICADA_AUTH'].includes(row.estado)) return;
      try {
        const receipt = await this.auth.consultar(operacionId);
        if (!receipt) {
          await manager.query(`UPDATE rund.identidad_correccion_ocr SET estado='COMPENSADA', error_codigo='NO_APLICADA', actualizada_en=clock_timestamp() WHERE operacion_id=$1`, [operacionId]);
          return;
        }
        if (receipt.estado !== 'COMPENSADA') await this.auth.compensar(operacionId, row.huella);
        await manager.query(`UPDATE rund.identidad_correccion_ocr SET estado='COMPENSADA', actualizada_en=clock_timestamp() WHERE operacion_id=$1`, [operacionId]);
      } catch (error) {
        if (error instanceof AuthIdentityCorrectionConflict && error.code === 'CAMBIOS_POSTERIORES') {
          // El dato cambió por otra vía: no se pisa; queda para revisión humana.
          await manager.query(`UPDATE rund.identidad_correccion_ocr SET estado='REVISION', error_codigo='CAMBIOS_POSTERIORES', actualizada_en=clock_timestamp() WHERE operacion_id=$1`, [operacionId]);
          return;
        }
        throw error;
      }
    });
  }

  /** Cierra las correcciones que quedaron a medias (caída entre pasos, respuesta perdida). */
  async reconcile(limit = 20, idleSeconds = Number(process.env.RUND_OCR_IDENTITY_IDLE_SECONDS) || 120): Promise<number> {
    if (!this.enabled || this.reconciling) return 0;
    this.reconciling = true;
    try {
      const claimed: Journal[] = await this.db.transaction(async manager => {
        const rows = await manager.query(`SELECT * FROM rund.identidad_correccion_ocr WHERE estado IN ('RESERVADA','APLICADA_AUTH')
          AND actualizada_en < clock_timestamp() - make_interval(secs => $1) ORDER BY actualizada_en LIMIT $2 FOR UPDATE SKIP LOCKED`, [idleSeconds, limit]);
        if (rows.length) await manager.query(`UPDATE rund.identidad_correccion_ocr SET intentos=intentos+1, actualizada_en=clock_timestamp()
          WHERE operacion_id = ANY($1::uuid[])`, [rows.map((r: Journal) => r.operacion_id)]);
        return rows;
      });
      for (const row of claimed) {
        try { await this.compensate(row.operacion_id); }
        catch (error: any) {
          this.logger.warn(`No se pudo conciliar la corrección ${row.operacion_id}: ${error?.message || error}`);
          if (row.intentos + 1 >= 10) await this.setState(row.operacion_id, ['RESERVADA', 'APLICADA_AUTH'], 'REVISION', 'INTENTOS_AGOTADOS').catch(() => undefined);
        }
      }
      return claimed.length;
    } finally { this.reconciling = false; }
  }
}
