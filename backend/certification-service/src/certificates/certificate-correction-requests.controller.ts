import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { createReadStream, existsSync, mkdirSync, readFileSync, unlinkSync } from 'fs';
import { extname, resolve, sep } from 'path';
import type { Response } from 'express';
import { Public } from '../auth/public.decorator';
import {
  CertificatesService,
  type CorrectedCertificateData,
} from './certificates.service';

const MAX_EVIDENCE_SIZE = 10 * 1024 * 1024;
const REQUEST_EVIDENCE_DIR = './private-uploads/certificate-corrections/submitted';
const RESOLUTION_EVIDENCE_DIR = './private-uploads/certificate-corrections/resolution';

const ensureDirectory = (directory: string) => {
  mkdirSync(directory, { recursive: true });
  return directory;
};

const evidenceFilename = (prefix: string, originalName: string) => {
  const safeExtension = extname(originalName || '').toLowerCase();
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${prefix}-${unique}${safeExtension}`;
};

const requestEvidenceUpload = {
  storage: diskStorage({
    destination: (_req: any, _file: any, callback: any) => {
      try {
        callback(null, ensureDirectory(REQUEST_EVIDENCE_DIR));
      } catch (error) {
        callback(error, REQUEST_EVIDENCE_DIR);
      }
    },
    filename: (_req: any, file: any, callback: any) =>
      callback(null, evidenceFilename('solicitud', file.originalname)),
  }),
  fileFilter: (_req: any, file: any, callback: any) => {
    const extension = extname(file.originalname || '').toLowerCase();
    const validMime = ['application/pdf', 'image/png', 'image/jpeg'].includes(file.mimetype);
    const validExtension = ['.pdf', '.png', '.jpg', '.jpeg'].includes(extension);
    if (!validMime || !validExtension) {
      return callback(new BadRequestException('Solo se permiten archivos PDF, PNG, JPG o JPEG.'), false);
    }
    callback(null, true);
  },
  limits: { fileSize: MAX_EVIDENCE_SIZE, files: 3 },
};

const resolutionEvidenceUpload = {
  storage: diskStorage({
    destination: (_req: any, _file: any, callback: any) => {
      try {
        callback(null, ensureDirectory(RESOLUTION_EVIDENCE_DIR));
      } catch (error) {
        callback(error, RESOLUTION_EVIDENCE_DIR);
      }
    },
    filename: (_req: any, file: any, callback: any) =>
      callback(null, evidenceFilename('respuesta', file.originalname)),
  }),
  fileFilter: (_req: any, file: any, callback: any) => {
    const extension = extname(file.originalname || '').toLowerCase();
    const validMime = ['image/png', 'image/jpeg'].includes(file.mimetype);
    const validExtension = ['.png', '.jpg', '.jpeg'].includes(extension);
    if (!validMime || !validExtension) {
      return callback(new BadRequestException('La evidencia de la decisión solo puede ser PNG, JPG o JPEG.'), false);
    }
    callback(null, true);
  },
  limits: { fileSize: MAX_EVIDENCE_SIZE, files: 2 },
};

@Controller('certificates')
export class CertificateCorrectionRequestsController {
  constructor(private readonly certificatesService: CertificatesService) {}

  private cleanupFiles(files: any[] = []) {
    for (const file of files) {
      try {
        if (file?.path && existsSync(file.path)) unlinkSync(file.path);
      } catch {
        // La limpieza de un archivo huérfano no debe ocultar el error original.
      }
    }
  }

  private assertValidFileSignatures(files: any[]) {
    for (const file of files) {
      const header = readFileSync(file.path).subarray(0, 8);
      const isPdf = header.subarray(0, 5).equals(Buffer.from('%PDF-'));
      const isPng = header.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      const isJpeg = header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
      const valid =
        (file.mimetype === 'application/pdf' && isPdf) ||
        (file.mimetype === 'image/png' && isPng) ||
        (file.mimetype === 'image/jpeg' && isJpeg);
      if (!valid) {
        throw new BadRequestException(`${file.originalname}: el contenido del archivo no coincide con su formato.`);
      }
    }
  }

  private normalizeRole(value: unknown) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private assertCoordinator(req: any) {
    const rolesFromToken = Array.isArray(req?.user?.roles) ? req.user.roles : [req?.user?.roles];
    const rolesFromHeader = String(req?.headers?.['x-user-roles'] || '').split(',');
    const roles = [...rolesFromToken, ...rolesFromHeader]
      .flatMap((role: any) =>
        typeof role === 'object' && role
          ? [role.code, role.name]
          : [role],
      )
      .map((role) => this.normalizeRole(role))
      .filter(Boolean);
    const allowedRoles = new Set([
      'COORDINADOR_CERT_LABORAL',
      'COORDINADOR_CERTIFICADOS_LABORALES',
      'ADMIN_CERTIFICADOS_LABORALES',
      'ADMIN_CERT_LABORAL',
      'SUPER_ADMIN',
      'SUPERADMIN',
      'ADMIN',
      'ADMINISTRADOR',
    ]);
    if (!roles.some((role) => allowedRoles.has(role))) {
      throw new ForbiddenException('Solo el Coordinador de Certificados Laborales puede gestionar estas solicitudes.');
    }
  }

  private reviewer(req: any) {
    return {
      id: String(req?.user?.userId || req?.headers?.['x-user-id'] || '').trim() || undefined,
      name:
        String(req?.user?.name || req?.user?.username || req?.headers?.['x-user-name'] || req?.headers?.['x-user-username'] || '').trim() ||
        undefined,
      email: String(req?.user?.email || req?.headers?.['x-user-email'] || '').trim() || undefined,
    };
  }

  @Public()
  @Post('public/correction-requests')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('files', 3, requestEvidenceUpload))
  async createPublicCorrectionRequest(
    @Body() body: { certificateId?: string; verificationCode?: string; description?: string },
    @UploadedFiles() files: any[] = [],
  ) {
    try {
      this.assertValidFileSignatures(files || []);
      return await this.certificatesService.createCertificateCorrectionRequest(body, files || []);
    } catch (error) {
      this.cleanupFiles(files);
      throw error;
    }
  }

  @Get('correction-requests/stats')
  async getStats(@Req() req: any) {
    this.assertCoordinator(req);
    return this.certificatesService.getCertificateCorrectionStats();
  }

  @Get('correction-requests')
  async list(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    this.assertCoordinator(req);
    return this.certificatesService.listCertificateCorrectionRequests({
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      status,
      search,
    });
  }

  @Get('correction-requests/:id')
  async getOne(@Req() req: any, @Param('id') id: string) {
    this.assertCoordinator(req);
    return this.certificatesService.getCertificateCorrectionRequest(id);
  }

  @Post('correction-requests/:id/preview')
  async preview(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: CorrectedCertificateData,
  ) {
    this.assertCoordinator(req);
    return this.certificatesService.previewCertificateCorrectionRequest(id, body);
  }

  @Patch('correction-requests/:id/start-review')
  async startReview(@Req() req: any, @Param('id') id: string) {
    this.assertCoordinator(req);
    return this.certificatesService.startCertificateCorrectionReview(id, this.reviewer(req));
  }

  @Post('correction-requests/:id/approve')
  @UseInterceptors(FilesInterceptor('files', 2, resolutionEvidenceUpload))
  async approve(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: CorrectedCertificateData,
    @UploadedFiles() files: any[] = [],
  ) {
    try {
      this.assertCoordinator(req);
      this.assertValidFileSignatures(files || []);
      return await this.certificatesService.approveCertificateCorrectionRequest(
        id,
        body,
        this.reviewer(req),
        files || [],
      );
    } catch (error) {
      this.cleanupFiles(files);
      throw error;
    }
  }

  @Post('correction-requests/:id/reject')
  @UseInterceptors(FilesInterceptor('files', 2, resolutionEvidenceUpload))
  async reject(
    @Req() req: any,
    @Param('id') id: string,
    @Body('description') description: string,
    @UploadedFiles() files: any[] = [],
  ) {
    try {
      this.assertCoordinator(req);
      this.assertValidFileSignatures(files || []);
      return await this.certificatesService.rejectCertificateCorrectionRequest(
        id,
        description,
        files || [],
        this.reviewer(req),
      );
    } catch (error) {
      this.cleanupFiles(files);
      throw error;
    }
  }

  @Get('correction-requests/:id/evidence/:kind/:index')
  async evidence(
    @Req() req: any,
    @Param('id') id: string,
    @Param('kind') kindParam: string,
    @Param('index') indexParam: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.assertCoordinator(req);
    if (!['submitted', 'resolution'].includes(kindParam)) {
      throw new BadRequestException('Tipo de evidencia no válido.');
    }
    const index = Number(indexParam);
    if (!Number.isInteger(index) || index < 0) throw new BadRequestException('Índice de evidencia no válido.');

    const file = await this.certificatesService.getCertificateCorrectionEvidence(
      id,
      kindParam as 'submitted' | 'resolution',
      index,
    );
    const correctionRoot = resolve(process.cwd(), 'private-uploads', 'certificate-corrections');
    const absolutePath = resolve(process.cwd(), file.relativePath);
    if (!absolutePath.startsWith(`${correctionRoot}${sep}`) && absolutePath !== correctionRoot) {
      throw new ForbiddenException('Ruta de evidencia no válida.');
    }
    if (!existsSync(absolutePath)) throw new BadRequestException('El archivo de evidencia ya no está disponible.');

    const safeName = file.originalName.replace(/["\r\n]/g, '_');
    response.set({
      'Content-Type': file.mimeType,
      'Content-Length': String(file.size),
      'Content-Disposition': `inline; filename="${safeName}"`,
      'Cache-Control': 'private, no-store',
    });
    return new StreamableFile(createReadStream(absolutePath));
  }
}
