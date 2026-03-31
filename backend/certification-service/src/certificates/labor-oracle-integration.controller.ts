import { Controller, Get, Param, Query } from '@nestjs/common';
import { LaborOracleIntegrationService } from './labor-oracle-integration.service';

@Controller('certificates/integracion-fnc')
export class LaborOracleIntegrationController {
  constructor(
    private readonly laborOracleIntegrationService: LaborOracleIntegrationService,
  ) {}

  @Get('status')
  async getStatus() {
    return await this.laborOracleIntegrationService.getConnectionStatus();
  }

  @Get('documento/:documento')
  async findByDocument(
    @Param('documento') documento: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    return await this.laborOracleIntegrationService.findByDocument(
      documento,
      parsedLimit,
    );
  }
}
