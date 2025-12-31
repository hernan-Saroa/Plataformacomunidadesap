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
            porcentajeAvance: porcentaje > 100 ? 100 : porcentaje,
            observaciones,
            usuarioRegistraId: usuarioId
        });

        // Recalculate percentage strictly
        registro.porcentajeAvance = (valorReportado / meta) * 100;

        return this.registroRepo.save(registro);
    }

    async exportIndicatorsToZip(): Promise<any> {
        // Dynamic imports to avoid issues if deps are strictly CJS/ESM
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

        // 2. Generate PDF for each indicator
        for (const ind of indicadores) {
            const doc = new PDFDocument();

            // Allow the doc to be read by the archive
            archive.append(doc, { name: `indicador_${ind.id}.pdf` });

            // Header
            doc.fontSize(20).text(`Plan de Acción Institucional`, { align: 'center' });
            doc.moveDown();
            doc.fontSize(16).text(`Detalle de Indicador: ${ind.id}`, { align: 'center' });
            doc.moveDown();

            // Basic Info
            doc.fontSize(12).font('Helvetica-Bold').text('Nombre:', { continued: true }).font('Helvetica').text(` ${ind.nombre}`);
            doc.font('Helvetica-Bold').text('Responsable:', { continued: true }).font('Helvetica').text(` ${ind.responsableNombre}`);
            doc.font('Helvetica-Bold').text('Eje Estratégico:', { continued: true }).font('Helvetica').text(` ${ind.ejeEstrategico}`);
            doc.font('Helvetica-Bold').text('Prioridad:', { continued: true }).font('Helvetica').text(` ${ind.prioridad || 'MEDIA'}`);
            doc.font('Helvetica-Bold').text('Tipo:', { continued: true }).font('Helvetica').text(` ${ind.tipoIndicador || 'GESTION'}`);
            doc.moveDown();

            doc.font('Helvetica-Bold').text('Descripción:', { continued: true }).font('Helvetica').text(` ${ind.descripcion || 'Sin descripción'}`);
            doc.moveDown();

            // Metrics
            const latest = ind.registros.sort((a, b) => b.fechaRegistro.getTime() - a.fechaRegistro.getTime())[0];
            const avance = latest ? Number(latest.porcentajeAvance).toFixed(2) : '0';
            const actual = latest ? Number(latest.valorReportado) : '0';

            doc.text(`Meta Objetivo: ${ind.metaObjetivo} ${ind.unidadMedida}`);
            doc.text(`Valor Actual: ${actual} ${ind.unidadMedida}`);
            doc.text(`Avance Porcentual: ${avance}%`);
            doc.moveDown();

            // Status Calculation (Simplified)
            const now = new Date();
            const fin = new Date(ind.fechaFin);
            const inicio = new Date(ind.fechaInicio);
            let estado = 'EN TIPO';
            if (Number(avance) >= 100) estado = 'COMPLETADO';
            else if (now > fin) estado = 'VENCIDO';
            else if (Number(avance) >= 90) estado = 'EN TIEMPO';
            else if (Number(avance) >= 50) estado = 'EN RIESGO';

            doc.text(`Estado Calculado: ${estado}`);
            doc.text(`Fecha Inicio: ${inicio.toLocaleDateString()}`);
            doc.text(`Fecha Fin: ${fin.toLocaleDateString()}`);

            doc.moveDown();
            doc.fontSize(14).text('Historial de Avances', { underline: true });
            doc.moveDown(0.5);

            if (ind.registros.length > 0) {
                ind.registros.forEach((reg, idx) => {
                    doc.fontSize(10).font('Helvetica').text(
                        `${new Date(reg.fechaRegistro).toLocaleDateString()} - Avance: ${Number(reg.porcentajeAvance).toFixed(2)}% (Valor: ${reg.valorReportado})`
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
        }

        // Finalize the archive (but we don't await finalize here, we verify connection in controller)
        // Actually, we return the archive object, controller pipes it.
        // We must call finalize() to start the stream ending process.
        archive.finalize();

        return archive;
    }
}
