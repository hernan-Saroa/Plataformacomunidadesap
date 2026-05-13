import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Query,
    Body,
    HttpCode,
    HttpStatus,
    Res,
} from '@nestjs/common';
import { CorreosJuridicosService } from '../services/correos-juridicos.service';
import type { EmailFilters } from '../services/correos-juridicos.service';
import { CorreoJuridico } from '../entities/correo-juridico.entity';

// DTO as class for decorator compatibility
export class SendEmailDto {
    to: string | string[];
    cc?: string[];
    subject: string;
    body: string;
    attachments?: { name: string; contentBytes: string; contentType: string }[];
}

@Controller('correos')
export class CorreosJuridicosController {
    constructor(private readonly correosService: CorreosJuridicosService) { }

    /**
     * Trigger manual sync from Microsoft Graph
     */
    @Post('sync')
    @HttpCode(HttpStatus.OK)
    async sync(@Body() body: { nextLink?: string }): Promise<{ synced: number; errors: number; total: number; nextLink: string | null }> {
        return this.correosService.syncInbox(body.nextLink);
    }

    /**
     * Reclassify ALL emails with updated heuristics
     */
    @Post('reclassify-all')
    @HttpCode(HttpStatus.OK)
    async reclassifyAll(): Promise<{ processed: number; updated: number; unchanged: number }> {
        return this.correosService.reclassifyAll();
    }

    /**
     * Test Microsoft Graph connection
     */
    @Get('test-connection')
    async testConnection(): Promise<{ success: boolean; message: string }> {
        return this.correosService.testConnection();
    }

    /**
     * Get all emails with filters
     */
    @Get()
    async getAll(
        @Query('tipo') tipo?: string,
        @Query('leido') leido?: string,
        @Query('urgente') urgente?: string,
        @Query('archivado') archivado?: string,
        @Query('direccion') direccion?: string,
        @Query('search') search?: string,
        @Query('expedienteId') expedienteId?: string,
    ): Promise<CorreoJuridico[]> {
        const filters: EmailFilters = {};

        if (tipo) filters.tipo = tipo;
        if (leido !== undefined) filters.leido = leido === 'true';
        if (urgente !== undefined) filters.urgente = urgente === 'true';
        if (archivado !== undefined) filters.archivado = archivado === 'true';
        if (direccion) filters.direccion = direccion;
        if (search) filters.search = search;
        if (expedienteId) filters.expedienteId = expedienteId;

        return this.correosService.getAll(filters);
    }

    /**
     * Get single email with full body
     */
    @Get(':id')
    async getById(@Param('id') id: string): Promise<CorreoJuridico> {
        return this.correosService.getById(id);
    }

    /**
     * Get email history / traceability
     */
    @Get(':id/historial')
    async getHistorial(@Param('id') id: string) {
        return this.correosService.getHistorial(id);
    }

    /**
     * Mark email as read
     */
    @Patch(':id/read')
    async markAsRead(@Param('id') id: string): Promise<CorreoJuridico> {
        return this.correosService.markAsRead(id);
    }

    /**
     * Archive email
     */
    @Patch(':id/archive')
    async archive(@Param('id') id: string): Promise<CorreoJuridico> {
        return this.correosService.archive(id);
    }

    /**
     * Unarchive email - restore to original location
     */
    @Patch(':id/unarchive')
    async unarchive(@Param('id') id: string): Promise<CorreoJuridico> {
        return this.correosService.unarchive(id);
    }

    /**
     * Send email via Microsoft Graph
     */
    @Post('send')
    @HttpCode(HttpStatus.OK)
    async sendEmail(@Body() dto: SendEmailDto): Promise<{ success: boolean }> {
        const result = await this.correosService.sendEmail(dto);
        return { success: result.success };
    }

    /**
     * Get attachments for an email
     */
    @Get(':id/adjuntos')
    async getAttachments(@Param('id') id: string) {
        return this.correosService.getAttachments(id);
    }

    /**
     * Download a specific attachment
     * Returns the file as binary data
     */
    @Get('adjuntos/:adjuntoId/download')
    async downloadAttachment(
        @Param('adjuntoId') adjuntoId: string,
        @Res() res: any,
    ) {
        const attachment = await this.correosService.downloadAttachment(adjuntoId);

        // Convert base64 to buffer
        const buffer = Buffer.from(attachment.contentBytes, 'base64');

        // Determinar si es un archivo visualizable en el navegador (PDF, imágenes)
        const isViewable = attachment.contentType === 'application/pdf' || attachment.contentType.startsWith('image/');
        const disposition = isViewable ? 'inline' : 'attachment';

        // Set headers for file download/view
        res.setHeader('Content-Type', attachment.contentType);
        res.setHeader('Content-Disposition', `${disposition}; filename="${attachment.name}"`);
        res.setHeader('Content-Length', buffer.length); // Use actual buffer length

        res.send(buffer);
    }

    /**
     * Download a local sent attachment (for heavy attachments)
     */
    @Get('adjuntos/local/:filename/download')
    async downloadLocalAttachment(
        @Param('filename') filename: string,
        @Res() res: any,
    ) {
        const fs = require('fs');
        const path = require('path');
        const filepath = path.join(process.cwd(), 'uploads', 'adjuntos', filename);

        if (!fs.existsSync(filepath)) {
            return res.status(HttpStatus.NOT_FOUND).json({ message: 'Attachment not found' });
        }

        const ext = path.extname(filename).toLowerCase();
        const MIME_TYPES: Record<string, string> = {
            '.pdf': 'application/pdf',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        };

        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const isViewable = contentType === 'application/pdf' || contentType.startsWith('image/');
        const disposition = isViewable ? 'inline' : 'attachment';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
        
        res.sendFile(filepath);
    }

    /**
     * Export email to ZIP
     */
    @Get(':id/export/zip')
    async exportZip(@Param('id') id: string, @Res() res: any) {
        const archive = await this.correosService.exportCorreoToZip(id);
        res.set({
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="correo_${id}.zip"`,
        });
        archive.pipe(res);
    }
    /**
     * Update classification manually (Feedback Loop)
     */
    @Patch(':id/classify')
    async updateClassification(
        @Param('id') id: string,
        @Body() body: { category: string }
    ): Promise<CorreoJuridico> {
        return this.correosService.updateClassification(id, body.category);
    }

    /**
     * Link email to legal process
     */
    @Patch(':id/link-process')
    async linkProcess(
        @Param('id') id: string,
        @Body() body: { expedienteId: string; targetModule?: string }
    ): Promise<CorreoJuridico> {
        return this.correosService.linkToProcess(id, body.expedienteId, body.targetModule);
    }

    /**
     * Reply to an email — maintains thread via Graph API
     */
    @Post(':id/reply')
    @HttpCode(HttpStatus.OK)
    async replyEmail(
        @Param('id') id: string,
        @Body() body: { body: string; attachments?: { name: string; contentBytes: string; contentType: string }[] }
    ): Promise<{ success: boolean }> {
        const result = await this.correosService.replyEmail(id, body.body, body.attachments);
        return { success: result.success };
    }

    /**
     * Forward an email — maintains thread via Graph API natively.
     * Original attachments are included automatically by Graph.
     * Additional attachments uploaded by the user are appended via sendMail.
     */
    @Post(':id/forward')
    @HttpCode(HttpStatus.OK)
    async forwardEmail(
        @Param('id') id: string,
        @Body() body: {
            to: string;
            comment: string;
            attachments?: { name: string; contentBytes: string; contentType: string }[];
        }
    ): Promise<{ success: boolean; correo?: CorreoJuridico }> {
        const result = await this.correosService.forwardEmail(
            id,
            body.to || '',
            body.comment || '',
            body.attachments,
        );
        return { success: result.success, correo: result.correo };
    }

    /**
     * Trigger Batch Backfill for unclassified emails
     */
    @Post('batch-classify')
    @HttpCode(HttpStatus.OK)
    async batchClassify(@Body() body: { limit?: number }): Promise<{ processed: number; updated: number }> {
        return this.correosService.batchClassifyBackfill(body.limit || 50);
    }
}


