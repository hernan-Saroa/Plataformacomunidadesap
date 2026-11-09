import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { join } from 'path';
import { unlink } from 'fs/promises';

import { AnexoCargado, SupervisionService } from './supervision.service';
import {
  DesignarSupervisorDto,
  ReasignarSupervisorDto,
  ReenviarCorreoSupervisorDto,
  RelevarSupervisorDto,
} from './dto/supervision.dto';
import { RolesGuard } from '../../auth/roles.guard';

import { getHiringAccess } from '../../auth/hiring-access';
import { Puede } from '../../auth/puede.guard';

import {
  MIME_DOCUMENTOS,
  MIME_IMAGENES,
  opcionesDeCarga,
  sha256Archivo,
  STORAGE_PATH,
} from '../archivos';

/** Cuántos documentos puede llevar el correo al supervisor, además del acto (124). */
const MAX_ANEXOS_CORREO = 10;

/**
 * El acto y los documentos para el supervisor llegan en el mismo multipart.
 * Los documentos admiten también imágenes —un pantallazo de SECOP II—; el acto
 * no, y eso se revisa aparte porque el filtro de multer es uno para los dos.
 */
const CARGA_DESIGNACION = FileFieldsInterceptor(
  [
    { name: 'file', maxCount: 1 },
    { name: 'adjuntos', maxCount: MAX_ANEXOS_CORREO },
  ],
  opcionesDeCarga(
    [...MIME_DOCUMENTOS, ...MIME_IMAGENES],
    'El acto se carga en PDF, Word o Excel; los documentos para el supervisor, además, en PNG o JPG',
  ),
);

type CargaDesignacion = { file?: any[]; adjuntos?: any[] };

/** Todo lo que llegó en la petición, para borrarlo del disco si algo falla. */
const rutasDe = (archivos: any[]) => archivos.map((a) => join(STORAGE_PATH, a.filename));

async function conHash(archivos: any[]): Promise<AnexoCargado[]> {
  return Promise.all(
    archivos.map(async (archivo) => ({
      archivo,
      hash: await sha256Archivo(join(STORAGE_PATH, archivo.filename)),
    })),
  );
}

/**
 * Supervisión del contrato — actividad 8.2 (EFDS-1165).
 *
 * Designar es competencia del Ordenador del Gasto y no del gestor que lleva el
 * proceso: es él quien responde por a quién encarga la vigilancia. Mismo
 * criterio que la designación del comité evaluador.
 */
@ApiTags('Etapa 8 · Supervisión del contrato')
@Controller('procesos/:id/supervision')
export class SupervisionController {
  constructor(private readonly service: SupervisionService) {}

  @Get()
  @Puede('ver', '8.2')
  @ApiOperation({
    summary: 'Supervisor del contrato',
    description:
      'Si el contrato admite supervisor, quién lo supervisa, si ya se le avisó y quiénes lo supervisaron antes.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post()
  @Puede('decidir', '8.2')
  @UseInterceptors(CARGA_DESIGNACION)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 8.2 · Designar el supervisor',
    description:
      'Con el acto administrativo firmado. Sobre un contrato ya perfeccionado por las dos partes. Al supervisor le sale un correo con el acto y los `adjuntos` que se manden (124).',
  })
  async designar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: DesignarSupervisorDto,
    @UploadedFiles() archivos: CargaDesignacion,
    @Req() req: any,
  ) {
    const file = archivos?.file?.[0];
    const adjuntos = archivos?.adjuntos ?? [];
    const todos = [...(file ? [file] : []), ...adjuntos];

    try {
      const acto = this.exigirActo(
        file,
        'Adjunta el acto de designación: sin él hay un nombre, no un supervisor',
      );
      return await this.service.designar(
        procesoId,
        dto,
        acto,
        await sha256Archivo(join(STORAGE_PATH, acto.filename)),
        getHiringAccess(req),
        await conHash(adjuntos),
      );
    } catch (error) {
      await Promise.all(rutasDe(todos).map((r) => unlink(r).catch(() => undefined)));
      throw error;
    }
  }

  @Post('relevar')
  @Puede('decidir', '8.2')
  @ApiOperation({
    summary: 'Relevar al supervisor vigente',
    description:
      'El relevado se conserva en el expediente con su motivo: vigiló ese periodo y respondió por él. Después se designa otro.',
  })
  relevar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RelevarSupervisorDto,
    @Req() req: any,
  ) {
    return this.service.relevar(procesoId, dto, getHiringAccess(req));
  }

  /**
   * Actividad 9.3 · Reasignación de la supervisión (EFDS-1169).
   *
   * Declara permiso y no roles: los roles los crea y renombra el administrador
   * desde la plataforma, así que nombrarlos aquí ataría el endpoint a una
   * configuración que puede cambiar mañana.
   */
  @Post('reasignar')
  @Puede('decidir', '9.3')
  @UseInterceptors(CARGA_DESIGNACION)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 9.3 · Reasignar la supervisión del contrato',
    description:
      'Releva al vigente y designa al nuevo en un solo acto, para que el contrato no quede sin quien lo vigile. El anterior se conserva en el expediente con el motivo del cambio.',
  })
  async reasignar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: ReasignarSupervisorDto,
    @UploadedFiles() archivos: CargaDesignacion,
    @Req() req: any,
  ) {
    const file = archivos?.file?.[0];
    const adjuntos = archivos?.adjuntos ?? [];
    const todos = [...(file ? [file] : []), ...adjuntos];

    try {
      const acto = this.exigirActo(
        file,
        'Adjunta el acto de reasignación: sin él hay un cambio de nombre, no una designación',
      );
      return await this.service.reasignar(
        procesoId,
        dto,
        acto,
        await sha256Archivo(join(STORAGE_PATH, acto.filename)),
        getHiringAccess(req),
        await conHash(adjuntos),
      );
    } catch (error) {
      await Promise.all(rutasDe(todos).map((r) => unlink(r).catch(() => undefined)));
      throw error;
    }
  }

  /**
   * Vuelve a mandarle el correo al supervisor vigente (124), con documentos
   * nuevos si se agregan. Lo puede pedir quien designa (8.2) o quien reasigna
   * (9.3): el aviso es parte de los dos actos.
   */
  @Post('correo')
  @Puede('decidir', '8.2')
  @UseInterceptors(
    FilesInterceptor(
      'adjuntos',
      MAX_ANEXOS_CORREO,
      opcionesDeCarga(
        [...MIME_DOCUMENTOS, ...MIME_IMAGENES],
        'Los documentos para el supervisor se cargan en PDF, Word, Excel, PNG o JPG',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Reenviar el correo al supervisor',
    description:
      'Con el acto, los documentos ya enviados y los `adjuntos` nuevos, que quedan en el expediente en la 8.2. `correo.enviado` dice si salió.',
  })
  async reenviarCorreo(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: ReenviarCorreoSupervisorDto,
    @UploadedFiles() adjuntos: any[] = [],
    @Req() req: any,
  ) {
    try {
      return await this.service.reenviarCorreo(
        procesoId,
        dto.mensaje,
        await conHash(adjuntos ?? []),
        getHiringAccess(req),
      );
    } catch (error) {
      await Promise.all(rutasDe(adjuntos ?? []).map((r) => unlink(r).catch(() => undefined)));
      throw error;
    }
  }

  @Post('aviso')
  @Puede('decidir', '8.2')
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(
        [...MIME_DOCUMENTOS, ...MIME_IMAGENES],
        'La evidencia de la notificación se carga en PDF, Word, Excel, PNG o JPG',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Dejar constancia de que se le avisó al supervisor',
    description:
      'Lo normal es que lo haga el correo de la designación (124); esto queda para cuando no salió y se le avisó por fuera, con la evidencia obligatoria en `file` (sesión de QA del 04/11).',
  })
  async registrarAviso(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    try {
      return await this.service.registrarAviso(
        procesoId,
        getHiringAccess(req),
        file,
        file ? await sha256Archivo(join(STORAGE_PATH, file.filename)) : undefined,
      );
    } catch (error) {
      if (file) await unlink(join(STORAGE_PATH, file.filename)).catch(() => undefined);
      throw error;
    }
  }

  /** El acto es un acto administrativo: solo ofimáticos, aunque los anexos admitan imágenes. */
  private exigirActo(file: any, mensajeSinActo: string) {
    if (!file) throw new BadRequestException(mensajeSinActo);
    if (!MIME_DOCUMENTOS.includes(file.mimetype)) {
      throw new BadRequestException('El acto se carga en PDF, Word o Excel');
    }
    return file;
  }
}
