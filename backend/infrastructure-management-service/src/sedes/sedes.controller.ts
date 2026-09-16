import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SedesService } from './sedes.service.js';
import { CreateSedeDto, CreateBloqueDto } from './dto/create-sede.dto.js';
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
  findAllSedes() {
    return this.sedesService.findAllSedes();
  }

  @Get('bloques')
  @Public()
  @ApiOperation({ summary: 'Listar todos los bloques/edificios' })
  findAllBloques() {
    return this.sedesService.findAllBloques();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Obtener detalle de una sede por ID' })
  findSedeById(@Param('id') id: string) {
    return this.sedesService.findSedeById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar una nueva sede' })
  createSede(@Body() dto: CreateSedeDto) {
    return this.sedesService.createSede(dto);
  }

  @Post('bloques')
  @ApiOperation({ summary: 'Registrar un nuevo bloque en una sede' })
  createBloque(@Body() dto: CreateBloqueDto) {
    return this.sedesService.createBloque(dto);
  }
}
