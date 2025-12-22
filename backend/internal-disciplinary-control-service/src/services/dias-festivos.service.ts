import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { DiaFestivo, TipoFestivo } from '../entities/dia-festivo.entity';
import {
  CreateFestivoDto,
  UpdateFestivoDto,
  ListarFestivosDto,
} from '../dtos/dias-festivos.dto';
import { TerminosCalculatorService } from './terminos-calculator.service';
import { transformFestivo } from '../common/transformers';

@Injectable()
export class DiasFestivosService {
  constructor(
    @InjectRepository(DiaFestivo)
    private festivosRepository: Repository<DiaFestivo>,
    private terminosCalculator: TerminosCalculatorService,
  ) {}

  /**
   * Crear nuevo día festivo
   */
  async crear(dto: CreateFestivoDto, creadoPorId: string): Promise<DiaFestivo> {
    // Validar que no exista duplicado
    const whereClause: any = {
      fecha: new Date(dto.fecha),
      tipo: dto.tipo,
    };
    if (dto.territorio !== undefined) {
      whereClause.territorio = dto.territorio;
    } else {
      whereClause.territorio = null;
    }
    
    const existe = await this.festivosRepository.findOne({
      where: whereClause,
    });

    if (existe) {
      throw new ConflictException(
        'Ya existe un día festivo con esta fecha, tipo y territorio',
      );
    }

    // Validar que si es regional, tenga territorio
    if (dto.tipo === TipoFestivo.REGIONAL && !dto.territorio) {
      throw new HttpException(
        'Los festivos regionales requieren territorio',
        HttpStatus.BAD_REQUEST,
      );
    }

    const festivo = this.festivosRepository.create({
      fecha: new Date(dto.fecha),
      descripcion: dto.descripcion,
      tipo: dto.tipo,
      territorio: dto.territorio || null,
      activo: true,
      creadoPorId: creadoPorId,
    });

    const festivoGuardado = await this.festivosRepository.save(festivo);
    
    // Limpiar caché de festivos en el calculador
    this.terminosCalculator.limpiarCacheFestivos();
    
    return transformFestivo(festivoGuardado) as any;
  }

  /**
   * Listar días festivos
   */
  async listar(dto: ListarFestivosDto): Promise<{
    festivos: DiaFestivo[];
    total: number;
  }> {
    const where: FindOptionsWhere<DiaFestivo> = {};

    if (dto.tipo) {
      where.tipo = dto.tipo;
    }

    if (dto.territorio) {
      where.territorio = dto.territorio;
    }

    if (dto.fechaDesde || dto.fechaHasta) {
      where.fecha = Between(
        dto.fechaDesde ? new Date(dto.fechaDesde) : new Date('1900-01-01'),
        dto.fechaHasta ? new Date(dto.fechaHasta) : new Date('2100-12-31'),
      );
    }

    // Si se especifica año, filtrar por año
    if (dto.year) {
      const inicioAno = new Date(dto.year, 0, 1);
      const finAno = new Date(dto.year, 11, 31);
      where.fecha = Between(inicioAno, finAno);
    }

    const [festivos, total] = await this.festivosRepository.findAndCount({
      where,
      order: { fecha: 'ASC' },
    });

    // Transformar fechas a formato string (asegurar Date)
    const festivosTransformados = festivos.map((festivo) => transformFestivo(festivo));

    return { festivos: festivosTransformados, total };
  }

  /**
   * Obtener festivo por ID
   */
  async obtenerPorId(id: string): Promise<DiaFestivo> {
    const festivo = await this.festivosRepository.findOne({
      where: { id },
    });

    if (!festivo) {
      throw new NotFoundException(`Festivo con ID ${id} no encontrado`);
    }

    return transformFestivo(festivo) as any;
  }

  /**
   * Actualizar día festivo
   */
  async actualizar(id: string, dto: UpdateFestivoDto): Promise<DiaFestivo> {
    const festivo = await this.obtenerPorId(id);

    // Si se cambia fecha, tipo o territorio, validar duplicado
    if (dto.fecha || dto.tipo || dto.territorio !== undefined) {
      const fecha = dto.fecha ? new Date(dto.fecha) : festivo.fecha;
      const tipo = dto.tipo || festivo.tipo;
      const territorio = dto.territorio !== undefined ? dto.territorio : festivo.territorio;

      const whereClause: any = {
        fecha: fecha,
        tipo: tipo,
      };
      if (territorio !== null && territorio !== undefined) {
        whereClause.territorio = territorio;
      } else {
        whereClause.territorio = null;
      }

      const existe = await this.festivosRepository.findOne({
        where: whereClause,
      });

      if (existe && existe.id !== id) {
        throw new ConflictException(
          'Ya existe un día festivo con esta fecha, tipo y territorio',
        );
      }
    }

    if (dto.fecha) {
      festivo.fecha = new Date(dto.fecha);
    }

    if (dto.descripcion) {
      festivo.descripcion = dto.descripcion;
    }

    if (dto.tipo) {
      festivo.tipo = dto.tipo;
    }

    if (dto.territorio !== undefined) {
      festivo.territorio = dto.territorio;
    }

    if (dto.activo !== undefined) {
      festivo.activo = dto.activo;
    }

    const festivoGuardado = await this.festivosRepository.save(festivo);
    
    // Limpiar caché de festivos en el calculador
    this.terminosCalculator.limpiarCacheFestivos();
    
    return transformFestivo(festivoGuardado) as any;
  }

  /**
   * Eliminar día festivo
   */
  async eliminar(id: string): Promise<void> {
    const festivo = await this.obtenerPorId(id);

    // En lugar de eliminar, desactivar
    festivo.activo = false;
    await this.festivosRepository.save(festivo);
    
    // Limpiar caché de festivos en el calculador
    this.terminosCalculator.limpiarCacheFestivos();
  }

  /**
   * Obtener todos los festivos activos (para cálculo de días hábiles)
   */
  async obtenerFestivosActivos(): Promise<DiaFestivo[]> {
    return await this.festivosRepository.find({
      where: { activo: true },
      order: { fecha: 'ASC' },
    });
  }

  /**
   * Verificar si una fecha es festivo
   */
  async esFestivo(fecha: Date): Promise<boolean> {
    const festivo = await this.festivosRepository.findOne({
      where: {
        fecha: fecha,
        activo: true,
      },
    });

    return !!festivo;
  }
}

