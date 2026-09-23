import {
  Controller,
  Get,
  Post,
  Put,
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
import {
  CreateMantenimientoDto,
  UpdateMantenimientoEstadoDto,
  RemitirATIDto,
  IniciarValoracionDto,
  GuardarValoracionCompletaDto,
  ConfirmarRecepcionInsumosDto,
} from './dto/create-mantenimiento.dto.js';
import { CerrarTecnicamenteDto } from './dto/cerrar-tecnicamente.dto.js';
import { ConfirmarConformidadDto } from './dto/confirmar-conformidad.dto.js';
import { RechazarConformidadDto } from './dto/rechazar-conformidad.dto.js';
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
  // EFDS-1733-bis HUECO 1: Parámetros tiempo respuesta POR CATEGORÍA
  // (RF-INF-004 L104 TD-FO: "El tiempo POR CATEGORÍA parametriza 1..3 días").
  // listarParametrosTiempoPorCategoria devuelve array 8 filas (47..54).
  // GET por idCategoria → path opcional query ?idCategoria=48.
  // PATCH obligatorio idCategoria.
  // ---------------------------------------------------------------------------
  @Get('parametros/tiempo-respuesta')
  @ApiOperation({
    summary:
      'EFDS-1733-bis: Listar los 8 parámetros tiempo-respuesta POR CATEGORÍA (47..54). Si envía ?idCategoria=48 devuelve 1 sola; si no, array 8.',
  })
  obtenerParametroTiempoRespuesta(@Query('idCategoria') idCategoria?: string) {
    const parsed = (idCategoria && String(idCategoria).trim() !== '' && Number.isInteger(+idCategoria))
      ? Number(idCategoria)
      : undefined;
    if (parsed !== undefined) {
      return this.mantenimientoService.obtenerParametroTiempoRespuesta(parsed);
    }
    return this.mantenimientoService.listarParametrosTiempoPorCategoria();
  }

  @Patch('parametros/tiempo-respuesta')
  @ApiOperation({
    summary:
      'EFDS-1733-bis: Actualizar parámetro tiempo-respuesta POR CATEGORÍA. Body requiere {idCategoria (47..54), dias (1..3)}. Fuera rango BadRequest 400.',
  })
  actualizarParametroTiempoRespuesta(@Body() body: { idCategoria: number; dias: number }) {
    return this.mantenimientoService.actualizarParametroTiempoRespuesta(
      Number(body?.idCategoria),
      Number(body?.dias),
    );
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
      'EFDS-1733: Listar técnicos mantenimiento con columna extra cargaVigente (conteo solicitudes RECIBIDA/ASIGNADA/EN_PROGRESO/EN_ANALISIS area UMI). Por defecto solo activos; use ?incluirInactivos=true para también listar inactivos (cargaVigente=0, soft-delete visual Admin).',
  })
  listarTecnicosConCargaVigente(@Query('incluirInactivos') incluirInactivos?: string) {
    const todos = String(incluirInactivos || '').toLowerCase() === 'true';
    return this.mantenimientoService.listarTecnicosConCargaVigente(todos);
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

  // ---------------------------------------------------------------------------
  // EFDS-1734 RF-INF-005: 3 acciones análisis (aprobar-asignar / rechazar / redistribuir)
  // Guard clause por roles dentro del service (SUPER_ADMIN | GESTOR_MANTENIMIENTO).
  // Declarados ANTES de POST() radicar y ANTES de GET :id wildcard para evitar routing conflict.
  // ---------------------------------------------------------------------------
  @Post(':idSolicitud/aprobar-asignar')
  @ApiOperation({
    summary:
      'EFDS-1734 RF-INF-005 AC-01: Aprobar una solicitud. Si areaResponsableActual = TI: confirma recepción remisión a Oficina TI (tecnicoCodigo OPCIONAL). Si UMI: asigna técnico obligatorio y pasa estado ASIGNADA. Limpia motivoRechazo si la solicitud había sido previamente rechazada. Solo SUPER_ADMIN o GESTOR_MANTENIMIENTO.',
  })
  @ApiResponse({ status: 200, description: 'Solicitud aprobada. Histórico auditoría actualizado.' })
  @ApiResponse({ status: 400, description: 'Técnico inactivo/inexistente o faltante en flujo UMI físico.' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente (requiere SUPER_ADMIN o GESTOR_MANTENIMIENTO).' })
  aprobarYAsignar(
    @Param('idSolicitud') idSolicitud: string,
    @Body()
    body: {
      tecnicoCodigo?: string | null;
      observaciones?: string | null;
    },
    @Req() req: any,
  ) {
    return this.mantenimientoService.aprobarYAsignar(idSolicitud, body, req?.user);
  }

  @Post(':idSolicitud/rechazar')
  @ApiOperation({
    summary:
      'EFDS-1734 RF-INF-005 AC-02: Rechazar una solicitud. Estado pasa a RECHAZADA, motivoRechazo (≥10 chars obligatorio) visible por el solicitante en findById/listado, responsableAsignado se limpia. Solo SUPER_ADMIN o GESTOR_MANTENIMIENTO.',
  })
  @ApiResponse({ status: 200, description: 'Solicitud rechazada. Motivo persistido y visible al solicitante.' })
  @ApiResponse({ status: 400, description: 'Motivo de rechazo vacío o longitud menor a 10 caracteres.' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente (requiere SUPER_ADMIN o GESTOR_MANTENIMIENTO).' })
  rechazar(
    @Param('idSolicitud') idSolicitud: string,
    @Body()
    body: {
      motivo: string;
      observaciones?: string | null;
    },
    @Req() req: any,
  ) {
    return this.mantenimientoService.rechazar(idSolicitud, body, req?.user);
  }

  @Post(':idSolicitud/redistribuir')
  @ApiOperation({
    summary:
      'EFDS-1734 RF-INF-005 AC-01: Redistribuir asignación (cambio de técnico o reactivación desde RECIBIDA/RECHAZADA). Si estado=RECIBIDA/RECHAZADA pasa automáticamente a ASIGNADA; si ASIGNADA/EN_ANALISIS/EN_PROGRESO mantiene estado. Motivo redistribución opcional. Solo SUPER_ADMIN o GESTOR_MANTENIMIENTO.',
  })
  @ApiResponse({ status: 200, description: 'Técnico redistribuido. Histórico auditoría actualizado.' })
  @ApiResponse({ status: 400, description: 'Técnico inactivo/inexistente.' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente (requiere SUPER_ADMIN o GESTOR_MANTENIMIENTO).' })
  redistribuir(
    @Param('idSolicitud') idSolicitud: string,
    @Body()
    body: {
      tecnicoCodigo: string;
      motivoRedistribucion?: string | null;
      observaciones?: string | null;
    },
    @Req() req: any,
  ) {
    return this.mantenimientoService.redistribuir(idSolicitud, body, req?.user);
  }

  // ---------------------------------------------------------------------------
  // EFDS-1735 RF-INF-006: Valoración en campo y registro de insumos requeridos
  // Rutas estaticas /valoraciones/* DECLARADAS ANTES de wildcard :id y :idSolicitud
  // para evitar routing conflict.
  // ---------------------------------------------------------------------------
  @Get('valoraciones/mis-asignadas')
  @ApiOperation({
    summary:
      'EFDS-1735 RF-INF-006: Listar las valoraciones pendientes asignadas al técnico autenticado. Útil para bandeja personalizada de campo.',
  })
  @ApiQuery({ name: 'estado', required: false, description: 'Filtrar valoraciones por estado (EN_CAMPO_VALORACION | EN_ESPERA_DE_INSUMOS).' })
  listarMisValoracionesAsignadas(@Req() req: any, @Query('estado') estado?: string) {
    return this.mantenimientoService.listarValoraciones(null, req?.user, estado);
  }

  @Put('valoraciones/:idValoracion')
  @ApiOperation({
    summary:
      'EFDS-1735 RF-INF-006 AC-01..AC-03: Guardar valoración completa (diagnóstico + alcance + insumos + evidencias). Si hay materiales NO_DISPONIBLES: pasa solicitud a EN_ESPERA_DE_INSUMOS y extiende SLA automáticamente. Si cero insumos o todos DISPONIBLES: pasa a EN_PROGRESO. Sólo técnico asignado, Encargado o SUPER_ADMIN.',
  })
  @ApiResponse({ status: 200, description: 'Valoración guardada. Solicitud transiciona EN_PROGRESO o EN_ESPERA_DE_INSUMOS según insumos.' })
  @ApiResponse({ status: 400, description: 'Validación fallida: diagnóstico/alcance <10 chars, tiempo <0.25h, CS_002 requiereApagado undefined, insumo NO_DISPONIBLE sin tiempoAdquisicion.' })
  @ApiResponse({ status: 403, description: 'Usuario no es técnico asignado, o Multipropósito intentando valorar CS_002.' })
  @ApiResponse({ status: 409, description: 'Solicitud no está EN_CAMPO_VALORACION o valoración no pertenece a solicitud.' })
  guardarValoracionCompleta(
    @Param('idValoracion') idValoracion: string,
    @Body() dto: GuardarValoracionCompletaDto,
    @Req() req: any,
  ) {
    return this.mantenimientoService.guardarValoracionCompleta(idValoracion, dto, req?.user);
  }

  // ---------------------------------------------------------------------------
  // EFDS-1735 RF-INF-006: Acciones sobre una solicitud (:idSolicitud)
  // Declaradas ANTES de :id wildcard para evitar colisiones con GET /:id.
  // ---------------------------------------------------------------------------
  @Post(':idSolicitud/iniciar-ejecucion-directa')
  @ApiOperation({
    summary:
      'EFDS-1735 RF-INF-006: Inicio ejecución DIRECTA SIN valoración previa (alcance evidente). Estado ASIGNADA → EN_PROGRESO. Sólo técnico asignado. Multipropósito NO puede usar en CS_002 (403).',
  })
  @ApiResponse({ status: 200, description: 'Solicitud pasa a EN_PROGRESO. Se registra INICIO_EJECUCION_DIRECTA en historial.' })
  @ApiResponse({ status: 403, description: 'Técnico Multipropósito en CS_002 o usuario no asignado.' })
  @ApiResponse({ status: 409, description: 'Solicitud no está en estado ASIGNADA.' })
  iniciarEjecucionDirecta(@Param('idSolicitud') idSolicitud: string, @Req() req: any) {
    return this.mantenimientoService.iniciarEjecucionDirecta(idSolicitud, req?.user);
  }

  @Post(':idSolicitud/iniciar-valoracion')
  @ApiOperation({
    summary:
      'EFDS-1735 RF-INF-006: Iniciar valoración previa (crea borrador SolicitudValoracion, estado solicitud pasa ASIGNADA → EN_CAMPO_VALORACION). Sólo técnico asignado o Encargado. Multipropósito 403 en CS_002.',
  })
  @ApiResponse({ status: 201, description: 'Borrador de valoración creado. Solicitud EN_CAMPO_VALORACION.' })
  @ApiResponse({ status: 403, description: 'Multipropósito sobre CS_002 o usuario no autorizado.' })
  @ApiResponse({ status: 409, description: 'Solicitud no está ASIGNADA o ya tiene valoración abierta.' })
  iniciarValoracion(
    @Param('idSolicitud') idSolicitud: string,
    @Body() dto: IniciarValoracionDto,
    @Req() req: any,
  ) {
    return this.mantenimientoService.iniciarValoracion(idSolicitud, dto, req?.user);
  }

  @Post(':idSolicitud/confirmar-recepcion-insumos')
  @ApiOperation({
    summary:
      'EFDS-1735 RF-INF-006 AC-03: Encargado UMI confirma recepción física de materiales. Estado EN_ESPERA_DE_INSUMOS → EN_PROGRESO. Sólo SUPER_ADMIN o GESTOR_MANTENIMIENTO.',
  })
  @ApiResponse({ status: 200, description: 'Materiales confirmados. Solicitud pasa a EN_PROGRESO.' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente (no Encargado/Asignador).' })
  @ApiResponse({ status: 409, description: 'Solicitud no está en EN_ESPERA_DE_INSUMOS.' })
  confirmarRecepcionInsumos(
    @Param('idSolicitud') idSolicitud: string,
    @Body() dto: ConfirmarRecepcionInsumosDto,
    @Req() req: any,
  ) {
    return this.mantenimientoService.confirmarRecepcionInsumos(idSolicitud, dto, req?.user);
  }

  @Get(':idSolicitud/valoraciones')
  @Public()
  @ApiOperation({
    summary:
      'EFDS-1735 RF-INF-006: Historial de valoraciones de una solicitud (ordenado fecha DESC, incluye relación insumos). Si estado=EN_CAMPO_VALORACION devuelve la valoración abierta para edición.',
  })
  listarValoraciones(@Param('idSolicitud') idSolicitud: string) {
    return this.mantenimientoService.listarValoraciones(idSolicitud, null, null);
  }

  // ---------------------------------------------------------------------------
  // EFDS-1736 RF-INF-007: Cierre Técnico de Ejecución
  // Declaradas ANTES de wildcard :id para evitar colisiones.
  // ---------------------------------------------------------------------------
  @Get(':idSolicitud/cierre-tecnico')
  @Public()
  @ApiOperation({
    summary:
      'EFDS-1736 RF-INF-007: Resumen del cierre técnico de la solicitud (estado COMPLETADA). Si no hay cierre retorna {cerrado:false}. Campos: fecha, técnico, trabajo realizado, costo final, evidencias, seguimiento.',
  })
  obtenerCierreTecnico(@Param('idSolicitud') idSolicitud: string, @Req() req: any) {
    return this.mantenimientoService.obtenerCierreTecnico(idSolicitud, req?.user);
  }

  @Post(':idSolicitud/cerrar-tecnicamente')
  @ApiOperation({
    summary:
      'EFDS-1736 RF-INF-007: Cierre técnico oficial de la ejecución. Estado EN_PROGRESO → COMPLETADA. Requiere mínimo 1 evidencia fotográfica, trabajo realizado min 15 chars. Guardia usuarioPuedeOperarComoTecnicoAsignado (403), Guardia CS_002 no multipropósito en eléctrica (403), Guardia transición sólo EN_PROGRESO (409). SUPER_ADMIN bypass total.',
  })
  @ApiResponse({ status: 200, description: 'Solicitud pasa a COMPLETADA. CIERRE_TECNICO registrado en JSONB asignaciones.' })
  @ApiResponse({ status: 400, description: 'Validación: evidencias < 1, trabajo < 15 chars, costo < 0.' })
  @ApiResponse({ status: 403, description: 'Usuario no técnico asignado o Multipropósito en CS_002.' })
  @ApiResponse({ status: 409, description: 'Solicitud no está EN_PROGRESO.' })
  cerrarTecnicamente(
    @Param('idSolicitud') idSolicitud: string,
    @Body() dto: CerrarTecnicamenteDto,
    @Req() req: any,
  ) {
    return this.mantenimientoService.cerrarTecnicamente(idSolicitud, dto, req?.user);
  }

  // ---------------------------------------------------------------------------
  // EFDS-1737 RF-INF-008: Conformidad del Área Solicitante
  // Declaradas ANTES de wildcard :id para evitar colisiones.
  // ---------------------------------------------------------------------------
  @Post('ejecutar-cierres-sin-respuesta')
  @ApiOperation({
    summary:
      'EFDS-1737: Cierre automático de todas las COMPLETADAS cuyo plazo de conformidad venció. Resultado: CERRADA_SIN_ATENCION. Guardia roles SUPER_ADMIN/GESTOR. Devuelve {actualizadas, ids}.',
  })
  @ApiResponse({ status: 200, description: 'Proceso batch ejecutado. Retorna N y lista de IDs afectados.' })
  @ApiResponse({ status: 403, description: 'Rol no permitido.' })
  ejecutarCierresSinRespuesta(@Req() req: any) {
    return this.mantenimientoService.ejecutarCierresSinRespuestaVencidos(req?.user);
  }

  @Post(':idSolicitud/conformidad/confirmar')
  @ApiOperation({
    summary:
      'EFDS-1737: Confirmación positiva del área solicitante. COMPLETADA → CERRADA. Guardia usuario ES solicitante o bypass admin. Observaciones opcionales.',
  })
  @ApiResponse({ status: 200, description: 'Solicitud CERRADA CONFIRMADA. Evento CONFORMIDAD_CONFIRMADA en historial.' })
  @ApiResponse({ status: 403, description: 'Usuario NO es solicitante ni administrador.' })
  @ApiResponse({ status: 409, description: 'Estado distinto de COMPLETADA.' })
  confirmarConformidad(
    @Param('idSolicitud') idSolicitud: string,
    @Body() dto: ConfirmarConformidadDto,
    @Req() req: any,
  ) {
    return this.mantenimientoService.confirmarConformidad(idSolicitud, dto, req?.user);
  }

  @Post(':idSolicitud/conformidad/rechazar')
  @ApiOperation({
    summary:
      'EFDS-1737: Devolución por observaciones del área solicitante. COMPLETADA → EN_PROGRESO con SLA NUEVO 24h. Observaciones OBLIGATORIAS min 20 chars. No nulea cierre técnico (preservado para trazabilidad).',
  })
  @ApiResponse({ status: 200, description: 'Reapertura a EN_PROGRESO con SLA nuevo. Evento CONFORMIDAD_RECHAZADA_Y_REABIERTA.' })
  @ApiResponse({ status: 400, description: 'Observaciones < 20 caracteres.' })
  @ApiResponse({ status: 403, description: 'Usuario NO es solicitante ni administrador.' })
  @ApiResponse({ status: 409, description: 'Estado distinto de COMPLETADA.' })
  rechazarConformidad(
    @Param('idSolicitud') idSolicitud: string,
    @Body() dto: RechazarConformidadDto,
    @Req() req: any,
  ) {
    return this.mantenimientoService.rechazarConformidadYReabrir(idSolicitud, dto, req?.user);
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
