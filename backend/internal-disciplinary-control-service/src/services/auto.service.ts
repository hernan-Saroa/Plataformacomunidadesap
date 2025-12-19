import {
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LegalAuto, AutoStatus } from '../entities/legal-auto.entity';
import { AutoVersion } from '../entities/auto-version.entity';
import {
  CreateLegalAutoDto,
} from '../dtos/create-legal-auto.dto';
import { RegisterNotificationDto } from '../dtos/register-notification.dto';
import { ReviewAutoDto, ReviewAction } from '../dtos/review-auto.dto';
import { ProcessService } from './process.service';

import { SystemConfiguration } from '../entities/system-configuration.entity';

@Injectable()
export class AutoService {
  constructor(
    @InjectRepository(LegalAuto)
    private autoRepository: Repository<LegalAuto>,
    @InjectRepository(AutoVersion)
    private versionRepository: Repository<AutoVersion>,
    @InjectRepository(SystemConfiguration)
    private configRepository: Repository<SystemConfiguration>,
    private processService: ProcessService,
  ) { }

  /**
   * Crea un nuevo auto (borrador)
   */
  async create(createAutoDto: CreateLegalAutoDto): Promise<LegalAuto> {
    try {
      // Validar que el proceso existe
      await this.processService.findById(createAutoDto.processId, false);

      // CORRECCIÓN AQUI: Mapeo manual de campos DTO -> Entidad
      const auto = this.autoRepository.create({
        tipo: createAutoDto.tipoAuto,             // Asigna tipoAuto a tipo
        contenido: createAutoDto.contenidoHtml,   // Asigna contenidoHtml a contenido
        process: { id: createAutoDto.processId }, // Relaciona el ID del proceso
        estado: AutoStatus.BORRADOR,              // Estado inicial
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
    return await this.autoRepository.find({ relations: ['process'] });
  }

  /**
   * Obtiene un auto por ID
   */
  async findById(id: string): Promise<LegalAuto> {
    const auto = await this.autoRepository.findOne({
      where: { id },
      relations: ['process'],
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
      where: { process: { id: processId } }, // Corrección para buscar por relación
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Envía un auto a revisión (cambia de BORRADOR a REVISION_JEFE)
   */
  async sendToReview(id: string): Promise<LegalAuto> {
    const auto = await this.findById(id);

    if (auto.estado !== AutoStatus.BORRADOR) {
      throw new HttpException(
        'Solo se pueden enviar borradores a revisión',
        HttpStatus.BAD_REQUEST,
      );
    }

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
    const auto = await this.findById(id);

    if (auto.estado !== AutoStatus.REVISION_JEFE) {
      throw new HttpException(
        'Solo se pueden aprobar autos en revisión',
        HttpStatus.BAD_REQUEST,
      );
    }

    // AUDIT LOGGING (INTEGRACIÓN SEGURIDAD)
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
      // Simular generación de firma
      auto.firmaUrl = this.generateMockSignatureUrl(
        auto.id,
        'ELECTRONICA',
      );
      auto.estado = AutoStatus.FIRMADO;
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
    const auto = await this.findById(id);

    if (auto.estado !== AutoStatus.BORRADOR && auto.estado !== AutoStatus.DEVUELTO) {
      throw new HttpException(
        'Solo se pueden editar borradores o autos devueltos',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Si hay contenido previo, guardar versión
    if (auto.contenido && auto.contenido !== nuevoContenido) {
      await this.versionRepository.save({
        auto: auto,
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

  async getVersions(id: string): Promise<AutoVersion[]> {
    return await this.versionRepository.find({
      where: { auto: { id } },
      order: { versionNumber: 'DESC' },
    });
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

    return await this.autoRepository.save(auto);
  }

  /**
   * Genera una URL de firma simulada
   */
  private generateMockSignatureUrl(autoId: string, tipoFirma: string): string {
    const timestamp = new Date().toISOString();
    return `https://storage.example.com/firmas/${autoId}_${tipoFirma}_${timestamp}.pdf`;
  }
}