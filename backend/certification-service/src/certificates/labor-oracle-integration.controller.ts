import { Controller, Get, Param, Query } from '@nestjs/common';
import { LaborOracleIntegrationService } from './labor-oracle-integration.service';
import { Public } from '../auth/public.decorator';

@Controller('certificates/integracion-fnc')
export class LaborOracleIntegrationController {
  constructor(
    private readonly laborOracleIntegrationService: LaborOracleIntegrationService,
  ) {}

  @Get('status')
  @Public()
  async getStatus() {
    return await this.laborOracleIntegrationService.getConnectionStatus();
  }

  @Get('buscar')
  @Public()
  async search(
    @Query('term') term: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    const results = await this.laborOracleIntegrationService.findSuggestedRequestsBySearch(
      term,
      parsedLimit,
    );
    return {
      ok: true,
      term,
      total: results.length,
      rows: results,
    };
  }

  @Get('documento/:documento')
  @Public()
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


