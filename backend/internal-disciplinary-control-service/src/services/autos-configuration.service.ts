import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutoConfiguration } from '../entities/auto-configuration.entity';
import { LegalAuto } from '../entities/legal-auto.entity';
import { ProcessStatus } from '../entities/disciplinary-process.entity';
import {
  AutoConfigurationDeletionImpactDto,
  AutoConfigurationUsageProcessDto,
  AutoConfigurationUsageStateDto,
  CreateAutosConfigurationDto,
  UpdateAutosConfigurationDto,
} from '../dtos/autos-configuration.dto';

@Injectable()
export class AutosConfigurationService {
  constructor(
    @InjectRepository(AutoConfiguration)
    private autoConfigRepository: Repository<AutoConfiguration>,
    @InjectRepository(LegalAuto)
    private autoRepository: Repository<LegalAuto>,
  ) {}

  private readonly ACTIVE_PROCESS_STATUSES = [
    ProcessStatus.ACTIVO,
    ProcessStatus.SUSPENDIDO,
  ];

  private readonly AUTO_STATUS_ORDER: Record<string, number> = {
    BORRADOR: 1,
    REVISION_JEFE: 2,
    DEVUELTO: 3,
    APROBADO: 4,
    FIRMADO: 5,
    NOTIFICADO: 6,
  };

  /**
   * Crear una nueva configuración de auto
   */
  async create(
    createDto: CreateAutosConfigurationDto,
  ): Promise<AutoConfiguration> {
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
  async findByTipo(tipo: string): Promise<AutoConfiguration | null> {
    const autoConfig = await this.autoConfigRepository.findOne({
      where: { tipo },
    });

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
   * Obtener impacto de eliminación para una configuración de auto
   */
  async getDeletionImpact(
    id: string,
  ): Promise<AutoConfigurationDeletionImpactDto> {
    const autoConfig = await this.findById(id);
    const schema =
      this.autoConfigRepository.metadata.schema ||
      this.autoRepository.metadata.schema ||
      'public';
    const autoTable = `"${schema}"."legal_autos"`;
    const processTable = `"${schema}"."disciplinary_processes"`;
    const professionalTable = `"${schema}"."disciplinary_professional"`;

    // Esta consulta usa SQL crudo para evitar que TypeORM intente proyectar
    // columnas del entity DisciplinaryProcess que no existen en algunas BD
    // locales heredadas, como fechaInicioEtapa.
    const usageRows = await this.autoRepository.query(
      `
        SELECT
          process.id AS "processId",
          process."radicadoProceso" AS "radicadoProceso",
          process.estado AS "estado",
          process."etapaActual" AS "etapaActual",
          professional.nombre_completo AS "abogadoAsignadoNombre",
          auto.estado AS "autoStatus",
          COUNT(auto.id)::int AS "autosCount",
          MAX(auto."createdAt") AS "ultimoAutoCreadoAt"
        FROM ${autoTable} auto
        INNER JOIN ${processTable} process
          ON process.id = auto."processId"
        LEFT JOIN ${professionalTable} professional
          ON professional.id = process.abogado_asignado_id
        WHERE auto.tipo::text = $1
        GROUP BY
          process.id,
          process."radicadoProceso",
          process.estado,
          process."etapaActual",
          professional.nombre_completo,
          auto.estado
        ORDER BY MAX(auto."createdAt") DESC
      `,
      [autoConfig.tipo],
    );

    const usageProcessesMap = new Map<
      string,
      AutoConfigurationUsageProcessDto & {
        _latestTimestamp: number;
      }
    >();

    usageRows.forEach(
      (row: {
        processId: string;
        radicadoProceso: string;
        estado: string;
        etapaActual: string;
        abogadoAsignadoNombre: string | null;
        autoStatus: string;
        autosCount: string | number;
        ultimoAutoCreadoAt: string | null;
      }) => {
        const autosCount = Number(row.autosCount || 0);
        const latestTimestamp = row.ultimoAutoCreadoAt
          ? new Date(row.ultimoAutoCreadoAt).getTime()
          : 0;

        const stateEntry: AutoConfigurationUsageStateDto = {
          status: row.autoStatus,
          count: autosCount,
        };

        const existing = usageProcessesMap.get(row.processId);

        if (!existing) {
          usageProcessesMap.set(row.processId, {
            processId: row.processId,
            radicadoProceso: row.radicadoProceso,
            estado: row.estado,
            etapaActual: row.etapaActual,
            abogadoAsignadoNombre: row.abogadoAsignadoNombre,
            autosCount,
            ultimoAutoCreadoAt: row.ultimoAutoCreadoAt,
            autoStates: [stateEntry],
            _latestTimestamp: latestTimestamp,
          });
          return;
        }

        existing.autosCount += autosCount;
        existing.autoStates.push(stateEntry);

        if (latestTimestamp > existing._latestTimestamp) {
          existing._latestTimestamp = latestTimestamp;
          existing.ultimoAutoCreadoAt = row.ultimoAutoCreadoAt;
        }
      },
    );

    const usageProcesses: AutoConfigurationUsageProcessDto[] = Array.from(
      usageProcessesMap.values(),
    )
      .map((process) => ({
        ...process,
        autoStates: [...process.autoStates].sort(
          (a, b) =>
            (this.AUTO_STATUS_ORDER[a.status] || 999) -
            (this.AUTO_STATUS_ORDER[b.status] || 999),
        ),
      }))
      .sort(
        (a, b) =>
          new Date(b.ultimoAutoCreadoAt || 0).getTime() -
          new Date(a.ultimoAutoCreadoAt || 0).getTime(),
      )
      .map(({ _latestTimestamp, ...process }) => process);

    const activeProcesses = usageProcesses.filter((process) =>
      this.ACTIVE_PROCESS_STATUSES.includes(process.estado as ProcessStatus),
    );

    const historicalProcessesCount =
      usageProcesses.length - activeProcesses.length;

    return {
      autoConfigurationId: autoConfig.id,
      autoTipo: autoConfig.tipo,
      autoNombre: autoConfig.nombre,
      canDelete: activeProcesses.length === 0,
      activeProcessesCount: activeProcesses.length,
      historicalProcessesCount,
      activeProcesses,
    };
  }

  /**
   * Eliminar una configuración
   */
  async delete(id: string): Promise<void> {
    const autoConfig = await this.findById(id);
    const deletionImpact = await this.getDeletionImpact(id);

    if (!deletionImpact.canDelete) {
      throw new HttpException(
        {
          statusCode: HttpStatus.CONFLICT,
          message:
            'No se puede eliminar este tipo de auto porque tiene procesos en curso asociados. Revise o cierre esos procesos antes de continuar.',
          error: {
            code: 'AUTO_CONFIGURATION_IN_USE',
            message:
              'No se puede eliminar este tipo de auto porque tiene procesos en curso asociados. Revise o cierre esos procesos antes de continuar.',
            details: deletionImpact,
          },
        },
        HttpStatus.CONFLICT,
      );
    }

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
