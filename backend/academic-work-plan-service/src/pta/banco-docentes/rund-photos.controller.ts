import { BadRequestException, Body, Controller, Get, Header, Param, ParseUUIDPipe, Post, Query, Req, Res, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { basename, extname } from 'path';
import { BancoDocentesRolesGuard } from './banco-docentes-roles.guard';
import { BancoDocentesService } from './banco-docentes.service';
import { RequireRundPermissions, RUND_PERMISSIONS } from './rund-permissions';
import { RundPhotosService } from './rund-photos.service';
import { PHOTO_MAX_BYTES } from './rund-photo-validation';

const options = { storage: memoryStorage(), limits: { fileSize: PHOTO_MAX_BYTES, files: 1 } };
const MANAGE = 'banco-docentes.rund.photos.manage';
const VALIDATE = 'banco-docentes.rund.photos.validate';

@Controller('pta/fotos-perfil')
@UseGuards(BancoDocentesRolesGuard)
export class RundPhotosController {
  constructor(private readonly photos: RundPhotosService, private readonly banco: BancoDocentesService) {}
  private actor(req: any) { return String(req.user.userId); }
  private async person(id: string) {
    const profile = await this.banco.getById(id);
    return String(profile.persona_id);
  }

  @Get('mia')
  @Header('Cache-Control','private, no-store')
  async own(@Req() req: any) { return this.photos.status(await this.photos.ownPerson(req.user)); }

  @Get('mia/publicada')
  async ownPublished(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control','private, no-store');
    return this.photos.published(await this.photos.ownPerson(req.user));
  }

  @Get('mia/versiones/:id')
  async ownPreview(@Param('id', ParseUUIDPipe) id: string, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control','private, no-store');
    return this.photos.preview(await this.photos.ownPerson(req.user),id);
  }

  @Post('mia')
  @UseInterceptors(FileInterceptor('file',options))
  async uploadOwn(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    return this.photos.upload(await this.photos.ownPerson(req.user),file,this.actor(req),'PTA');
  }

  // Only the approved version is available to other authenticated users.
  @Get('personas/:person/publicada')
  async published(@Param('person', ParseUUIDPipe) person: string, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control','private, no-store');
    return this.photos.published(person);
  }

  @Get('pendientes')
  @Header('Cache-Control','private, no-store')
  @RequireRundPermissions(VALIDATE)
  pending(@Query('page') page: string) { return this.photos.pending(Math.max(1,Math.min(100000,parseInt(page,10)||1))); }

  @Post('masiva')
  @RequireRundPermissions(MANAGE)
  @UseInterceptors(FilesInterceptor('files',20,{ storage: memoryStorage(), limits: { fileSize: PHOTO_MAX_BYTES, files: 20 } }))
  async bulk(@UploadedFiles() files: Express.Multer.File[], @Req() req: any) {
    if (!files?.length) throw new BadRequestException('Seleccione entre 1 y 20 fotos.');
    const results: any[] = [];
    const seen = new Set<string>();
    for (const file of files || []) {
      try {
        const document = basename(file.originalname,extname(file.originalname));
        const person = await this.photos.bulkPerson(document);
        if (seen.has(person)) throw new Error('Documento repetido en este lote. Seleccione una foto por persona.');
        seen.add(person);
        await this.photos.upload(person,file,this.actor(req),'MASIVA');
        results.push({ nombre: file.originalname, success: true });
      } catch (error: any) { results.push({ nombre: file.originalname, success: false, message: error.message }); }
    }
    return { results };
  }

  @Get('docentes/:id')
  @Header('Cache-Control','private, no-store')
  @RequireRundPermissions(RUND_PERMISSIONS.VIEW,MANAGE,VALIDATE)
  async status(@Param('id') id: string) { return this.photos.status(await this.person(id)); }

  @Post('docentes/:id')
  @RequireRundPermissions(MANAGE)
  @UseInterceptors(FileInterceptor('file',options))
  async upload(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Req() req: any) {
    return this.photos.upload(await this.person(id),file,this.actor(req),'RUND');
  }

  @Get('docentes/:id/versiones/:photo')
  @RequireRundPermissions(RUND_PERMISSIONS.VIEW,MANAGE,VALIDATE)
  async preview(@Param('id') id: string, @Param('photo', ParseUUIDPipe) photo: string, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control','private, no-store');
    return this.photos.preview(await this.person(id),photo);
  }

  @Post('docentes/:id/versiones/:photo/decision')
  @RequireRundPermissions(VALIDATE)
  async decide(@Param('id') id: string, @Param('photo', ParseUUIDPipe) photo: string, @Body() body: any, @Req() req: any) {
    return this.photos.decide(await this.person(id),photo,body?.estado,body?.observacion,this.actor(req));
  }
}
