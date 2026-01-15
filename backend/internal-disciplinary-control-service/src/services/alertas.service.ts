import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { AlertaEnviada, TipoAlerta, EstadoAlerta } from '../entities/alerta-enviada.entity';
import { ListarAlertasDto } from '../dtos/alertas.dto';
import { transformAlerta } from '../common/transformers';

@Injectable()
export class AlertasService {
  constructor(
    @InjectRepository(AlertaEnviada)
    private alertasRepository: Repository<AlertaEnviada>,
  ) { }

  /**
   * Listar alertas con filtros y paginación
   */
  async listar(dto: ListarAlertasDto): Promise<{
    alertas: AlertaEnviada[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    // Construir where clause
    const where: FindOptionsWhere<AlertaEnviada> = {};

    if (dto.terminoId) {
      where.terminoId = dto.terminoId;
    }

    if (dto.tipo) {
      where.tipo = dto.tipo;
    }

    if (dto.estado) {
      where.estado = dto.estado;
    }

    if (dto.fechaDesde || dto.fechaHasta) {
      where.fechaEnvio = Between(
        dto.fechaDesde ? new Date(dto.fechaDesde) : new Date('1900-01-01'),
        dto.fechaHasta ? new Date(dto.fechaHasta) : new Date('2100-12-31'),
      );
    }

    // Contar total
    const total = await this.alertasRepository.count({ where });

    // Obtener resultados paginados con relaciones completas
    const alertas = await this.alertasRepository.find({
      where,
      relations: ['termino', 'termino.proceso', 'termino.proceso.news', 'reglaAlerta'],
      order: { fechaEnvio: 'DESC' },
      skip,
      take: limit,
    });

    // Transformar para incluir información del proceso
    const alertasTransformadas = alertas.map(alerta => {
      const nombreDenunciado = alerta.termino?.proceso?.news?.disciplinable?.[0]?.nombre ||
        alerta.termino?.numeroProceso ||
        'Proceso sin nombre';
      const nombreProceso = `${alerta.termino?.numeroProceso} - ${nombreDenunciado}`;
      return transformAlerta(alerta, nombreProceso);
    });

    return {
      alertas: alertasTransformadas,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Obtener alerta por ID
   */
  async obtenerPorId(id: string): Promise<AlertaEnviada> {
    const alerta = await this.alertasRepository.findOne({
      where: { id },
      relations: ['termino', 'termino.proceso', 'termino.proceso.news', 'reglaAlerta'],
    });

    if (!alerta) {
      throw new NotFoundException(`Alerta con ID ${id} no encontrada`);
    }

    // Transformar para compatibilidad con frontend
    const nombreDenunciado = alerta.termino?.proceso?.news?.disciplinable?.[0]?.nombre ||
      alerta.termino?.numeroProceso ||
      'Proceso sin nombre';
    const nombreProceso = `${alerta.termino?.numeroProceso} - ${nombreDenunciado}`;

    return transformAlerta(alerta, nombreProceso) as any;
  }

  /**
   * Crear nueva alerta (usado por jobs automáticos)
   */
  async crear(
    terminoId: string,
    reglaAlertaId: string,
    tipo: TipoAlerta,
    destinatario: string,
    asunto: string,
    mensaje: string,
    creadoPorId?: string,
  ): Promise<AlertaEnviada> {
    const alerta = this.alertasRepository.create({
      terminoId,
      reglaAlertaId,
      tipo,
      destinatario,
      asunto,
      mensaje,
      estado: EstadoAlerta.PENDIENTE,
      creadoPorId: creadoPorId || null,
    });

    return await this.alertasRepository.save(alerta);
  }

  /**
   * Crear nueva alerta/notificación para un Auto (Sin término/regla)
   */
  async crearNotificacionAuto(
    autoId: string,
    tipo: TipoAlerta,
    destinatario: string,
    asunto: string,
    mensaje: string,
    creadoPorId?: string,
  ): Promise<AlertaEnviada> {
    const alerta = this.alertasRepository.create({
      autoId,
      tipo,
      destinatario,
      asunto,
      mensaje,
      estado: EstadoAlerta.PENDIENTE,
      creadoPorId: creadoPorId || 'Sistema',
      // Campos opcionales explícitamente null
      terminoId: null,
      reglaAlertaId: null
    });

    return await this.alertasRepository.save(alerta);
  }

  /**
   * Marcar alerta como enviada
   */
  async marcarEnviada(id: string): Promise<AlertaEnviada> {
    const alerta = await this.obtenerPorId(id);
    alerta.estado = EstadoAlerta.ENVIADA;
    return await this.alertasRepository.save(alerta);
  }

  /**
   * Marcar alerta como error
   */
  async marcarError(id: string, errorMensaje: string): Promise<AlertaEnviada> {
    const alerta = await this.obtenerPorId(id);
    alerta.estado = EstadoAlerta.ERROR;
    alerta.errorMensaje = errorMensaje;
    return await this.alertasRepository.save(alerta);
  }

  /**
   * Marcar alerta visual como leída
   */
  async marcarLeida(id: string): Promise<AlertaEnviada> {
    const alerta = await this.obtenerPorId(id);

    if (alerta.tipo !== TipoAlerta.VISUAL) {
      throw new HttpException(
        'Solo las alertas visuales pueden marcarse como leídas',
        HttpStatus.BAD_REQUEST,
      );
    }

    alerta.fechaLectura = new Date();
    return await this.alertasRepository.save(alerta);
  }
}

