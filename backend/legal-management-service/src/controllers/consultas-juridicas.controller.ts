import { Controller, Get, Post, Patch, Delete, Param, Body, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ConsultasJuridicasService } from '../services/consultas-juridicas.service';

@Controller('consultas-juridicas')
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

        const fileData = file ? {
            filename: file.filename,
            path: file.path,
            mimetype: file.mimetype,
            size: file.size,
            originalname: file.originalname
        } : undefined;

        return this.consultasService.create(consultaData, fileData);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() body: any) {
        return this.consultasService.update(id, body);
    }

    @Patch(':id/estado')
    async updateEstado(
        @Param('id') id: string,
        @Body('estado') estado: string,
        @Body('usuario') usuario?: string,
        @Body('estadoNombre') estadoNombre?: string
    ) {
        return this.consultasService.updateEstado(id, estado, usuario, estadoNombre);
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

        return this.consultasService.responder(id, respuestaData, body.usuario);
    }

    @Patch(':id/gestionar-respuesta')
    async gestionarRespuesta(
        @Param('id') id: string,
        @Body() body: { respuesta: string, enviar: boolean | string, usuario?: string, destinatariosAdicionales?: string[] }
    ) {
        const enviar = body.enviar === true || body.enviar === 'true';
        return this.consultasService.updateRespuesta(id, body.respuesta, enviar, body.usuario, body.destinatariosAdicionales);
    }

    // --- Endpoints de Archivo ---

    @Get('archivadas/lista')
    async getArchivadas() {
        return this.consultasService.getArchivadas();
    }

    @Post(':id/archivar')
    async archivar(
        @Param('id') id: string,
        @Body() body: { motivo: string; usuario: string }
    ) {
        return this.consultasService.archivar(id, body.motivo, body.usuario);
    }

    @Post(':id/eliminar')
    async eliminarSoft(
        @Param('id') id: string,
        @Body() body: { motivo: string; usuario: string }
    ) {
        return this.consultasService.eliminarSoft(id, body.motivo, body.usuario);
    }

    @Post(':id/restaurar')
    async restaurar(
        @Param('id') id: string,
        @Body() body: { usuario: string }
    ) {
        return this.consultasService.restaurar(id, body.usuario);
    }

    @Delete(':id/permanente')
    async eliminarPermanente(@Param('id') id: string) {
        return this.consultasService.eliminarPermanente(id);
    }

    @Get(':id/historial')
    async getHistorial(@Param('id') id: string) {
        return this.consultasService.getHistorial(id);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.consultasService.eliminarSoft(id, 'Eliminación estándar', 'Usuario Sistema');
    }
}


