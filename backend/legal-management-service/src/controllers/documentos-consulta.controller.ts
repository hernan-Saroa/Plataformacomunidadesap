import { Controller, Get, Post, Delete, Put, Param, Body, UseInterceptors, UploadedFile, Res, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join, basename } from 'path';
import { DocumentosConsultaService } from '../services/documentos-consulta.service';
import type { Response } from 'express';
import * as fs from 'fs';

@Controller('consultas-juridicas')
export class DocumentosConsultaController {
    constructor(private readonly documentosService: DocumentosConsultaService) { }

    // ==================== DOCUMENTOS ====================

    @Get(':consultaId/documentos')
    async getDocumentos(@Param('consultaId') consultaId: string) {
        return this.documentosService.findByConsulta(consultaId);
    }

    @Post(':consultaId/documentos')
    @UseInterceptors(FileInterceptor('archivo', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                cb(null, `${randomName}${extname(file.originalname)}`);
            }
        }),
        fileFilter: (req, file, cb) => {
            const esFirmado = req.body?.firmado === 'true' || req.body?.firmado === '1';
            const WORD_MIME_TYPES = [
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/msword',
            ];
            const ALLOWED_MIME_TYPES = ['application/pdf', ...WORD_MIME_TYPES];
            if (esFirmado) {
                if (file.mimetype !== 'application/pdf') {
                    return cb(new BadRequestException('Los documentos firmados deben ser en formato PDF'), false);
                }
            } else {
                if (!ALLOWED_MIME_TYPES.includes(file.mimetype) && !file.originalname.match(/\.(pdf|docx?|doc)$/i)) {
                    return cb(new BadRequestException('Solo se permiten archivos PDF o Word (.doc, .docx)'), false);
                }
            }
            cb(null, true);
        }
    }))
    async createDocumento(
        @Param('consultaId') consultaId: string,
        @Body() body: {
            nombre: string;
            tipoDocumento?: string;
            descripcion?: string;
            subidoPor?: string;
            firmado?: string;
        },
        @UploadedFile() file: Express.Multer.File
    ) {
        if (!file) {
            throw new BadRequestException('El archivo es obligatorio');
        }

        return this.documentosService.create({
            consultaId,
            nombre: body.nombre || file.originalname,
            tipoDocumento: body.tipoDocumento || 'otro',
            descripcion: body.descripcion,
            archivoUrl: `files/${file.filename}`, // Ruta relativa - frontend construye la URL absoluta
            archivoNombreOriginal: file.originalname,
            subidoPor: body.subidoPor,
            firmado: body.firmado === 'true' || body.firmado === '1',
            tamanoBytes: file.size,
            mimeType: file.mimetype
        });
    }

    // Reemplazar documento sin firmar por uno firmado
    @Post('documentos/:documentoId/replace')
    @UseInterceptors(FileInterceptor('archivo', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                cb(null, `${randomName}${extname(file.originalname)}`);
            }
        }),
        fileFilter: (req, file, cb) => {
            if (file.mimetype !== 'application/pdf') {
                return cb(new BadRequestException('El documento firmado debe ser en formato PDF'), false);
            }
            cb(null, true);
        }
    }))
    async replaceDocumento(
        @Param('documentoId') documentoId: string,
        @UploadedFile() file: Express.Multer.File
    ) {
        if (!file) {
            throw new BadRequestException('El archivo firmado es obligatorio');
        }

        // Obtener el documento existente
        const existingDoc = await this.documentosService.findOne(documentoId);

        // Eliminar archivo anterior si existe
        if (existingDoc.archivoUrl) {
            try {
                const oldFilename = existingDoc.archivoUrl.includes('/')
                    ? existingDoc.archivoUrl.split('/').pop() || ''
                    : existingDoc.archivoUrl;
                const oldPath = join(process.cwd(), 'uploads', oldFilename);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            } catch (error) {
                console.error('Error eliminando archivo anterior:', error);
            }
        }

        // Actualizar con el nuevo archivo firmado (incluyendo nombre visible)
        return this.documentosService.update(documentoId, {
            nombre: file.originalname,
            archivoUrl: `files/${file.filename}`,
            archivoNombreOriginal: file.originalname,
            tamanoBytes: file.size,
            mimeType: file.mimetype,
            firmado: true
        });
    }

    @Delete('documentos/:documentoId')
    async deleteDocumento(@Param('documentoId') documentoId: string) {
        await this.documentosService.delete(documentoId);
        return { success: true };
    }

    // ==================== DOWNLOAD ALL AS ZIP ====================

    @Get(':consultaId/documentos/download-zip')
    async downloadAllAsZip(
        @Param('consultaId') consultaId: string,
        @Res() res: Response
    ) {
        try {
            const documentos = await this.documentosService.findByConsulta(consultaId);
            const documentosConArchivo = documentos.filter(d => d.archivoUrl);

            if (!documentosConArchivo || documentosConArchivo.length === 0) {
                res.status(404).json({ message: 'No hay documentos para descargar' });
                return;
            }

            const archiver = require('archiver');

            // Sanitizar el ID para el nombre del archivo
            const sanitizedId = consultaId.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
            const zipFilename = `Consultas_${sanitizedId}.zip`;

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

                    if (doc.archivoUrl.includes('/legal/files/')) {
                        const filename = doc.archivoUrl.split('/legal/files/').pop() || '';
                        filePath = join(process.cwd(), 'uploads', filename);
                    } else {
                        filePath = join(process.cwd(), 'uploads', basename(doc.archivoUrl));
                    }

                    if (fs.existsSync(filePath)) {
                        const fileName = doc.archivoNombreOriginal || doc.nombre || `documento_${doc.id.substring(0, 8)}`;
                        archive.file(filePath, { name: fileName });
                    }
                }
            }

            await archive.finalize();

        } catch (error) {
            console.error('Error generando ZIP de documentos:', error);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Error al generar el archivo ZIP' });
            }
        }
    }
}


