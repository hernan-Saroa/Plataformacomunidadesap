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
import { DisciplinaryProfessional } from '../entities/disciplinary-professional.entity';
import { AlertasService } from './alertas.service';
import { DocumentConversionService } from './document-conversion.service';
import { PdfModifierService } from './pdf-modifier.service';
import { ProcessService } from './process.service';
import { SequenceService } from './sequence.service';
import { JuridicaEmailService, EmailAdjunto } from './juridica-email.service';
import { NotificationClientService } from './notification-client.service';
import { AutosConfigurationService } from './autos-configuration.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
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
    @InjectRepository(DisciplinaryProfessional)
    private professionalRepository: Repository<DisciplinaryProfessional>,
    private processService: ProcessService,
    private alertasService: AlertasService,
    private pdfModifierService: PdfModifierService,
    private sequenceService: SequenceService,
    private documentConversionService: DocumentConversionService,
    private juridicaEmailService: JuridicaEmailService,
    private notificationClient: NotificationClientService,
    private autosConfigurationService: AutosConfigurationService,
    private httpService: HttpService,
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
      relations: ['process', 'process.abogadoAsignado', 'process.news'],
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
      auto.tipo !== AutoType.AUTO_INHIBITORIO &&
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
    radicadorAsignadoId?: string,
  ): Promise<LegalAuto> {
    const auto = await this.findById(id, ['process', 'process.news']);
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
          await this.pdfModifierService.addSignature(
            auto.documentUrl,
            aprobadoPorNombre || 'Jefe Control Disciplinario',
            'Jefe Oficina',
          );
        } catch (e) {
          console.warn('Firma del jefe no disponible, se omite del PDF:', e.message);
        }
      }

      // Asignar radicador si se proporciona
      if (radicadorAsignadoId) {
        auto.radicadorAsignadoId = radicadorAsignadoId;
      }

      // Nota: Para auto pliego de cargos, se aprueba y pasa a Juzgamiento, pero no se
      // cierra el proceso inmediatamente. El envío a jurídica se hace posteriormente
      // mediante el botón "Envío a jurídica" (acción manual del Radicador).

      if (auto.tipo === AutoType.AUTO_ARCHIVO) {
        await this.archiveProcess(auto.processId, aprobadoPorId);
      } else if (auto.tipo === AutoType.AUTO_INHIBITORIO) {
        await this.archiveProcessInhibitorio(auto.processId, aprobadoPorId);
      }

      // EFDS-1564: recordar la etapa previa por si luego se reversa la aprobación.
      const etapaAntesDeAprobar = auto.process?.etapaActual;

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

        const procesoPliego = auto.process;
        if (procesoPliego) {
          const asuntoPliego = `Pliego de Cargos Aprobado - Proceso ${procesoPliego.radicadoProceso}`;
          const mensajePliego = `El pliego de cargos del proceso ${procesoPliego.radicadoProceso} fue aprobado y el proceso pasó a Juzgamiento. Debe enviarlo a la Oficina Jurídica.`;
          await this.notificarRadicadores(
            procesoPliego,
            auto,
            asuntoPliego,
            mensajePliego,
            'PLIEGO_CARGOS_APROBADO',
            'Pliego de cargos aprobado',
            'Gavel',
            '#2563EB',
            aprobadoPorId,
          );
        }
      }

      // EFDS-1564: si la aprobación efectivamente movió la etapa del proceso, se
      // guarda la etapa previa para poder devolver el proceso a ella si se reversa.
      // Para inhibitorio/archivo, el proceso se archiva (status ARCHIVADO) pero la
      // etapa no cambia, así que guardamos la etapa actual para poder restaurarla.
      if (etapaAntesDeAprobar) {
        const procesoTrasAprobar = await this.processService.findById(
          auto.processId,
          false,
        );
        const etapaCambiada = procesoTrasAprobar.etapaActual !== etapaAntesDeAprobar;
        const esInhibitorioOArchivo =
          auto.tipo === AutoType.AUTO_INHIBITORIO ||
          auto.tipo === AutoType.AUTO_ARCHIVO;

        if (etapaCambiada || esInhibitorioOArchivo) {
          auto.etapaPreviaAprobacion = etapaAntesDeAprobar;
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

        const asuntoProrroga = `Prórroga Aprobada: Proceso ${proceso.radicadoProceso}`;
        const mensajeProrroga = `Se aprobó la prórroga de ${auto.prorrogaMeses} meses para la etapa ${proceso.etapaActual} del proceso ${proceso.radicadoProceso}. Nueva fecha de vencimiento: ${nuevaFecha.toLocaleDateString('es-CO')}.`;
        await this.notificarRadicadores(
          proceso,
          auto,
          asuntoProrroga,
          mensajeProrroga,
          'PRORROGA_APROBADA',
          `Prórroga Aprobada: ${proceso.radicadoProceso}`,
          'CalendarCheck',
          '#10B981',
          aprobadoPorId,
        );
      }

      // Notificaciones de aprobación con radicador asignado
      await this.enviarNotificacionesAprobacion(auto, aprobadoPorId);
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
          ).catch(() => {});
        }

        if (proceso) {
          const asuntoRechazo = `Prórroga Rechazada: Proceso ${proceso.radicadoProceso}`;
          const mensajeRechazo = `La solicitud de prórroga de ${auto.prorrogaMeses} meses para la etapa ${proceso.etapaActual} del proceso ${proceso.radicadoProceso} fue rechazada. Observaciones: ${reviewAutoDto.observaciones || 'Sin observaciones'}`;
          await this.notificarRadicadores(
            proceso,
            auto,
            asuntoRechazo,
            mensajeRechazo,
            'PRORROGA_RECHAZADA',
            `Prórroga Rechazada: ${proceso.radicadoProceso}`,
            'CalendarX',
            '#DC2626',
            aprobadoPorId,
          );
        }
      }

      // Notificaciones completas de devolución (en plataforma y correo electrónico estilo ESAP)
      await this.enviarNotificacionesDevolucion(
        auto,
        aprobadoPorId,
        reviewAutoDto.observaciones,
      );
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
      auto.tipo !== AutoType.AUTO_ARCHIVO &&
      auto.tipo !== AutoType.AUTO_INHIBITORIO
    ) {
      throw new HttpException(
        'Solo se pueden editar borradores, autos devueltos, autos de archivo o autos inhibitorios',
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

  /**
   * Adjunta el documento de soporte que el Jefe sube al devolver un auto.
   * Se llama justo después de approve(RETURN); no cambia el estado del auto.
   */
  async uploadRejectionDocument(
    id: string,
    documentUrl: string,
    documentName: string,
  ): Promise<LegalAuto> {
    const auto = await this.findById(id);

    if (auto.estado !== AutoStatus.DEVUELTO) {
      throw new HttpException(
        'Solo se puede adjuntar el documento de soporte a un auto devuelto',
        HttpStatus.BAD_REQUEST,
      );
    }

    auto.rejectionDocumentUrl = documentUrl;
    auto.rejectionDocumentName = documentName;

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
   * Asigna un radicador a un auto aprobado y envía notificaciones
   */
  async assignRadicador(id: string, radicadorAsignadoId: string): Promise<LegalAuto> {
    const auto = await this.findById(id, ['process']);

    if (auto.estado !== AutoStatus.APROBADO && auto.estado !== AutoStatus.FIRMADO && auto.estado !== AutoStatus.NOTIFICADO) {
      throw new HttpException(
        'Solo se puede asignar radicador a autos aprobados, firmados o notificados',
        HttpStatus.BAD_REQUEST,
      );
    }

    const radicadorAnterior = auto.radicadorAsignadoId;
    auto.radicadorAsignadoId = radicadorAsignadoId;
    const savedAuto = await this.autoRepository.save(auto);

    // Si había un radicador anterior, notificar del cambio en plataforma y correo
    if (radicadorAnterior && radicadorAnterior !== radicadorAsignadoId) {
      const asuntoReasig = `Auto reasignado a otro radicador - ${auto.process?.radicadoProceso}`;
      const mensajeReasig = `El auto ${savedAuto.tipo} del proceso ${auto.process?.radicadoProceso} fue reasignado a otro radicador.`;
      this.notificationClient
        .send({
          id_usuario_destinatario: radicadorAnterior,
          tipo_notificacion: 'RADICADOR_AUTO_REASIGNADO',
          titulo: 'Auto reasignado a otro radicador',
          mensaje: mensajeReasig,
          descripcion_corta: `Auto reasignado - ${auto.process?.radicadoProceso}`,
          icono: 'UserCog',
          color: '#F59E0B',
          prioridad: 'Media',
          categoria: 'DISCIPLINARIO',
          tiene_accion: true,
          texto_boton_accion: 'Ver proceso',
          datos_adicionales: { processId: auto.processId, autoId: auto.id },
        })
        .catch(() => {});

      this.enviarCorreoNotificacion(radicadorAnterior, asuntoReasig, mensajeReasig).catch(() => {});
    }

    await this.enviarNotificacionesAprobacion(savedAuto, 'Sistema');

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

  /**
   * Archiva un proceso por Auto Inhibitorio (art. 209).
   * Diferencia clave: el inhibitorio se produce ANTES de iniciar actuación disciplinaria,
   * mientras que el archivo ocurre DENTRO de una actuación. El proceso queda ARCHIVADO
   * pero con etapa INHIBITORIO para identificarlo como proceso inhibitorio.
   */
  private async archiveProcessInhibitorio(
    processId: string,
    aprobadoPorId: string,
  ): Promise<void> {
    try {
      await this.processService.updateStatus(processId, ProcessStatus.ARCHIVADO);

      const process = await this.processService.findById(processId, false);
      process.fechaVencimientoEtapa = null;
      process.etapaActual = ProcessStage.INHIBITORIO;
      await this.processService['processRepository'].save(process);

      if (process.abogadoAsignadoId) {
        const asunto = `Proceso Inhibido: ${process.radicadoProceso}`;
        const mensaje = `El proceso ${process.radicadoProceso} ha sido inhibido (art. 209) tras la aprobación del auto inhibitorio. No se inició actuación disciplinaria. El proceso queda archivado como inhibitorio.`;

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
      console.error('Error archivando proceso inhibitorio:', error);
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

    // Obtener configuración del auto para determinar si necesita restricción de imágenes en footer
    let autoConfigTipo: string | undefined;
    if (auto.autoConfigurationId) {
      try {
        const config = await this.autosConfigurationService.findById(auto.autoConfigurationId);
        autoConfigTipo = config.tipo;
      } catch (error) {
        console.warn('No se pudo obtener configuración de auto:', error);
      }
    }

    if (this.isWordDocument(auto)) {
      const convertedDocument =
        await this.documentConversionService.convertWordToPdf(
          auto.documentUrl,
          approvedPdfName,
          AUTO_CONSECUTIVE_MARKERS.map((marker) => ({
            marker,
            value: auto.numero,
          })),
          { autoConfigTipo },
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
    const auto = await this.findById(id, ['process', 'process.news']);

    if (auto.tipo !== AutoType.PLIEGO_CARGOS && auto.tipo !== AutoType.AUTO_FORMULACION_PLIEGO) {
      throw new HttpException(
        'Esta operación solo aplica para autos de pliego de cargos',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Idempotencia: si el proceso ya fue cerrado (enviado a Jurídica), no
    // reenviar y devolver un mensaje claro en vez del confuso "el auto debe
    // estar aprobado". El cierre lo hace cerrarPorPliegoCargos de forma síncrona
    // en el primer envío, así que un segundo intento lo ve CERRADO.
    if (auto.process?.estado === ProcessStatus.CERRADO) {
      throw new HttpException(
        'Este proceso ya fue enviado a la Oficina Jurídica.',
        HttpStatus.CONFLICT,
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
    await this.autoRepository.update(id, { estado: AutoStatus.NOTIFICADO });
    auto.estado = AutoStatus.NOTIFICADO;

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

    // Notificar a todos los Radicadores que el proceso fue enviado a la Oficina Jurídica
    const asuntoJuridica = `Proceso enviado a Jurídica - ${datosConsolidados.radicado}`;
    const mensajeJuridica = `El proceso ${datosConsolidados.radicado} fue enviado a la Oficina Jurídica y el expediente fue cerrado.`;
    await this.notificarRadicadores(
      auto.process || ({ id: auto.processId, radicadoProceso: datosConsolidados.radicado } as any),
      auto,
      asuntoJuridica,
      mensajeJuridica,
      'PROCESO_ENVIADO_JURIDICA',
      'Proceso enviado a Jurídica',
      'Send',
      '#2563EB',
      enviadoPorId,
    );

    // Enviar correo a jurídica vía notifications-service (async, sin bloquear).
    // Adjunta todos los documentos del expediente: autos aprobados/firmados/
    // notificados + evidencias + adjuntos de la noticia.
    (async () => {
      let adjuntos: EmailAdjunto[] = [];
      try {
        const [evidencias, autosProceso] = await Promise.all([
          this.processService.getEvidenceByProcessId(auto.processId),
          this.findByProcessId(auto.processId),
        ]);
        const autosDocumentables = (autosProceso || []).filter((a) =>
          [AutoStatus.APROBADO, AutoStatus.FIRMADO, AutoStatus.NOTIFICADO].includes(a.estado),
        );
        const adjuntosNoticia = Array.isArray((auto.process as any)?.news?.adjuntos)
          ? (auto.process as any).news.adjuntos
          : [];
        adjuntos = await this.juridicaEmailService.recolectarAdjuntosExpediente(
          evidencias,
          autosDocumentables,
          adjuntosNoticia,
        );
      } catch (err: any) {
        console.error(`No se pudieron recolectar los adjuntos del expediente: ${err?.message}`);
      }

      const enviado = await this.juridicaEmailService.enviarCorreoJuridica(
        auto.processId,
        datosConsolidados,
        adjuntos,
      );
      if (enviado) {
        await this.processService.marcarCorreoJuridicaEnviado(auto.processId);
      }
    })().catch((err) => {
      console.error(`Error async enviando correo jurídica: ${err.message}`);
    });
  }

  /**
   * Reversa la aprobación de un Pliego de Cargos, Auto Inhibitorio o Auto de Archivo,
   * devolviéndolo a BORRADOR para que el Profesional lo corrija y lo vuelva a enviar
   * a revisión. Solo aplica mientras el auto sigue en estado APROBADO.
   */
  async revertApproval(
    id: string,
    revertidoPorId: string,
  ): Promise<LegalAuto> {
    const auto = await this.findById(id, ['process']);

    const esTipoReversible =
      auto.tipo === AutoType.PLIEGO_CARGOS ||
      auto.tipo === AutoType.AUTO_FORMULACION_PLIEGO ||
      auto.tipo === AutoType.AUTO_INHIBITORIO ||
      auto.tipo === AutoType.AUTO_ARCHIVO;

    if (!esTipoReversible) {
      throw new HttpException(
        'Esta operación solo aplica para autos de pliego de cargos, inhibitorio o archivo',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (auto.estado !== AutoStatus.APROBADO) {
      throw new HttpException(
        'Solo se puede reversar la aprobación de un auto que esté APROBADO.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const versionPreviaAprobacion = await this.versionRepository.findOne({
      where: { auto: { id: auto.id } },
      order: { createdAt: 'DESC' },
    });

    if (!versionPreviaAprobacion) {
      throw new HttpException(
        'No se encontró el historial de versiones del auto, no es posible reversar la aprobación de forma segura',
        HttpStatus.CONFLICT,
      );
    }

    // NOTA: approve() no incrementa currentVersion (queda con el mismo numero que
    // ya tenia la fila de historial guardada al aprobar). Por eso, para no chocar
    // con esa fila (versionPreviaAprobacion), la version restaurada se registra con
    // un numero nuevo (currentVersion + 1), igual que hace uploadDocumentoDuranteRevision().
    auto.contenido = versionPreviaAprobacion.contenido;
    auto.documentUrl = versionPreviaAprobacion.documentUrl ?? auto.documentUrl;
    auto.documentName = versionPreviaAprobacion.documentName ?? auto.documentName;
    auto.currentVersion += 1;
    auto.estado = AutoStatus.BORRADOR;

    // EFDS-1564: devolver el proceso a la etapa en la que estaba antes de aprobar.
    const etapaADevolver = auto.etapaPreviaAprobacion;
    let etapaProcesoRevertida: string | null = null;
    let procesoReactivado = false;

    if (etapaADevolver) {
      const esInhibitorioOArchivo =
        auto.tipo === AutoType.AUTO_INHIBITORIO ||
        auto.tipo === AutoType.AUTO_ARCHIVO;

      if (esInhibitorioOArchivo) {
        // Para inhibitorio/archivo, el proceso está ARCHIVADO: reactivarlo y restaurar etapa
        const proceso = await this.processService.findById(auto.processId, false);
        proceso.estado = ProcessStatus.ACTIVO;
        proceso.etapaActual = etapaADevolver;
        proceso.fechaVencimientoEtapa = new Date(); // Se recalculá luego
        await this.processService['processRepository'].save(proceso);
        etapaProcesoRevertida = etapaADevolver;
        procesoReactivado = true;
      } else {
        // Para pliego de cargos, usar el método existente
        const procesoRevertido = await this.processService.revertirEtapaProceso(
          auto.processId,
          etapaADevolver,
          revertidoPorId,
        );
        etapaProcesoRevertida = procesoRevertido.etapaActual;
      }
      auto.etapaPreviaAprobacion = null;
    }

    const savedAuto = await this.autoRepository.save(auto);

    await this.versionRepository.save({
      auto: { id: savedAuto.id } as LegalAuto,
      contenido: savedAuto.contenido,
      versionNumber: savedAuto.currentVersion,
      createdBy: revertidoPorId,
      changeReason: 'Aprobación reversada por el Jefe — auto vuelve a borrador para corrección',
      documentUrl: savedAuto.documentUrl,
      documentName: savedAuto.documentName,
    });

    const tipoAutoTexto =
      auto.tipo === AutoType.PLIEGO_CARGOS || auto.tipo === AutoType.AUTO_FORMULACION_PLIEGO
        ? 'Pliego de Cargos'
        : auto.tipo === AutoType.AUTO_INHIBITORIO
          ? 'Inhibitorio'
          : 'Archivo';

    await this.actuacionesRepository.save({
      processId: auto.processId,
      tipo: 'reversion_aprobacion',
      etapa: etapaProcesoRevertida ?? auto.process?.etapaActual,
      descripcion: `Se reversó la aprobación del ${tipoAutoTexto} (${auto.numero || 'sin número'}). El auto vuelve a borrador para corrección.`,
      responsableNombre: revertidoPorId,
      fechaActuacion: new Date(),
      observaciones: etapaProcesoRevertida
        ? `El proceso regresó a la etapa ${etapaProcesoRevertida}${procesoReactivado ? ' y se reactivó (era ARCHIVADO)' : ''}.`
        : 'La etapa del proceso no se modifica; solo se revierte el estado del auto.',
    });

    const proceso = auto.process;
    if (proceso) {
      const asuntoReverso = `Aprobación de ${tipoAutoTexto} reversada - Proceso ${proceso.radicadoProceso}`;
      const mensajeReverso = `El Jefe OCID reversó la aprobación del ${tipoAutoTexto.toLowerCase()} del proceso ${proceso.radicadoProceso}. El auto volvió a borrador para su corrección.`;

      if (proceso.abogadoAsignadoId) {
        this.notificationClient
          .send({
            id_usuario_destinatario: proceso.abogadoAsignadoId,
            tipo_notificacion: 'AUTO_APROBACION_REVERSADA',
            titulo: `Aprobación de ${tipoAutoTexto} reversada`,
            mensaje: `El Jefe OCID reversó la aprobación del ${tipoAutoTexto.toLowerCase()} del proceso ${proceso.radicadoProceso}. El auto volvió a borrador para que lo corrijas y lo envíes de nuevo a revisión.`,
            descripcion_corta: `Aprobación reversada - ${proceso.radicadoProceso}`,
            icono: 'RotateCcw',
            color: '#DC2626',
            prioridad: 'Alta',
            categoria: 'DISCIPLINARIO',
            tiene_accion: true,
            texto_boton_accion: 'Ver auto',
            datos_adicionales: { processId: auto.processId, radicadoProceso: proceso.radicadoProceso, autoId: auto.id },
          })
          .catch(() => {});

        this.enviarCorreoNotificacion(proceso.abogadoAsignadoId, asuntoReverso, mensajeReverso).catch(() => {});
      }

      // Notificar a todos los Radicadores por plataforma y correo
      await this.notificarRadicadores(
        proceso,
        auto,
        asuntoReverso,
        mensajeReverso,
        'AUTO_APROBACION_REVERSADA',
        `Aprobación de ${tipoAutoTexto} reversada`,
        'RotateCcw',
        '#DC2626',
        revertidoPorId,
      );
    }

    return savedAuto;
  }

  private static readonly TIPOS_CON_ACCION_RADICADOR = new Set([
    'AUTO_ARCHIVO',
    'AUTO_FORMULACION_PLIEGO',
    'PLIEGO_CARGOS',
    'AUTO_PRORROGA',
  ]);

  private tieneAccionRadicador(tipo: string): boolean {
    return tipo.startsWith('AUTO_APERTURA_') || AutoService.TIPOS_CON_ACCION_RADICADOR.has(tipo);
  }

  /**
   * Obtiene los IDs de los usuarios con rol Radicador asociados al proceso y/o auto.
   * Incluye:
   * 1. Radicador asignado directamente al auto (si existe)
   * 2. Radicador que radicó la noticia asociada al proceso
   * 3. Usuarios activos con rol SECRETARIA_RADICADOR / RADICADOR_DISCIPLINARIO o roles afines
   * 4. Usuarios con permiso de radicación en la plataforma
   */
  private async obtenerRadicadoresProceso(
    proceso: DisciplinaryProcess,
    auto?: LegalAuto,
  ): Promise<string[]> {
    const radicadoresIds = new Set<string>();

    // 1. Radicador asignado directamente al auto
    if (auto?.radicadorAsignadoId) {
      radicadoresIds.add(auto.radicadorAsignadoId);
    }

    // 2. Radicador de la noticia asociada al proceso
    let newsRadicadorId = proceso?.news?.radicadorId;
    if (!newsRadicadorId && (proceso?.newsId || proceso?.id)) {
      try {
        const rows = await this.autoRepository.manager.query(
          `SELECT n.radicador_id 
           FROM disciplinary_news n
           INNER JOIN disciplinary_processes p ON p."newsId" = n.id
           WHERE p.id = $1
           LIMIT 1`,
          [proceso.id],
        );
        if (rows && rows.length > 0 && rows[0].radicador_id) {
          newsRadicadorId = rows[0].radicador_id;
        }
      } catch (err) {
        console.warn('Error buscando radicador de noticia en BD:', err);
      }
    }

    if (newsRadicadorId) {
      radicadoresIds.add(newsRadicadorId);
    }

    // 3. Usuarios con rol SECRETARIA_RADICADOR, RADICADOR_DISCIPLINARIO o afines
    try {
      const roleUsers: any[] = await this.autoRepository.manager.query(
        `SELECT DISTINCT u.id_user
         FROM auth.user u
         JOIN auth.user_roles ur ON ur.id_user = u.id_user
         JOIN auth.role r ON r.id = ur.id_rol
         WHERE u.is_active = true
           AND (r.code IN ('SECRETARIA_RADICADOR', 'RADICADOR_DISCIPLINARIO')
                OR UPPER(r.code) LIKE '%RADICADOR%'
                OR UPPER(r.name) LIKE '%RADICADOR%')`,
      );
      for (const r of roleUsers) {
        if (r.id_user) radicadoresIds.add(r.id_user);
      }
    } catch (err) {
      console.warn('Error consultando usuarios con rol Radicador:', err);
    }

    // 4. Usuarios con permiso de radicación
    try {
      const permUsers: any[] = await this.autoRepository.manager.query(
        `SELECT DISTINCT u.id_user
         FROM auth.user u
         JOIN auth.user_roles ur ON ur.id_user = u.id_user
         JOIN auth.role_permissions rp ON rp.id_rol = ur.id_rol
         JOIN auth.permission p ON p.id_permission = rp.id_permission AND p.is_active = true
         WHERE u.is_active = true
           AND p.code = $1`,
        ['control-disciplinario.noticia-disciplinaria.view_mine'],
      );
      for (const r of permUsers) {
        if (r.id_user) radicadoresIds.add(r.id_user);
      }
    } catch (err) {
      console.warn('Error consultando usuarios con permiso de Radicador:', err);
    }

    return Array.from(radicadoresIds).filter(Boolean);
  }

  private async enviarNotificacionesAprobacion(auto: LegalAuto, aprobadoPorId: string): Promise<void> {
    const proceso = auto.process;
    if (!proceso) return;

    const radicadorAsignadoId = auto.radicadorAsignadoId;
    const radicadorAsignadoNombre = radicadorAsignadoId
      ? await this.obtenerNombreUsuario(radicadorAsignadoId)
      : 'Sin asignar';

    const asunto = `Auto Aprobado: ${this.formatearTipoAuto(auto.tipo)} - Proceso ${proceso.radicadoProceso}`;
    const mensajeBase = `El ${this.formatearTipoAuto(auto.tipo)} del proceso ${proceso.radicadoProceso} ha sido aprobado por el jefe. ` +
      (radicadorAsignadoId
        ? `Las tareas correspondientes han sido asignadas al secretario ${radicadorAsignadoNombre}.`
        : `El auto se encuentra disponible en la plataforma para las actuaciones correspondientes.`);

    // Notificación al profesional en bandeja y correo
    if (proceso.abogadoAsignadoId) {
      this.notificationClient
        .send({
          id_usuario_destinatario: proceso.abogadoAsignadoId,
          tipo_notificacion: 'AUTO_APROBADO_RADICADOR',
          titulo: 'Auto aprobado con radicador asignado',
          mensaje: mensajeBase,
          descripcion_corta: `Auto aprobado - ${proceso.radicadoProceso}`,
          icono: 'CheckCircle',
          color: '#059669',
          prioridad: 'Alta',
          categoria: 'DISCIPLINARIO',
          tiene_accion: true,
          texto_boton_accion: 'Ver proceso',
          datos_adicionales: {
            processId: auto.processId,
            radicadoProceso: proceso.radicadoProceso,
            autoId: auto.id,
            autoTipo: auto.tipo,
            autoNumero: auto.numero,
            radicadorAsignadoId,
            radicadorAsignadoNombre,
          },
        })
        .catch(() => {});

      // Correo al profesional
      this.enviarCorreoNotificacion(proceso.abogadoAsignadoId, asunto, mensajeBase).catch(() => {});
    }

    // Notificación al rol Radicador asociado al proceso y radicadores activos
    const radicadoresIds = await this.obtenerRadicadoresProceso(proceso, auto);
    const radicadoresFiltrados = radicadoresIds.filter((rId) => rId !== aprobadoPorId);

    if (radicadoresFiltrados.length > 0) {
      const notificacionesRadicadores: import('./notification-client.service').SendNotificationDto[] = radicadoresFiltrados.map((radicadorId) => ({
        id_usuario_destinatario: radicadorId,
        tipo_notificacion: 'NUEVO_AUTO_RADICADOR',
        titulo: 'Nuevo auto disponible para radicación',
        mensaje: `El ${this.formatearTipoAuto(auto.tipo)} del proceso ${proceso.radicadoProceso} ha sido aprobado por el jefe. ` +
          (radicadorAsignadoId
            ? `Las tareas correspondientes han sido asignadas al secretario ${radicadorAsignadoNombre}.`
            : `El auto se encuentra disponible en la plataforma para continuar con las actuaciones correspondientes.`),
        descripcion_corta: `Nuevo auto - ${proceso.radicadoProceso}`,
        icono: 'FileText',
        color: '#2563EB',
        prioridad: 'Media',
        categoria: 'DISCIPLINARIO',
        tiene_accion: true,
        texto_boton_accion: 'Ver proceso',
        datos_adicionales: {
          processId: auto.processId,
          radicadoProceso: proceso.radicadoProceso,
          autoId: auto.id,
          autoTipo: auto.tipo,
          autoNumero: auto.numero,
          radicadorAsignadoId,
          radicadorAsignadoNombre,
        },
      }));
      await this.notificationClient.sendMany(notificacionesRadicadores);

      // Correo a cada radicador
      const asuntoRadicador = `Auto aprobado: ${this.formatearTipoAuto(auto.tipo)} - Proceso ${proceso.radicadoProceso}`;
      const mensajeRadicador = `El ${this.formatearTipoAuto(auto.tipo)} del proceso ${proceso.radicadoProceso} ha sido aprobado por el jefe. ` +
        (radicadorAsignadoId
          ? `Las tareas correspondientes han sido asignadas al secretario ${radicadorAsignadoNombre}.`
          : `El auto se encuentra disponible en la plataforma para continuar con las actuaciones correspondientes.`);

      await Promise.all(
        radicadoresFiltrados.map((radicadorId) =>
          this.enviarCorreoNotificacion(radicadorId, asuntoRadicador, mensajeRadicador).catch(() => {}),
        ),
      );
    }
  }

  /**
   * Envía una notificación interna y correo institucional a todos los radicadores asociados y activos
   */
  private async notificarRadicadores(
    proceso: DisciplinaryProcess | undefined,
    auto: LegalAuto | undefined,
    asunto: string,
    mensaje: string,
    tipoNotificacion: string,
    tituloNotificacion: string,
    icono: string = 'FileText',
    color: string = '#2563EB',
    excluirUserId?: string,
    datosAdicionales?: Record<string, any>,
  ): Promise<void> {
    try {
      if (!proceso) return;
      const radicadoresIds = await this.obtenerRadicadoresProceso(proceso, auto);
      const radicadoresFiltrados = radicadoresIds.filter((id) => id && id !== excluirUserId);
      if (radicadoresFiltrados.length === 0) return;

      // 1. Notificaciones en plataforma (in-app)
      const notificaciones: import('./notification-client.service').SendNotificationDto[] = radicadoresFiltrados.map((radicadorId) => ({
        id_usuario_destinatario: radicadorId,
        tipo_notificacion: tipoNotificacion,
        titulo: tituloNotificacion,
        mensaje,
        descripcion_corta: `${tituloNotificacion} - ${proceso.radicadoProceso}`,
        icono,
        color,
        prioridad: 'Alta' as const,
        categoria: 'DISCIPLINARIO',
        tiene_accion: true,
        texto_boton_accion: 'Ver proceso',
        datos_adicionales: {
          processId: proceso.id,
          radicadoProceso: proceso.radicadoProceso,
          ...(auto ? { autoId: auto.id, autoTipo: auto.tipo, autoNumero: auto.numero } : {}),
          ...datosAdicionales,
        },
      }));
      await this.notificationClient.sendMany(notificaciones).catch(() => {});

      // 2. Correo electrónico institucional estilo ESAP
      const html = this.buildEmailTemplateAvisoESAP(asunto, mensaje);
      await Promise.all(
        radicadoresFiltrados.map(async (radicadorId) => {
          try {
            const datos = await this.resolverDestinatario(radicadorId);
            if (datos.email) {
              await this.enviarEmailDirecto(datos.email, asunto, html, mensaje);
            }
          } catch (err) {
            console.error(`Error enviando correo a radicador ${radicadorId}:`, err);
          }
        }),
      );
    } catch (err) {
      console.error('Error en notificarRadicadores:', err);
    }
  }

  private buildEmailTemplateAvisoESAP(titulo: string, mensaje: string): string {
    return `
      <div style="font-family: Arial,'Helvetica Neue',sans-serif; background-color: #f0f4f8; padding: 32px 16px; margin: 0;">
        <table width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center">
          <table cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #dde3ed;">
            <tr>
              <td style="background-image:linear-gradient(135deg,#003DA5 0%,#1565C0 100%);background-color:#003DA5;padding:0;">
                <table width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr><td style="height:4px;background-color:#60A5FA;font-size:0;line-height:0;">&nbsp;</td></tr>
                  <tr><td style="padding:22px 28px 18px 28px;">
                    <table width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
                      <td>
                        <div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">ESAP</div>
                        <div style="font-size:10px;color:rgba(255,255,255,0.85);margin-top:2px;letter-spacing:0.8px;text-transform:uppercase;font-weight:600;">Notificaciones</div>
                      </td>
                      <td align="right">
                        <span style="background-color:rgba(255,255,255,0.2);color:#ffffff;font-size:11px;font-weight:600;padding:4px 14px;border-radius:20px;letter-spacing:0.3px;">Aviso</span>
                      </td>
                    </tr></table>
                  </td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px 28px 28px;">
                <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#111827;line-height:1.4;">${titulo}</h1>
                <p style="margin:0;font-size:14px;color:#4b5563;line-height:1.7;">${mensaje}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 28px 18px 28px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">ESAP — Escuela Superior de Administración Pública</p>
              </td>
            </tr>
          </table>
        </td></tr></table>
      </div>
    `;
  }

  private async enviarCorreoNotificacion(userIdOrProfId: string, asunto: string, mensaje: string): Promise<void> {
    try {
      const datos = await this.resolverDestinatario(userIdOrProfId);
      const email = datos.email;
      if (!email) return;

      const html = this.buildEmailTemplateAvisoESAP(asunto, mensaje);
      await this.enviarEmailDirecto(email, asunto, html, mensaje);
    } catch (error) {
      console.error('Error enviando correo de notificación de auto:', error);
    }
  }

  private async obtenerNombreUsuario(userId: string): Promise<string> {
    try {
      // 1. Intentar resolver con resolverDestinatario
      const datos = await this.resolverDestinatario(userId);
      if (datos.nombre && datos.nombre !== 'Usuario' && datos.nombre !== 'Profesional') {
        return datos.nombre;
      }

      // 2. Consulta directa a auth.user uniendo con auth.personas por id_person
      const result = await this.autoRepository.manager.query(
        `SELECT p.nom_largo, u.username 
         FROM auth.user u 
         LEFT JOIN auth.personas p ON p.id_person = u.id_person 
         WHERE u.id_user = $1`,
        [userId],
      );
      if (result && result.length > 0) {
        if (result[0].nom_largo && result[0].nom_largo.trim()) {
          return result[0].nom_largo.trim();
        }
        if (result[0].username) {
          return result[0].username;
        }
      }
    } catch (e) {
      console.warn('Error obteniendo nombre de usuario:', e);
    }
    return 'Usuario';
  }

  private formatearTipoAuto(tipo: string): string {
    return tipo.replace(/_/g, ' ').toLowerCase();
  }

  private async resolverDestinatario(idOrProfId: string): Promise<{
    userId: string | null;
    profId: string | null;
    nombre: string;
    email: string | null;
  }> {
    if (!idOrProfId) {
      return { userId: null, profId: null, nombre: 'Profesional', email: null };
    }

    try {
      // 1. Verificar si es un DisciplinaryProfessional
      const prof = await this.professionalRepository.findOne({
        where: { id: idOrProfId },
      });
      if (prof) {
        let userId = prof.idUser || null;
        if (!userId && prof.email) {
          try {
            const userRows = await this.autoRepository.manager.query(
              `SELECT u.id_user FROM auth.user u
               LEFT JOIN auth.personas p ON p.id_person = u.id_person
               WHERE LOWER(u.username) = LOWER($1) OR LOWER(p.dir_email) = LOWER($1)
               LIMIT 1`,
              [prof.email],
            );
            if (userRows && userRows.length > 0) {
              userId = userRows[0].id_user;
            }
          } catch {
            // ignore
          }
        }
        return {
          userId,
          profId: prof.id,
          nombre: prof.nombreCompleto || 'Profesional Universitario',
          email: prof.email || null,
        };
      }

      // 2. Verificar si es un usuario de auth.user
      const userRows = await this.autoRepository.manager.query(
        `SELECT u.id_user, u.username, p.nom_largo, p.dir_email 
         FROM auth.user u 
         LEFT JOIN auth.personas p ON p.id_person = u.id_person 
         WHERE u.id_user = $1 
         LIMIT 1`,
        [idOrProfId],
      );
      if (userRows && userRows.length > 0) {
        const u = userRows[0];
        let profLinked: DisciplinaryProfessional | null = null;
        try {
          profLinked = await this.professionalRepository.findOne({
            where: [{ idUser: u.id_user }, { email: u.dir_email }],
          });
        } catch {
          // ignore
        }
        return {
          userId: u.id_user,
          profId: profLinked ? profLinked.id : null,
          nombre: u.nom_largo || profLinked?.nombreCompleto || 'Usuario',
          email:
            u.dir_email ||
            (u.username && u.username.includes('@') ? u.username : null) ||
            profLinked?.email ||
            null,
        };
      }
    } catch (err) {
      console.warn('Error resolviendo destinatario:', err);
    }

    return {
      userId: idOrProfId,
      profId: null,
      nombre: 'Profesional',
      email: null,
    };
  }

  private async enviarEmailDirecto(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<boolean> {
    try {
      const notificationsUrl =
        process.env.NOTIFICATIONS_SERVICE_URL ||
        process.env.NOTIFICATION_SERVICE_URL ||
        'http://localhost:3009';

      await firstValueFrom(
        this.httpService.post(`${notificationsUrl}/api/v1/emails/send`, {
          to,
          subject,
          html,
          text: text || subject,
        }),
      );
      return true;
    } catch (error) {
      console.error(`Error enviando correo directo a ${to}:`, error?.message || error);
      return false;
    }
  }

  private buildEmailTemplateDevolucionAuto(data: {
    profesionalNombre: string;
    radicadoProceso: string;
    tipoAuto: string;
    numeroAuto?: string;
    jefeNombre: string;
    observaciones: string;
    fechaDevolucion: string;
  }): string {
    const tipoFormateado = this.formatearTipoAuto(data.tipoAuto);
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Auto Devuelto</title>
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.6; background-color: #f0f4f8; margin: 0; padding: 24px 16px; }
          .container { max-width: 580px; margin: 0 auto; border-radius: 10px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #dde3ed; }
          .top-bar { height: 4px; background-color: #EF4444; }
          .header { background: linear-gradient(135deg, #001A6E 0%, #003DA5 50%, #1565C0 100%); color: #ffffff; padding: 24px 28px; }
          .header-table { width: 100%; border-collapse: collapse; }
          .header-title { font-size: 20px; font-weight: 800; letter-spacing: 0.5px; color: #ffffff; margin: 0; }
          .header-subtitle { font-size: 11px; color: rgba(255, 255, 255, 0.8); margin-top: 3px; letter-spacing: 0.8px; text-transform: uppercase; font-weight: 500; }
          .badge { display: inline-block; background-color: rgba(239, 68, 68, 0.25); border: 1px solid rgba(239, 68, 68, 0.5); color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
          .content { padding: 28px; }
          .greeting { font-size: 16px; font-weight: 700; color: #111827; margin: 0 0 14px 0; }
          .lead-text { font-size: 14px; color: #374151; margin-bottom: 20px; line-height: 1.6; }
          .details-box { background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px; }
          .details-table { width: 100%; border-collapse: collapse; font-size: 13px; }
          .details-label { padding: 6px 0; color: #64748B; font-weight: 600; width: 40%; }
          .details-value { padding: 6px 0; color: #0F172A; font-weight: 700; text-align: right; width: 60%; }
          .alert-box { background-color: #FEF2F2; border-left: 4px solid #EF4444; border-radius: 6px; padding: 16px; margin-bottom: 20px; }
          .alert-title { font-size: 12px; font-weight: 700; color: #991B1B; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px; }
          .alert-text { font-size: 13px; color: #7F1D1D; margin: 0; line-height: 1.5; }
          .action-box { background-color: #EFF6FF; border-left: 4px solid #2563EB; border-radius: 6px; padding: 16px; margin-bottom: 24px; }
          .action-title { font-size: 12px; font-weight: 700; color: #1E40AF; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px; }
          .action-text { font-size: 13px; color: #1E3A8A; margin: 0; line-height: 1.5; }
          .btn-container { text-align: center; margin: 24px 0 16px 0; }
          .btn { display: inline-block; background-color: #003DA5; color: #ffffff !important; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 13px; box-shadow: 0 2px 4px rgba(0, 61, 165, 0.2); }
          .footer { background-color: #F8FAFC; padding: 20px 28px; font-size: 11px; color: #64748B; text-align: center; border-top: 1px solid #E2E8F0; }
          .footer-brand { font-weight: 700; color: #334155; margin-bottom: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="top-bar"></div>
          <div class="header">
            <table class="header-table">
              <tr>
                <td>
                  <h1 class="header-title">ESAP</h1>
                  <div class="header-subtitle">Control Interno Disciplinario</div>
                </td>
                <td style="text-align: right;">
                  <span class="badge">Auto Devuelto</span>
                </td>
              </tr>
            </table>
          </div>
          <div class="content">
            <p class="greeting">Estimado(a) ${data.profesionalNombre},</p>
            <p class="lead-text">
              Le informamos que el Auto de tipo <strong style="text-transform: capitalize;">${tipoFormateado}</strong> correspondiente al proceso disciplinario 
              <strong style="color: #003DA5;">${data.radicadoProceso}</strong> ha sido <strong>devuelto</strong> por el Jefe de la Oficina de Control Interno Disciplinario (OCID).
            </p>

            <div class="details-box">
              <table class="details-table">
                <tr>
                  <td class="details-label">Radicado del Proceso:</td>
                  <td class="details-value" style="color: #003DA5;">${data.radicadoProceso}</td>
                </tr>
                <tr>
                  <td class="details-label">Tipo de Auto:</td>
                  <td class="details-value" style="text-transform: capitalize;">${tipoFormateado}</td>
                </tr>
                ${
                  data.numeroAuto
                    ? `<tr>
                  <td class="details-label">Consecutivo:</td>
                  <td class="details-value">${data.numeroAuto}</td>
                </tr>`
                    : ''
                }
                <tr>
                  <td class="details-label">Devuelto por:</td>
                  <td class="details-value">${data.jefeNombre}</td>
                </tr>
                <tr>
                  <td class="details-label">Fecha de Devolución:</td>
                  <td class="details-value">${data.fechaDevolucion}</td>
                </tr>
              </table>
            </div>

            <div class="alert-box">
              <div class="alert-title">Motivo de Devolución / Observaciones:</div>
              <p class="alert-text">${data.observaciones}</p>
            </div>

            <div class="action-box">
              <div class="action-title">Acciones Requeridas por el Profesional:</div>
              <p class="action-text">
                Este auto requiere las acciones y correcciones correspondientes por parte del Profesional a cargo. Por favor, ingrese al expediente en la plataforma, atienda las observaciones indicadas y cargue la nueva versión del documento para someterlo nuevamente a revisión y aprobación.
              </p>
            </div>

            <div class="btn-container">
              <a href="#" class="btn">Ingresar a la Plataforma</a>
            </div>
          </div>
          <div class="footer">
            <div class="footer-brand">ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP</div>
            <div>Oficina de Control Interno Disciplinario</div>
            <div style="margin-top: 8px; font-size: 10px; color: #94A3B8;">
              Este es un correo institucional generado automáticamente por el Sistema Integral de Gestión Legal (SIGL-ESAP). Por favor no responda a este mensaje.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private async enviarNotificacionesDevolucion(
    auto: LegalAuto,
    aprobadoPorId: string,
    observaciones?: string,
  ): Promise<void> {
    try {
      let proceso = auto.process;
      if (!proceso && auto.processId) {
        proceso = await this.processService.findById(auto.processId, false);
      }
      if (!proceso) return;

      const jefeDatos = await this.resolverDestinatario(aprobadoPorId);
      const jefeNombre = jefeDatos.nombre || 'Jefe OCID';

      const destinatariosIds = new Set<string>();
      if (proceso.abogadoAsignadoId) {
        destinatariosIds.add(proceso.abogadoAsignadoId);
      }
      try {
        const v1 = await this.versionRepository.findOne({
          where: { auto: { id: auto.id }, versionNumber: 1 },
        });
        if (v1?.createdBy && v1.createdBy !== aprobadoPorId) {
          destinatariosIds.add(v1.createdBy);
        }
      } catch {
        // ignore
      }

      // Incluir al rol Radicador asociado al proceso y radicadores activos
      const radicadoresIds = await this.obtenerRadicadoresProceso(proceso, auto);
      for (const idRadicador of radicadoresIds) {
        if (idRadicador && idRadicador !== aprobadoPorId) {
          destinatariosIds.add(idRadicador);
        }
      }

      const motivoTexto = observaciones?.trim() || 'Sin observaciones registradas';
      const tipoAutoFormateado = this.formatearTipoAuto(auto.tipo);

      for (const idDestinatario of destinatariosIds) {
        try {
          const datos = await this.resolverDestinatario(idDestinatario);

          const notifInterna = {
            tipo_notificacion: 'AUTO_DEVUELTO',
            titulo: 'Auto devuelto para corrección',
            mensaje:
              `El ${tipoAutoFormateado} del proceso ${proceso.radicadoProceso} fue devuelto por el Jefe OCID (${jefeNombre}). ` +
              `Motivo: ${motivoTexto}. Requiere las acciones y correcciones correspondientes por parte del Profesional.`,
            descripcion_corta: `Auto devuelto - ${proceso.radicadoProceso}`,
            icono: 'RotateCcw',
            color: '#DC2626',
            prioridad: 'Alta' as const,
            categoria: 'DISCIPLINARIO',
            tiene_accion: true,
            texto_boton_accion: 'Ver auto',
            datos_adicionales: {
              processId: auto.processId,
              radicadoProceso: proceso.radicadoProceso,
              autoId: auto.id,
              autoTipo: auto.tipo,
              motivo: motivoTexto,
              accionRequerida: 'Requiere correcciones por parte del Profesional',
            },
          };

          if (datos.userId) {
            await this.notificationClient
              .send({
                ...notifInterna,
                id_usuario_destinatario: datos.userId,
              })
              .catch((err) =>
                console.error('Error enviando notificación interna a userId:', err),
              );
          }

          if (idDestinatario && idDestinatario !== datos.userId) {
            await this.notificationClient
              .send({
                ...notifInterna,
                id_usuario_destinatario: idDestinatario,
              })
              .catch(() => {});
          }

          if (datos.email) {
            const subject = `[AUTO DEVUELTO] ${tipoAutoFormateado.toUpperCase()} - Proceso ${proceso.radicadoProceso}`;
            const html = this.buildEmailTemplateDevolucionAuto({
              profesionalNombre: datos.nombre,
              radicadoProceso: proceso.radicadoProceso,
              tipoAuto: auto.tipo,
              numeroAuto: auto.numero,
              jefeNombre,
              observaciones: motivoTexto,
              fechaDevolucion: new Date().toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
            });

            await this.enviarEmailDirecto(
              datos.email,
              subject,
              html,
              `El ${tipoAutoFormateado} del proceso ${proceso.radicadoProceso} ha sido devuelto por el Jefe OCID. ` +
                `Motivo: ${motivoTexto}. Requiere las acciones correspondientes por parte del Profesional.`,
            );
          }
        } catch (itemErr) {
          console.error(
            `Error enviando notificación de devolución a destinatario ${idDestinatario}:`,
            itemErr,
          );
        }
      }
    } catch (globalErr) {
      console.error('Error en enviarNotificacionesDevolucion:', globalErr);
    }
  }

  async getAvailableRadicadores(): Promise<
    Array<{
      id: string;
      nombre: string;
      email: string;
      autosAsignados: number;
      cargaPorcentaje: number;
    }>
  > {
    const radicadoresRows: any[] = await this.autoRepository.manager.query(
      `SELECT DISTINCT u.id_user
       FROM auth.user u
       JOIN auth.user_roles ur ON ur.id_user = u.id_user
       JOIN auth.role_permissions rp ON rp.id_rol = ur.id_rol
       JOIN auth.permission p ON p.id_permission = rp.id_permission AND p.is_active = true
       WHERE p.code = $1`,
      ['control-disciplinario.noticia-disciplinaria.view_mine'],
    );

    const ids = radicadoresRows.map((r) => r.id_user).filter(Boolean);
    if (ids.length === 0) {
      return [];
    }

    const [usuarios, conteoAutos] = await Promise.all([
      this.autoRepository.manager.query(
        `SELECT u.id_user, p.nom_largo, p.dir_email FROM auth.user u JOIN auth.personas p ON p.id_person = u.id_person WHERE u.id_user = ANY($1::uuid[])`,
        [ids],
      ),
      this.autoRepository
        .createQueryBuilder('auto')
        .select('auto.radicadorAsignadoId', 'radicadorId')
        .addSelect('COUNT(*)', 'count')
        .where('auto.radicadorAsignadoId IS NOT NULL')
        .andWhere('auto.radicadorAsignadoId IN (:...ids)', { ids })
        .groupBy('auto.radicadorAsignadoId')
        .getRawMany(),
    ]);

    const usuarioMap = new Map<string, { nombre: string; email: string }>(
      usuarios.map((u: any) => [u.id_user, { nombre: u.nom_largo || 'Usuario', email: u.dir_email || '' }]),
    );

    const maxAsignados = Math.max(
      1,
      ...conteoAutos.map((c: any) => parseInt(c.count, 10)),
    );

    return ids
      .map((id) => {
        const usuario = usuarioMap.get(id) || { nombre: 'Usuario', email: '' };
        const conteo = conteoAutos.find((c: any) => c.radicadorId === id);
        const autosAsignados = conteo ? parseInt(conteo.count, 10) : 0;
        const cargaPorcentaje = Math.round((autosAsignados / maxAsignados) * 100);

        return {
          id,
          nombre: usuario.nombre,
          email: usuario.email,
          autosAsignados,
          cargaPorcentaje,
        };
      })
      .filter((r) => usuarioMap.has(r.id));
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
