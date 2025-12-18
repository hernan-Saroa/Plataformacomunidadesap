import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { HallazgosService } from './hallazgos.service';
import { CreateHallazgoDto } from './dto/create-hallazgo.dto';
import { UpdateHallazgoDto } from './dto/update-hallazgo.dto';
import { HallazgoCategoria } from './entities/hallazgo.entity';

@Controller('hallazgos')
export class HallazgosController {
  constructor(private readonly hallazgosService: HallazgosService) {}

  /**
   * GET /hallazgos
   * Lista de hallazgos con filtros opcionales
   */
  @Get()
  findAll(
    @Query('categoria') categoria?: string,
    @Query('estado') estado?: string,
    @Query('area') area?: string,
  ) {
    return this.hallazgosService.findAll({ categoria, estado, area });
  }

  /**
   * GET /hallazgos/categoria/criticos
   */
  @Get('categoria/criticos')
  getCriticos() {
    return this.hallazgosService.findByCategoria(HallazgoCategoria.CRITICO);
  }

  /**
   * GET /hallazgos/categoria/controversias
   */
  @Get('categoria/controversias')
  getControversias() {
    return this.hallazgosService.findByCategoria(HallazgoCategoria.CONTROVERSIA);
  }

  /**
   * GET /hallazgos/categoria/borradores
   */
  @Get('categoria/borradores')
  getBorradores() {
    return this.hallazgosService.findByCategoria(HallazgoCategoria.BORRADOR);
  }

  /**
   * GET /hallazgos/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.hallazgosService.findOne(id);
  }

  /**
   * POST /hallazgos
   */
  @Post()
  create(@Body() createDto: CreateHallazgoDto) {
    return this.hallazgosService.create(createDto);
  }

  /**
   * PUT /hallazgos/:id
   */
  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateHallazgoDto) {
    return this.hallazgosService.update(id, updateDto);
  }

  /**
   * DELETE /hallazgos/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.hallazgosService.delete(id);
  }
}

