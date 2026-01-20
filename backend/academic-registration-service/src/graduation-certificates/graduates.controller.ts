import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { GraduationCertificatesService } from './graduation-certificates.service';
import type { UpdateGraduateDto } from './dto/update-graduate.dto';

@Controller(['graduates', 'academic-registration/api/v1/graduates'])
export class GraduatesController {
  constructor(private readonly service: GraduationCertificatesService) {}

  @Get()
  async listarGraduados() {
    return await this.service.listarGraduados();
  }

  @Get('cedula/:idNumber')
  async obtenerPorCedula(@Param('idNumber') idNumber: string) {
    return await this.service.buscarGraduadoPorCedula(idNumber);
  }

  @Get(':id')
  async obtenerPorId(@Param('id') id: string) {
    return await this.service.obtenerGraduado(id);
  }

  @Put(':id')
  async actualizarGraduado(
    @Param('id') id: string,
    @Body() payload: UpdateGraduateDto,
  ) {
    return await this.service.actualizarGraduado(id, payload);
  }
}
