import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TrdService } from './trd.service';
import {
  CreateTrdDto,
  UpdateTrdDto,
  CreateTrdSerieSubserieDto,
  UpdateTrdSerieSubserieDto,
} from './dto/trd.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('trd')
export class TrdController {
  constructor(private readonly trdService: TrdService) {}

  /**
   * GET /trd
   * Lista todas las versiones de TRD/TVD con sus series y subseries
   */
  @Public()
  @Get()
  async findAll() {
    return this.trdService.findAll();
  }

  /**
   * GET /trd/vigente?modulo=control-disciplinario&fecha=2026-05-10
   * Obtiene la TRD vigente o la que aplica según fecha histórica para expedientes y documentos
   */
  @Public()
  @Get('vigente')
  async getVigente(
    @Query('modulo') modulo?: string,
    @Query('fecha') fecha?: string,
  ) {
    return this.trdService.getVigente(modulo, fecha);
  }

  /**
   * GET /trd/:id
   * Obtiene el detalle de una versión de TRD por ID
   */
  @Public()
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.trdService.findById(id);
  }

  /**
   * POST /trd
   * Crear nueva versión de TRD/TVD
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateTrdDto) {
    return this.trdService.create(dto);
  }

  /**
   * PUT /trd/:id
   * Actualizar una versión de TRD
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTrdDto,
  ) {
    return this.trdService.update(id, dto);
  }

  /**
   * PATCH /trd/:id/toggle
   * Activar o desactivar una versión de TRD
   */
  @Patch(':id/toggle')
  @HttpCode(HttpStatus.OK)
  async toggleActivo(@Param('id', ParseIntPipe) id: number) {
    return this.trdService.toggleActivo(id);
  }

  /**
   * POST /trd/:id/set-vigente
   * Establecer una TRD como la vigente oficial
   */
  @Post(':id/set-vigente')
  @HttpCode(HttpStatus.OK)
  async setVigente(@Param('id', ParseIntPipe) id: number) {
    return this.trdService.setVigente(id);
  }

  /**
   * DELETE /trd/:id
   * Eliminar una versión de TRD (si no es la vigente)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.trdService.delete(id);
  }

  // ==========================================================================
  // ENDPOINTS DE SERIES Y SUBSERIES
  // ==========================================================================

  /**
   * POST /trd/:id/series
   * Agregar serie y subserie a una TRD
   */
  @Post(':id/series')
  @HttpCode(HttpStatus.CREATED)
  async addSerie(
    @Param('id', ParseIntPipe) trdId: number,
    @Body() dto: CreateTrdSerieSubserieDto,
  ) {
    return this.trdService.addSerie(trdId, dto);
  }

  /**
   * PUT /trd/series/:serieId
   * Actualizar una serie/subserie
   */
  @Put('series/:serieId')
  @HttpCode(HttpStatus.OK)
  async updateSerie(
    @Param('serieId', ParseIntPipe) serieId: number,
    @Body() dto: UpdateTrdSerieSubserieDto,
  ) {
    return this.trdService.updateSerie(serieId, dto);
  }

  /**
   * PATCH /trd/series/:serieId/toggle
   * Activar / desactivar una serie/subserie
   */
  @Patch('series/:serieId/toggle')
  @HttpCode(HttpStatus.OK)
  async toggleSerieActivo(@Param('serieId', ParseIntPipe) serieId: number) {
    return this.trdService.toggleSerieActivo(serieId);
  }

  /**
   * DELETE /trd/series/:serieId
   * Eliminar una serie/subserie
   */
  @Delete('series/:serieId')
  @HttpCode(HttpStatus.OK)
  async deleteSerie(@Param('serieId', ParseIntPipe) serieId: number) {
    return this.trdService.deleteSerie(serieId);
  }
}
