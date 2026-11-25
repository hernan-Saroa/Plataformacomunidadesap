import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor, FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { unlink } from 'fs/promises';
import { join } from 'path';

import { getHiringAccess } from '../../auth/hiring-access';
import { MIME_DOCUMENTOS, MIME_IMAGENES, opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';
import {
  AsignarLiquidacionDto,
  DecidirLiquidacionDto,
  DesistirLiquidacionDto,
  DevolverAlAreaDto,
  EvidenciaSecopDto,
  PerfeccionarLiquidacionDto,
  ReenviarLiquidacionDto,
} from './dto/tramites-liquidacion.dto';
import { ArchivoSubido, TramitesLiquidacionService } from './tramites-liquidacion.service';

const CARGA = opcionesDeCarga(MIME_DOCUMENTOS, 'Los documentos se cargan en PDF, Word o Excel');
const CARGA_EVIDENCIA = opcionesDeCarga(
  [...MIME_DOCUMENTOS, ...MIME_IMAGENES],
  'La evidencia se carga en PDF, Word, Excel o como imagen',
);

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

/** Calcula los hash y, si algo falla, borra lo que multer dejó en disco. */
async function conArchivos<T>(files: any[], hacer: (archivos: ArchivoSubido[]) => Promise<T>): Promise<T> {
  try {
    return await hacer(await conHash(files));
  } catch (error) {
    await Promise.all(files.map((f) => unlink(join(STORAGE_PATH, f.filename)).catch(() => undefined)));
    throw error;
  }
}

function exigirArchivo(file: any, que: string) {
  if (!file) throw new BadRequestException(`Adjunta ${que}`);
}

/**
 * La liquidación o el cierre del contrato desde el proceso (151).
 *
 * Quién ve, radica, asigna o puede ser abogado lo dicen los trámites `LIQ` y
 * `CIE` de Permisos por etapa; lo que depende de la persona —el abogado y la
 * líder del trámite, el escalón pendiente, el área que radicó— lo comprueba el
 * servicio, porque un mismo usuario puede tener permiso en una clase y no en la
 * otra.
 */
@ApiTags('Liquidación y cierre del contrato')
@Controller()
export class TramitesLiquidacionController {
  constructor(private readonly service: TramitesLiquidacionService) {}

  @Get('procesos/:procesoId/tramite-liquidacion')
  @ApiOperation({
    summary: 'Situación del trámite en el proceso',
    description: 'Qué clase le toca (liquidación o cierre PSPAG), si ya se puede radicar y el trámite vivo.',
  })
  situacion(@Param('procesoId', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.situacion(procesoId, getHiringAccess(req));
  }

  @Post('procesos/:procesoId/tramite-liquidacion')
  @UseInterceptors(AnyFilesInterceptor(CARGA))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Radicar la liquidación o el cierre',
    description: 'Cada documento va en un campo cuyo nombre es el id del requisito; `observaciones` es opcional. Abre la etapa 10.',
  })
  radicar(
    @Param('procesoId', ParseUUIDPipe) procesoId: string,
    @Body('observaciones') observaciones: string | undefined,
    @UploadedFiles() files: any[] = [],
    @Req() req: any,
  ) {
    return conArchivos(files, (archivos) =>
      this.service.radicar(procesoId, observaciones?.trim() || null, archivos, getHiringAccess(req)),
    );
  }

  @Get('tramites-liquidacion')
  @ApiOperation({ summary: 'Bandeja de liquidaciones y cierres' })
  bandeja(@Req() req: any) {
    return this.service.bandeja(getHiringAccess(req));
  }

  @Get('tramites-liquidacion/candidatos')
  @ApiOperation({ summary: 'Quiénes pueden ser abogado de una liquidación o de un cierre' })
  candidatos(@Query('clase') clase: string) {
    if (clase !== 'LIQUIDACION' && clase !== 'CIERRE') throw new BadRequestException('La clase es LIQUIDACION o CIERRE');
    return this.service.candidatos(clase);
  }

  @Get('tramites-liquidacion/:id')
  @ApiOperation({ summary: 'Detalle del trámite, con lo que quien mira puede hacer' })
  detalle(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.detalle(id, getHiringAccess(req));
  }

  @Post('tramites-liquidacion/:id/documentos/:requisitoId')
  @UseInterceptors(FileInterceptor('file', CARGA))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Cargar o reemplazar un documento requerido' })
  subirDocumento(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('requisitoId', ParseUUIDPipe) requisitoId: string,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    exigirArchivo(file, 'el documento');
    return conArchivos([file], ([archivo]) => this.service.subirDocumento(id, requisitoId, archivo, getHiringAccess(req)));
  }

  @Post('tramites-liquidacion/:id/asignar')
  @ApiOperation({ summary: 'El asignador líder elige al abogado; queda como la líder del trámite' })
  asignar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AsignarLiquidacionDto, @Req() req: any) {
    return this.service.asignar(id, dto, getHiringAccess(req));
  }

  @Post('tramites-liquidacion/:id/devolver')
  @ApiOperation({ summary: 'Devolver al área: el asignador antes de asignar, o el abogado en el cierre' })
  devolver(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DevolverAlAreaDto, @Req() req: any) {
    return this.service.devolverAlArea(id, dto, getHiringAccess(req));
  }

  @Post('tramites-liquidacion/:id/decidir')
  @ApiOperation({ summary: 'Aprobar o devolver el escalón pendiente (liquidación)' })
  decidir(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DecidirLiquidacionDto, @Req() req: any) {
    return this.service.decidir(id, dto, getHiringAccess(req));
  }

  @Post('tramites-liquidacion/:id/reenviar')
  @ApiOperation({ summary: 'Reenviar lo que se devolvió al área' })
  reenviar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReenviarLiquidacionDto, @Req() req: any) {
    return this.service.reenviar(id, dto, getHiringAccess(req));
  }

  @Post('tramites-liquidacion/:id/acta')
  @UseInterceptors(FileInterceptor('file', CARGA))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'El abogado sube el acta ajustada y la envía al visto bueno' })
  enviarActa(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('observaciones') observaciones: string | undefined,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    exigirArchivo(file, 'el acta');
    return conArchivos([file], ([archivo]) =>
      this.service.enviarActa(id, archivo, observaciones?.trim() || null, getHiringAccess(req)),
    );
  }

  @Post('tramites-liquidacion/:id/perfeccionar')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'acta', maxCount: 1 },
        { name: 'pazYSalvo', maxCount: 1 },
      ],
      CARGA,
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'El área sube el acta firmada: el contrato queda liquidado (10.2)' })
  perfeccionar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PerfeccionarLiquidacionDto,
    @UploadedFiles() files: { acta?: any[]; pazYSalvo?: any[] } = {},
    @Req() req: any,
  ) {
    const acta = files.acta?.[0];
    const pazYSalvo = files.pazYSalvo?.[0] ?? null;
    exigirArchivo(acta, 'el acta firmada');
    if (dto.pazYSalvo && !pazYSalvo) throw new BadRequestException('Adjunta el soporte del paz y salvo');
    return conArchivos([acta, ...(pazYSalvo ? [pazYSalvo] : [])], ([a, p]) =>
      this.service.perfeccionar(id, dto, a, p ?? null, getHiringAccess(req)),
    );
  }

  @Post('tramites-liquidacion/:id/publicar')
  @UseInterceptors(FileInterceptor('file', CARGA_EVIDENCIA))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'El abogado carga la liquidación en SECOP II; se avisa al supervisor' })
  publicar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EvidenciaSecopDto, @UploadedFile() file: any, @Req() req: any) {
    exigirArchivo(file, 'la evidencia de SECOP II');
    return conArchivos([file], ([archivo]) => this.service.publicar(id, dto, archivo, getHiringAccess(req)));
  }

  @Post('tramites-liquidacion/:id/cerrar')
  @UseInterceptors(FileInterceptor('file', CARGA_EVIDENCIA))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'El abogado cierra en SECOP II con la evidencia: el contrato PSPAG queda cerrado' })
  cerrar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EvidenciaSecopDto, @UploadedFile() file: any, @Req() req: any) {
    exigirArchivo(file, 'la evidencia del cierre en SECOP II');
    return conArchivos([file], ([archivo]) => this.service.cerrarEnSecop(id, dto, archivo, getHiringAccess(req)));
  }

  @Post('tramites-liquidacion/:id/desistir')
  @ApiOperation({ summary: 'El área desiste del trámite antes de la firma o del cierre' })
  desistir(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DesistirLiquidacionDto, @Req() req: any) {
    return this.service.desistir(id, dto, getHiringAccess(req));
  }
}
