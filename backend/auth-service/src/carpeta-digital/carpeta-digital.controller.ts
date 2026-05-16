import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
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
}
