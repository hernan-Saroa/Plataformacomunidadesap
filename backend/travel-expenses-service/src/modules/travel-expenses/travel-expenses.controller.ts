import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Header,
  Query,
  Res,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { getUploadRootDir } from '../../common/storage.util';
import { TravelExpensesService } from './travel-expenses.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { Permissions } from '../../common/permissions.decorator';
import { CreateSolicitudDto } from '../../dto/create-solicitud.dto';
import { UpdateSolicitudDto } from '../../dto/update-solicitud.dto';
import { UploadDocumentoDto } from '../../dto/upload-documento.dto';
import { UpdatePriorityDto } from '../../dto/update-priority.dto';
import { ReturnRequestDto } from '../../dto/return-request.dto';
import { VerifyAuditDto } from '../../dto/verify-audit.dto';
import { DevolverAnalistaDto } from '../../dto/devolver-analista.dto';
import { SegundaRevisionObservacionesDto } from '../../dto/segunda-revision-observaciones.dto';
import { getClientIp } from '../../common/ip.util';
import { SodGuard, SodProtected } from '../../common/sod.guard';
import { SecondLevelSodGuard, SecondLevelSodProtected } from '../../common/second-level-sod.guard';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    roles?: string[];
    role?: string;
    permissions?: string[];
  };
}

const SUPER_ADMIN_ROLES = [
  'ADMIN',
  'SUPER_ADMIN',
  'ADMINISTRATIVO',
  'SUPER_ADMINISTRADOR',
];

function normalizeRoleCode(role: any): string {
  if (typeof role === 'string') {
    return role.toUpperCase().replace(/\s+/g, '_');
  }
  if (role && typeof role === 'object') {
    return String(role.code || role.nombre || role.name || '')
      .toUpperCase()
      .replace(/\s+/g, '_');
  }
  return '';
}

function isSuperAdmin(user: AuthenticatedRequest['user']): boolean {
  if (!user) return false;
  const rawRoles = Array.isArray(user.roles) ? user.roles : [];
  const singleRole = user.role ? [user.role] : [];
  const allRoles = [...rawRoles, ...singleRole];
  return allRoles.some((r) => SUPER_ADMIN_ROLES.includes(normalizeRoleCode(r)));
}

@Controller()
@ApiTags('control-viaticos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TravelExpensesController {
  constructor(private readonly service: TravelExpensesService) {}

  @Get('solicitudes')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async obtenerSolicitudes(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const usuarioId = req.user?.userId;
    const rawRoles = Array.isArray(req.user?.roles) ? req.user.roles : [];
    const normalizedRoles = rawRoles.map((r: any) =>
      typeof r === 'string'
        ? r.toUpperCase().replace(/\s+/g, '_')
        : (r?.code || '').toUpperCase().replace(/\s+/g, '_'),
    );
    const superAdmin = normalizedRoles.some((r) =>
      SUPER_ADMIN_ROLES.includes(r),
    );
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.max(1, parseInt(limit || '20', 10) || 20);
    const result = await this.service.obtenerSolicitudes(
      usuarioId,
      superAdmin,
      pageNum,
      limitNum,
    );
    return {
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      esSuperAdmin: superAdmin,
    };
  }

  @Get('comisionados/:documento')
  consultarComisionado(@Param('documento') documento: string) {
    return this.service.consultarComisionado(documento);
  }

  @Post('requests')
  @Permissions('travel_expenses:create_request')
  crearSolicitud(
    @Body() dto: CreateSolicitudDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const usuarioAutenticado = req.user?.userId;
    if (usuarioAutenticado) {
      dto.creadoPorUsuarioId = usuarioAutenticado;
    }
    if (!dto.ipRegistroHabeasData) {
      dto.ipRegistroHabeasData = getClientIp(req);
    }
    return this.service.crearSolicitud(dto);
  }

  @Put('requests/:id')
  @Patch('requests/:id')
  @Permissions('travel_expenses:create_request')
  actualizarSolicitud(
    @Param('id') id: string,
    @Body() dto: UpdateSolicitudDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const esSuperAdmin = isSuperAdmin(req.user);
    return this.service.actualizarSolicitud(id, dto, esSuperAdmin);
  }

  @Post('requests/:id/documentos')
  @Permissions('travel_expenses:create_request')
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: multer.diskStorage({
        destination: (req: any, _file: any, cb: any) => {
          const dir = join(getUploadRootDir(), req.params.id);
          try {
            mkdirSync(dir, { recursive: true });
          } catch {}
          cb(null, dir);
        },
        filename: (_req: any, file: any, cb: any) => {
          const name = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
          return cb(null, `${name}-${Date.now()}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req: any, file: any, cb: any) => {
        const mime = String(file.mimetype || '').toLowerCase();
        const nombre = String(file.originalname || '').toLowerCase();
        const esPdf =
          mime === 'application/pdf' ||
          mime === 'pdf' ||
          mime.endsWith('/pdf') ||
          nombre.endsWith('.pdf');
        if (!esPdf) {
          return cb(
            new BadRequestException(
              `El documento "${file.originalname || ''}" debe estar en formato PDF. Solo se permiten archivos .pdf.`,
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  subirDocumento(
    @Param('id') id: string,
    @Body() dto: UploadDocumentoDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ) {
    const esSuperAdmin = isSuperAdmin(req.user);
    return this.service.subirDocumento(id, {
      ...dto,
      file,
      isSuperAdmin: esSuperAdmin,
    });
  }

  @Delete('requests/:id/documentos/:documentoId')
  @Permissions('travel_expenses:create_request')
  eliminarDocumento(
    @Param('id') id: string,
    @Param('documentoId') documentoId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const esSuperAdmin = isSuperAdmin(req.user);
    return this.service.eliminarDocumento(id, documentoId, esSuperAdmin);
  }

  @Post('requests/:id/finalizar')
  @Permissions('travel_expenses:create_request')
  finalizarSolicitud(@Param('id') id: string) {
    return this.service.finalizarSolicitud(id);
  }

  @Get('requests/:id')
  @Permissions(
    'travel_expenses:create_request',
    'travel_expenses:read_inbox',
    'travel_expenses:set_priority',
    'travel_expenses:return_request',
    'travel_expenses:read_assigned',
  )
  obtenerSolicitud(@Param('id') id: string) {
    return this.service.obtenerSolicitudCompleta(id);
  }

  @Get('requests/inbox/secretary')
  @Permissions('travel_expenses:read_inbox')
  async obtenerBandejaSecretario(
    @Req() req: AuthenticatedRequest,
    @Query('dependencia_id') dependenciaId?: string,
    @Query('prioridad') prioridad?: string,
    @Query('extemporanea') extemporanea?: string,
    @Query('comisionado') comisionado?: string,
    @Query('fecha_inicio') fechaInicio?: string,
    @Query('fecha_fin') fechaFin?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.max(1, parseInt(limit || '20', 10) || 20);
    const extemporaneaBool =
      extemporanea === 'true'
        ? true
        : extemporanea === 'false'
          ? false
          : undefined;

    const result = await this.service.obtenerBandejaSecretario({
      dependenciaId: dependenciaId || undefined,
      prioridad: prioridad || undefined,
      extemporanea: extemporaneaBool,
      comisionadoDocumento: comisionado || undefined,
      fechaInicio: fechaInicio || undefined,
      fechaFin: fechaFin || undefined,
      page: pageNum,
      limit: limitNum,
    });

    return {
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Patch('requests/:id/priority')
  @Permissions('travel_expenses:set_priority')
  async actualizarPrioridad(
    @Param('id') id: string,
    @Body() dto: UpdatePriorityDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const esSuperAdmin = isSuperAdmin(req.user);
    const usuarioId = req.user?.userId;
    if (!usuarioId) {
      throw new BadRequestException('Usuario no autenticado.');
    }
    return this.service.actualizarPrioridad(
      id,
      dto.prioridad,
      usuarioId,
      esSuperAdmin,
    );
  }

  @Post('requests/:id/return')
  @Permissions('travel_expenses:return_request')
  @HttpCode(HttpStatus.OK)
  async devolverSolicitud(
    @Param('id') id: string,
    @Body() dto: ReturnRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const esSuperAdmin = isSuperAdmin(req.user);
    const usuarioId = req.user?.userId;
    if (!usuarioId) {
      throw new BadRequestException('Usuario no autenticado.');
    }
    return this.service.devolverSolicitud(
      id,
      dto.motivo,
      usuarioId,
      esSuperAdmin,
    );
  }

  @Get('parametrizacion/checklist/:tipo')
  obtenerChecklistDocumentos(@Param('tipo') tipo: string) {
    return this.service.obtenerChecklistDocumentos(tipo);
  }

  @Get('parametrizacion/formulario')
  obtenerParametrizacionFormulario() {
    return this.service.obtenerParametrizacionFormulario();
  }

  @Get('parametrizacion/formulario/:codigo')
  async obtenerParametrizacionPorCodigo(@Param('codigo') codigo: string) {
    const config =
      await this.service.obtenerParametrizacionPorCodigoFormulario(codigo);
    if (!config) {
      return {
        message: 'Configuración no encontrada para el formulario',
        codigo,
        config: null,
      };
    }
    return config;
  }

  @Get('parametrizacion/validar-documentos')
  async validarDocumentosRequeridos(
    @Query('tipo') tipo: string,
    @Query('documentos') documentos?: string,
  ) {
    const tipos = documentos ? documentos.split(',') : [];
    return this.service.validarDocumentosRequeridos(tipo, tipos);
  }

  @Get('parametrizacion/validar-campos')
  async validarCamposObligatorios(
    @Query('tipo') tipo: string,
    @Query('campos') campos?: string,
  ) {
    const datosCampos = campos
      ? campos.split(',').reduce(
          (acc, campo) => {
            const [clave, valor] = campo.split('=');
            acc[clave] = valor;
            return acc;
          },
          {} as Record<string, any>,
        )
      : {};
    return this.service.validarCamposObligatorios(tipo, datosCampos);
  }

  @Get('solicitudes/:id/exportar/pdf')
  @Permissions('travel_expenses:create_request')
  async exportarFormato023(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.service.exportarFormato023(id, req);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Formato-023-Solicitud-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  }

  @Get('requests/analyst/inbox')
  @Permissions('travel_expenses:read_assigned', 'travel_expenses:view_assigned_requests')
  @ApiOperation({
    summary: 'Obtener solicitudes asignadas al analista autenticado',
    description:
      'Devuelve las solicitudes de comision asignadas al analista (estados SOLICITADO, EN_VERIFICACION, VERIFICADA). Acepta tanto el permiso nuevo read_assigned como el legacy view_assigned_requests.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de solicitudes asignadas al analista.',
  })
  @ApiBearerAuth()
  async obtenerSolicitudesAsignadas(@Req() req: AuthenticatedRequest) {
    const analistaId = req.user?.userId;
    if (!analistaId) {
      throw new BadRequestException('Usuario no autenticado.');
    }
    const data =
      await this.service.obtenerSolicitudesAsignadasAnalista(analistaId);
    return {
      data,
      total: data.length,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('requests/:id/verify-audit')
  @UseGuards(JwtAuthGuard, PermissionsGuard, SodGuard)
  @SodProtected('id')
  @Permissions('travel_expenses:verify_request')
  @ApiOperation({
    summary: 'Registrar checklist de verificacion del analista',
    description:
      'Registra el checklist de verificacion (seguridad social, RUT) para una solicitud asignada. Actualiza el flag consulta_rut_facturador y almacena el resultado en el historial.',
  })
  @ApiResponse({
    status: 200,
    description: 'Checklist de verificacion registrado exitosamente.',
  })
  @ApiBearerAuth()
  async verificarAuditoria(
    @Param('id') id: string,
    @Body() dto: VerifyAuditDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const usuarioId = req.user?.userId;
    if (!usuarioId) {
      throw new BadRequestException('Usuario no autenticado.');
    }
    const roles = Array.isArray(req.user?.roles)
      ? req.user.roles
      : req.user?.role
        ? [req.user.role]
        : [];
    const result = await this.service.verificarAuditoria(
      id,
      usuarioId,
      roles,
      dto,
    );
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('requests/:id/devolver-analista')
  @UseGuards(JwtAuthGuard, PermissionsGuard, SodGuard)
  @SodProtected('id')
  @Permissions('travel_expenses:return_assigned')
  @ApiOperation({
    summary: 'Devolver solicitud asignada desde el analista',
    description:
      'Devuelve una solicitud asignada al analista para subsanar faltantes. Transiciona el estado a DEVUELTA.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitud devuelta exitosamente.',
  })
  @ApiBearerAuth()
  async devolverAnalista(
    @Param('id') id: string,
    @Body() dto: DevolverAnalistaDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const usuarioId = req.user?.userId;
    if (!usuarioId) {
      throw new BadRequestException('Usuario no autenticado.');
    }
    const roles = Array.isArray(req.user?.roles)
      ? req.user.roles
      : req.user?.role
        ? [req.user.role]
        : [];
    const result = await this.service.devolverAnalista(
      id,
      usuarioId,
      roles,
      dto.motivo,
    );
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('requests/:id/siif-export')
  @UseGuards(JwtAuthGuard, PermissionsGuard, SodGuard)
  @SodProtected('id')
  @Permissions('travel_expenses:export_siif')
  @ApiOperation({
    summary: 'Exportar solicitud a SIIF Nacion',
    description:
      'Genera el CSV con los datos transaccionales necesarios para SIIF, marca siif_exportado=true y transiciona la solicitud a SOLICITADA_SIIF.',
  })
  @ApiResponse({
    status: 200,
    description: 'CSV generado y solicitud exportada a SIIF.',
  })
  @ApiBearerAuth()
  async exportarSIIF(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const usuarioId = req.user?.userId;
    if (!usuarioId) {
      throw new BadRequestException('Usuario no autenticado.');
    }
    const roles = Array.isArray(req.user?.roles)
      ? req.user.roles
      : req.user?.role
        ? [req.user.role]
        : [];
    const result = await this.service.exportarSIIF(id, usuarioId, roles);

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
      'Content-Length': Buffer.byteLength(result.csvContent, 'utf8'),
    });
    res.send(result.csvContent);
  }

  /**
   * RF-REV-002 — Bandeja de solicitudes en estado SOLICITADA_SIIF.
   *
   * Devuelve el listado de solicitudes exportadas a SIIF que esperan la
   * verificación de segundo nivel (revisor de Control Viáticos).
   * Exige el permiso `travel_expenses:read_siif_requested`.
   */
  @Get('requests/siif-requested')
  @Permissions('travel_expenses:read_siif_requested')
  @ApiOperation({
    summary: 'Obtener solicitudes en estado SOLICITADA_SIIF pendientes de segunda revisión',
    description:
      'Devuelve la lista de solicitudes exportadas a SIIF que esperan la verificación de segundo nivel (revisor de control).',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de solicitudes pendientes de segunda revisión.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado. Se requiere token Bearer válido.',
  })
  @ApiResponse({
    status: 403,
    description: 'No tiene permiso para consultar la bandeja de Control Viáticos.',
  })
  @ApiBearerAuth()
  async obtenerSolicitudesSIIFRequested(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.max(1, parseInt(limit || '20', 10) || 20);
    const result =
      await this.service.obtenerSolicitudesSIIFRequested(pageNum, limitNum);
    return {
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /**
   * RF-REV-002 — Detalle completo de una solicitud para Control Viáticos.
   *
   * Devuelve la solicitud en estado SOLICITADA_SIIF con:
   * - Datos del Formato 023 (solicitud + comisionado).
   * - Documentos de soporte (PDFs).
   * - Resumen presupuestal de la dependencia.
   * - Trazabilidad de primer nivel: exportador SIIF y fecha de exportación.
   */
  @Get('requests/:id/control-viaticos')
  @Permissions(
    'travel_expenses:read_siif_requested',
    'travel_expenses:double_check_request',
    'travel_expenses:return_to_analyst',
  )
  @ApiOperation({
    summary: 'Obtener detalle de solicitud para Control Viáticos',
    description:
      'Recupera el expediente completo (Formato 023, documentos, resumen presupuestal y trazabilidad SIIF) para que el revisor de Control Viáticos ejecute el control cruzado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle de la solicitud para Control Viáticos.',
  })
  @ApiResponse({
    status: 404,
    description: 'Solicitud no encontrada.',
  })
  @ApiBearerAuth()
  async obtenerSolicitudControlViaticos(@Param('id') id: string) {
    return this.service.obtenerSolicitudControlViaticos(id);
  }

  /**
   * RF-REV-002 — Aprobar la segunda revisión (verificación de segundo nivel).
   *
   * Transiciona el estado de la comisión de SOLICITADA_SIIF a VERIFICADA.
   * El usuario autenticado se registra como `revisor_control_id`.
   * Valida la regla SoD: el revisor no puede ser el comisionado, el creador,
   * el analista verificador ni el usuario exportador a SIIF.
   * SUPER_ADMIN conserva el bypass operativo.
   */
  @Post('requests/:id/verify-second-level')
  @UseGuards(JwtAuthGuard, PermissionsGuard, SecondLevelSodGuard)
  @SecondLevelSodProtected('id')
  @Permissions('travel_expenses:double_check_request')
  @ApiOperation({
    summary: 'Registrar segunda revisión (verificación de segundo nivel)',
    description:
      'Transiciona la solicitud de SOLICITADA_SIIF a VERIFICADA. Valida SoD estricta: el revisor no puede ser comisionado, creador, analista verificador ni exportador SIIF. SUPER_ADMIN tiene bypass.',
  })
  @ApiBody({
    description: 'Observaciones opcionales del revisor de segundo nivel.',
    type: SegundaRevisionObservacionesDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Segunda revisión registrada exitosamente. Estado: VERIFICADA.',
  })
  @ApiResponse({
    status: 400,
    description: 'Estado inválido u observaciones faltantes.',
  })
  @ApiResponse({
    status: 403,
    description: 'Violación de Segregación de Funciones (SoD).',
  })
  @ApiBearerAuth()
  async verificarSegundaRevision(
    @Param('id') id: string,
    @Body() dto: SegundaRevisionObservacionesDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const usuarioId = req.user?.userId;
    if (!usuarioId) {
      throw new BadRequestException('Usuario no autenticado.');
    }
    const roles = Array.isArray(req.user?.roles)
      ? req.user.roles
      : req.user?.role
        ? [req.user.role]
        : [];
    const result = await this.service.verificarSegundaRevision(
      id,
      usuarioId,
      roles,
      dto,
    );
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * RF-REV-002 — Devolver solicitud al analista desde segunda revisión.
   *
   * Transiciona el estado de SOLICITADA_SIIF a EN_VERIFICACION para que el
   * analista subsane observaciones. Requiere observaciones obligatorias
   * (mínimo 3 caracteres). Valida SoD estricta.
   */
  @Post('requests/:id/return-to-analyst')
  @UseGuards(JwtAuthGuard, PermissionsGuard, SecondLevelSodGuard)
  @SecondLevelSodProtected('id')
  @Permissions('travel_expenses:return_to_analyst')
  @ApiOperation({
    summary: 'Devolver solicitud al analista desde segunda revisión',
    description:
      'Transiciona la solicitud de SOLICITADA_SIIF a EN_VERIFICACION para que el analista subsane observaciones. Requiere observaciones obligatorias. Valida SoD estricta: el revisor no puede ser comisionado, creador, analista verificador ni exportador SIIF. SUPER_ADMIN tiene bypass.',
  })
  @ApiBody({
    description: 'Observaciones obligatorias del hallazgo detectado.',
    type: SegundaRevisionObservacionesDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitud devuelta al analista exitosamente. Estado: EN_VERIFICACION.',
  })
  @ApiResponse({
    status: 400,
    description: 'Estado inválido u observaciones faltantes.',
  })
  @ApiResponse({
    status: 403,
    description: 'Violación de Segregación de Funciones (SoD).',
  })
  @ApiBearerAuth()
  async devolverAAnalista(
    @Param('id') id: string,
    @Body() dto: SegundaRevisionObservacionesDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const usuarioId = req.user?.userId;
    if (!usuarioId) {
      throw new BadRequestException('Usuario no autenticado.');
    }
    const roles = Array.isArray(req.user?.roles)
      ? req.user.roles
      : req.user?.role
        ? [req.user.role]
        : [];
    const result = await this.service.devolverAAnalistaDesdeSegundaRevision(
      id,
      usuarioId,
      roles,
      dto,
    );
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}
