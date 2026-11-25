import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { unlink } from 'fs/promises';
import { join } from 'path';

import { getHiringAccess } from '../../auth/hiring-access';
import { Permisos } from '../../auth/permisos.decorator';
import { PermisosGuard } from '../../auth/permisos.guard';
import { Puede } from '../../auth/puede.guard';
import { MIME_DOCUMENTOS, MIME_IMAGENES, opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';
import { ConfiguracionModificacionesService } from './configuracion-modificaciones.service';
import {
  AsignarModificacionDto,
  CerrarModificacionDto,
  DecidirModificacionDto,
  GuardarCadenaModificacionDto,
  GuardarTipoModificacionDto,
  PerfeccionarModificacionDto,
  PublicarModificacionTramiteDto,
  RadicarModificacionDto,
  RecibirNotificacionDto,
  ReenviarModificacionDto,
} from './dto/tramites-modificacion.dto';
import { ArchivoSubido, TramitesModificacionService } from './tramites-modificacion.service';

const CARGA = opcionesDeCarga(MIME_DOCUMENTOS, 'Los documentos se cargan en PDF, Word o Excel');
const CARGA_EVIDENCIA = opcionesDeCarga(
  [...MIME_DOCUMENTOS, ...MIME_IMAGENES],
  'La evidencia se carga en PDF, Word, Excel o como imagen',
);

/** Calcula el hash de lo que multer dejó en disco; si algo falla, borra lo subido. */
async function conHash(files: any[]): Promise<ArchivoSubido[]> {
  return Promise.all(
    files.map(async (f) => ({
      fieldname: f.fieldname,
      filename: f.filename,
      originalname: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      hash: await sha256Archivo(join(STORAGE_PATH, f.filename)),
    })),
  );
}

async function limpiar(files: any[]) {
  await Promise.all(files.map((f) => unlink(join(STORAGE_PATH, f.filename)).catch(() => undefined)));
}

async function conArchivos<T>(files: any[], hacer: (archivos: ArchivoSubido[]) => Promise<T>): Promise<T> {
  try {
    return await hacer(await conHash(files));
  } catch (error) {
    await limpiar(files);
    throw error;
  }
}

function exigirArchivo(file: any, que: string) {
  if (!file) throw new BadRequestException(`Adjunta ${que}`);
}

/**
 * Módulo de Modificaciones (150): el trámite vive fuera del proceso.
 *
 * Quién ve, radica y asigna lo dice el trámite `MOD` de Permisos por etapa. Lo
 * que depende de la persona —el abogado y el revisor asignados, el escalón
 * pendiente, el área que radicó— lo comprueba el servicio.
 */
@ApiTags('Modificaciones contractuales')
@Controller('modificaciones')
export class TramitesModificacionController {
  constructor(private readonly service: TramitesModificacionService) {}

  @Get()
  @Puede('ver', 'MOD')
  @ApiOperation({ summary: 'Bandeja de modificaciones', description: 'Contratación ve todas; el área, las suyas.' })
  bandeja(@Req() req: any) {
    return this.service.bandeja(getHiringAccess(req));
  }

  @Get('para-radicar')
  @Puede('ver', 'MOD')
  @ApiOperation({ summary: 'Tipos activos y documentos que se piden, para el formulario' })
  paraRadicar() {
    return this.service.paraRadicar();
  }

  @Get('contrato')
  @Puede('ver', 'MOD')
  @ApiOperation({
    summary: 'Buscar el contrato por número',
    description: 'Si está en la plataforma la modificación se vincula y lleva el flujo completo; si no, es una notificación.',
  })
  buscarContrato(@Query('numero') numero: string) {
    return this.service.buscarContrato(numero);
  }

  @Get('candidatos')
  @Puede('decidir', 'MOD')
  @ApiOperation({ summary: 'Quiénes pueden ser abogado o revisor de una modificación' })
  candidatos() {
    return this.service.candidatos();
  }

  @Get(':id')
  @Puede('ver', 'MOD')
  @ApiOperation({ summary: 'Detalle de la modificación, con lo que quien mira puede hacer' })
  detalle(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.detalle(id, getHiringAccess(req));
  }

  @Post()
  @UseInterceptors(AnyFilesInterceptor(CARGA))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Radicar una modificación',
    description:
      'El campo `datos` lleva el JSON de RadicarModificacionDto; cada documento va en un campo cuyo nombre es el id del requisito.',
  })
  async radicar(@Body('datos') datos: string, @UploadedFiles() files: any[] = [], @Req() req: any) {
    return conArchivos(files, async (archivos) => {
      let bruto: unknown;
      try {
        bruto = JSON.parse(datos ?? '');
      } catch {
        throw new BadRequestException('Los datos de la modificación no llegaron bien');
      }
      const dto = plainToInstance(RadicarModificacionDto, bruto);
      const errores = await validate(dto, { whitelist: true });
      if (errores.length) {
        const mensajes = errores.flatMap((e) => Object.values(e.constraints ?? { otro: `${e.property} no es válido` }));
        throw new BadRequestException(mensajes.join('. '));
      }
      return this.service.radicar(dto, archivos, getHiringAccess(req));
    });
  }

  @Post(':id/documentos/:requisitoId')
  @UseInterceptors(FileInterceptor('file', CARGA))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Cargar o reemplazar un documento requerido' })
  async subirDocumento(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('requisitoId', ParseUUIDPipe) requisitoId: string,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    exigirArchivo(file, 'el documento');
    return conArchivos([file], ([archivo]) => this.service.subirDocumento(id, requisitoId, archivo, getHiringAccess(req)));
  }

  @Post(':id/recibir')
  @Puede('decidir', 'MOD')
  @ApiOperation({ summary: 'Dar por recibida la notificación de un contrato antiguo' })
  recibir(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RecibirNotificacionDto, @Req() req: any) {
    return this.service.recibir(id, dto, getHiringAccess(req));
  }

  @Post(':id/asignar')
  @Puede('decidir', 'MOD')
  @ApiOperation({ summary: 'Asignar abogado y revisor; abre la revisión' })
  asignar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AsignarModificacionDto, @Req() req: any) {
    return this.service.asignar(id, dto, getHiringAccess(req));
  }

  @Post(':id/decidir')
  @ApiOperation({ summary: 'Aprobar, devolver o negar el escalón pendiente' })
  decidir(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DecidirModificacionDto, @Req() req: any) {
    return this.service.decidir(id, dto, getHiringAccess(req));
  }

  @Post(':id/reenviar')
  @ApiOperation({ summary: 'Reenviar a revisión lo que se devolvió al área' })
  reenviar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReenviarModificacionDto, @Req() req: any) {
    return this.service.reenviar(id, dto, getHiringAccess(req));
  }

  @Post(':id/minuta')
  @UseInterceptors(FileInterceptor('file', CARGA))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'El abogado sube la minuta y la envía al visto bueno' })
  async enviarMinuta(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('observaciones') observaciones: string | undefined,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    exigirArchivo(file, 'la minuta');
    return conArchivos([file], ([archivo]) =>
      this.service.enviarMinuta(id, archivo, observaciones?.trim() || null, getHiringAccess(req)),
    );
  }

  @Post(':id/perfeccionar')
  @UseInterceptors(FileInterceptor('file', CARGA))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'El área sube la minuta firmada: la modificación se perfecciona y cambia el contrato' })
  async perfeccionar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PerfeccionarModificacionDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    exigirArchivo(file, 'la minuta firmada');
    return conArchivos([file], ([archivo]) => this.service.perfeccionar(id, dto, archivo, getHiringAccess(req)));
  }

  @Post(':id/publicar')
  @UseInterceptors(FileInterceptor('file', CARGA_EVIDENCIA))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'El abogado carga la evidencia de SECOP II; se avisa al supervisor' })
  async publicar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublicarModificacionTramiteDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    exigirArchivo(file, 'la evidencia de la publicación');
    return conArchivos([file], ([archivo]) => this.service.publicar(id, dto, archivo, getHiringAccess(req)));
  }

  @Post(':id/desistir')
  @ApiOperation({ summary: 'El área desiste de la modificación antes de que se perfeccione' })
  desistir(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CerrarModificacionDto, @Req() req: any) {
    return this.service.desistir(id, dto, getHiringAccess(req));
  }
}

/** Configuración › Tipos de modificación y cadenas (150). */
@ApiTags('Configuración de etapas')
@Controller('configuracion')
export class ConfiguracionModificacionesController {
  constructor(private readonly service: ConfiguracionModificacionesService) {}

  @Get('tipos-modificacion')
  @Puede('ver', undefined, { oPermiso: 'contratacion.config.manage' })
  @ApiOperation({ summary: 'Tipos de modificación, incluidos los retirados' })
  tipos() {
    return this.service.tipos();
  }

  @Post('tipos-modificacion')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({ summary: 'Crear o ajustar un tipo de modificación' })
  guardarTipo(@Body() dto: GuardarTipoModificacionDto) {
    return this.service.guardarTipo(dto);
  }

  @Put('tipos-modificacion/:codigo/retirar')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({ summary: 'Retirar un tipo de modificación', description: 'Se desactiva, no se borra.' })
  retirarTipo(@Param('codigo') codigo: string) {
    return this.service.retirarTipo(codigo);
  }

  @Get('cadenas-modificacion')
  @Puede('ver', undefined, { oPermiso: 'contratacion.config.manage' })
  @ApiOperation({ summary: 'Las cadenas de revisión y de visto bueno de las modificaciones' })
  cadenas() {
    return this.service.cadenas();
  }

  @Put('cadenas-modificacion/:fase')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({ summary: 'Ajustar una de las dos cadenas', description: 'Las rondas abiertas conservan la de antes.' })
  guardarCadena(@Param('fase') fase: string, @Body() dto: GuardarCadenaModificacionDto, @Req() req: any) {
    return this.service.guardarCadena(fase, dto, getHiringAccess(req).userName);
  }
}
