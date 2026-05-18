import { Controller, Get, Post, Body, Param, Put, Patch, Delete, Res, UseInterceptors, UploadedFile, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Response } from 'express';
import { PeiService } from '../services/pei.service';
import { getLegalAccessFromRequest } from '../auth/legal-access';

@Controller('pei')
export class PeiController {
    constructor(private readonly peiService: PeiService) { }

    @Get('dashboard')
    async getDashboard(@Req() req?: any) {
        const access = getLegalAccessFromRequest(req);
        return this.peiService.getDashboard({
            responsableKeys: access.esResuelveSolo ? access.userKeys : undefined,
        });
    }

    @Get('archivados')
    async getArchivados(@Req() req?: any) {
        const access = getLegalAccessFromRequest(req);
        return this.peiService.getArchivados({
            responsableKeys: access.esResuelveSolo ? access.userKeys : undefined,
        });
    }

    @Post('indicador')
    async createIndicador(@Body() body: any) {
        return this.peiService.createIndicador(body);
    }

    @Get('indicador/:id')
    async getIndicador(@Param('id') id: number) {
        return this.peiService.findOne(id);
    }

    @Put('indicador/:id')
    async updateIndicador(@Param('id') id: number, @Body() body: any) {
        return this.peiService.updateIndicador(id, body);
    }

    /**
     * Bug 6: registra un avance del indicador. Acepta evidencia como archivo
     * (multipart/form-data, campo `evidencia`) o como URL (campo `evidenciaUrl`).
     * Persiste también el campo `observaciones` que antes se ignoraba en algunos
     * payloads, y dispara el recálculo del % global vía la lógica del dashboard.
     */
    @Post('indicador/:id/avance')
    @UseInterceptors(FileInterceptor('evidencia', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                cb(null, `${randomName}${extname(file.originalname)}`);
            }
        }),
        limits: { fileSize: 200 * 1024 * 1024 }
    }))
    async registrarAvance(
        @Param('id') id: number,
        @Body() body: { valor: number | string; observaciones?: string; usuarioId?: string; evidenciaUrl?: string },
        @UploadedFile() file?: Express.Multer.File,
    ) {
        const valorNum = typeof body.valor === 'string' ? parseFloat(body.valor) : body.valor;
        const evidenciaUrl = file
            ? `files/${file.filename}`
            : (body.evidenciaUrl?.trim() || undefined);
        return this.peiService.registrarAvance(
            id,
            valorNum,
            body.observaciones,
            body.usuarioId,
            evidenciaUrl,
        );
    }

    @Patch('indicador/:id/archivar')
    async archivar(@Param('id') id: number) {
        return this.peiService.archivar(id);
    }

    @Patch('indicador/:id/restaurar')
    async restaurar(@Param('id') id: number) {
        return this.peiService.restaurar(id);
    }

    @Delete('indicador/:id')
    async eliminar(@Param('id') id: number) {
        return this.peiService.eliminar(id);
    }

    @Get('export/zip')
    async exportZip(@Res() res: Response) {
        const archive = await this.peiService.exportIndicatorsToZip();
        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', 'attachment; filename=indicadores_pei.zip');

        // Pipe the archive to the response
        archive.pipe(res);
    }
}


