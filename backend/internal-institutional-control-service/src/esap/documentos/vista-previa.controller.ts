import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { extname, join, resolve } from 'path';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { ControlInternoPermissions as CIP } from '../../common/permissions.constants';
import { OnlyOfficeService } from '../common/onlyoffice.service';

interface ArchivoSubido {
  originalname: string;
  buffer: Buffer;
  size: number;
}

/** Un documento generado en pantalla vive solo lo que dura la revisión. */
const VIGENCIA_MS = 30 * 60 * 1000;
const CARPETA = join(process.env.UPLOAD_PATH || tmpdir(), 'vista-previa');
const ID_VALIDO = /^[0-9a-f-]{36}$/i;

/**
 * Vista previa con OnlyOffice de documentos que se generan en el navegador
 * (Plan Anual en PDF, Programa Anual en Excel) antes de descargarlos o firmarlos
 * (EFDS-2320).
 *
 * OnlyOffice descarga el archivo desde su contenedor y sin sesión, así que el
 * archivo queda un rato en el servidor detrás de un id aleatorio y se borra solo.
 */
@Controller('vista-previa')
export class VistaPreviaController {
  constructor(private readonly onlyOfficeService: OnlyOfficeService) {}

  /** POST /vista-previa: guarda el documento generado y devuelve su id. */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_VIEW, CIP.PLAN_ANUAL_APPROVE, CIP.PLAN_ANUAL_EXPORT, CIP.AUDITORIA_VIEW)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  subir(@UploadedFile() file: ArchivoSubido) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No se recibió el documento');
    }
    const nombre = file.originalname || 'documento';
    if (!this.onlyOfficeService.puedePrevisualizar(nombre)) {
      throw new BadRequestException(`Este tipo de archivo no se puede previsualizar: ${nombre}`);
    }

    this.borrarVencidos();
    mkdirSync(CARPETA, { recursive: true });
    const id = randomUUID();
    writeFileSync(join(CARPETA, this.nombreEnDisco(id, nombre)), file.buffer);
    return { id };
  }

  /** GET /vista-previa/:id/onlyoffice-config */
  @Get(':id/onlyoffice-config')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_VIEW, CIP.PLAN_ANUAL_APPROVE, CIP.PLAN_ANUAL_EXPORT, CIP.AUDITORIA_VIEW)
  config(@Param('id') id: string, @Req() req: any) {
    const archivo = this.buscar(id);
    return this.onlyOfficeService.generarConfigVista(
      `/vista-previa/${id}/archivo`,
      `vp${id}`,
      archivo.nombre,
      {
        id: req.user?.userId || 'anonimo',
        nombre: req.user?.username || 'Usuario',
      },
    );
  }

  /** GET /vista-previa/:id/archivo: público para que lo descargue OnlyOffice. */
  @Get(':id/archivo')
  @Public()
  archivo(@Param('id') id: string, @Res() res: Response) {
    const archivo = this.buscar(id);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(archivo.nombre)}`);
    return res.sendFile(resolve(archivo.ruta));
  }

  /** El nombre original va en el nombre del archivo para no depender de memoria. */
  private nombreEnDisco(id: string, nombre: string): string {
    const base = Buffer.from(nombre, 'utf8').toString('base64url');
    return `${id}__${base}${extname(nombre).toLowerCase()}`;
  }

  private buscar(id: string): { ruta: string; nombre: string } {
    if (!ID_VALIDO.test(id) || !existsSync(CARPETA)) {
      throw new NotFoundException('La vista previa ya no está disponible');
    }
    const enDisco = readdirSync(CARPETA).find((f) => f.startsWith(`${id}__`));
    if (!enDisco) throw new NotFoundException('La vista previa ya no está disponible');

    const ruta = join(CARPETA, enDisco);
    if (Date.now() - statSync(ruta).mtimeMs > VIGENCIA_MS) {
      unlinkSync(ruta);
      throw new NotFoundException('La vista previa venció, ábrala de nuevo');
    }
    const base = enDisco.slice(id.length + 2).replace(/\.[^.]+$/, '');
    return { ruta, nombre: Buffer.from(base, 'base64url').toString('utf8') };
  }

  private borrarVencidos(): void {
    if (!existsSync(CARPETA)) return;
    for (const f of readdirSync(CARPETA)) {
      const ruta = join(CARPETA, f);
      try {
        if (Date.now() - statSync(ruta).mtimeMs > VIGENCIA_MS) unlinkSync(ruta);
      } catch {
        // otro proceso ya lo borró
      }
    }
  }
}
