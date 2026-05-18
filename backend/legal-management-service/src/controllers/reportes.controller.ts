import { Controller, Get, Param } from '@nestjs/common';
import { ReportesService } from '../services/reportes.service';

@Controller('reportes')
export class ReportesController {
    constructor(private readonly reportesService: ReportesService) {}

    @Get('stats')
    async getStats() {
        return this.reportesService.getStats();
    }

    @Get('data/:reportId')
    async getReportData(@Param('reportId') reportId: string) {
        return this.reportesService.getReportData(reportId);
    }
}
