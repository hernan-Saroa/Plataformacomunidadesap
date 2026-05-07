import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Riesgo, TipoRiesgo, ZonaRiesgo, EtapaRiesgo, EstadoRiesgo } from '../entities/riesgo.entity';
import { RiesgoHistorial, TipoEventoRiesgo } from '../entities/riesgo-historial.entity';
import { LegalNotificationsService } from './legal-notifications.service';

@Injectable()
export class RiesgosService {
    constructor(
        @InjectRepository(Riesgo)
        private readonly riesgoRepo: Repository<Riesgo>,
        @InjectRepository(RiesgoHistorial)
        private readonly historialRepo: Repository<RiesgoHistorial>,
        private readonly legalNotificationsService: LegalNotificationsService,
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

        // Recalcular provisión contable
        if (data.cuantiaEstimada && Number(data.cuantiaEstimada) > 0) {
            let provision = 0;
            let porcentaje = 0;

            if (data.porcentajeProvision !== undefined) {
                // Prioridad: Porcentaje Manual
                porcentaje = Number(data.porcentajeProvision);
                provision = (Number(data.cuantiaEstimada) * porcentaje) / 100;
            } else {
                // Fallback: Automático por zona
                const calculo = this.calcularProvision(Number(data.cuantiaEstimada), data.zonaResidual);
                provision = calculo.provision;
                porcentaje = calculo.porcentaje;
            }

            data.provisionContable = provision;
            data.porcentajeProvision = porcentaje;
            data.fechaCalculoProvision = new Date();
        }

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

        // Notificar asignación si hay responsableId
        if (saved.responsableId) {
            this.legalNotificationsService.notifyRiesgoAsignado({
                riesgoId: saved.id,
                codigo: saved.codigo,
                nombreRiesgo: saved.nombre,
                abogadoId: saved.responsableId,
                asignadoPor: data['createdBy'] || 'Sistema',
                esReasignacion: false
            });
        }

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

        // Recalcular provisión contable (Lógica Híbrida Manual/Automática)
        const zonaFinal = data.zonaResidual ?? riesgo.zonaResidual;
        const cuantiaFinal = data.cuantiaEstimada !== undefined ? Number(data.cuantiaEstimada) : Number(riesgo.cuantiaEstimada || 0);

        // Si viene un porcentaje manual explícito (incluso 0), lo respetamos
        if (data.porcentajeProvision !== undefined) {
            const porcentaje = Number(data.porcentajeProvision);
            const provision = (cuantiaFinal * porcentaje) / 100;

            data.provisionContable = provision;
            data.porcentajeProvision = porcentaje;
            data.fechaCalculoProvision = new Date();
        }
        // Si no viene porcentaje pero cambia cuantía/zona, recalculamos automático solo si no había manual antes?
        // Simplificación: Si el usuario no mandó porcentaje, asumimos recálculo automático
        else if (data.cuantiaEstimada !== undefined || data.zonaResidual !== undefined) {
            const { provision, porcentaje } = this.calcularProvision(cuantiaFinal, zonaFinal);
            data.provisionContable = provision;
            data.porcentajeProvision = porcentaje;
            data.fechaCalculoProvision = new Date();
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

        // Notificar si el responsable cambió
        if (data.responsableId && data.responsableId !== riesgo.responsableId) {
            this.legalNotificationsService.notifyRiesgoAsignado({
                riesgoId: saved.id,
                codigo: saved.codigo,
                nombreRiesgo: saved.nombre,
                abogadoId: saved.responsableId,
                asignadoPor: data['createdBy'] || 'Sistema',
                esReasignacion: !!riesgo.responsableId // Si ya había responsable, es reasignación
            });
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

    async archivar(id: string, motivo?: string): Promise<Riesgo> {
        const riesgo = await this.findOne(id);
        riesgo.estado = 'ARCHIVADO';
        riesgo.motivoArchivo = motivo || null;
        const saved = await this.riesgoRepo.save(riesgo);

        // Registrar archivado
        await this.registrarEvento(
            id,
            'ARCHIVADO',
            `Riesgo ${riesgo.codigo} archivado${motivo ? `: ${motivo}` : ''}`,
            'estado',
            'ACTIVO',
            'ARCHIVADO',
            'Sistema'
        );

        return saved;
    }

    async findArchived(): Promise<Riesgo[]> {
        return this.riesgoRepo.find({
            where: [
                { estado: 'ARCHIVADO' as EstadoRiesgo },
                { estado: 'ELIMINADO' as EstadoRiesgo }
            ],
            order: { updatedAt: 'DESC' }
        });
    }

    async restaurar(id: string): Promise<Riesgo> {
        const riesgo = await this.findOne(id);
        if (riesgo.estado !== 'ARCHIVADO' && riesgo.estado !== 'ELIMINADO') {
            throw new NotFoundException(`Riesgo ${id} no está archivado ni eliminado`);
        }
        const estadoAnterior = riesgo.estado;
        riesgo.estado = 'ACTIVO';
        const saved = await this.riesgoRepo.save(riesgo);

        // Registrar restauración
        await this.registrarEvento(
            id,
            'ACTUALIZACION',
            `Riesgo ${riesgo.codigo} restaurado del archivo`,
            'estado',
            estadoAnterior,
            'ACTIVO',
            'Sistema'
        );

        return saved;
    }

    async marcarEliminado(id: string, motivo?: string): Promise<Riesgo> {
        const riesgo = await this.findOne(id);
        riesgo.estado = 'ELIMINADO';
        riesgo.motivoArchivo = motivo || 'Eliminado por el usuario';
        const saved = await this.riesgoRepo.save(riesgo);

        await this.registrarEvento(
            id,
            'ARCHIVADO',
            `Riesgo ${riesgo.codigo} marcado como eliminado${motivo ? `: ${motivo}` : ''}`,
            'estado',
            'ACTIVO',
            'ELIMINADO',
            'Sistema'
        );

        return saved;
    }

    async eliminarPermanente(id: string): Promise<void> {
        const riesgo = await this.findOne(id);
        if (riesgo.estado !== 'ARCHIVADO' && riesgo.estado !== 'ELIMINADO') {
            throw new NotFoundException(`Riesgo ${id} debe estar archivado o eliminado para eliminarse permanentemente`);
        }

        // Primero eliminar el historial asociado
        await this.historialRepo.delete({ riesgoId: id });

        // Luego eliminar el riesgo
        await this.riesgoRepo.remove(riesgo);
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

    // ============================================
    // PROVISIÓN CONTABLE
    // ============================================

    /**
     * Calcula la provisión contable según la zona de riesgo
     * EXTREMO: 100%, ALTO: 75%, MODERADO: 50%, BAJO: 25%
     */
    calcularProvision(cuantia: number, zona: ZonaRiesgo): { provision: number; porcentaje: number } {
        const porcentajes: Record<ZonaRiesgo, number> = {
            'EXTREMO': 100,
            'ALTO': 75,
            'MODERADO': 50,
            'BAJO': 25
        };
        const porcentaje = porcentajes[zona] || 50;
        const provision = (cuantia * porcentaje) / 100;
        return { provision, porcentaje };
    }

    /**
     * Actualiza la provisión contable de un riesgo
     */
    async actualizarProvision(id: string, cuantiaEstimada: number): Promise<Riesgo> {
        const riesgo = await this.findOne(id);
        const cuantiaAnterior = riesgo.cuantiaEstimada;

        const { provision, porcentaje } = this.calcularProvision(cuantiaEstimada, riesgo.zonaResidual);

        riesgo.cuantiaEstimada = cuantiaEstimada;
        riesgo.provisionContable = provision;
        riesgo.porcentajeProvision = porcentaje;
        riesgo.fechaCalculoProvision = new Date();

        const saved = await this.riesgoRepo.save(riesgo);

        // Registrar evento
        await this.registrarEvento(
            id,
            'ACTUALIZACION',
            `Provisión calculada: $${provision.toLocaleString()} (${porcentaje}% de $${cuantiaEstimada.toLocaleString()})`,
            'provision_contable',
            cuantiaAnterior?.toString() || '0',
            cuantiaEstimada.toString(),
            'Sistema'
        );

        return saved;
    }

    /**
     * Genera reporte de provisiones para Contabilidad
     */
    async getReporteContabilidad(): Promise<{
        fechaGeneracion: Date;
        totalProvision: number;
        totalCuantia: number;
        riesgos: {
            codigo: string;
            nombre: string;
            proceso: string;
            zona: ZonaRiesgo;
            cuantiaEstimada: number;
            porcentajeProvision: number;
            provisionContable: number;
            fechaCalculo: Date | null;
        }[];
    }> {
        const riesgos = await this.riesgoRepo.find({
            where: { estado: 'ACTIVO' as EstadoRiesgo },
            order: { zonaResidual: 'DESC', cuantiaEstimada: 'DESC' }
        });

        const reporte = riesgos.map(r => ({
            codigo: r.codigo,
            nombre: r.nombre,
            proceso: r.procesoRadicado ? `${r.procesoRadicado} (${r.moduloOrigen || 'General'})` : r.proceso,
            zona: r.zonaResidual,
            cuantiaEstimada: Number(r.cuantiaEstimada) || 0,
            porcentajeProvision: r.porcentajeProvision || 0,
            provisionContable: Number(r.provisionContable) || 0,
            fechaCalculo: r.fechaCalculoProvision || null
        }));

        const totalCuantia = reporte.reduce((sum, r) => sum + r.cuantiaEstimada, 0);
        const totalProvision = reporte.reduce((sum, r) => sum + r.provisionContable, 0);

        return {
            fechaGeneracion: new Date(),
            totalProvision,
            totalCuantia,
            riesgos: reporte
        };
    }
    async generarReporteContabilidadPDF(): Promise<Buffer> {
        const PDFDocument = require('pdfkit');
        const data = await this.getReporteContabilidad();

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50 });
            const buffers: any[] = [];

            doc.on('data', (buffer: any) => buffers.push(buffer));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            // LOGO (Texto por ahora)
            doc.fontSize(10).text('PLATAFORMA ESAP - GESTIÓN DE RIESGOS', { align: 'right' });
            doc.moveDown();

            // === ENCABEZADO ===
            doc.fontSize(16).font('Helvetica-Bold').text('REPORTE DE ESTIMACIÓN DE RIESGOS PARA PROVISIÓN CONTABLE', { align: 'center' });
            doc.moveDown();
            doc.fontSize(10).font('Helvetica').text(`Fecha de Generación: ${new Date().toLocaleString('es-CO')}`, { align: 'right' });
            doc.moveDown();

            // === RESUMEN ===
            doc.rect(50, doc.y, 510, 80).fillAndStroke('#f3f4f6', '#e5e7eb');
            doc.fill('black');
            doc.moveUp(); // Volver arriba

            let y = doc.y + 15;
            doc.fontSize(12).font('Helvetica-Bold').text('RESUMEN GENERAL', 70, y);
            y += 25;

            // Fila 1 de resumen
            doc.fontSize(10).font('Helvetica').text(`Total Riesgos Activos: ${data.riesgos.length}`, 70, y);

            // Fila 2 de resumen (separada para evitar solapamiento)
            y += 20;
            doc.text(`Total Cuantía Estimada: $${data.totalCuantia.toLocaleString('es-CO')}`, 70, y);
            doc.font('Helvetica-Bold').text(`Total Provisión: $${data.totalProvision.toLocaleString('es-CO')}`, 350, y);

            doc.y = y + 50; // Mover cursor abajo del cuadro

            // === DETALLE ===
            doc.fontSize(14).font('Helvetica-Bold').text('DETALLE POR RIESGO', 50, doc.y);
            doc.moveDown();

            const itemHeight = 20;

            // Cabecera de tabla
            y = doc.y;
            doc.rect(50, y, 510, 20).fillAndStroke('#003DA5', '#003DA5');
            doc.fill('white');
            doc.fontSize(9).font('Helvetica-Bold');
            doc.text('Código', 60, y + 5);
            doc.text('Proceso / Radicado', 110, y + 5);
            doc.text('Zona', 230, y + 5);
            doc.text('Cuantía', 280, y + 5, { width: 80, align: 'right' });
            doc.text('%', 370, y + 5, { width: 30, align: 'right' });
            doc.text('Provisión', 410, y + 5, { width: 80, align: 'right' });
            doc.text('Fecha Calc.', 500, y + 5);

            doc.fill('black');
            y += 25;
            doc.font('Helvetica');

            data.riesgos.forEach((r: any, index: number) => {
                // Verificar salto de página
                if (y + itemHeight > doc.page.height - 50) {
                    doc.addPage();
                    y = 50;
                    // Repetir cabecera
                    doc.rect(50, y, 510, 20).fillAndStroke('#003DA5', '#003DA5');
                    doc.fill('white');
                    doc.fontSize(9).font('Helvetica-Bold');
                    doc.text('Código', 60, y + 5);
                    doc.text('Proceso / Radicado', 110, y + 5);
                    doc.text('Zona', 230, y + 5);
                    doc.text('Cuantía', 280, y + 5, { width: 80, align: 'right' });
                    doc.text('%', 370, y + 5, { width: 30, align: 'right' });
                    doc.text('Provisión', 410, y + 5, { width: 80, align: 'right' });
                    doc.text('Fecha Calc.', 500, y + 5);
                    doc.fill('black');
                    y += 25;
                    doc.font('Helvetica');
                }

                // Alternar color de fondo
                if (index % 2 === 0) {
                    doc.rect(50, y - 2, 510, itemHeight).fill('#f9fafb');
                    doc.fill('black');
                }

                doc.fontSize(8);
                doc.text(r.codigo, 60, y);
                doc.text(r.proceso.substring(0, 35), 110, y, { width: 110 }); // Más espacio para proceso
                doc.text(r.zona, 230, y);
                doc.text(`$${r.cuantiaEstimada.toLocaleString('es-CO')}`, 280, y, { width: 80, align: 'right' });
                doc.text(`${r.porcentajeProvision}%`, 370, y, { width: 30, align: 'right' });
                doc.text(`$${r.provisionContable.toLocaleString('es-CO')}`, 410, y, { width: 80, align: 'right' });
                doc.text(r.fechaCalculo ? new Date(r.fechaCalculo).toLocaleDateString() : '-', 500, y);

                y += itemHeight;
            });

            // Pie de página
            const pageCount = doc.bufferedPageRange().count;
            for (let i = 0; i < pageCount; i++) {
                doc.switchToPage(i);
                doc.fontSize(8).text(
                    `Generado por Plataforma ESAP | Página ${i + 1} de ${pageCount}`,
                    50,
                    doc.page.height - 40,
                    { align: 'center', width: 500 }
                );
            }

            doc.end();
        });
    }
}

