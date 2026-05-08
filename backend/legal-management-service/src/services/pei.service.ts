import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
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
            where: { estado: 'ACTIVO', archivedAt: IsNull() },
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

    async updateIndicador(id: number, data: Partial<PeiIndicador>) {
        const indicador = await this.findOne(id);
        const updated = Object.assign(indicador, data);
        return this.indicadorRepo.save(updated);
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

    /**
     * Bug 6: registra avance, persiste observaciones y evidencia (URL relativa
     * al archivo subido o URL externa proporcionada). Tras guardar, recalcula
     * el porcentaje del indicador (el dashboard ya promediará al consultar).
     */
    async registrarAvance(
        id: number,
        valorReportado: number,
        observaciones?: string,
        usuarioId?: string,
        evidenciaUrl?: string,
    ) {
        const indicador = await this.findOne(id);

        // Calculate percentage
        const meta = Number(indicador.metaObjetivo);
        let porcentaje = 0;
        if (meta !== 0) {
            porcentaje = (Number(valorReportado) / meta) * 100;
        }
        // Cap a 100 para no romper restricciones decimal(5,2) y mantener lógica visual sana
        if (porcentaje > 100) porcentaje = 100;
        if (porcentaje < 0) porcentaje = 0;

        const registro = this.registroRepo.create({
            indicadorId: id,
            valorReportado,
            porcentajeAvance: porcentaje,
            observaciones: observaciones ?? null as any,
            evidenciaUrl: evidenciaUrl ?? null as any,
            usuarioRegistraId: usuarioId,
        });
        const saved = await this.registroRepo.save(registro);

        // Bug 6: tras guardar, devolvemos el indicador con su histórico actualizado
        // y el % global recalculado a partir de TODOS los indicadores activos.
        // Esto permite al frontend reflejar el nuevo avance sin un refetch extra.
        const indicadorActualizado = await this.findOne(id);
        const dashboard = await this.getDashboard();

        return {
            registro: saved,
            indicador: indicadorActualizado,
            avanceGlobal: dashboard.stats.avance_global,
        };
    }

    // ==================== ARCHIVADO ====================
    async getArchivados() {
        return this.indicadorRepo.find({
            where: { archivedAt: Not(IsNull()) },
            relations: ['registros'],
            order: { id: 'DESC' },
        });
    }

    async archivar(id: number) {
        const indicador = await this.findOne(id);
        indicador.archivedAt = new Date();
        indicador.archivedBy = 'System'; // In a real app, pass user from controller
        indicador.archiveReason = 'Archivado manualmente';
        return this.indicadorRepo.save(indicador);
    }

    async restaurar(id: number) {
        const indicador = await this.indicadorRepo.findOne({
            where: { id },
            relations: ['registros'],
            withDeleted: true // just in case we used softDelete from typeorm, but we are using manual column
        });
        if (!indicador) throw new NotFoundException(`Indicador ${id} no encontrado`);

        indicador.archivedAt = null;
        indicador.archivedBy = null;
        indicador.archiveReason = null;
        return this.indicadorRepo.save(indicador);
    }

    async eliminar(id: number) {
        const indicador = await this.indicadorRepo.findOne({ where: { id } });
        if (!indicador) throw new NotFoundException(`Indicador ${id} no encontrado`);
        await this.indicadorRepo.remove(indicador);
    }

    async exportIndicatorsToZip(): Promise<any> {
        const archiver = require('archiver');
        const PDFDocument = require('pdfkit');

        // 1. Get all indicators with history
        const indicadores = await this.indicadorRepo.find({
            relations: ['registros'],
            order: { id: 'ASC' }
        });

        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        // Handle errors gracefully to prevent process crash
        archive.on('error', (err: any) => {
            console.error('Archiver error:', err);
            // Optionally emit an error or just stop
        });

        archive.on('warning', (err: any) => {
            if (err.code === 'ENOENT') {
                console.warn('Archiver warning:', err);
            } else {
                console.error('Archiver error/warning:', err);
            }
        });

        // Helper safe date formatter
        const formatDate = (date: any): string => {
            if (!date) return 'N/A';
            const d = new Date(date);
            if (isNaN(d.getTime())) return 'Fecha Inválida';
            return d.toLocaleDateString();
        };

        // Helper safe number formatter
        const formatNumber = (num: any): string => {
            if (num === null || num === undefined) return '0';
            const n = Number(num);
            return isNaN(n) ? '0' : n.toFixed(2);
        };

        // 2. Generate PDF for each indicator
        for (const ind of indicadores) {
            try {
                const doc = new PDFDocument();

                // Allow the doc to be read by the archive
                archive.append(doc, { name: `indicador_${ind.id}.pdf` });

                // Header
                doc.fontSize(20).text(`Plan de Acción Institucional`, { align: 'center' });
                doc.moveDown();
                doc.fontSize(16).text(`Detalle de Indicador: ${ind.id}`, { align: 'center' });
                doc.moveDown();

                // Basic Info
                doc.fontSize(12).font('Helvetica-Bold').text('Nombre:', { continued: true }).font('Helvetica').text(` ${ind.nombre || 'Sin nombre'}`);
                doc.font('Helvetica-Bold').text('Responsable:', { continued: true }).font('Helvetica').text(` ${ind.responsableNombre || 'Sin asignar'}`);
                doc.font('Helvetica-Bold').text('Eje Estratégico:', { continued: true }).font('Helvetica').text(` ${ind.ejeEstrategico || 'N/A'}`);
                doc.font('Helvetica-Bold').text('Prioridad:', { continued: true }).font('Helvetica').text(` ${ind.prioridad || 'MEDIA'}`);
                doc.font('Helvetica-Bold').text('Tipo:', { continued: true }).font('Helvetica').text(` ${ind.tipoIndicador || 'GESTION'}`);
                doc.moveDown();

                doc.font('Helvetica-Bold').text('Descripción:', { continued: true }).font('Helvetica').text(` ${ind.descripcion || 'Sin descripción'}`);
                doc.moveDown();

                // Metrics
                const sortedRegistros = ind.registros ? ind.registros.sort((a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime()) : [];
                const latest = sortedRegistros[0];
                const avance = latest ? formatNumber(latest.porcentajeAvance) : '0';
                const actual = latest ? Number(latest.valorReportado) : 0; // Keep raw for display logic if needed, or format

                doc.text(`Meta Objetivo: ${ind.metaObjetivo || 0} ${ind.unidadMedida || ''}`);
                doc.text(`Valor Actual: ${actual} ${ind.unidadMedida || ''}`);
                doc.text(`Avance Porcentual: ${avance}%`);
                doc.moveDown();

                // Status Calculation
                const now = new Date();
                const fin = new Date(ind.fechaFin);
                let estado = 'EN TIEMPO';

                const avanceNum = Number(avance);

                if (avanceNum >= 100) estado = 'COMPLETADO';
                else if (!isNaN(fin.getTime()) && now > fin) estado = 'VENCIDO';
                else if (avanceNum >= 90) estado = 'EN TIEMPO';
                else if (avanceNum >= 50) estado = 'EN RIESGO';

                doc.text(`Estado Calculado: ${estado}`);
                doc.text(`Fecha Inicio: ${formatDate(ind.fechaInicio)}`);
                doc.text(`Fecha Fin: ${formatDate(ind.fechaFin)}`);

                doc.moveDown();
                doc.fontSize(14).text('Historial de Avances', { underline: true });
                doc.moveDown(0.5);

                if (sortedRegistros.length > 0) {
                    sortedRegistros.forEach((reg) => {
                        doc.fontSize(10).font('Helvetica').text(
                            `${formatDate(reg.fechaRegistro)} - Avance: ${formatNumber(reg.porcentajeAvance)}% (Valor: ${reg.valorReportado})`
                        );
                        if (reg.observaciones) {
                            doc.fontSize(8).text(`   Obs: ${reg.observaciones}`, { oblique: true });
                        }
                        doc.moveDown(0.5);
                    });
                } else {
                    doc.fontSize(10).text('No hay registros de avance.');
                }

                // Finalize PDF
                doc.end();
            } catch (err) {
                console.error(`Error generating PDF for indicator ${ind.id}:`, err);
                // Continue with next indicator even if one fails
            }
        }

        archive.finalize();

        return archive;
    }
}
