import { Controller, Get } from '@nestjs/common';
import { BackofficeDashboardService } from './backoffice-dashboard.service';

@Controller('backoffice/dashboard')
export class BackofficeDashboardController {
  constructor(private readonly service: BackofficeDashboardService) {}

  @Get('executive-stats')
  getExecutiveStats() {
    return this.service.getExecutiveStats();
  }
}
