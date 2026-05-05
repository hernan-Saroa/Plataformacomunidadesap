import { Controller, Get, Res, Header, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { DisciplinaryExportService } from '../services/disciplinary-export.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DISCIPLINARY_MODULE_ACCESS } from '../auth/authorization.constants';

@Controller('configuration/export')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', DISCIPLINARY_MODULE_ACCESS)
export class DisciplinaryExportController {
    constructor(private readonly exportService: DisciplinaryExportService) { }

    @Get('zip')
    @Header('Content-Type', 'application/zip')
    @Header('Content-Disposition', 'attachment; filename="Expedientes_Disciplinarios_Completo.zip"')
    async downloadAllZip(@Res() res: Response) {
        try {
            const archive = await this.exportService.exportAllExpedientesToZip();

            // Pipe the archive data to the response
            archive.pipe(res);

            // Manejo de errores del stream
            archive.on('error', (err) => {
                console.error('Error en el archivo ZIP:', err);
                if (!res.headersSent) {
                    res.status(500).send({ message: 'Error generando el archivo ZIP' });
                }
            });

            // No necesitamos esperar a 'end' aquí, el pipe lo maneja
        } catch (error) {
            console.error('Error en controlador de exportación:', error);
            res.status(500).send({ message: 'Error interno al exportar expedientes' });
        }
    }
}
