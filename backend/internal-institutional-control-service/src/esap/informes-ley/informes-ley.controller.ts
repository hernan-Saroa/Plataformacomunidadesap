import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ControlInternoPermissions as CIP } from '../../common/permissions.constants';
import { InformesLeyService } from './informes-ley.service';
import { InformeGeneratorService } from './services/informe-generator.service';
import { PlantillasService } from './services/plantillas.service';
import { WorkflowAprobacionService } from './services/workflow-aprobacion.service';
import { DafValidatorService } from './services/daf-validator.service';
import { CreateInformeLeyDto } from './dto/create-informe-ley.dto';
import { UpdateInformeLeyDto } from './dto/update-informe-ley.dto';
import { CreateEntregaDto } from './dto/create-entrega.dto';
import { UpdateEntregaDto } from './dto/update-entrega.dto';
import { GenerarInformeDto } from './dto/generar-informe.dto';
import { EnviarRevisionDto } from './dto/enviar-revision.dto';
import { AprobarInformeDto } from './dto/aprobar-informe.dto';
import { RechazarInformeDto } from './dto/rechazar-informe.dto';

// Tipo para el archivo subido
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

@Controller('informes-ley')
export class InformesLeyController {
  constructor(
    private readonly informesLeyService: InformesLeyService,
    private readonly informeGeneratorService: InformeGeneratorService,
    private readonly plantillasService: PlantillasService,
    private readonly workflowAprobacionService: WorkflowAprobacionService,
    private readonly dafValidatorService: DafValidatorService,
  ) {}

  // ==================== CRUD INFORMES ====================

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_VIEW)
  findAll(
    @Query('categoria') categoria?: string,
    @Query('periodicidad') periodicidad?: string,
    @Query('activo') activo?: string,
    @Query('search') search?: string,
  ) {
    return this.informesLeyService.findAll({
      categoria,
      periodicidad,
      activo: activo === 'true' ? true : activo === 'false' ? false : undefined,
      search,
    });
  }

  @Get('estadisticas')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_VIEW)
  getEstadisticas() {
    return this.informesLeyService.getEstadisticas();
  }

  @Get('estadisticas/categoria')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_VIEW)
  getEstadisticasPorCategoria() {
    return this.informesLeyService.getEstadisticasPorCategoria();
  }

  @Get('estadisticas/periodicidad')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_VIEW)
  getEstadisticasPorPeriodicidad() {
    return this.informesLeyService.getEstadisticasPorPeriodicidad();
  }

  @Get('calendario/:year')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_VIEW)
  getCalendarioAnual(@Param('year') year: string) {
    return this.informesLeyService.getCalendarioAnual(parseInt(year, 10));
  }

  @Get('proximos-vencimientos')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_VIEW)
  getProximosVencimientos(@Query('dias') dias?: string) {
    return this.informesLeyService.getProximosVencimientos(dias ? parseInt(dias, 10) : 7);
  }

  @Get('vencidos')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_VIEW)
  getEntregasVencidas() {
    return this.informesLeyService.getEntregasVencidas();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_VIEW)
  findOne(@Param('id') id: string) {
    return this.informesLeyService.findOne(id);
  }

  @Get('codigo/:codigo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_VIEW)
  findByCodigo(@Param('codigo') codigo: string) {
    return this.informesLeyService.findByCodigo(codigo);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_CREATE)
  create(@Body() createDto: CreateInformeLeyDto) {
    return this.informesLeyService.create(createDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_EDIT)
  update(@Param('id') id: string, @Body() updateDto: UpdateInformeLeyDto) {
    return this.informesLeyService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.informesLeyService.delete(id);
  }

  // ==================== CRUD ENTREGAS ====================

  @Get('entregas/all')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_VIEW)
  findAllEntregas(
    @Query('informeId') informeId?: string,
    @Query('estado') estado?: string,
    @Query('periodo') periodo?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.informesLeyService.findAllEntregas({
      informeId,
      estado,
      periodo,
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
    });
  }

  @Get(':informeId/entregas')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_VIEW)
  getEntregasByInforme(@Param('informeId') informeId: string) {
    return this.informesLeyService.getEntregasByInforme(informeId);
  }

  @Get('entregas/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_VIEW)
  findOneEntrega(@Param('id') id: string) {
    return this.informesLeyService.findOneEntrega(id);
  }

  @Post('entregas')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_CREATE)
  createEntrega(@Body() createDto: CreateEntregaDto) {
    return this.informesLeyService.createEntrega(createDto);
  }

  @Patch('entregas/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_EDIT)
  updateEntrega(@Param('id') id: string, @Body() updateDto: UpdateEntregaDto) {
    return this.informesLeyService.updateEntrega(id, updateDto);
  }

  @Delete('entregas/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeEntrega(@Param('id') id: string) {
    return this.informesLeyService.deleteEntrega(id);
  }

  // ==================== FUNCIONES ESPECIALES ====================

  @Post('actualizar-estados-vencidos')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_EDIT)
  actualizarEstadosVencidos() {
    return this.informesLeyService.actualizarEstadosVencidos();
  }

  // ==================== GENERACIÓN AUTOMÁTICA (US-022) ====================

  /**
   * POST /informes-ley/:id/generar
   * Generar informe automático con datos del sistema
   */
  @Post(':id/generar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORMES_LEY_GENERATE)
  async generarInforme(
    @Param('id') id: string,
    @Body() body: GenerarInformeDto,
    @Req() req: any,
  ) {
    const usuarioId = req.user?.id || req.user?.sub;
    const usuarioNombre = req.user?.name || req.user?.nombre || 'Sistema';

    return this.informeGeneratorService.generarInformeAutomatico(
      id,
      body.periodo,
      body.datosAdicionales,
      usuarioId,
      usuarioNombre,
    );
  }

  // ==================== PLANTILLAS ====================

  @Get('plantillas/all')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_VIEW)
  async obtenerPlantillas() {
    return this.plantillasService.findAll();
  }

  @Get('plantillas/:codigo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_VIEW)
  async obtenerPlantillaPorCodigo(@Param('codigo') codigo: string) {
    return this.plantillasService.findByCodigo(codigo);
  }

  // ==================== WORKFLOW DE APROBACIÓN (US-033) ====================

  /**
   * POST /informes-ley/:informeId/entregas/:entregaId/enviar
   * Enviar informe a revisión (Auditor → Jefe OCI)
   */
  @Post(':informeId/entregas/:entregaId/enviar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_EDIT)
  async enviarRevision(
    @Param('informeId') informeId: string,
    @Param('entregaId') entregaId: string,
    @Body() dto: EnviarRevisionDto,
    @Req() req: any,
  ) {
    const usuarioId = req.user?.id || req.user?.sub || 'system';
    const usuarioNombre = req.user?.name || req.user?.nombre || 'Sistema';

    return this.workflowAprobacionService.enviarRevision(
      entregaId,
      dto,
      usuarioId,
      usuarioNombre,
      req,
    );
  }

  /**
   * POST /informes-ley/:informeId/entregas/:entregaId/aprobar
   * Aprobar informe (Jefe OCI)
   */
  @Post(':informeId/entregas/:entregaId/aprobar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_APPROVE)
  async aprobarInforme(
    @Param('informeId') informeId: string,
    @Param('entregaId') entregaId: string,
    @Body() dto: AprobarInformeDto,
    @Req() req: any,
  ) {
    const usuarioId = req.user?.id || req.user?.sub || 'system';
    const usuarioNombre = req.user?.name || req.user?.nombre || 'Sistema';

    return this.workflowAprobacionService.aprobarInforme(
      entregaId,
      dto,
      usuarioId,
      usuarioNombre,
      req,
    );
  }

  /**
   * POST /informes-ley/:informeId/entregas/:entregaId/rechazar
   * Rechazar informe (Jefe OCI)
   */
  @Post(':informeId/entregas/:entregaId/rechazar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_APPROVE)
  async rechazarInforme(
    @Param('informeId') informeId: string,
    @Param('entregaId') entregaId: string,
    @Body() dto: RechazarInformeDto,
    @Req() req: any,
  ) {
    const usuarioId = req.user?.id || req.user?.sub || 'system';
    const usuarioNombre = req.user?.name || req.user?.nombre || 'Sistema';

    return this.workflowAprobacionService.rechazarInforme(
      entregaId,
      dto,
      usuarioId,
      usuarioNombre,
      req,
    );
  }

  /**
   * GET /informes-ley/entregas/:entregaId/workflow
   * Obtener workflow de una entrega
   */
  @Get('entregas/:entregaId/workflow')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_VIEW)
  async obtenerWorkflow(@Param('entregaId') entregaId: string) {
    return this.workflowAprobacionService.obtenerWorkflow(entregaId);
  }

  /**
   * GET /informes-ley/entregas/:entregaId/historial
   * Obtener historial de una entrega
   */
  @Get('entregas/:entregaId/historial')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_VIEW)
  async obtenerHistorial(@Param('entregaId') entregaId: string) {
    return this.workflowAprobacionService.obtenerHistorial(entregaId);
  }

  // ==================== CARGA DE ARCHIVOS ====================

  /**
   * POST /informes-ley/entregas/:entregaId/upload
   * Subir archivo para una entrega de informe
   */
  @Post('entregas/:entregaId/upload')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORME_CREATE)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = process.env.UPLOAD_PATH || './uploads/informes-ley';
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          const ext = extname(file.originalname);
          cb(null, `informe_${Date.now()}_${randomName}${ext}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
          'application/msword', // .doc
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'application/vnd.ms-excel', // .xls
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Tipo de archivo no permitido. Solo se permiten PDF, Word y Excel.'), false);
        }
      },
    }),
  )
  async uploadArchivo(
    @Param('entregaId') entregaId: string,
    @UploadedFile() file: MulterFile,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    const usuarioId = req.user?.id || req.user?.sub || 'system';
    const usuarioNombre = req.user?.name || req.user?.nombre || 'Sistema';

    // Obtener información de la entrega para validación específica
    const entrega = await this.informesLeyService.findOneEntrega(entregaId);
    if (!entrega) {
      throw new NotFoundException(`Entrega con ID ${entregaId} no encontrada`);
    }

    // Obtener el informe asociado para conocer el tipo
    const informe = await this.informesLeyService.findOne(entrega.informeId);
    const tipoInforme = informe?.codigo;

    // Validar formato DAF si es un archivo Excel
    const formatoArchivo = this.getFormatoArchivo(file.mimetype);
    if (formatoArchivo === 'Excel') {
      try {
        const resultadoValidacion = await this.dafValidatorService.validarFormatoDaf(
          file.buffer,
          file.originalname,
          tipoInforme,
        );

        // Si hay errores críticos, rechazar el archivo
        if (!resultadoValidacion.valido && resultadoValidacion.errores.length > 0) {
          const mensajeErrores = resultadoValidacion.errores.join('; ');
          const mensajeAdvertencias = resultadoValidacion.advertencias.length > 0
            ? ` Advertencias: ${resultadoValidacion.advertencias.join('; ')}`
            : '';
          
          throw new BadRequestException(
            `El archivo Excel no cumple con el formato DAF requerido. Errores: ${mensajeErrores}${mensajeAdvertencias}`,
          );
        }

        // Si solo hay advertencias, registrarlas pero permitir la carga
        if (resultadoValidacion.advertencias.length > 0) {
          // Log de advertencias (podría guardarse en historial)
          console.warn(
            `Advertencias al validar archivo Excel ${file.originalname}:`,
            resultadoValidacion.advertencias,
          );
        }
      } catch (error) {
        // Si es un BadRequestException, re-lanzarlo
        if (error instanceof BadRequestException) {
          throw error;
        }
        // Otros errores de validación
        throw new BadRequestException(
          `Error al validar el formato DAF del archivo: ${error.message}`,
        );
      }
    }

    return this.informesLeyService.uploadArchivoEntrega(
      entregaId,
      {
        nombre: file.originalname,
        url: `/uploads/informes-ley/${file.filename}`,
        tamano: file.size,
        formato: formatoArchivo,
      },
      usuarioId,
      usuarioNombre,
    );
  }

  /**
   * GET /informes-ley/archivos/:nombreArchivo
   * Servir archivos de informes generados
   */
  @Get('archivos/:nombreArchivo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.INFORMES_LEY_EXPORT)
  async servirArchivo(
    @Param('nombreArchivo') nombreArchivo: string,
    @Res() res: Response,
  ) {
    const uploadPath = process.env.UPLOAD_PATH || './uploads/informes-ley';
    const rutaArchivo = join(process.cwd(), uploadPath, nombreArchivo);

    if (!existsSync(rutaArchivo)) {
      throw new NotFoundException(`Archivo ${nombreArchivo} no encontrado`);
    }

    // Determinar content-type según extensión
    const ext = extname(nombreArchivo).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.docx' || ext === '.doc') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (ext === '.xlsx' || ext === '.xls') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const archivo = readFileSync(rutaArchivo);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.send(archivo);
  }

  private getFormatoArchivo(mimetype: string): 'PDF' | 'Word' | 'Excel' {
    if (mimetype === 'application/pdf') return 'PDF';
    if (mimetype.includes('wordprocessingml') || mimetype.includes('msword')) return 'Word';
    if (mimetype.includes('spreadsheetml') || mimetype.includes('ms-excel')) return 'Excel';
    return 'PDF'; // Por defecto
  }
}












