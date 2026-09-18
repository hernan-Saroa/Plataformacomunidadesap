import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { MantenimientoService } from './mantenimiento.service.js';
import { CreateMantenimientoDto, UpdateMantenimientoEstadoDto, RemitirATIDto } from './dto/create-mantenimiento.dto.js';
import { Public } from '../auth/public.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

const MAX_SIZE_20MB = 20 * 1024 * 1024;
const MIMES_PERMITIDOS = /^(image\/(png|jpe?g|gif|webp|heic|heif)|application\/pdf)$/i;

@ApiTags('Mantenimiento e Infraestructura')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mantenimiento')
export class MantenimientoController {
  constructor(private readonly mantenimientoService: MantenimientoService) {}

  // ---------------------------------------------------------------------------
  // Catálogos
  // ---------------------------------------------------------------------------
  @Get('catalogos/:nombre')
  @Public()
  @ApiOperation({ summary: 'Obtener un catálogo parametrizable (TIPO_MANTENIMIENTO, PRIORIDAD, TIPO_ATENCION, ESTADO_SOLICITUD, CATEGORIA_SERVICIO)' })
  getCatalogo(@Param('nombre') nombre: string) {
    const permitidos = ['TIPO_MANTENIMIENTO', 'PRIORIDAD', 'TIPO_ATENCION', 'ESTADO_SOLICITUD', 'CATEGORIA_SERVICIO'];
    if (!permitidos.includes(nombre)) {
      throw new BadRequestException(`Catálogo ${nombre} no permitido. Usa uno de: ${permitidos.join(', ')}`);
    }
    return this.mantenimientoService.getCatalogo(nombre, true);
  }

  // ---------------------------------------------------------------------------
  // Solicitudes
  // ---------------------------------------------------------------------------
  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar solicitudes de mantenimiento (bandeja general). UMI filtra por defecto area UMI/PENDIENTE; use ?incluirTI=true para ver también las remitidas a TI.' })
  @ApiQuery({ name: 'estado', required: false })
  @ApiQuery({ name: 'prioridad', required: false })
  @ApiQuery({ name: 'idCategoria', required: false, description: 'Filtrar por categoria servicio EFDS-1732 (idCatalogo CATEGORIA_SERVICIO, 47..54 = CS_001..CS_008)' })
  @ApiQuery({ name: 'incluirTI', required: false, description: 'Si true, incluye también solicitudes con area_responsable_actual = TI. Default false para usuarios UMI.' })
  findAll(
    @Query('estado') estado?: string,
    @Query('prioridad') prioridad?: string,
    @Query('incluirTI') incluirTI?: string,
    @Query('idCategoria') idCategoria?: string,
    @Req() req?: any,
  ) {
    const incluir = String(incluirTI || '').toLowerCase() === 'true';
    const idCatParsed = (idCategoria && idCategoria.trim() !== '' && Number.isInteger(+idCategoria)) ? Number(idCategoria) : undefined;
    return this.mantenimientoService.findAll(estado, prioridad, incluir, idCatParsed, req?.user || null);
  }

  @Get('mis-solicitudes')
  @ApiOperation({ summary: 'Consultar las solicitudes radicadas por el usuario autenticado' })
  @ApiResponse({ status: 403, description: 'Usuario no autenticado' })
  findMisSolicitudes(@Req() req: any) {
    const usuarioId = req?.user?.userId;
    return this.mantenimientoService.findByUsuario(usuarioId);
  }

  // ---------------------------------------------------------------------------
  // CRUD MINI categorías de servicio (EFDS-1732 mini).
  // Declarado ANTES de @Get(':id') para que el path estatico 'categorias-servicio'
  // no sea capturado por el comodín :id que espera un UUID de solicitud.
  // ---------------------------------------------------------------------------

  @Get('categorias-servicio')
  @Public()
  @ApiOperation({
    summary:
      'Listar todas las categorías de servicio (8 oficiales precargadas CS_001..CS_008 + nuevas que se creen). Use ?soloActivos=true para filtrar solo las activas.',
  })
  listarCategoriasServicio(@Query('soloActivos') soloActivos?: string) {
    const activos = String(soloActivos || '').toLowerCase() === 'true';
    return this.mantenimientoService.listarCategoriasServicio(
      soloActivos === undefined ? undefined : activos,
    );
  }

  @Post('categorias-servicio')
  @Public()
  @ApiOperation({
    summary:
      'Crear una nueva categoría de servicio (por ejemplo CS_009 Servicios Especiales). El orden se autoasigna si no se envía. Si el código se repite devuelve 409 Conflict.',
  })
  crearCategoriaServicio(
    @Body()
    body: {
      codigo: string;
      nombre: string;
      descripcion?: string;
      orden?: number;
      isActivo?: boolean;
      color?: string;
    },
  ) {
    return this.mantenimientoService.crearCategoriaServicio(body);
  }

  @Patch('categorias-servicio/:id')
  @Public()
  @ApiOperation({
    summary:
      'Actualizar una categoría de servicio por id. Permite modificar codigo, nombre, descripcion, orden, isActivo y color. Código duplicado devuelve 409.',
  })
  actualizarCategoriaServicio(
    @Param('id', ParseIntPipe) idCatalogo: number,
    @Body()
    body: {
      nombre?: string;
      descripcion?: string;
      orden?: number;
      codigo?: string;
      isActivo?: boolean;
      color?: string;
    },
  ) {
    return this.mantenimientoService.actualizarCategoriaServicio(idCatalogo, body);
  }

  @Patch('categorias-servicio/:id/toggle')
  @Public()
  @ApiOperation({
    summary: 'Toggle rápido activar/desactivar una categoría de servicio. Devuelve el item actualizado.',
  })
  toggleCategoriaServicio(@Param('id', ParseIntPipe) idCatalogo: number) {
    return this.mantenimientoService.toggleCategoriaServicio(idCatalogo);
  }

  @Delete('categorias-servicio/:id')
  @Public()
  @ApiOperation({
    summary: 'Eliminar una categoría de servicio por id. Devuelve eliminado:true si se borró correctamente.',
  })
  eliminarCategoriaServicio(@Param('id', ParseIntPipe) idCatalogo: number) {
    return this.mantenimientoService.eliminarCategoriaServicio(idCatalogo);
  }

  // ---------------------------------------------------------------------------
  // EFDS-1733: Parámetros globales UMI (tiempo respuesta)
  // ---------------------------------------------------------------------------
  @Get('parametros/tiempo-respuesta')
  @ApiOperation({
    summary:
      'EFDS-1733 AC-03: Consultar el parámetro global de tiempo máximo respuesta en días naturales (rango 1..3 = 24..72h).',
  })
  obtenerParametroTiempoRespuesta() {
    return this.mantenimientoService.obtenerParametroTiempoRespuesta();
  }

  @Patch('parametros/tiempo-respuesta')
  @ApiOperation({
    summary:
      'EFDS-1733 AC-03: Actualizar el parámetro global de tiempo máximo respuesta. Valor entero de 1 a 3 días. Restringe: <1 o >3 lanza BadRequest 400.',
  })
  actualizarParametroTiempoRespuesta(@Body() body: { dias: number }) {
    return this.mantenimientoService.actualizarParametroTiempoRespuesta(Number(body?.dias));
  }

  @Get('parametros/reglas-escalamiento')
  @ApiOperation({
    summary:
      'EFDS-1733: Listar las 2 reglas de escalamiento oficiales (001 eléctrica especialista / 002 equidad carga menor resto 7 categorías).',
  })
  listarReglasEscalamiento() {
    return this.mantenimientoService.listarReglasEscalamiento();
  }

  @Patch('parametros/reglas-escalamiento/:idRegla')
  @ApiOperation({
    summary:
      'EFDS-1733: Actualizar una regla de escalamiento. Principal uso: ligar un técnico al regla_001 eléctrica. body.tecnicoCodigo = string o null para desligar.',
  })
  actualizarReglaEscalamiento(
    @Param('idRegla', ParseIntPipe) idRegla: number,
    @Body()
    body: {
      tecnicoCodigo?: string | null;
      isActivo?: boolean;
      metadata?: Record<string, any>;
    },
  ) {
    return this.mantenimientoService.actualizarReglaEscalamiento(idRegla, body);
  }

  // ---------------------------------------------------------------------------
  // EFDS-1733: Técnicos mantenimiento
  // ---------------------------------------------------------------------------
  @Get('tecnicos')
  @ApiOperation({
    summary:
      'EFDS-1733: Listar técnicos mantenimiento (catálogo TECNICO_MANTENIMIENTO). Por defecto solo activos; use ?soloActivos=false para todos.',
  })
  listarTecnicos(@Query('soloActivos') soloActivos?: string) {
    const activos =
      soloActivos === undefined
        ? true
        : String(soloActivos).toLowerCase() === 'true';
    return this.mantenimientoService.listarTecnicos(activos);
  }

  @Get('tecnicos/con-carga-vigente')
  @ApiOperation({
    summary:
      'EFDS-1733: Listar técnicos activos con columna extra cargaVigente (conteo solicitudes RECIBIDA/ASIGNADA/EN_PROGRESO/EN_ANALISIS area UMI).',
  })
  listarTecnicosConCargaVigente() {
    return this.mantenimientoService.listarTecnicosConCargaVigente();
  }

  @Get('tecnicos/:idTecnico/carga-vigente')
  @ApiOperation({
    summary: 'EFDS-1733: Carga vigente puntual de un técnico por ID catalogo_item.',
  })
  async getCargaVigenteTecnico(@Param('idTecnico', ParseIntPipe) idTecnico: number) {
    const tecnico = await this.mantenimientoService['catalogoRepo'].findOne({
      // fallback usando el service method usando codigo. Buscamos por pk y usamos service method con codigo.
      where: {
        catalogo: 'TECNICO_MANTENIMIENTO',
        idCatalogo: idTecnico,
      },
    } as any);
    if (!tecnico) {
      throw new NotFoundException(`Técnico #${idTecnico} no existe.`);
    }
    const carga = await this.mantenimientoService.calcularCargaVigenteTecnico(tecnico.codigo);
    return { idTecnico, codigo: tecnico.codigo, nombre: tecnico.nombre, cargaVigente: carga };
  }

  @Post('tecnicos')
  @ApiOperation({
    summary:
      'EFDS-1733: Crear un técnico mantenimiento (catálogo TECNICO_MANTENIMIENTO). Validaciones: codigo min 4, nombre min 4, dup código 409.',
  })
  crearTecnico(
    @Body()
    body: {
      codigo: string;
      nombre: string;
      email?: string;
      telefono?: string;
      especialidades?: string[];
      orden?: number;
      isActivo?: boolean;
    },
  ) {
    return this.mantenimientoService.crearTecnico(body);
  }

  @Patch('tecnicos/:idTecnico')
  @ApiOperation({
    summary:
      'EFDS-1733: Actualizar técnico mantenimiento por id (codigo, nombre, email, telefono, especialidades, orden, isActivo).',
  })
  actualizarTecnico(
    @Param('idTecnico', ParseIntPipe) idTecnico: number,
    @Body()
    body: {
      codigo?: string;
      nombre?: string;
      email?: string;
      telefono?: string;
      especialidades?: string[];
      orden?: number;
      isActivo?: boolean;
    },
  ) {
    return this.mantenimientoService.actualizarTecnico(idTecnico, body);
  }

  @Patch('tecnicos/:idTecnico/toggle')
  @ApiOperation({
    summary: 'EFDS-1733: Toggle rápido activo/inactivo de un técnico mantenimiento.',
  })
  toggleTecnico(@Param('idTecnico', ParseIntPipe) idTecnico: number) {
    return this.mantenimientoService.toggleTecnico(idTecnico);
  }

  @Delete('tecnicos/:idTecnico')
  @ApiOperation({
    summary: 'EFDS-1733: Eliminar un técnico de mantenimiento por id (eliminación lógica de catalogo_item pk).',
  })
  eliminarTecnico(@Param('idTecnico', ParseIntPipe) idTecnico: number) {
    return this.mantenimientoService.eliminarTecnico(idTecnico);
  }

  // ---------------------------------------------------------------------------
  // EFDS-1733: Motor sugerir asignación
  // ---------------------------------------------------------------------------
  @Post(':idSolicitud/sugerir-asignacion')
  @ApiOperation({
    summary:
      'EFDS-1733: Sugerir técnico para una solicitud. Si eléctricas (idCategoria=48) regla ESPECIALIZACION obligatoria. Resto categorías: EQUIDAD menor carga vigente.',
  })
  sugerirAsignacion(@Param('idSolicitud') idSolicitud: string) {
    return this.mantenimientoService.sugerirAsignacion(idSolicitud);
  }

  @Post()
  @ApiOperation({ summary: 'Radicación oficial de una solicitud de mantenimiento (EFDS-1730)' })
  @ApiResponse({ status: 201, description: 'Solicitud radicada con consecutivo y estado RECIBIDA' })
  @ApiResponse({ status: 400, description: 'Datos invalidos o sede inactiva' })
  @ApiResponse({ status: 403, description: 'Usuario no autenticado' })
  create(@Body() dto: CreateMantenimientoDto, @Req() req: any) {
    const user = req?.user;
    return this.mantenimientoService.create(dto, user);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Obtener detalle de una solicitud de mantenimiento' })
  findById(@Param('id') id: string) {
    return this.mantenimientoService.findById(id);
  }

  @Patch(':id/estado')
  @Public()
  @ApiOperation({ summary: 'Actualizar estado y responsable de una solicitud' })
  updateEstado(@Param('id') id: string, @Body() dto: UpdateMantenimientoEstadoDto) {
    return this.mantenimientoService.updateEstado(id, dto);
  }

  // ---------------------------------------------------------------------------
  // EFDS-1731: Clasificación y remisión a TI
  // ---------------------------------------------------------------------------
  @Post(':id/remitir-a-ti')
  @ApiOperation({
    summary:
      'EFDS-1731: Remitir formalmente una solicitud al área de TI con motivo obligatorio (cuando el usuario clasificó mal como FÍSICA). Inserta nueva remisión en JSONB de trazabilidad y cambia areaResponsableActual=TI + tipoAtencion=TECNOLOGICA.',
  })
  @ApiResponse({ status: 200, description: 'Remisión creada. Solicitud pasa a responsabilidad TI.' })
  @ApiResponse({ status: 400, description: 'Estado distinto a RECIBIDA/EN_ANALISIS o ya está en TI o motivo vacío.' })
  @ApiResponse({ status: 403, description: 'Usuario no autenticado' })
  remitirATI(@Param('id') id: string, @Body() dto: RemitirATIDto, @Req() req: any) {
    return this.mantenimientoService.remitirATI(id, dto, req?.user);
  }

  @Get(':id/remisiones')
  @Public()
  @ApiOperation({
    summary:
      'EFDS-1731 AC-03: Historial / trazabilidad de todas las remisiones de una solicitud (Gestión de Calidad / auditoría). Ordenado fecha DESC.',
  })
  getRemisiones(@Param('id') id: string) {
    return this.mantenimientoService.getRemisionesById(id);
  }

  // ---------------------------------------------------------------------------
  // Evidencias / Upload
  // ---------------------------------------------------------------------------
  @Post('evidencias/upload')
  @Public()
  @ApiOperation({
    summary:
      'Subir un archivo evidencia al storage (MinIO). Se pueden subir antes de radicar y luego ligar por uploadedEvidenciaIds, o después con idSolicitud opcional.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Archivo (PNG/JPG/HEIC/PDF, hasta 20MB)' },
        idSolicitud: { type: 'string', format: 'uuid', description: '(Opcional) ligar directamente a una solicitud existente' },
        orden: { type: 'integer', description: '(Opcional) orden visual, default 1' },
        notas: { type: 'string', description: '(Opcional) nota sobre la evidencia' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async subirEvidencia(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_SIZE_20MB, message: 'Archivo excede 20MB' }),
          new FileTypeValidator({ fileType: MIMES_PERMITIDOS }),
        ],
      }),
    )
    file: any,
    @Req() req: any,
    @Body() body: any,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Archivo no puede estar vacío');
    }
    return this.mantenimientoService.subirEvidencia({
      nombreOriginal: file.originalname,
      buffer: file.buffer,
      mimeType: file.mimetype,
      tamanoBytes: file.size,
      user: req?.user,
      idSolicitud: body?.idSolicitud,
      orden: body?.orden ? parseInt(body.orden, 10) : undefined,
      notas: body?.notas,
    });
  }

  @Get(':id/evidencias')
  @Public()
  @ApiOperation({ summary: 'Listar evidencias/adjuntos de una solicitud, regenera URLs firmadas si van a vencer' })
  getEvidencias(@Param('id') idSolicitud: string) {
    return this.mantenimientoService.getEvidenciasBySolicitud(idSolicitud, 48);
  }
}
