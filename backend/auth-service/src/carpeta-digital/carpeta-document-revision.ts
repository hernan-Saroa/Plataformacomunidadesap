import { ConflictException } from '@nestjs/common';
import { createHash } from 'crypto';
import { DocumentoCarpetaDigital } from './documento-carpeta-digital.entity';
import { isRundFolderDocument } from './rund-document-access';

/** Precondición de revisión propia de Auth; nunca es identidad, permiso o actor. */
export function carpetaDocumentRevision(doc: DocumentoCarpetaDigital): string | null {
  if (isRundFolderDocument(doc)) return null;
  return createHash('sha256').update(JSON.stringify([
    doc.id, doc.carpetaDigitalId, doc.tipoDocumentoId, doc.nombre, doc.categoria, doc.tipoArchivo,
    String(doc.tamanoBytes ?? 0), doc.urlArchivo, doc.estado, doc.comentarios, doc.validadoPor,
    doc.fechaSubida, doc.fechaValidacion, doc.fechaVencimiento, doc.updatedAt,
  ])).digest('hex');
}

export function assertCarpetaDocumentRevision(doc: DocumentoCarpetaDigital, revision: unknown, required: boolean) {
  // Una revisión general no puede aprobar un documento reclasificado como RUND en otra sesión.
  if (isRundFolderDocument(doc) && revision === undefined) return; // Compatibilidad con su flujo previo.
  if (revision === undefined && !required) return;
  if (typeof revision !== 'string' || !/^[0-9a-f]{64}$/.test(revision) || revision !== carpetaDocumentRevision(doc)) {
    throw new ConflictException('El documento cambió o falta su revisión. Actualice la carpeta y revise el original vigente antes de continuar.');
  }
}
