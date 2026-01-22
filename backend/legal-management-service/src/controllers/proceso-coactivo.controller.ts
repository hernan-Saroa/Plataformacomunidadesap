import { Controller, Get, Post, Put, Delete, Param, Body, HttpStatus, HttpException, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, Res, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ProcesoCoactivoService } from '../services/proceso-coactivo.service';
import type { CreateProcesoCoactivoDto, UpdateProcesoCoactivoDto, CreatePagoCoactivoDto } from '../services/proceso-coactivo.service';

@Controller('procesos-coactivos')
export class ProcesoCoactivoController {
    constructor(private readonly procesoCoactivoService: ProcesoCoactivoService) { }

    @Get()
    async findAll() {
        try {
            const procesos = await this.procesoCoactivoService.findAll();
            return procesos;
        } catch (error) {
            console.error('Error en findAll procesos coactivos:', error);
            throw new HttpException('Error al obtener procesos coactivos', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('stats')
    async getStats() {
        try {
            const stats = await this.procesoCoactivoService.getStats();
            return stats;
        } catch (error) {
            console.error('Error en getStats procesos coactivos:', error);
            throw new HttpException('Error al obtener estadísticas', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        try {
            const proceso = await this.procesoCoactivoService.findOne(id);
            return proceso;
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new HttpException('Proceso no encontrado', HttpStatus.NOT_FOUND);
        }
    }

    @Post()
    async create(@Body() dto: CreateProcesoCoactivoDto) {
        try {
            const proceso = await this.procesoCoactivoService.create(dto);
            return proceso;
        } catch (error) {
            console.error('Error creando proceso coactivo:', error);
            throw new HttpException('Error al crear proceso coactivo', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateProcesoCoactivoDto) {
        try {
            const proceso = await this.procesoCoactivoService.update(id, dto);
            return proceso;
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new HttpException('Error al actualizar proceso', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        try {
            await this.procesoCoactivoService.delete(id);
            return { message: 'Proceso eliminado correctamente' };
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new HttpException('Error al eliminar proceso', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ============ PAGOS Y AUDITORÍA ============

    @Post(':id/pagos')
    async registrarPago(@Param('id') id: string, @Body() dto: CreatePagoCoactivoDto) {
        try {
            return await this.procesoCoactivoService.registrarPago(id, dto);
        } catch (error) {
            console.error('Error registrando pago:', error);
            throw new HttpException('Error al registrar pago', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get(':id/pagos')
    async getPagos(@Param('id') id: string) {
        try {
            return await this.procesoCoactivoService.getPagos(id);
        } catch (error) {
            console.error('Error obteniendo pagos:', error);
            throw new HttpException('Error al obtener pagos', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get(':id/historial')
    async getHistorial(@Param('id') id: string) {
        try {
            return await this.procesoCoactivoService.getHistorial(id);
        } catch (error) {
            console.error('Error obteniendo historial:', error);
            throw new HttpException('Error al obtener historial', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Delete('pagos/:pagoId')
    async deletePago(@Param('pagoId') pagoId: string) {
        try {
            await this.procesoCoactivoService.deletePago(pagoId);
            return { success: true, message: 'Pago eliminado correctamente' };
        } catch (error) {
            console.error('Error eliminando pago:', error);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new HttpException('Error al eliminar pago', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ============ GESTIÓN DE DOCUMENTOS ============

    @Post(':id/adjuntos')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                cb(null, `${randomName}${extname(file.originalname)}`);
            }
        })
    }))
    async uploadAdjunto(
        @Param('id') id: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
                ],
            }),
        ) file: Express.Multer.File,
        @Body() body: { tipo?: string; descripcion?: string },
    ) {
        try {
            const tipo = body?.tipo || 'DOCUMENTO';
            return await this.procesoCoactivoService.addAdjunto(id, file, tipo);
        } catch (error) {
            console.error('Error subiendo adjunto:', error);
            throw new HttpException('Error al subir documento', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get(':id/adjuntos')
    async getAdjuntos(@Param('id') id: string) {
        try {
            return await this.procesoCoactivoService.getAdjuntos(id);
        } catch (error) {
            console.error('Error obteniendo adjuntos:', error);
            throw new HttpException('Error al obtener documentos', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Delete('adjuntos/:id')
    async deleteAdjunto(@Param('id') id: string) {
        try {
            await this.procesoCoactivoService.deleteAdjunto(id);
            return { message: 'Documento eliminado correctamente' };
        } catch (error) {
            console.error('Error eliminando adjunto:', error);
            if (error instanceof HttpException) throw error;
            throw new HttpException('Error al eliminar documento', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get(':id/download-zip')
    async downloadZip(@Param('id') id: string, @Res() res: any) {
        try {
            const archive = await this.procesoCoactivoService.downloadZip(id);
            const proceso = await this.procesoCoactivoService.findOne(id);
            const filename = `Ficha_Proceso_${proceso.radicado}.zip`;

            res.set({
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${filename}"`
            });

            archive.pipe(res);
        } catch (error) {
            console.error('Error generando download-zip:', error);
            if (!res.headersSent) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error al generar la descarga' });
            }
        }
    }

    @Get('pagos/soporte/:filename')
    async getSoportePago(@Param('filename') filename: string, @Res() res: any) {
        try {
            const fileStream = await this.procesoCoactivoService.getSoportePagoStream(filename);
            res.set({
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${filename}"`
            });
            fileStream.pipe(res);
        } catch (error) {
            console.error('Error descargando soporte:', error);
            if (error instanceof HttpException) throw error;
            throw new HttpException('Error al descargar archivo', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
