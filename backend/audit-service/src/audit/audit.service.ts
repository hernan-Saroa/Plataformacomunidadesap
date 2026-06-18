import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { RequestLog } from './entities/request-log.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly ensuredPartitions = new Set<string>();

  constructor(
    @InjectRepository(RequestLog)
    private readonly requestLogRepository: Repository<RequestLog>,
  ) {}

  private getMonthlyPartitionRange(timestamp: Date): {
    partitionName: string;
    startDate: string;
    endDate: string;
  } {
    const year = timestamp.getFullYear();
    const monthIndex = timestamp.getMonth();
    const month = String(monthIndex + 1).padStart(2, '0');
    const nextMonth = new Date(year, monthIndex + 1, 1);

    return {
      partitionName: `request_logs_${year}_${month}`,
      startDate: `${year}-${month}-01`,
      endDate: `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`,
    };
  }

  private async ensurePartitionForTimestamp(timestamp: Date): Promise<void> {
    const { partitionName, startDate, endDate } = this.getMonthlyPartitionRange(timestamp);

    if (this.ensuredPartitions.has(partitionName)) {
      return;
    }

    try {
      await this.requestLogRepository.query(
        `
        DO $$
        BEGIN
          PERFORM pg_advisory_xact_lock(hashtext('audit.request_logs.${partitionName}'));

          IF to_regclass('audit.${partitionName}') IS NULL THEN
            EXECUTE format(
              'CREATE TABLE IF NOT EXISTS audit.%I PARTITION OF audit.request_logs FOR VALUES FROM (%L) TO (%L)',
              '${partitionName}',
              '${startDate}',
              '${endDate}'
            );
          END IF;
        EXCEPTION
          WHEN duplicate_table OR invalid_object_definition THEN
            NULL;
        END;
        $$;
        `,
      );
      this.ensuredPartitions.add(partitionName);
    } catch (error) {
      this.logger.warn(
        `No se pudo asegurar la particion mensual de auditoria ${partitionName}: ${error?.message || error}`,
      );
    }
  }

  /**
   * Calcula las diferencias entre dos objetos y retorna un array de cambios
   */
  private calculateChanges(
    previousData: any,
    newData: any,
  ): Array<{ field: string; oldValue: any; newValue: any }> {
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

    if (!previousData || !newData) {
      return changes;
    }

    // Obtener todas las claves de ambos objetos
    const allKeys = new Set([
      ...Object.keys(previousData || {}),
      ...Object.keys(newData || {}),
    ]);

    for (const key of allKeys) {
      const oldValue = previousData[key];
      const newValue = newData[key];

      // Comparar valores (stringify para comparar objetos/arrays)
      const oldStr = JSON.stringify(oldValue);
      const newStr = JSON.stringify(newValue);

      if (oldStr !== newStr) {
        changes.push({
          field: key,
          oldValue: oldValue,
          newValue: newValue,
        });
      }
    }

    return changes;
  }

  async createLog(createAuditLogDto: CreateAuditLogDto): Promise<RequestLog> {
    try {
      // Calcular cambios automáticamente si hay previousData y newData
      let changes = createAuditLogDto.changes;
      
      // Solo calcular cambios si ambos datos existen (actualización)
      if (
        !changes &&
        createAuditLogDto.previousData &&
        createAuditLogDto.newData
      ) {
        changes = this.calculateChanges(
          createAuditLogDto.previousData,
          createAuditLogDto.newData,
        );
      }
      
      // Si es una creación (solo newData), generar cambios desde newData
      if (
        !changes &&
        !createAuditLogDto.previousData &&
        createAuditLogDto.newData
      ) {
        changes = Object.keys(createAuditLogDto.newData).map(key => ({
          field: key,
          oldValue: null,
          newValue: createAuditLogDto.newData[key],
        }));
      }
      
      // Si es una eliminación (solo previousData), generar cambios desde previousData
      if (
        !changes &&
        createAuditLogDto.previousData &&
        !createAuditLogDto.newData
      ) {
        changes = Object.keys(createAuditLogDto.previousData).map(key => ({
          field: key,
          oldValue: createAuditLogDto.previousData[key],
          newValue: null,
        }));
      }

      const timestamp = new Date();
      await this.ensurePartitionForTimestamp(timestamp);

      const log = this.requestLogRepository.create({
        ...createAuditLogDto,
        changes: changes || [],
        timestamp,
        hasLargeBody: (createAuditLogDto.requestBodySize || 0) >= 10240,
        hasLargeResponse: (createAuditLogDto.responseBodySize || 0) >= 10240,
      });

      const savedLog = await this.requestLogRepository.save(log);
      this.logger.log(`Log de auditoría creado: ${savedLog.id} - Entidad: ${savedLog.entityName || 'N/A'}, Cambios: ${changes?.length || 0}`);
      return savedLog;
    } catch (error) {
      this.logger.error('Error al crear log de auditoría:', error);
      throw error;
    }
  }

  async getLogs(queryDto: QueryAuditLogsDto): Promise<{
    logs: RequestLog[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const queryBuilder = this.requestLogRepository.createQueryBuilder('log');

    // Filtros de fecha
    if (queryDto.startDate && queryDto.endDate) {
      queryBuilder.andWhere('log.timestamp BETWEEN :startDate AND :endDate', {
        startDate: queryDto.startDate,
        endDate: queryDto.endDate,
      });
    } else if (queryDto.startDate) {
      queryBuilder.andWhere('log.timestamp >= :startDate', {
        startDate: queryDto.startDate,
      });
    } else if (queryDto.endDate) {
      queryBuilder.andWhere('log.timestamp <= :endDate', {
        endDate: queryDto.endDate,
      });
    }

    // Filtros adicionales
    if (queryDto.method) {
      queryBuilder.andWhere('log.method = :method', { method: queryDto.method });
    }

    if (queryDto.module) {
      queryBuilder.andWhere('log.module = :module', {
        module: queryDto.module,
      });
    }

    if (queryDto.userId) {
      queryBuilder.andWhere('log.userId = :userId', {
        userId: queryDto.userId,
      });
    }

    if (queryDto.ipAddress) {
      queryBuilder.andWhere('log.ipAddress = :ipAddress', {
        ipAddress: queryDto.ipAddress,
      });
    }

    if (queryDto.statusCode) {
      queryBuilder.andWhere('log.statusCode = :statusCode', {
        statusCode: queryDto.statusCode,
      });
    }

    // Filtros para tracking de cambios (nuevos campos)
    if (queryDto.entityName) {
      queryBuilder.andWhere('log.entityName = :entityName', {
        entityName: queryDto.entityName,
      });
    }

    if (queryDto.entityId) {
      queryBuilder.andWhere('log.entityId = :entityId', {
        entityId: queryDto.entityId,
      });
    }

    const search = queryDto.search?.trim();
    if (search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('log.user_email ILIKE :search', { search: `%${search}%` })
            .orWhere('CAST(log.user_id AS TEXT) ILIKE :search', { search: `%${search}%` })
            .orWhere('log.user_role ILIKE :search', { search: `%${search}%` })
            .orWhere('log.action ILIKE :search', { search: `%${search}%` })
            .orWhere('log.module ILIKE :search', { search: `%${search}%` })
            .orWhere('log.submodule ILIKE :search', { search: `%${search}%` })
            .orWhere('log.method ILIKE :search', { search: `%${search}%` })
            .orWhere('log.path ILIKE :search', { search: `%${search}%` })
            .orWhere('log.ip_address ILIKE :search', { search: `%${search}%` })
            .orWhere('log.entity_name ILIKE :search', { search: `%${search}%` })
            .orWhere('log.entity_id ILIKE :search', { search: `%${search}%` })
            .orWhere('log.error_message ILIKE :search', { search: `%${search}%` })
            .orWhere('CAST(log.status_code AS TEXT) ILIKE :search', { search: `%${search}%` });
        }),
      );
    }

    // Aplicar paginación
    const limit = Math.min(queryDto.limit ?? 10, 1000);
    const offset = queryDto.offset ?? 0;

    // Contar total antes de paginar. Los filtros de fecha permiten pruning
    // sobre las particiones request_logs_YYYY_MM.
    const total = await queryBuilder.getCount();

    queryBuilder
      .orderBy('log.timestamp', 'DESC')
      .addOrderBy('log.id', 'DESC')
      .take(limit)
      .skip(offset);

    const logs = await queryBuilder.getMany();

    return {
      logs,
      total,
      limit,
      offset,
    };
  }

  async getModules(): Promise<string[]> {
    const result = await this.requestLogRepository
      .createQueryBuilder('log')
      .select('DISTINCT log.module', 'module')
      .where('log.module IS NOT NULL')
      .orderBy('log.module', 'ASC')
      .getRawMany();

    return result.map((r) => r.module);
  }

  async getStats(startDate?: string, endDate?: string): Promise<any> {
    const queryBuilder = this.requestLogRepository.createQueryBuilder('log');

    if (startDate && endDate) {
      queryBuilder.andWhere('log.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const total = await queryBuilder.getCount();

    const byMethod = await queryBuilder
      .select('log.method', 'method')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.method')
      .getRawMany();

    const byModule = await queryBuilder
      .select('log.module', 'module')
      .addSelect('COUNT(*)', 'count')
      .where('log.module IS NOT NULL')
      .groupBy('log.module')
      .getRawMany();

    const byStatusCode = await queryBuilder
      .select('log.statusCode', 'statusCode')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.statusCode')
      .getRawMany();

    const avgResponseTime = await queryBuilder
      .select('AVG(log.responseTimeMs)', 'avg')
      .getRawOne();

    return {
      total,
      byMethod,
      byModule,
      byStatusCode,
      avgResponseTime: parseFloat(avgResponseTime?.avg || '0'),
    };
  }
}
