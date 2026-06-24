import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DisciplinaryProcessReassignmentRequest,
  ReassignmentRequestStatus,
  ReassignmentPriority,
} from '../entities/disciplinary-process-reassignment-request.entity';
import { DisciplinaryProcess } from '../entities/disciplinary-process.entity';
import { DisciplinaryProfessional } from '../entities/disciplinary-professional.entity';
import { CreateReassignmentRequestDto } from '../dtos/create-reassignment-request.dto';
import { ApproveReassignmentRequestDto } from '../dtos/approve-reassignment-request.dto';
import { NotificationClientService } from './notification-client.service';
import { DisciplinaryEmailService } from './disciplinary-email.service';

@Injectable()
export class DisciplinaryProcessReassignmentService {
  constructor(
    @InjectRepository(DisciplinaryProcessReassignmentRequest)
    private reassignmentRepo: Repository<DisciplinaryProcessReassignmentRequest>,
    @InjectRepository(DisciplinaryProcess)
    private processRepo: Repository<DisciplinaryProcess>,
    @InjectRepository(DisciplinaryProfessional)
    private professionalRepo: Repository<DisciplinaryProfessional>,
    private notificationClient: NotificationClientService,
    private emailService: DisciplinaryEmailService,
  ) {}

  async createReassignmentRequest(
    dto: CreateReassignmentRequestDto,
  ): Promise<DisciplinaryProcessReassignmentRequest> {
    // Verificar que el proceso existe
    const process = await this.processRepo.findOne({
      where: { id: dto.processId },
      relations: ['abogadoAsignado'],
    });

    if (!process) {
      throw new NotFoundException(
        `Proceso con ID ${dto.processId} no encontrado`,
      );
    }

    // Verificar que el nuevo profesional existe
    const newProfessional = await this.professionalRepo.findOne({
      where: { id: dto.newProfessionalId },
    });

    if (!newProfessional) {
      throw new NotFoundException(
        `Profesional con ID ${dto.newProfessionalId} no encontrado`,
      );
    }

    // Verificar que no haya una solicitud pendiente para este proceso
    const existingRequest = await this.reassignmentRepo.findOne({
      where: {
        processId: dto.processId,
        status: ReassignmentRequestStatus.PENDIENTE,
      },
    });

    if (existingRequest) {
      throw new BadRequestException(
        'Ya existe una solicitud de reasignación pendiente para este proceso',
      );
    }

    const wasInitiallyUnassigned = !process.abogadoAsignado;

    const request = this.reassignmentRepo.create({
      processId: dto.processId,
      currentProfessionalId: process.abogadoAsignado?.id || null,
      newProfessionalId: dto.newProfessionalId,
      wasInitiallyUnassigned,
      justification: dto.justification,
      priority: dto.priority || ReassignmentPriority.NORMAL,
      requestedBy: dto.requestedBy,
      requestedById: dto.requestedById,
      status: ReassignmentRequestStatus.PENDIENTE,
    });

    const savedRequest = await this.reassignmentRepo.save(request);

    this.notificationClient.notifyByRole('JEFE_DE_LA_OCID', {
      tipo_notificacion: 'SOLICITUD_REASIGNACION',
      titulo: wasInitiallyUnassigned ? 'Solicitud de asignación inicial de proceso' : 'Solicitud de reasignación de proceso',
      mensaje: `${dto.requestedBy} ha solicitado ${wasInitiallyUnassigned ? 'la asignación inicial' : 'la reasignación'} del proceso${wasInitiallyUnassigned ? ' (sin profesional asignado)' : ''}. Justificación: ${dto.justification}`,
      descripcion_corta: `Nueva solicitud de ${wasInitiallyUnassigned ? 'asignación inicial' : 'reasignación'} pendiente de aprobación`,
      icono: 'UserCheck',
      color: '#D97706',
      prioridad: 'Alta',
      categoria: 'DISCIPLINARIO',
      tiene_accion: true,
      texto_boton_accion: 'Revisar solicitud',
      datos_adicionales: { solicitudId: savedRequest.id, procesoId: dto.processId, wasInitiallyUnassigned },
    }).catch(() => {});

    return savedRequest;
  }

  async approveReassignmentRequest(
    requestId: string,
    dto: ApproveReassignmentRequestDto,
  ): Promise<DisciplinaryProcessReassignmentRequest> {
    const request = await this.reassignmentRepo.findOne({
      where: { id: requestId },
      relations: ['process', 'newProfessional'],
    });

    if (!request) {
      throw new NotFoundException(`Solicitud de reasignación con ID ${requestId} no encontrada`);
    }

    if (request.status !== ReassignmentRequestStatus.PENDIENTE) {
      throw new BadRequestException('La solicitud ya ha sido procesada');
    }

    if (dto.approved) {
      // Aprobar: cambiar el profesional en el proceso
      await this.processRepo.update(request.processId, {
        abogadoAsignadoId: request.newProfessional.id,
      });

      request.status = ReassignmentRequestStatus.APROBADA;
      if (dto.jefeObservations) {
        request.jefeObservations = dto.jefeObservations;
      }
    } else {
      // Rechazar
      request.status = ReassignmentRequestStatus.RECHAZADA;
      if (dto.rejectionReason) {
        request.rejectionReason = dto.rejectionReason;
      }
      if (dto.jefeObservations) {
        request.jefeObservations = dto.jefeObservations;
      }
    }

    request.resolvedAt = new Date();
    // Set resolvedBy fields from the DTO
    // Note: These would typically come from authenticated user context,
    // but for now we accept them from the DTO

    const savedRequest = await this.reassignmentRepo.save(request);

    // Return the saved request with relations loaded
    const result = await this.reassignmentRepo.findOne({
      where: { id: savedRequest.id },
      relations: ['process', 'currentProfessional', 'newProfessional'],
    });

    if (!result) {
      throw new NotFoundException(`Solicitud de reasignación con ID ${savedRequest.id} no encontrada después de guardar`);
    }

    const radicadoProceso = result.process?.radicadoProceso ?? 'proceso';

    if (result.currentProfessionalId) {
      const aprobado = dto.approved;
      this.notificationClient.send({
        id_usuario_destinatario: result.currentProfessionalId,
        tipo_notificacion: aprobado ? 'REASIGNACION_APROBADA' : 'REASIGNACION_RECHAZADA',
        titulo: aprobado ? 'Solicitud de reasignación aprobada' : 'Solicitud de reasignación rechazada',
        mensaje: aprobado
          ? `Tu solicitud de reasignación del proceso ${radicadoProceso} fue aprobada.${dto.jefeObservations ? ` Observaciones: ${dto.jefeObservations}` : ''}`
          : `Tu solicitud de reasignación del proceso ${radicadoProceso} fue rechazada.${dto.rejectionReason ? ` Motivo: ${dto.rejectionReason}` : ''}`,
        descripcion_corta: aprobado ? 'Reasignación aprobada' : 'Reasignación rechazada',
        icono: aprobado ? 'CheckCircle' : 'XCircle',
        color: aprobado ? '#16A34A' : '#DC2626',
        prioridad: 'Alta',
        categoria: 'DISCIPLINARIO',
        tiene_accion: true,
        texto_boton_accion: 'Ver proceso',
        datos_adicionales: { solicitudId: result.id, procesoId: result.processId },
      }).catch(() => {});
    }

    if (dto.approved && result.newProfessional?.id) {
      this.notificationClient.send({
        id_usuario_destinatario: result.newProfessional.id,
        tipo_notificacion: 'PROCESO_REASIGNADO',
        titulo: 'Nuevo proceso asignado por reasignación',
        mensaje: `Se te ha reasignado el proceso ${radicadoProceso}.`,
        descripcion_corta: `Proceso ${radicadoProceso} reasignado a ti`,
        icono: 'Briefcase',
        color: '#2563EB',
        prioridad: 'Alta',
        categoria: 'DISCIPLINARIO',
        tiene_accion: true,
        texto_boton_accion: 'Ver proceso',
        datos_adicionales: { solicitudId: result.id, procesoId: result.processId },
      }).catch(() => {});

      // Enviar correo electrónico al nuevo profesional
      if (result.newProfessional?.email) {
        this.emailService.sendReassignmentEmail(
          result.newProfessional.email,
          radicadoProceso,
          result.newProfessional.nombreCompleto || 'Profesional',
          result.justification,
          dto.jefeObservations,
        ).catch((err) => {
          console.error(`Error al enviar correo de reasignación: ${err.message}`);
        });
      }
    }

    return result;
  }

  async getPendingRequests(): Promise<DisciplinaryProcessReassignmentRequest[]> {
    return this.reassignmentRepo.find({
      where: { status: ReassignmentRequestStatus.PENDIENTE },
      relations: ['process', 'currentProfessional', 'newProfessional'],
      order: { createdAt: 'ASC' },
    });
  }

  async getRequestById(id: string): Promise<DisciplinaryProcessReassignmentRequest> {
    const request = await this.reassignmentRepo.findOne({
      where: { id },
      relations: ['process', 'currentProfessional', 'newProfessional'],
    });

    if (!request) {
      throw new NotFoundException(`Solicitud de reasignación con ID ${id} no encontrada`);
    }

    return request;
  }

  async getRequestsByProcess(processId: string): Promise<DisciplinaryProcessReassignmentRequest[]> {
    return this.reassignmentRepo.find({
      where: { processId },
      relations: ['currentProfessional', 'newProfessional'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAllRequests(): Promise<DisciplinaryProcessReassignmentRequest[]> {
    return this.reassignmentRepo.find({
      relations: ['process', 'currentProfessional', 'newProfessional'],
      order: { createdAt: 'DESC' },
    });
  }
}