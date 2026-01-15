import { Controller, Get, Post, Delete, Param, Body, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { extname, join, basename } from 'path';
import type { Response } from 'express';
import * as fs from 'fs';
import { ComentariosDocumentosOCService } from '../services/comentarios-documentos-oc.service';

@Controller('requerimientos-oc')
export class ComentariosDocumentosOCController {
    constructor(private readonly service: ComentariosDocumentosOCService) { }

    // ==================== COMENTARIOS ====================

    @Get(':requerimientoId/comentarios')
    async getComentarios(@Param('requerimientoId') requerimientoId: string) {
        return this.service.findComentariosByRequerimiento(requerimientoId);
    }

    @Post(':requerimientoId/comentarios')
    async createComentario(
        @Param('requerimientoId') requerimientoId: string,
        @Body() body: { contenido: string; tipo?: string; autorNombre?: string }
    ) {
        return this.service.createComentario({
            requerimientoId,
            contenido: body.contenido,
            tipo: body.tipo || 'general',
            autorNombre: body.autorNombre
        });
    }

    @Delete('comentarios/:comentarioId')
    async deleteComentario(@Param('comentarioId') comentarioId: string) {
        await this.service.deleteComentario(comentarioId);
        return { success: true };
    }

    // ==================== DOCUMENTOS ====================

    @Get(':requerimientoId/documentos')
    async getDocumentos(@Param('requerimientoId') requerimientoId: string) {
        return this.service.findDocumentosByRequerimiento(requerimientoId);
    }

    @Post(':requerimientoId/documentos')
    @UseInterceptors(FileInterceptor('archivo', {
        storage: multer.diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                return cb(null, `${randomName}${extname(file.originalname)}`);
            }
        })
    }))
    async createDocumento(
        @Param('requerimientoId') requerimientoId: string,
        @Body() body: {
            nombre: string;
            tipoDocumento?: string;
            descripcion?: string;
            subidoPor?: string;
        },
        @UploadedFile() file: Express.Multer.File
    ) {
        return this.service.createDocumento({
            requerimientoId,
            nombre: body.nombre,
            tipoDocumento: body.tipoDocumento || 'otro',
            descripcion: body.descripcion,
            archivoUrl: file ? `files/${file.filename}` : undefined,
            subidoPor: body.subidoPor,
            tamanoBytes: file ? file.size : undefined,
            mimeType: file ? file.mimetype : undefined
        });
    }

    @Delete('documentos/:documentoId')
    async deleteDocumento(@Param('documentoId') documentoId: string) {
        await this.service.deleteDocumento(documentoId);
        return { success: true };
    }
    @Get(':requerimientoId/documentos/download-zip')
    async downloadAllAsZip(
        @Param('requerimientoId') requerimientoId: string,
        @Res() res: Response
    ) {
        try {
            const documentos = await this.service.findDocumentosByRequerimiento(requerimientoId);
            const documentosConArchivo = documentos.filter(d => d.archivoUrl);

            if (!documentosConArchivo || documentosConArchivo.length === 0) {
                res.status(404).json({ message: 'No hay documentos para descargar' });
                return;
            }

            const archiver = require('archiver');
            const sanitizedId = requerimientoId.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
            const zipFilename = `requerimiento_oc_${sanitizedId}.zip`;

            res.set({
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename=${zipFilename}`,
            });

            const archive = archiver('zip', { zlib: { level: 9 } });

            archive.on('error', (err: Error) => {
                console.error('Error en archiver:', err);
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Error al crear el archivo ZIP' });
                }
            });

            archive.pipe(res);

            for (const doc of documentosConArchivo) {
                if (doc.archivoUrl) {
                    let filePath: string;
                    if (doc.archivoUrl.includes('/files/')) {
                        const filename = doc.archivoUrl.split('/files/').pop() || '';
                        filePath = join(process.cwd(), 'uploads', filename);
                    } else if (doc.archivoUrl.includes('/uploads/')) {
                        const filename = doc.archivoUrl.split('/uploads/').pop() || '';
                        filePath = join(process.cwd(), 'uploads', filename);
                    } else {
                        // Fallback simple filename
                        const filename = basename(doc.archivoUrl);
                        filePath = join(process.cwd(), 'uploads', filename);
                    }

                    if (fs.existsSync(filePath)) {
                        const fileName = doc.nombre || `documento_${doc.id.substring(0, 8)}`;
                        archive.file(filePath, { name: fileName });
                    }
                }
            }

            await archive.finalize();

        } catch (error) {
            console.error('Error generando ZIP de documentos OC:', error);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Error al generar el archivo ZIP' });
            }
        }
    }
}


