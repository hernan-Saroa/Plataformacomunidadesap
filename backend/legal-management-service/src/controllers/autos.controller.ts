import { Controller, Get, Post, Patch, Delete, Param, Body, UploadedFile, UseInterceptors, Res, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AutosService } from '../services/autos.service';
import type { Response } from 'express';

@Controller('api/legal/autos')
export class AutosController {
    constructor(private readonly autosService: AutosService) { }

    @Get('expediente/:radicado')
    async getAutos(@Param('radicado') radicado: string) {
        return this.autosService.findAllByExpediente(radicado);
    }

    @Post(':radicado')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                cb(null, `${randomName}${extname(file.originalname)}`);
            }
        })
    }))
    async createAuto(
        @Param('radicado') radicado: string,
        @Body() body: any,
        @UploadedFile() file: Express.Multer.File
    ) {
        if (!file) throw new BadRequestException('El archivo del auto es obligatorio');

        // Body comes as strings from FormData, basic parsing might be needed for non-string types
        const autoData = {
            tipo: body.tipo,
            numero: body.numero,
            fechaAuto: new Date(body.fechaAuto),
            juzgado: body.juzgado,
            resumen: body.resumen,
            estado: 'Pendiente'
        };

        return this.autosService.create(radicado, autoData, file);
    }

    @Patch(':id/estado')
    async updateEstado(@Param('id') id: string, @Body('estado') estado: string) {
        return this.autosService.updateEstado(id, estado);
    }

    @Delete(':id')
    async deleteAuto(@Param('id') id: string) {
        return this.autosService.delete(id);
    }

    // @Get('download-all/:radicado')
    // async downloadAll(@Param('radicado') radicado: string, @Res() res: Response) {
    //     const archive = await this.autosService.getAutosZip(radicado);
    //     
    //     res.attachment(`autos_${radicado}.zip`);
    //     archive.pipe(res);
    //     await archive.finalize();
    // }
}
