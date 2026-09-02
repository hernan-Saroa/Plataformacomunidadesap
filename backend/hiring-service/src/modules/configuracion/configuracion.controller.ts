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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { randomBytes } from 'crypto';
import { extname } from 'path';

import { ConfiguracionService } from './configuracion.service';
import { RolesGuard } from '../../auth/roles.guard';


import {
  ActualizarActividadDto,
  ActualizarCampoDto,
  AplicabilidadDto,
  AsignarPlantillaDto,
  CrearCampoDto,
  EstadoPlantillaDto,
  GuardarPlantillaDto,
  GuardarTipologiaDto,
} from './dto/configuracion.dto';
import { Permisos } from '../../auth/permisos.decorator';
import { PermisosGuard } from '../../auth/permisos.guard';

const STORAGE_PATH = process.env.HIRING_STORAGE_PATH || './uploads';

/**
 * Como se recibe el archivo de un formato.
 *
 * La comparten el alta y la edicion: en las dos se sube el mismo tipo de
 * documento, y tener dos configuraciones abriria la puerta a que una admitiera
 * lo que la otra rechaza.
 */
const RECEPCION_ARCHIVO = {
  storage: diskStorage({
    destination: STORAGE_PATH,
    filename: (_req: any, file: any, cb: any) =>
      cb(null, `${randomBytes(16).toString('hex')}${extname(file.originalname)}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) =>
    MIME_PERMITIDOS.includes(file.mimetype)
      ? cb(null, true)
      : cb(new BadRequestException('Solo se admiten archivos PDF, Word o Excel'), false),
};

/** Los formatos del SIG se publican en Word, PDF o Excel. */
const MIME_PERMITIDOS = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

/**
 * Módulo de Configuración de Etapas.
 *
 * Se expone lo que cambia sin desplegar: si una modalidad recorre una
 * actividad, y el texto que lee el gestor. Lo que cada actividad valida vive en
 * el código de su etapa, así que no hay endpoints para armar reglas desde la
 * pantalla.
 */
@ApiTags('Configuración de etapas')
@Controller('configuracion')
export class ConfiguracionController {
  constructor(private readonly service: ConfiguracionService) {}

  @Get('actividades')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.proceso.view')
  @ApiOperation({ summary: 'Las 63 actividades de la matriz, agrupadas por etapa' })
  catalogo() {
    return this.service.catalogo();
  }

  @Get('tipologias')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.proceso.view')
  @ApiOperation({
    summary: 'Tipologías de contrato',
    description: 'Las tipologías con las que se elabora un contrato (EFDS-1161).',
  })
  tipologias() {
    return this.service.tipologias();
  }

  @Post('tipologias')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({
    summary: 'Crear o ajustar una tipología',
    description:
      'La historia habla de 16 tipologías sin enumerarlas: Contratación completa la suya desde aquí en vez de pedir una migración.',
  })
  guardarTipologia(@Body() dto: GuardarTipologiaDto) {
    return this.service.guardarTipologia(dto);
  }

  @Put('tipologias/:codigo/retirar')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({
    summary: 'Retirar una tipología de circulación',
    description: 'Los contratos que ya la usaron la conservan: se desactiva, no se borra.',
  })
  retirarTipologia(@Param('codigo') codigo: string) {
    return this.service.retirarTipologia(codigo);
  }

  @Get('actividades/modalidad/:modalidad')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.proceso.view')
  @ApiOperation({
    summary: 'Actividades marcadas según apliquen o no a una modalidad',
  })
  porModalidad(@Param('modalidad') modalidad: string) {
    return this.service.actividadesDe(modalidad);
  }

  @Get('matriz')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.proceso.view')
  @ApiOperation({
    summary: 'La matriz completa: cada actividad contra cada modalidad',
  })
  matriz() {
    return this.service.matriz();
  }

  @Get('flujo/:modalidad')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.proceso.view')
  @ApiOperation({
    summary: 'El recorrido de una modalidad, etapa por etapa, con lo que se salta',
  })
  flujo(@Param('modalidad') modalidad: string) {
    return this.service.flujoDe(modalidad);
  }

  @Get('reglas/:numeral')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.proceso.view')
  @ApiOperation({ summary: 'Reglas vigentes de una actividad' })
  reglas(@Param('numeral') numeral: string, @Query('modalidad') modalidad?: string) {
    return this.service.reglasDe(numeral, modalidad ?? null);
  }

  // ------------------------------------------------------------ edicion ----
  // Cambiar una regla altera como se evaluan los procesos en curso, asi que
  // la edicion queda en el mismo rol que administra los umbrales.

  @Put('actividades/:numeral')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({ summary: 'Corregir el nombre o la descripcion de una actividad' })
  actualizarActividad(@Param('numeral') numeral: string, @Body() dto: ActualizarActividadDto) {
    return this.service.actualizarActividad(numeral, dto);
  }

  @Put('actividades/:numeral/aplicabilidad')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({ summary: 'Marcar si la actividad aplica a una modalidad' })
  cambiarAplicabilidad(@Param('numeral') numeral: string, @Body() dto: AplicabilidadDto) {
    return this.service.cambiarAplicabilidad(numeral, dto);
  }

  // ------------------------------------------- que se le pide al gestor ----
  // Lo que la actividad exige: un documento, una justificacion, una fecha, una
  // casilla o el visto bueno de alguien. Sin condiciones ni excepciones por
  // modalidad: una actividad pide lo mismo en todas las que la recorren, y lo
  // que varia entre ellas es si la recorre, que ya resuelve la aplicabilidad.

  @Get('actividades/:numeral/campos')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.proceso.view')
  @ApiOperation({ summary: 'Lo que la actividad le pide al gestor' })
  campos(@Param('numeral') numeral: string) {
    return this.service.campos(numeral);
  }

  @Post('actividades/:numeral/campos')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({ summary: 'Agregar algo que el gestor tendra que hacer' })
  crearCampo(@Param('numeral') numeral: string, @Body() dto: CrearCampoDto) {
    return this.service.crearCampo(numeral, dto);
  }

  @Put('campos/:id')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({
    summary: 'Corregir el texto de un campo o dejar de pedirlo',
    description:
      'Desactivarlo no lo borra: los procesos que ya guardaron un valor ahi lo ' +
      'conservan, y borrarlo dejaria huerfano lo diligenciado.',
  })
  actualizarCampo(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActualizarCampoDto) {
    return this.service.actualizarCampo(id, dto);
  }

  // ---------------------------------------------------------- formatos ----
  // Los documentos del proceso no se redactan en el sistema: la ESAP tiene
  // formatos aprobados en el SIG que se diligencian en Word y se firman. Estos
  // endpoints administran cual corresponde a cada actividad y modalidad.

  @Get('plantillas')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.proceso.view')
  @ApiOperation({ summary: 'Formatos registrados, opcionalmente de una actividad' })
  plantillas(@Query('numeral') numeral?: string) {
    return this.service.plantillas(numeral);
  }

  @Post('plantillas')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @UseInterceptors(FileInterceptor('file', RECEPCION_ARCHIVO))
  @ApiOperation({
    summary: 'Registrar un formato del SIG con su archivo',
    description:
      'La version la asigna el sistema. Subir un codigo que ya existe lo ' +
      'guarda como la siguiente version y retira la anterior de circulacion, ' +
      'sin borrarla: un proceso antiguo debe poder mostrar el formato que ' +
      'estaba vigente cuando se diligencio.',
  })
  guardarPlantilla(@Body() dto: GuardarPlantillaDto, @UploadedFile() file?: any) {
    // Las modalidades viajan como texto en el multipart: sin cuerpo JSON no hay
    // arreglo que el validador pueda reconocer.
    if (typeof (dto as any).modalidades === 'string') {
      const crudo = (dto as any).modalidades as string;
      dto.modalidades = crudo ? crudo.split(',').map((m) => m.trim()).filter(Boolean) : [];
    }
    return this.service.guardarPlantilla(dto, file ? `/files/${file.filename}` : null);
  }

  @Put('plantillas/:id')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @UseInterceptors(FileInterceptor('file', RECEPCION_ARCHIVO))
  @ApiOperation({
    summary: 'Corregir un formato, cambiar su archivo o retirarlo de circulacion',
    description:
      'Admite multipart para reemplazar el archivo sin crear una version nueva: ' +
      'sirve para corregir el documento que se subio equivocado. Retirar no ' +
      'borra: los procesos que ya lo descargaron conservan la referencia.',
  })
  cambiarEstadoPlantilla(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EstadoPlantillaDto,
    @UploadedFile() file?: any,
  ) {
    // En multipart todo llega como texto, incluido el booleano.
    if (typeof (dto as any).activo === 'string') {
      dto.activo = (dto as any).activo === 'true';
    }
    return this.service.cambiarEstadoPlantilla(
      id,
      dto,
      file ? `/files/${file.filename}` : undefined,
    );
  }

  @Put('plantillas/:id/actividad')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({
    summary: 'Asignar un formato de la biblioteca a una actividad',
    description:
      'El archivo se sube una vez a la biblioteca y se asigna donde corresponda: ' +
      'subirlo en cada actividad multiplicaria copias del mismo documento.',
  })
  asignarPlantilla(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AsignarPlantillaDto,
  ) {
    return this.service.asignarPlantilla(
      id,
      dto.numeral?.trim() || null,
      dto.modalidades,
    );
  }
}
