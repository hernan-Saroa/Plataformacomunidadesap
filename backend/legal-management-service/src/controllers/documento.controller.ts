import { Controller, Get, Post, Put, Delete, Param, Body, HttpStatus, HttpException, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { extname } from 'path';
import { DocumentoService, CreateDocumentoDto, UpdateDocumentoDto } from '../services/documento.service';

@Controller('legal/documentos')
export class DocumentoController {
    constructor(private readonly documentoService: DocumentoService) { }

    // Rutas específicas con prefijo 'expediente/' primero
    @Get('expediente/:expedienteId')
    async listarPorExpediente(@Param('expedienteId') expedienteId: string) {
        try {
            const documentos = await this.documentoService.listarPorExpediente(expedienteId);
            return documentos;
        } catch (error) {
            throw new HttpException('Error al listar documentos', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('expediente/:expedienteId/count')
    async contarPorExpediente(@Param('expedienteId') expedienteId: string) {
        try {
            const count = await this.documentoService.contarPorExpediente(expedienteId);
            return { count };
        } catch (error) {
            throw new HttpException('Error al contar documentos', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('expediente/:expedienteId/download-zip')
    async descargarZip(@Param('expedienteId') expedienteId: string, @Res() res: Response) {
        try {
            const documentos = await this.documentoService.listarPorExpediente(expedienteId);

            if (!documentos || documentos.length === 0) {
                throw new HttpException('No hay documentos para descargar', HttpStatus.NOT_FOUND);
            }

            const archiver = require('archiver');
            const path = require('path');
            const fs = require('fs');

            // Configurar respuesta para descarga de archivo
            res.set({
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename=expediente_${expedienteId.replace(/[^a-zA-Z0-9]/g, '_')}.zip`,
            });

            const archive = archiver('zip', { zlib: { level: 9 } });

            archive.on('error', (err: Error) => {
                throw new HttpException('Error al crear el archivo ZIP', HttpStatus.INTERNAL_SERVER_ERROR);
            });

            // Pipe archive data to the response
            archive.pipe(res);

            // Agregar cada documento al ZIP
            for (const doc of documentos) {
                if (doc.archivoUrl) {
                    // Construir la ruta del archivo
                    let filePath: string;
                    if (doc.archivoUrl.startsWith('files/')) {
                        filePath = path.join(process.cwd(), 'uploads', doc.archivoUrl.replace('files/', ''));
                    } else if (doc.archivoUrl.startsWith('/legal/files/')) {
                        filePath = path.join(process.cwd(), 'uploads', doc.archivoUrl.replace('/legal/files/', ''));
                    } else {
                        filePath = path.join(process.cwd(), 'uploads', doc.archivoUrl);
                    }

                    // Verificar si el archivo existe
                    if (fs.existsSync(filePath)) {
                        const fileName = doc.archivoNombreOriginal || doc.nombre || path.basename(filePath);
                        archive.file(filePath, { name: fileName });
                    }
                }
            }

            // Finalizar el archivo
            await archive.finalize();

        } catch (error) {
            console.error('Error generando ZIP:', error);
            if (error instanceof HttpException) throw error;
            throw new HttpException('Error al generar el archivo ZIP', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Ruta genérica :id después de las específicas
    @Get(':id')
    async obtenerPorId(@Param('id') id: string) {
        try {
            const documento = await this.documentoService.obtenerPorId(id);
            if (!documento) {
                throw new HttpException('Documento no encontrado', HttpStatus.NOT_FOUND);
            }
            return documento;
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new HttpException('Error al obtener documento', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post()
    @UseInterceptors(FileInterceptor('archivo', {
        storage: multer.diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                return cb(null, `${randomName}${extname(file.originalname)}`);
            }
        }),
        limits: {
            fileSize: 50 * 1024 * 1024, // 50MB
        }
    }))
    async crear(@Body() dto: CreateDocumentoDto, @UploadedFile() file: Express.Multer.File) {
        try {
            if (file) {
                dto.archivoUrl = `files/${file.filename}`; // Usar ruta relativa accesible por FilesController
                dto.archivoNombreOriginal = file.originalname;
                dto.archivoMimeType = file.mimetype;
                dto.archivoTamano = file.size;
            }

            const documento = await this.documentoService.crear(dto);
            return documento;
        } catch (error) {
            console.error('Error creando documento:', error);
            throw new HttpException('Error al crear documento', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Put(':id')
    async actualizar(@Param('id') id: string, @Body() dto: UpdateDocumentoDto) {
        try {
            const documento = await this.documentoService.actualizar(id, dto);
            if (!documento) {
                throw new HttpException('Documento no encontrado', HttpStatus.NOT_FOUND);
            }
            return documento;
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new HttpException('Error al actualizar documento', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Delete(':id')
    async eliminar(@Param('id') id: string) {
        try {
            const eliminado = await this.documentoService.eliminar(id);
            if (!eliminado) {
                throw new HttpException('Documento no encontrado', HttpStatus.NOT_FOUND);
            }
            return { message: 'Documento eliminado correctamente' };
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new HttpException('Error al eliminar documento', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}

