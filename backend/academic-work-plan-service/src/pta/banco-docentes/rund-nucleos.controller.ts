import { BadRequestException, Controller, Get, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { Roles } from '../../auth/decorators/roles.decorator';
import { BancoDocentesRolesGuard } from './banco-docentes-roles.guard';
import { RequireRundPermissions, RUND_PERMISSIONS } from './rund-permissions';
import { RundNucleosService } from './rund-nucleos.service';

/**
 * EFDS-2345 / EFDS-2375 — Núcleo de los docentes. Mismos roles y permisos que la
 * carga del RUND: quien carga el RUND administra su interpretación y el puente.
 */
@Controller(['banco-docentes/nucleos', 'pta/banco-docentes/nucleos'])
@UseGuards(BancoDocentesRolesGuard)
@Roles('GESTION_PROFESORAL', 'SUPER_ADMIN', 'super_admin', 'ADMIN')
export class RundNucleosController {
  constructor(private readonly nucleos: RundNucleosService) {}

  @Get('cobertura')
  @RequireRundPermissions(RUND_PERMISSIONS.VIEW, RUND_PERMISSIONS.IMPORT, RUND_PERMISSIONS.MANAGE)
  async cobertura() {
    return { success: true, data: await this.nucleos.cobertura() };
  }

  @Post('reinterpretar')
  @RequireRundPermissions(RUND_PERMISSIONS.IMPORT, RUND_PERMISSIONS.MANAGE)
  async reinterpretar(@Req() req: any) {
    return { success: true, data: await this.nucleos.reinterpretarRund(actorDe(req)) };
  }

  @Post('puente')
  @RequireRundPermissions(RUND_PERMISSIONS.IMPORT, RUND_PERMISSIONS.MANAGE)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  async puente(@UploadedFile() file: Express.Multer.File | undefined, @Req() req: any, @Query('dry_run') dryRun?: string) {
    if (!file) throw new BadRequestException('Se requiere el archivo del puente (campo file).');
    if (!['.csv', '.xlsx'].includes(extname(file.originalname || '').toLowerCase())) {
      throw new BadRequestException('El puente debe ser CSV o XLSX.');
    }
    const data = await this.nucleos.cargarPuente(file.buffer, { dryRun: dryRun !== 'false', actor: actorDe(req) });
    return { success: true, data };
  }
}

function actorDe(req: any): string {
  return String(req?.user?.userId || req?.user?.sub || req?.user?.email || 'SISTEMA');
}
