import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateDisciplinaryProcessNoteDto } from '../dtos/disciplinary-process-note.dto';
import { DisciplinaryProcessNote } from '../entities/disciplinary-process-note.entity';
import { DisciplinaryProcessNotesService } from '../services/disciplinary-process-notes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DISCIPLINARY_MODULE_ACCESS } from '../auth/authorization.constants';

@ApiTags('Notas Proceso Disciplinario')
@Controller('disciplinary-processes/:id/notes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', DISCIPLINARY_MODULE_ACCESS)
export class DisciplinaryProcessNotesController {
  constructor(
    private readonly notesService: DisciplinaryProcessNotesService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar notas internas de un proceso disciplinario',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de notas internas del proceso',
    type: DisciplinaryProcessNote,
    isArray: true,
  })
  async list(@Param('id') processId: string): Promise<DisciplinaryProcessNote[]> {
    return this.notesService.listByProcess(processId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear una nota interna para un proceso disciplinario',
  })
  @ApiResponse({
    status: 201,
    description: 'Nota creada exitosamente',
    type: DisciplinaryProcessNote,
  })
  async create(
    @Param('id') processId: string,
    @Body() dto: CreateDisciplinaryProcessNoteDto,
  ): Promise<DisciplinaryProcessNote> {
    return this.notesService.create(processId, dto);
  }

  @Delete(':noteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar una nota interna de un proceso disciplinario',
  })
  @ApiResponse({
    status: 204,
    description: 'Nota eliminada exitosamente',
  })
  async remove(
    @Param('id') processId: string,
    @Param('noteId') noteId: string,
  ): Promise<void> {
    return this.notesService.remove(processId, noteId);
  }
}
