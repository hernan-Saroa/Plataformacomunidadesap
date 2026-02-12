import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProgramaAnualService } from './programa-anual.service';
import { CreateProgramaAnualDto } from './dto/create-programa-anual.dto';
import { UpdateProgramaAnualDto } from './dto/update-programa-anual.dto';
import { CreateAuditoriaProgramadaDto } from './dto/create-auditoria-programada.dto';
import { UpdateAuditoriaProgramadaDto } from './dto/update-auditoria-programada.dto';
import { AmpliarPlazoDto } from './dto/ampliar-plazo.dto';

@Controller('programa-anual')
export class ProgramaAnualController {
  constructor(private readonly programaAnualService: ProgramaAnualService) {}

  /**
   * GET /programa-anual
   * Lista todos los programas anuales
   */
  @Get()
  findAll(@Query('year') year?: string) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return this.programaAnualService.findAll(yearNum);
  }

  /**
   * GET /programa-anual/:id
   * Obtiene un programa anual por ID
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.programaAnualService.findOne(id);
  }

  /**
   * POST /programa-anual
   * Crea un nuevo programa anual
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateProgramaAnualDto) {
    return this.programaAnualService.create(createDto);
  }

  /**
   * PUT /programa-anual/:id
   * Actualiza un programa anual
   */
  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateProgramaAnualDto) {
    return this.programaAnualService.update(id, updateDto);
  }

  /**
   * DELETE /programa-anual/:id
   * Elimina un programa anual
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.programaAnualService.delete(id);
  }

  /**
   * POST /programa-anual/:id/importar-auditorias
   * Importa auditorías priorizadas desde el Universo de Auditorías
   */
  @Post(':id/importar-auditorias')
  importarAuditorias(
    @Param('id') id: string,
    @Body() body: { procesoIds: string[] },
  ) {
    return this.programaAnualService.importarAuditorias(id, body.procesoIds);
  }

  /**
   * GET /programa-anual/:id/auditorias
   * Obtiene las auditorías de un programa
   */
  @Get(':id/auditorias')
  getAuditoriasPrograma(@Param('id') id: string) {
    return this.programaAnualService.getAuditoriasPrograma(id);
  }

  /**
   * GET /programa-anual/:id/cronograma
   * Obtiene el cronograma de un programa
   */
  @Get(':id/cronograma')
  getCronograma(@Param('id') id: string) {
    return this.programaAnualService.getCronograma(id);
  }

  /**
   * PUT /programa-anual/auditorias/:auditoriaId
   * Actualiza una auditoría programada
   * Solo permite edición si el programa tiene estado aprobado o borrador
   */
  @Put('auditorias/:auditoriaId')
  updateAuditoria(
    @Param('auditoriaId') auditoriaId: string,
    @Body() updateDto: UpdateAuditoriaProgramadaDto,
  ) {
    return this.programaAnualService.updateAuditoria(auditoriaId, updateDto);
  }

  /**
   * DELETE /programa-anual/auditorias/:auditoriaId
   * Elimina una auditoría programada
   * Solo permite eliminación si el programa tiene estado aprobado o borrador
   * Y la auditoría no está en ejecución o completada
   */
  @Delete('auditorias/:auditoriaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAuditoria(@Param('auditoriaId') auditoriaId: string) {
    return this.programaAnualService.deleteAuditoria(auditoriaId);
  }

  /**
   * POST /programa-anual/auditorias/:auditoriaId/ampliar-plazo
   * Amplía el plazo de una auditoría
   */
  @Post('auditorias/:auditoriaId/ampliar-plazo')
  ampliarPlazo(
    @Param('auditoriaId') auditoriaId: string,
    @Body() ampliarDto: AmpliarPlazoDto,
  ) {
    return this.programaAnualService.ampliarPlazo(auditoriaId, ampliarDto);
  }
}

