import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutoConfiguration } from '../entities/auto-configuration.entity';
import {
  CreateAutosConfigurationDto,
  UpdateAutosConfigurationDto,
} from '../dtos/autos-configuration.dto';

@Injectable()
export class AutosConfigurationService {
  constructor(
    @InjectRepository(AutoConfiguration)
    private autoConfigRepository: Repository<AutoConfiguration>,
  ) {}

  /**
   * Crear una nueva configuración de auto
   */
  async create(
    createDto: CreateAutosConfigurationDto,
  ): Promise<AutoConfiguration> {
    // Verificar si ya existe un auto con el mismo tipo
    const existing = await this.autoConfigRepository.findOne({
      where: { tipo: createDto.tipo },
    });

    if (existing) {
      throw new HttpException(
        `Ya existe una configuración para el tipo de auto: ${createDto.tipo}`,
        HttpStatus.CONFLICT,
      );
    }

    const autoConfig = this.autoConfigRepository.create({
      tipo: createDto.tipo,
      nombre: createDto.nombre,
      estado: createDto.estado || 'activo',
      plantilla: createDto.plantilla || undefined,
      stage: createDto.stage || null,
      orden: createDto.orden || 0,
    });

    return await this.autoConfigRepository.save(autoConfig);
  }

  /**
   * Obtener todas las configuraciones de autos
   */
  async findAll(): Promise<AutoConfiguration[]> {
    return await this.autoConfigRepository.find({
      order: { orden: 'ASC', nombre: 'ASC' },
    });
  }

  /**
   * Obtener solo los autos activos
   */
  async findActive(): Promise<AutoConfiguration[]> {
    return await this.autoConfigRepository.find({
      where: { estado: 'activo' },
      order: { orden: 'ASC' },
    });
  }

  /**
   * Obtener una configuración por ID
   */
  async findById(id: string): Promise<AutoConfiguration> {
    const autoConfig = await this.autoConfigRepository.findOne({
      where: { id },
    });

    if (!autoConfig) {
      throw new HttpException(
        'Configuración de auto no encontrada',
        HttpStatus.NOT_FOUND,
      );
    }

    return autoConfig;
  }

  /**
   * Obtener una configuración por tipo
   */
  async findByTipo(tipo: string): Promise<AutoConfiguration> {
    const autoConfig = await this.autoConfigRepository.findOne({
      where: { tipo },
    });

    if (!autoConfig) {
      throw new HttpException(
        `Configuración de auto no encontrada para el tipo: ${tipo}`,
        HttpStatus.NOT_FOUND,
      );
    }

    return autoConfig;
  }

  /**
   * Actualizar una configuración
   */
  async update(
    id: string,
    updateDto: UpdateAutosConfigurationDto,
  ): Promise<AutoConfiguration> {
    const autoConfig = await this.findById(id);

    if (updateDto.tipo && updateDto.tipo !== autoConfig.tipo) {
      // Verificar que el nuevo tipo no exista
      const existing = await this.autoConfigRepository.findOne({
        where: { tipo: updateDto.tipo },
      });

      if (existing) {
        throw new HttpException(
          `Ya existe una configuración para el tipo: ${updateDto.tipo}`,
          HttpStatus.CONFLICT,
        );
      }
    }

    // Actualizar campos
    if (updateDto.tipo !== undefined) autoConfig.tipo = updateDto.tipo;
    if (updateDto.nombre !== undefined) autoConfig.nombre = updateDto.nombre;
    if (updateDto.estado !== undefined) autoConfig.estado = updateDto.estado;
    if (updateDto.plantilla !== undefined) autoConfig.plantilla = updateDto.plantilla;
    if (updateDto.stage !== undefined) autoConfig.stage = updateDto.stage;
    if (updateDto.orden !== undefined) autoConfig.orden = updateDto.orden;
    
    // Actualizar campos de plantilla
    if (updateDto.nombre_plantilla !== undefined) autoConfig.nombre_plantilla = updateDto.nombre_plantilla;
    if (updateDto.descripcion_plantilla !== undefined) autoConfig.descripcion_plantilla = updateDto.descripcion_plantilla;
    if (updateDto.version_plantilla !== undefined) autoConfig.version_plantilla = updateDto.version_plantilla;
    if (updateDto.estado_plantilla !== undefined) autoConfig.estado_plantilla = updateDto.estado_plantilla;

    return await this.autoConfigRepository.save(autoConfig);
  }

  /**
   * Eliminar una configuración
   */
  async delete(id: string): Promise<void> {
    const autoConfig = await this.findById(id);
    await this.autoConfigRepository.remove(autoConfig);
  }

  /**
   * Cambiar el estado de una configuración (activar/desactivar)
   */
  async toggleEstado(id: string): Promise<AutoConfiguration> {
    const autoConfig = await this.findById(id);
    autoConfig.estado = autoConfig.estado === 'activo' ? 'inactivo' : 'activo';
    return await this.autoConfigRepository.save(autoConfig);
  }

  /**
   * Actualizar la plantilla de un auto (URL del archivo subido)
   */
  async updatePlantilla(id: string, plantillaUrl: string): Promise<AutoConfiguration> {
    const autoConfig = await this.findById(id);
    autoConfig.plantilla = plantillaUrl;
    autoConfig.nombre_plantilla = `Plantilla_${Date.now()}`;
    autoConfig.estado_plantilla = 'activo';
    autoConfig.version_plantilla = '1.0';
    return await this.autoConfigRepository.save(autoConfig);
  }
}
