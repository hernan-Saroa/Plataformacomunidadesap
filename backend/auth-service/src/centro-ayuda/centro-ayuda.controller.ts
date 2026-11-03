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
  Patch,
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
import { CentroAyudaActivoGuard } from './centro-ayuda-activo.guard';
import {
  CentroAyudaService,
  PERMISOS_CENTRO_AYUDA as P,
  TAMANO_MAXIMO_ARCHIVO,
  directorioCentroAyuda,
  extensionDe,
  extensionPermitida,
  type ArchivoSubido,
} from './centro-ayuda.service';
import {
  CambiarVisibilidadDto,
  GuardarRecursoDto,
  GuardarSeccionDto,
  OrdenarSeccionesDto,
} from './dto/centro-ayuda.dto';

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

function rolesDe(req: any): string[] {
  const roles = req?.user?.roles;
  if (!Array.isArray(roles)) return [];
  return roles
    .map((rol: any) => (typeof rol === 'string' ? rol : rol?.code))
    .filter((codigo: unknown): codigo is string => typeof codigo === 'string' && codigo.length > 0);
}

/** Todo el controlador se apaga si el módulo está inactivo en Gestión de módulos. */
@Controller('centro-ayuda')
@UseGuards(CentroAyudaActivoGuard)
export class CentroAyudaController {
  constructor(private readonly centroAyuda: CentroAyudaService) {}

  // ── Lo que ven los usuarios ───────────────────────────────────────────────

  /** Secciones visibles con sus recursos visibles; lo ve cualquier usuario con sesión. */
  @Get('secciones')
  listarPublicado() {
    return this.centroAyuda.listarPublicado();
  }

  /**
   * Entrega el archivo de un recurso publicado. Es público porque lo descarga
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

  // ── Administración ────────────────────────────────────────────────────────

  /** Qué botones mostrar en la administración: se calcula con los permisos actuales del rol. */
  @Get('admin/permisos')
  misPermisos(@Req() req: any) {
    return this.centroAyuda.permisosDe(rolesDe(req));
  }

  @Get('admin/secciones')
  @UseGuards(PermisosGuard)
  @RequierePermisos(P.ver)
  listarSecciones() {
    return this.centroAyuda.listarSecciones();
  }

  @Post('admin/secciones')
  @UseGuards(PermisosGuard)
  @RequierePermisos(P.crearSecciones)
  @HttpCode(HttpStatus.CREATED)
  crearSeccion(@Body() dto: GuardarSeccionDto, @Req() req: any) {
    return this.centroAyuda.crearSeccion(dto, usuarioDe(req));
  }

  // Antes que admin/secciones/:id para que "orden" no se lea como un id.
  @Put('admin/secciones/orden')
  @UseGuards(PermisosGuard)
  @RequierePermisos(P.editarSecciones)
  ordenarSecciones(@Body() dto: OrdenarSeccionesDto, @Req() req: any) {
    return this.centroAyuda.ordenarSecciones(dto.ids, usuarioDe(req));
  }

  @Put('admin/secciones/:id')
  @UseGuards(PermisosGuard)
  @RequierePermisos(P.editarSecciones)
  actualizarSeccion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GuardarSeccionDto,
    @Req() req: any,
  ) {
    return this.centroAyuda.actualizarSeccion(id, dto, usuarioDe(req));
  }

  @Patch('admin/secciones/:id/visibilidad')
  @UseGuards(PermisosGuard)
  @RequierePermisos(P.editarSecciones)
  cambiarVisibilidadSeccion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarVisibilidadDto,
    @Req() req: any,
  ) {
    return this.centroAyuda.cambiarVisibilidadSeccion(id, dto.activo, usuarioDe(req));
  }

  @Delete('admin/secciones/:id')
  @UseGuards(PermisosGuard)
  @RequierePermisos(P.eliminarSecciones)
  eliminarSeccion(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.centroAyuda.eliminarSeccion(id, usuarioDe(req));
  }

  @Post('admin/secciones/:id/restaurar')
  @UseGuards(PermisosGuard)
  @RequierePermisos(P.eliminarSecciones)
  restaurarSeccion(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.centroAyuda.restaurarSeccion(id, usuarioDe(req));
  }

  @Get('admin/recursos')
  @UseGuards(PermisosGuard)
  @RequierePermisos(P.ver)
  listarRecursos() {
    return this.centroAyuda.listarRecursos();
  }

  @Post('admin/recursos')
  @UseGuards(PermisosGuard)
  @RequierePermisos(P.crearRecursos)
  @UseInterceptors(subidaDeArchivo)
  @HttpCode(HttpStatus.CREATED)
  crearRecurso(
    @Body() dto: GuardarRecursoDto,
    @UploadedFile() archivo: ArchivoSubido | undefined,
    @Req() req: any,
  ) {
    return this.centroAyuda.crearRecurso(dto, archivo, usuarioDe(req));
  }

  @Put('admin/recursos/:id')
  @UseGuards(PermisosGuard)
  @RequierePermisos(P.editarRecursos)
  @UseInterceptors(subidaDeArchivo)
  actualizarRecurso(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GuardarRecursoDto,
    @UploadedFile() archivo: ArchivoSubido | undefined,
    @Req() req: any,
  ) {
    return this.centroAyuda.actualizarRecurso(id, dto, archivo, usuarioDe(req));
  }

  @Patch('admin/recursos/:id/visibilidad')
  @UseGuards(PermisosGuard)
  @RequierePermisos(P.editarRecursos)
  cambiarVisibilidadRecurso(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarVisibilidadDto,
    @Req() req: any,
  ) {
    return this.centroAyuda.cambiarVisibilidadRecurso(id, dto.activo, usuarioDe(req));
  }

  @Delete('admin/recursos/:id')
  @UseGuards(PermisosGuard)
  @RequierePermisos(P.eliminarRecursos)
  eliminarRecurso(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.centroAyuda.eliminarRecurso(id, usuarioDe(req));
  }

  @Post('admin/recursos/:id/restaurar')
  @UseGuards(PermisosGuard)
  @RequierePermisos(P.eliminarRecursos)
  restaurarRecurso(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.centroAyuda.restaurarRecurso(id, usuarioDe(req));
  }

  @Get('admin/papelera')
  @UseGuards(PermisosGuard)
  @RequierePermisos(P.ver)
  papelera() {
    return this.centroAyuda.papelera();
  }
}
