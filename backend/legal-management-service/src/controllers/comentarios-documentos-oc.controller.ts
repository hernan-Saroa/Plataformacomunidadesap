import { Controller, Get, Post, Delete, Param, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { extname } from 'path';
import { ComentariosDocumentosOCService } from '../services/comentarios-documentos-oc.service';

@Controller('legal/requerimientos-oc')
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
}
