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
    to: string;
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
        @Query('search') search?: string,
    ): Promise<CorreoJuridico[]> {
        const filters: EmailFilters = {};

        if (tipo) filters.tipo = tipo;
        if (leido !== undefined) filters.leido = leido === 'true';
        if (urgente !== undefined) filters.urgente = urgente === 'true';
        if (archivado !== undefined) filters.archivado = archivado === 'true';
        if (search) filters.search = search;

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
     * Send email via Microsoft Graph
     */
    @Post('send')
    @HttpCode(HttpStatus.OK)
    async sendEmail(@Body() dto: SendEmailDto): Promise<{ success: boolean }> {
        const success = await this.correosService.sendEmail(dto);
        return { success };
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

        // Set headers for file download
        res.setHeader('Content-Type', attachment.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${attachment.name}"`);
        res.setHeader('Content-Length', buffer.length); // Use actual buffer length

        res.send(buffer);
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
     * Trigger Batch Backfill for unclassified emails
     */
    @Post('batch-classify')
    @HttpCode(HttpStatus.OK)
    async batchClassify(@Body() body: { limit?: number }): Promise<{ processed: number; updated: number }> {
        return this.correosService.batchClassifyBackfill(body.limit || 50);
    }
}


