import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { DataSource, EntityManager } from 'typeorm';
import { DocumentoCarpetaDigital } from './documento-carpeta-digital.entity';
import { isRundFolderDocument } from './rund-document-access';
import { isVersionableLocalUrl, readCarpetaOriginal, storeCarpetaOriginal } from './carpeta-document-storage';

@Injectable()
export class CarpetaDocumentVersionsService {
  constructor(private readonly db: DataSource) {}
  get enabled() { return process.env.CARPETA_DOCUMENT_VERSIONING_ENABLED === 'true'; }
  eligible(doc: DocumentoCarpetaDigital) {
    return this.enabled && !isRundFolderDocument(doc) && isVersionableLocalUrl(doc.urlArchivo);
  }
  private assertEnabled() {
    if (!this.enabled) throw new ConflictException('El historial general está pendiente de habilitar en Auth.');
  }
  async locked<T>(id: string, work: (doc: DocumentoCarpetaDigital, manager: EntityManager) => Promise<T>) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new BadRequestException('Se requiere un documento propio de Auth.');
    }
    return this.db.transaction(async manager => {
      const doc = await manager.getRepository(DocumentoCarpetaDigital).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!doc) throw new NotFoundException('Documento no encontrado.');
      return work(doc, manager);
    });
  }
  private rows(manager: EntityManager, id: string) {
    return manager.query('SELECT * FROM auth.documento_carpeta_version WHERE documento_id=$1 ORDER BY numero_version DESC', [id]);
  }
  private async insert(manager: EntityManager, doc: DocumentoCarpetaDigital, version: number, bytes: Buffer, user: any, restored?: number) {
    const actor = user?.userId || user?.sub;
    const signed = typeof actor === 'string' && /^[0-9a-f-]{36}$/i.test(actor) ? actor : null;
    const rows = await manager.query(`INSERT INTO auth.documento_carpeta_version
      (id_version,documento_id,numero_version,nombre_archivo,url_archivo,tipo_archivo,tamano_bytes,
       checksum_sha256,comentarios,creado_por,fecha_creacion,restaurada_desde_version)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [randomUUID(), doc.id, version, doc.nombre, doc.urlArchivo, doc.tipoArchivo, bytes.length,
      createHash('sha256').update(bytes).digest('hex'), doc.comentarios, signed,
      version === 1 ? doc.fechaSubida : new Date(), restored || null]);
    return rows[0];
  }
  private async current(manager: EntityManager, doc: DocumentoCarpetaDigital) {
    if (!this.eligible(doc)) throw new ConflictException('Este documento requiere el historial de su propietario RUND/PTA o no tiene un original local versionable.');
    const rows = await this.rows(manager, doc.id);
    if (!rows.length) {
      // Captura del original realmente guardado; no se crean versiones con fechas/contenido ficticios.
      return [await this.insert(manager, doc, 1, await readCarpetaOriginal(doc.urlArchivo), undefined)];
    }
    if (rows[0].url_archivo !== doc.urlArchivo) throw new ConflictException('El original cambió fuera del historial. Revise el documento antes de continuar.');
    return rows;
  }
  private dto(row: any, id: string, current: number) {
    return { id: row.id_version, documento_id: id, numero_version: row.numero_version,
      nombre_archivo: row.nombre_archivo, nombre_archivo_storage: row.id_version, tipo_archivo: row.tipo_archivo,
      tamano_bytes: Number(row.tamano_bytes), fecha_creacion: row.fecha_creacion, creado_por: row.creado_por,
      comentarios: row.comentarios, etiqueta: '', checksum_sha256: row.checksum_sha256,
      restaurada_desde_version: row.restaurada_desde_version, es_version_actual: row.numero_version === current };
  }
  async history(id: string) {
    this.assertEnabled();
    return this.locked(id, async (doc, manager) => {
      const rows = await this.current(manager, doc), current = rows[0].numero_version;
      return { documento_id: id, version_actual: current, versiones: rows.map(row => this.dto(row, id, current)),
        permite_restaurar: true, permite_etiquetar: false, permite_eliminar_version: false };
    });
  }
  async download(id: string, versionId: string) {
    this.assertEnabled();
    return this.locked(id, async (doc, manager) => {
      const rows = await this.current(manager, doc), row = rows.find(row => row.id_version === versionId);
      if (!row) throw new NotFoundException('La versión no pertenece a este documento.');
      const bytes = await readCarpetaOriginal(row.url_archivo);
      if (createHash('sha256').update(bytes).digest('hex') !== row.checksum_sha256) throw new ConflictException('El original no coincide con la versión guardada.');
      return { bytes, name: row.nombre_archivo };
    });
  }
  async replace(id: string, file: any, expected: number, comments: string | undefined, user: any, restoredId?: string) {
    this.assertEnabled();
    if (!Number.isInteger(expected) || expected < 1) throw new BadRequestException('Indique la versión actual que desea reemplazar.');
    if (comments != null && (typeof comments !== 'string' || comments.length > 5000)) throw new BadRequestException('Comentarios no válidos.');
    let newPath: string | undefined;
    try {
      return await this.locked(id, async (doc, manager) => {
        const rows = await this.current(manager, doc), current = rows[0].numero_version;
        if (current !== expected) throw new ConflictException('Otra sesión modificó el documento. Actualice su historial.');
        let restored: any;
        if (restoredId) {
          restored = rows.find(row => row.id_version === restoredId);
          if (!restored) throw new NotFoundException('La versión no pertenece a este documento.');
          if (restored.numero_version === current) throw new ConflictException('Esta versión ya es la actual.');
          const bytes = await readCarpetaOriginal(restored.url_archivo);
          if (createHash('sha256').update(bytes).digest('hex') !== restored.checksum_sha256) throw new ConflictException('El original no coincide con la versión guardada.');
          file = { originalname: restored.nombre_archivo, buffer: bytes };
        }
        const folders = await manager.query('SELECT persona_id FROM auth.carpeta_digital WHERE id_carpeta_digital=$1', [doc.carpetaDigitalId]);
        if (!folders[0]) throw new NotFoundException('Carpeta no encontrada.');
        const stored = await storeCarpetaOriginal(folders[0].persona_id, file); newPath = stored.storedPath;
        doc.nombre = file.originalname; doc.urlArchivo = stored.urlArchivo; doc.tipoArchivo = stored.extension;
        doc.tamanoBytes = stored.size; doc.estado = 'pendiente'; doc.fechaValidacion = null; doc.validadoPor = null;
        doc.fechaSubida = new Date(); doc.comentarios = comments || null;
        // Una validación previa no se hereda a los bytes nuevos, incluso al restaurar.
        await manager.getRepository(DocumentoCarpetaDigital).save(doc);
        const row = await this.insert(manager, doc, current + 1, file.buffer, user, restored?.numero_version);
        return { documento_id: id, version_actual: current + 1, version: this.dto(row, id, current + 1), estado: 'pendiente', persistido: true };
      });
    } catch (error) {
      // Solo el archivo creado por esta operación; jamás originales anteriores.
      if (newPath) await fs.unlink(newPath).catch(() => undefined);
      throw error;
    }
  }
}
