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
import { getClientIp } from '../../common/ip.util';

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
    return this.service.subirDocumento(id, { ...dto, file, isSuperAdmin: esSuperAdmin });
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
  @Permissions('travel_expenses:create_request', 'travel_expenses:read_inbox', 'travel_expenses:set_priority', 'travel_expenses:return_request')
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
      extemporanea === 'true' ? true : extemporanea === 'false' ? false : undefined;

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
    return this.service.actualizarPrioridad(id, dto.prioridad, usuarioId, esSuperAdmin);
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
    return this.service.devolverSolicitud(id, dto.motivo, usuarioId, esSuperAdmin);
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
}
