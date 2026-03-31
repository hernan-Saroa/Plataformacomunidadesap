import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Put,
  Query,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { NewsService } from '../services/news.service';
import { CreateDisciplinaryNewsDto } from '../dtos/create-disciplinary-news.dto';
import { ReturnNewsDto } from '../dtos/return-news.dto';
import { UpdateNewsKanbanDto } from '../dtos/update-news-kanban.dto';
import { DisciplinaryNews } from '../entities/disciplinary-news.entity';
import * as path from 'path';

interface FileData {
  buffer: Buffer;
  originalname: string;
}

@ApiTags('Noticias Disciplinarias')
@Controller('disciplinary-news')
export class NewsController {
  constructor(private newsService: NewsService) { }

  /**
   * H1: Radicar una nueva noticia disciplinaria con soportes
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiOperation({
    summary: 'Radicar Noticia Disciplinaria',
    description: 'Crea una nueva noticia y genera automáticamente el radicado',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Noticia radicada exitosamente',
    type: DisciplinaryNews,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(
    @Body() createNewsDto: CreateDisciplinaryNewsDto,
    @UploadedFiles() files?: FileData[],
  ): Promise<DisciplinaryNews> {
    // Validaciones de archivos
    if (files && files.length > 0) {
      for (const file of files) {
        // Validar tamaño máximo (200MB)
        const maxSize = 200 * 1024 * 1024; // 200MB en bytes
        if (file.buffer.length > maxSize) {
          throw new BadRequestException(
            `El archivo ${file.originalname} excede el tamaño máximo permitido de 200MB`,
          );
        }

        // Validar tipo de archivo (no permitir .exe)
        const fileExtension = path.extname(file.originalname).toLowerCase();
        if (fileExtension === '.exe') {
          throw new BadRequestException(
            `No se permiten archivos ejecutables (.exe). El archivo ${file.originalname} fue rechazado.`,
          );
        }
      }
    }

    return await this.newsService.create(createNewsDto, files);
  }

  /**
   * H2: Listar noticias pendientes de asignación
   */
  @Get('pending-assignment')
  @ApiOperation({
    summary: 'Listar Noticias Pendientes',
    description: 'Retorna las noticias en estado RADICADA para asignación',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de noticias pendientes',
    type: [DisciplinaryNews],
  })
  async getPendingAssignment(): Promise<DisciplinaryNews[]> {
    return await this.newsService.findPendingAssignment();
  }

  /**
   * H3: Listar noticias del profesional autenticado
   * Retorna las noticias asociadas a los procesos asignados al profesional
   */
  @Get('my-news')
  @ApiOperation({
    summary: 'Mis Noticias',
    description: 'Retorna las noticias asociadas a los procesos del profesional autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de noticias del profesional',
    type: [DisciplinaryNews],
  })
  async getMyNews(
    @Query('profesionalId') profesionalId: string,
  ): Promise<DisciplinaryNews[]> {
    if (!profesionalId) {
      throw new BadRequestException('profesionalId es requerido');
    }
    return await this.newsService.findByProfessionalId(profesionalId);
  }

  /**
   * Obtener todas las noticias
   */
  @Get()
  @ApiOperation({
    summary: 'Listar todas las Noticias',
    description: 'Retorna todas las noticias disciplinarias',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de todas las noticias',
    type: [DisciplinaryNews],
  })
  async getAll(): Promise<DisciplinaryNews[]> {
    return await this.newsService.findAll();
  }

  /**
   * Obtener noticia por ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener Noticia por ID',
    description: 'Retorna una noticia específica',
  })
  @ApiResponse({
    status: 200,
    description: 'Noticia encontrada',
    type: DisciplinaryNews,
  })
  @ApiResponse({ status: 404, description: 'Noticia no encontrada' })
  async getById(@Param('id') id: string): Promise<DisciplinaryNews> {
    return await this.newsService.findById(id);
  }

  /**
   * Actualizar datos de una noticia (edición por Profesional)
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Editar Noticia Disciplinaria',
    description: 'Actualiza los datos de una noticia y registra el cambio en el historial de auditoría',
  })
  @ApiResponse({ status: 200, description: 'Noticia actualizada', type: DisciplinaryNews })
  @ApiResponse({ status: 404, description: 'Noticia no encontrada' })
  async update(
    @Param('id') id: string,
    @Body() body: any,
  ): Promise<DisciplinaryNews> {
    return await this.newsService.update(id, body);
  }

  /**
   * Devolver Noticia
   */
  @Patch(':id/return')
  @ApiOperation({
    summary: 'Devolver Noticia',
    description: 'Cambia el estado de la noticia a DEVUELTA y guarda observaciones',
  })
  @ApiResponse({
    status: 200,
    description: 'Noticia devuelta',
    type: DisciplinaryNews,
  })
  @ApiResponse({ status: 404, description: 'Noticia no encontrada' })
  async returnNews(
    @Param('id') id: string,
    @Body() returnNewsDto: ReturnNewsDto,
  ): Promise<DisciplinaryNews> {
    return await this.newsService.returnNews(id, returnNewsDto);
  }

  /**
   * Cambiar Estado de Noticia
   */
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Cambiar Estado de Noticia',
    description: 'Actualiza el estado de una noticia (ej: RADICADA -> EN_VALORACION)',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado',
    type: DisciplinaryNews,
  })
  @ApiResponse({ status: 404, description: 'Noticia no encontrada' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ): Promise<DisciplinaryNews> {
    return await this.newsService.updateStatus(id, body.status as any);
  }

  /**
   * Actualizar etapa Kanban de una noticia
   */
  @Patch(':id/kanban')
  @ApiOperation({
    summary: 'Actualizar Kanban de Noticia',
    description: 'Actualiza la etapa Kanban para persistir la posicion en el tablero',
  })
  @ApiResponse({
    status: 200,
    description: 'Kanban actualizado',
    type: DisciplinaryNews,
  })
  @ApiResponse({ status: 404, description: 'Noticia no encontrada' })
  async updateKanban(
    @Param('id') id: string,
    @Body() body: UpdateNewsKanbanDto,
  ): Promise<DisciplinaryNews> {
    return await this.newsService.updateKanbanStage(id, body.kanbanStage);
  }

  /**
   * Eliminar noticia
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar Noticia',
    description: 'Elimina una noticia y sus archivos asociados',
  })
  @ApiResponse({ status: 204, description: 'Noticia eliminada' })
  @ApiResponse({ status: 404, description: 'Noticia no encontrada' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.newsService.delete(id);
  }

  /**
   * Archivar noticia
   */
  @Patch(':id/archive')
  @ApiOperation({
    summary: 'Archivar Noticia',
    description: 'Archiva una noticia permanentemente',
  })
  @ApiResponse({
    status: 200,
    description: 'Noticia archivada',
    type: DisciplinaryNews,
  })
  @ApiResponse({ status: 404, description: 'Noticia no encontrada' })
  async archive(
    @Param('id') id: string,
    @Body() body: { reason: string },
  ): Promise<DisciplinaryNews> {
    return await this.newsService.archive(id, body.reason);
  }

  @Patch(':id/restore')
  @ApiOperation({
    summary: 'Restaurar Noticia',
    description: 'Restaura una noticia archivada al flujo activo (estado RADICADA)',
  })
  @ApiResponse({
    status: 200,
    description: 'Noticia restaurada',
    type: DisciplinaryNews,
  })
  @ApiResponse({ status: 404, description: 'Noticia no encontrada' })
  async restore(@Param('id') id: string): Promise<DisciplinaryNews> {
    return await this.newsService.restore(id);
  }

  /**
   * Asociar noticia a un proceso existente
   */
  @Patch(':id/associate-process')
  @ApiOperation({
    summary: 'Asociar Noticia a Proceso',
    description: 'Asocia una noticia disciplinaria a un proceso existente',
  })
  @ApiResponse({
    status: 200,
    description: 'Noticia asociada exitosamente',
    type: DisciplinaryNews,
  })
  @ApiResponse({ status: 404, description: 'Noticia o proceso no encontrado' })
  async associateProcess(
    @Param('id') id: string,
    @Body() body: { procesoDestinoId: string; justificacion: string },
  ): Promise<DisciplinaryNews> {
    return await this.newsService.associateNewsToProcess(
      id,
      body.procesoDestinoId,
      body.justificacion,
    );
  }
}
