import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    MaxFileSizeValidator,
    Get,
    Param,
    Res,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

@Controller('files')
export class FilesController {
    @Post('upload')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (req, file, cb) => {
                    const uploadPath = './uploads';
                    if (!existsSync(uploadPath)) {
                        mkdirSync(uploadPath);
                    }
                    cb(null, uploadPath);
                },
                filename: (req, file, cb) => {
                    const randomName = Array(32)
                        .fill(null)
                        .map(() => Math.round(Math.random() * 16).toString(16))
                        .join('');
                    cb(null, `${randomName}${extname(file.originalname)}`);
                },
            }),
            fileFilter: (req, file, cb) => {
                const allowedMimes = [
                    'application/pdf',
                    'image/jpeg',
                    'image/png',
                    'image/jpg',
                    // Word document types
                    'application/msword',  // .doc
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  // .docx
                ];
                const allowedExts = /\.(pdf|jpg|jpeg|png|doc|docx)$/i;
                if (allowedMimes.includes(file.mimetype) || allowedExts.test(file.originalname)) {
                    cb(null, true);
                    return;
                }
                cb(new HttpException('Tipo de archivo no permitido', HttpStatus.BAD_REQUEST), false);
            },
        }),
    )
    uploadFile(
        @UploadedFile(new ParseFilePipe({
            validators: [
                new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
            ],
        })) file: Express.Multer.File
    ) {
        if (!file) {
            throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
        }
        return {
            filename: file.filename,
            originalname: file.originalname,
            path: file.path,
            url: `/files/${file.filename}`, // URL relativa para acceso
        };
    }

    @Get(':filename')
    serveFile(@Param('filename') filename: string, @Res() res: Response) {
        // First try in ./uploads (for files uploaded via /files/upload endpoint)
        let filePath = join(process.cwd(), 'uploads', filename);
        if (existsSync(filePath)) {
            res.sendFile(filePath);
            return;
        }

        // Then try in ./uploads/expedientes/{radicado}/filename (for news attachments)
        // The filename might come as "ND-2026-001/archivo.pdf" or just "archivo.pdf"
        if (filename.includes('/')) {
            filePath = join(process.cwd(), 'uploads', 'expedientes', filename);
        } else {
            // Try to find file in any expediente folder
            const expedientesDir = join(process.cwd(), 'uploads', 'expedientes');
            if (existsSync(expedientesDir)) {
                const folders = require('fs').readdirSync(expedientesDir);
                for (const folder of folders) {
                    const potentialPath = join(expedientesDir, folder, filename);
                    if (existsSync(potentialPath)) {
                        res.sendFile(potentialPath);
                        return;
                    }
                }
            }
        }

        if (existsSync(filePath)) {
            res.sendFile(filePath);
            return;
        }

        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    /**
     * Serve files from expedientes with full path: /files/expediente/:radicado/:filename
     */
    @Get('expediente/:radicado/:filename')
    serveExpedienteFile(
        @Param('radicado') radicado: string,
        @Param('filename') filename: string,
        @Res() res: Response
    ) {
        const filePath = join(process.cwd(), 'uploads', 'expedientes', radicado, filename);
        if (!existsSync(filePath)) {
            throw new HttpException('File not found', HttpStatus.NOT_FOUND);
        }
        res.sendFile(filePath);
    }
}
