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
    Req,
} from '@nestjs/common';
import { CorreosJuridicosService } from '../services/correos-juridicos.service';
import type { EmailFilters } from '../services/correos-juridicos.service';
import { CorreoJuridico } from '../entities/correo-juridico.entity';

// DTO as class for decorator compatibility (must be a class, not imported interface)
export class SendEmailDto {
    to: string | string[];
    cc?: string[];
    bcc?: string[]; // Copia Oculta (CCO) — destinatarios no visibles para los demás
    subject: string;
    body: string;
    attachments?: { name: string; contentBytes: string; contentType: string }[];
    requestReadReceipt?: boolean;
    requestDeliveryReceipt?: boolean;
    buzon?: string; // JUDICIAL | CORREOS — define la cuenta remitente (según el tab)
}

@Controller('correos')
export class CorreosJuridicosController {
    constructor(private readonly correosService: CorreosJuridicosService) { }

    /**
     * Trigger manual sync from Microsoft Graph
     */
    @Post('sync')
    @HttpCode(HttpStatus.OK)
    async sync(@Body() body: { nextLink?: string; buzon?: string }): Promise<{ synced: number; errors: number; total: number; nextLink: string | null }> {
        // buzon opcional: 'JUDICIAL' (default) | 'CORREOS'. El frontend puede sincronizar
        // cada buzón por separado; si la cuenta del buzón no existe, devuelve 0 sin error.
        return this.correosService.syncInbox(body.nextLink, body.buzon || 'JUDICIAL');
    }

    /** Buzones de correo configurados (para que el frontend sepa cuáles sincronizar). */
    @Get('mailboxes')
    getMailboxes(): Array<{ buzon: string; address: string }> {
        return this.correosService.getMailboxes();
    }

    /**
     * Reclassify ALL emails with updated heuristics
     */
    @Post('reclassify-all')
    @HttpCode(HttpStatus.OK)
    async reclassifyAll(): Promise<{ processed: number; updated: number; unchanged: number }> {
        return this.correosService.reclassifyAll();
    }

    // ===================================================================
    //  TRACKING ENDPOINTS — MUST be before :id routes to avoid conflicts
    // ===================================================================

    /**
     * Tracking Pixel — registra apertura de correo por destinatario externo.
     * Retorna una imagen GIF 1x1 transparente.
     */
    @Get('track/open/:token')
    async trackOpen(
        @Param('token') token: string,
        @Res() res: any,
        @Query('_') _cacheBust?: string,
    ) {
        const ip = res.req?.headers?.['x-forwarded-for'] || res.req?.socket?.remoteAddress || 'unknown';
        const userAgent = res.req?.headers?.['user-agent'] || 'unknown';

        this.correosService.processTrackingPixel(token, ip, userAgent).catch(() => {});

        const pixel = Buffer.from(
            'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            'base64',
        );

        res.setHeader('Content-Type', 'image/gif');
        res.setHeader('Content-Length', pixel.length);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.send(pixel);
    }

    /**
     * Tracked Document Download — registra apertura de documento y sirve el archivo.
     */
    @Get('track/download/:token')
    async trackDownload(
        @Param('token') token: string,
        @Res() res: any,
    ) {
        const ip = res.req?.headers?.['x-forwarded-for'] || res.req?.socket?.remoteAddress || 'unknown';
        const userAgent = res.req?.headers?.['user-agent'] || 'unknown';

        try {
            const result = await this.correosService.processTrackingDownload(token, ip, userAgent);

            if (!result) {
                return res.status(HttpStatus.NOT_FOUND).json({ message: 'Documento no encontrado o enlace expirado' });
            }

            const buffer = Buffer.from(result.contentBytes, 'base64');
            const isViewable = result.contentType === 'application/pdf' || result.contentType?.startsWith('image/');
            const disposition = isViewable ? 'inline' : 'attachment';

            res.setHeader('Content-Type', result.contentType || 'application/octet-stream');
            res.setHeader('Content-Disposition', `${disposition}; filename="${result.name}"`);
            res.setHeader('Content-Length', buffer.length);
            res.send(buffer);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error al descargar el documento' });
        }
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
        @Query('buzon') buzon?: string,
    ): Promise<CorreoJuridico[]> {
        const filters: EmailFilters = {};

        if (tipo) filters.tipo = tipo;
        if (leido !== undefined) filters.leido = leido === 'true';
        if (urgente !== undefined) filters.urgente = urgente === 'true';
        if (archivado !== undefined) filters.archivado = archivado === 'true';
        if (direccion) filters.direccion = direccion;
        if (search) filters.search = search;
        if (expedienteId) filters.expedienteId = expedienteId;
        if (buzon) filters.buzon = buzon;

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
    async sendEmail(@Body() dto: SendEmailDto, @Req() req: any): Promise<{ success: boolean }> {
        const result = await this.correosService.sendEmail(dto, req);
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
     * Derivar comunicación a un proceso RECIÉN CREADO desde Clasificación IA.
     * Registra la comunicación de origen en el proceso y copia sus adjuntos a Documentos.
     */
    @Patch(':id/derivar-nuevo-proceso')
    async derivarNuevoProceso(
        @Param('id') id: string,
        @Body() body: { procesoId: string; targetModule?: string }
    ): Promise<CorreoJuridico> {
        return this.correosService.derivarANuevoProceso(id, body.procesoId, body.targetModule);
    }

    /**
     * Reply to an email — maintains thread via Graph API
     */
    @Post(':id/reply')
    @HttpCode(HttpStatus.OK)
    async replyEmail(
        @Param('id') id: string,
        @Body() body: { body: string; attachments?: { name: string; contentBytes: string; contentType: string }[] },
        @Req() req: any,
    ): Promise<{ success: boolean }> {
        const result = await this.correosService.replyEmail(id, body.body, body.attachments, req);
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
            to: string | string[];
            comment: string;
            attachments?: { name: string; contentBytes: string; contentType: string }[];
            cc?: string[];
            bcc?: string[];
        },
        @Req() req: any,
    ): Promise<{ success: boolean; correo?: CorreoJuridico }> {
        const result = await this.correosService.forwardEmail(
            id,
            body.to || '',
            body.comment || '',
            body.attachments,
            req,
            body.cc,
            body.bcc,
        );
        return { success: result.success, correo: result.correo };
    }
}
