import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Auto } from '../entities/auto.entity';
import { ActuacionService } from './actuacion.service';
import { ExpedienteService } from './expediente.service';

@Injectable()
export class AutosService {
    constructor(
        @InjectRepository(Auto)
        private readonly autoRepository: Repository<Auto>,
        private readonly expedienteService: ExpedienteService,
        private readonly actuacionService: ActuacionService
    ) { }

    async findAllByExpediente(radicado: string): Promise<Auto[]> {
        const expediente = await this.expedienteService.findOneByRadicado(radicado);
        if (!expediente) throw new NotFoundException('Expediente no encontrado');

        return this.autoRepository.find({
            where: {
                expedienteId: expediente.id,
                estado: Not('Eliminado')
            },
            order: { fechaAuto: 'DESC' }
        });
    }

    async create(radicado: string, data: Partial<Auto>, file: Express.Multer.File): Promise<Auto> {
        const expediente = await this.expedienteService.findOneByRadicado(radicado);
        if (!expediente) throw new NotFoundException('Expediente no encontrado');

        const nuevoAuto = this.autoRepository.create({
            ...data,
            expedienteId: expediente.id,
            archivoNombre: file.originalname,
            archivoUrl: `files/${file.filename}`, // Ruta relativa, el frontend construye la URL completa
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const saved = await this.autoRepository.save(nuevoAuto);

        // REGISTRO AUTOMÁTICO EN HISTORIAL UNIFICADO
        try {
            await this.actuacionService.registrarEventoAutomatico(
                expediente.id,
                saved.resumen || 'Auto Procesal',
                `Nuevo Auto cargado: ${saved.archivoNombre}. Tipo: ${saved.tipo || 'General'}`,
                'AUTO',
                saved.id,
                { tipoAuto: saved.tipo, archivo: saved.archivoUrl }
            );
        } catch (error) {
            console.error('Error creando log de actuación automática para Auto:', error);
            // No bloqueamos la creación del auto si falla el log
        }

        return saved;
    }

    async updateEstado(id: string, estado: string): Promise<Auto> {
        console.log(`[AutosService] Updating estado for ID: ${id} to ${estado}`);
        const auto = await this.autoRepository.findOneBy({ id });
        if (!auto) {
            console.error(`[AutosService] Auto not found for ID: ${id}`);
            throw new NotFoundException('Auto no encontrado');
        }

        auto.estado = estado;
        if (estado === 'Notificado') {
            auto.fechaNotificacion = new Date();
        }

        return this.autoRepository.save(auto);
    }

    async delete(id: string): Promise<{ success: boolean; message: string }> {
        const auto = await this.autoRepository.findOneBy({ id });

        if (!auto) {
            throw new NotFoundException('Auto no encontrado');
        }

        // Soft Delete: just change state
        auto.estado = 'Eliminado';
        await this.autoRepository.save(auto);

        return { success: true, message: 'Auto eliminado correctamente' };
    }

    // Generate ZIP of all autos for an expediente
    // async getAutosZip(radicado: string): Promise<archiver.Archiver> {
    //     const autos = await this.findAllByExpediente(radicado);
    //     const archive = archiver('zip', { zlib: { level: 9 } });

    //     for (const auto of autos) {
    //         // Extract filename from URL (assumes standardized local storage format)
    //         const filename = auto.archivoUrl.split('/').pop();
    //         if (filename) {
    //             const filePath = path.join(process.cwd(), 'uploads', filename);
    //             if (fs.existsSync(filePath)) {
    //                 archive.file(filePath, { name: auto.archivoNombre });
    //             }
    //         }
    //     }

    //     return archive;
    // }
}
