import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OficioConfiguration } from '../entities/oficio-configuration.entity';
import {
  CreateOficioConfigurationDto,
  UpdateOficioConfigurationDto,
} from '../dtos/oficio-configuration.dto';

@Injectable()
export class OficiosConfigurationService {
  constructor(
    @InjectRepository(OficioConfiguration)
    private oficioConfigRepository: Repository<OficioConfiguration>,
  ) {}

  /**
   * Crear una nueva configuración de oficio
   */
  async create(
    createDto: CreateOficioConfigurationDto,
  ): Promise<OficioConfiguration> {
    // Verificar si ya existe un oficio con el mismo tipo
    const existing = await this.oficioConfigRepository.findOne({
      where: { tipo: createDto.tipo },
    });

    if (existing) {
      throw new HttpException(
        `Ya existe una configuración para el tipo de oficio: ${createDto.tipo}`,
        HttpStatus.CONFLICT,
      );
    }

    const oficioConfig = this.oficioConfigRepository.create({
      tipo: createDto.tipo,
      nombre: createDto.nombre,
      estado: createDto.estado || 'activo',
      plantilla: createDto.plantilla || undefined,
      stage: createDto.stage || null,
      orden: createDto.orden || 0,
      nombre_plantilla: createDto.nombre_plantilla || null,
      descripcion_plantilla: createDto.descripcion_plantilla || null,
      version_plantilla: createDto.version_plantilla || '1.0',
      estado_plantilla: createDto.estado_plantilla || 'activo',
    });

    return await this.oficioConfigRepository.save(oficioConfig);
  }

  /**
   * Obtener todas las configuraciones de oficios
   */
  async findAll(): Promise<OficioConfiguration[]> {
    return await this.oficioConfigRepository.find({
      order: { orden: 'ASC', nombre: 'ASC' },
    });
  }

  /**
   * Obtener solo los oficios activos
   */
  async findActive(): Promise<OficioConfiguration[]> {
    return await this.oficioConfigRepository.find({
      where: { estado: 'activo' },
      order: { orden: 'ASC' },
    });
  }

  /**
   * Obtener una configuración por ID
   */
  async findById(id: string): Promise<OficioConfiguration> {
    const oficioConfig = await this.oficioConfigRepository.findOne({
      where: { id },
    });

    if (!oficioConfig) {
      throw new HttpException(
        'Configuración de oficio no encontrada',
        HttpStatus.NOT_FOUND,
      );
    }

    return oficioConfig;
  }

  /**
   * Obtener una configuración por tipo
   */
  async findByTipo(tipo: string): Promise<OficioConfiguration> {
    const oficioConfig = await this.oficioConfigRepository.findOne({
      where: { tipo },
    });

    if (!oficioConfig) {
      throw new HttpException(
        `Configuración de oficio no encontrada para el tipo: ${tipo}`,
        HttpStatus.NOT_FOUND,
      );
    }

    return oficioConfig;
  }

  /**
   * Obtener configuraciones por etapa
   */
  async findByStage(stage: string): Promise<OficioConfiguration[]> {
    return await this.oficioConfigRepository.find({
      where: { estado: 'activo', stage },
      order: { orden: 'ASC' },
    });
  }

  /**
   * Actualizar una configuración
   */
  async update(
    id: string,
    updateDto: UpdateOficioConfigurationDto,
  ): Promise<OficioConfiguration> {
    const oficioConfig = await this.findById(id);

    if (updateDto.tipo && updateDto.tipo !== oficioConfig.tipo) {
      // Verificar que el nuevo tipo no exista
      const existing = await this.oficioConfigRepository.findOne({
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
    if (updateDto.tipo !== undefined) oficioConfig.tipo = updateDto.tipo;
    if (updateDto.nombre !== undefined) oficioConfig.nombre = updateDto.nombre;
    if (updateDto.estado !== undefined) oficioConfig.estado = updateDto.estado;
    if (updateDto.plantilla !== undefined) oficioConfig.plantilla = updateDto.plantilla;
    if (updateDto.stage !== undefined) oficioConfig.stage = updateDto.stage;
    if (updateDto.orden !== undefined) oficioConfig.orden = updateDto.orden;
    
    // Actualizar campos de plantilla
    if (updateDto.nombre_plantilla !== undefined) oficioConfig.nombre_plantilla = updateDto.nombre_plantilla;
    if (updateDto.descripcion_plantilla !== undefined) oficioConfig.descripcion_plantilla = updateDto.descripcion_plantilla;
    if (updateDto.version_plantilla !== undefined) oficioConfig.version_plantilla = updateDto.version_plantilla;
    if (updateDto.estado_plantilla !== undefined) oficioConfig.estado_plantilla = updateDto.estado_plantilla;

    return await this.oficioConfigRepository.save(oficioConfig);
  }

  /**
   * Eliminar una configuración
   */
  async delete(id: string): Promise<void> {
    const oficioConfig = await this.findById(id);
    await this.oficioConfigRepository.remove(oficioConfig);
  }

  /**
   * Cambiar el estado de una configuración (activar/desactivar)
   */
  async toggleEstado(id: string): Promise<OficioConfiguration> {
    const oficioConfig = await this.findById(id);
    oficioConfig.estado = oficioConfig.estado === 'activo' ? 'inactivo' : 'activo';
    return await this.oficioConfigRepository.save(oficioConfig);
  }

  /**
   * Actualizar la plantilla de un oficio (URL del archivo subido)
   */
  async updatePlantilla(
    id: string, 
    plantillaUrl: string,
    nombrePlantilla?: string,
    descripcionPlantilla?: string | null,
    versionPlantilla?: string,
    estadoPlantilla?: string
  ): Promise<OficioConfiguration> {
    const oficioConfig = await this.findById(id);
    oficioConfig.plantilla = plantillaUrl;
    oficioConfig.nombre_plantilla = nombrePlantilla || `Plantilla_${Date.now()}`;
    oficioConfig.descripcion_plantilla = descripcionPlantilla || null;
    oficioConfig.version_plantilla = versionPlantilla || '1.0';
    oficioConfig.estado_plantilla = estadoPlantilla || 'activo';
    return await this.oficioConfigRepository.save(oficioConfig);
  }
}
