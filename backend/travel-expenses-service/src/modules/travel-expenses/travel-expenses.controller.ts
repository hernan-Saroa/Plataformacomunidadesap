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
import { AutorizacionObservacionesDto } from '../../dto/autorizacion-observaciones.dto';
import {
  AutorizacionExtemporaneaDto,
  RechazoExtemporaneaDto,
} from '../../dto/autorizacion-extemporanea.dto';
import { CancelarComisionDto } from '../../dto/cancelar-comision.dto';
import { EnviarPresupuestoDto } from '../../dto/enviar-presupuesto.dto';
import { ExpedirRpDto } from '../../dto/expedir-rp.dto';
import { IssueRpDto } from '../../dto/issue-rp.dto';
import { CargaMasivaRpDto } from '../../dto/carga-masiva-rp.dto';
import { BulkIssueRpDto } from '../../dto/bulk-issue-rp.dto';
import { CrearObligacionDto } from '../../dto/crear-obligacion.dto';
import { ProcesarPagoDto } from '../../dto/procesar-pago.dto';

import { getClientIp } from '../../common/ip.util';
import { SodGuard, SodProtected } from '../../common/sod.guard';
import { SecondLevelSodGuard, SecondLevelSodProtected } from '../../common/second-level-sod.guard';
import { AuthorizationSodGuard, AuthorizationSodProtected } from '../../common/authorization-sod.guard';

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
    const rawPermissions = Array.isArray(req.user?.permissions)
      ? req.user.permissions
      : [];
    const normalizedPermissions = rawPermissions.map((p: any) =>
      typeof p === 'string' ? p : p?.code || '',
    );
    const isControlViaticos =
      normalizedRoles.some(
        (r) => r === 'CONTROL_VIATICOS' || r === 'ROL_CONTROL_VIATICOS',
      ) ||
      normalizedPermissions.includes('travel_expenses.general.es_control_viaticos') ||
      normalizedPermissions.includes('travel_expenses:read_siif_requested') ||
      normalizedPermissions.includes('travel_expenses:double_check_request');

    const isAnalista =
      normalizedRoles.some(
        (r) => r === 'ANALISTA' || r === 'ANALISTA_VIATICOS',
      ) ||
      normalizedPermissions.includes('travel_expenses.general.es_analista_viaticos') ||
      normalizedPermissions.includes('travel_expenses:verify_request') ||
      normalizedPermissions.includes('travel_expenses:view_assigned_requests');

    const isSecretario =
      !isAnalista &&
      (normalizedRoles.some(
        (r) =>
          r === 'SECRETARIO' ||
          r === 'SECRETARIO_VIATICOS' ||
          r === 'SUPERVISOR',
      ) ||
        normalizedPermissions.includes('travel_expenses.general.es_secretario_viaticos') ||
        normalizedPermissions.includes('travel_expenses:assign_analyst') ||
        normalizedPermissions.includes('travel_expenses:set_priority') ||
        normalizedPermissions.includes('travel_expenses:read_inbox'));

    const isTesoreria =
      normalizedRoles.some(
        (r) =>
          r === 'TESORERIA' ||
          r === 'GRUPO_TESORERIA' ||
          r === 'ANALISTA_TESORERIA' ||
          r === 'PAGADOR' ||
          r.includes('TESORERIA') ||
          r.includes('PAGADOR'),
      ) ||
      normalizedPermissions.includes('travel_expenses.general.es_tesoreria') ||
      normalizedPermissions.includes('travel_expenses:process_payment') ||
      normalizedPermissions.includes('travel_expenses:read_payments') ||
      normalizedPermissions.includes('travel_expenses:register_payment');

    const isSst =
      normalizedRoles.some(
        (r) =>
          r === 'SST' ||
          r === 'SEGURIDAD_SALUD_TRABAJO' ||
          r === 'SEGURIDAD_Y_SALUD_EN_EL_TRABAJO' ||
          r === 'GRUPO_SST' ||
          r === 'ANALISTA_SST' ||
          r.includes('SST') ||
          (r.includes('SEGURIDAD') && r.includes('TRABAJO')),
      ) ||
      normalizedPermissions.includes('travel_expenses.general.es_sst') ||
      normalizedPermissions.includes('travel_expenses:read_sst_logs') ||
      normalizedPermissions.includes('travel_expenses:read_sst_requests') ||
      normalizedPermissions.includes('travel_expenses:resend_sst_notification');

    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.max(1, parseInt(limit || '20', 10) || 20);
    const result = await this.service.obtenerSolicitudes(
      usuarioId,
      superAdmin,
      pageNum,
      limitNum,
      isControlViaticos,
      isAnalista,
      isSecretario,
      isTesoreria,
      isSst,
    );
    return {
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      esSuperAdmin: superAdmin,
    };
  }

  /**
   * RF-PAG-003 — Bandeja de Solicitudes para Tesorería (Etapa 8).
   * Lista comisiones OBLIGADAS listas para pago y comisiones PAGADAS.
   */
  @Get(['requests/treasury-inbox', 'api/v1/requests/treasury-inbox'])
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(
    'travel_expenses:read_payments',
    'travel_expenses:process_payment',
    'travel_expenses:read_all',
  )
  @ApiTags('tesoreria')
  @ApiOperation({
    summary: 'Bandeja de comisiones para Tesorería y Desembolso (Etapa 8 — RF-PAG-003)',
    description: 'Retorna comisiones OBLIGADA listas para pago y comisiones PAGADAS.',
  })
  async obtenerBandejaTesoreria(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const usuarioId = req.user?.userId;
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.max(1, parseInt(limit || '20', 10) || 20);
    const result = await this.service.obtenerSolicitudes(
      usuarioId,
      false,
      pageNum,
      limitNum,
      false,
      false,
      false,
      true, // isTesoreria
      false,
    );
    return {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      timestamp: new Date().toISOString(),
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
    'travel_expenses:assign_analyst',
    'travel_expenses:read_assigned',
    'travel_expenses:view_assigned_requests',
    'travel_expenses:verify_request',
    'travel_expenses:export_siif',
    'travel_expenses:return_assigned',
    'travel_expenses:read_siif_requested',
    'travel_expenses:double_check_request',
    'travel_expenses:return_to_analyst',
    'travel_expenses:read_payments',
    'travel_expenses:process_payment',
    'travel_expenses:register_payment',
    'travel_expenses:read_sst_requests',
    'travel_expenses:read_sst_logs',
    'travel_expenses:read_authorized',
    'travel_expenses:issue_rp',
    'travel_expenses:read_authorizations',
    'travel_expenses:authorize_expense',
    'travel_expenses:read_obligations',
    'travel_expenses:read_requests',
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
  @Permissions(
    'travel_expenses:create_request',
    'travel_expenses:read_inbox',
    'travel_expenses:set_priority',
    'travel_expenses:return_request',
    'travel_expenses:assign_analyst',
    'travel_expenses:read_assigned',
    'travel_expenses:view_assigned_requests',
    'travel_expenses:verify_request',
    'travel_expenses:export_siif',
    'travel_expenses:return_assigned',
    'travel_expenses:read_siif_requested',
    'travel_expenses:double_check_request',
    'travel_expenses:return_to_analyst',
    'travel_expenses:read_authorizations',
    'travel_expenses:authorize_expense',
    'travel_expenses:return_authorization',
    'travel_expenses:read_payments',
    'travel_expenses:process_payment',
    'travel_expenses:register_payment',
    'travel_expenses:read_sst_requests',
    'travel_expenses:read_sst_logs',
    'travel_expenses:read_authorized',
    'travel_expenses:read_obligations',
    'travel_expenses:read_requests',
  )
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

  /**
   * RF-AUT-001 — Bandeja de autorizaciones corporativas (Etapa 6).
   * Consulta las comisiones en estado EN_AUTORIZACION y AUTORIZADA.
   * Al consultar la bandeja, las comisiones en VERIFICADA se transicionan
   * automáticamente a EN_AUTORIZACION.
   */
  @Get('requests/authorization/inbox')
  @Permissions('travel_expenses:read_authorizations')
  @ApiOperation({
    summary: 'Bandeja de autorizaciones corporativas de la Subdirección (Etapa 6)',
    description:
      'Devuelve las comisiones en etapa de autorización. Transiciona atómicamente a EN_AUTORIZACION las comisiones que lleguen en VERIFICADA.',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de comisiones para visto bueno de gasto e itinerario.',
  })
  @ApiBearerAuth()
  async obtenerBandejaAutorizacion(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('estado') estado?: string,
  ) {
    const result = await this.service.obtenerBandejaAutorizacion(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search,
      estado,
    );
    return {
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * RF-AUT-001 — Autorizar gasto e itinerario de la comisión (Etapa 6).
   *
   * Transiciona el estado de EN_AUTORIZACION a AUTORIZADA.
   * Registra el autorizador y fecha, notifica al responsable de tiquetes y
   * despacha el PDF/itinerario al comisionado y al enlace.
   */
  @Post('requests/:id/authorize')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AuthorizationSodGuard)
  @AuthorizationSodProtected('id')
  @Permissions('travel_expenses:authorize_expense')
  @ApiOperation({
    summary: 'Autorizar gasto e itinerario de la comisión (Etapa 6)',
    description:
      'Emite visto bueno corporativo a la comisión y la transiciona a AUTORIZADA. Valida SoD estricta (el autorizador no puede ser comisionado ni enlace). Despacha notificaciones y PDF de itinerario/tiquete.',
  })
  @ApiBody({
    description: 'Observaciones opcionales de la autorización corporativa.',
    type: AutorizacionObservacionesDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Comisión AUTORIZADA exitosamente. Notificaciones despachadas.',
  })
  @ApiResponse({
    status: 400,
    description: 'Estado inválido para autorización.',
  })
  @ApiResponse({
    status: 403,
    description: 'Violación de Segregación de Funciones (SoD).',
  })
  @ApiBearerAuth()
  async autorizarComision(
    @Param('id') id: string,
    @Body() dto: AutorizacionObservacionesDto,
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
    const result = await this.service.autorizarComision(
      id,
      usuarioId,
      roles,
      dto,
    );
    return {
      success: true,
      data: result,
      message: 'Comisión autorizada exitosamente. Trámite de tiquetes habilitado.',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * RF-AUT-001 — Devolver comisión desde autorización con observaciones (Etapa 6).
   *
   * Transiciona la comisión de EN_AUTORIZACION a EN_VERIFICACION para subsanación.
   * Requiere observaciones obligatorias (mínimo 3 caracteres).
   */
  @Post('requests/:id/return-authorization')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AuthorizationSodGuard)
  @AuthorizationSodProtected('id')
  @Permissions('travel_expenses:return_authorization')
  @ApiOperation({
    summary: 'Devolver comisión con reparos desde autorización (Etapa 6)',
    description:
      'Devuelve la comisión al analista para subsanar observaciones de la Subdirección. Requiere observaciones obligatorias.',
  })
  @ApiBody({
    description: 'Observaciones obligatorias del hallazgo detectado.',
    type: AutorizacionObservacionesDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Comisión devuelta exitosamente a EN_VERIFICACION.',
  })
  @ApiResponse({
    status: 400,
    description: 'Observaciones vacías o insuficientes (< 3 caracteres).',
  })
  @ApiResponse({
    status: 403,
    description: 'Violación de Segregación de Funciones (SoD).',
  })
  @ApiBearerAuth()
  async devolverComisionAutorizacion(
    @Param('id') id: string,
    @Body() dto: AutorizacionObservacionesDto,
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
    const result = await this.service.devolverComisionAutorizacion(
      id,
      usuarioId,
      roles,
      dto,
    );
    return {
      success: true,
      data: result,
      message: 'Comisión devuelta al analista con observaciones de la Subdirección.',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * RF-AUT-001 — Descargar PDF de Autorización de Gasto e Itinerario (Tiquete).
   */
  @Get('requests/:id/ticket-itinerary/pdf')
  @Permissions(
    'travel_expenses:read_authorizations',
    'travel_expenses:authorize_expense',
    'travel_expenses:read_inbox',
    'travel_expenses:create_request',
  )
  @ApiOperation({
    summary: 'Descargar PDF de Autorización de Gasto e Itinerario de Viaje (Etapa 6)',
  })
  async exportarPdfTiqueteItinerario(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.service.exportarPdfTiqueteItinerario(id, req);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Autorizacion-Itinerario-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  }

  /**
   * RF-AUT-002 — Obtener bandeja de comisiones extemporáneas para la Dirección Nacional (Etapa 6).
   */
  @Get('requests/extemporaneous-authorization/inbox')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('travel_expenses:read_extemporaneous_authorizations')
  @ApiOperation({
    summary: 'Bandeja de comisiones extemporáneas para Dirección Nacional (Etapa 6 — RF-AUT-002)',
    description:
      'Retorna las comisiones radicadas con anticipación menor a 14 días hábiles pendientes o gestionadas por Dirección Nacional. Transiciona atómicamente a AUTORIZACION_DIRECCION las que lleguen en VERIFICADA.',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de comisiones extemporáneas para revisión de Dirección Nacional.',
  })
  @ApiBearerAuth()
  async obtenerBandejaDireccionNacional(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('estado') estado?: string,
  ) {
    const result = await this.service.obtenerBandejaDireccionNacional(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search,
      estado,
    );
    return {
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * RF-AUT-002 — Autorizar comisión extemporánea (Dirección Nacional).
   *
   * Transiciona la comisión de AUTORIZACION_DIRECCION a EN_AUTORIZACION
   * para continuar el flujo ordinario hacia la Subdirección de Gestión Corporativa.
   */
  @Post('requests/:id/authorize-extemporaneous')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AuthorizationSodGuard)
  @AuthorizationSodProtected('id')
  @Permissions('travel_expenses:authorize_extemporaneous')
  @ApiOperation({
    summary: 'Autorizar comisión extemporánea por Dirección Nacional (Etapa 6 — RF-AUT-002)',
    description:
      'Emite aval excepcional de Dirección Nacional a una comisión extemporánea (< 14 días hábiles). La transiciona a EN_AUTORIZACION para que continúe a la Subdirección. Valida SoD estricta.',
  })
  @ApiBody({
    description: 'Justificación opcional y bandera de delegación formal.',
    type: AutorizacionExtemporaneaDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Comisión extemporánea autorizada. Enrutada a Subdirección de Gestión Corporativa.',
  })
  @ApiResponse({
    status: 400,
    description: 'Comisión no extemporánea o estado inválido.',
  })
  @ApiResponse({
    status: 403,
    description: 'Violación de Segregación de Funciones (SoD).',
  })
  @ApiBearerAuth()
  async autorizarComisionExtemporanea(
    @Param('id') id: string,
    @Body() dto: AutorizacionExtemporaneaDto,
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
    const result = await this.service.autorizarComisionExtemporanea(
      id,
      usuarioId,
      roles,
      dto,
    );
    return {
      success: true,
      data: result,
      message: 'Comisión extemporánea autorizada exitosamente. Enrutada a Subdirección de Gestión Corporativa.',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * RF-AUT-002 — Rechazar comisión extemporánea (Dirección Nacional).
   *
   * Transiciona la comisión a RECHAZADO con justificación obligatoria.
   */
  @Post('requests/:id/reject-extemporaneous')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AuthorizationSodGuard)
  @AuthorizationSodProtected('id')
  @Permissions('travel_expenses:reject_extemporaneous')
  @ApiOperation({
    summary: 'Rechazar comisión extemporánea por Dirección Nacional (Etapa 6 — RF-AUT-002)',
    description:
      'Niega y rechaza de forma definitiva la comisión extemporánea con justificación obligatoria (mínimo 5 caracteres). Valida SoD estricta.',
  })
  @ApiBody({
    description: 'Justificación obligatoria del rechazo de la extemporaneidad.',
    type: RechazoExtemporaneaDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Comisión extemporánea rechazada con justificación motivada.',
  })
  @ApiResponse({
    status: 400,
    description: 'Justificación vacía o insuficiente (< 5 caracteres).',
  })
  @ApiResponse({
    status: 403,
    description: 'Violación de Segregación de Funciones (SoD).',
  })
  @ApiBearerAuth()
  async rechazarComisionExtemporanea(
    @Param('id') id: string,
    @Body() dto: RechazoExtemporaneaDto,
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
    const result = await this.service.rechazarComisionExtemporanea(
      id,
      usuarioId,
      roles,
      dto,
    );
    return {
      success: true,
      data: result,
      message: 'Comisión extemporánea rechazada por Dirección Nacional.',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * RF-AUT-003 — Cancelar comisión con trazabilidad (Etapa 6).
   *
   * Permite registrar la cancelación con motivo obligatorio y responsable.
   * Transiciona la comisión a CANCELADA y señala si requiere reintegro en Etapa 8.
   */
  @Post('requests/:id/cancel')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(
    'travel_expenses:cancel_request',
    'travel_expenses:create_request',
    'travel_expenses:read_inbox',
    'travel_expenses:authorize_expense',
  )
  @ApiOperation({
    summary: 'Cancelar comisión con trazabilidad (Etapa 6 — RF-AUT-003)',
    description:
      'Registra la cancelación de una comisión no legalizada con motivo obligatorio y responsable. Pasa el estado a CANCELADA, conserva trazabilidad y marca si queda pendiente de reintegro (Etapa 8).',
  })
  @ApiBody({
    description: 'Motivo obligatorio, responsable y opción de recursos comprometidos.',
    type: CancelarComisionDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Comisión cancelada exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description: 'Motivo insuficiente, comisión ya cancelada o ya legalizada.',
  })
  @ApiBearerAuth()
  async cancelarComision(
    @Param('id') id: string,
    @Body() dto: CancelarComisionDto,
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
    const result = await this.service.cancelarComision(
      id,
      usuarioId,
      roles,
      dto,
    );
    return {
      success: true,
      data: result,
      message: 'Comisión cancelada exitosamente con trazabilidad registrada.',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * RF-PRE-001 — Enviar paquete de comisión autorizada a Presupuesto (Etapa 7).
   *
   * Criterio 1 (Gherkin):
   *   Dada una comisión AUTORIZADA, Cuando el analista envía el paquete a Presupuesto,
   *   Entonces aparece en la bandeja del Grupo de Presupuesto.
   */
  @Post('requests/:id/send-to-budget')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(
    'travel_expenses:send_to_budget',
    'travel_expenses:verify_request',
    'travel_expenses:create_request',
    'travel_expenses:authorize_expense',
  )
  @ApiOperation({
    summary: 'Enviar paquete de comisión autorizada a Presupuesto (Etapa 7 — RF-PRE-001)',
    description:
      'Remite la comisión autorizada a la bandeja del Grupo de Presupuesto para expedición del Registro Presupuestal en SIIF Nación. Transiciona a EN_PRESUPUESTO.',
  })
  @ApiBody({
    description: 'Observaciones opcionales del envío a presupuesto.',
    type: EnviarPresupuestoDto,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Paquete de comisión enviado a Presupuesto exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description: 'Comisión no autorizada o estado inválido.',
  })
  @ApiBearerAuth()
  async enviarPaquetePresupuesto(
    @Param('id') id: string,
    @Body() dto: EnviarPresupuestoDto,
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
    const result = await this.service.enviarPaquetePresupuesto(
      id,
      usuarioId,
      roles,
      dto,
    );
    return {
      success: true,
      data: result,
      message: 'Paquete de comisión enviado exitosamente a la bandeja del Grupo de Presupuesto.',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * RF-PRE-001 — Bandeja del Grupo de Presupuesto (Etapa 7).
   *
   * Endpoint oficial: GET /api/v1/requests/budget-inbox
   * Alias: GET requests/budget-inbox, GET requests/budget/inbox
   */
  @Get(['requests/budget-inbox', 'api/v1/requests/budget-inbox', 'requests/budget/inbox'])
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(
    'travel_expenses:read_authorized',
    'travel_expenses:read_budget',
    'travel_expenses:read_all',
  )
  @ApiTags('presupuesto')
  @ApiOperation({
    summary: 'Bandeja de comisiones para Grupo de Presupuesto (Etapa 7 — RF-PRE-001)',
    description:
      'Retorna comisiones pendientes de RP en estado AUTORIZADA / EN_PRESUPUESTO y comprometidas (COMPROMETIDA) con búsqueda, filtros y KPIs consolidados. Permite bypass total a SUPER_ADMIN.',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de comisiones en Presupuesto y KPIs consolidados.',
  })
  @ApiResponse({
    status: 403,
    description: 'Permiso denegado (requiere travel_expenses:read_authorized o rol SUPER_ADMIN).',
  })
  @ApiBearerAuth()
  async obtenerBandejaPresupuesto(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('estado') estado?: string,
  ) {
    const result = await this.service.obtenerBandejaPresupuesto(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search,
      estado,
    );
    return {
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * RF-PRE-001 — Expedir RP en SIIF Nación (Etapa 7).
   *
   * Endpoint oficial: POST /api/v1/requests/:id/issue-rp
   * Alias: POST requests/:id/issue-rp, POST requests/:id/register-rp
   *
   * Criterio 2 (Gherkin):
   *   Dada una comisión en Presupuesto, Cuando se expide el RP en SIIF Nación,
   *   Entonces la comisión pasa a estado COMPROMETIDA.
   */
  @Post(['requests/:id/issue-rp', 'api/v1/requests/:id/issue-rp', 'requests/:id/register-rp'])
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('travel_expenses:issue_rp', 'travel_expenses:register_rp')
  @ApiTags('presupuesto')
  @ApiOperation({
    summary: 'Expedir Registro Presupuestal RP en SIIF Nación (Etapa 7 — RF-PRE-001)',
    description:
      'Registra el RP individual con nomenclatura Fecha_RP_Número, rubro presupuestal, valor comprometido y soporte PDF. Transiciona la comisión de AUTORIZADA a COMPROMETIDA.',
  })
  @ApiBody({
    description: 'Datos del RP: número, fecha, valor comprometido, rubro presupuestal y soporte opcional.',
    type: IssueRpDto,
  })
  @ApiResponse({
    status: 200,
    description: 'RP expedido y registrado exitosamente. Comisión pasa a estado COMPROMETIDA.',
  })
  @ApiResponse({
    status: 400,
    description: 'Solicitud en estado inválido o datos requeridos incompletos.',
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado (requiere permiso travel_expenses:issue_rp o rol SUPER_ADMIN).',
  })
  @ApiResponse({
    status: 422,
    description: 'Error de validación en la nomenclatura Fecha_RP_Número o formato de soporte.',
  })
  @ApiBearerAuth()
  async expedirRp(
    @Param('id') id: string,
    @Body() dto: IssueRpDto | ExpedirRpDto,
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
    const result = await this.service.expedirRp(
      id,
      usuarioId,
      roles,
      dto as any,
    );
    return {
      success: true,
      data: result,
      message: `Registro Presupuestal expedido exitosamente en SIIF Nación. Código: ${result.codigoRp}. Estado: COMPROMETIDA.`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * RF-PRE-001 — Carga masiva de RPs en SIIF Nación (Etapa 7).
   *
   * Endpoint oficial: POST /api/v1/requests/bulk-issue-rp
   * Alias: POST requests/bulk-issue-rp, POST requests/budget/batch-rp
   *
   * Criterio 3 (Gherkin):
   *   Dado el registro del RP, Cuando se carga, Entonces respeta la nomenclatura
   *   Fecha_RP_Número y admite carga masiva.
   */
  @Post(['requests/bulk-issue-rp', 'api/v1/requests/bulk-issue-rp', 'requests/budget/batch-rp'])
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('travel_expenses:issue_rp', 'travel_expenses:register_rp')
  @ApiTags('presupuesto')
  @ApiOperation({
    summary: 'Carga masiva de Registros Presupuestales RP en SIIF Nación (Etapa 7 — RF-PRE-001)',
    description:
      'Procesa transaccionalmente un lote de registros presupuestales verificando la nomenclatura Fecha_RP_Número y transiciona las comisiones masivamente a COMPROMETIDA.',
  })
  @ApiBody({
    description: 'Plantilla de items con solicitud_consecutivo, numero_rp, fecha_rp, rubro y valor.',
    type: BulkIssueRpDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Lote de RPs procesado transaccionalmente. Retorna resumen y detalle de inconsistencias.',
  })
  @ApiResponse({
    status: 400,
    description: 'Listado o archivo de carga masiva vacío.',
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado (requiere permiso travel_expenses:issue_rp o rol SUPER_ADMIN).',
  })
  @ApiResponse({
    status: 422,
    description: 'Inconsistencias en los datos o formatos del lote.',
  })
  @ApiBearerAuth()
  async cargaMasivaRp(
    @Body() dto: BulkIssueRpDto | CargaMasivaRpDto,
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
    const result = await this.service.cargaMasivaRp(
      usuarioId,
      roles,
      (dto.items as any[]) || [],
    );
    return {
      success: true,
      data: result,
      message: `Carga masiva finalizada. ${result.exitosos} de ${result.total} comisiones comprometidas con éxito.`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * RF-PRE-003 — Previsualizar modalidad de pago según días hábiles previos (Etapa 7).
   *
   * Endpoint: GET /api/v1/requests/:id/modalidad-pago
   * Alias: GET requests/:id/modalidad-pago
   */
  @Get(['requests/:id/modalidad-pago', 'api/v1/requests/:id/modalidad-pago'])
  @UseGuards(JwtAuthGuard)
  @ApiTags('presupuesto')
  @ApiOperation({
    summary: 'Previsualizar modalidad de pago (AVANCE vs. RECONOCIMIENTO_POSTERIOR) [RF-PRE-003]',
    description:
      'Calcula en vivo los días hábiles disponibles antes del viaje excluyendo festivos de Colombia y determina la modalidad de pago proyectada.',
  })
  @ApiResponse({
    status: 200,
    description: 'Modalidad de pago y días hábiles calculados.',
  })
  @ApiBearerAuth()
  async previsualizarModalidadPago(
    @Param('id') id: string,
    @Query('fechaRp') fechaRp?: string,
  ) {
    const result = await this.service.previsualizarModalidadPago(id, fechaRp);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * RF-PAG-001 — Crear obligación en SIIF Nación según modalidad de pago (Etapa 8).
   * Actor: Analista de Viáticos.
   *
   * Endpoint: POST /api/v1/requests/:id/crear-obligacion
   * Aliases: POST requests/:id/crear-obligacion, POST requests/:id/register-obligation
   */
  @Post([
    'requests/:id/crear-obligacion',
    'api/v1/requests/:id/crear-obligacion',
    'requests/:id/register-obligation',
    'api/v1/requests/:id/register-obligation',
  ])
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('travel_expenses:create_obligation', 'travel_expenses:verify_request', 'travel_expenses:read_assigned')
  @ApiTags('tesoreria')
  @ApiOperation({
    summary: 'Crear obligación en SIIF Nación según modalidad de pago (Etapa 8 — RF-PAG-001)',
    description:
      'Registra la obligación en SIIF Nación vinculada a la comisión comprometida y transiciona el estado a OBLIGADA (Lista para desembolso de Tesorería).',
  })
  @ApiBody({
    description: 'Datos de la obligación en SIIF: número, fecha, valor, modalidad y soporte opcional.',
    type: CrearObligacionDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Obligación registrada exitosamente. Comisión lista para desembolso por Tesorería.',
  })
  @ApiResponse({
    status: 400,
    description: 'Comisión en estado inválido o datos requeridos incompletos.',
  })
  @ApiResponse({
    status: 404,
    description: 'Solicitud de comisión no encontrada.',
  })
  @ApiBearerAuth()
  async crearObligacion(
    @Param('id') id: string,
    @Body() dto: CrearObligacionDto,
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
    const result = await this.service.crearObligacion(
      id,
      usuarioId,
      roles,
      dto,
    );
    return {
      success: true,
      data: result,
      message: `Obligación ${result.numeroObligacion} registrada exitosamente en SIIF Nación. Comisión en estado OBLIGADA (Lista para pago).`,
      timestamp: new Date().toISOString(),
    };
  }

  @Post([
    'requests/:id/procesar-pago',
    'api/v1/requests/:id/procesar-pago',
    'requests/:id/desembolso',
    'api/v1/requests/:id/desembolso',
  ])
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('travel_expenses:process_payment', 'travel_expenses:register_payment', 'travel_expenses:create_obligation', 'travel_expenses:verify_request')
  @ApiTags('tesoreria')
  @ApiOperation({
    summary: 'Procesar desembolso y pago de comisión (Etapa 8 — RF-PAG-003)',
    description:
      'Registra el desembolso formal del pago al comisionado en SIIF Nación y transiciona el estado de la comisión a PAGADA.',
  })
  @ApiBody({
    description: 'Datos del pago y desembolso: fecha de pago, valor pagado, orden de pago SIIF y soporte.',
    type: ProcesarPagoDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Pago registrado exitosamente. Comisión transicionada a estado PAGADA.',
  })
  @ApiResponse({
    status: 400,
    description: 'Comisión en estado inválido (no OBLIGADA) o montos/fechas incorrectas.',
  })
  @ApiResponse({
    status: 404,
    description: 'Solicitud de comisión no encontrada.',
  })
  @ApiBearerAuth()
  async procesarPago(
    @Param('id') id: string,
    @Body() dto: ProcesarPagoDto,
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
    const result = await this.service.procesarPago(
      id,
      usuarioId,
      roles,
      dto,
    );
    return {
      success: true,
      data: result,
      message: `Desembolso procesado exitosamente por Tesorería. Comisión transicionada a estado PAGADA.`,
      timestamp: new Date().toISOString(),
    };
  }

  @Post([
    'requests/:id/soporte-pago',
    'api/v1/requests/:id/soporte-pago',
  ])
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('travel_expenses:process_payment', 'travel_expenses:register_payment', 'travel_expenses:create_obligation', 'travel_expenses:verify_request')
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
          const rawName = file.originalname || 'soporte_pago.pdf';
          const ext = extname(rawName) || '.pdf';
          const base = rawName.replace(ext, '').replace(/[^a-zA-Z0-9._-]/g, '_');
          cb(null, `pago_${Date.now()}_${base}${ext}`);
        },
      }),
      fileFilter: (_req: any, file: any, cb: any) => {
        const mime = String(file.mimetype || '').toLowerCase();
        const nombre = String(file.originalname || '').toLowerCase();
        const esValido =
          mime === 'application/pdf' ||
          mime.startsWith('image/') ||
          nombre.endsWith('.pdf') ||
          nombre.endsWith('.png') ||
          nombre.endsWith('.jpg') ||
          nombre.endsWith('.jpeg') ||
          nombre.endsWith('.webp');
        if (!esValido) {
          return cb(
            new BadRequestException(
              `El soporte de pago debe ser un documento PDF o imagen válida (PDF, PNG, JPG, JPEG).`,
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  @ApiTags('tesoreria')
  @ApiOperation({
    summary: 'Subir archivo soporte de desembolso / pago de comisión',
    description: 'Permite cargar el archivo físico (PDF o imagen) del comprobante de desembolso bancario o egreso.',
  })
  @ApiResponse({ status: 201, description: 'Archivo de soporte cargado exitosamente.' })
  @ApiBearerAuth()
  async subirSoportePago(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo para el soporte de pago.');
    }
    const relativeUrl = `/uploads/${id}/${file.filename}`;
    return {
      success: true,
      data: {
        urlRepositorio: relativeUrl,
        nombreArchivo: file.originalname,
        nombreArchivoSeguro: file.filename,
        tamano: file.size,
        tipoMime: file.mimetype,
      },
      message: 'Soporte de desembolso cargado exitosamente en el proyecto.',
      timestamp: new Date().toISOString(),
    };
  }

  @Post([
    'requests/:id/soporte-obligacion',
    'api/v1/requests/:id/soporte-obligacion',
  ])
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('travel_expenses:create_obligation', 'travel_expenses:verify_request', 'travel_expenses:process_payment')
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
          const rawName = file.originalname || 'soporte_obligacion.pdf';
          const ext = extname(rawName) || '.pdf';
          const base = rawName.replace(ext, '').replace(/[^a-zA-Z0-9._-]/g, '_');
          cb(null, `obligacion_${Date.now()}_${base}${ext}`);
        },
      }),
      fileFilter: (_req: any, file: any, cb: any) => {
        const mime = String(file.mimetype || '').toLowerCase();
        const nombre = String(file.originalname || '').toLowerCase();
        const esValido =
          mime === 'application/pdf' ||
          mime.startsWith('image/') ||
          nombre.endsWith('.pdf') ||
          nombre.endsWith('.png') ||
          nombre.endsWith('.jpg') ||
          nombre.endsWith('.jpeg');
        if (!esValido) {
          return cb(
            new BadRequestException(
              `El soporte de obligación debe ser un documento PDF o imagen válida (PDF, PNG, JPG).`,
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  @ApiTags('presupuesto')
  @ApiOperation({
    summary: 'Subir archivo soporte de obligación presupuestal SIIF',
    description: 'Permite cargar el archivo físico (PDF o imagen) del comprobante de obligación expedido en SIIF.',
  })
  @ApiResponse({ status: 201, description: 'Archivo de soporte de obligación cargado exitosamente.' })
  @ApiBearerAuth()
  async subirSoporteObligacion(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo para el soporte de obligación.');
    }
    const relativeUrl = `/uploads/${id}/${file.filename}`;
    return {
      success: true,
      data: {
        urlRepositorio: relativeUrl,
        nombreArchivo: file.originalname,
        nombreArchivoSeguro: file.filename,
        tamano: file.size,
        tipoMime: file.mimetype,
      },
      message: 'Soporte de obligación cargado exitosamente en el proyecto.',
      timestamp: new Date().toISOString(),
    };
  }
}


