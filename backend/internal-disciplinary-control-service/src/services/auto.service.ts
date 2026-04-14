import {
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LegalAuto, AutoStatus, AutoType } from '../entities/legal-auto.entity';
import { AutoVersion } from '../entities/auto-version.entity';
import { DisciplinaryProcessActuacion } from '../entities/disciplinary-process-actuacion.entity';
import {
  CreateLegalAutoDto,
} from '../dtos/create-legal-auto.dto';
import { RegisterNotificationDto } from '../dtos/register-notification.dto';
import { ReviewAutoDto, ReviewAction } from '../dtos/review-auto.dto';
import { ProcessService } from './process.service';
import { ProcessStage } from '../entities/disciplinary-process.entity';
import { SystemConfiguration } from '../entities/system-configuration.entity';
import { AlertasService } from './alertas.service';
import { TipoAlerta } from '../entities/alerta-enviada.entity';
import { PdfModifierService } from './pdf-modifier.service';
import { SequenceService } from './sequence.service';
import { DisciplinaryProcess, ProcessStatus } from '../entities/disciplinary-process.entity';

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
  ) { }

  /**
   * Crea un nuevo auto (borrador)
   */
  async create(createAutoDto: CreateLegalAutoDto): Promise<LegalAuto> {
    try {
      // Validar que el proceso existe
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

      // CORRECCIÓN AQUI: Mapeo manual de campos DTO -> Entidad
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
        prorrogaMeses: createAutoDto.prorrogaMeses ?? null,
      });

      const savedAuto = await this.autoRepository.save(auto);

      // Si tiene documento PDF, agregar el consecutivo
      if (savedAuto.documentUrl && savedAuto.documentName?.toLowerCase().endsWith('.pdf')) {
        // Asumimos que documentUrl es el nombre del archivo en uploads (StorageService)
        // Ejemplo: "1738923_archivo.pdf"
        try {
          await this.pdfModifierService.addConsecutive(
            savedAuto.documentUrl,
            savedAuto.numero,
            proceso.radicadoProceso
          );
        } catch (e) {
          console.error('Error al agregar consecutivo al PDF', e);
          // No fallamos la creación del auto, solo loggeamos
        }
      }

      return savedAuto;
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
  async findById(id: string, relations: string[] = ['process', 'versions']): Promise<LegalAuto> {
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
      where: { processId: processId },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Envía un auto a revisión (cambia a REVISION_JEFE)
   */
  async sendToReview(id: string): Promise<LegalAuto> {
    const auto = await this.findById(id, ['process']);

    // Para autos que no son de archivo, solo permitir enviar borradores o autos devueltos a revisión
    if (auto.tipo !== AutoType.AUTO_ARCHIVO && auto.estado !== AutoStatus.BORRADOR && auto.estado !== AutoStatus.DEVUELTO) {
      throw new HttpException(
        'Solo se pueden enviar borradores o autos devueltos a revisión',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Para autos de archivo, permitir enviar a revisión en cualquier estado
    // No hay restricciones adicionales para AUTO_ARCHIVO

    auto.estado = AutoStatus.REVISION_JEFE;
    return await this.autoRepository.save(auto);
  }

  /**
   * Aprueba o rechaza un auto (operación del Jefe)
   */
  async approve(
    id: string,
    reviewAutoDto: ReviewAutoDto,
    aprobadoPorId: string,
  ): Promise<LegalAuto> {
    const auto = await this.findById(id, ['process']);

    if (auto.estado !== AutoStatus.REVISION_JEFE) {
      throw new HttpException(
        'Solo se pueden aprobar autos en revisión',
        HttpStatus.BAD_REQUEST,
      );
    }

    // AUDIT LOGGING (System Config based)
    try {
      const config = await this.configRepository.findOne({ where: {} });
      if (config?.securitySettings?.auditEnabled) {
        console.log(`[AUDIT] Action: ${reviewAutoDto.action} | AutoID: ${id} | User: ${aprobadoPorId} | Timestamp: ${new Date().toISOString()}`);
      }
    } catch (e) {
      console.warn('Audit log failed', e);
    }

    if (reviewAutoDto.action === ReviewAction.APPROVE) {
      auto.estado = AutoStatus.APROBADO;

      // Asignar consecutivo global al momento de la aprobación
      auto.numero = await this.sequenceService.generateAutoConsecutivo();

      // Registrar en Histoial (Version)
      await this.versionRepository.save({
        auto: { id: auto.id } as LegalAuto,
        contenido: auto.contenido, // No cambia el contenido
        versionNumber: auto.currentVersion,
        createdBy: aprobadoPorId,
        changeReason: 'Auto Aprobado por Jefe (Pendiente de Firma)',
        documentUrl: auto.documentUrl,
        documentName: auto.documentName,
      });

      // Si es auto de apertura con etapa destino, cambiar etapa del proceso
      if (APERTURA_TYPES.includes(auto.tipo as AutoType) && auto.etapaDestino) {
        const fechaAprobacion = new Date();
        const etapaAnterior = auto.process.etapaActual;

        const { proceso: procesoActualizado, tiempoAcumuladoDias } =
          await this.processService.changeStageByAutoApertura(
            auto.processId,
            auto.etapaDestino as ProcessStage,
            fechaAprobacion,
          );

        const tiempoTexto = tiempoAcumuladoDias !== null
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

      // Si es un auto de archivo, archivar el proceso y detener conteos de vencimiento
      if (auto.tipo === 'AUTO_ARCHIVO') {
        await this.archiveProcess(auto.processId, aprobadoPorId);
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

    return await this.autoRepository.save(auto);
  }

  /**
   * Firma digitalmente un auto aprobado
   */
  async sign(id: string, userId: string, signData?: any): Promise<LegalAuto> {
    const auto = await this.findById(id, ['process']);

    // Permitir firmar si está APROBADO o EN REVISIÓN (Jefe puede firmar directo)
    if (auto.estado !== AutoStatus.APROBADO && auto.estado !== AutoStatus.REVISION_JEFE) {
      throw new HttpException(
        'Solo se pueden firmar autos que estén en revisión o aprobados',
        HttpStatus.BAD_REQUEST,
      );
    }

    // NOTA: A petición del usuario, NO reemplazamos el archivo original con el archivo subido (Firma Local).
    // Mantenemos el archivo original (que ya tiene el consecutivo) y le estampamos la firma visualmente al final.

    // La firma queda en el mismo documento (modificado in-place)
    auto.firmaUrl = auto.documentUrl;
    auto.estado = AutoStatus.FIRMADO;
    auto.aprobadoPorId = userId;

    // Agregar la estampa visual AL MISMO ARCHIVO SIEMPRE (para todos los métodos de firma)
    if (auto.documentUrl && auto.documentName?.toLowerCase().endsWith('.pdf')) {
      try {
        // TODO: Obtener nombre real del usuario firmante
        const signerName = "Jefe Control Disciplinario";
        const role = "Jefe Oficina";

        // Esto modifica el archivo en disco (in-place)
        await this.pdfModifierService.addSignature(
          auto.documentUrl,
          signerName,
          role
        );
      } catch (e) {
        console.error('Error al estampar firma en PDF', e);
      }
    }

    // Registrar en Historial
    await this.versionRepository.save({
      auto: { id: auto.id } as LegalAuto,
      contenido: auto.contenido,
      versionNumber: auto.currentVersion,
      createdBy: userId, // Quien firma
      changeReason: 'Auto Firmado (Estampado Digital en Documento Original)',
      documentUrl: auto.documentUrl,
      documentName: auto.documentName,
    });

    return await this.autoRepository.save(auto);
  }

  /**
   * Actualiza el contenido de un auto (solo si está en BORRADOR)
   */
  /**
   * Actualiza el contenido de un auto (solo si está en BORRADOR)
   * GUARDA VERSIÓN ANTERIOR
   */
  async updateContent(id: string, nuevoContenido: string, userId?: string): Promise<LegalAuto> {
    const auto = await this.findById(id, ['process']);

    if (auto.estado !== AutoStatus.BORRADOR && auto.estado !== AutoStatus.DEVUELTO && auto.tipo !== 'AUTO_ARCHIVO') {
      throw new HttpException(
        'Solo se pueden editar borradores, autos devueltos o autos de archivo',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Si hay contenido previo, guardar versión
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
    auto.contenido = nuevoContenido;
    return await this.autoRepository.save(auto);
  }

  /**
   * Actualiza un auto completo (Metadatos y Archivo)
   * Los metadatos básicos (tipo, numero, comentarios) se pueden editar en cualquier estado
   * El contenido y archivos solo se pueden editar en BORRADOR o DEVUELTO
   */
  async update(id: string, updateData: any, userId?: string): Promise<LegalAuto> {
    const auto = await this.findById(id, ['process']);

    // Metadatos básicos siempre se pueden editar (tipo, numero, comentarios)
    if (updateData.tipo !== undefined) auto.tipo = updateData.tipo;
    if (updateData.numero !== undefined) auto.numero = updateData.numero;
    if (updateData.comentarios !== undefined) auto.comentarios = updateData.comentarios;

    // Contenido y archivos solo se pueden editar en estados editables, excepto para autos de archivo que siempre se pueden editar
    const canEditContent = auto.estado === AutoStatus.BORRADOR || auto.estado === AutoStatus.DEVUELTO || auto.tipo === 'AUTO_ARCHIVO';

    if (!canEditContent && (updateData.contenidoHtml || updateData.documentUrl)) {
      throw new HttpException(
        'Solo se pueden editar contenido y archivos en borradores o autos devueltos',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Detectar cambios sustanciales para versionar (solo si se puede editar contenido)
    if (canEditContent) {
      const contentChanged = updateData.contenidoHtml && updateData.contenidoHtml !== auto.contenido;
      const fileChanged = updateData.documentUrl && updateData.documentUrl !== auto.documentUrl;

      if (contentChanged || fileChanged) {
        // Guardar versión anterior
        await this.versionRepository.save({
          auto: { id: auto.id } as LegalAuto,
          contenido: auto.contenido, // Guardamos el contenido HTML antiguo
          versionNumber: auto.currentVersion,
          createdBy: userId || null,
          changeReason: fileChanged ? 'Actualización de archivo adjunto' : 'Actualización de contenido',
          documentUrl: auto.documentUrl, // Guardar referencia al archivo actual
          documentName: auto.documentName,
        });
        auto.currentVersion += 1;
      }

      // Actualizar contenido y archivos solo si está permitido
      if (updateData.contenidoHtml !== undefined) {
        auto.contenido = updateData.contenidoHtml;
      }
      if (updateData.documentUrl !== undefined) auto.documentUrl = updateData.documentUrl;
      if (updateData.documentName !== undefined) auto.documentName = updateData.documentName;
      if (updateData.documentType !== undefined) auto.documentType = updateData.documentType;
      if (updateData.documentSize !== undefined) auto.documentSize = updateData.documentSize;
    }

    return await this.autoRepository.save(auto);
  }

  async getVersions(id: string): Promise<AutoVersion[]> {
    return await this.versionRepository.find({
      where: { auto: { id } },
      order: { versionNumber: 'DESC' },
    });
  }

  async getAutoVersionContent(id: string, versionNumber: number): Promise<AutoVersion> {
    const version = await this.versionRepository.findOne({
      where: {
        auto: { id },
        versionNumber: versionNumber
      },
      relations: ['auto']
    });

    if (!version) {
      throw new HttpException('Versión no encontrada', HttpStatus.NOT_FOUND);
    }
    return version;
  }

  /**
   * Registra la notificación de un auto (Secretaría)
   */
  async registerNotification(id: string, dto: RegisterNotificationDto): Promise<LegalAuto> {
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

    // Registrar en Historial (Version)
    await this.versionRepository.save({
      auto: { id: savedAuto.id } as LegalAuto,
      contenido: savedAuto.contenido,
      versionNumber: savedAuto.currentVersion,
      createdBy: 'Sistema', // O el ID del usuario si estuviera disponible
      changeReason: JSON.stringify({
        action: 'NOTIFICACION_REGISTRADA',
        date: dto.notificationDate,
        evidenceUrl: dto.notificationEvidence || null
      }),
    });

    // Generar Notificación de Sistema en la Bandeja
    try {
      const asunto = `Auto Notificado: ${auto.tipo} - ${auto.numero || 'Sin Número'}`;
      const mensaje = `El auto ha sido notificado correctamente con fecha ${dto.notificationDate}. Radicado: ${auto.process?.radicadoProceso || 'N/A'}`;

      // Intentar obtener email del profesional asignado o usuario actual (si estuviera disponible)
      // Como fallback usamos 'Usuario Actual' o idealmente el ID del abogado asignado al proceso
      // Por ahora asignamos el aviso al abogado del proceso si existe
      let destinatario = 'Profesional Asignado';
      if (auto.process && auto.process.abogadoAsignadoId) {
        // TODO: Lookup email from UserService if needed, or store it.
        // For now, assuming we want to notify the system/tray.
        destinatario = 'Sistema';
      }

      await this.alertasService.crearNotificacionAuto(
        savedAuto.id,
        TipoAlerta.SISTEMA,
        destinatario,
        asunto,
        mensaje,
        'Sistema'
      );
    } catch (e) {
      console.error('Error creando notificación en bandeja:', e);
      // No fallamos la transacción principal si falla la notificación auxiliar
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
  private async archiveProcess(processId: string, aprobadoPorId: string): Promise<void> {
    try {
      // Cambiar estado a archivado
      await this.processService.updateStatus(processId, ProcessStatus.ARCHIVADO);

      // Detener conteo de vencimiento activo (limpiar fecha de vencimiento)
      const process = await this.processService.findById(processId, false);
      process.fechaVencimientoEtapa = null;
      await this.processService['processRepository'].save(process); // Acceso directo al repo para actualizar fecha

      // Notificar al profesional responsable
      if (process.abogadoAsignadoId) {
        const asunto = `Proceso Archivado: ${process.radicadoProceso}`;
        const mensaje = `El proceso ${process.radicadoProceso} ha sido archivado tras la aprobación del auto de archivo. Todos los conteos de vencimiento han sido detenidos.`;

        await this.alertasService.crearNotificacionAuto(
          null, // No hay auto específico
          TipoAlerta.SISTEMA,
          process.abogadoAsignadoId, // Notificar al abogado asignado
          asunto,
          mensaje,
          aprobadoPorId
        );
      }
    } catch (error) {
      console.error('Error archivando proceso:', error);
      // No fallamos la aprobación del auto si falla el archivado
    }
  }

  /**
   * Genera una URL de firma simulada
   */
  private generateMockSignatureUrl(autoId: string, tipoFirma: string): string {
    const timestamp = new Date().toISOString();
    return `https://storage.example.com/firmas/${autoId}_${tipoFirma}_${timestamp}.pdf`;
  }
}
