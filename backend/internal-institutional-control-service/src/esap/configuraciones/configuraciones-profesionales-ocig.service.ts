import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracionProfesionalOCIG } from './entities/configuracion-profesional-ocig.entity';
import {
  CreateConfiguracionProfesionalOCIGDto,
  UpdateConfiguracionProfesionalOCIGDto,
  ConfiguracionProfesionalOCIGResponseDto,
} from './dto/configuracion-profesional-ocig.dto';

@Injectable()
export class ConfiguracionesProfesionalesOCIGService {
  constructor(
    @InjectRepository(ConfiguracionProfesionalOCIG)
    private configRepository: Repository<ConfiguracionProfesionalOCIG>,
  ) {}

  /**
   * Obtener todas las configuraciones de profesionales OCIG
   */
  async findAll(
    includeInactive: boolean = false,
  ): Promise<ConfiguracionProfesionalOCIGResponseDto[]> {
    const query = this.configRepository
      .createQueryBuilder('config')
      .orderBy('config.rolOcig', 'ASC')
      .addOrderBy('config.createdAt', 'DESC');

    if (!includeInactive) {
      query.andWhere('config.activo = :activo', { activo: true });
    }

    const configuraciones = await query.getMany();

    // Enrich with persona data
    return this.enrichWithPersonaData(configuraciones);
  }

  /**
   * Obtener configuración por ID
   */
  async findOne(id: string): Promise<ConfiguracionProfesionalOCIGResponseDto> {
    const config = await this.configRepository.findOne({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException(
        `Configuración de profesional OCIG con ID ${id} no encontrada`,
      );
    }

    const enriched = await this.enrichWithPersonaData([config]);
    return enriched[0];
  }

  /**
   * Obtener configuración por ID de tercero (persona)
   */
  async findByIdTercero(
    idTercero: number,
  ): Promise<ConfiguracionProfesionalOCIGResponseDto | null> {
    const config = await this.configRepository.findOne({
      where: { idTercero },
    });

    if (!config) {
      return null;
    }

    const enriched = await this.enrichWithPersonaData([config]);
    return enriched[0];
  }

  /**
   * Crear nueva configuración de profesional OCIG
   */
  async create(
    createDto: CreateConfiguracionProfesionalOCIGDto,
    userId?: string,
  ): Promise<ConfiguracionProfesionalOCIGResponseDto> {
    // Verificar si ya existe una configuración para este tercero
    const existe = await this.configRepository.findOne({
      where: { idTercero: createDto.idTercero },
    });

    if (existe) {
      throw new ConflictException(
        `Ya existe una configuración para el profesional con ID ${createDto.idTercero}`,
      );
    }

    // Validar especialidades
    if (!createDto.especialidades || createDto.especialidades.length === 0) {
      throw new BadRequestException(
        'Debe especificar al menos una especialidad',
      );
    }

    const config = this.configRepository.create({
      idTercero: createDto.idTercero,
      rolOcig: createDto.rolOcig,
      especialidades: createDto.especialidades,
      capacidadMaximaAuditorias: createDto.capacidadMaximaAuditorias ?? 4,
      horasMensualesDisponibles: createDto.horasMensualesDisponibles ?? 150,
      puedeSerLider: createDto.puedeSerLider ?? true,
      observaciones: createDto.observaciones,
      activo: true,
      createdBy: userId,
      updatedBy: userId,
    });

    const saved = await this.configRepository.save(config);
    const enriched = await this.enrichWithPersonaData([saved]);
    return enriched[0];
  }

  /**
   * Actualizar configuración de profesional OCIG
   */
  async update(
    id: string,
    updateDto: UpdateConfiguracionProfesionalOCIGDto,
    userId?: string,
  ): Promise<ConfiguracionProfesionalOCIGResponseDto> {
    const config = await this.configRepository.findOne({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException(
        `Configuración de profesional OCIG con ID ${id} no encontrada`,
      );
    }

    // Actualizar campos
    if (updateDto.rolOcig !== undefined) {
      config.rolOcig = updateDto.rolOcig;
    }
    if (updateDto.especialidades !== undefined) {
      if (updateDto.especialidades.length === 0) {
        throw new BadRequestException(
          'Debe especificar al menos una especialidad',
        );
      }
      config.especialidades = updateDto.especialidades;
    }
    if (updateDto.capacidadMaximaAuditorias !== undefined) {
      config.capacidadMaximaAuditorias = updateDto.capacidadMaximaAuditorias;
    }
    if (updateDto.horasMensualesDisponibles !== undefined) {
      config.horasMensualesDisponibles = updateDto.horasMensualesDisponibles;
    }
    if (updateDto.puedeSerLider !== undefined) {
      config.puedeSerLider = updateDto.puedeSerLider;
    }
    if (updateDto.activo !== undefined) {
      config.activo = updateDto.activo;
    }
    if (updateDto.observaciones !== undefined) {
      config.observaciones = updateDto.observaciones;
    }

    config.updatedBy = userId;

    const saved = await this.configRepository.save(config);
    const enriched = await this.enrichWithPersonaData([saved]);
    return enriched[0];
  }

  /**
   * Actualizar configuración por ID de tercero
   */
  async updateByIdTercero(
    idTercero: number,
    updateDto: UpdateConfiguracionProfesionalOCIGDto,
    userId?: string,
  ): Promise<ConfiguracionProfesionalOCIGResponseDto> {
    const config = await this.configRepository.findOne({
      where: { idTercero },
    });

    if (!config) {
      throw new NotFoundException(
        `Configuración de profesional OCIG con idTercero ${idTercero} no encontrada`,
      );
    }

    return this.update(config.id, updateDto, userId);
  }

  /**
   * Eliminar configuración (soft delete - marcar como inactivo)
   */
  async remove(id: string, userId?: string): Promise<void> {
    const config = await this.configRepository.findOne({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException(
        `Configuración de profesional OCIG con ID ${id} no encontrada`,
      );
    }

    config.activo = false;
    config.updatedBy = userId;
    await this.configRepository.save(config);
  }

  /**
   * Eliminar configuración por ID de tercero
   */
  async removeByIdTercero(idTercero: number, userId?: string): Promise<void> {
    const config = await this.configRepository.findOne({
      where: { idTercero },
    });

    if (!config) {
      throw new NotFoundException(
        `Configuración de profesional OCIG con idTercero ${idTercero} no encontrada`,
      );
    }

    await this.remove(config.id, userId);
  }

  /**
   * Obtener profesionales que pueden ser líderes
   */
  async findLideresPotenciales(): Promise<
    ConfiguracionProfesionalOCIGResponseDto[]
  > {
    const configs = await this.configRepository.find({
      where: { activo: true, puedeSerLider: true },
      order: { rolOcig: 'ASC' },
    });

    return this.enrichWithPersonaData(configs);
  }

  /**
   * Enriquecer configuraciones con datos de persona
   */
  private async enrichWithPersonaData(
    configs: ConfiguracionProfesionalOCIG[],
  ): Promise<ConfiguracionProfesionalOCIGResponseDto[]> {
    if (configs.length === 0) {
      return [];
    }

    // Obtener datos de personas desde auth.personas
    const idsTerceros = configs.map((c) => c.idTercero);
    const personas = await this.configRepository.query(
      `SELECT 
        id_tercero,
        nom_largo,
        dir_email,
        num_identificacion
       FROM auth.personas 
       WHERE id_tercero = ANY($1)`,
      [idsTerceros],
    );

    const personasMap = new Map<number, { nombre: string; email: string; identificacion: string }>(
      personas.map((p: any) => [
        p.id_tercero,
        {
          nombre: p.nom_largo || 'Usuario Sin Nombre',
          email: p.dir_email || '',
          identificacion: p.num_identificacion || '',
        },
      ]),
    );

    return configs.map((config) => {
      const personaData = personasMap.get(config.idTercero) || {
        nombre: 'Usuario Sin Nombre',
        email: '',
        identificacion: '',
      };

      return {
        id: config.id,
        idTercero: config.idTercero,
        rolOcig: config.rolOcig,
        especialidades: config.especialidades,
        capacidadMaximaAuditorias: config.capacidadMaximaAuditorias,
        horasMensualesDisponibles: config.horasMensualesDisponibles,
        puedeSerLider: config.puedeSerLider,
        activo: config.activo,
        fechaAsignacion: config.fechaAsignacion,
        observaciones: config.observaciones,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
        nombre: personaData.nombre,
        email: personaData.email,
        identificacion: personaData.identificacion,
      };
    });
  }
}
