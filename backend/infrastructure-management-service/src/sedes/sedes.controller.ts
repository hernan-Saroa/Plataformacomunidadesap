import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SedesService } from './sedes.service.js';
import { CreateSedeDto, CreateBloqueDto, UpdateBloqueDto } from './dto/create-sede.dto.js';
import { Public } from '../auth/public.decorator.js';

@ApiTags('Sedes y Edificios')
@ApiBearerAuth()
@Controller('sedes')
export class SedesController {
  constructor(private readonly sedesService: SedesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar todas las sedes territoriales' })
  @ApiResponse({ status: 200, description: 'Lista de sedes' })
  @ApiQuery({ name: 'soloActivos', required: false, type: Boolean, description: 'true (default) solo activas, false todas' })
  findAllSedes(@Query('soloActivos') soloActivos?: string) {
    const flag = soloActivos === undefined ? true : String(soloActivos).toLowerCase() !== 'false';
    return this.sedesService.findAllSedes(flag);
  }

  @Get('bloques')
  @Public()
  @ApiOperation({ summary: 'Listar todos los bloques/edificios' })
  @ApiQuery({ name: 'soloActivos', required: false, type: Boolean })
  findAllBloques(@Query('soloActivos') soloActivos?: string) {
    const flag = soloActivos === undefined ? true : String(soloActivos).toLowerCase() !== 'false';
    return this.sedesService.findAllBloques(flag);
  }

  @Get(':idSede/bloques')
  @Public()
  @ApiOperation({ summary: 'Listar bloques de una sede especifica por UUID' })
  @ApiQuery({ name: 'soloActivos', required: false, type: Boolean })
  listBloquesPorSede(
    @Param('idSede', new ParseUUIDPipe()) idSede: string,
    @Query('soloActivos') soloActivos?: string,
  ) {
    const flag = soloActivos === undefined ? true : String(soloActivos).toLowerCase() !== 'false';
    return this.sedesService.listBloquesPorSede(idSede, flag);
  }

  @Get('bloques/:idBloque')
  @Public()
  @ApiOperation({ summary: 'Detalle de un bloque por UUID' })
  findBloqueById(@Param('idBloque', new ParseUUIDPipe()) idBloque: string) {
    return this.sedesService.findBloqueById(idBloque);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Obtener detalle de una sede por ID' })
  findSedeById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.sedesService.findSedeById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar una nueva sede' })
  createSede(@Body() dto: CreateSedeDto) {
    return this.sedesService.createSede(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos de una sede' })
  updateSede(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() payload: Partial<CreateSedeDto & { isActivo?: boolean; alcanceUmi?: boolean }>,
  ) {
    return this.sedesService.updateSede(id, payload);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Activar/desactivar sede (cambio isActivo)' })
  toggleSede(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.sedesService.toggleSedeActiva(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar sede (solo si NO tiene bloques ligados)' })
  deleteSede(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.sedesService.deleteSede(id);
  }

  @Post('bloques')
  @ApiOperation({ summary: 'Registrar un nuevo bloque en una sede' })
  createBloque(@Body() dto: CreateBloqueDto) {
    return this.sedesService.createBloque(dto);
  }

  @Patch('bloques/:idBloque')
  @ApiOperation({ summary: 'Actualizar datos de un bloque (codigo/nombre/pisos/descripcion/isActivo)' })
  updateBloque(
    @Param('idBloque', new ParseUUIDPipe()) idBloque: string,
    @Body() payload: Partial<UpdateBloqueDto & { isActivo?: boolean }>,
  ) {
    return this.sedesService.updateBloque(idBloque, payload);
  }

  @Patch('bloques/:idBloque/toggle')
  @ApiOperation({ summary: 'Activar/desactivar un bloque (isActivo)' })
  toggleBloque(@Param('idBloque', new ParseUUIDPipe()) idBloque: string) {
    return this.sedesService.toggleBloqueActivo(idBloque);
  }

  @Delete('bloques/:idBloque')
  @ApiOperation({ summary: 'Eliminar bloque (solo si NO tiene espacios ligados)' })
  deleteBloque(@Param('idBloque', new ParseUUIDPipe()) idBloque: string) {
    return this.sedesService.deleteBloque(idBloque);
  }
}
