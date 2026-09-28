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
      relations: ['process', 'process.news', 'currentProfessional', 'newProfessional'],
    });

    if (!result) {
      throw new NotFoundException(`Solicitud de reasignación con ID ${savedRequest.id} no encontrada después de guardar`);
    }

    const radicadoProceso = result.process?.radicadoProceso ?? 'proceso';

    // Resolver datos reales (incluyendo correo y usuario) para nuevo profesional
    const nuevoProfInfo = await this.resolverDestinatario(result.newProfessionalId || result.newProfessional?.id);
    const anteriorProfId = result.currentProfessionalId || result.currentProfessional?.id;
    const anteriorProfInfo = anteriorProfId ? await this.resolverDestinatario(anteriorProfId) : null;

    const nombreNuevoProf = result.newProfessional?.nombreCompleto || nuevoProfInfo.nombre || 'Profesional';
    const emailNuevoProf = result.newProfessional?.email || nuevoProfInfo.email;

    const nombreAnteriorProf = result.currentProfessional?.nombreCompleto || anteriorProfInfo?.nombre || 'Profesional';
    const emailAnteriorProf = result.currentProfessional?.email || anteriorProfInfo?.email;

    // Notificación en plataforma al profesional anterior (si existía)
    const destinatarioAnteriorNotif = anteriorProfInfo?.userId || result.currentProfessionalId;
    if (destinatarioAnteriorNotif) {
      const aprobado = dto.approved;
      this.notificationClient.send({
        id_usuario_destinatario: destinatarioAnteriorNotif,
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

    // Notificación y correo al nuevo profesional
    if (dto.approved) {
      const destinatarioNuevoNotif = nuevoProfInfo.userId || result.newProfessional?.id;
      if (destinatarioNuevoNotif) {
        this.notificationClient.send({
          id_usuario_destinatario: destinatarioNuevoNotif,
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
      }

      // Enviar correo electrónico al nuevo profesional (firma: to, profesionalNombre, radicadoProceso, justificacion, observacionesJefe)
      if (emailNuevoProf) {
        this.emailService.sendReassignmentEmail(
          emailNuevoProf,
          nombreNuevoProf,
          radicadoProceso,
          result.justification,
          dto.jefeObservations,
        ).catch((err) => {
          console.error(`Error al enviar correo de reasignación al nuevo profesional (${emailNuevoProf}): ${err.message}`);
        });
      }

      // Enviar correo electrónico oficial al profesional anterior cuando la reasignación es aprobada
      // (firma: to, profesionalNombre, radicadoProceso, nuevoProfesionalNombre, justificacion, observacionesJefe)
      if (emailAnteriorProf) {
        this.emailService.sendReassignedFromEmail(
          emailAnteriorProf,
          nombreAnteriorProf,
          radicadoProceso,
          nombreNuevoProf,
          result.justification,
          dto.jefeObservations,
        ).catch((err) => {
          console.error(`Error al enviar correo de reasignación al profesional anterior (${emailAnteriorProf}): ${err.message}`);
        });
      }
    }

    // Notificar a todos los radicadores del resultado de la solicitud de reasignación
    try {
      const radicadoresMap = new Map<string, { id: string; email: string; nombre: string }>();

      // 1. Radicadores por rol o código de rol
      const radicadoresRolesRows: any[] = await this.reassignmentRepo.manager.query(
        `SELECT DISTINCT u.id_user, u.username, p.nom_largo, p.dir_email
         FROM auth.user u
         JOIN auth.user_roles ur ON ur.id_user = u.id_user
         JOIN auth.role r ON r.id = ur.id_rol
         LEFT JOIN auth.personas p ON p.id_person = u.id_person
         WHERE u.is_active = true
           AND (r.code IN ('SECRETARIA_RADICADOR', 'RADICADOR_DISCIPLINARIO', 'RADICADOR')
                OR UPPER(r.code) LIKE '%RADICADOR%'
                OR UPPER(r.name) LIKE '%RADICADOR%')`,
      );

      for (const r of radicadoresRolesRows || []) {
        const email = (r.dir_email || (r.username?.includes('@') ? r.username : '') || '').trim();
        if (r.id_user) {
          radicadoresMap.set(r.id_user, {
            id: r.id_user,
            email,
            nombre: r.nom_largo || r.username || 'Radicador',
          });
        }
      }

      // 2. Radicadores por permiso específico (general.is_radicador o variantes)
      const radicadoresPermisoRows: any[] = await this.reassignmentRepo.manager.query(
        `SELECT DISTINCT u.id_user, u.username, p.nom_largo, p.dir_email
         FROM auth.user u
         JOIN auth.user_roles ur ON ur.id_user = u.id_user
         JOIN auth.role_permissions rp ON rp.id_rol = ur.id_rol
         JOIN auth.permission perm ON perm.id_permission = rp.id_permission AND perm.is_active = true
         LEFT JOIN auth.personas p ON p.id_person = u.id_person
         WHERE u.is_active = true
           AND (
             perm.code IN ('general.is_radicador', 'control-disciplinario.general.es_radicador', 'control-disciplinario.general.is_radicador')
             OR perm.code LIKE '%is_radicador%'
             OR perm.code LIKE '%es_radicador%'
           )`,
      );

      for (const r of radicadoresPermisoRows || []) {
        const email = (r.dir_email || (r.username?.includes('@') ? r.username : '') || '').trim();
        if (r.id_user) {
          radicadoresMap.set(r.id_user, {
            id: r.id_user,
            email,
            nombre: r.nom_largo || r.username || 'Radicador',
          });
        }
      }

      // 3. Radicador asignado a la queja/noticia del proceso si existe
      const radicadorNoticiaId = result.process?.news?.radicadorId;
      if (radicadorNoticiaId && !radicadoresMap.has(radicadorNoticiaId)) {
        const radInfo = await this.resolverDestinatario(radicadorNoticiaId);
        if (radInfo.email || radInfo.userId) {
          radicadoresMap.set(radicadorNoticiaId, {
            id: radInfo.userId || radicadorNoticiaId,
            email: radInfo.email || '',
            nombre: radInfo.nombre || 'Radicador del Proceso',
          });
        }
      }

      const radicadores = Array.from(radicadoresMap.values());

      if (radicadores.length > 0) {
        const aprobado = dto.approved;
        const tituloRad = aprobado
          ? `Reasignación de proceso aprobada - ${radicadoProceso}`
          : `Reasignación de proceso rechazada - ${radicadoProceso}`;
        const mensajeRad = aprobado
          ? `La reasignación del proceso ${radicadoProceso} ha sido aprobada. Nuevo profesional: ${nombreNuevoProf}.`
          : `La solicitud de reasignación del proceso ${radicadoProceso} ha sido rechazada.`;

        // Notificación en plataforma
        const notifs = radicadores.map((rad) => ({
          id_usuario_destinatario: rad.id,
          tipo_notificacion: aprobado ? 'REASIGNACION_APROBADA' : 'REASIGNACION_RECHAZADA',
          titulo: tituloRad,
          mensaje: mensajeRad,
          descripcion_corta: `Reasignación ${aprobado ? 'aprobada' : 'rechazada'} - ${radicadoProceso}`,
          icono: aprobado ? 'CheckCircle' : 'XCircle',
          color: aprobado ? '#16A34A' : '#DC2626',
          prioridad: 'Media' as const,
          categoria: 'DISCIPLINARIO',
          tiene_accion: true,
          texto_boton_accion: 'Ver proceso',
          datos_adicionales: { solicitudId: result.id, procesoId: result.processId },
        }));
        await this.notificationClient.sendMany(notifs).catch(() => {});

        // Correo electrónico a todos los radicadores que tengan email
        const detalles = [
          { label: 'Radicado del Proceso', valor: radicadoProceso },
          { label: 'Estado Solicitud', valor: aprobado ? 'APROBADA' : 'RECHAZADA' },
          { label: 'Profesional Anterior', valor: nombreAnteriorProf },
          ...(aprobado
            ? [{ label: 'Nuevo Profesional', valor: nombreNuevoProf }]
            : []),
          ...(dto.jefeObservations
            ? [{ label: 'Observaciones del Jefe', valor: dto.jefeObservations }]
            : []),
          ...(!aprobado && dto.rejectionReason
            ? [{ label: 'Motivo de Rechazo', valor: dto.rejectionReason }]
            : []),
        ];

        await this.emailService.sendBulkNotification(
          radicadores.filter((r) => r.email && r.email.includes('@')),
          `[REASIGNACIÓN ${aprobado ? 'APROBADA' : 'RECHAZADA'}] Proceso ${radicadoProceso}`,
          tituloRad,
          mensajeRad,
          detalles,
          'Reasignación de Proceso',
          aprobado ? '#16A34A' : '#DC2626',
        );
      }
    } catch (err: any) {
      console.error('Error notificando a radicadores en reasignación:', err?.message || err);
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
      const prof = await this.professionalRepo.findOne({
        where: { id: idOrProfId },
      });
      if (prof) {
        let userId = prof.idUser || null;
        if (!userId && prof.email) {
          try {
            const userRows = await this.reassignmentRepo.manager.query(
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
      const userRows = await this.reassignmentRepo.manager.query(
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
          profLinked = await this.professionalRepo.findOne({
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
}