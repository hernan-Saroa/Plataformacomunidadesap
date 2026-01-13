import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { InformesLeyService } from './informes-ley.service';
import { InformeGeneratorService } from './services/informe-generator.service';
import { PlantillasService } from './services/plantillas.service';
import { CreateInformeLeyDto } from './dto/create-informe-ley.dto';
import { UpdateInformeLeyDto } from './dto/update-informe-ley.dto';
import { CreateEntregaDto } from './dto/create-entrega.dto';
import { UpdateEntregaDto } from './dto/update-entrega.dto';
import { GenerarInformeDto } from './dto/generar-informe.dto';

@Controller('informes-ley')
export class InformesLeyController {
  constructor(
    private readonly informesLeyService: InformesLeyService,
    private readonly informeGeneratorService: InformeGeneratorService,
    private readonly plantillasService: PlantillasService,
  ) {}

  // ==================== CRUD INFORMES ====================

  @Get()
  findAll(
    @Query('categoria') categoria?: string,
    @Query('periodicidad') periodicidad?: string,
    @Query('activo') activo?: string,
    @Query('search') search?: string,
  ) {
    return this.informesLeyService.findAll({
      categoria,
      periodicidad,
      activo: activo === 'true' ? true : activo === 'false' ? false : undefined,
      search,
    });
  }

  @Get('estadisticas')
  getEstadisticas() {
    return this.informesLeyService.getEstadisticas();
  }

  @Get('estadisticas/categoria')
  getEstadisticasPorCategoria() {
    return this.informesLeyService.getEstadisticasPorCategoria();
  }

  @Get('estadisticas/periodicidad')
  getEstadisticasPorPeriodicidad() {
    return this.informesLeyService.getEstadisticasPorPeriodicidad();
  }

  @Get('calendario/:year')
  getCalendarioAnual(@Param('year') year: string) {
    return this.informesLeyService.getCalendarioAnual(parseInt(year, 10));
  }

  @Get('proximos-vencimientos')
  getProximosVencimientos(@Query('dias') dias?: string) {
    return this.informesLeyService.getProximosVencimientos(dias ? parseInt(dias, 10) : 7);
  }

  @Get('vencidos')
  getEntregasVencidas() {
    return this.informesLeyService.getEntregasVencidas();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.informesLeyService.findOne(id);
  }

  @Get('codigo/:codigo')
  findByCodigo(@Param('codigo') codigo: string) {
    return this.informesLeyService.findByCodigo(codigo);
  }

  @Post()
  create(@Body() createDto: CreateInformeLeyDto) {
    return this.informesLeyService.create(createDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateInformeLeyDto) {
    return this.informesLeyService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.informesLeyService.delete(id);
  }

  // ==================== CRUD ENTREGAS ====================

  @Get('entregas/all')
  findAllEntregas(
    @Query('informeId') informeId?: string,
    @Query('estado') estado?: string,
    @Query('periodo') periodo?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.informesLeyService.findAllEntregas({
      informeId,
      estado,
      periodo,
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
    });
  }

  @Get(':informeId/entregas')
  getEntregasByInforme(@Param('informeId') informeId: string) {
    return this.informesLeyService.getEntregasByInforme(informeId);
  }

  @Get('entregas/:id')
  findOneEntrega(@Param('id') id: string) {
    return this.informesLeyService.findOneEntrega(id);
  }

  @Post('entregas')
  createEntrega(@Body() createDto: CreateEntregaDto) {
    return this.informesLeyService.createEntrega(createDto);
  }

  @Patch('entregas/:id')
  updateEntrega(@Param('id') id: string, @Body() updateDto: UpdateEntregaDto) {
    return this.informesLeyService.updateEntrega(id, updateDto);
  }

  @Delete('entregas/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeEntrega(@Param('id') id: string) {
    return this.informesLeyService.deleteEntrega(id);
  }

  // ==================== FUNCIONES ESPECIALES ====================

  @Post('actualizar-estados-vencidos')
  actualizarEstadosVencidos() {
    return this.informesLeyService.actualizarEstadosVencidos();
  }

  // ==================== GENERACIÓN AUTOMÁTICA (US-022) ====================

  /**
   * POST /informes-ley/:id/generar
   * Generar informe automático con datos del sistema
   */
  @Post(':id/generar')
  async generarInforme(
    @Param('id') id: string,
    @Body() body: GenerarInformeDto,
    @Req() req: any,
  ) {
    const usuarioId = req.user?.id || req.user?.sub;
    const usuarioNombre = req.user?.name || req.user?.nombre || 'Sistema';

    return this.informeGeneratorService.generarInformeAutomatico(
      id,
      body.periodo,
      body.datosAdicionales,
      usuarioId,
      usuarioNombre,
    );
  }

  // ==================== PLANTILLAS ====================

  @Get('plantillas/all')
  async obtenerPlantillas() {
    return this.plantillasService.findAll();
  }

  @Get('plantillas/:codigo')
  async obtenerPlantillaPorCodigo(@Param('codigo') codigo: string) {
    return this.plantillasService.findByCodigo(codigo);
  }
}












