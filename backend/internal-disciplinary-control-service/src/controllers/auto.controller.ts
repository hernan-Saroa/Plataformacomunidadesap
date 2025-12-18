import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { AutoService } from '../services/auto.service';
import {
  CreateLegalAutoDto,
  LegalAutoResponseDto,
} from '../dtos/create-legal-auto.dto';
import { ReviewAutoDto } from '../dtos/review-auto.dto';
import { RegisterNotificationDto } from '../dtos/register-notification.dto';
import { LegalAuto } from '../entities/legal-auto.entity';

@ApiTags('Autos Legales')
@Controller('disciplinary-autos')
export class AutoController {
  constructor(private autoService: AutoService) { }

  /**
   * H9: Crear borrador de auto
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear Borrador de Auto',
    description: 'Crea un nuevo borrador de auto legal',
  })
  @ApiResponse({
    status: 201,
    description: 'Auto creado en borrador',
    type: LegalAuto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Proceso no encontrado' })
  async create(@Body() createAutoDto: CreateLegalAutoDto): Promise<LegalAuto> {
    return await this.autoService.create(createAutoDto);
  }

  /**
   * H3: Enviar auto a revisión
   */
  @Patch(':id/send-review')
  @ApiOperation({
    summary: 'Enviar a Revisión',
    description: 'Cambia el estado del auto a REVISION_JEFE',
  })
  @ApiResponse({
    status: 200,
    description: 'Auto enviado a revisión',
    type: LegalAuto,
  })
  @ApiResponse({ status: 400, description: 'Auto no está en estado BORRADOR' })
  @ApiResponse({ status: 404, description: 'Auto no encontrado' })
  async sendToReview(@Param('id') id: string): Promise<LegalAuto> {
    return await this.autoService.sendToReview(id);
  }

  /**
   * H4: Aprobar/Firmar auto (operación de Jefe)
   */
  @Patch(':id/approve')
  @ApiOperation({
    summary: 'Aprobar y Firmar Auto',
    description: 'El Jefe aprueba el auto y genera la firma',
  })
  @ApiResponse({
    status: 200,
    description: 'Auto aprobado y firmado',
    type: LegalAuto,
  })
  @ApiResponse({ status: 400, description: 'Auto no está en REVISION_JEFE' })
  @ApiResponse({ status: 404, description: 'Auto no encontrado' })
  async approve(
    @Param('id') id: string,
    @Body() reviewAutoDto: ReviewAutoDto,
    @Query('aprobadoPorId') aprobadoPorId: string,
  ): Promise<LegalAuto> {
    if (!aprobadoPorId) {
      throw new Error('aprobadoPorId es requerido');
    }
    return await this.autoService.approve(id, reviewAutoDto, aprobadoPorId);
  }

  /**
   * Actualizar contenido de borrador
   */
  @Patch(':id/content')
  @ApiOperation({
    summary: 'Actualizar Contenido',
    description: 'Edita el contenido de un auto en estado BORRADOR',
  })
  @ApiResponse({
    status: 200,
    description: 'Contenido actualizado',
    type: LegalAuto,
  })
  @ApiResponse({ status: 400, description: 'Auto no está en BORRADOR' })
  @ApiResponse({ status: 404, description: 'Auto no encontrado' })
  async updateContent(
    @Param('id') id: string,
    @Body('contenidoHtml') contenidoHtml: string,
  ): Promise<LegalAuto> {
    return await this.autoService.updateContent(id, contenidoHtml);
  }

  /**
   * Obtener todos los autos
   */
  @Get()
  @ApiOperation({
    summary: 'Listar todos los Autos',
    description: 'Retorna todos los autos legales',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de autos',
    type: [LegalAuto],
  })
  async getAll(): Promise<LegalAuto[]> {
    return await this.autoService.findAll();
  }

  /**
   * Obtener autos de un proceso
   */
  @Get('by-process/:processId')
  @ApiOperation({
    summary: 'Autos por Proceso',
    description: 'Retorna todos los autos de un proceso específico',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de autos del proceso',
    type: [LegalAuto],
  })
  async getByProcess(@Param('processId') processId: string): Promise<LegalAuto[]> {
    return await this.autoService.findByProcessId(processId);
  }

  /**
   * Obtener auto por ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener Auto por ID',
    description: 'Retorna un auto específico',
  })
  @ApiResponse({
    status: 200,
    description: 'Auto encontrado',
    type: LegalAuto,
  })
  @ApiResponse({ status: 404, description: 'Auto no encontrado' })
  async getById(@Param('id') id: string): Promise<LegalAuto> {
    return await this.autoService.findById(id);
  }

  /**
   * H5: Registrar Notificación (Secretaría)
   */
  @Patch(':id/notify')
  @ApiOperation({
    summary: 'Registrar Notificación',
    description: 'Registra la fecha y evidencia de la notificación al disciplinado',
  })
  @ApiResponse({
    status: 200,
    description: 'Notificación registrada',
    type: LegalAuto,
  })
  @ApiResponse({ status: 400, description: 'Auto no está FIRMADO' })
  async notify(
    @Param('id') id: string,
    @Body() registerNotificationDto: RegisterNotificationDto,
  ): Promise<LegalAuto> {
    return await this.autoService.registerNotification(id, registerNotificationDto);
  }

  /**
   * Obtener historial de versiones
   */
  @Get(':id/versions')
  @ApiOperation({
    summary: 'Obtener Versiones',
    description: 'Retorna el historial de cambios de un auto',
  })
  async getVersions(@Param('id') id: string) {
    return await this.autoService.getVersions(id);
  }
}
