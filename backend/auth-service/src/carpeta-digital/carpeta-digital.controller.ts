import { Body, Controller, Delete, Get, Param, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { CarpetaDigitalService } from './carpeta-digital.service';

@Controller()
export class CarpetaDigitalController {
  constructor(private readonly carpetaDigitalService: CarpetaDigitalService) {}

  @Get('carpeta-digital')
  async getAllCarpetas() {
    const data = await this.carpetaDigitalService.getAllCarpetas();
    return { success: true, data };
  }

  @Get('carpeta-digital/persona/:personaId')
  async getCarpetaByPersona(@Param('personaId') personaId: string) {
    const data = await this.carpetaDigitalService.getCarpetaByPersona(personaId);
    return { success: true, data };
  }

  @Get('carpeta-digital/persona/:personaId/checklist')
  async getChecklistForPersona(@Param('personaId') personaId: string) {
    const data = await this.carpetaDigitalService.getChecklistForPersona(personaId);
    return { success: true, data };
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
  async getDocumentosByPersona(@Param('personaId') personaId: string) {
    const data = await this.carpetaDigitalService.listDocumentosByPersona(personaId);
    return { success: true, data };
  }

  @Post('carpeta-digital/persona/:personaId/documentos/upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, _file, cb) => {
        const personaId = (req.params as any).personaId || 'desconocido';
        const path = `./uploads/carpeta-digital/${personaId}`;
        if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });
        cb(null, path);
      },
      filename: (_req, file, cb) => {
        const rand = Array(32).fill(null).map(() => Math.round(Math.random() * 16).toString(16)).join('');
        cb(null, `${rand}${extname(file.originalname)}`);
      },
    }),
  }))
  async uploadDocumento(
    @Param('personaId') personaId: string,
    @Body() body: any,
    @UploadedFile() file?: any,
  ) {
    if (!file) return { success: false, message: 'Archivo requerido' };
    const cleanId = String(personaId || '').replace(/^carpeta:/, '');
    const urlArchivo = `/auth/api/v1/uploads/carpeta-digital/${cleanId}/${file.filename}`;
    const data = await this.carpetaDigitalService.createDocumento({
      personaId: cleanId,
      nombre: file.originalname,
      urlArchivo,
      tipoDocumentoId: body?.tipoDocumentoId || body?.tipoDocumento || null,
      rundSoporteId: body?.rundSoporteId || null,
      categoria: body?.categoria || 'otros',
      tipoArchivo: extname(file.originalname).replace('.', '').toLowerCase(),
      tamanoBytes: file.size,
      comentarios: body?.descripcion || null,
    });
    return { success: true, data };
  }

  @Put('carpeta-digital/documentos/:id/reclassify')
  async reclassifyDocumento(@Param('id') id: string, @Body() body: any) {
    const data = await this.carpetaDigitalService.reclassifyDocumento(id, {
      tipoDocumentoId: body?.tipo_documento_id || body?.tipoDocumentoId,
      categoria: body?.categoria,
    });
    return { success: true, data };
  }

  @Put('carpeta-digital/documentos/:id/validate')
  async validateDocumento(@Param('id') id: string, @Body() body: any) {
    const data = await this.carpetaDigitalService.validateDocumento(id, {
      estado: body?.estado,
      comentarios: body?.comentarios,
      validadoPor: body?.validadoPor,
    });
    return { success: true, data };
  }

  @Delete('carpeta-digital/documentos/:id')
  async deleteDocumento(@Param('id') id: string) {
    const data = await this.carpetaDigitalService.deleteDocumento(id);
    return { success: true, data };
  }
}
