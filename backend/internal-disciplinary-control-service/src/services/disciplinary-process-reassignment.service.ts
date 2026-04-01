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

@Injectable()
export class DisciplinaryProcessReassignmentService {
  constructor(
    @InjectRepository(DisciplinaryProcessReassignmentRequest)
    private reassignmentRepo: Repository<DisciplinaryProcessReassignmentRequest>,
    @InjectRepository(DisciplinaryProcess)
    private processRepo: Repository<DisciplinaryProcess>,
    @InjectRepository(DisciplinaryProfessional)
    private professionalRepo: Repository<DisciplinaryProfessional>,
  ) {}

  async createReassignmentRequest(
    dto: CreateReassignmentRequestDto,
  ): Promise<DisciplinaryProcessReassignmentRequest> {
    // Verificar que el proceso existe y tiene un profesional asignado
    const process = await this.processRepo.findOne({
      where: { id: dto.processId },
      relations: ['abogadoAsignado'],
    });

    if (!process) {
      throw new NotFoundException(
        `Proceso con ID ${dto.processId} no encontrado`,
      );
    }

    if (!process.abogadoAsignado) {
      throw new BadRequestException(
        'El proceso no tiene un profesional asignado actualmente',
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

    const request = this.reassignmentRepo.create({
      processId: dto.processId,
      currentProfessionalId: process.abogadoAsignado.id,
      newProfessionalId: dto.newProfessionalId,
      justification: dto.justification,
      priority: dto.priority || ReassignmentPriority.NORMAL,
      requestedBy: dto.requestedBy,
      requestedById: dto.requestedById,
      status: ReassignmentRequestStatus.PENDIENTE,
    });

    return this.reassignmentRepo.save(request);
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
        abogadoAsignadoId: request.newProfessionalId,
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
    // Note: resolvedBy fields would be set from the authenticated user

    return this.reassignmentRepo.save(request);
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
}