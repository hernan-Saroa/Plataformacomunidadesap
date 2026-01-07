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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CorreosJuridicosService } from '../services/correos-juridicos.service';
import type { EmailFilters } from '../services/correos-juridicos.service';
import { CorreoJuridico } from '../entities/correo-juridico.entity';

// DTO as class for decorator compatibility
export class SendEmailDto {
    to: string;
    subject: string;
    body: string;
}

@ApiTags('Correos Jurídicos')
@Controller('legal/correos')
export class CorreosJuridicosController {
    constructor(private readonly correosService: CorreosJuridicosService) { }

    /**
     * Trigger manual sync from Microsoft Graph
     */
    @Post('sync')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Sincronizar correos',
        description: 'Sincroniza correos desde Microsoft Graph a la base de datos local',
    })
    @ApiResponse({
        status: 200,
        description: 'Sincronización completada',
    })
    async sync(): Promise<{ synced: number; errors: number }> {
        return this.correosService.syncInbox();
    }

    /**
     * Test Microsoft Graph connection
     */
    @Get('test-connection')
    @ApiOperation({
        summary: 'Probar conexión',
        description: 'Verifica la conexión con Microsoft Graph',
    })
    async testConnection(): Promise<{ success: boolean; message: string }> {
        return this.correosService.testConnection();
    }

    /**
     * Get all emails with filters
     */
    @Get()
    @ApiOperation({
        summary: 'Listar correos',
        description: 'Obtiene todos los correos con filtros opcionales',
    })
    @ApiQuery({ name: 'tipo', required: false, enum: ['JUDICIAL', 'CORREO', 'OFICIO'] })
    @ApiQuery({ name: 'leido', required: false, type: Boolean })
    @ApiQuery({ name: 'urgente', required: false, type: Boolean })
    @ApiQuery({ name: 'archivado', required: false, type: Boolean })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiResponse({
        status: 200,
        description: 'Lista de correos',
        type: [CorreoJuridico],
    })
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
    @ApiOperation({
        summary: 'Obtener correo',
        description: 'Obtiene un correo específico con el cuerpo completo',
    })
    @ApiResponse({
        status: 200,
        description: 'Correo encontrado',
        type: CorreoJuridico,
    })
    @ApiResponse({ status: 404, description: 'Correo no encontrado' })
    async getById(@Param('id') id: string): Promise<CorreoJuridico> {
        return this.correosService.getById(id);
    }

    /**
     * Mark email as read
     */
    @Patch(':id/read')
    @ApiOperation({
        summary: 'Marcar como leído',
        description: 'Marca un correo como leído en la BD y en Microsoft Graph',
    })
    @ApiResponse({
        status: 200,
        description: 'Correo marcado como leído',
        type: CorreoJuridico,
    })
    async markAsRead(@Param('id') id: string): Promise<CorreoJuridico> {
        return this.correosService.markAsRead(id);
    }

    /**
     * Archive email
     */
    @Patch(':id/archive')
    @ApiOperation({
        summary: 'Archivar correo',
        description: 'Archiva un correo (solo en BD local)',
    })
    @ApiResponse({
        status: 200,
        description: 'Correo archivado',
        type: CorreoJuridico,
    })
    async archive(@Param('id') id: string): Promise<CorreoJuridico> {
        return this.correosService.archive(id);
    }

    /**
     * Send email via Microsoft Graph
     */
    @Post('send')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Enviar correo',
        description: 'Envía un correo electrónico via Microsoft Graph. El remitente siempre será desarrollo.ccd@esap.edu.co',
    })
    @ApiResponse({
        status: 200,
        description: 'Correo enviado exitosamente',
    })
    async sendEmail(@Body() dto: SendEmailDto): Promise<{ success: boolean }> {
        const success = await this.correosService.sendEmail(dto);
        return { success };
    }
}
