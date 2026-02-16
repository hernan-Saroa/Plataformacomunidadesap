import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { RequestLog } from './entities/request-log.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(RequestLog)
    private readonly requestLogRepository: Repository<RequestLog>,
  ) {}

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

      const log = this.requestLogRepository.create({
        ...createAuditLogDto,
        changes: changes || [],
        timestamp: new Date(),
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

    // Contar total
    const total = await queryBuilder.getCount();

    // Aplicar paginación
    const limit = queryDto.limit || 100;
    const offset = queryDto.offset || 0;

    queryBuilder
      .orderBy('log.timestamp', 'DESC')
      .limit(limit)
      .offset(offset);

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

