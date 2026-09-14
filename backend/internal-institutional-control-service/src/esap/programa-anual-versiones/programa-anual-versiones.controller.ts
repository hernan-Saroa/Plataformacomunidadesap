import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ControlInternoPermissions as CIP } from '../../common/permissions.constants';
import { ProgramaAnualVersionesService } from './programa-anual-versiones.service';

export class GenerarVersionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motivo?: string;

  @IsOptional()
  @IsBoolean()
  cerrarAjuste?: boolean;
}

@Controller('programa-anual-versiones')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProgramaAnualVersionesController {
  constructor(private readonly service: ProgramaAnualVersionesService) {}

  /**
   * POST /programa-anual-versiones/:vigencia/resolver
   * Lo invocan la exportación y "Generar versión": devuelve la versión vigente,
   * creándola si lo que imprime el documento cambió desde la última.
   */
  @Post(':vigencia/resolver')
  @Permissions(CIP.AUDITORIA_VIEW, CIP.PLAN_ANUAL_EXPORT)
  @HttpCode(HttpStatus.OK)
  resolver(@Param('vigencia') vigencia: string, @Body() body: GenerarVersionDto, @Req() req: any) {
    return this.service.resolverVersion(this.aVigencia(vigencia), this.usuario(req), {
      motivo: body?.motivo,
      cerrarAjuste: body?.cerrarAjuste,
    });
  }

  /** POST /programa-anual-versiones/:vigencia/ajuste — habilita la edición del programa */
  @Post(':vigencia/ajuste')
  @Permissions(CIP.AUDITORIA_EDIT, CIP.AUDITORIA_EDIT_PROGRAMACION)
  @HttpCode(HttpStatus.OK)
  iniciarAjuste(@Param('vigencia') vigencia: string, @Req() req: any) {
    return this.service.iniciarAjuste(this.aVigencia(vigencia), this.usuario(req));
  }

  /** GET /programa-anual-versiones/:vigencia/estado — versión vigente y ajuste abierto */
  @Get(':vigencia/estado')
  @Permissions(CIP.AUDITORIA_VIEW, CIP.PLAN_ANUAL_EXPORT)
  estado(@Param('vigencia') vigencia: string) {
    return this.service.obtenerEstado(this.aVigencia(vigencia));
  }

  /** GET /programa-anual-versiones/:vigencia/log — log de cambios del programa */
  @Get(':vigencia/log')
  @Permissions(CIP.AUDITORIA_VIEW, CIP.PLAN_ANUAL_EXPORT)
  log(@Param('vigencia') vigencia: string) {
    return this.service.obtenerLog(this.aVigencia(vigencia));
  }

  /** GET /programa-anual-versiones/:vigencia — histórico de versiones */
  @Get(':vigencia')
  @Permissions(CIP.AUDITORIA_VIEW, CIP.PLAN_ANUAL_EXPORT)
  listar(@Param('vigencia') vigencia: string) {
    return this.service.listarVersiones(this.aVigencia(vigencia));
  }

  /** GET /programa-anual-versiones/:vigencia/:version — una versión con sus filas */
  @Get(':vigencia/:version')
  @Permissions(CIP.AUDITORIA_VIEW, CIP.PLAN_ANUAL_EXPORT)
  obtener(@Param('vigencia') vigencia: string, @Param('version') version: string) {
    const numero = Number(version);
    if (!Number.isInteger(numero) || numero < 1) {
      throw new BadRequestException('Número de versión inválido');
    }
    return this.service.obtenerVersion(this.aVigencia(vigencia), numero);
  }

  private usuario(req: any) {
    return {
      id: req.user?.userId ?? null,
      nombre: req.user?.username || req.user?.email || null,
    };
  }

  private aVigencia(valor: string): number {
    const vigencia = Number(valor);
    if (!Number.isInteger(vigencia) || vigencia < 2000 || vigencia > 2100) {
      throw new BadRequestException('Vigencia inválida');
    }
    return vigencia;
  }
}
