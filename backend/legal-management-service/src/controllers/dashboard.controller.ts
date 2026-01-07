import { Controller, Get } from '@nestjs/common';
import { DashboardService } from '../services/dashboard.service';
import { DashboardStatsDto } from '../dto/dashboard-stats.dto';

@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('ejecutivo')
    async getDashboardStats(): Promise<DashboardStatsDto> {
        return this.dashboardService.getStats();
    }
}


