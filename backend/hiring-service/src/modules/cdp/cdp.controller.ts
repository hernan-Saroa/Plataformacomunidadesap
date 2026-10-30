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
import { CargarCdpDto, GuardarCdpAntesDeRadicarDto } from './dto/cdp.dto';
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
      'El área carga el CDP que la Dirección Financiera expidió por fuera del aplicativo: rubro, número, valor, fecha y el certificado. Cierra la 4.2.',
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
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    const hash = await sha256Archivo(join(STORAGE_PATH, file.filename));
    return this.service.adjuntarSoporte(procesoId, file, hash, getHiringAccess(req));
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
