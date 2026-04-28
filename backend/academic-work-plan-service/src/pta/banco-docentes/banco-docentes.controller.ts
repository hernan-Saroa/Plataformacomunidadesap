import { Body, Controller, Delete, Get, Param, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as xlsx from 'xlsx';
import { BancoDocentesService } from './banco-docentes.service';
import { sanitizeDeepStrings } from '../utils/text-sanitizer';
import { Public } from '../../auth/public.decorator';

@Public()
@Controller('pta/banco-docentes')
export class BancoDocentesController {
  constructor(private readonly service: BancoDocentesService) {}

  @Get()
  async list(
    @Query('territorial') territorial?: string,
    @Query('dedicacion') dedicacion?: string,
    @Query('estado') estado?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.service.list({
      territorial,
      dedicacion,
      estado,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    // Devolvemos items + paginación en el nivel raíz (sin wrapper "data")
    // para que el apiClient del shell no desenvuelva y descarte total/pages.
    return { success: true, items: result.data, total: result.total, page: result.page, pages: result.pages, limit: result.limit };
  }

  @Get('stats')
  async stats() {
    return { success: true, data: await this.service.getStats() };
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return { success: true, data: await this.service.getById(id) };
  }

  @Post()
  async create(@Body() body: any) {
    const result = await this.service.upsertDocente(body, { rejectExisting: true });
    return { success: true, data: result };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const result = await this.service.updateDocente(id, body);
    return { success: true, data: result };
  }

  @Delete(':id')
  async toggleEstado(@Param('id') id: string) {
    const result = await this.service.toggleEstado(id);
    return { success: true, data: result };
  }

  @Post('bulk')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async bulkUpload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: any,
  ) {
    let rows: any[] = [];

    if (file) {
      const workbook = xlsx.read(file.buffer, { type: 'buffer', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = xlsx.utils.sheet_to_json(sheet, { defval: null });
      rows = sanitizeDeepStrings(rows) as any[];
    } else if (body?.rows) {
      rows = Array.isArray(body.rows) ? body.rows : [];
    } else {
      return { success: false, message: 'Se requiere un archivo Excel o un array de rows en el body.' };
    }

    if (rows.length === 0) {
      return { success: false, message: 'El archivo no contiene filas de datos.' };
    }

    const result = await this.service.bulkUpsert(rows, { rejectExisting: false });
    return { success: true, data: result };
  }

  @Post('sync-auth')
  async syncAuth() {
    const authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    const result = await this.service.syncToAuthService(authUrl);
    return { success: true, data: result };
  }

  @Post('sync-from-auth')
  async syncFromAuth() {
    const authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    const result = await this.service.syncFromAuthService(authUrl);
    return { success: true, data: result };
  }
}
