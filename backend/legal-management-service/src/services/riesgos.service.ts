import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Riesgo, TipoRiesgo, ZonaRiesgo, EtapaRiesgo, EstadoRiesgo } from '../entities/riesgo.entity';

@Injectable()
export class RiesgosService {
    constructor(
        @InjectRepository(Riesgo)
        private readonly riesgoRepo: Repository<Riesgo>,
    ) { }

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
        return this.riesgoRepo.save(riesgo);
    }

    async update(id: string, data: Partial<Riesgo>): Promise<Riesgo> {
        const riesgo = await this.findOne(id);

        // Recalcular zonas si cambian probabilidad o impacto
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
        return this.riesgoRepo.save(riesgo);
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
        riesgo.etapa = nuevaEtapa;
        return this.riesgoRepo.save(riesgo);
    }

    async archivar(id: string): Promise<Riesgo> {
        const riesgo = await this.findOne(id);
        riesgo.estado = 'ARCHIVADO';
        return this.riesgoRepo.save(riesgo);
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
