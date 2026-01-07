import { Controller, Get, Post, Patch, Delete, Param, Body, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ConsultasJuridicasService } from '../services/consultas-juridicas.service';

@Controller('legal/consultas-juridicas')
export class ConsultasJuridicasController {
    constructor(private readonly consultasService: ConsultasJuridicasService) { }

    @Get()
    async findAll() {
        const consultas = await this.consultasService.findAll();
        // Add calculated diasRestantes to each consulta
        return consultas.map(c => ({
            ...c,
            diasRestantes: this.consultasService.calcularDiasRestantes(c.fechaMaximaRespuesta)
        }));
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const consulta = await this.consultasService.findOne(id);
        return {
            ...consulta,
            diasRestantes: this.consultasService.calcularDiasRestantes(consulta.fechaMaximaRespuesta)
        };
    }

    @Post()
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                cb(null, `${randomName}${extname(file.originalname)}`);
            }
        })
    }))
    async create(
        @Body() body: any,
        @UploadedFile() file?: Express.Multer.File
    ) {
        const consultaData = {
            canalEntrada: body.canalEntrada,
            tipoSolicitud: body.tipoSolicitud,
            dependenciaSolicitante: body.dependenciaSolicitante,
            nombreSolicitante: body.nombreSolicitante,
            cargoSolicitante: body.cargoSolicitante,
            emailSolicitante: body.emailSolicitante,
            telefonoSolicitante: body.telefonoSolicitante,
            tipoUsuario: body.tipoUsuario || 'interno',
            materiaJuridica: body.materiaJuridica,
            descripcion: body.descripcion,
            antecedentes: body.antecedentes,
            prioridad: body.prioridad || 'media',
            complejidad: body.complejidad,
            terminoLegalDias: parseInt(body.terminoLegalDias) || 30,
            abogadoAsignadoId: body.abogadoAsignadoId || null
        };

        return this.consultasService.create(consultaData);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() body: any) {
        return this.consultasService.update(id, body);
    }

    @Patch(':id/estado')
    async updateEstado(@Param('id') id: string, @Body('estado') estado: string) {
        return this.consultasService.updateEstado(id, estado);
    }

    @Patch(':id/respuesta')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                cb(null, `respuesta_${randomName}${extname(file.originalname)}`);
            }
        })
    }))
    async responder(
        @Param('id') id: string,
        @Body() body: any,
        @UploadedFile() file?: Express.Multer.File
    ) {
        const respuestaData = {
            numeroOficioRespuesta: body.numeroOficioRespuesta,
            tipoRespuesta: body.tipoRespuesta,
            documentoRespuestaUrl: file ? `files/${file.filename}` : null,
            observaciones: body.observaciones
        };

        return this.consultasService.responder(id, respuestaData);
    }

    @Patch(':id/gestionar-respuesta')
    async gestionarRespuesta(
        @Param('id') id: string,
        @Body() body: { respuesta: string, enviar: boolean | string }
    ) {
        const enviar = body.enviar === true || body.enviar === 'true';
        return this.consultasService.updateRespuesta(id, body.respuesta, enviar);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        await this.consultasService.delete(id);
        return { message: 'Consulta eliminada' };
    }
}

