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

  async createLog(createAuditLogDto: CreateAuditLogDto): Promise<RequestLog> {
    try {
      const log = this.requestLogRepository.create({
        ...createAuditLogDto,
        timestamp: new Date(),
        hasLargeBody: (createAuditLogDto.requestBodySize || 0) >= 10240,
        hasLargeResponse: (createAuditLogDto.responseBodySize || 0) >= 10240,
      });

      const savedLog = await this.requestLogRepository.save(log);
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

