import { Controller, Get, Query } from '@nestjs/common';
import { DatosMaestrosService } from './datos-maestros.service';

@Controller('datos-maestros')
export class DatosMaestrosController {
  constructor(private readonly datosMaestrosService: DatosMaestrosService) {}

  @Get('territoriales')
  async getTerritoriales() {
    return await this.datosMaestrosService.getTerritoriales();
  }

  @Get('cetaps')
  async getCETAPs(@Query('territorialId') territorialId?: string) {
    return await this.datosMaestrosService.getCETAPs(territorialId);
  }

  @Get('programas-academicos')
  async getProgramasAcademicos() {
    return await this.datosMaestrosService.getProgramasAcademicos();
  }
}