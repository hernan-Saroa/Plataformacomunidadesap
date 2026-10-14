import { BadRequestException, Body, ConflictException, Controller, Delete, Get, Header, Optional, Param, Post, Put, Query, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { CarpetaDigitalService } from './carpeta-digital.service';
import { DocumentTypeValidatorService } from './document-type-validator.service';
import { carpetaSessionToken } from './rund-carpeta.client';
import { rundDocumentActor } from './rund-document-access';
import { CarpetaDocumentVersionsService } from './carpeta-document-versions.service';
import type { Response } from 'express';

@Controller()
export class CarpetaDigitalController {
  constructor(
    private readonly carpetaDigitalService: CarpetaDigitalService,
    private readonly docTypeValidator: DocumentTypeValidatorService,
    @Optional() private readonly documentVersions?: CarpetaDocumentVersionsService,
  ) {}

  private versions() {
    if (!this.documentVersions) throw new ConflictException('El historial general no está disponible.');
    return this.documentVersions;
  }

  @Get('carpeta-digital')
  async getAllCarpetas(@Req() req?: any) {
    const data = await this.carpetaDigitalService.getAllCarpetas(req?.user,carpetaSessionToken(req));
    return { success: true, data };
  }

  @Get('carpeta-digital/persona/:personaId')
  async getCarpetaByPersona(@Param('personaId') personaId: string, @Req() req?: any) {
    const data = await this.carpetaDigitalService.getCarpetaByPersona(personaId,req?.user,carpetaSessionToken(req),true);
    return { success: true, data: { ...data, permite_originales_rund: rundDocumentActor(req?.user).fullAccess } };
  }

  @Get('carpeta-digital/persona/:personaId/checklist')
  async getChecklistForPersona(@Param('personaId') personaId: string) {
    const data = await this.carpetaDigitalService.getChecklistForPersona(personaId);
    return { success: true, data };
  }

  @Get('carpeta-digital/persona/:personaId/perfiles-rund')
  @Header('Cache-Control', 'private, no-store')
  async getRundProfiles(@Param('personaId') personaId: string, @Req() req?: any) {
    return {success:true,data:await this.carpetaDigitalService.getRundProfiles(personaId,req?.user,carpetaSessionToken(req))};
  }

  @Get('tipos-documentos')
  async getTiposDocumentos(@Query('carpetaDigitalId') carpetaDigitalId?: string) {
    const data = await this.carpetaDigitalService.getTiposDocumentos(carpetaDigitalId);
    return { success: true, data };
  }

  @Post('tipos-documentos')
  async createTipoDocumento(@Body() body: Record<string, any>) {
    const data = await this.carpetaDigitalService.createTipoDocumento(body || {});
    return { success: true, data };
  }

  @Put('tipos-documentos/:id')
  async updateTipoDocumento(@Param('id') id: string, @Body() body: Record<string, any>) {
    const data = await this.carpetaDigitalService.updateTipoDocumento(id, body || {});
    return { success: true, data };
  }

  @Delete('tipos-documentos/:id')
  async deleteTipoDocumento(@Param('id') id: string) {
    const data = await this.carpetaDigitalService.deleteTipoDocumento(id);
    return { success: true, data };
  }

  // ═══════════════════════════════════════════════════════════════════
  // DOCUMENTOS — endpoints para la UI (backoffice + portal)
  // ═══════════════════════════════════════════════════════════════════

  @Get('carpeta-digital/persona/:personaId/documentos')
  async getDocumentosByPersona(@Param('personaId') personaId: string, @Req() req?: any) {
    const data = await this.carpetaDigitalService.listDocumentosByPersona(personaId, req?.user, carpetaSessionToken(req));
    return { success: true, data };
  }

  @Post('carpeta-digital/persona/:personaId/documentos/upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 },
  }))
  async uploadDocumento(
    @Param('personaId') personaId: string,
    @Body() body: any,
    @UploadedFile() file?: any,
    @Req() req?: any,
  ) {
    if (!file) return { success: false, message: 'Archivo requerido' };
    const carpeta = await this.carpetaDigitalService.getCarpetaByPersona(personaId);
    const cleanId = carpeta.persona_id;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId)) throw new BadRequestException('Persona no válida.');
    const extension = extname(file.originalname || '').toLowerCase();
    if (!['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.xlsx', '.xls', '.pptx', '.ppt', '.txt', '.csv'].includes(extension)) {
      throw new BadRequestException('Formato de archivo no permitido.');
    }
    const filename = randomUUID() + extension;
    const directory = join(process.cwd(), 'uploads', 'carpeta-digital', cleanId);
    await fs.promises.mkdir(directory, { recursive: true });
    const storedPath = join(directory, filename);
    await fs.promises.writeFile(storedPath, file.buffer, { flag: 'wx' });
    const urlArchivo = `/auth/api/v1/uploads/carpeta-digital/${cleanId}/${filename}`;
    const tipoDocumentoId = body?.tipoDocumentoId || body?.tipoDocumento || null;

    try {
      // Validación SOFT de tipo: escanea el PDF y compara contra el nombre+descripción
      // del tipo de documento configurado (general o individual). No bloquea la carga.
      let validacionTipo: any = undefined;
      if (tipoDocumentoId) {
      const tipo = await this.carpetaDigitalService.findTipoDocumentoById(tipoDocumentoId);
      if (tipo) {
        validacionTipo = await this.docTypeValidator.validate({
          filePath: storedPath,
          originalName: file.originalname,
          expectedName: tipo.nombre,
          expectedDescription: tipo.descripcion || undefined,
        });
      }
      }

      const created = await this.carpetaDigitalService.createDocumento({
      personaId: cleanId,
      nombre: file.originalname,
      urlArchivo,
      tipoDocumentoId,
      rundSoporteId: body?.rundSoporteId || null,
      categoria: body?.categoria || 'otros',
      tipoArchivo: extname(file.originalname).replace('.', '').toLowerCase(),
      tamanoBytes: file.size,
      comentarios: body?.descripcion || null,
      }, req?.user);
      // validacionTipo se EMBEBE en data porque el apiClient del shell desenvuelve
      // {success, data} y descartaría cualquier campo hermano de data.
      const data = (created && typeof created === 'object' && !Array.isArray(created))
      ? { ...created, validacionTipo }
      : { resultado: created, validacionTipo };
      return { success: true, data };
    } catch (error) {
      await fs.promises.unlink(storedPath).catch(() => undefined);
      throw error;
    }
  }

  @Get('carpeta-digital/documentos/:id')
  async getDocumento(@Param('id') id: string, @Req() req?: any) {
    return { success: true, data: await this.carpetaDigitalService.getDocumento(id, req?.user, carpetaSessionToken(req)) };
  }

  @Get('carpeta-digital/documentos/:id/versiones')
  async history(@Param('id') id: string) {
    return { success: true, data: await this.versions().history(id) };
  }

  @Get('carpeta-digital/documentos/:id/versiones/:versionId/contenido')
  async versionContent(@Param('id') id: string, @Param('versionId') versionId: string, @Res() res: Response) {
    const file = await this.versions().download(id, versionId);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    res.send(file.bytes);
  }

  @Post('carpeta-digital/documentos/:id/versiones')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  async newVersion(@Param('id') id: string, @Body() body: any, @UploadedFile() file?: any, @Req() req?: any) {
    if (body?.etiqueta) throw new BadRequestException('Las etiquetas de versiones no están disponibles.');
    return { success: true, data: await this.versions().replace(id, file, Number(body?.version_actual), body?.comentarios, req?.user) };
  }

  @Post('carpeta-digital/documentos/:id/versiones/:versionId/restaurar')
  async restoreVersion(@Param('id') id: string, @Param('versionId') versionId: string, @Body() body: any, @Req() req?: any) {
    return { success: true, data: await this.versions().replace(id, undefined, Number(body?.version_actual), body?.comentarios, req?.user, versionId) };
  }

  @Put('carpeta-digital/documentos/:id/reclassify')
  async reclassifyDocumento(@Param('id') id: string, @Body() body: any, @Req() req?: any) {
    const data = await this.carpetaDigitalService.reclassifyDocumento(id, {
      tipoDocumentoId: body?.tipo_documento_id || body?.tipoDocumentoId,
      categoria: body?.categoria,
      revisionDocumento: body?.revision_documento,
    }, req?.user);
    return { success: true, data };
  }

  @Put('carpeta-digital/documentos/:id/validate')
  async validateDocumento(@Param('id') id: string, @Body() body: any, @Req() req?: any) {
    const data = await this.carpetaDigitalService.validateDocumento(id, {
      estado: body?.estado,
      comentarios: body?.comentarios,
      validadoPor: body?.validadoPor,
      revisionDocumento: body?.revision_documento,
    }, req?.user);
    return { success: true, data };
  }

  @Delete('carpeta-digital/documentos/:id')
  async deleteDocumento(@Param('id') id: string, @Req() req?: any, @Query('revision_documento') revision?: string) {
    const data = await this.carpetaDigitalService.deleteDocumento(id, req?.user, revision);
    return { success: true, data };
  }
}
