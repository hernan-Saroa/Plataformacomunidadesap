import { Controller, Get, Query } from '@nestjs/common';
import { ProgramasService } from './programas.service';
import type { ProgramasFiltroDto } from './programas.service';

@Controller('programas-academicos')
export class ProgramasController {
  constructor(private readonly programasService: ProgramasService) {}

  @Get()
  listar(@Query() query: ProgramasFiltroDto) {
    return this.programasService.listarProgramas(query);
  }
}
