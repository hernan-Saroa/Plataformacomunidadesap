import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PeiIndicador } from '../entities/pei-indicador.entity';
import { PeiRegistroAvance } from '../entities/pei-registro-avance.entity';

@Injectable()
export class PeiService {
    constructor(
        @InjectRepository(PeiIndicador)
        private indicadorRepo: Repository<PeiIndicador>,
        @InjectRepository(PeiRegistroAvance)
        private registroRepo: Repository<PeiRegistroAvance>,
    ) { }

    async getDashboard() {
        // 1. Get all active indicators with their latest records
        const indicadores = await this.indicadorRepo.find({
            where: { estado: 'ACTIVO' },
            relations: ['registros'],
            order: { id: 'ASC' } // Stable order
        });

        // 2. Process data for the dashboard
        let sumAvance = 0;
        let vencidos = 0;
        const processedIndicadores = indicadores.map(ind => {
            // Get latest record
            const history = ind.registros.sort((a, b) => b.fechaRegistro.getTime() - a.fechaRegistro.getTime());
            const latest = history[0];
            const avanceActual = latest ? Number(latest.porcentajeAvance) : 0;
            const valorActual = latest ? Number(latest.valorReportado) : 0;

            sumAvance += avanceActual;

            // Check vencimiento
            const now = new Date();
            const fin = new Date(ind.fechaFin);
            const isVencido = now > fin && avanceActual < 100;
            if (isVencido) vencidos++;

            return {
                ...ind,
                avanceActual,
                valorActual,
                registros: history, // Return full history for details
                isVencido
            };
        });

        const totalActive = indicadores.length;
        const avanceGlobal = totalActive > 0 ? (sumAvance / totalActive) : 0;

        return {
            stats: {
                indicadores_activos: totalActive,
                avance_global: parseFloat(avanceGlobal.toFixed(2)),
                vencidos
            },
            indicadores: processedIndicadores
        };
    }

    async createIndicador(data: Partial<PeiIndicador>) {
        const nuevo = this.indicadorRepo.create(data);
        return this.indicadorRepo.save(nuevo);
    }

    async findOne(id: number) {
        const ind = await this.indicadorRepo.findOne({
            where: { id },
            relations: ['registros']
        });
        if (!ind) throw new NotFoundException(`Indicador ${id} no encontrado`);

        // Sort records
        ind.registros.sort((a, b) => b.fechaRegistro.getTime() - a.fechaRegistro.getTime());
        return ind;
    }

    async registrarAvance(id: number, valorReportado: number, observaciones?: string, usuarioId?: string) {
        const indicador = await this.findOne(id);

        // Calculate percentage
        let porcentaje = 0;
        const meta = Number(indicador.metaObjetivo);

        if (meta !== 0) {
            porcentaje = (valorReportado / meta) * 100;
        }

        const registro = this.registroRepo.create({
            indicadorId: id,
            valorReportado,
            porcentajeAvance: porcentaje > 100 ? 100 : porcentaje, // Cap at 100? Or allow >100? Requirement implies typical progress. Let's not strict cap unless asked, but usually for "Avance Global" math, >100 might skew. Let's cap visual but store real?
            // Re-reading visual rules: Green >= 90. 
            // We will store exact calculation. Logic in dashboard handles display.
            observaciones,
            usuarioRegistraId: usuarioId
        });

        // Recalculate percentage strictly
        registro.porcentajeAvance = (valorReportado / meta) * 100;

        return this.registroRepo.save(registro);
    }
}
