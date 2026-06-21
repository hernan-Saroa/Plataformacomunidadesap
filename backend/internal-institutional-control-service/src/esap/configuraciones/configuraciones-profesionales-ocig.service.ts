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
import { ControlInternoPermissions as CIP } from '../../common/permissions.constants';
import {
  ROLES_OCIG_OPERATIVOS,
  esRolOcigOperativo,
  normalizarRolOcigOperativo,
} from './roles-ocig-operativos.constants';

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
    idTercero: string,
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
      if (existe.activo) {
        throw new ConflictException(
          `Ya existe una configuración para el profesional con ID ${createDto.idTercero}`,
        );
      } else {
        // Reactivar y actualizar la configuración existente
        existe.activo = true;
        existe.rolOcig = this.validarRolOcigOperativo(createDto.rolOcig);
        if (createDto.especialidades) {
          existe.especialidades = createDto.especialidades;
        }
        existe.capacidadMaximaAuditorias = createDto.capacidadMaximaAuditorias ?? 4;
        existe.horasMensualesDisponibles = createDto.horasMensualesDisponibles ?? 150;
        existe.puedeSerLider = createDto.puedeSerLider ?? true;
        existe.observaciones = createDto.observaciones;
        existe.updatedBy = userId;
        
        const saved = await this.configRepository.save(existe);
        const enriched = await this.enrichWithPersonaData([saved]);
        return enriched[0];
      }
    }

    // Validar especialidades
    if (!createDto.especialidades || createDto.especialidades.length === 0) {
      throw new BadRequestException(
        'Debe especificar al menos una especialidad',
      );
    }

    const config = this.configRepository.create({
      idTercero: createDto.idTercero,
      rolOcig: this.validarRolOcigOperativo(createDto.rolOcig),
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
      config.rolOcig = this.validarRolOcigOperativo(updateDto.rolOcig);
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
    idTercero: string,
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
  async removeByIdTercero(idTercero: string, userId?: string): Promise<void> {
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
   * Catálogo fijo de roles operativos OCIG (no depende de auth.role).
   */
  async getRolesOCIG(): Promise<Array<{ name: string; description: string }>> {
    return [...ROLES_OCIG_OPERATIVOS];
  }

  private validarRolOcigOperativo(rol?: string): string {
    const normalizado = normalizarRolOcigOperativo(rol);
    if (!esRolOcigOperativo(normalizado)) {
      throw new BadRequestException(
        `Rol OCIG no válido. Use uno de: ${ROLES_OCIG_OPERATIVOS.map((r) => r.name).join(', ')}`,
      );
    }
    return normalizado;
  }

  /**
   * Obtener especialidades OCIG disponibles desde la BD
   */
  async getEspecialidadesOCIG(): Promise<Array<{ id: number; nombre: string; descripcion: string }>> {
    try {
      const especialidades = await this.configRepository.query(
        `SELECT id, nombre, descripcion FROM control_interno.especialidades_ocig
         WHERE activo = true
         ORDER BY orden, nombre`,
      );
      return especialidades.map((e: any) => ({
        id: e.id,
        nombre: e.nombre,
        descripcion: e.descripcion || '',
      }));
    } catch (error) {
      console.error('[getEspecialidadesOCIG] Error:', error);
      return [];
    }
  }

  /**
   * Buscar personas candidatas de auth.personas que pueden ser configuradas como profesionales OCIG
   * Devuelve personas que AÚN NO están en configuracion_profesionales_ocig
   * @param busqueda Texto opcional para filtrar por nombre o email
   */
  async buscarPersonasCandidatas(busqueda?: string): Promise<
    Array<{
      id: string;
      idTercero: string;
      nombre: string;
      email: string;
      identificacion: string;
      roles: string[];
    }>
  > {
    try {
      // Obtener UUIDs de personas que ya están configuradas como profesionales OCIG y están ACTIVAS
      const configurados = await this.configRepository.find({
        select: ['idTercero'],
        where: { activo: true },
      });
      const idsConfigurados: string[] = configurados.map((c) => c.idTercero);

      console.log(
        '[buscarPersonasCandidatas] IDs ya configurados:',
        idsConfigurados,
      );

      // Candidatos: usuario activo con al menos un permiso del módulo control-interno
      // (vía cualquier rol asignado), y que aún no esté en configuracion_profesionales_ocig activo.
      let query = `
        SELECT DISTINCT
          p.id_person,
          p.nom_largo,
          p.dir_email,
          p.num_identificacion
        FROM auth.personas p
        INNER JOIN auth."user" u ON u.id_person = p.id_person
        WHERE p.nom_largo IS NOT NULL
          AND u.is_active = true
          AND EXISTS (
            SELECT 1
            FROM auth.user_roles ur
            INNER JOIN auth.role_permissions rp ON rp.id_rol = ur.id_rol
            INNER JOIN auth.permission perm ON perm.id_permission = rp.id_permission
            INNER JOIN auth.module m ON m.id_module = perm.id_module
            WHERE ur.id_user = u.id_user
              AND COALESCE(ur.is_active, true) = true
              AND m.code = 'control-interno'
          )
      `;

      const params: string[] = [];
      let paramIndex = 1;

      // Excluir personas ya configuradas (UUIDs válidos solamente)
      const uuidsConfigurados = idsConfigurados.filter((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
      );
      if (uuidsConfigurados.length > 0) {
        query += ` AND p.id_person != ALL($${paramIndex}::uuid[])`;
        params.push(uuidsConfigurados as any);
        paramIndex++;
      }

      // Filtrar por búsqueda si se proporciona
      if (busqueda && busqueda.trim()) {
        query += ` AND (p.nom_largo ILIKE $${paramIndex} OR p.dir_email ILIKE $${paramIndex})`;
        params.push(`%${busqueda.trim()}%`);
        paramIndex++;
      }

      // Ordenar por nombre
      query += ` ORDER BY p.nom_largo ASC LIMIT 500`;

      console.log('[buscarPersonasCandidatas] Query:', query);
      console.log('[buscarPersonasCandidatas] Params:', params);

      const personas: Array<{
        id_person: string;
        nom_largo: string | null;
        dir_email: string | null;
        num_identificacion: string | null;
      }> = await this.configRepository.query(query, params);

      console.log(
        '[buscarPersonasCandidatas] Personas encontradas:',
        personas.length,
      );

      // Cargar todos los roles de las personas encontradas
      const personaIds = personas.map((p) => p.id_person);
      const rolesMap = new Map<string, string[]>();

      if (personaIds.length > 0) {
        const rolesRows: Array<{ id_person: string; role_name: string }> =
          await this.configRepository.query(
            `SELECT u.id_person, r.name AS role_name
             FROM auth."user" u
             INNER JOIN auth.user_roles ur ON ur.id_user = u.id_user
             INNER JOIN auth.role r ON r.id = ur.id_rol
             WHERE u.id_person = ANY($1::uuid[]) AND ur.is_active = true`,
            [personaIds],
          );
        for (const row of rolesRows) {
          const existing = rolesMap.get(row.id_person) || [];
          existing.push(row.role_name);
          rolesMap.set(row.id_person, existing);
        }
      }

      // id e idTercero usan id_person (UUID) como identificador
      return personas.map((p) => ({
        id: p.id_person,
        idTercero: p.id_person,
        nombre: p.nom_largo || 'Sin Nombre',
        email: p.dir_email || '',
        identificacion: p.num_identificacion || '',
        roles: rolesMap.get(p.id_person) || [],
      }));
    } catch (error) {
      console.error('[buscarPersonasCandidatas] Error:', error);
      return [];
    }
  }

  /**
   * Personas que pueden integrar el comité de aprobación del PAI:
   * usuarios activos con permiso control-interno.plan-anual.approve (sin rol OCIG "Aprobador PAI").
   */
  async buscarAprobadoresPlanAnual(busqueda?: string): Promise<
    Array<{
      id: string;
      idTercero: string;
      nombre: string;
      email: string;
      identificacion: string;
      cargo?: string;
      roles: string[];
    }>
  > {
    try {
      const params: string[] = [CIP.PLAN_ANUAL_APPROVE];
      let query = `
        SELECT DISTINCT
          p.id_person,
          p.nom_largo,
          p.dir_email,
          p.num_identificacion,
          cfg.rol_ocig AS cargo_ocig
        FROM auth.personas p
        INNER JOIN auth."user" u ON u.id_person = p.id_person
        LEFT JOIN control_interno.configuracion_profesionales_ocig cfg
          ON cfg.id_tercero = p.id_person::text AND cfg.activo = true
        WHERE p.nom_largo IS NOT NULL
          AND u.is_active = true
          AND EXISTS (
            SELECT 1
            FROM auth.user_roles ur
            INNER JOIN auth.role_permissions rp ON rp.id_rol = ur.id_rol
            INNER JOIN auth.permission perm ON perm.id_permission = rp.id_permission
            WHERE ur.id_user = u.id_user
              AND COALESCE(ur.is_active, true) = true
              AND perm.code = $1
          )
      `;

      if (busqueda?.trim()) {
        params.push(`%${busqueda.trim()}%`);
        query += ` AND (p.nom_largo ILIKE $2 OR p.dir_email ILIKE $2)`;
      }

      query += ` ORDER BY p.nom_largo ASC LIMIT 500`;

      const personas: Array<{
        id_person: string;
        nom_largo: string | null;
        dir_email: string | null;
        num_identificacion: string | null;
        cargo_ocig: string | null;
      }> = await this.configRepository.query(query, params);

      const personaIds = personas.map((p) => p.id_person);
      const rolesMap = new Map<string, string[]>();

      if (personaIds.length > 0) {
        const rolesRows: Array<{ id_person: string; role_name: string }> =
          await this.configRepository.query(
            `SELECT u.id_person, r.name AS role_name
             FROM auth."user" u
             INNER JOIN auth.user_roles ur ON ur.id_user = u.id_user
             INNER JOIN auth.role r ON r.id = ur.id_rol
             WHERE u.id_person = ANY($1::uuid[]) AND COALESCE(ur.is_active, true) = true`,
            [personaIds],
          );
        for (const row of rolesRows) {
          const existing = rolesMap.get(row.id_person) || [];
          existing.push(row.role_name);
          rolesMap.set(row.id_person, existing);
        }
      }

      return personas.map((p) => ({
        id: p.id_person,
        idTercero: p.id_person,
        nombre: p.nom_largo || 'Sin Nombre',
        email: p.dir_email || '',
        identificacion: p.num_identificacion || '',
        cargo: p.cargo_ocig || rolesMap.get(p.id_person)?.[0] || 'Aprobador plan anual',
        roles: rolesMap.get(p.id_person) || [],
      }));
    } catch (error) {
      console.error('[buscarAprobadoresPlanAnual] Error:', error);
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

    // Separar UUIDs válidos (nuevos) de IDs legacy (viejos enteros guardados como string)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uuids = idsTerceros.filter((id) => uuidRegex.test(id));
    const legacyIds = idsTerceros.filter((id) => !uuidRegex.test(id) && /^\d+$/.test(id));

    const personasMap = new Map<
      string,
      { nombre: string; email: string; identificacion: string; roles: string[] }
    >();

    // 1. Consultar personas por UUID (id_person)
    if (uuids.length > 0) {
      try {
        const rows: Array<{
          id_person: string;
          nom_largo: string | null;
          dir_email: string | null;
          num_identificacion: string | null;
        }> = await this.configRepository.query(
          `SELECT id_person, nom_largo, dir_email, num_identificacion
           FROM auth.personas
           WHERE id_person = ANY($1::uuid[])`,
          [uuids],
        );

        // Cargar todos los roles de cada persona
        const rolesRows: Array<{
          id_person: string;
          role_name: string;
        }> = await this.configRepository.query(
          `SELECT u.id_person, r.name AS role_name
           FROM auth."user" u
           INNER JOIN auth.user_roles ur ON ur.id_user = u.id_user
           INNER JOIN auth.role r ON r.id = ur.id_rol
           WHERE u.id_person = ANY($1::uuid[]) AND ur.is_active = true`,
          [uuids],
        );

        // Agrupar roles por persona
        const rolesMap = new Map<string, string[]>();
        for (const row of rolesRows) {
          const existing = rolesMap.get(row.id_person) || [];
          existing.push(row.role_name);
          rolesMap.set(row.id_person, existing);
        }

        for (const row of rows) {
          personasMap.set(row.id_person, {
            nombre: row.nom_largo || 'Sin Nombre',
            email: row.dir_email || '',
            identificacion: row.num_identificacion || '',
            roles: rolesMap.get(row.id_person) || [],
          });
        }
      } catch (err) {
        console.error('[enrichWithPersonaData] Error al consultar personas por UUID:', err);
      }
    }

    // 2. Consultar personas legacy por id_tercero (BIGINT)
    if (legacyIds.length > 0) {
      try {
        const legacyNums = legacyIds.map(Number);
        const rows: Array<{
          id_tercero: string;
          id_person: string;
          nom_largo: string | null;
          dir_email: string | null;
          num_identificacion: string | null;
        }> = await this.configRepository.query(
          `SELECT id_tercero::text, id_person, nom_largo, dir_email, num_identificacion
           FROM auth.personas
           WHERE id_tercero = ANY($1::bigint[])`,
          [legacyNums],
        );

        for (const row of rows) {
          // Map by the legacy id_tercero string so it matches config.idTercero
          personasMap.set(row.id_tercero, {
            nombre: row.nom_largo || 'Sin Nombre',
            email: row.dir_email || '',
            identificacion: row.num_identificacion || '',
            roles: [],
          });
        }
        console.log(`[enrichWithPersonaData] Resolved ${rows.length}/${legacyIds.length} legacy id_tercero entries`);
      } catch (err) {
        console.error('[enrichWithPersonaData] Error al consultar personas legacy:', err);
      }
    }

    return configs.map((config) => {
      const personaData = personasMap.get(config.idTercero) || {
        nombre: 'Usuario Sin Nombre',
        email: '',
        identificacion: '',
        roles: [],
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
        roles: personaData.roles,
      };
    });
  }
}
