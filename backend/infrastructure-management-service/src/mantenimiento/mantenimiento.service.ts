import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { SolicitudMantenimiento } from './mantenimiento.entity.js';
import { CreateMantenimientoDto, UpdateMantenimientoEstadoDto } from './dto/create-mantenimiento.dto.js';
import { Sede } from '../sedes/sede.entity.js';

interface AuthUser {
  userId: string;
  username: string;
  email: string;
  roles: string[];
}

@Injectable()
export class MantenimientoService {
  constructor(
    @InjectRepository(SolicitudMantenimiento)
    private readonly mantenimientoRepo: Repository<SolicitudMantenimiento>,
    @InjectRepository(Sede)
    private readonly sedeRepo: Repository<Sede>,
  ) {}

  async findAll(estado?: string, prioridad?: string): Promise<SolicitudMantenimiento[]> {
    const query = this.mantenimientoRepo.createQueryBuilder('solicitud')
      .leftJoinAndSelect('solicitud.sede', 'sede')
      .leftJoinAndSelect('solicitud.espacio', 'espacio')
      .leftJoinAndSelect('espacio.bloque', 'bloque');

    if (estado) {
      query.andWhere('solicitud.estado = :estado', { estado });
    }
    if (prioridad) {
      query.andWhere('solicitud.prioridad = :prioridad', { prioridad });
    }

    return query.orderBy('solicitud.fechaRadicacion', 'DESC').getMany();
  }

  async findByUsuario(usuarioId: string | undefined): Promise<SolicitudMantenimiento[]> {
    if (!usuarioId) {
      return [];
    }
    return this.mantenimientoRepo.createQueryBuilder('solicitud')
      .leftJoinAndSelect('solicitud.sede', 'sede')
      .leftJoinAndSelect('solicitud.espacio', 'espacio')
      .leftJoinAndSelect('espacio.bloque', 'bloque')
      .where('solicitud.usuarioSolicitanteId = :usuarioId', { usuarioId })
      .orderBy('solicitud.fechaRadicacion', 'DESC')
      .getMany();
  }

  async findById(id: string): Promise<SolicitudMantenimiento> {
    const solicitud = await this.mantenimientoRepo.findOne({
      where: { idSolicitud: id },
      relations: ['sede', 'espacio', 'espacio.bloque'],
    });
    if (!solicitud) {
      throw new NotFoundException(`Solicitud de mantenimiento ${id} no encontrada`);
    }
    return solicitud;
  }

  async create(dto: CreateMantenimientoDto, user: AuthUser): Promise<SolicitudMantenimiento> {
    if (!user || !user.userId) {
      throw new ForbiddenException('Usuario autenticado requerido para radicar solicitud');
    }

    const sede = await this.sedeRepo.findOne({
      where: { idSede: dto.idSede },
    });
    if (!sede) {
      throw new BadRequestException(`Sede ${dto.idSede} no existe o no está registrada`);
    }
    if (!sede.isActivo) {
      throw new BadRequestException(`La sede ${sede.nombre} está inactiva y no permite radicación`);
    }

    const anioActual = new Date().getFullYear();
    const inicioAnio = new Date(anioActual, 0, 1);
    const finAnio = new Date(anioActual, 11, 31, 23, 59, 59, 999);

    const countAnio = await this.mantenimientoRepo.count({
      where: {
        fechaRadicacion: Between(inicioAnio, finAnio),
      },
    });

    const consecutivo = `MNT-${anioActual}-${String(countAnio + 1).padStart(4, '0')}`;

    const ahora = new Date();

    const solicitudData: Partial<SolicitudMantenimiento> = {
      idSede: dto.idSede,
      idEspacio: dto.idEspacio,
      idAreaSolicitante: dto.idAreaSolicitante,
      nombreAreaSolicitante: dto.nombreAreaSolicitante,
      piso: dto.piso,
      salon: dto.salon,
      ubicacionDetalle: dto.ubicacionDetalle,
      tipoMantenimiento: dto.tipoMantenimiento,
      tipoAtencion: 'FISICA',
      prioridad: dto.prioridad ?? 'MEDIA',
      descripcion: dto.descripcion,
      consecutivo: consecutivo,
      estado: 'RECIBIDA',
      fechaRadicacion: ahora,
      usuarioSolicitanteId: user.userId,
      usuarioSolicitanteEmail: user.email,
      solicitanteNombre: user.username ?? dto.nombreAreaSolicitante,
      solicitanteEmail: user.email ?? `${user.username || 'solicitante'}@esap.edu.co`,
    };

    return this.mantenimientoRepo.save(solicitudData as any);
  }

  async updateEstado(id: string, dto: UpdateMantenimientoEstadoDto): Promise<SolicitudMantenimiento> {
    const solicitud = await this.findById(id);
    solicitud.estado = dto.estado;
    if (dto.responsableAsignado) solicitud.responsableAsignado = dto.responsableAsignado;
    if (dto.observaciones) solicitud.observaciones = dto.observaciones;
    if (dto.fechaEjecucion) solicitud.fechaEjecucion = dto.fechaEjecucion;

    return this.mantenimientoRepo.save(solicitud);
  }
}
