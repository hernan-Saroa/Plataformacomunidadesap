import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { extname } from 'path';
import { DataSource, QueryRunner } from 'typeorm';
import { RundDocumentStorageService } from './rund-document-storage.service';

type DocumentUploadData = {
  categoria: string;
  bloque?: string;
  tipoSoporte?: string;
  descripcion?: string;
};

@Injectable()
export class RundDocumentosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly storage: RundDocumentStorageService,
  ) {}

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
              d.rund_soporte_id,
              (SELECT COUNT(*)::int
                 FROM academic_work_plan."RundDocumentoPerfil" v
                WHERE v.documento_logico_id = d.documento_logico_id) AS total_versiones
       FROM academic_work_plan."RundDocumentoPerfil" d
       JOIN academic_work_plan."RundDocumentoCategoria" c ON c.codigo = d.categoria_codigo
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
    this.validatePdf(file, category);

    if (data.tipoSoporte) {
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

    const id = randomUUID();
    const logicalId = randomUUID();
    const checksum = this.checksum(file!.buffer);
    const stored = await this.storage.store({
      content: file!.buffer,
      documentNumber: docente.document_number,
      category: category.codigo,
      logicalId,
      version: 1,
    });
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
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
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,1,$8,'application/pdf',$9,$10,$11,$12,$13,'ACTIVO',$14,$15,NOW())
         RETURNING *`,
        [
          id, logicalId, docente.id, category.codigo, data.bloque || null,
          data.tipoSoporte || null, this.cleanDescription(data.descripcion), file!.originalname,
          file!.size, checksum, stored.provider, stored.storageId, stored.storagePath,
          soporteId, actorId,
        ],
      );
      await this.insertAudit(runner, {
        docenteId: docente.id,
        bloque: data.bloque || 'DOCUMENTAL',
        accion: 'CARGAR_DOCUMENTO',
        actorId,
        soporteId: id,
        ip,
        metadata: { categoria: category.codigo, version: 1, nombreArchivo: file!.originalname, proveedor: stored.provider },
      });
      await runner.commitTransaction();
      return this.toResponse({ ...created, categoria_nombre: category.nombre, total_versiones: 1 });
    } catch (error) {
      await runner.rollbackTransaction();
      await this.storage.remove(stored.provider, stored.storagePath).catch(() => undefined);
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
  ) {
    const docente = await this.requireDocente(docenteId);
    const current = await this.requireDocument(docente.id, documentId, true);
    const category = await this.requireCategory(current.categoria_codigo);
    this.validatePdf(file, category);
    const nextVersion = Number(current.version) + 1;
    const nextId = randomUUID();
    const stored = await this.storage.store({
      content: file!.buffer,
      documentNumber: docente.document_number,
      category: current.categoria_codigo,
      logicalId: current.documento_logico_id,
      version: nextVersion,
    });
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
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
               nombre_archivo = $3, estado = 'Pendiente', cargado_por = $4
           WHERE id = $5`,
          [nextId, this.contentUrl(docente.id, nextId), file!.originalname, actorId, current.rund_soporte_id],
        );
      }
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
        },
      });
      await runner.commitTransaction();
      return this.toResponse({ ...created, categoria_nombre: category.nombre, total_versiones: nextVersion });
    } catch (error) {
      await runner.rollbackTransaction();
      await this.storage.remove(stored.provider, stored.storagePath).catch(() => undefined);
      throw error;
    } finally {
      await runner.release();
    }
  }

  async remove(docenteId: string, documentId: string, actorId: string, ip?: string) {
    const docente = await this.requireDocente(docenteId);
    const current = await this.requireDocument(docente.id, documentId, true);
    await this.storage.remove(current.proveedor_almacenamiento, current.almacenamiento_ruta);
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query(
        `UPDATE academic_work_plan."RundDocumentoPerfil"
         SET estado = 'ELIMINADO', eliminado_por = $1, eliminado_en = NOW()
         WHERE id = $2 AND estado = 'ACTIVO'`,
        [actorId, current.id],
      );
      if (current.rund_soporte_id) {
        await runner.query(`DELETE FROM academic_work_plan."RundSoporteCampo" WHERE id = $1`, [current.rund_soporte_id]);
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

  async content(docenteId: string, documentId: string) {
    const docente = await this.requireDocente(docenteId);
    const document = await this.requireDocument(docente.id, documentId, false);
    if (document.estado === 'ELIMINADO') throw new NotFoundException('El documento fue eliminado.');
    return {
      buffer: await this.storage.read(document.proveedor_almacenamiento, document.almacenamiento_ruta),
      fileName: document.nombre_archivo,
      mimeType: document.mime_type || 'application/pdf',
    };
  }

  private async requireDocente(identifier: string) {
    const rows = await this.dataSource.query(
      `SELECT d.id, COALESCE(p.num_identificacion, d.id::text) AS document_number
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
    if (existing[0]) {
      await runner.query(
        `UPDATE academic_work_plan."RundSoporteCampo"
         SET bloque = $1, documento_perfil_id = $2, documento_carpeta_id = $3,
             nombre_archivo = $4, estado = 'Pendiente', cargado_por = $5
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
       VALUES ($1,$2,$3,$4,$5,'RUND_DOCUMENTAL',$6,$7,$8::jsonb,NOW())`,
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
    if (['CONTRATOS', 'RESOLUCIONES'].includes(category)) return 'VINCULACION';
    if (category === 'AUTORIZACIONES') return 'TRANSVERSAL';
    return 'ACADEMICO';
  }
}
