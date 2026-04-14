import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLegalAutoDto } from '../dtos/create-legal-auto.dto';
import { RegisterNotificationDto } from '../dtos/register-notification.dto';
import { ReviewAction, ReviewAutoDto } from '../dtos/review-auto.dto';
import { AutoVersion } from '../entities/auto-version.entity';
import { TipoAlerta } from '../entities/alerta-enviada.entity';
import { DisciplinaryProcessActuacion } from '../entities/disciplinary-process-actuacion.entity';
import {
  AutoStatus,
  AutoType,
  LegalAuto,
} from '../entities/legal-auto.entity';
import {
  ProcessStage,
  ProcessStatus,
} from '../entities/disciplinary-process.entity';
import { SystemConfiguration } from '../entities/system-configuration.entity';
import { AlertasService } from './alertas.service';
import { DocumentConversionService } from './document-conversion.service';
import { PdfModifierService } from './pdf-modifier.service';
import { ProcessService } from './process.service';
import { SequenceService } from './sequence.service';

const APERTURA_TYPES = [
  AutoType.AUTO_APERTURA,
  AutoType.AUTO_APERTURA_INVESTIGACION,
  AutoType.AUTO_APERTURA_INDAGACION,
];

@Injectable()
export class AutoService {
  constructor(
    @InjectRepository(LegalAuto)
    private autoRepository: Repository<LegalAuto>,
    @InjectRepository(AutoVersion)
    private versionRepository: Repository<AutoVersion>,
    @InjectRepository(SystemConfiguration)
    private configRepository: Repository<SystemConfiguration>,
    @InjectRepository(DisciplinaryProcessActuacion)
    private actuacionesRepository: Repository<DisciplinaryProcessActuacion>,
    private processService: ProcessService,
    private alertasService: AlertasService,
    private pdfModifierService: PdfModifierService,
    private sequenceService: SequenceService,
    private documentConversionService: DocumentConversionService,
  ) {}

  /**
   * Crea un nuevo auto (borrador)
   */
  async create(createAutoDto: CreateLegalAutoDto): Promise<LegalAuto> {
    try {
      await this.processService.findById(createAutoDto.processId, false);

      const auto = this.autoRepository.create({
        tipo: createAutoDto.tipoAuto,
        numero: createAutoDto.numero,
        contenido: createAutoDto.contenidoHtml ?? '',
        process: { id: createAutoDto.processId },
        estado: AutoStatus.BORRADOR,
        documentUrl: createAutoDto.documentUrl,
        documentName: createAutoDto.documentName,
        documentType: createAutoDto.documentType,
        documentSize: createAutoDto.documentSize,
        comentarios: createAutoDto.comentarios,
        etapaDestino: createAutoDto.etapaDestino,
      });

      return await this.autoRepository.save(auto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Error al crear auto: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene todos los autos
   */
  async findAll(): Promise<LegalAuto[]> {
    return await this.autoRepository.find();
  }

  /**
   * Obtiene un auto por ID
   */
  async findById(
    id: string,
    relations: string[] = ['process', 'versions'],
  ): Promise<LegalAuto> {
    const auto = await this.autoRepository.findOne({
      where: { id },
      relations,
    });

    if (!auto) {
      throw new HttpException('Auto no encontrado', HttpStatus.NOT_FOUND);
    }

    return auto;
  }

  /**
   * Obtiene autos de un proceso específico
   */
  async findByProcessId(processId: string): Promise<LegalAuto[]> {
    return await this.autoRepository.find({
      where: { processId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Envía un auto a revisión (cambia a REVISION_JEFE)
   */
  async sendToReview(id: string): Promise<LegalAuto> {
    const auto = await this.findById(id, ['process']);

    if (
      auto.tipo !== AutoType.AUTO_ARCHIVO &&
      auto.estado !== AutoStatus.BORRADOR &&
      auto.estado !== AutoStatus.DEVUELTO
    ) {
      throw new HttpException(
        'Solo se pueden enviar borradores o autos devueltos a revisión',
        HttpStatus.BAD_REQUEST,
      );
    }

    auto.estado = AutoStatus.REVISION_JEFE;
    return await this.autoRepository.save(auto);
  }

  /**
   * Aprueba o devuelve un auto (operación del Jefe)
   */
  async approve(
    id: string,
    reviewAutoDto: ReviewAutoDto,
    aprobadoPorId: string,
  ): Promise<LegalAuto> {
    const auto = await this.findById(id, ['process']);
    const previousSnapshot = {
      contenido: auto.contenido,
      versionNumber: auto.currentVersion,
      documentUrl: auto.documentUrl,
      documentName: auto.documentName,
    };

    if (auto.estado !== AutoStatus.REVISION_JEFE) {
      throw new HttpException(
        'Solo se pueden aprobar autos en revisión',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const config = await this.configRepository.findOne({ where: {} });
      if (config?.securitySettings?.auditEnabled) {
        console.log(
          `[AUDIT] Action: ${reviewAutoDto.action} | AutoID: ${id} | User: ${aprobadoPorId} | Timestamp: ${new Date().toISOString()}`,
        );
      }
    } catch (error) {
      console.warn('Audit log failed', error);
    }

    if (reviewAutoDto.action === ReviewAction.APPROVE) {
      auto.estado = AutoStatus.APROBADO;
      auto.numero = await this.sequenceService.generateAutoConsecutivo();
      await this.prepareApprovedDocument(auto);

      if (APERTURA_TYPES.includes(auto.tipo as AutoType) && auto.etapaDestino) {
        const fechaAprobacion = new Date();
        const etapaAnterior = auto.process.etapaActual;

        const { proceso: procesoActualizado, tiempoAcumuladoDias } =
          await this.processService.changeStageByAutoApertura(
            auto.processId,
            auto.etapaDestino as ProcessStage,
            fechaAprobacion,
          );

        const tiempoTexto =
          tiempoAcumuladoDias !== null
            ? `Tiempo acumulado en etapa anterior: ${tiempoAcumuladoDias} día(s) hábil(es).`
            : 'Tiempo acumulado en etapa anterior: no disponible.';

        await this.actuacionesRepository.save({
          processId: auto.processId,
          tipo: 'CAMBIO_ETAPA',
          etapa: procesoActualizado.etapaActual,
          descripcion: `Cambio de etapa por aprobación de auto de apertura (${auto.numero}). Etapa anterior: ${etapaAnterior}. Nueva etapa: ${procesoActualizado.etapaActual}. ${tiempoTexto}`,
          responsableNombre: aprobadoPorId,
          fechaActuacion: fechaAprobacion,
          observaciones: `Auto: ${auto.tipo} | Aprobado por: ${aprobadoPorId}`,
        });
      }

      if (auto.tipo === AutoType.AUTO_ARCHIVO) {
        await this.archiveProcess(auto.processId, aprobadoPorId);
      }
    } else if (reviewAutoDto.action === ReviewAction.RETURN) {
      auto.estado = AutoStatus.DEVUELTO;
      if (reviewAutoDto.observaciones) {
        auto.rejection_comments = reviewAutoDto.observaciones;
      }
    }

    if (reviewAutoDto.observaciones) {
      auto.comentarios = reviewAutoDto.observaciones;
    }
    auto.aprobadoPorId = aprobadoPorId;

    const savedAuto = await this.autoRepository.save(auto);

    try {
      await this.versionRepository.save({
        auto: { id: savedAuto.id } as LegalAuto,
        contenido: previousSnapshot.contenido,
        versionNumber: previousSnapshot.versionNumber,
        createdBy: aprobadoPorId,
        changeReason:
          reviewAutoDto.action === ReviewAction.APPROVE
            ? previousSnapshot.documentUrl &&
              previousSnapshot.documentUrl !== savedAuto.documentUrl
              ? `Documento fuente aprobado y convertido a PDF final (${savedAuto.numero})`
              : 'Auto Aprobado por Jefe'
            : `Auto Devuelto: ${reviewAutoDto.observaciones || 'Sin observaciones'}`,
        documentUrl:
          reviewAutoDto.action === ReviewAction.APPROVE
            ? previousSnapshot.documentUrl
            : savedAuto.documentUrl,
        documentName:
          reviewAutoDto.action === ReviewAction.APPROVE
            ? previousSnapshot.documentName
            : savedAuto.documentName,
      });
    } catch (error) {
      console.error(
        'No se pudo registrar la version historica del auto:',
        error,
      );
    }

    return savedAuto;
  }

  /**
   * Firma digitalmente un auto aprobado o en revisión
   */
  async sign(id: string, userId: string, signData?: any): Promise<LegalAuto> {
    const auto = await this.findById(id, ['process']);

    if (
      auto.estado !== AutoStatus.APROBADO &&
      auto.estado !== AutoStatus.REVISION_JEFE
    ) {
      throw new HttpException(
        'Solo se pueden firmar autos que estén en revisión o aprobados',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.preparePdfDocumentForSignature(auto);

    if (auto.documentUrl && this.isPdfDocument(auto)) {
      try {
        const signerName = 'Jefe Control Disciplinario';
        const role = 'Jefe Oficina';

        await this.pdfModifierService.addSignature(
          auto.documentUrl,
          signerName,
          role,
        );
      } catch (error) {
        console.error('Error al estampar firma en PDF', error);
        throw new HttpException(
          'No fue posible estampar la firma sobre el PDF del auto',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    auto.firmaUrl = auto.documentUrl;
    auto.estado = AutoStatus.FIRMADO;
    auto.aprobadoPorId = userId;

    await this.versionRepository.save({
      auto: { id: auto.id } as LegalAuto,
      contenido: auto.contenido,
      versionNumber: auto.currentVersion,
      createdBy: userId,
      changeReason: 'Auto Firmado (Estampado Digital en PDF)',
      documentUrl: auto.documentUrl,
      documentName: auto.documentName,
    });

    return await this.autoRepository.save(auto);
  }

  /**
   * Actualiza el contenido de un auto (solo si está en BORRADOR)
   * Guarda versión anterior
   */
  async updateContent(
    id: string,
    nuevoContenido: string,
    userId?: string,
  ): Promise<LegalAuto> {
    const auto = await this.findById(id, ['process']);

    if (
      auto.estado !== AutoStatus.BORRADOR &&
      auto.estado !== AutoStatus.DEVUELTO &&
      auto.tipo !== AutoType.AUTO_ARCHIVO
    ) {
      throw new HttpException(
        'Solo se pueden editar borradores, autos devueltos o autos de archivo',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (auto.contenido && auto.contenido !== nuevoContenido) {
      await this.versionRepository.save({
        auto: { id: auto.id } as LegalAuto,
        contenido: auto.contenido,
        versionNumber: auto.currentVersion,
        createdBy: userId,
        changeReason: 'Actualización de borrador',
      });
      auto.currentVersion += 1;
    }

    auto.contenido = nuevoContenido;
    return await this.autoRepository.save(auto);
  }

  /**
   * Actualiza un auto completo (metadatos y archivo)
   */
  async update(id: string, updateData: any, userId?: string): Promise<LegalAuto> {
    const auto = await this.findById(id, ['process']);

    if (updateData.tipo !== undefined) auto.tipo = updateData.tipo;
    if (updateData.numero !== undefined) auto.numero = updateData.numero;
    if (updateData.comentarios !== undefined) {
      auto.comentarios = updateData.comentarios;
    }

    const canEditContent =
      auto.estado === AutoStatus.BORRADOR ||
      auto.estado === AutoStatus.DEVUELTO ||
      auto.tipo === AutoType.AUTO_ARCHIVO;

    if (!canEditContent && (updateData.contenidoHtml || updateData.documentUrl)) {
      throw new HttpException(
        'Solo se pueden editar contenido y archivos en borradores o autos devueltos',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (canEditContent) {
      const contentChanged =
        updateData.contenidoHtml &&
        updateData.contenidoHtml !== auto.contenido;
      const fileChanged =
        updateData.documentUrl && updateData.documentUrl !== auto.documentUrl;

      if (contentChanged || fileChanged) {
        await this.versionRepository.save({
          auto: { id: auto.id } as LegalAuto,
          contenido: auto.contenido,
          versionNumber: auto.currentVersion,
          createdBy: userId || null,
          changeReason: fileChanged
            ? 'Actualización de archivo adjunto'
            : 'Actualización de contenido',
          documentUrl: auto.documentUrl,
          documentName: auto.documentName,
        });
        auto.currentVersion += 1;
      }

      if (updateData.contenidoHtml !== undefined) {
        auto.contenido = updateData.contenidoHtml;
      }
      if (updateData.documentUrl !== undefined) {
        auto.documentUrl = updateData.documentUrl;
      }
      if (updateData.documentName !== undefined) {
        auto.documentName = updateData.documentName;
      }
      if (updateData.documentType !== undefined) {
        auto.documentType = updateData.documentType;
      }
      if (updateData.documentSize !== undefined) {
        auto.documentSize = updateData.documentSize;
      }
    }

    return await this.autoRepository.save(auto);
  }

  async getVersions(id: string): Promise<AutoVersion[]> {
    return await this.versionRepository.find({
      where: { auto: { id } },
      order: { versionNumber: 'DESC' },
    });
  }

  async getAutoVersionContent(
    id: string,
    versionNumber: number,
  ): Promise<AutoVersion> {
    const version = await this.versionRepository.findOne({
      where: {
        auto: { id },
        versionNumber,
      },
      relations: ['auto'],
    });

    if (!version) {
      throw new HttpException('Versión no encontrada', HttpStatus.NOT_FOUND);
    }

    return version;
  }

  /**
   * Registra la notificación de un auto (Secretaría)
   */
  async registerNotification(
    id: string,
    dto: RegisterNotificationDto,
  ): Promise<LegalAuto> {
    const auto = await this.findById(id);

    if (auto.estado !== AutoStatus.FIRMADO) {
      throw new HttpException(
        'Solo se pueden notificar autos que ya han sido firmados',
        HttpStatus.BAD_REQUEST,
      );
    }

    auto.notificationDate = new Date(dto.notificationDate);
    if (dto.notificationEvidence) {
      auto.notificationEvidence = dto.notificationEvidence;
    }
    auto.estado = AutoStatus.NOTIFICADO;

    const savedAuto = await this.autoRepository.save(auto);

    await this.versionRepository.save({
      auto: { id: savedAuto.id } as LegalAuto,
      contenido: savedAuto.contenido,
      versionNumber: savedAuto.currentVersion,
      createdBy: 'Sistema',
      changeReason: JSON.stringify({
        action: 'NOTIFICACION_REGISTRADA',
        date: dto.notificationDate,
        evidenceUrl: dto.notificationEvidence || null,
      }),
    });

    try {
      const asunto = `Auto Notificado: ${auto.tipo} - ${auto.numero || 'Sin Número'}`;
      const mensaje = `El auto ha sido notificado correctamente con fecha ${dto.notificationDate}. Radicado: ${auto.process?.radicadoProceso || 'N/A'}`;

      let destinatario = 'Profesional Asignado';
      if (auto.process && auto.process.abogadoAsignadoId) {
        destinatario = 'Sistema';
      }

      await this.alertasService.crearNotificacionAuto(
        savedAuto.id,
        TipoAlerta.SISTEMA,
        destinatario,
        asunto,
        mensaje,
        'Sistema',
      );
    } catch (error) {
      console.error('Error creando notificación en bandeja:', error);
    }

    return savedAuto;
  }

  /**
   * Elimina un auto por ID
   */
  async delete(id: string): Promise<void> {
    const auto = await this.findById(id);
    await this.autoRepository.delete(auto.id);
  }

  /**
   * Archiva el proceso cuando se aprueba un auto de archivo
   */
  private async archiveProcess(
    processId: string,
    aprobadoPorId: string,
  ): Promise<void> {
    try {
      await this.processService.updateStatus(processId, ProcessStatus.ARCHIVADO);

      const process = await this.processService.findById(processId, false);
      process.fechaVencimientoEtapa = null;
      await this.processService['processRepository'].save(process);

      if (process.abogadoAsignadoId) {
        const asunto = `Proceso Archivado: ${process.radicadoProceso}`;
        const mensaje = `El proceso ${process.radicadoProceso} ha sido archivado tras la aprobación del auto de archivo. Todos los conteos de vencimiento han sido detenidos.`;

        await this.alertasService.crearNotificacionAuto(
          null,
          TipoAlerta.SISTEMA,
          process.abogadoAsignadoId,
          asunto,
          mensaje,
          aprobadoPorId,
        );
      }
    } catch (error) {
      console.error('Error archivando proceso:', error);
    }
  }

  private isWordDocument(
    auto: Pick<LegalAuto, 'documentName' | 'documentType' | 'documentUrl'>,
  ): boolean {
    const source = `${auto.documentName || auto.documentUrl || ''}`.toLowerCase();

    return (
      source.endsWith('.doc') ||
      source.endsWith('.docx') ||
      auto.documentType === 'application/msword' ||
      auto.documentType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  }

  private isPdfDocument(
    auto: Pick<LegalAuto, 'documentName' | 'documentType' | 'documentUrl'>,
  ): boolean {
    const source = `${auto.documentName || auto.documentUrl || ''}`.toLowerCase();
    return source.endsWith('.pdf') || auto.documentType === 'application/pdf';
  }

  private async prepareApprovedDocument(auto: LegalAuto): Promise<void> {
    if (!auto.documentUrl || !auto.numero) {
      return;
    }

    const approvedPdfName = `${auto.numero}.pdf`;

    if (this.isWordDocument(auto)) {
      const convertedDocument =
        await this.documentConversionService.convertWordToPdf(
          auto.documentUrl,
          approvedPdfName,
        );

      await this.pdfModifierService.addConsecutive(
        convertedDocument.documentUrl,
        auto.numero,
      );

      auto.documentUrl = convertedDocument.documentUrl;
      auto.documentName = approvedPdfName;
      auto.documentType = convertedDocument.documentType;
      auto.documentSize = convertedDocument.documentSize;
      return;
    }

    if (this.isPdfDocument(auto)) {
      await this.pdfModifierService.addConsecutive(auto.documentUrl, auto.numero);
      auto.documentName = approvedPdfName;
      auto.documentType = 'application/pdf';
      auto.documentSize =
        (await this.documentConversionService.getFileSize(auto.documentUrl)) ??
        auto.documentSize;
    }
  }

  private async preparePdfDocumentForSignature(auto: LegalAuto): Promise<void> {
    if (!auto.documentUrl) {
      return;
    }

    if (this.isPdfDocument(auto)) {
      auto.documentType = 'application/pdf';
      auto.documentSize =
        (await this.documentConversionService.getFileSize(auto.documentUrl)) ??
        auto.documentSize;
      return;
    }

    if (!auto.numero) {
      auto.numero = await this.sequenceService.generateAutoConsecutivo();
    }

    await this.prepareApprovedDocument(auto);
  }
}
