import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcesoCoactivo, DeudorInfo, ObligacionInfo, EstadoProcesoCoactivo } from '../entities/proceso-coactivo.entity';
import { ProcesoCoactivoAdjunto } from '../entities/proceso-coactivo-adjunto.entity';
import * as fs from 'fs';
import * as path from 'path';

export interface CreateProcesoCoactivoDto {
    deudor: DeudorInfo;
    obligacion: ObligacionInfo;
    responsable?: string;
    observaciones?: string;
}

export interface UpdateProcesoCoactivoDto {
    deudor?: DeudorInfo;
    obligacion?: ObligacionInfo;
    estado?: EstadoProcesoCoactivo;
    responsable?: string;
    observaciones?: string;
    documentosAdjuntos?: number;
    notificacionesEnviadas?: number;
}

export interface ProcesoCoactivoStats {
    total: number;
    activos: number;
    criticos: number;
    totalMonto: number;
    porEstado: Record<string, number>;
}

@Injectable()
export class ProcesoCoactivoService {
    constructor(
        @InjectRepository(ProcesoCoactivo)
        private readonly procesoCoactivoRepository: Repository<ProcesoCoactivo>,
        @InjectRepository(ProcesoCoactivoAdjunto)
        private readonly adjuntoRepository: Repository<ProcesoCoactivoAdjunto>,
    ) { }

    async findAll(): Promise<ProcesoCoactivo[]> {
        return this.procesoCoactivoRepository.find({
            order: { fechaCreacion: 'DESC' }
        });
    }

    async findOne(id: string): Promise<ProcesoCoactivo> {
        const proceso = await this.procesoCoactivoRepository.findOne({ where: { id } });
        if (!proceso) {
            throw new NotFoundException(`Proceso Coactivo ${id} no encontrado`);
        }
        return proceso;
    }

    async create(dto: CreateProcesoCoactivoDto): Promise<ProcesoCoactivo> {
        // Generar radicado automático
        const count = await this.procesoCoactivoRepository.count();
        const year = new Date().getFullYear();
        const radicado = `COA-${year}-${String(count + 1).padStart(5, '0')}`;

        const proceso = this.procesoCoactivoRepository.create({
            radicado,
            deudor: dto.deudor,
            obligacion: dto.obligacion,
            estado: 'IDENTIFICADO',
            responsable: dto.responsable || 'Sin asignar',
            observaciones: dto.observaciones,
            ultimaActuacion: new Date(),
            documentosAdjuntos: 0,
            notificacionesEnviadas: 0
        });

        return this.procesoCoactivoRepository.save(proceso);
    }

    async update(id: string, dto: UpdateProcesoCoactivoDto): Promise<ProcesoCoactivo> {
        const proceso = await this.findOne(id);

        if (dto.deudor) proceso.deudor = dto.deudor;
        if (dto.obligacion) proceso.obligacion = dto.obligacion;
        if (dto.estado) proceso.estado = dto.estado;
        if (dto.responsable !== undefined) proceso.responsable = dto.responsable;
        if (dto.observaciones !== undefined) proceso.observaciones = dto.observaciones;
        if (dto.documentosAdjuntos !== undefined) proceso.documentosAdjuntos = dto.documentosAdjuntos;
        if (dto.notificacionesEnviadas !== undefined) proceso.notificacionesEnviadas = dto.notificacionesEnviadas;

        proceso.ultimaActuacion = new Date();

        return this.procesoCoactivoRepository.save(proceso);
    }

    async delete(id: string): Promise<void> {
        const proceso = await this.findOne(id);
        await this.procesoCoactivoRepository.remove(proceso);
    }

    async getStats(): Promise<ProcesoCoactivoStats> {
        const procesos = await this.procesoCoactivoRepository.find();

        const hoy = new Date();
        let totalMonto = 0;
        let activos = 0;
        let criticos = 0;
        const porEstado: Record<string, number> = {};

        for (const proceso of procesos) {
            // Sumar monto
            totalMonto += proceso.obligacion?.valor || 0;

            // Contar activos (no finalizados)
            if (proceso.estado !== 'FINALIZADO') {
                activos++;
            }

            // Calcular días vencidos para determinar críticos
            const fechaVencimiento = new Date(proceso.obligacion?.fechaVencimiento);
            const diasVencidos = Math.floor((hoy.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24));
            if (diasVencidos > 180 && proceso.estado !== 'FINALIZADO') {
                criticos++;
            }

            // Contar por estado
            porEstado[proceso.estado] = (porEstado[proceso.estado] || 0) + 1;
        }

        return {
            total: procesos.length,
            activos,
            criticos,
            totalMonto,
            porEstado
        };
    }

    // ============ GESTIÓN DE DOCUMENTOS ============

    async addAdjunto(procesoId: string, file: Express.Multer.File): Promise<ProcesoCoactivoAdjunto> {
        const proceso = await this.findOne(procesoId);

        const adjunto = this.adjuntoRepository.create({
            proceso,
            nombreOriginal: file.originalname,
            nombreArchivo: file.filename,
            mimeType: file.mimetype,
            tamano: file.size,
            fechaCreacion: new Date()
        });

        const savedAdjunto = await this.adjuntoRepository.save(adjunto);

        // Actualizar contador
        const count = await this.adjuntoRepository.count({ where: { proceso: { id: procesoId } } });
        proceso.documentosAdjuntos = count;
        await this.procesoCoactivoRepository.save(proceso);

        return savedAdjunto;
    }

    async getAdjuntos(procesoId: string): Promise<ProcesoCoactivoAdjunto[]> {
        return this.adjuntoRepository.find({
            where: { proceso: { id: procesoId } },
            order: { fechaCreacion: 'DESC' }
        });
    }

    async deleteAdjunto(adjuntoId: string): Promise<void> {
        const adjunto = await this.adjuntoRepository.findOne({
            where: { id: adjuntoId },
            relations: ['proceso']
        });

        if (!adjunto) {
            throw new NotFoundException('Documento no encontrado');
        }

        const procesoId = adjunto.proceso.id;

        // Eliminar archivo físico
        const filePath = path.join(process.cwd(), 'uploads', adjunto.nombreArchivo);
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (err) {
                console.error(`Error eliminando archivo físico ${filePath}:`, err);
            }
        }

        await this.adjuntoRepository.remove(adjunto);

        // Actualizar contador
        const proceso = await this.findOne(procesoId); // Recargar proceso
        const count = await this.adjuntoRepository.count({ where: { proceso: { id: procesoId } } });
        proceso.documentosAdjuntos = count;
        await this.procesoCoactivoRepository.save(proceso);
    }
    // ============ DESCARGA ZIP (PDF + ADJUNTOS) ============

    async downloadZip(procesoId: string): Promise<any> {
        const proceso = await this.findOne(procesoId);
        const adjuntos = await this.getAdjuntos(procesoId);

        const archiver = require('archiver');
        const PDFDocument = require('pdfkit');

        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        // 1. Generar PDF en memoria
        const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
            const doc = new PDFDocument();
            const buffers: any[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            // Contenido del PDF
            doc.fontSize(20).text('FICHA TÉCNICA DEL PROCESO COACTIVO', { align: 'center' });
            doc.moveDown();

            doc.fontSize(12).text(`Radicado: ${proceso.radicado}`, { bold: true });
            doc.text(`Fecha de Creación: ${new Date(proceso.fechaCreacion).toLocaleDateString()}`);
            doc.moveDown();

            doc.fontSize(14).text('Información del Deudor');
            doc.fontSize(10)
                .text(`Nombre: ${proceso.deudor.nombre}`)
                .text(`Identificación: ${proceso.deudor.identificacion}`)
                .text(`Email: ${proceso.deudor.email || 'N/A'}`)
                .text(`Teléfono: ${proceso.deudor.telefono || 'N/A'}`)
                .text(`Dirección: ${proceso.deudor.direccion || 'N/A'}`);
            doc.moveDown();

            doc.fontSize(14).text('Información de la Obligación');
            doc.fontSize(10)
                .text(`Concepto: ${proceso.obligacion.concepto}`)
                .text(`Valor Capital: $${proceso.obligacion.valor.toLocaleString()}`)
                .text(`Fecha Vencimiento: ${new Date(proceso.obligacion.fechaVencimiento).toLocaleDateString()}`);
            doc.moveDown();

            doc.fontSize(14).text('Estado Actual');
            doc.fontSize(10).text(`Estado: ${proceso.estado}`);
            doc.text(`Responsable: ${proceso.responsable || 'Sin asignar'}`);
            if (proceso.observaciones) {
                doc.moveDown().text('Observaciones:');
                doc.text(proceso.observaciones);
            }
            doc.moveDown();

            doc.fontSize(14).text('Documentos Adjuntos');
            if (adjuntos.length === 0) {
                doc.fontSize(10).text('No hay documentos adjuntos.');
            } else {
                adjuntos.forEach((adj, index) => {
                    doc.fontSize(10).text(`${index + 1}. ${adj.nombreOriginal} (${(adj.tamano / 1024).toFixed(1)} KB)`);
                });
            }

            doc.end();
        });

        // 2. Agregar PDF al ZIP
        archive.append(pdfBuffer, { name: `Ficha_${proceso.radicado}.pdf` });

        // 3. Agregar adjuntos al ZIP
        for (const adjunto of adjuntos) {
            const filePath = path.join(process.cwd(), 'uploads', adjunto.nombreArchivo);
            if (fs.existsSync(filePath)) {
                archive.file(filePath, { name: adjunto.nombreOriginal });
            }
        }

        archive.finalize();
        return archive;
    }
}
