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
   * Buscar personas candidatas de auth.personas que pueden ser configuradas como profesionales OCIG
   * Devuelve personas que AÚN NO están en configuracion_profesionales_ocig
   * @param busqueda Texto opcional para filtrar por nombre o email
   */
  async buscarPersonasCandidatas(busqueda?: string): Promise<
    Array<{
      id: string;
      idTercero: number;
      nombre: string;
      email: string;
      identificacion: string;
      rolCode: string;
    }>
  > {
    try {
      // Obtener IDs de personas que ya están configuradas como profesionales OCIG
      const configurados = await this.configRepository.find({
        select: ['idTercero'],
      });
      const idsConfigurados = configurados.map((c) => c.idTercero);

      console.log(
        '[buscarPersonasCandidatas] IDs ya configurados:',
        idsConfigurados,
      );

      // Construir query: solo personas con rol de tipo INTERNO activo
      let query = `
        SELECT DISTINCT ON (p.id_tercero)
          p.id_tercero,
          p.nom_largo,
          p.dir_email,
          p.num_identificacion,
          r.code AS rol_code
        FROM auth.personas p
        INNER JOIN auth."user" u ON u.id_tercero = p.id_tercero AND u.is_active = true
        INNER JOIN auth.user_roles ur ON ur.id_user = u.id_user AND ur.is_active = true
        INNER JOIN auth.role r ON r.id = ur.id_rol AND r.is_active = true
        WHERE (
          r.type = 'INTERNO'
          OR r.code ILIKE '%OCI%'
          OR r.code ILIKE '%AUDITOR%'
          OR r.code ILIKE '%CONTROL%'
          OR r.code ILIKE '%PROFESIONAL%'
        )
      `;

      const params: (number | string)[] = [];
      let paramIndex = 1;

      // Excluir personas ya configuradas
      if (idsConfigurados.length > 0) {
        const placeholders = idsConfigurados
          .map((_, i) => `$${paramIndex + i}::bigint`)
          .join(', ');
        query += ` AND p.id_tercero NOT IN (${placeholders})`;
        params.push(...idsConfigurados);
        paramIndex += idsConfigurados.length;
      }

      // Filtrar por búsqueda si se proporciona
      if (busqueda && busqueda.trim()) {
        query += ` AND (p.nom_largo ILIKE $${paramIndex} OR p.dir_email ILIKE $${paramIndex})`;
        params.push(`%${busqueda.trim()}%`);
        paramIndex++;
      }

      // Ordenar y limitar resultados (DISTINCT ON requiere p.id_tercero primero)
      query += ` ORDER BY p.id_tercero, p.nom_largo ASC LIMIT 50`;

      console.log('[buscarPersonasCandidatas] Query:', query);
      console.log('[buscarPersonasCandidatas] Params:', params);

      const personas: Array<{
        id_tercero: string | number;
        nom_largo: string | null;
        dir_email: string | null;
        num_identificacion: string | null;
        rol_code: string | null;
      }> = await this.configRepository.query(query, params);

      console.log(
        '[buscarPersonasCandidatas] Personas encontradas:',
        personas.length,
      );

      // Mapear resultados
      return personas.map((p) => ({
        id: String(p.id_tercero),
        idTercero: Number(p.id_tercero),
        nombre: p.nom_largo || 'Sin Nombre',
        email: p.dir_email || '',
        identificacion: p.num_identificacion || '',
        rolCode: p.rol_code || '',
      }));
    } catch (error) {
      console.error('[buscarPersonasCandidatas] Error:', error);
      return [];
    }
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

    console.log('[enrichWithPersonaData] idsTerceros:', idsTerceros);

    // Usar IN con placeholders dinámicos y cast a bigint para compatibilidad
    const placeholders = idsTerceros
      .map((_, i) => `$${i + 1}::bigint`)
      .join(', ');
    const query = `SELECT 
        id_tercero,
        nom_largo,
        dir_email,
        num_identificacion
       FROM auth.personas 
       WHERE id_tercero IN (${placeholders})`;

    console.log('[enrichWithPersonaData] Query:', query);
    console.log('[enrichWithPersonaData] Params:', idsTerceros);

    const personas: Array<{
      id_tercero: string | number;
      nom_largo: string | null;
      dir_email: string | null;
      num_identificacion: string | null;
    }> = await this.configRepository.query(query, idsTerceros);

    console.log('[enrichWithPersonaData] Personas encontradas:', personas);

    // Convertir id_tercero a número porque PostgreSQL bigint viene como string
    const personasMap = new Map<
      number,
      { nombre: string; email: string; identificacion: string }
    >(
      personas.map((p) => [
        Number(p.id_tercero),
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
