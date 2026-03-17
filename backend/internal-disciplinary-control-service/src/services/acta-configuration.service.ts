import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActaConfiguration } from '../entities/acta-configuration.entity';
import {
  CreateActaConfigurationDto,
  UpdateActaConfigurationDto,
} from '../dtos/acta-configuration.dto';

@Injectable()
export class ActasConfigurationService {
  constructor(
    @InjectRepository(ActaConfiguration)
    private actaConfigRepository: Repository<ActaConfiguration>,
  ) {}

  /**
   * Crear una nueva configuración de acta
   */
  async create(
    createDto: CreateActaConfigurationDto,
  ): Promise<ActaConfiguration> {
    // Verificar si ya existe un acta con el mismo tipo
    const existing = await this.actaConfigRepository.findOne({
      where: { tipo: createDto.tipo },
    });

    if (existing) {
      throw new HttpException(
        `Ya existe una configuración para el tipo de acta: ${createDto.tipo}`,
        HttpStatus.CONFLICT,
      );
    }

    const actaConfig = this.actaConfigRepository.create({
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

    return await this.actaConfigRepository.save(actaConfig);
  }

  /**
   * Obtener todas las configuraciones de actas
   */
  async findAll(): Promise<ActaConfiguration[]> {
    return await this.actaConfigRepository.find({
      order: { orden: 'ASC', nombre: 'ASC' },
    });
  }

  /**
   * Obtener solo las actas activas
   */
  async findActive(): Promise<ActaConfiguration[]> {
    return await this.actaConfigRepository.find({
      where: { estado: 'activo' },
      order: { orden: 'ASC' },
    });
  }

  /**
   * Obtener una configuración por ID
   */
  async findById(id: string): Promise<ActaConfiguration> {
    const actaConfig = await this.actaConfigRepository.findOne({
      where: { id },
    });

    if (!actaConfig) {
      throw new HttpException(
        'Configuración de acta no encontrada',
        HttpStatus.NOT_FOUND,
      );
    }

    return actaConfig;
  }

  /**
   * Obtener una configuración por tipo
   */
  async findByTipo(tipo: string): Promise<ActaConfiguration> {
    const actaConfig = await this.actaConfigRepository.findOne({
      where: { tipo },
    });

    if (!actaConfig) {
      throw new HttpException(
        `Configuración de acta no encontrada para el tipo: ${tipo}`,
        HttpStatus.NOT_FOUND,
      );
    }

    return actaConfig;
  }

  /**
   * Obtener configuraciones por etapa
   */
  async findByStage(stage: string): Promise<ActaConfiguration[]> {
    return await this.actaConfigRepository.find({
      where: { estado: 'activo', stage },
      order: { orden: 'ASC' },
    });
  }

  /**
   * Actualizar una configuración
   */
  async update(
    id: string,
    updateDto: UpdateActaConfigurationDto,
  ): Promise<ActaConfiguration> {
    const actaConfig = await this.findById(id);

    if (updateDto.tipo && updateDto.tipo !== actaConfig.tipo) {
      // Verificar que el nuevo tipo no exista
      const existing = await this.actaConfigRepository.findOne({
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
    if (updateDto.tipo !== undefined) actaConfig.tipo = updateDto.tipo;
    if (updateDto.nombre !== undefined) actaConfig.nombre = updateDto.nombre;
    if (updateDto.estado !== undefined) actaConfig.estado = updateDto.estado;
    if (updateDto.plantilla !== undefined) actaConfig.plantilla = updateDto.plantilla;
    if (updateDto.stage !== undefined) actaConfig.stage = updateDto.stage;
    if (updateDto.orden !== undefined) actaConfig.orden = updateDto.orden;
    
    // Actualizar campos de plantilla
    if (updateDto.nombre_plantilla !== undefined) actaConfig.nombre_plantilla = updateDto.nombre_plantilla;
    if (updateDto.descripcion_plantilla !== undefined) actaConfig.descripcion_plantilla = updateDto.descripcion_plantilla;
    if (updateDto.version_plantilla !== undefined) actaConfig.version_plantilla = updateDto.version_plantilla;
    if (updateDto.estado_plantilla !== undefined) actaConfig.estado_plantilla = updateDto.estado_plantilla;

    return await this.actaConfigRepository.save(actaConfig);
  }

  /**
   * Eliminar una configuración
   */
  async delete(id: string): Promise<void> {
    const actaConfig = await this.findById(id);
    await this.actaConfigRepository.remove(actaConfig);
  }

  /**
   * Cambiar el estado de una configuración (activar/desactivar)
   */
  async toggleEstado(id: string): Promise<ActaConfiguration> {
    const actaConfig = await this.findById(id);
    actaConfig.estado = actaConfig.estado === 'activo' ? 'inactivo' : 'activo';
    return await this.actaConfigRepository.save(actaConfig);
  }

  /**
   * Actualizar la plantilla de un acta (URL del archivo subido)
   */
  async updatePlantilla(
    id: string, 
    plantillaUrl: string,
    nombrePlantilla?: string,
    descripcionPlantilla?: string | null,
    versionPlantilla?: string,
    estadoPlantilla?: string
  ): Promise<ActaConfiguration> {
    const actaConfig = await this.findById(id);
    actaConfig.plantilla = plantillaUrl;
    actaConfig.nombre_plantilla = nombrePlantilla || `Plantilla_${Date.now()}`;
    actaConfig.descripcion_plantilla = descripcionPlantilla || null;
    actaConfig.version_plantilla = versionPlantilla || '1.0';
    actaConfig.estado_plantilla = estadoPlantilla || 'activo';
    return await this.actaConfigRepository.save(actaConfig);
  }
}
