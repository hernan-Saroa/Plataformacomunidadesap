import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, QueryFailedError } from 'typeorm';
import { TipoAuditoria } from './entities/tipo-auditoria.entity';
import { CreateTipoAuditoriaDto } from './dto/create-tipo-auditoria.dto';
import { UpdateTipoAuditoriaDto } from './dto/update-tipo-auditoria.dto';

@Injectable()
export class TiposAuditoriaService {
  constructor(
    @InjectRepository(TipoAuditoria)
    private readonly tipoAuditoriaRepository: Repository<TipoAuditoria>,
  ) {}

  /**
   * Obtener todos los tipos de auditoría (excluyendo eliminados)
   */
  async findAll(includeInactive: boolean = false): Promise<TipoAuditoria[]> {
    const where: any = {
      deletedAt: IsNull(),
    };

    if (!includeInactive) {
      where.activa = true;
    }

    return this.tipoAuditoriaRepository.find({
      where,
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Obtener un tipo de auditoría por ID
   */
  async findOne(id: string): Promise<TipoAuditoria> {
    const tipo = await this.tipoAuditoriaRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!tipo) {
      throw new NotFoundException(`Tipo de auditoría con ID ${id} no encontrado`);
    }

    return tipo;
  }

  /**
   * Obtener un tipo de auditoría por código
   */
  async findByCodigo(codigo: string): Promise<TipoAuditoria | null> {
    return this.tipoAuditoriaRepository.findOne({
      where: { codigo, deletedAt: IsNull() },
    });
  }

  /**
   * Crear un nuevo tipo de auditoría
   */
  async create(createDto: CreateTipoAuditoriaDto): Promise<TipoAuditoria> {
    // Verificar que el código no exista (incluyendo eliminados)
    const codigoUpper = createDto.codigo.toUpperCase();
    const existe = await this.tipoAuditoriaRepository
      .createQueryBuilder('tipo')
      .where('UPPER(tipo.codigo) = :codigo', { codigo: codigoUpper })
      .getOne();
    
    if (existe) {
      throw new ConflictException(
        `Ya existe un tipo de auditoría con el código ${codigoUpper}`,
      );
    }

    const tipo = this.tipoAuditoriaRepository.create({
      codigo: codigoUpper,
      nombre: createDto.nombre,
      descripcion: createDto.descripcion,
      alcance: createDto.alcance,
      duracionPromedio: createDto.duracionPromedio || 30,
      equipoPromedio: createDto.equipoPromedio || 3,
      color: createDto.color || '#3B82F6',
      activa: createDto.activa !== undefined ? createDto.activa : true,
      auditoriasProgramadas: 0,
    });

    try {
      return await this.tipoAuditoriaRepository.save(tipo);
    } catch (error) {
      // Capturar errores de constraint de base de datos
      if (error instanceof QueryFailedError) {
        const pgError = error as any;
        // Código 23505 = unique_violation en PostgreSQL
        if (pgError.code === '23505') {
          if (pgError.constraint === 'tipo_auditoria_codigo_key' || 
              pgError.constraint?.includes('codigo')) {
            throw new ConflictException(
              `Ya existe un tipo de auditoría con el código ${codigoUpper}`,
            );
          }
        }
      }
      throw error;
    }
  }

  /**
   * Actualizar un tipo de auditoría
   */
  async update(id: string, updateDto: UpdateTipoAuditoriaDto): Promise<TipoAuditoria> {
    const tipo = await this.findOne(id);

    // Si se actualiza el código, verificar que no exista otro con ese código (incluyendo eliminados)
    if (updateDto.codigo && updateDto.codigo !== tipo.codigo) {
      const codigoUpper = updateDto.codigo.toUpperCase();
      const existe = await this.tipoAuditoriaRepository
        .createQueryBuilder('tipo')
        .where('UPPER(tipo.codigo) = :codigo', { codigo: codigoUpper })
        .andWhere('tipo.id != :id', { id })
        .getOne();
      
      if (existe) {
        throw new ConflictException(
          `Ya existe un tipo de auditoría con el código ${codigoUpper}`,
        );
      }
      tipo.codigo = codigoUpper;
    }

    // Actualizar campos
    if (updateDto.nombre !== undefined) tipo.nombre = updateDto.nombre;
    if (updateDto.descripcion !== undefined) tipo.descripcion = updateDto.descripcion;
    if (updateDto.alcance !== undefined) tipo.alcance = updateDto.alcance;
    if (updateDto.duracionPromedio !== undefined)
      tipo.duracionPromedio = updateDto.duracionPromedio;
    if (updateDto.equipoPromedio !== undefined)
      tipo.equipoPromedio = updateDto.equipoPromedio;
    if (updateDto.color !== undefined) tipo.color = updateDto.color;
    if (updateDto.activa !== undefined) tipo.activa = updateDto.activa;

    try {
      return await this.tipoAuditoriaRepository.save(tipo);
    } catch (error) {
      // Capturar errores de constraint de base de datos
      if (error instanceof QueryFailedError) {
        const pgError = error as any;
        if (pgError.code === '23505') {
          if (pgError.constraint === 'tipo_auditoria_codigo_key' || 
              pgError.constraint?.includes('codigo')) {
            throw new ConflictException(
              `Ya existe un tipo de auditoría con el código ${tipo.codigo}`,
            );
          }
        }
      }
      throw error;
    }
  }

  /**
   * Eliminar un tipo de auditoría (soft delete)
   */
  async remove(id: string): Promise<void> {
    const tipo = await this.findOne(id);

    // Verificar que no tenga auditorías programadas
    if (tipo.auditoriasProgramadas > 0) {
      throw new BadRequestException(
        `No se puede eliminar el tipo de auditoría porque tiene ${tipo.auditoriasProgramadas} auditorías programadas`,
      );
    }

    // Soft delete
    tipo.deletedAt = new Date();
    await this.tipoAuditoriaRepository.save(tipo);
  }

  /**
   * Restaurar un tipo de auditoría eliminado (hard delete revert)
   */
  async restore(id: string): Promise<TipoAuditoria> {
    const tipo = await this.tipoAuditoriaRepository
      .createQueryBuilder('tipo')
      .withDeleted()
      .where('tipo.id = :id', { id })
      .getOne();

    if (!tipo) {
      throw new NotFoundException(`Tipo de auditoría con ID ${id} no encontrado`);
    }

    if (!tipo.deletedAt) {
      throw new BadRequestException('El tipo de auditoría no está eliminado');
    }

    tipo.deletedAt = undefined;
    return this.tipoAuditoriaRepository.save(tipo);
  }

  /**
   * Incrementar contador de auditorías programadas
   */
  async incrementarContador(id: string): Promise<void> {
    const tipo = await this.findOne(id);
    tipo.auditoriasProgramadas += 1;
    await this.tipoAuditoriaRepository.save(tipo);
  }

  /**
   * Decrementar contador de auditorías programadas
   */
  async decrementarContador(id: string): Promise<void> {
    const tipo = await this.findOne(id);
    tipo.auditoriasProgramadas = Math.max(0, tipo.auditoriasProgramadas - 1);
    await this.tipoAuditoriaRepository.save(tipo);
  }
}
