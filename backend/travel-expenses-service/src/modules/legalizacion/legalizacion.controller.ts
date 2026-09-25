import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createReadStream } from 'fs';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { Permissions } from '../../common/permissions.decorator';
import { LegalizacionService } from './legalizacion.service';
import type { UsuarioAutenticado } from './legalizacion.service';
import { LegalizacionConfigService } from './legalizacion-config.service';
import type { ActualizarModalidadDto, ItemChecklistConfigDto } from './legalizacion-config.service';
import { LegalizacionCanarioService } from './legalizacion-canario.service';

/**
 * Los tokens de auth-service no llevan permisos (solo roles), así que el guard
 * los deriva del rol. Se exige cualquiera de estos: el de legalizaciones y los
 * que el enlace ya tiene por su rol. El servicio además verifica que el usuario
 * sea el comisionado o el enlace de ESA solicitud.
 */
const PERMISOS_LEGALIZAR = [
  'travel_expenses:legalizations.view',
  'travel_expenses:create_request',
  'travel_expenses:view_own_requests',
];
/** Consulta: además el analista asignado (solo lectura). */
const PERMISOS_CONSULTAR = [
  ...PERMISOS_LEGALIZAR,
  'travel_expenses:read_assigned',
  'travel_expenses:view_assigned_requests',
];

interface RequestConUsuario {
  user?: UsuarioAutenticado;
}

/**
 * EFDS-1309 — Legalización de comisiones: soportes del comisionado.
 *
 * Las rutas literales (mis, config, canario) van antes de `:solicitudId`, y el
 * parámetro se valida como UUID: una ruta literal nunca se interpreta como id.
 */
@ApiTags('legalizacion')
@ApiBearerAuth()
@Controller('legalizaciones')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LegalizacionController {
  constructor(
    private readonly service: LegalizacionService,
    private readonly config: LegalizacionConfigService,
    private readonly canario: LegalizacionCanarioService,
  ) {}

  @Get('mis')
  @Permissions(...PERMISOS_LEGALIZAR)
  @ApiOperation({ summary: 'Legalizaciones del usuario (como comisionado o enlace que radicó)' })
  listarMias(@Req() req: RequestConUsuario) {
    return this.service.listarMias(req.user!);
  }

  @Get('config')
  @Permissions('travel_expenses:manage_config')
  @ApiOperation({ summary: 'Configuración de disparador, plazo y checklist de legalización' })
  obtenerConfig() {
    return this.config.obtener();
  }

  @Put('config/modalidades/:modalidad')
  @Permissions('travel_expenses:manage_config')
  @ApiOperation({ summary: 'Actualizar disparador y plazo de una modalidad de pago' })
  actualizarModalidad(
    @Param('modalidad') modalidad: string,
    @Body() dto: ActualizarModalidadDto,
    @Req() req: RequestConUsuario,
  ) {
    return this.config.actualizarModalidad(modalidad, dto, req.user?.userId || '');
  }

  @Put('config/checklist/:tipoComisionado')
  @Permissions('travel_expenses:manage_config')
  @ApiOperation({ summary: 'Reemplazar el checklist de soportes de un tipo de comisionado' })
  reemplazarChecklist(
    @Param('tipoComisionado') tipoComisionado: string,
    @Body() body: { items: ItemChecklistConfigDto[] },
  ) {
    return this.config.reemplazarChecklist(tipoComisionado, body?.items);
  }

  @Get('canario')
  @Permissions('travel_expenses:manage_config')
  @ApiOperation({ summary: 'Canario agregado de invariantes de legalización' })
  verificarCanario() {
    return this.canario.verificar();
  }

  @Get(':solicitudId')
  @Permissions(...PERMISOS_CONSULTAR)
  @ApiOperation({ summary: 'Detalle de la legalización con su checklist' })
  detalle(
    @Param('solicitudId', new ParseUUIDPipe()) solicitudId: string,
    @Req() req: RequestConUsuario,
  ) {
    return this.service.detalle(solicitudId, req.user!);
  }

  @Post(':solicitudId/soportes')
  @Permissions(...PERMISOS_LEGALIZAR)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Cargar un soporte PDF (validado por contenido, %PDF-)' })
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 25 * 1024 * 1024, files: 1 } }))
  subirSoporte(
    @Param('solicitudId', new ParseUUIDPipe()) solicitudId: string,
    @Body('tipoDocumentoSoporteId') tipoDocumentoSoporteId: string,
    @UploadedFile() archivo: Express.Multer.File,
    @Req() req: RequestConUsuario,
  ) {
    return this.service.subirSoporte(solicitudId, tipoDocumentoSoporteId, archivo, req.user!);
  }

  @Delete(':solicitudId/soportes/:soporteId')
  @Permissions(...PERMISOS_LEGALIZAR)
  @ApiOperation({ summary: 'Eliminar un soporte antes de enviar la legalización' })
  eliminarSoporte(
    @Param('solicitudId', new ParseUUIDPipe()) solicitudId: string,
    @Param('soporteId', new ParseUUIDPipe()) soporteId: string,
    @Req() req: RequestConUsuario,
  ) {
    return this.service.eliminarSoporte(solicitudId, soporteId, req.user!);
  }

  @Get(':solicitudId/soportes/:soporteId/archivo')
  @Permissions(...PERMISOS_CONSULTAR)
  @ApiOperation({ summary: 'Descargar un soporte (solo por aquí: no se publica en /uploads)' })
  async archivoSoporte(
    @Param('solicitudId', new ParseUUIDPipe()) solicitudId: string,
    @Param('soporteId', new ParseUUIDPipe()) soporteId: string,
    @Req() req: RequestConUsuario,
  ): Promise<StreamableFile> {
    const { rutaAbsoluta, nombre } = await this.service.archivoSoporte(solicitudId, soporteId, req.user!);
    return new StreamableFile(createReadStream(rutaAbsoluta), {
      type: 'application/pdf',
      disposition: `inline; filename*=UTF-8''${encodeURIComponent(nombre)}`,
    });
  }

  @Post(':solicitudId/enviar')
  @Permissions(...PERMISOS_LEGALIZAR)
  @ApiOperation({ summary: 'Enviar la legalización completa a revisión' })
  enviar(
    @Param('solicitudId', new ParseUUIDPipe()) solicitudId: string,
    @Req() req: RequestConUsuario,
  ) {
    return this.service.enviar(solicitudId, req.user!);
  }
}
