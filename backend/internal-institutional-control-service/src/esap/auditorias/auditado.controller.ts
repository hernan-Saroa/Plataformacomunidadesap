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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync, renameSync } from 'fs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuditoriasService } from './auditorias.service';
import { HallazgosService } from '../hallazgos/hallazgos.service';
import { DocumentosService } from '../documentos/documentos.service';
import { CreateDocumentoDto } from '../documentos/dto/create-documento.dto';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

/**
 * Controller dedicado al portal del AUDITADO (responsable del área auditada).
 *
 * Filosofía:
 *  - Todas las rutas usan únicamente JwtAuthGuard (NO requieren permisos de
 *    `control-interno.*`), porque el auditado es un usuario funcional, no
 *    miembro de la OCI.
 *  - La autorización se realiza por *ownership*: el email/username del JWT
 *    debe coincidir con `auditoria.responsable_area_email`.
 *  - Solo se exponen auditorías que ya fueron notificadas (fase >= comunicación).
 */
@Controller('auditorias/auditado')
@UseGuards(JwtAuthGuard)
export class AuditadoController {
  constructor(
    private readonly auditoriasService: AuditoriasService,
    private readonly hallazgosService: HallazgosService,
    private readonly documentosService: DocumentosService,
  ) {}

  private getUsuarioFromReq(req: any): { email?: string; username?: string } {
    const u = req?.user || {};
    return {
      email: u.email,
      username: u.username,
    };
  }

  /**
   * GET /auditorias/auditado/mis-auditorias
   * Lista las auditorías en las que el usuario autenticado figura como
   * responsable del área auditada.
   */
  @Get('mis-auditorias')
  async findMisAuditorias(@Req() req: any) {
    const { email, username } = this.getUsuarioFromReq(req);
    return this.auditoriasService.findMisAuditoriasByUsuario({
      email,
      username,
    });
  }

  /**
   * GET /auditorias/auditado/:id
   * Detalle completo de una de mis auditorías.
   */
  @Get(':id')
  async findMiAuditoria(@Param('id') id: string, @Req() req: any) {
    const usuario = this.getUsuarioFromReq(req);
    await this.auditoriasService.assertAuditadoOwnership(id, usuario);
    return this.auditoriasService.findOne(id);
  }

  /**
   * GET /auditorias/auditado/:id/hallazgos
   * Hallazgos de una de mis auditorías.
   */
  @Get(':id/hallazgos')
  async findMisHallazgos(@Param('id') id: string, @Req() req: any) {
    const usuario = this.getUsuarioFromReq(req);
    await this.auditoriasService.assertAuditadoOwnership(id, usuario);
    return this.hallazgosService.findByAuditoria(id);
  }

  /**
   * GET /auditorias/auditado/:id/documentos
   * Documentos asociados a una de mis auditorías.
   */
  @Get(':id/documentos')
  async findMisDocumentos(@Param('id') id: string, @Req() req: any) {
    const usuario = this.getUsuarioFromReq(req);
    await this.auditoriasService.assertAuditadoOwnership(id, usuario);
    return this.documentosService.findAll({ auditoriaId: id });
  }

  /**
   * GET /auditorias/auditado/:id/comunicacion/estado
   * Estado del flujo de comunicación visible al auditado.
   */
  @Get(':id/comunicacion/estado')
  async getEstadoComunicacion(@Param('id') id: string, @Req() req: any) {
    const usuario = this.getUsuarioFromReq(req);
    await this.auditoriasService.assertAuditadoOwnership(id, usuario);

    const [hallazgos, auditoria] = await Promise.all([
      this.hallazgosService.findByAuditoria(id),
      this.auditoriasService.findOne(id),
    ]);

    const hayEnBorrador = hallazgos.some(
      (h: any) => (h.estado || '').toLowerCase() === 'borrador',
    );
    const informePreliminarGenerado = !hayEnBorrador;
    const hayControversiasPendientes =
      await this.hallazgosService.hayControversiasPendientes(id);
    const checklist = (auditoria as any).checklistCompletados || {};
    const informeFinalGenerado = !!checklist.informeFinalGenerado;
    const informeEjecutivoGenerado = !!checklist.informeEjecutivoGenerado;

    return {
      informePreliminarGenerado,
      informeFinalGenerado,
      informeEjecutivoGenerado,
      hayControversiasPendientes,
      conteo: {
        pendiente: hallazgos.filter((h: any) => h.estado === 'notificado').length,
        aceptado: hallazgos.filter((h: any) => h.estado === 'aceptado').length,
        enControversia: hallazgos.filter(
          (h: any) => h.estado === 'en-controversia',
        ).length,
      },
    };
  }

  /**
   * POST /auditorias/auditado/:id/documentos
   * Subida de un documento (p.ej. evidencia anexa a una controversia)
   * por parte del auditado. El backend valida ownership de la auditoría
   * antes de aceptar el archivo.
   */
  @Post(':id/documentos')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadPath = process.env.UPLOAD_PATH || './uploads/control-interno';
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024,
      },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async uploadDocumento(
    @Param('id') auditoriaId: string,
    @UploadedFile() file: MulterFile,
    @Body() body: any,
    @Req() req: any,
  ) {
    const usuario = this.getUsuarioFromReq(req);
    await this.auditoriasService.assertAuditadoOwnership(auditoriaId, usuario);

    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    const createDto: CreateDocumentoDto = {
      nombre: body.nombre || file.originalname,
      descripcion: body.descripcion,
      tipoDocumento: body.tipoDocumento as any,
      etapa: body.etapa as any,
      auditoriaId,
      hallazgoId: body.hallazgoId || undefined,
      planMejoramientoId: body.planMejoramientoId || undefined,
      nombreArchivo: file.originalname,
      tipoMime: file.mimetype,
      tamanioBytes: file.size,
      subidoPor: usuario.username || usuario.email || 'Auditado',
      hashArchivo: undefined,
    };

    const rutaFinal = this.documentosService.generarRutaArchivo(
      file.originalname,
      auditoriaId,
      createDto.etapa,
    );

    const path = require('path');
    const dir = path.dirname(rutaFinal);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    renameSync(file.path, rutaFinal);

    return this.documentosService.create(createDto, rutaFinal);
  }

  /**
   * POST /auditorias/auditado/:id/hallazgos/:hallazgoId/aceptar
   * El auditado acepta un hallazgo notificado.
   */
  @Post(':id/hallazgos/:hallazgoId/aceptar')
  @HttpCode(HttpStatus.OK)
  async aceptarHallazgo(
    @Param('id') auditoriaId: string,
    @Param('hallazgoId') hallazgoId: string,
    @Req() req: any,
  ) {
    const usuario = this.getUsuarioFromReq(req);
    await this.auditoriasService.assertAuditadoOwnership(auditoriaId, usuario);

    const hallazgo = await this.hallazgosService.findOne(hallazgoId);
    if (hallazgo.auditoriaId !== auditoriaId) {
      throw new BadRequestException(
        'El hallazgo no pertenece a la auditoría indicada',
      );
    }

    return this.hallazgosService.aceptar(hallazgoId);
  }

  /**
   * POST /auditorias/auditado/:id/hallazgos/:hallazgoId/controversia
   * El auditado presenta controversia (con documento ya subido previamente).
   */
  @Post(':id/hallazgos/:hallazgoId/controversia')
  @HttpCode(HttpStatus.OK)
  async presentarControversia(
    @Param('id') auditoriaId: string,
    @Param('hallazgoId') hallazgoId: string,
    @Body()
    body: { argumentos: string; documentoId: string; documentoNombre: string },
    @Req() req: any,
  ) {
    const usuario = this.getUsuarioFromReq(req);
    await this.auditoriasService.assertAuditadoOwnership(auditoriaId, usuario);

    const hallazgo = await this.hallazgosService.findOne(hallazgoId);
    if (hallazgo.auditoriaId !== auditoriaId) {
      throw new BadRequestException(
        'El hallazgo no pertenece a la auditoría indicada',
      );
    }

    const { argumentos, documentoId, documentoNombre } = body || ({} as any);
    if (!documentoId || !documentoNombre) {
      throw new BadRequestException(
        'documentoId y documentoNombre son obligatorios (subir archivo primero)',
      );
    }

    return this.hallazgosService.presentarControversia(
      hallazgoId,
      argumentos,
      documentoId,
      documentoNombre,
    );
  }
}
