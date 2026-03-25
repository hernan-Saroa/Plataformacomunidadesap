import { Controller, Get, Param, Res, NotFoundException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ControlInternoPermissions as CIP } from '../../common/permissions.constants';
import type { Response } from 'express';
import { join } from 'path';
import { existsSync, createReadStream, statSync } from 'fs';

@Controller('templates')
export class TemplatesController {
  // Mapeo de códigos de documentos a nombres de archivo
  private readonly templatesMap: Record<string, string> = {
    'EM-FO-010': 'EM-FO-010FormatocartaderepresentacinOCI_V02.pdf',
    'EM-FO-009': 'EM-FO-009FormatocartadecompromisoOCI.pdf',
  };

  // Ruta base donde están los templates (en Docker, montar volumen)
  private readonly templatesPath = process.env.TEMPLATES_PATH || 
    join(process.cwd(), 'uploads', 'templates');

  @Get(':codigo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.CONFIG_MANAGE)
  async getTemplate(@Param('codigo') codigo: string, @Res() res: Response) {
    const filename = this.templatesMap[codigo];
    
    if (!filename) {
      throw new NotFoundException(`Template con código ${codigo} no encontrado`);
    }

    const filePath = join(this.templatesPath, filename);

    if (!existsSync(filePath)) {
      throw new NotFoundException(`Archivo ${filename} no encontrado en el servidor. Ruta buscada: ${filePath}`);
    }

    // Obtener estadísticas del archivo
    const stats = statSync(filePath);

    // Establecer headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Stream del archivo
    const stream = createReadStream(filePath);
    stream.pipe(res);
  }
}

