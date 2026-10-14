import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { DataSource } from 'typeorm';
import { DocumentoCarpetaDigital } from './documento-carpeta-digital.entity';
import { CarpetaDigital } from './carpeta-digital.entity';
import { carpetaDocumentRevision } from './carpeta-document-revision';

/** Solo documentos generales propios de Auth. Nunca incluye originales ni decisiones de otro dueño. */
@Injectable()
export class RundStateSnapshotService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async snapshot(personaId: string) {
    if (process.env.RUND_CARPETA_SYNC_ENABLED !== 'true') throw new ConflictException('Sincronización de carpeta deshabilitada.');
    return this.db.transaction('REPEATABLE READ', async manager => {
      const [person] = await manager.query('SELECT id_person FROM auth.personas WHERE id_person = $1', [personaId]);
      const [counter] = await manager.query('SELECT revision::text FROM auth.carpeta_revision_rund WHERE persona_id = $1', [personaId]);
      if (!person && !counter) throw new NotFoundException('Persona no registrada en Auth.');
      const documents = await manager.getRepository(DocumentoCarpetaDigital).createQueryBuilder('d')
        .innerJoin(CarpetaDigital, 'c', 'c.id = d.carpetaDigitalId')
        .where('c.persona_id = :personaId', { personaId })
        .andWhere('d.rund_soporte_id IS NULL')
        .andWhere("LOWER(TRIM(d.categoria)) <> 'rund'")
        .andWhere("d.url_archivo !~* '(^|/)(pta|rund)(/|$)'")
        .orderBy('d.id', 'ASC').take(5001).getMany();
      if (documents.length > 5000) throw new ServiceUnavailableException('La carpeta excede el límite del contrato completo.');
      const documentos = documents.map(doc => ({ id: doc.id, revision_documento: carpetaDocumentRevision(doc),
        categoria: doc.categoria, tipo_documento_id: doc.tipoDocumentoId, estado: doc.estado,
        fecha_subida: doc.fechaSubida.toISOString(), fecha_validacion: doc.fechaValidacion?.toISOString() ?? null,
        fecha_vencimiento: doc.fechaVencimiento?.toISOString() ?? null }));
      const deleted = !person;
      return { schema: 1, propietario: 'auth', scope: 'documentos-generales', persona_id: personaId.toLowerCase(),
        revision: counter?.revision ?? '0', complete: true, deleted, total: documentos.length, documentos,
        fingerprint: createHash('sha256').update(JSON.stringify({ deleted, documentos })).digest('hex') };
    });
  }
}
