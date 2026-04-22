import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { GraduateOracleIntegrationService } from './graduate-oracle-integration.service';

@Controller('certificates/integracion-sinu')
export class GraduateOracleIntegrationController {
  constructor(
    private readonly graduateOracleIntegrationService: GraduateOracleIntegrationService,
  ) {}

  @Get('status')
  @Public()
  async getStatus() {
    return await this.graduateOracleIntegrationService.getConnectionStatus();
  }

  @Get('documento/:documento')
  @Public()
  async findByDocument(
    @Param('documento') documento: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    return await this.graduateOracleIntegrationService.findByDocument(
      documento,
      parsedLimit,
    );
  }
}
