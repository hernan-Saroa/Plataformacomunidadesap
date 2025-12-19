import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReglaAlerta } from '../entities/regla-alerta.entity';
import {
  CreateReglaAlertaDto,
  UpdateReglaAlertaDto,
} from '../dtos/reglas-alerta.dto';

@Injectable()
export class ReglasAlertaService {
  constructor(
    @InjectRepository(ReglaAlerta)
    private reglasRepository: Repository<ReglaAlerta>,
  ) {}

  /**
   * Crear nueva regla de alerta
   */
  async crear(dto: CreateReglaAlertaDto, creadoPorId: string): Promise<ReglaAlerta> {
    // Validar que el nombre sea único
    const existe = await this.reglasRepository.findOne({
      where: { nombre: dto.nombre },
    });

    if (existe) {
      throw new ConflictException(
        `Ya existe una regla de alerta con el nombre "${dto.nombre}"`,
      );
    }

    const regla = this.reglasRepository.create({
      ...dto,
      creadoPorId: creadoPorId,
    });

    return await this.reglasRepository.save(regla);
  }

  /**
   * Listar todas las reglas de alerta
   */
  async listar(): Promise<{ reglas: ReglaAlerta[] }> {
    const reglas = await this.reglasRepository.find({
      order: { diasAnticipacion: 'ASC' },
    });

    return { reglas };
  }

  /**
   * Obtener regla por ID
   */
  async obtenerPorId(id: string): Promise<ReglaAlerta> {
    const regla = await this.reglasRepository.findOne({
      where: { id },
      relations: ['alertas'],
    });

    if (!regla) {
      throw new NotFoundException(`Regla de alerta con ID ${id} no encontrada`);
    }

    return regla;
  }

  /**
   * Actualizar regla de alerta
   */
  async actualizar(id: string, dto: UpdateReglaAlertaDto): Promise<ReglaAlerta> {
    const regla = await this.obtenerPorId(id);

    // Si se cambia el nombre, validar que sea único
    if (dto.nombre && dto.nombre !== regla.nombre) {
      const existe = await this.reglasRepository.findOne({
        where: { nombre: dto.nombre },
      });

      if (existe) {
        throw new ConflictException(
          `Ya existe una regla de alerta con el nombre "${dto.nombre}"`,
        );
      }
    }

    // Actualizar campos
    if (dto.nombre) {
      regla.nombre = dto.nombre;
    }

    if (dto.diasAnticipacion !== undefined) {
      regla.diasAnticipacion = dto.diasAnticipacion;
    }

    if (dto.activa !== undefined) {
      regla.activa = dto.activa;
    }

    if (dto.enviarEmail !== undefined) {
      regla.enviarEmail = dto.enviarEmail;
    }

    if (dto.mostrarPanel !== undefined) {
      regla.mostrarPanel = dto.mostrarPanel;
    }

    if (dto.descripcion !== undefined) {
      regla.descripcion = dto.descripcion;
    }

    return await this.reglasRepository.save(regla);
  }

  /**
   * Activar/desactivar regla
   */
  async toggle(id: string): Promise<ReglaAlerta> {
    const regla = await this.obtenerPorId(id);
    regla.activa = !regla.activa;
    return await this.reglasRepository.save(regla);
  }

  /**
   * Eliminar regla de alerta
   */
  async eliminar(id: string): Promise<void> {
    const regla = await this.obtenerPorId(id);

    // Verificar que no tenga alertas asociadas
    const alertasCount = await this.reglasRepository
      .createQueryBuilder('regla')
      .leftJoin('regla.alertas', 'alerta')
      .where('regla.id = :id', { id })
      .getCount();

    if (alertasCount > 0) {
      throw new HttpException(
        'No se puede eliminar una regla que tiene alertas asociadas',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.reglasRepository.delete(id);
  }

  /**
   * Obtener reglas activas
   */
  async obtenerReglasActivas(): Promise<ReglaAlerta[]> {
    return await this.reglasRepository.find({
      where: { activa: true },
      order: { diasAnticipacion: 'ASC' },
    });
  }
}


