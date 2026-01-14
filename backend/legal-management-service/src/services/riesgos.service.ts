import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Riesgo, TipoRiesgo, ZonaRiesgo, EtapaRiesgo, EstadoRiesgo } from '../entities/riesgo.entity';
import { RiesgoHistorial, TipoEventoRiesgo } from '../entities/riesgo-historial.entity';

@Injectable()
export class RiesgosService {
    constructor(
        @InjectRepository(Riesgo)
        private readonly riesgoRepo: Repository<Riesgo>,
        @InjectRepository(RiesgoHistorial)
        private readonly historialRepo: Repository<RiesgoHistorial>,
    ) { }

    // ============================================
    // HISTORIAL
    // ============================================
    async getHistorial(riesgoId: string): Promise<RiesgoHistorial[]> {
        return this.historialRepo.find({
            where: { riesgoId },
            order: { createdAt: 'DESC' }
        });
    }

    private async registrarEvento(
        riesgoId: string,
        tipoEvento: TipoEventoRiesgo,
        descripcion: string,
        campoModificado?: string,
        valorAnterior?: string,
        valorNuevo?: string,
        usuario: string = 'Sistema'
    ): Promise<void> {
        const evento = this.historialRepo.create({
            riesgoId,
            tipoEvento,
            descripcion,
            campoModificado,
            valorAnterior,
            valorNuevo,
            usuario
        });
        await this.historialRepo.save(evento);
    }

    // ============================================
    // CRUD BÁSICO
    // ============================================
    async findAll(): Promise<Riesgo[]> {
        return this.riesgoRepo.find({
            where: { estado: 'ACTIVO' as EstadoRiesgo },
            order: { createdAt: 'DESC' }
        });
    }

    async findOne(id: string): Promise<Riesgo> {
        const riesgo = await this.riesgoRepo.findOne({ where: { id } });
        if (!riesgo) throw new NotFoundException(`Riesgo ${id} no encontrado`);
        return riesgo;
    }

    async create(data: Partial<Riesgo>): Promise<Riesgo> {
        // Generar código automático basado en el último existente
        const year = new Date().getFullYear();
        const lastRiesgo = await this.riesgoRepo.findOne({
            where: { codigo: Like(`R-${year}-%`) },
            order: { codigo: 'DESC' }
        });

        let nextNum = 1;
        if (lastRiesgo && lastRiesgo.codigo) {
            const parts = lastRiesgo.codigo.split('-');
            if (parts.length === 3) {
                const currentNum = parseInt(parts[2], 10);
                if (!isNaN(currentNum)) {
                    nextNum = currentNum + 1;
                }
            }
        }

        data.codigo = `R-${year}-${String(nextNum).padStart(3, '0')}`;

        // Calcular zona inherente y residual
        data.zonaInherente = this.calcularZona(data.probabilidadInherente || 3, data.impactoInherente || 3);
        data.zonaResidual = this.calcularZona(data.probabilidadResidual || data.probabilidadInherente || 3, data.impactoResidual || data.impactoInherente || 3);

        const riesgo = this.riesgoRepo.create(data);
        const saved = await this.riesgoRepo.save(riesgo);

        // Registrar evento de creación
        await this.registrarEvento(
            saved.id,
            'CREACION',
            `Riesgo ${saved.codigo} creado con zona ${saved.zonaResidual}`,
            undefined,
            undefined,
            undefined,
            data['createdBy'] || 'Sistema'
        );

        return saved;
    }

    async update(id: string, data: Partial<Riesgo>): Promise<Riesgo> {
        const riesgo = await this.findOne(id);
        const cambiosMatriz: string[] = [];

        // Solo detectar cambios en la MATRIZ de riesgos (los 4 valores de 1-5)
        if (data.probabilidadInherente !== undefined && data.probabilidadInherente !== riesgo.probabilidadInherente) {
            cambiosMatriz.push(`probabilidad inherente: ${riesgo.probabilidadInherente} → ${data.probabilidadInherente}`);
        }
        if (data.impactoInherente !== undefined && data.impactoInherente !== riesgo.impactoInherente) {
            cambiosMatriz.push(`impacto inherente: ${riesgo.impactoInherente} → ${data.impactoInherente}`);
        }
        if (data.probabilidadResidual !== undefined && data.probabilidadResidual !== riesgo.probabilidadResidual) {
            cambiosMatriz.push(`probabilidad residual: ${riesgo.probabilidadResidual} → ${data.probabilidadResidual}`);
        }
        if (data.impactoResidual !== undefined && data.impactoResidual !== riesgo.impactoResidual) {
            cambiosMatriz.push(`impacto residual: ${riesgo.impactoResidual} → ${data.impactoResidual}`);
        }

        // Recalcular zonas si cambian probabilidad o impacto
        const zonaAnterior = riesgo.zonaResidual;
        if (data.probabilidadInherente !== undefined || data.impactoInherente !== undefined) {
            data.zonaInherente = this.calcularZona(
                data.probabilidadInherente ?? riesgo.probabilidadInherente,
                data.impactoInherente ?? riesgo.impactoInherente
            );
        }
        if (data.probabilidadResidual !== undefined || data.impactoResidual !== undefined) {
            data.zonaResidual = this.calcularZona(
                data.probabilidadResidual ?? riesgo.probabilidadResidual,
                data.impactoResidual ?? riesgo.impactoResidual
            );
        }

        Object.assign(riesgo, data);
        const saved = await this.riesgoRepo.save(riesgo);

        // Registrar evento de actualización solo si hubo cambios en la matriz
        if (cambiosMatriz.length > 0) {
            await this.registrarEvento(
                id,
                'ACTUALIZACION',
                `Matriz actualizada: ${cambiosMatriz.join(', ')}`,
                cambiosMatriz.length === 1 ? cambiosMatriz[0].split(':')[0] : 'múltiples valores',
                undefined,
                undefined,
                'Sistema'
            );
        }

        // Registrar cambio de zona si aplica
        if (data.zonaResidual && data.zonaResidual !== zonaAnterior) {
            await this.registrarEvento(
                id,
                'CAMBIO_ZONA',
                `Zona de riesgo cambió de ${zonaAnterior} a ${saved.zonaResidual}`,
                'zonaResidual',
                zonaAnterior,
                saved.zonaResidual,
                'Sistema'
            );
        }

        return saved;
    }

    async delete(id: string): Promise<void> {
        const riesgo = await this.findOne(id);
        await this.riesgoRepo.remove(riesgo);
    }

    // ============================================
    // OPERACIONES ESPECÍFICAS
    // ============================================
    async cambiarEtapa(id: string, nuevaEtapa: EtapaRiesgo): Promise<Riesgo> {
        const riesgo = await this.findOne(id);
        const etapaAnterior = riesgo.etapa;
        riesgo.etapa = nuevaEtapa;
        const saved = await this.riesgoRepo.save(riesgo);

        // Registrar cambio de etapa
        await this.registrarEvento(
            id,
            'CAMBIO_ETAPA',
            `Etapa cambió de ${etapaAnterior} a ${nuevaEtapa}`,
            'etapa',
            etapaAnterior,
            nuevaEtapa,
            'Sistema'
        );

        return saved;
    }

    async archivar(id: string): Promise<Riesgo> {
        const riesgo = await this.findOne(id);
        riesgo.estado = 'ARCHIVADO';
        const saved = await this.riesgoRepo.save(riesgo);

        // Registrar archivado
        await this.registrarEvento(
            id,
            'ARCHIVADO',
            `Riesgo ${riesgo.codigo} archivado`,
            'estado',
            'ACTIVO',
            'ARCHIVADO',
            'Sistema'
        );

        return saved;
    }

    async findByProceso(proceso: string): Promise<Riesgo[]> {
        return this.riesgoRepo.find({
            where: { proceso, estado: 'ACTIVO' as EstadoRiesgo },
            order: { zonaResidual: 'DESC' }
        });
    }

    async findByZona(zona: ZonaRiesgo): Promise<Riesgo[]> {
        return this.riesgoRepo.find({
            where: { zonaResidual: zona, estado: 'ACTIVO' as EstadoRiesgo },
            order: { createdAt: 'DESC' }
        });
    }

    async getEstadisticas(): Promise<{
        total: number;
        porZona: Record<string, number>;
        porTipo: Record<string, number>;
        porEtapa: Record<string, number>;
    }> {
        const riesgos = await this.riesgoRepo.find({ where: { estado: 'ACTIVO' as EstadoRiesgo } });

        const porZona: Record<string, number> = { EXTREMO: 0, ALTO: 0, MODERADO: 0, BAJO: 0 };
        const porTipo: Record<string, number> = { GESTION: 0, CORRUPCION: 0, SEGURIDAD_DIGITAL: 0, FISCAL: 0 };
        const porEtapa: Record<string, number> = {};

        riesgos.forEach(r => {
            porZona[r.zonaResidual] = (porZona[r.zonaResidual] || 0) + 1;
            porTipo[r.tipoRiesgo] = (porTipo[r.tipoRiesgo] || 0) + 1;
            porEtapa[r.etapa] = (porEtapa[r.etapa] || 0) + 1;
        });

        return {
            total: riesgos.length,
            porZona,
            porTipo,
            porEtapa
        };
    }

    // ============================================
    // HELPERS
    // ============================================
    private calcularZona(probabilidad: number, impacto: number): ZonaRiesgo {
        const valor = probabilidad * impacto;
        if (valor >= 20) return 'EXTREMO';
        if (valor >= 12) return 'ALTO';
        if (valor >= 5) return 'MODERADO';
        return 'BAJO';
    }
}

