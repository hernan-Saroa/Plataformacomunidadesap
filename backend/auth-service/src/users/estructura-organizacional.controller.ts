import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EstructuraOrganizacionalService } from './estructura-organizacional.service';
import {
  CreateSeccionalDto,
  UpdateSeccionalDto,
  CreateSedeDto,
  UpdateSedeDto,
  AsignarUsuariosDto,
} from './estructura-organizacional.dto';

@Controller('estructura-organizacional')
export class EstructuraOrganizacionalController {
  constructor(
    private readonly estructuraService: EstructuraOrganizacionalService,
  ) {}

  // ==================== ENDPOINT PRINCIPAL ====================

  @Get()
  async getEstructuraOrganizacional() {
    const seccionales = await this.estructuraService.findAllSeccionales();
    const sedes = await this.estructuraService.findAllSedes();
    const stats = await this.estructuraService.getEstadisticas();

    return {
      data: {
        seccionales,
        sedes,
      },
      meta: {
        totalSeccionales: stats.totalSeccionales,
        totalSedes: stats.totalSedes,
      },
    };
  }

  @Post('importar')
  @UseInterceptors(FileInterceptor('file'))
  async importarEstructura(
    @UploadedFile() file: any,
    @Query('periodo_codigo') periodoCodigo: string,
  ) {
    if (!file) {
      throw new BadRequestException('Archivo no proporcionado');
    }
    return this.estructuraService.importarEstructura(file.buffer, periodoCodigo);
  }

  // ==================== ESTADÍSTICAS ====================

  @Get('estadisticas')
  async getEstadisticas() {
    const stats = await this.estructuraService.getEstadisticas();
    return { data: stats };
  }

  // ==================== GEOPOLITICA ====================

  @Get('geopolitica/departamentos')
  async findDepartamentos() {
    const departamentos = await this.estructuraService.findDepartamentos();
    return { data: departamentos };
  }

  @Get('geopolitica/departamentos/:idDepartamento/ciudades')
  async findCiudadesByDepartamento(
    @Param('idDepartamento') idDepartamento: string,
  ) {
    const ciudades = await this.estructuraService.findCiudadesByDepartamento(
      Number(idDepartamento),
    );
    return { data: ciudades };
  }

  @Get('geopolitica/:id')
  async findGeopoliticaById(@Param('id') id: string) {
    const geopolitica = await this.estructuraService.findGeopoliticaById(
      Number(id),
    );
    return { data: geopolitica };
  }

  // ==================== SEDES ====================

  @Post('sedes')
  async createSede(@Body() dto: CreateSedeDto) {
    const sede = await this.estructuraService.createSede(dto);
    return { data: sede, message: 'Sede creada exitosamente' };
  }

  @Get('sedes')
  async findAllSedes(
    @Query('idSeccional') idSeccional?: string,
    @Query('search') search?: string,
  ) {
    const sedes = await this.estructuraService.findAllSedes({
      idSeccional: idSeccional ? Number(idSeccional) : undefined,
      search,
    });
    return {
      data: sedes,
      meta: {
        total: sedes.length,
      },
    };
  }

  @Get('sedes/seccional/:idSeccional')
  async findSedesBySeccional(@Param('idSeccional') idSeccional: string) {
    const sedes = await this.estructuraService.findSedesBySeccional(
      Number(idSeccional),
    );
    return { data: sedes };
  }

  @Get('sedes/:id')
  async findSedeById(@Param('id') id: string) {
    const sede = await this.estructuraService.findSedeById(Number(id));
    return { data: sede };
  }

  @Put('sedes/:id')
  async updateSede(@Param('id') id: string, @Body() dto: UpdateSedeDto) {
    const sede = await this.estructuraService.updateSede(Number(id), dto);
    return { data: sede, message: 'Sede actualizada exitosamente' };
  }

  @Delete('sedes/:id')
  async deleteSede(@Param('id') id: string) {
    await this.estructuraService.deleteSede(Number(id));
    return { message: 'Sede eliminada exitosamente' };
  }

  // ==================== SECCIONALES ====================

  @Post('seccionales')
  async createSeccional(@Body() dto: CreateSeccionalDto) {
    const seccional = await this.estructuraService.createSeccional(dto);
    return { data: seccional, message: 'Seccional creada exitosamente' };
  }

  @Get('seccionales')
  async findAllSeccionales() {
    const seccionales = await this.estructuraService.findAllSeccionales();
    return {
      data: seccionales,
      meta: {
        total: seccionales.length,
      },
    };
  }

  @Get('seccionales/:id')
  async findSeccionalById(@Param('id') id: string) {
    const seccional = await this.estructuraService.findSeccionalById(
      Number(id),
    );
    return { data: seccional };
  }

  @Put('seccionales/:id')
  async updateSeccional(@Param('id') id: string, @Body() dto: UpdateSeccionalDto) {
    const seccional = await this.estructuraService.updateSeccional(Number(id), dto);
    return { data: seccional, message: 'Seccional actualizada exitosamente' };
  }

  @Delete('seccionales/:id')
  async deleteSeccional(@Param('id') id: string) {
    await this.estructuraService.deleteSeccional(Number(id));
    return { message: 'Seccional eliminada exitosamente' };
  }

  // ==================== ASIGNACIÓN DE USUARIOS ====================

  @Get('usuarios/sin-asignar')
  async getUsuariosSinAsignar() {
    return this.estructuraService.getUsuariosSinAsignar();
  }

  @Post('usuarios/asignar')
  async asignarSeleccionados(@Body() body: AsignarUsuariosDto) {
    return this.estructuraService.asignarSeleccionados(
      body.ids,
      body.territorialId,
      body.cetapId,
    );
  }
}
