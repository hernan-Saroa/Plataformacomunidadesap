import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateLegalAutoDto } from '../dtos/create-legal-auto.dto';
import { RegisterNotificationDto } from '../dtos/register-notification.dto';
import { ReviewAction, ReviewAutoDto } from '../dtos/review-auto.dto';
import { LegalAuto, AutoStatus, AutoType } from '../entities/legal-auto.entity';
import { AutoVersion } from '../entities/auto-version.entity';
import { TipoAlerta } from '../entities/alerta-enviada.entity';
import { DisciplinaryProcessActuacion } from '../entities/disciplinary-process-actuacion.entity';

import { SystemConfiguration } from '../entities/system-configuration.entity';
import { AlertasService } from './alertas.service';
import { DocumentConversionService } from './document-conversion.service';
import { PdfModifierService } from './pdf-modifier.service';
import { ProcessService } from './process.service';
import { SequenceService } from './sequence.service';
import { JuridicaEmailService } from './juridica-email.service';
import { NotificationClientService } from './notification-client.service';
import {
  DisciplinaryProcess,
  ProcessStage,
  ProcessStatus,
} from '../entities/disciplinary-process.entity';

const AUTO_CONSECUTIVE_MARKERS = [
  '[Consecutivo_Auto]',
  '[CONSECUTIVO_AUTO]',
  '[consecutivo_auto]',
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
    private juridicaEmailService: JuridicaEmailService,
    private notificationClient: NotificationClientService,
  ) {}

  /**
   * Crea un nuevo auto (borrador)
   */
  async create(createAutoDto: CreateLegalAutoDto): Promise<LegalAuto> {
    try {
      const proceso = await this.processService.findById(createAutoDto.processId, false);

      // Validaciones específicas para AUTO_PRORROGA
      if (createAutoDto.tipoAuto === AutoType.AUTO_PRORROGA) {
        if (proceso.estado !== 'ACTIVO') {
          throw new HttpException(
            'El proceso debe estar activo para crear un auto de prórroga',
            HttpStatus.BAD_REQUEST,
          );
        }
        if (!proceso.fechaVencimientoEtapa) {
          throw new HttpException(
            'El proceso no tiene un conteo de vencimiento activo',
            HttpStatus.BAD_REQUEST,
          );
        }
        if (!createAutoDto.prorrogaMeses || ![3, 6].includes(createAutoDto.prorrogaMeses)) {
          throw new HttpException(
            'Debe seleccionar una duración de prórroga: 3 o 6 meses',
            HttpStatus.BAD_REQUEST,
          );
        }
        const pendingProrroga = await this.autoRepository.findOne({
          where: {
            processId: createAutoDto.processId,
            tipo: AutoType.AUTO_PRORROGA,
            estado: In([AutoStatus.BORRADOR, AutoStatus.REVISION_JEFE]),
          },
        });
        if (pendingProrroga) {
          throw new HttpException(
            'Ya existe un auto de prórroga pendiente para este proceso. No se puede crear otro hasta que se resuelva.',
            HttpStatus.CONFLICT,
          );
        }
      }

      // Validación para auto pliego de cargos
      if (createAutoDto.tipoAuto === AutoType.PLIEGO_CARGOS) {
        if (proceso.estado !== ProcessStatus.ACTIVO) {
          throw new HttpException(
            'Solo se puede crear un auto pliego de cargos sobre un proceso ACTIVO',
            HttpStatus.BAD_REQUEST,
          );
        }
        // Verificar que no exista otro pliego (pendiente o ya aprobado)
        const pliegoExistente = await this.autoRepository.findOne({
          where: [
            { processId: createAutoDto.processId, tipo: AutoType.PLIEGO_CARGOS, estado: AutoStatus.BORRADOR },
            { processId: createAutoDto.processId, tipo: AutoType.PLIEGO_CARGOS, estado: AutoStatus.REVISION_JEFE },
            { processId: createAutoDto.processId, tipo: AutoType.PLIEGO_CARGOS, estado: AutoStatus.APROBADO },
            { processId: createAutoDto.processId, tipo: AutoType.PLIEGO_CARGOS, estado: AutoStatus.FIRMADO },
            { processId: createAutoDto.processId, tipo: AutoType.PLIEGO_CARGOS, estado: AutoStatus.NOTIFICADO },
          ],
        });
        if (pliegoExistente) {
          throw new HttpException(
            'Ya existe un auto pliego de cargos para este proceso',
            HttpStatus.CONFLICT,
          );
        }
      }

      // CORRECCIÓN AQUI: Mapeo manual de campos DTO -> Entidad
      const auto = this.autoRepository.create({
        tipo: createAutoDto.tipoAuto,
        autoConfigurationId: createAutoDto.autoConfigurationId ?? null,
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
        prorrogaMeses: createAutoDto.prorrogaMeses ?? null,
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
    return await this.autoRepository.find({
      relations: ['process', 'process.abogadoAsignado'],
    });
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
    aprobadoPorNombre?: string,
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

      // Embeber firma del jefe si está configurada
      if (auto.documentUrl && this.isPdfDocument(auto)) {
        try {
          await this.pdfModifierService.addSignature(auto.documentUrl, 'Jefe Control Disciplinario', 'Jefe Oficina');
        } catch (e) {
          console.warn('Firma del jefe no disponible, se omite del PDF:', e.message);
        }
      }

      // Nota: Para auto pliego de cargos, se aprueba y pasa a Juzgamiento, pero no se
      // cierra el proceso inmediatamente. El envío a jurídica se hace posteriormente
      // mediante el botón "Envío a jurídica" (acción manual del Radicador).

      if (auto.tipo === AutoType.AUTO_ARCHIVO) {
        await this.archiveProcess(auto.processId, aprobadoPorId);
      }

      // Si es AUTO_APERTURA_*, transicionar el proceso a la etapa destino
      if (auto.tipo.startsWith('AUTO_APERTURA_') && auto.etapaDestino) {
        await this.processService.changeStageByAutoApertura(
          auto.processId,
          auto.etapaDestino as ProcessStage,
          new Date(),
          aprobadoPorId,
          aprobadoPorNombre,
        );
      }

      // Si es Pliego de Cargos, transicionar el proceso a Juzgamiento y notificar
      // al Radicador para que pueda enviarlo a la Oficina Jurídica
      if (auto.tipo === AutoType.PLIEGO_CARGOS || auto.tipo === AutoType.AUTO_FORMULACION_PLIEGO) {
        await this.processService.changeStageByAutoApertura(
          auto.processId,
          ProcessStage.JUZGAMIENTO,
          new Date(),
          aprobadoPorId,
          aprobadoPorNombre,
          'mediante aprobación del auto de Pliego de Cargos',
        );

        const radicadorId = auto.process?.news?.radicadorId;
        if (radicadorId) {
          this.notificationClient
            .send({
              id_usuario_destinatario: radicadorId,
              tipo_notificacion: 'PLIEGO_CARGOS_APROBADO',
              titulo: 'Pliego de cargos aprobado',
              mensaje: `El pliego de cargos del proceso ${auto.process.radicadoProceso} fue aprobado y el proceso pasó a Juzgamiento. Debe enviarlo a la Oficina Jurídica.`,
              descripcion_corta: `Pliego de cargos aprobado - ${auto.process.radicadoProceso}`,
              icono: 'Gavel',
              color: '#2563EB',
              prioridad: 'Alta',
              categoria: 'DISCIPLINARIO',
              tiene_accion: true,
              texto_boton_accion: 'Ver proceso',
              datos_adicionales: { processId: auto.processId, radicadoProceso: auto.process.radicadoProceso, autoId: auto.id },
            })
            .catch(() => {});
        }
      }

      // Si es AUTO_PRORROGA, extender la fecha de vencimiento de la etapa activa
      if (auto.tipo === AutoType.AUTO_PRORROGA && auto.prorrogaMeses) {
        const proceso = await this.processService.findById(auto.processId, false);

        const fechaVencimientoAnterior = proceso.fechaVencimientoEtapa
          ? new Date(proceso.fechaVencimientoEtapa)
          : null;

        if (!fechaVencimientoAnterior) {
          throw new HttpException(
            'El proceso no tiene fecha de vencimiento vigente para extender',
            HttpStatus.BAD_REQUEST,
          );
        }

        const nuevaFecha = new Date(fechaVencimientoAnterior);
        nuevaFecha.setMonth(nuevaFecha.getMonth() + auto.prorrogaMeses);

        proceso.fechaVencimientoEtapa = nuevaFecha;
        await this.processService['processRepository'].save(proceso);

        auto.fechaVencimientoAnterior = fechaVencimientoAnterior;
        auto.fechaVencimientoNueva = nuevaFecha;

        await this.actuacionesRepository.save({
          processId: auto.processId,
          tipo: 'PRORROGA',
          etapa: proceso.etapaActual,
          descripcion: `Prórroga aprobada: ${auto.prorrogaMeses} meses. ` +
            `Fecha de vencimiento anterior: ${fechaVencimientoAnterior.toLocaleDateString('es-CO')}. ` +
            `Nueva fecha de vencimiento: ${nuevaFecha.toLocaleDateString('es-CO')}.`,
          responsableNombre: aprobadoPorId,
          fechaActuacion: new Date(),
          observaciones: `Auto: AUTO_PRORROGA | Aprobado por: ${aprobadoPorId} | Duración: ${auto.prorrogaMeses} meses`,
        });

        if (proceso.abogadoAsignadoId) {
          await this.alertasService.crearNotificacionAuto(
            auto.id,
            TipoAlerta.SISTEMA,
            proceso.abogadoAsignadoId,
            `Prórroga Aprobada: ${proceso.radicadoProceso}`,
            `Se aprobó la prórroga de ${auto.prorrogaMeses} meses para la etapa ${proceso.etapaActual}. ` +
              `Nueva fecha de vencimiento: ${nuevaFecha.toLocaleDateString('es-CO')}.`,
            aprobadoPorId,
          );
        }
      }
    } else if (reviewAutoDto.action === ReviewAction.RETURN) {
      auto.estado = AutoStatus.DEVUELTO;
      if (reviewAutoDto.observaciones) {
        auto.rejection_comments = reviewAutoDto.observaciones;
      }

      // Notificación de rechazo para AUTO_PRORROGA
      if (auto.tipo === AutoType.AUTO_PRORROGA && auto.prorrogaMeses) {
        const proceso = auto.process;
        if (proceso?.abogadoAsignadoId) {
          await this.alertasService.crearNotificacionAuto(
            auto.id,
            TipoAlerta.SISTEMA,
            proceso.abogadoAsignadoId,
            `Prórroga Rechazada: ${proceso.radicadoProceso}`,
            `La solicitud de prórroga de ${auto.prorrogaMeses} meses para la etapa ${proceso.etapaActual} fue rechazada. ` +
              `La fecha de vencimiento permanece sin cambios. ` +
              `Observaciones: ${reviewAutoDto.observaciones || 'Sin observaciones'}`,
            aprobadoPorId,
          );
        }
      }

      // Registrar en Historial
      await this.versionRepository.save({
        auto: { id: auto.id } as LegalAuto,
        contenido: auto.contenido,
        versionNumber: auto.currentVersion,
        createdBy: aprobadoPorId,
        changeReason: `Auto Devuelto: ${reviewAutoDto.observaciones || 'Sin observaciones'}`,
        documentUrl: auto.documentUrl,
        documentName: auto.documentName,
      });
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

  /**
   * Sube/actualiza el documento fuente mientras el auto está en revisión.
   * Guarda versión previa (incluye documento anterior) e incrementa currentVersion.
   */
  async uploadDocumentoDuranteRevision(
    id: string,
    documentUrl: string,
    documentName: string,
    documentType: string,
    documentSize: number,
    comentario?: string,
    userId?: string,
  ): Promise<LegalAuto> {
    const auto = await this.findById(id, ['process']);

    if (
      auto.estado !== AutoStatus.REVISION_JEFE &&
      auto.estado !== AutoStatus.BORRADOR &&
      auto.estado !== AutoStatus.DEVUELTO
    ) {
      throw new HttpException(
        'Solo se puede cargar/actualizar el documento en borrador, devuelto o durante la revisión',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.versionRepository.save({
      auto: { id: auto.id } as LegalAuto,
      contenido: auto.contenido,
      versionNumber: auto.currentVersion,
      createdBy: userId || null,
      changeReason:
        auto.estado === AutoStatus.REVISION_JEFE
          ? 'Actualización de documento durante revisión'
          : 'Actualización de archivo adjunto',
      documentUrl: auto.documentUrl,
      documentName: auto.documentName,
    });

    auto.currentVersion += 1;
    auto.documentUrl = documentUrl;
    auto.documentName = documentName;
    auto.documentType = documentType;
    auto.documentSize = documentSize;

    if (comentario) {
      const prefix = `[${new Date().toISOString()}] `;
      auto.comentarios = auto.comentarios
        ? `${auto.comentarios}\n${prefix}${comentario}`
        : `${prefix}${comentario}`;
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
          AUTO_CONSECUTIVE_MARKERS.map((marker) => ({
            marker,
            value: auto.numero,
          })),
        );

      const replacedAutoConsecutive = AUTO_CONSECUTIVE_MARKERS.some((marker) =>
        convertedDocument.placeholdersReplaced?.includes(marker),
      );

      if (!replacedAutoConsecutive) {
        await this.pdfModifierService.addConsecutive(
          convertedDocument.documentUrl,
          auto.numero,
        );
      }

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

  /**
   * Envía el auto pliego de cargos aprobado a la Oficina Jurídica
   */
  async sendPliegoToJuridica(
    id: string, 
    enviadoPorId: string, 
    enviadoPorEmail?: string, 
    enviadoPorNombre?: string
  ): Promise<void> {
    const auto = await this.findById(id, ['process']);

    if (auto.tipo !== AutoType.PLIEGO_CARGOS && auto.tipo !== AutoType.AUTO_FORMULACION_PLIEGO) {
      throw new HttpException(
        'Esta operación solo aplica para autos de pliego de cargos',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (auto.estado !== AutoStatus.APROBADO) {
      throw new HttpException(
        'El auto debe estar aprobado para poder enviarlo a jurídica',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Cerrar el proceso
    const datosConsolidados = await this.processService.cerrarPorPliegoCargos(
      auto.processId,
      enviadoPorId,
      enviadoPorEmail,
      enviadoPorNombre,
    );

    // Marcar el auto como NOTIFICADO para que no reaparezca en la lista de borradores
    await this.autoRepository.save({ ...auto, estado: AutoStatus.NOTIFICADO });

    // Registrar actuación de envío a jurídica
    await this.actuacionesRepository.save({
      processId: auto.processId,
      tipo: 'ENVIO_JURIDICA_PLIEGO_CARGOS',
      etapa: datosConsolidados.etapaAlCierre,
      descripcion: `Auto Pliego de Cargos (${auto.numero}) enviado a Oficina Jurídica. Proceso cerrado.`,
      responsableNombre: enviadoPorId,
      fechaActuacion: new Date(),
      observaciones: `Auto: ${auto.tipo} | Enviado por: ${enviadoPorId} | Etapa al cierre: ${datosConsolidados.etapaAlCierre}`,
    });

    // Notificar al Radicador que el proceso fue enviado a la Oficina Jurídica
    const radicadorId = auto.process?.news?.radicadorId;
    if (radicadorId) {
      this.notificationClient
        .send({
          id_usuario_destinatario: radicadorId,
          tipo_notificacion: 'PROCESO_ENVIADO_JURIDICA',
          titulo: 'Proceso enviado a Jurídica',
          mensaje: `El proceso ${datosConsolidados.radicado} fue enviado a la Oficina Jurídica y el expediente fue cerrado.`,
          descripcion_corta: `Proceso enviado a Jurídica - ${datosConsolidados.radicado}`,
          icono: 'Send',
          color: '#2563EB',
          prioridad: 'Media',
          categoria: 'DISCIPLINARIO',
          tiene_accion: true,
          texto_boton_accion: 'Ver proceso',
          datos_adicionales: { processId: auto.processId, radicadoProceso: datosConsolidados.radicado, autoId: auto.id },
        })
        .catch(() => {});
    }

    // Enviar correo a jurídica vía notifications-service (async, sin bloquear)
    this.juridicaEmailService.enviarCorreoJuridica(auto.processId, datosConsolidados).then((enviado) => {
      if (enviado) {
        this.processService.marcarCorreoJuridicaEnviado(auto.processId);
      }
    }).catch((err) => {
      console.error(`Error async enviando correo jurídica: ${err.message}`);
    });
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
