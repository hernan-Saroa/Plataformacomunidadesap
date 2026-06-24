
import { Controller, Get, Param, Res, NotFoundException, Query } from '@nestjs/common';
import type { Response } from 'express';
import { join, extname } from 'path';
import { existsSync, createReadStream, statSync } from 'fs';

// Mapa de extensiones a MIME types
const MIME_TYPES: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
};

function getMimeType(filename: string): string {
    const ext = extname(filename).toLowerCase();
    return MIME_TYPES[ext] || 'application/octet-stream';
}

function getHeaderSafeFilename(filename?: string): string {
    const rawName = filename?.split(/[\\/]/).pop()?.trim() || 'archivo';
    return rawName.replace(/[\u0000-\u001F\u007F]/g, '') || 'archivo';
}

function getAsciiFallbackFilename(filename: string): string {
    const fallback = filename
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]/g, '_')
        .replace(/["\\;]/g, '_')
        .replace(/\s+/g, ' ')
        .trim();

    return fallback || 'archivo';
}

function encodeRFC5987Filename(filename: string): string {
    return encodeURIComponent(filename)
        .replace(/['()]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
        .replace(/\*/g, '%2A');
}

function buildContentDisposition(disposition: 'inline' | 'attachment', filename: string): string {
    const safeFilename = getHeaderSafeFilename(filename);
    const fallbackFilename = getAsciiFallbackFilename(safeFilename);
    const encodedFilename = encodeRFC5987Filename(safeFilename);

    return `${disposition}; filename="${fallbackFilename}"; filename*=UTF-8''${encodedFilename}`;
}

@Controller('files')
export class FilesController {
    @Get(':filename')
    getFile(@Param('filename') filename: string, @Res() res: Response) {
        const filePath = join(process.cwd(), 'uploads', filename);

        if (!existsSync(filePath)) {
            throw new NotFoundException('Archivo no encontrado');
        }

        const mimeType = getMimeType(filename);
        const stats = statSync(filePath);

        // Establecer headers correctos
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Length', stats.size);

        // Para PDFs e imágenes, permitir visualización inline
        if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
            res.setHeader('Content-Disposition', buildContentDisposition('inline', filename));
        }

        // Usar stream para mejor rendimiento
        const stream = createReadStream(filePath);
        stream.pipe(res);
    }

    @Get('download/:filename')
    downloadFile(
        @Param('filename') filename: string,
        @Query('name') originalName: string,
        @Res() res: Response
    ) {
        const filePath = join(process.cwd(), 'uploads', filename);

        if (!existsSync(filePath)) {
            throw new NotFoundException('Archivo no encontrado');
        }

        const downloadName = originalName || filename;
        const mimeType = getMimeType(filename);
        const stats = statSync(filePath);

        // Headers para forzar descarga
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Content-Disposition', buildContentDisposition('attachment', downloadName));

        const stream = createReadStream(filePath);
        stream.pipe(res);
    }
}
