import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TareaAuditoria,
  EstadoTarea,
  FaseTarea,
} from './entities/tarea-auditoria.entity';
import { CreateTareaAuditoriaDto } from './dto/create-tarea-auditoria.dto';
import { UpdateTareaAuditoriaDto } from './dto/update-tarea-auditoria.dto';
import { Auditoria } from '../auditorias/entities/auditoria.entity';
import { HistorialAuditoria, TipoEvento } from '../auditorias/entities/historial-auditoria.entity';

@Injectable()
export class TareasAuditoriaService {
  constructor(
    @InjectRepository(TareaAuditoria)
    private readonly tareaRepository: Repository<TareaAuditoria>,
    @InjectRepository(Auditoria)
    private readonly auditoriaRepository: Repository<Auditoria>,
    @InjectRepository(HistorialAuditoria)
    private readonly historialRepository: Repository<HistorialAuditoria>,
  ) {}

  /**
   * Registra evento en el historial de la auditoría
   */
  private async registrarHistorial(
    auditoriaId: string | null | undefined,
    tipoEvento: TipoEvento,
    accion: string,
    descripcion: string,
  ): Promise<void> {
    if (!auditoriaId) return;
    
    try {
      const ahora = new Date();
      const fecha = ahora.toISOString().split('T')[0];
      const hora = ahora.toTimeString().split(' ')[0];
      
      const historial = new HistorialAuditoria();
      historial.auditoriaId = auditoriaId;
      historial.tipoEvento = tipoEvento;
      historial.fecha = new Date(fecha);
      historial.hora = hora;
      historial.usuarioId = 1; // TODO: Obtener del contexto de autenticación
      historial.accion = accion;
      historial.descripcion = descripcion;
      historial.cambios = [];
      
      await this.historialRepository.save(historial);
    } catch (err) {
      console.error('[TareasAuditoriaService] Error registrando historial:', err);
    }
  }

  /**
   * Serializa una fecha Date o string a string YYYY-MM-DD
   */
  private serializeDate(
    date: Date | string | undefined | null,
  ): string | undefined {
    if (!date) return undefined;

    if (typeof date === 'string') {
      const dateOnly = date.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
        return dateOnly;
      }
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return date;
    }

    if (date instanceof Date && !isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const dateStr = String(date);
    const dateOnly = dateStr.split('T')[0];
    return dateOnly || dateStr;
  }

  /**
   * Serializa una tarea para la respuesta JSON
   */
  private serializeTarea(tarea: TareaAuditoria): TareaAuditoria & { fechaCreacion?: string } {
    return {
      ...tarea,
      fechaVencimiento: this.serializeDate(tarea.fechaVencimiento) as unknown as Date,
      fechaCompletado: this.serializeDate(tarea.fechaCompletado) as unknown as Date,
      fechaCreacion: this.serializeDate(tarea.createdAt),
    };
  }

  /**
   * Busca todas las tareas, con filtros opcionales
   */
  async findAll(filters?: {
    auditoriaId?: string;
    estado?: string;
    prioridad?: string;
    fase?: string;
    responsableId?: string;
  }): Promise<TareaAuditoria[]> {
    const query = this.tareaRepository
      .createQueryBuilder('tarea')
      .leftJoinAndSelect('tarea.auditoria', 'auditoria')
      .orderBy('tarea.createdAt', 'DESC');

    if (filters?.auditoriaId) {
      query.andWhere('tarea.auditoriaId = :auditoriaId', {
        auditoriaId: filters.auditoriaId,
      });
    }

    if (filters?.estado) {
      query.andWhere('tarea.estado = :estado', { estado: filters.estado });
    }

    if (filters?.prioridad) {
      query.andWhere('tarea.prioridad = :prioridad', {
        prioridad: filters.prioridad,
      });
    }

    if (filters?.fase) {
      query.andWhere('tarea.fase = :fase', { fase: filters.fase });
    }

    if (filters?.responsableId) {
      query.andWhere('tarea.responsableId = :responsableId', {
        responsableId: filters.responsableId,
      });
    }

    const tareas = await query.getMany();
    return tareas.map((t) => this.serializeTarea(t));
  }

  /**
   * Busca tareas por auditoría
   */
  async findByAuditoria(auditoriaId: string): Promise<TareaAuditoria[]> {
    const tareas = await this.tareaRepository.find({
      where: { auditoriaId },
      relations: ['auditoria'],
      order: { createdAt: 'DESC' },
    });
    return tareas.map((t) => this.serializeTarea(t));
  }

  /**
   * Busca una tarea por ID
   */
  async findOne(id: string): Promise<TareaAuditoria> {
    const tarea = await this.tareaRepository.findOne({
      where: { id },
      relations: ['auditoria'],
    });

    if (!tarea) {
      throw new NotFoundException(`Tarea con ID ${id} no encontrada`);
    }

    return this.serializeTarea(tarea);
  }

  /**
   * Crea una nueva tarea
   */
  async create(dto: CreateTareaAuditoriaDto): Promise<TareaAuditoria> {
    // Verificar que la auditoría existe
    const auditoria = await this.auditoriaRepository.findOne({
      where: { id: dto.auditoriaId },
    });

    if (!auditoria) {
      throw new BadRequestException(
        `Auditoría con ID ${dto.auditoriaId} no encontrada`,
      );
    }

    const tarea = this.tareaRepository.create({
      ...dto,
      fechaVencimiento: dto.fechaVencimiento
        ? new Date(dto.fechaVencimiento)
        : undefined,
      estado: dto.estado || EstadoTarea.PENDIENTE,
      progreso: dto.progreso || 0,
    });

    const saved = await this.tareaRepository.save(tarea);

    // ✅ Registrar en historial de auditoría
    await this.registrarHistorial(
      saved.auditoriaId,
      TipoEvento.NOTA, // Usamos NOTA para tareas
      'Tarea creada',
      `Se creó la tarea "${saved.titulo}" en fase ${saved.fase || 'general'}`,
    );

    return this.serializeTarea(saved);
  }

  /**
   * Actualiza una tarea existente
   */
  async update(
    id: string,
    dto: UpdateTareaAuditoriaDto,
  ): Promise<TareaAuditoria> {
    const tarea = await this.tareaRepository.findOne({ where: { id } });

    if (!tarea) {
      throw new NotFoundException(`Tarea con ID ${id} no encontrada`);
    }

    // Si cambia a completada, establecer fechaCompletado
    if (
      dto.estado === EstadoTarea.COMPLETADA &&
      tarea.estado !== EstadoTarea.COMPLETADA
    ) {
      tarea.fechaCompletado = new Date();
      tarea.progreso = 100;
    }

    // Si cambia de completada a otro estado, limpiar fechaCompletado
    if (
      dto.estado &&
      dto.estado !== EstadoTarea.COMPLETADA &&
      tarea.estado === EstadoTarea.COMPLETADA
    ) {
      tarea.fechaCompletado = undefined;
    }

    // Actualizar campos
    Object.assign(tarea, {
      ...dto,
      fechaVencimiento: dto.fechaVencimiento
        ? new Date(dto.fechaVencimiento)
        : tarea.fechaVencimiento,
      fechaCompletado: dto.fechaCompletado
        ? new Date(dto.fechaCompletado)
        : tarea.fechaCompletado,
    });

    const updated = await this.tareaRepository.save(tarea);

    // ✅ Registrar en historial si cambió el estado
    if (dto.estado && dto.estado !== tarea.estado) {
      await this.registrarHistorial(
        updated.auditoriaId,
        TipoEvento.NOTA,
        `Tarea ${dto.estado === EstadoTarea.COMPLETADA ? 'completada' : 'actualizada'}`,
        `La tarea "${updated.titulo}" cambió a estado ${dto.estado}`,
      );
    }

    return this.serializeTarea(updated);
  }

  /**
   * Completa una tarea (shortcut)
   */
  async completar(id: string): Promise<TareaAuditoria> {
    return this.update(id, {
      estado: EstadoTarea.COMPLETADA,
      progreso: 100,
    });
  }

  /**
   * Elimina una tarea
   */
  async remove(id: string): Promise<void> {
    const tarea = await this.tareaRepository.findOne({ where: { id } });

    if (!tarea) {
      throw new NotFoundException(`Tarea con ID ${id} no encontrada`);
    }

    const auditoriaId = tarea.auditoriaId;
    const titulo = tarea.titulo;

    await this.tareaRepository.remove(tarea);

    // ✅ Registrar en historial de auditoría
    await this.registrarHistorial(
      auditoriaId,
      TipoEvento.ELIMINACION,
      'Tarea eliminada',
      `Se eliminó la tarea "${titulo}"`,
    );
  }

  /**
   * Obtiene estadísticas de tareas por auditoría
   */
  async getEstadisticas(auditoriaId: string): Promise<{
    total: number;
    pendientes: number;
    enProgreso: number;
    completadas: number;
    canceladas: number;
    progresoGeneral: number;
  }> {
    const tareas = await this.tareaRepository.find({
      where: { auditoriaId },
    });

    const total = tareas.length;
    const pendientes = tareas.filter(
      (t) => t.estado === EstadoTarea.PENDIENTE,
    ).length;
    const enProgreso = tareas.filter(
      (t) => t.estado === EstadoTarea.EN_PROGRESO,
    ).length;
    const completadas = tareas.filter(
      (t) => t.estado === EstadoTarea.COMPLETADA,
    ).length;
    const canceladas = tareas.filter(
      (t) => t.estado === EstadoTarea.CANCELADA,
    ).length;

    // Calcular progreso excluyendo canceladas
    const tareasActivas = tareas.filter(
      (t) => t.estado !== EstadoTarea.CANCELADA,
    );
    const progresoGeneral =
      tareasActivas.length > 0
        ? Math.round(
            tareasActivas.reduce((sum, t) => sum + t.progreso, 0) /
              tareasActivas.length,
          )
        : 0;

    return {
      total,
      pendientes,
      enProgreso,
      completadas,
      canceladas,
      progresoGeneral,
    };
  }

  /**
   * Verifica si todas las tareas de una fase están completadas
   */
  async verificarFaseCompleta(
    auditoriaId: string,
    fase: FaseTarea,
  ): Promise<boolean> {
    const tareas = await this.tareaRepository.find({
      where: { auditoriaId, fase },
    });

    if (tareas.length === 0) return true;

    return tareas.every(
      (t) =>
        t.estado === EstadoTarea.COMPLETADA ||
        t.estado === EstadoTarea.CANCELADA,
    );
  }
}
