import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { join } from 'path';
import { unlink } from 'fs/promises';

import { getHiringAccess } from '../../auth/hiring-access';
import { Puede } from '../../auth/puede.guard';
import { opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';
import { PaaAdminService } from './paa-admin.service';
import { PaaCamposService } from './paa-campos.service';
import { PaaLineasService } from './paa-lineas.service';
import { PaaActivacionService } from './paa-activacion.service';
import {
  ActualizarRegionDto,
  BuscarLineasDto,
  GuardarCamposDto,
  CrearRegionDto,
  CrearVigenciaDto,
  DescartarVersionDto,
  LineasDeVersionDto,
} from './dto/paa.dto';

const MIME_XLSX = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

/**
 * Administración del Plan Anual de Adquisiciones (migración 097).
 *
 * Todo cuelga del trámite `PAA`: ver para consultar, editar para cargar y
 * configurar, aprobar para activar o descartar lo que cambia de dónde nacen
 * los procesos.
 */
@ApiTags('Plan Anual de Adquisiciones')
@Controller('paa')
export class PaaController {
  constructor(
    private readonly admin: PaaAdminService,
    private readonly campos: PaaCamposService,
    private readonly lineas: PaaLineasService,
    private readonly activacion: PaaActivacionService,
  ) {}

  // ---------------------------------------------- al crear un proceso --
  //
  // Los pide quien crea procesos, no quien administra el PAA: cuelgan de la
  // 3.1, que es donde nace el proceso.

  @Get('opciones-de-creacion')
  @Puede('editar', '3.1')
  @ApiOperation({ summary: 'Regiones y vigencia de las que se puede crear un proceso' })
  opcionesDeCreacion() {
    return this.lineas.opciones();
  }

  @Get('lineas')
  @Puede('editar', '3.1')
  @ApiOperation({
    summary: 'Buscar líneas de la versión activa de una región y vigencia',
    description: 'Marca las que ya originaron un proceso en curso o adjudicado.',
  })
  buscarLineas(@Query() filtro: BuscarLineasDto) {
    return this.lineas.buscar(filtro);
  }

  @Get('lineas/:id')
  @Puede('editar', '3.1')
  @ApiOperation({ summary: 'Una línea con los campos que su región muestra' })
  linea(@Param('id', ParseUUIDPipe) id: string) {
    return this.lineas.detalle(id);
  }

  // -------------------------------------------------------------- regiones --

  @Get('regiones')
  @Puede('ver', 'PAA')
  @ApiOperation({ summary: 'Regiones que contratan con su bloque del PAA' })
  regiones() {
    return this.admin.listarRegiones();
  }

  @Post('regiones')
  @Puede('editar', 'PAA')
  @ApiOperation({ summary: 'Crear una región' })
  crearRegion(@Body() dto: CrearRegionDto, @Req() req: any) {
    return this.admin.crearRegion(dto, getHiringAccess(req));
  }

  @Patch('regiones/:id')
  @Puede('editar', 'PAA')
  @ApiOperation({ summary: 'Editar o desactivar una región' })
  actualizarRegion(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActualizarRegionDto, @Req() req: any) {
    return this.admin.actualizarRegion(id, dto, getHiringAccess(req));
  }

  @Get('regiones/:id/vigencias/:anio/campos')
  @Puede('ver', 'PAA')
  @ApiOperation({
    summary: 'Campos del formulario de la región en esa vigencia',
    description: 'Si la vigencia no está configurada, propone la del año anterior o la del formato, sin guardarla.',
  })
  camposDelFormulario(@Param('id', ParseUUIDPipe) id: string, @Param('anio', ParseIntPipe) anio: number) {
    return this.campos.campos(id, anio);
  }

  @Put('regiones/:id/vigencias/:anio/campos')
  @Puede('editar', 'PAA')
  @ApiOperation({ summary: 'Guardar qué campos se muestran, en qué orden y con qué nombre' })
  guardarCampos(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('anio', ParseIntPipe) anio: number,
    @Body() dto: GuardarCamposDto,
    @Req() req: any,
  ) {
    return this.campos.guardar(id, anio, dto, getHiringAccess(req));
  }

  // ------------------------------------------------------------- vigencias --

  @Get('vigencias')
  @Puede('ver', 'PAA')
  @ApiOperation({ summary: 'Vigencias con su historial de versiones' })
  vigencias() {
    return this.admin.listarVigencias();
  }

  @Post('vigencias')
  @Puede('editar', 'PAA')
  @ApiOperation({ summary: 'Abrir una vigencia; nace sin ser la vigente' })
  crearVigencia(@Body() dto: CrearVigenciaDto, @Req() req: any) {
    return this.admin.crearVigencia(dto, getHiringAccess(req));
  }

  // ------------------------------------------------------------- versiones --

  @Post('vigencias/:id/versiones')
  @Puede('editar', 'PAA')
  @UseInterceptors(FileInterceptor('file', opcionesDeCarga(MIME_XLSX, 'El PAA se carga en Excel (.xlsx)')))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Cargar una versión del PAA',
    description: 'La valida y la compara con la activa. No la activa: eso es otro paso, con su propio permiso.',
  })
  async cargarVersion(@Param('id', ParseUUIDPipe) vigenciaId: string, @UploadedFile() file: any, @Req() req: any) {
    if (!file) throw new BadRequestException('Falta el archivo del PAA');

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.admin.cargarVersion(vigenciaId, file, await sha256Archivo(ruta), getHiringAccess(req));
    } catch (error) {
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }

  @Get('versiones/:id')
  @Puede('ver', 'PAA')
  @ApiOperation({ summary: 'Una versión: estado, errores, advertencias y resumen de la comparación' })
  version(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.obtenerVersion(id);
  }

  @Get('versiones/:id/comparacion')
  @Puede('ver', 'PAA')
  @ApiOperation({ summary: 'Qué cambió respecto de la versión anterior, línea por línea' })
  comparacion(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.comparacion(id);
  }

  @Get('versiones/:id/lineas')
  @Puede('ver', 'PAA')
  @ApiOperation({ summary: 'Las líneas de una versión, por región y búsqueda' })
  lineasDeVersion(@Param('id', ParseUUIDPipe) id: string, @Query() filtro: LineasDeVersionDto) {
    return this.admin.lineasDeVersion(id, filtro);
  }

  @Get('versiones/:id/afectados')
  @Puede('ver', 'PAA')
  @ApiOperation({
    summary: 'Qué les pasaría a los procesos si se activa esta versión',
    description: 'Misma lógica que la activación: cuáles se actualizan, cuáles quedan en revisión y cuáles se detienen.',
  })
  afectados(@Param('id', ParseUUIDPipe) id: string) {
    return this.activacion.afectados(id);
  }

  @Post('versiones/:id/activar')
  @Puede('aprobar', 'PAA')
  @ApiOperation({
    summary: 'Activar una versión validada',
    description: 'Reemplaza la activa, actualiza los procesos y abre sus revisiones, todo o nada.',
  })
  activar(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.activacion.activar(id, getHiringAccess(req));
  }

  @Post('versiones/:id/descartar')
  @Puede('aprobar', 'PAA')
  @ApiOperation({ summary: 'Descartar una versión validada sin activarla' })
  descartar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DescartarVersionDto, @Req() req: any) {
    return this.admin.descartar(id, dto.motivo, getHiringAccess(req));
  }
}
