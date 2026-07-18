import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BorradorCorreo, BorradorAdjunto } from '../entities/borrador-correo.entity';

export interface UpsertBorradorDto {
    id?: string;              // si viene, se actualiza ese borrador
    usuarioId: string;
    usuarioNombre?: string;
    buzon?: string;
    para?: string[];          // destinatarios "Para"
    cc?: string[];
    cco?: string[];
    asunto?: string;
    cuerpo?: string;
    adjuntos?: BorradorAdjunto[];
    solicitarAcuse?: boolean;
}

@Injectable()
export class BorradoresCorreosService {
    private readonly logger = new Logger(BorradoresCorreosService.name);

    // Tope de tamaño total de adjuntos embebidos (~25MB en base64). Defensa en el
    // servidor además del límite del frontend, para no crear filas gigantes.
    private static readonly MAX_ADJUNTOS_BYTES = 25 * 1024 * 1024;

    constructor(
        @InjectRepository(BorradorCorreo)
        private readonly borradorRepo: Repository<BorradorCorreo>,
    ) { }

    /** Lista los borradores del usuario, más recientes (última edición) primero. */
    async findByUsuario(usuarioId: string): Promise<BorradorCorreo[]> {
        if (!usuarioId) return [];
        return this.borradorRepo.find({
            where: { usuarioId },
            order: { updatedAt: 'DESC' },
        });
    }

    async getById(id: string): Promise<BorradorCorreo> {
        const borrador = await this.borradorRepo.findOne({ where: { id } });
        if (!borrador) throw new NotFoundException('Borrador no encontrado');
        return borrador;
    }

    /**
     * Crea o actualiza un borrador. Si `dto.id` viene y pertenece al usuario, lo
     * actualiza; en cualquier otro caso crea uno nuevo. Devuelve el borrador
     * persistido (con su id), para que el frontend lo reutilice en autoguardados.
     */
    async upsert(dto: UpsertBorradorDto): Promise<BorradorCorreo> {
        if (!dto?.usuarioId) {
            throw new BadRequestException('usuarioId es obligatorio');
        }

        const adjuntos = Array.isArray(dto.adjuntos) ? dto.adjuntos : [];
        const totalBytes = adjuntos.reduce((sum, a) => sum + (a?.size || 0), 0);
        if (totalBytes > BorradoresCorreosService.MAX_ADJUNTOS_BYTES) {
            throw new BadRequestException('Los adjuntos del borrador superan el tamaño máximo permitido (25MB)');
        }

        const toJson = (list?: string[]): string | null =>
            Array.isArray(list) && list.length > 0 ? JSON.stringify(list) : null;

        let borrador: BorradorCorreo | null = null;

        if (dto.id) {
            borrador = await this.borradorRepo.findOne({ where: { id: dto.id } });
            if (borrador && borrador.usuarioId !== dto.usuarioId) {
                // Un borrador es privado: no se puede sobrescribir el de otro usuario.
                throw new ForbiddenException('No puede modificar un borrador de otro usuario');
            }
        }

        if (!borrador) {
            borrador = this.borradorRepo.create({ usuarioId: dto.usuarioId });
        }

        borrador.usuarioId = dto.usuarioId;
        if (dto.usuarioNombre !== undefined) borrador.usuarioNombre = dto.usuarioNombre;
        borrador.buzon = (dto.buzon || 'JUDICIAL').toUpperCase() === 'CORREOS' ? 'CORREOS' : 'JUDICIAL';
        borrador.destinatariosTo = toJson(dto.para);
        borrador.destinatariosCc = toJson(dto.cc);
        borrador.destinatariosCco = toJson(dto.cco);
        borrador.asunto = dto.asunto ?? null;
        borrador.cuerpo = dto.cuerpo ?? null;
        borrador.adjuntos = adjuntos;
        borrador.solicitarAcuse = dto.solicitarAcuse !== undefined ? dto.solicitarAcuse : true;

        const saved = await this.borradorRepo.save(borrador);
        this.logger.log(`📝 Borrador ${dto.id ? 'actualizado' : 'creado'} [${saved.id}] usuario=${dto.usuarioId}`);
        return saved;
    }

    /** Elimina un borrador. Valida propiedad si se proporciona usuarioId. */
    async remove(id: string, usuarioId?: string): Promise<{ success: boolean }> {
        const borrador = await this.borradorRepo.findOne({ where: { id } });
        if (!borrador) {
            // Idempotente: si ya no existe, se considera eliminado.
            return { success: true };
        }
        if (usuarioId && borrador.usuarioId !== usuarioId) {
            throw new ForbiddenException('No puede eliminar un borrador de otro usuario');
        }
        await this.borradorRepo.remove(borrador);
        this.logger.log(`🗑️ Borrador eliminado [${id}]`);
        return { success: true };
    }
}
