import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

@Controller('logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createLog(@Body() createAuditLogDto: CreateAuditLogDto) {
    return this.auditService.createLog(createAuditLogDto);
  }

  @Get()
  async getLogs(@Query() queryDto: QueryAuditLogsDto) {
    return this.auditService.getLogs(queryDto);
  }

  @Get('stats')
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.getStats(startDate, endDate);
  }

  @Get('modules')
  async getModules() {
    // Endpoint para obtener lista de módulos únicos
    return this.auditService.getModules();
  }
}

