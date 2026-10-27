import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import { Public } from '../auth/decorators/public.decorator';
import { RequierePermisos } from '../auth/decorators/permisos.decorator';
import { PermisosGuard } from '../auth/guards/permisos.guard';
import {
  CentroAyudaService,
  TAMANO_MAXIMO_ARCHIVO,
  directorioCentroAyuda,
  extensionDe,
  extensionPermitida,
  type ArchivoSubido,
} from './centro-ayuda.service';
import { GuardarRecursoDto } from './dto/centro-ayuda.dto';

export const PERMISO_GESTIONAR_CENTRO_AYUDA = 'centro-ayuda.recursos.gestionar';

const subidaDeArchivo = FileInterceptor('archivo', {
  storage: diskStorage({
    destination: (_req, _file, cb) => cb(null, directorioCentroAyuda()),
    filename: (_req, file, cb) => cb(null, `${randomUUID()}.${extensionDe(file.originalname)}`),
  }),
  limits: { fileSize: TAMANO_MAXIMO_ARCHIVO },
  fileFilter: (_req, file, cb) => {
    if (extensionPermitida(file.originalname)) return cb(null, true);
    cb(
      new BadRequestException(
        'Tipo de archivo no permitido. Use PDF, Word, Excel, PowerPoint, texto o video MP4/WebM/OGG',
      ),
      false,
    );
  },
});

function usuarioDe(req: any): string {
  return req?.user?.username || req?.user?.email || 'desconocido';
}

@Controller('centro-ayuda')
export class CentroAyudaController {
  constructor(private readonly centroAyuda: CentroAyudaService) {}

  /** Recursos activos del Centro de Ayuda; los ve cualquier usuario con sesión. */
  @Get('recursos')
  listar() {
    return this.centroAyuda.listarActivos();
  }

  /**
   * Entrega el archivo de un recurso activo. Es público porque lo descarga
   * también el contenedor de OnlyOffice, que no tiene sesión; el contenido es
   * material de ayuda, no información de los usuarios.
   */
  @Public()
  @Get('recursos/:id/archivo')
  async archivo(
    @Param('id', ParseIntPipe) id: number,
    @Query('descargar') descargar: string | undefined,
    @Res() res: Response,
  ) {
    const archivo = await this.centroAyuda.obtenerArchivo(id);
    const disposicion = descargar === '1' || descargar === 'true' ? 'attachment' : 'inline';
    const nombreAscii = archivo.nombre.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');

    res.setHeader('Content-Type', archivo.mime);
    res.setHeader(
      'Content-Disposition',
      `${disposicion}; filename="${nombreAscii}"; filename*=UTF-8''${encodeURIComponent(archivo.nombre)}`,
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.sendFile(archivo.ruta);
  }

  @Get('recursos/:id/onlyoffice-config')
  onlyOfficeConfig(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.centroAyuda.configOnlyOffice(id, {
      id: String(req.user?.userId || 'anonimo'),
      nombre: req.user?.name || req.user?.username || 'Usuario',
    });
  }

  @Get('admin/recursos')
  @UseGuards(PermisosGuard)
  @RequierePermisos(PERMISO_GESTIONAR_CENTRO_AYUDA)
  listarParaAdministrar() {
    return this.centroAyuda.listarTodos();
  }

  @Post('admin/recursos')
  @UseGuards(PermisosGuard)
  @RequierePermisos(PERMISO_GESTIONAR_CENTRO_AYUDA)
  @UseInterceptors(subidaDeArchivo)
  @HttpCode(HttpStatus.CREATED)
  crear(
    @Body() dto: GuardarRecursoDto,
    @UploadedFile() archivo: ArchivoSubido | undefined,
    @Req() req: any,
  ) {
    return this.centroAyuda.crear(dto, archivo, usuarioDe(req));
  }

  @Put('admin/recursos/:id')
  @UseGuards(PermisosGuard)
  @RequierePermisos(PERMISO_GESTIONAR_CENTRO_AYUDA)
  @UseInterceptors(subidaDeArchivo)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GuardarRecursoDto,
    @UploadedFile() archivo: ArchivoSubido | undefined,
    @Req() req: any,
  ) {
    return this.centroAyuda.actualizar(id, dto, archivo, usuarioDe(req));
  }

  @Delete('admin/recursos/:id')
  @UseGuards(PermisosGuard)
  @RequierePermisos(PERMISO_GESTIONAR_CENTRO_AYUDA)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.centroAyuda.eliminar(id);
  }
}
