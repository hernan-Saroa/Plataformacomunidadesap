import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { createHash, randomBytes } from 'crypto';
import { createReadStream } from 'fs';

import { EstudioPrevioService } from './estudio-previo.service';
import {
  AnotarRadicadoDto,
  CrearProcesoDto,
  EnviarEstudioPrevioDto,
  GuardarBorradorDto,
  RevisarDto,
} from './dto/estudio-previo.dto';
import { getHiringAccess } from '../../auth/hiring-access';
import { Puede } from '../../auth/puede.guard';
import { NOMBRE_EN_UTF8 } from '../archivos';


const STORAGE_PATH = process.env.HIRING_STORAGE_PATH || './uploads';
const MIME_PERMITIDOS = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

function sha256Archivo(ruta: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(ruta)
      .on('data', (c) => hash.update(c))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject);
  });
}

@ApiTags('Estudio previo')
@Controller('procesos')
export class EstudioPrevioController {
  constructor(private readonly service: EstudioPrevioService) {}

  @Post()
  @Puede('editar', '3.1')
  @ApiOperation({ summary: 'Crear proceso en etapa 3 y abrir su expediente electrónico' })
  crearProceso(@Body() dto: CrearProcesoDto, @Req() req: any) {
    return this.service.crearProceso(dto, getHiringAccess(req));
  }

  @Get()
  @ApiOperation({ summary: 'Listar procesos' })
  listar(@Req() req: any) {
    return this.service.listarProcesos(getHiringAccess(req));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar un proceso' })
  obtenerProceso(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.obtenerProceso(id, getHiringAccess(req));
  }

  @Get(':id/estudio-previo')
  @ApiOperation({
    summary: 'Datos del estudio previo y definición de sus campos',
    description:
      'Trae además quién resuelve la 3.4 y si le toca a quien consulta, para que la pantalla no ofrezca una decisión que la API va a rechazar.',
  })
  obtener(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.obtener(id, getHiringAccess(req));
  }

  @Put(':id/estudio-previo')
  @Puede('editar', '3.1')
  @ApiOperation({ summary: 'Guardar borrador (no valida campos obligatorios)' })
  guardar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GuardarBorradorDto,
    @Req() req: any,
  ) {
    return this.service.guardarBorrador(id, dto, getHiringAccess(req));
  }

  @Post(':id/estudio-previo/enviar')
  @Puede('editar', '3.1')
  @ApiOperation({
    summary: 'Enviar a revisión',
    description:
      'Valida los campos obligatorios. Si faltan responde 422 con camposFaltantes. ' +
      'Si está completo registra el estudio previo como documento del expediente.',
  })
  enviar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EnviarEstudioPrevioDto,
    @Req() req: any,
  ) {
    return this.service.enviar(id, getHiringAccess(req), dto?.firma);
  }

  @Post(':id/estudio-previo/aprobar')
  @Puede('aprobar', '3.4')
  @ApiOperation({
    summary: 'Aprobar el estudio previo (numeral 3.4)',
    description: 'Solo aplica si está en revisión. Tras aprobarlo no admite cambios.',
  })
  aprobar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevisarDto,
    @Req() req: any,
  ) {
    return this.service.aprobar(id, dto.observaciones, getHiringAccess(req), dto.firma);
  }

  @Post(':id/estudio-previo/devolver')
  @Puede('aprobar', '3.4')
  @ApiOperation({
    summary: 'Devolver el estudio previo con observaciones (numeral 3.4)',
    description: 'Regresa a borrador para que el gestor corrija y lo reenvíe.',
  })
  devolver(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevisarDto,
    @Req() req: any,
  ) {
    return this.service.devolver(id, dto.observaciones ?? '', getHiringAccess(req));
  }

  @Post(':id/estudio-previo/negar')
  @Puede('aprobar', '3.4')
  @ApiOperation({
    summary: 'Negar el proceso (numeral 3.4)',
    description:
      'La contratación no procede. No es devolver: no hay corrección que esperar, el proceso termina y no admite reenvío. El motivo es obligatorio y no se puede deshacer.',
  })
  negar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RevisarDto, @Req() req: any) {
    return this.service.negar(id, dto.observaciones ?? '', getHiringAccess(req));
  }

  @Get(':id/estudio-previo/revisiones')
  @ApiOperation({ summary: 'Historial de aprobaciones, devoluciones y negativas' })
  revisiones(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.revisiones(id);
  }

  @Get(':id/expediente')
  @ApiOperation({ summary: 'Documentos del expediente electrónico del proceso' })
  expediente(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.expediente(id);
  }

  @Post(':id/estudio-previo/documentos')
  @Puede('editar', '3.1')
  @UseInterceptors(
    FileInterceptor('file', {
      defParamCharset: NOMBRE_EN_UTF8,
      storage: diskStorage({
        destination: STORAGE_PATH,
        filename: (_req, file, cb) =>
          cb(null, `${randomBytes(16).toString('hex')}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 25 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        MIME_PERMITIDOS.includes(file.mimetype)
          ? cb(null, true)
          : cb(new BadRequestException('Solo se admiten archivos PDF, Word o Excel'), false),
    }),
  )
  @ApiOperation({ summary: 'Adjuntar un documento al estudio previo' })
  async adjuntar(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    const hash = await sha256Archivo(join(STORAGE_PATH, file.filename));
    return this.service.registrarAdjunto(id, file, hash, getHiringAccess(req));
  }

  @Delete(':id/estudio-previo/documentos/:documentoId')
  @Puede('editar', '3.1')
  @ApiOperation({
    summary: 'Retirar un documento del estudio previo',
    description:
      'Queda la traza de que se cargó y de que se retiró, con quién y cuándo. El archivo en disco se conserva: el expediente debe poder probar qué se entregó.',
  })
  retirarAdjunto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentoId', ParseUUIDPipe) documentoId: string,
    @Req() req: any,
  ) {
    return this.service.retirarAdjunto(id, documentoId, getHiringAccess(req));
  }

  @Put(':id/estudio-previo/documentos/:documentoId')
  @Puede('editar', '3.1')
  @UseInterceptors(
    FileInterceptor('file', {
      defParamCharset: NOMBRE_EN_UTF8,
      storage: diskStorage({
        destination: STORAGE_PATH,
        filename: (_req, file, cb) =>
          cb(null, `${randomBytes(16).toString('hex')}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 25 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        MIME_PERMITIDOS.includes(file.mimetype)
          ? cb(null, true)
          : cb(new BadRequestException('Solo se admiten archivos PDF, Word o Excel'), false),
    }),
  )
  @ApiOperation({
    summary: 'Reemplazar un documento del estudio previo',
    description:
      'Retira el documento y adjunta el nuevo en una sola operación. Queda una traza de REEMPLAZAR con el documento anterior y el nuevo enlazados, en vez de un ANULAR y un ADJUNTAR sueltos.',
  })
  async reemplazarAdjunto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentoId', ParseUUIDPipe) documentoId: string,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    const hash = await sha256Archivo(join(STORAGE_PATH, file.filename));
    return this.service.reemplazarAdjunto(id, documentoId, file, hash, getHiringAccess(req));
  }

  // ---------------------------------------------- lista de chequeo (3.1) ---
  //
  // Los documentos de la lista —el estudio previo firmado y lo que lo acompaña
  // al radicar— van por la ruta de documentos de la actividad, como los de
  // cualquier otra (EFDS-2066). Aquí queda solo el radicado, que no es un
  // documento.

  @Get(':id/estudio-previo/radicado')
  @Puede('ver', '3.1')
  @ApiOperation({
    summary: 'Radicado de Active Document con el que se remitió el paquete',
  })
  radicado(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.radicado(id);
  }

  @Post(':id/estudio-previo/radicado')
  @Puede('editar', '3.1')
  @ApiOperation({
    summary: 'Anotar el radicado de Active Document con el que se remitió el paquete',
    description:
      'Sin integración con el aplicativo: lo transcribe quien radicó. Opcional, porque el procedimiento admite remitir por correo o por carpeta compartida, vías que no generan consecutivo; mandarlo vacío lo borra.',
  })
  anotarRadicado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AnotarRadicadoDto,
    @Req() req: any,
  ) {
    return this.service.anotarRadicadoDeLaRadicacion(
      id,
      dto.radicado ?? null,
      getHiringAccess(req),
    );
  }
}
