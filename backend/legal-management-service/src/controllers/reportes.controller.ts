import { Controller, ForbiddenException, Get, Param, Req } from '@nestjs/common';
import { ReportesService } from '../services/reportes.service';
import { getLegalAccessFromRequest } from '../auth/legal-access';

/**
 * Reportes de Gestión Legal: agregados/estadísticas transversales pensados
 * para roles de supervisión (GGP/Dirección/consultor), no para el operativo
 * que solo debe ver sus propios expedientes. Se exige tieneVistaGlobal (los
 * mismos GLOBAL_LEGAL_ROLES que ya gobiernan el resto del módulo) en vez de
 * dejar la restricción únicamente en qué tarjeta muestra el frontend.
 */
@Controller('reportes')
export class ReportesController {
    constructor(private readonly reportesService: ReportesService) {}

    private assertVistaGlobal(req: any): void {
        const access = getLegalAccessFromRequest(req);
        if (!access.tieneVistaGlobal) {
            throw new ForbiddenException('No tiene permisos para consultar los reportes de Gestión Legal.');
        }
    }

    @Get('stats')
    async getStats(@Req() req: any) {
        this.assertVistaGlobal(req);
        return this.reportesService.getStats();
    }

    @Get('data/:reportId')
    async getReportData(@Param('reportId') reportId: string, @Req() req: any) {
        this.assertVistaGlobal(req);
        return this.reportesService.getReportData(reportId);
    }
}
