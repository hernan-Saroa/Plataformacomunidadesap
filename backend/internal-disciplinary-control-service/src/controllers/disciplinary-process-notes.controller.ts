import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateDisciplinaryProcessNoteDto } from '../dtos/disciplinary-process-note.dto';
import { DisciplinaryProcessNote } from '../entities/disciplinary-process-note.entity';
import { DisciplinaryProcessNotesService } from '../services/disciplinary-process-notes.service';

@ApiTags('Notas Proceso Disciplinario')
@Controller('disciplinary-processes/:id/notes')
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
