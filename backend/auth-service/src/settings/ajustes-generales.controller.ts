import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AjustesGeneralesService } from './ajustes-generales.service';
import {
  UpdateSalarioMinimoDto,
  SyncFestivosDto,
  CreateFestivoDto,
  UpdateFestivoDto,
} from './dto/ajustes-generales.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('ajustes-generales')
export class AjustesGeneralesController {
  constructor(
    private readonly ajustesGeneralesService: AjustesGeneralesService,
  ) {}

  /**
   * GET /ajustes-generales/salario-minimo
   * Consulta el Salario Mínimo Mensual Legal Vigente (SMMLV)
   */
  @Public()
  @Get('salario-minimo')
  async getSalarioMinimo() {
    return this.ajustesGeneralesService.getSalarioMinimo();
  }

  /**
   * PUT /ajustes-generales/salario-minimo
   * Actualiza el Salario Mínimo Mensual Legal Vigente (SMMLV)
   */
  @Put('salario-minimo')
  @HttpCode(HttpStatus.OK)
  async updateSalarioMinimo(@Body() dto: UpdateSalarioMinimoDto) {
    return this.ajustesGeneralesService.updateSalarioMinimo(
      dto.salarioMinimo,
      dto.anio,
    );
  }

  /**
   * GET /ajustes-generales/festivos?year=2026
   * Consulta los días festivos nacionales (opcionalmente filtrados por año)
   */
  @Public()
  @Get('festivos')
  async getFestivos(@Query('year') year?: string) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return this.ajustesGeneralesService.getFestivos(yearNum);
  }

  /**
   * POST /ajustes-generales/festivos/sincronizar?year=2026
   * Sincroniza los festivos con la API oficial https://calendariosnacionales.com/co/v1/{year}/nacionales.json
   * Identifica el año actual automáticamente si no se especifica.
   */
  @Post('festivos/sincronizar')
  @HttpCode(HttpStatus.OK)
  async sincronizarFestivos(
    @Query('year') yearQuery?: string,
    @Body() body?: SyncFestivosDto,
  ) {
    const year =
      body?.year || (yearQuery ? parseInt(yearQuery, 10) : undefined);
    return this.ajustesGeneralesService.sincronizarFestivos(year);
  }

  /**
   * POST /ajustes-generales/festivos
   * Crea un festivo de forma manual
   */
  @Post('festivos')
  @HttpCode(HttpStatus.CREATED)
  async createFestivo(@Body() dto: CreateFestivoDto) {
    return this.ajustesGeneralesService.createFestivo(dto);
  }

  /**
   * PUT /ajustes-generales/festivos/:id
   * Actualiza un festivo existente
   */
  @Put('festivos/:id')
  @HttpCode(HttpStatus.OK)
  async updateFestivo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFestivoDto,
  ) {
    return this.ajustesGeneralesService.updateFestivo(id, dto);
  }

  /**
   * DELETE /ajustes-generales/festivos/:id
   * Elimina un festivo
   */
  @Delete('festivos/:id')
  @HttpCode(HttpStatus.OK)
  async deleteFestivo(@Param('id', ParseIntPipe) id: number) {
    return this.ajustesGeneralesService.deleteFestivo(id);
  }
}
