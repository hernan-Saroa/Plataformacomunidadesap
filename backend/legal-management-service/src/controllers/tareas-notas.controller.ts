import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { TareasNotasService } from '../services/tareas-notas.service';

@Controller('expedientes')
export class TareasNotasController {
    constructor(private readonly tareasNotasService: TareasNotasService) { }

    // ==================== TAREAS ====================

    @Get(':expedienteId/tareas')
    async getTareas(@Param('expedienteId') expedienteId: string) {
        return this.tareasNotasService.findTareasByExpediente(expedienteId);
    }

    @Post(':expedienteId/tareas')
    async createTarea(
        @Param('expedienteId') expedienteId: string,
        @Body() body: any
    ) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const responsableId = uuidRegex.test(body.responsableId) ? body.responsableId : null;

        return this.tareasNotasService.createTarea({
            expedienteId,
            titulo: body.titulo,
            descripcion: body.descripcion,
            fechaVencimiento: body.fechaVencimiento ? new Date(body.fechaVencimiento) : undefined,
            prioridad: body.prioridad || 'media',
            estado: body.estado || 'pendiente',
            responsableId,
            responsableNombre: body.responsableNombre,
            creadoPor: body.creadoPor
        });
    }

    @Patch('tareas/:tareaId')
    async updateTarea(
        @Param('tareaId') tareaId: string,
        @Body() body: any
    ) {
        const updateData = { ...body };
        if (updateData.fechaVencimiento !== undefined) {
            if (!updateData.fechaVencimiento) {
                updateData.fechaVencimiento = null;
            } else {
                const parsedDate = new Date(updateData.fechaVencimiento);
                updateData.fechaVencimiento = isNaN(parsedDate.getTime()) ? null : parsedDate;
            }
        }
        return this.tareasNotasService.updateTarea(tareaId, updateData);
    }

    @Delete('tareas/:tareaId')
    async deleteTarea(@Param('tareaId') tareaId: string) {
        await this.tareasNotasService.deleteTarea(tareaId);
        return { message: 'Tarea eliminada' };
    }

    // ==================== NOTAS ====================

    @Get(':expedienteId/notas')
    async getNotas(@Param('expedienteId') expedienteId: string) {
        return this.tareasNotasService.findNotasByExpediente(expedienteId);
    }

    @Post(':expedienteId/notas')
    async createNota(
        @Param('expedienteId') expedienteId: string,
        @Body() body: any
    ) {
        return this.tareasNotasService.createNota({
            expedienteId,
            contenido: body.contenido,
            tipo: body.tipo || 'general',
            autorId: body.autorId || null,
            autorNombre: body.autorNombre
        });
    }

    @Patch('notas/:notaId')
    async updateNota(
        @Param('notaId') notaId: string,
        @Body() body: any
    ) {
        return this.tareasNotasService.updateNota(notaId, body);
    }

    @Delete('notas/:notaId')
    async deleteNota(@Param('notaId') notaId: string) {
        await this.tareasNotasService.deleteNota(notaId);
        return { message: 'Nota eliminada' };
    }
}


