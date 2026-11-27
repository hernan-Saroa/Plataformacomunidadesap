import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { join } from 'path';

import { CdpService } from './cdp.service';
import {
  CargarCdpDto,
  EnviarCargueCdpDto,
  GuardarCdpAntesDeRadicarDto,
  QuitarCdpDto,
} from './dto/cdp.dto';
import { RolesGuard } from '../../auth/roles.guard';

import { getHiringAccess } from '../../auth/hiring-access';
import { Puede } from '../../auth/puede.guard';
import { Permisos } from '../../auth/permisos.decorator';
import { PermisosGuard } from '../../auth/permisos.guard';

import {
  MIME_DOCUMENTOS,
  opcionesDeCarga,
  sha256Archivo,
  STORAGE_PATH,
} from '../archivos';

/**
 * El CDP del proceso — etapa 4 (EFDS-1148).
 *
 * Desde la 103 el CDP se pide y se expide por fuera del aplicativo: aquí el
 * área solo carga el certificado que la Dirección Financiera ya expidió.
 */
@ApiTags('CDP')
@Controller('procesos/:id/cdp')
export class CdpController {
  constructor(private readonly service: CdpService) {}

  @Get()
  @Puede('ver', '4.2')
  @ApiOperation({
    summary: 'Estado del respaldo presupuestal del proceso',
    description:
      'Devuelve el CDP en curso, si la modalidad lo requiere y por qué el proceso todavía no puede abrirse.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estadoRespaldo(procesoId, undefined, getHiringAccess(req));
  }

  @Post('cargue')
  @Puede('editar', '4.2')
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(MIME_DOCUMENTOS, 'Solo se admiten archivos PDF, Word o Excel'),
    ),
  )
  @ApiOperation({
    summary: 'Actividad 4.2 · Cargar el CDP',
    description:
      'El área carga un CDP que la Dirección Financiera expidió por fuera del aplicativo: rubro, número, valor, fecha y el certificado. El proceso puede llevar uno o más (152): con `enviar` en falso queda cargado sin cerrar la 4.2; por omisión la cierra.',
  })
  async cargar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @UploadedFile() file: any,
    @Body() dto: CargarCdpDto,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Adjunta el certificado expedido');
    const hash = await sha256Archivo(join(STORAGE_PATH, file.filename));
    return this.service.cargar(procesoId, dto, { archivo: file, hash }, getHiringAccess(req));
  }

  @Put('cargue')
  @Puede('editar', '4.2')
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(MIME_DOCUMENTOS, 'Solo se admiten archivos PDF, Word o Excel'),
    ),
  )
  @ApiOperation({
    summary: 'Actividad 4.2 · Corregir el CDP cargado',
    description:
      'Con la 4.2 retirada de aprobación o devuelta: reemplaza los datos y, si llega, el certificado, y la vuelve a enviar. Corrige el primero; para uno en particular, PUT cargue/:cdpId.',
  })
  async corregir(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @UploadedFile() file: any,
    @Body() dto: CargarCdpDto,
    @Req() req: any,
  ) {
    const soporte = file
      ? { archivo: file, hash: await sha256Archivo(join(STORAGE_PATH, file.filename)) }
      : null;
    return this.service.corregir(procesoId, dto, soporte, getHiringAccess(req));
  }

  @Put('cargue/:cdpId')
  @Puede('editar', '4.2')
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(MIME_DOCUMENTOS, 'Solo se admiten archivos PDF, Word o Excel'),
    ),
  )
  @ApiOperation({
    summary: 'Actividad 4.2 · Corregir uno de los CDP cargados',
    description:
      'El proceso puede llevar uno o más CDP (152). Con la 4.2 abierta corrige ese CDP; con `enviar` en falso no envía la 4.2.',
  })
  async corregirUno(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('cdpId', ParseUUIDPipe) cdpId: string,
    @UploadedFile() file: any,
    @Body() dto: CargarCdpDto,
    @Req() req: any,
  ) {
    const soporte = file
      ? { archivo: file, hash: await sha256Archivo(join(STORAGE_PATH, file.filename)) }
      : null;
    return this.service.corregir(procesoId, dto, soporte, getHiringAccess(req), cdpId);
  }

  @Post('cargue/:cdpId/retiro')
  @Puede('editar', '4.2')
  @ApiOperation({
    summary: 'Actividad 4.2 · Quitar uno de los CDP cargados',
    description: 'Con la 4.2 abierta anula ese CDP; queda en la trazabilidad con el motivo.',
  })
  quitar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('cdpId', ParseUUIDPipe) cdpId: string,
    @Body() dto: QuitarCdpDto,
    @Req() req: any,
  ) {
    return this.service.quitar(procesoId, cdpId, dto?.motivo, getHiringAccess(req));
  }

  @Post('envio')
  @Puede('editar', '4.2')
  @ApiOperation({
    summary: 'Actividad 4.2 · Enviar con los CDP cargados',
    description:
      'Cierra la 4.2 —o la deja en revisión, o pide la firma— con los CDP que ya se cargaron sin enviarla (152).',
  })
  enviar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: EnviarCargueCdpDto,
    @Req() req: any,
  ) {
    return this.service.enviarCargue(procesoId, dto?.firma, getHiringAccess(req));
  }

  @Post('documento')
  @Puede('editar', '4.2')
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(MIME_DOCUMENTOS, 'Solo se admiten archivos PDF, Word o Excel'),
    ),
  )
  @ApiOperation({
    summary: 'Adjuntar el soporte de un CDP cargado sin él',
    description:
      'Para los CDP expedidos antes de que la 4.2 pidiera el soporte con el certificado. El soporte queda vinculado al CDP, no solo al numeral.',
  })
  async adjuntar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @UploadedFile() file: any,
    @Body('cdpId') cdpId: string | undefined,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Adjunta el archivo: no llegó ninguno');
    if (cdpId && !/^[0-9a-f-]{36}$/i.test(cdpId)) throw new BadRequestException('cdpId no es válido');
    const hash = await sha256Archivo(join(STORAGE_PATH, file.filename));
    return this.service.adjuntarSoporte(procesoId, file, hash, getHiringAccess(req), cdpId || undefined);
  }
}

/**
 * Configuración: qué modalidades exigen el CDP antes de radicar el estudio
 * previo (migración 100).
 *
 * Lectura abierta a quien ve Configuración, escritura de quien la administra:
 * igual que los umbrales, el área tiene que poder entender por qué no la dejan
 * enviar.
 */
@ApiTags('CDP')
@Controller('configuracion/cdp-antes-de-radicar')
export class CdpAntesDeRadicarController {
  constructor(private readonly service: CdpService) {}

  @Get()
  @Puede('ver', undefined, { oPermiso: 'contratacion.config.manage' })
  @ApiOperation({ summary: 'Si cada modalidad exige el CDP cargado antes de enviar el estudio previo' })
  listar() {
    return this.service.exigenciasAntesDeRadicar();
  }

  @Put(':modalidad')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({
    summary: 'Cambiar si una modalidad exige el CDP antes de radicar',
    description: 'Solo afecta los envíos posteriores: lo que ya está en revisión o aprobado no cambia.',
  })
  guardar(
    @Param('modalidad') modalidad: string,
    @Body() dto: GuardarCdpAntesDeRadicarDto,
    @Req() req: any,
  ) {
    return this.service.guardarExigenciaAntesDeRadicar(modalidad, dto, getHiringAccess(req));
  }
}
