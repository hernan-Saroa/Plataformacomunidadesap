import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Header,
  Query,
  Res,
} from '@nestjs/common';
import { Request } from 'express';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { TravelExpensesService } from './travel-expenses.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { Permissions } from '../../common/permissions.decorator';
import { CreateSolicitudDto } from '../../dto/create-solicitud.dto';
import { UploadDocumentoDto } from '../../dto/upload-documento.dto';
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
    const SUPER_ADMIN_ROLES = [
      'ADMIN',
      'SUPER_ADMIN',
      'ADMINISTRATIVO',
      'SUPER_ADMINISTRADOR',
    ];
    const superAdmin = normalizedRoles.some((r) =>
      SUPER_ADMIN_ROLES.includes(r),
    );
    console.log(
      '[travel-expenses] obtenerSolicitudes req.user=',
      JSON.stringify(req.user),
      'usuarioId=',
      usuarioId,
      'roles=',
      JSON.stringify(rawRoles),
      'superAdmin=',
      superAdmin,
    );
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.max(1, parseInt(limit || '20', 10) || 20);
    const result = await this.service.obtenerSolicitudes(
      usuarioId,
      superAdmin,
      pageNum,
      limitNum,
    );
    console.log(
      '[travel-expenses] obtenerSolicitudes response count=',
      result.data.length,
      'total=',
      result.total,
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

  @Post('requests/:id/documentos')
  @Permissions('travel_expenses:create_request')
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: multer.diskStorage({
        destination: (req: any, _file: any, cb: any) => {
          const dir = join(process.cwd(), 'uploads', req.params.id);
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
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  subirDocumento(
    @Param('id') id: string,
    @Body() dto: UploadDocumentoDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.subirDocumento(id, { ...dto, file });
  }

  @Post('requests/:id/finalizar')
  @Permissions('travel_expenses:create_request')
  finalizarSolicitud(@Param('id') id: string) {
    return this.service.finalizarSolicitud(id);
  }

  @Get('requests/:id')
  @Permissions('travel_expenses:read')
  obtenerSolicitud(@Param('id') id: string) {
    return this.service.obtenerSolicitudCompleta(id);
  }

  @Get('parametrizacion/checklist/:tipo')
  @Permissions('travel_expenses:read')
  obtenerChecklistDocumentos(@Param('tipo') tipo: string) {
    return this.service.obtenerChecklistDocumentos(tipo);
  }

  @Get('parametrizacion/formulario')
  @Permissions('travel_expenses:read')
  obtenerParametrizacionFormulario() {
    return this.service.obtenerParametrizacionFormulario();
  }

  @Get('parametrizacion/formulario/:codigo')
  @Permissions('travel_expenses:read')
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
  @Permissions('travel_expenses:read')
  async validarDocumentosRequeridos(
    @Query('tipo') tipo: string,
    @Query('documentos') documentos?: string,
  ) {
    const tipos = documentos ? documentos.split(',') : [];
    return this.service.validarDocumentosRequeridos(tipo, tipos);
  }

  @Get('parametrizacion/validar-campos')
  @Permissions('travel_expenses:read')
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
  @Permissions('travel_expenses:read')
  async exportarFormato023(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.service.exportarFormato023(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Formato-023-Solicitud-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  }
}
