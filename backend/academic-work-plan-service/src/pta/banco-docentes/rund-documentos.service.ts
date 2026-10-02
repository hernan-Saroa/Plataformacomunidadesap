import { assertRundEvidenceData } from './rund-evidence-data';
import { lockEvidenceProfile, resetEvidenceBlock, validateEvidenceType } from './rund-evidence-workflow';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { extname } from 'path';
import { DataSource, QueryRunner } from 'typeorm';
import { RundDocumentStorageService } from './rund-document-storage.service';
import { recordRundAccess, RundAccessActor } from './rund-access-audit';
import { RUND_SENSITIVE_FIELDS } from './banco-docentes-sensitive-data';
import { isTechnicalRundSupport, RUND_STANDARD_FOLDERS } from './rund-expediente';
import { readRetentionPolicy, retentionReport, retentionSnapshot } from './rund-retention';
import { rundPrivacyPolicy } from './rund-privacy-policy';
import { requireRundDocumental, rundDocumentalEnabled } from './rund-documental-feature';

type DocumentUploadData = {
  categoria: string;
  bloque?: string;
  tipoSoporte?: string;
  campo?: string;
  descripcion?: string;
};

@Injectable()
export class RundDocumentosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly storage: RundDocumentStorageService,
  ) {}

  configurationStatus() {
    if (!rundDocumentalEnabled()) return { habilitado: false, disposicionAutomatica: false };
    let trd: { estado: string; version?: string };
    try {
      const policy = readRetentionPolicy();
      trd = policy ? { estado: 'CONFIGURADA', version: policy.version } : { estado: 'PENDIENTE_TRD' };
    } catch { trd = { estado: 'CONFIGURACION_INVALIDA' }; }
    let privacidad: string;
    try { privacidad = rundPrivacyPolicy().configurada ? 'CONFIGURADA' : 'PENDIENTE_POLITICA_INSTITUCIONAL'; }
    catch { privacidad = 'CONFIGURACION_INVALIDA'; }
    return { habilitado: true, ...this.storage.configurationStatus(), trd, privacidad, disposicionAutomatica: false };
  }

  private async retentionState(queryable: Pick<DataSource, 'query'>, document: any) {
    const logs = await queryable.query(`SELECT accion, metadata FROM academic_work_plan."RundAprobacionLog"
      WHERE docente_id = $1 AND canal_origen = 'RUND_DOCUMENTAL'
        AND (soporte_id = $2 OR (soporte_id = $3 AND accion IN ('SUSPENDER_RETENCION','LEVANTAR_SUSPENSION')))
      ORDER BY "createdAt" DESC, id DESC`, [document.docente_id, document.id, document.documento_logico_id]);
    const snapshot = logs.find((l: any) => l.metadata?.trd?.estado === 'ASIGNADA')?.metadata.trd || { estado: 'PENDIENTE_TRD' };
    const event = logs.find((l: any) => l.accion === 'REGISTRAR_EVENTO_TRD' && l.metadata?.huellaTrd === snapshot.huella);
    const hold = logs.find((l: any) => ['SUSPENDER_RETENCION', 'LEVANTAR_SUSPENSION'].includes(l.accion));
    return retentionReport(snapshot, event?.metadata?.fechaEvento, hold?.accion === 'SUSPENDER_RETENCION');
  }

  async getRetention(docenteId: string, documentId: string) {
    requireRundDocumental();
    const docente = await this.requireDocente(docenteId);
    const document = await this.requireDocument(docente.id, documentId, false);
    return this.retentionState(this.dataSource, document);
  }

  async manageRetention(docenteId: string, documentId: string, input: any, actorId: string, ip?: string) {
    requireRundDocumental();
    if (!['ASIGNAR_TRD', 'REGISTRAR_EVENTO_TRD', 'SUSPENDER_RETENCION', 'LEVANTAR_SUSPENSION'].includes(input?.accion)
      || typeof input?.motivo !== 'string' || !input.motivo.trim() || input.motivo.length > 1000) {
      throw new BadRequestException('Indique una acción de retención y su motivo (máximo 1000 caracteres).');
    }
    const docente = await this.requireDocente(docenteId);
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      await lockEvidenceProfile(runner, docente.id);
      const document = await this.requireDocument(docente.id, documentId, false);
      const state = await this.retentionState(runner, document);
      const metadata: any = { motivo: input.motivo.trim() };
      if (input.accion === 'ASIGNAR_TRD') {
        metadata.trd = retentionSnapshot(document.categoria_codigo, document.tipo_soporte);
        if (metadata.trd.estado !== 'ASIGNADA') throw new ConflictException('No hay una TRD configurada para este documento.');
      }
      if (input.accion === 'REGISTRAR_EVENTO_TRD') {
        if (state.trd.estado !== 'ASIGNADA') throw new ConflictException('Asigne primero la TRD aprobada.');
        const date = new Date(input.fechaEvento);
        if (typeof input.fechaEvento !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(input.fechaEvento)
          || !Number.isFinite(date.getTime()) || date.getTime() > Date.now()
          || input.evento !== state.trd.regla.eventoInicio) throw new BadRequestException('Evento o fecha de inicio TRD inválidos.');
        Object.assign(metadata, { fechaEvento: date.toISOString(), evento: input.evento, huellaTrd: state.trd.huella });
      }
      const logicalAction = ['SUSPENDER_RETENCION', 'LEVANTAR_SUSPENSION'].includes(input.accion);
      await this.insertAudit(runner, { docenteId: docente.id, bloque: 'DOCUMENTAL', accion: input.accion,
        actorId, ip, soporteId: logicalAction ? document.documento_logico_id : document.id, metadata });
      const result = await this.retentionState(runner, document);
      await runner.commitTransaction();
      return result;
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally { await runner.release(); }
  }

  async ensureExpediente(docenteId: string, actorId: string, ip?: string) {
    requireRundDocumental();
    const docente = await this.requireDocente(docenteId);
    await this.storage.ensureExpediente(docente.persona_id || docente.id);
    await this.insertAudit(this.dataSource as any, {
      docenteId: docente.id, bloque: 'DOCUMENTAL', accion: 'PREPARAR_EXPEDIENTE', actorId, ip,
      metadata: { estructuraVersion: 1, carpetas: RUND_STANDARD_FOLDERS },
    });
    // No expone rutas internas, credenciales ni identificadores de OpenKM.
    return { docenteId: docente.id, preparado: true, estructuraVersion: 1, carpetas: RUND_STANDARD_FOLDERS };
  }

  async listCategories() {
    return this.dataSource.query(
      `SELECT codigo, nombre, descripcion, mime_permitidos, tamano_maximo_bytes, orden
       FROM academic_work_plan."RundDocumentoCategoria"
       WHERE activo = TRUE
       ORDER BY orden, nombre`,
    );
  }

  async list(docenteId: string, categoria?: string, includeHistory = false) {
    const docente = await this.requireDocente(docenteId);
    const params: any[] = [docente.id];
    const filters = ['d.docente_id = $1'];
    if (!includeHistory) filters.push(`d.estado = 'ACTIVO'`);
    if (categoria) {
      params.push(this.normalizeCategory(categoria));
      filters.push(`d.categoria_codigo = $${params.length}`);
    }
    const rows = await this.dataSource.query(
      `SELECT d.id, d.documento_logico_id, d.docente_id, d.categoria_codigo,
              c.nombre AS categoria_nombre, d.bloque, d.tipo_soporte, d.descripcion,
              d.version, d.nombre_archivo, d.mime_type, d.tamano_bytes,
              d.estado, d.creado_por, d.eliminado_por, d.eliminado_en, d."createdAt",
              d.rund_soporte_id, s.estado AS estado_revision, s.observacion AS observacion_revision,
              (SELECT l.actor_id FROM academic_work_plan."RundAprobacionLog" l
               WHERE l.soporte_id = s.id::text AND l.accion IN ('APROBAR_SOPORTE','DEVOLVER_SOPORTE')
               AND l.metadata->>'documentoVersionId' = d.id::text ORDER BY l."createdAt" DESC LIMIT 1) AS revisado_por,
              (SELECT COUNT(*)::int
                 FROM academic_work_plan."RundDocumentoPerfil" v
                WHERE v.documento_logico_id = d.documento_logico_id) AS total_versiones
       FROM academic_work_plan."RundDocumentoPerfil" d
       JOIN academic_work_plan."RundDocumentoCategoria" c ON c.codigo = d.categoria_codigo
       LEFT JOIN academic_work_plan."RundSoporteCampo" s ON s.documento_perfil_id = d.id
       WHERE ${filters.join(' AND ')}
       ORDER BY c.orden, d."createdAt" DESC`,
      params,
    );
    return rows.map((row: any) => this.toResponse(row));
  }

  async create(
    docenteId: string,
    data: DocumentUploadData,
    file: Express.Multer.File | undefined,
    actorId: string,
    ip?: string,
  ) {
    const docente = await this.requireDocente(docenteId);
    const category = await this.requireCategory(data.categoria);
    const technical = isTechnicalRundSupport(data.tipoSoporte);
    if (technical) requireRundDocumental();
    this.validateFile(file, category, technical);
    if (data.tipoSoporte) {
      data = { ...data, bloque: String(data.bloque || this.categoryBlock(category.codigo)).toUpperCase() };
      validateEvidenceType(data.bloque!, data.tipoSoporte!);
    }

    if (data.tipoSoporte && !technical) {
      const existing = await this.dataSource.query(
        `SELECT id FROM academic_work_plan."RundDocumentoPerfil"
         WHERE docente_id = $1 AND tipo_soporte = $2 AND estado = 'ACTIVO'
         LIMIT 1`,
        [docente.id, data.tipoSoporte],
      );
      if (existing[0]) {
        throw new ConflictException('Ya existe un documento vigente para este tipo de soporte. Use la opción Reemplazar.');
      }
    }

    await assertRundEvidenceData(this.dataSource, docente.id, data.tipoSoporte, data.campo);
    const id = randomUUID();
    const logicalId = randomUUID();
    const checksum = this.checksum(file!.buffer);
    const trd = rundDocumentalEnabled() ? retentionSnapshot(category.codigo, data.tipoSoporte) : undefined;
    let commitAttempted = false;
    let stored: Awaited<ReturnType<RundDocumentStorageService['store']>> | undefined;
    const runner = this.dataSource.createQueryRunner();
    try {
      await runner.connect();
      await runner.startTransaction();
      await lockEvidenceProfile(runner, docente.id);
      await assertRundEvidenceData(runner, docente.id, data.tipoSoporte, data.campo);
      if (data.tipoSoporte && !technical) {
        const duplicates = await runner.query(`SELECT id FROM academic_work_plan."RundDocumentoPerfil"
          WHERE docente_id = $1 AND tipo_soporte = $2 AND estado = 'ACTIVO'`, [docente.id, data.tipoSoporte]);
        if (duplicates.length) throw new ConflictException('Ya existe un soporte vigente. Actualice y use Reemplazar.');
      }
      stored = await this.storage.store({
        content: file!.buffer, expedienteId: docente.persona_id || docente.id, documentNumber: docente.document_number,
        category: category.codigo, supportType: data.tipoSoporte,
        logicalId, version: 1, mimeType: file!.mimetype,
      });
      const soporteId = data.tipoSoporte
        ? await this.upsertRundSupport(runner, {
            docenteId: docente.id,
            bloque: data.bloque || this.categoryBlock(category.codigo),
            tipoSoporte: data.tipoSoporte,
            documentId: id,
            fileName: file!.originalname,
            actorId,
          })
        : null;
      const [created] = await runner.query(
        `INSERT INTO academic_work_plan."RundDocumentoPerfil" (
           id, documento_logico_id, docente_id, categoria_codigo, bloque, tipo_soporte,
           descripcion, version, nombre_archivo, mime_type, tamano_bytes, checksum_sha256,
           proveedor_almacenamiento, almacenamiento_id, almacenamiento_ruta, estado,
           rund_soporte_id, creado_por, "createdAt"
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,1,$8,$16,$9,$10,$11,$12,$13,'ACTIVO',$14,$15,NOW())
         RETURNING *`,
        [
          id, logicalId, docente.id, category.codigo, data.bloque || null,
          data.tipoSoporte || null, this.cleanDescription(data.descripcion), file!.originalname,
          file!.size, checksum, stored.provider, stored.storageId, stored.storagePath,
          soporteId, actorId, file!.mimetype,
        ],
      );
      if (soporteId && !technical) await resetEvidenceBlock(runner, docente.id, data.bloque!, actorId);
      await this.insertAudit(runner, {
        docenteId: docente.id,
        bloque: data.bloque || 'DOCUMENTAL',
        accion: 'CARGAR_DOCUMENTO',
        actorId,
        soporteId: id,
        ip,
        metadata: { categoria: category.codigo, version: 1, nombreArchivo: file!.originalname, proveedor: stored.provider, trd },
      });
      commitAttempted = true;
      await runner.commitTransaction();
      return this.toResponse({ ...created, categoria_nombre: category.nombre, total_versiones: 1 });
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      if (stored && !commitAttempted) await this.storage.remove(stored.provider, stored.storagePath).catch(() => undefined);
      throw error;
    } finally {
      await runner.release();
    }
  }

  async replace(
    docenteId: string,
    documentId: string,
    file: Express.Multer.File | undefined,
    actorId: string,
    descripcion?: string,
    ip?: string,
    campo?: string,
  ) {
    const docente = await this.requireDocente(docenteId);
    const current = await this.requireDocument(docente.id, documentId, true);
    this.assertMutableDocument(current);
    const category = await this.requireCategory(current.categoria_codigo);
    this.validatePdf(file, category);
    const nextVersion = Number(current.version) + 1;
    const nextId = randomUUID();
    const trd = rundDocumentalEnabled() ? retentionSnapshot(current.categoria_codigo, current.tipo_soporte) : undefined;
    let commitAttempted = false;
    let stored: Awaited<ReturnType<RundDocumentStorageService['store']>> | undefined;
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await lockEvidenceProfile(runner, docente.id);
      await assertRundEvidenceData(runner, docente.id, current.tipo_soporte, campo);
      const [active] = await runner.query(`SELECT id FROM academic_work_plan."RundDocumentoPerfil" WHERE id = $1 AND estado = 'ACTIVO'`, [current.id]);
      if (!active) throw new ConflictException('El documento fue reemplazado o eliminado. Actualice el listado.');
      stored = await this.storage.store({
        content: file!.buffer,
        expedienteId: docente.persona_id || docente.id,
        documentNumber: docente.document_number,
        category: current.categoria_codigo,
        supportType: current.tipo_soporte,
        logicalId: current.documento_logico_id,
        version: nextVersion,
      });

      await runner.query(
        `UPDATE academic_work_plan."RundDocumentoPerfil" SET estado = 'REEMPLAZADO' WHERE id = $1 AND estado = 'ACTIVO'`,
        [current.id],
      );
      const [created] = await runner.query(
        `INSERT INTO academic_work_plan."RundDocumentoPerfil" (
           id, documento_logico_id, docente_id, categoria_codigo, bloque, tipo_soporte,
           descripcion, version, nombre_archivo, mime_type, tamano_bytes, checksum_sha256,
           proveedor_almacenamiento, almacenamiento_id, almacenamiento_ruta, estado,
           reemplaza_id, rund_soporte_id, creado_por, "createdAt"
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'application/pdf',$10,$11,$12,$13,$14,'ACTIVO',$15,$16,$17,NOW())
         RETURNING *`,
        [
          nextId, current.documento_logico_id, docente.id, current.categoria_codigo,
          current.bloque, current.tipo_soporte,
          this.cleanDescription(descripcion) ?? current.descripcion, nextVersion,
          file!.originalname, file!.size, this.checksum(file!.buffer), stored.provider,
          stored.storageId, stored.storagePath, current.id, current.rund_soporte_id, actorId,
        ],
      );
      if (current.rund_soporte_id) {
        await runner.query(
          `UPDATE academic_work_plan."RundSoporteCampo"
           SET documento_perfil_id = $1, documento_carpeta_id = $2,
               nombre_archivo = $3, estado = 'Pendiente', observacion = NULL, revisiones_campos = '{}'::jsonb, cargado_por = $4
           WHERE id = $5`,
          [nextId, this.contentUrl(docente.id, nextId), file!.originalname, actorId, current.rund_soporte_id],
        );
      }
      if (current.rund_soporte_id) await resetEvidenceBlock(runner, docente.id, current.bloque, actorId);
      await this.insertAudit(runner, {
        docenteId: docente.id,
        bloque: current.bloque || 'DOCUMENTAL',
        accion: 'REEMPLAZAR_DOCUMENTO',
        actorId,
        soporteId: nextId,
        ip,
        metadata: {
          categoria: current.categoria_codigo,
          documentoAnteriorId: current.id,
          versionAnterior: current.version,
          versionNueva: nextVersion,
          nombreArchivo: file!.originalname,
          proveedor: stored.provider,
          trd,
        },
      });
      commitAttempted = true;
      await runner.commitTransaction();
      return this.toResponse({ ...created, categoria_nombre: category.nombre, total_versiones: nextVersion });
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      if (stored && !commitAttempted) await this.storage.remove(stored.provider, stored.storagePath).catch(() => undefined);
      throw error;
    } finally {
      await runner.release();
    }
  }

  async remove(docenteId: string, documentId: string, actorId: string, ip?: string) {
    const docente = await this.requireDocente(docenteId);
    const current = await this.requireDocument(docente.id, documentId, true);
    this.assertMutableDocument(current);
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await lockEvidenceProfile(runner, docente.id);
      const [active] = await runner.query(`SELECT id FROM academic_work_plan."RundDocumentoPerfil" WHERE id = $1 AND estado = 'ACTIVO'`, [current.id]);
      if (!active) throw new ConflictException('El documento ya cambió. Actualice el listado.');

      await runner.query(
        `UPDATE academic_work_plan."RundDocumentoPerfil"
         SET estado = 'ELIMINADO', eliminado_por = $1, eliminado_en = NOW()
         WHERE id = $2 AND estado = 'ACTIVO'`,
        [actorId, current.id],
      );
      if (current.rund_soporte_id) {
        await runner.query(`DELETE FROM academic_work_plan."RundSoporteCampo" WHERE id = $1 AND documento_perfil_id = $2`, [current.rund_soporte_id, current.id]);
        await resetEvidenceBlock(runner, docente.id, current.bloque, actorId, true);
      }
      await this.insertAudit(runner, {
        docenteId: docente.id,
        bloque: current.bloque || 'DOCUMENTAL',
        accion: 'ELIMINAR_DOCUMENTO',
        actorId,
        soporteId: current.id,
        ip,
        metadata: { categoria: current.categoria_codigo, version: current.version, nombreArchivo: current.nombre_archivo },
      });
      await runner.commitTransaction();
      return { id: current.id, eliminado: true };
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async content(docenteId: string, documentId: string, actor: RundAccessActor = { actorId: 'NO_AUTENTICADO', roles: [], fullAccess: false }) {
    const docente = await this.requireDocente(docenteId);
    const document = await this.requireDocument(docente.id, documentId, false);
    if (document.estado === 'ELIMINADO') throw new NotFoundException('El documento fue eliminado.');
    await recordRundAccess(this.dataSource, { ...actor, endpoint: 'CONSULTAR_ORIGINAL_PERFIL',
      resourceId: document.id, docenteIds: [docente.id], fields: RUND_SENSITIVE_FIELDS,
      result: actor.fullAccess ? 'COMPLETO' : 'DENEGADO',
    });
    if (!actor.fullAccess) throw new ForbiddenException('El documento original puede contener datos sensibles y está restringido para su rol.');
    return {
      buffer: await this.storage.read(document.proveedor_almacenamiento, document.almacenamiento_ruta),
      fileName: document.nombre_archivo,
      mimeType: document.mime_type || 'application/pdf',
    };
  }

  protectMetadata<T extends { nombreArchivo?: string; descripcion?: string | null; contenidoUrl?: string }>(document: T, fullAccess: boolean) {
    return { ...document,
      nombreArchivo: fullAccess ? document.nombreArchivo : 'Documento del perfil.pdf',
      descripcion: fullAccess ? document.descripcion : null,
      contenidoUrl: fullAccess ? document.contenidoUrl : null,
      contenidoRestringido: !fullAccess,
    };
  }

  private async requireDocente(identifier: string) {
    const rows = await this.dataSource.query(
      `SELECT d.id, d."personaId" AS persona_id, COALESCE(p.num_identificacion, d.id::text) AS document_number
       FROM academic_work_plan."Docente" d
       LEFT JOIN auth.personas p ON p.id_person = d."personaId"
       WHERE d.id::text = $1 OR d."personaId"::text = $1 OR p.num_identificacion = $1
       ORDER BY d."updatedAt" DESC NULLS LAST
       LIMIT 1`,
      [identifier],
    );
    if (!rows[0]) throw new NotFoundException('Perfil docente no encontrado.');
    return rows[0];
  }

  private async requireCategory(rawCategory: string) {
    const category = this.normalizeCategory(rawCategory);
    const rows = await this.dataSource.query(
      `SELECT codigo, nombre, mime_permitidos, tamano_maximo_bytes
       FROM academic_work_plan."RundDocumentoCategoria"
       WHERE codigo = $1 AND activo = TRUE`,
      [category],
    );
    if (!rows[0]) throw new BadRequestException('La categoría documental no existe o está inactiva.');
    return rows[0];
  }

  private async requireDocument(docenteId: string, documentId: string, mustBeActive: boolean) {
    const rows = await this.dataSource.query(
      `SELECT * FROM academic_work_plan."RundDocumentoPerfil"
       WHERE id = $1 AND docente_id = $2 ${mustBeActive ? `AND estado = 'ACTIVO'` : ''}
       LIMIT 1`,
      [documentId, docenteId],
    );
    if (!rows[0]) throw new NotFoundException('Documento no encontrado en este perfil.');
    return rows[0];
  }

  private validatePdf(file: Express.Multer.File | undefined, category: any) {
    if (!file) throw new BadRequestException('Debe adjuntar un archivo PDF.');
    const allowedMimes: string[] = Array.isArray(category.mime_permitidos)
      ? category.mime_permitidos
      : ['application/pdf'];
    const extension = extname(file.originalname || '').toLowerCase();
    const hasPdfSignature = file.buffer?.subarray(0, 5).toString('ascii') === '%PDF-';
    if (extension !== '.pdf' || !allowedMimes.includes(file.mimetype) || !hasPdfSignature) {
      throw new BadRequestException('Archivo no permitido. Solo se aceptan documentos PDF válidos.');
    }
    const configuredMax = Number(process.env.RUND_DOCUMENT_MAX_SIZE_BYTES || category.tamano_maximo_bytes || 10 * 1024 * 1024);
    const categoryMax = Number(category.tamano_maximo_bytes || configuredMax);
    const maxSize = Math.min(configuredMax, categoryMax);
    if (!Number.isFinite(maxSize) || file.size > maxSize) {
      throw new BadRequestException(`El documento supera el tamaño máximo permitido de ${Math.floor(maxSize / 1024 / 1024)} MB.`);
    }
  }

  private assertMutableDocument(document: any): void {
    if (isTechnicalRundSupport(document.tipo_soporte)) {
      throw new ConflictException('El soporte de una edición o cambio de estado se conserva como evidencia. Cargue otro soporte desde la gestión del perfil.');
    }
  }

  private validateFile(file: Express.Multer.File | undefined, category: any, technical: boolean): void {
    if (!technical || file?.mimetype === 'application/pdf') return this.validatePdf(file, category);
    const content = file?.buffer;
    const extension = extname(file?.originalname || '').toLowerCase();
    const jpeg = file?.mimetype === 'image/jpeg' && ['.jpg', '.jpeg'].includes(extension)
      && content?.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
    const png = file?.mimetype === 'image/png' && extension === '.png'
      && content?.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const max = Math.min(10 * 1024 * 1024, Number(process.env.RUND_DOCUMENT_MAX_SIZE_BYTES || category.tamano_maximo_bytes || 10 * 1024 * 1024));
    if ((!jpeg && !png) || !file || !Number.isFinite(max) || file.size > max) {
      throw new BadRequestException('El soporte del perfil debe ser PDF, JPG o PNG válido y respetar el tamaño máximo permitido (hasta 10 MB).');
    }
  }

  private async upsertRundSupport(runner: QueryRunner, input: {
    docenteId: string;
    bloque: string;
    tipoSoporte: string;
    documentId: string;
    fileName: string;
    actorId: string;
  }): Promise<string> {
    const existing = await runner.query(
      `SELECT id FROM academic_work_plan."RundSoporteCampo"
       WHERE docente_id = $1 AND tipo_soporte = $2 ORDER BY "createdAt" DESC LIMIT 1`,
      [input.docenteId, input.tipoSoporte],
    );
    const contentUrl = this.contentUrl(input.docenteId, input.documentId);
    if (existing[0] && !isTechnicalRundSupport(input.tipoSoporte)) {
      await runner.query(
        `UPDATE academic_work_plan."RundSoporteCampo"
         SET bloque = $1, documento_perfil_id = $2, documento_carpeta_id = $3,
             nombre_archivo = $4, estado = 'Pendiente', observacion = NULL, cargado_por = $5
         WHERE id = $6`,
        [input.bloque, input.documentId, contentUrl, input.fileName, input.actorId, existing[0].id],
      );
      return existing[0].id;
    }
    const soporteId = randomUUID();
    await runner.query(
      `INSERT INTO academic_work_plan."RundSoporteCampo"
       (id, docente_id, bloque, tipo_soporte, documento_perfil_id, documento_carpeta_id,
        nombre_archivo, estado, cargado_por, "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Pendiente',$8,NOW())`,
      [soporteId, input.docenteId, input.bloque, input.tipoSoporte, input.documentId, contentUrl, input.fileName, input.actorId],
    );
    return soporteId;
  }

  private async insertAudit(runner: QueryRunner, entry: any) {
    await runner.query(
      `INSERT INTO academic_work_plan."RundAprobacionLog"
       (id, docente_id, bloque, accion, actor_id, canal_origen, soporte_id, ip, metadata, "createdAt")
       VALUES ($1,$2,$3,$4,$5,'RUND_DOCUMENTAL',$6,$7,$8::jsonb,clock_timestamp())`,
      [randomUUID(), entry.docenteId, entry.bloque, entry.accion, entry.actorId, entry.soporteId, entry.ip || null, JSON.stringify(entry.metadata || {})],
    );
  }

  private toResponse(row: any) {
    return {
      id: row.id,
      documentoLogicoId: row.documento_logico_id,
      docenteId: row.docente_id,
      categoria: row.categoria_codigo,
      categoriaNombre: row.categoria_nombre || row.categoria_codigo,
      bloque: row.bloque,
      tipoSoporte: row.tipo_soporte,
      soporteGestion: isTechnicalRundSupport(row.tipo_soporte),
      descripcion: row.descripcion,
      version: Number(row.version),
      totalVersiones: Number(row.total_versiones || row.version || 1),
      nombreArchivo: row.nombre_archivo,
      mimeType: row.mime_type,
      tamanoBytes: Number(row.tamano_bytes || 0),
      estado: row.estado,
      creadoPor: row.creado_por,
      creadoEn: row.createdAt,
      eliminadoPor: row.eliminado_por,
      eliminadoEn: row.eliminado_en,
      contenidoUrl: this.contentUrl(row.docente_id, row.id),
      rundSoporteId: row.rund_soporte_id,
      estadoRevision: row.estado_revision || null,
      observacionRevision: row.observacion_revision || null,
      revisadoPor: row.revisado_por || null,
    };
  }

  private contentUrl(docenteId: string, documentId: string) {
    return `/pta/api/v1/pta/banco-docentes/${docenteId}/documentos/${documentId}/contenido`;
  }

  private checksum(content: Buffer) {
    return createHash('sha256').update(content).digest('hex');
  }

  private normalizeCategory(value: string) {
    return String(value || '').trim().toUpperCase();
  }

  private cleanDescription(value?: string): string | null {
    const clean = String(value || '').trim();
    return clean ? clean.slice(0, 1000) : null;
  }

  private categoryBlock(category: string) {
    if (category === 'IDENTIDAD') return 'IDENTIDAD';
    if (category === 'TITULOS') return 'FORMACION';
    if (['CONTRATOS', 'RESOLUCIONES', 'ACTOS_ADMINISTRATIVOS'].includes(category)) return 'VINCULACION';
    if (category === 'AUTORIZACIONES') return 'TRANSVERSAL';
    return 'ACADEMICO';
  }
}
