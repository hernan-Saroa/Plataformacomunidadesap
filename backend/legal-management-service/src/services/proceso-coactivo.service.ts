import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ProcesoCoactivo, DeudorInfo, ObligacionInfo, EstadoProcesoCoactivo } from '../entities/proceso-coactivo.entity';
import { ProcesoCoactivoAdjunto } from '../entities/proceso-coactivo-adjunto.entity';
import { PagoCoactivo } from '../entities/pago-coactivo.entity';
import { CoactivoHistorial } from '../entities/coactivo-historial.entity';
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
    usuario?: string; // Para auditoría
}

export interface CreatePagoCoactivoDto {
    valor: number;
    fechaPago: Date;
    origen: string;
    observaciones?: string;
    soporteUrl?: string;
    usuario?: string; // Para auditoría
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
        @InjectRepository(PagoCoactivo)
        private readonly pagoRepository: Repository<PagoCoactivo>,
        @InjectRepository(CoactivoHistorial)
        private readonly historialRepository: Repository<CoactivoHistorial>,
    ) { }

    async findAll(): Promise<ProcesoCoactivo[]> {
        return this.procesoCoactivoRepository.find({
            where: { estadoArchivo: 'ACTIVO' },
            order: { fechaCreacion: 'DESC' }
        });
    }

    async findAllArchivados(): Promise<ProcesoCoactivo[]> {
        return this.procesoCoactivoRepository.find({
            where: [
                { estadoArchivo: 'ARCHIVADO' },
                { estadoArchivo: 'ELIMINADO' }
            ],
            order: { fechaArchivo: 'DESC' }
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
        // Generar radicado automático basado en secuencia anual
        const year = new Date().getFullYear();
        const lastProceso = await this.procesoCoactivoRepository.findOne({
            where: { radicado: Like(`COA-${year}-%`) },
            order: { radicado: 'DESC' }
        });

        let sequence = 1;
        if (lastProceso && lastProceso.radicado) {
            const parts = lastProceso.radicado.split('-');
            if (parts.length === 3) {
                sequence = parseInt(parts[2], 10) + 1;
            }
        }

        const radicado = `COA-${year}-${String(sequence).padStart(5, '0')}`;

        const proceso = this.procesoCoactivoRepository.create({
            radicado,
            deudor: dto.deudor,
            obligacion: dto.obligacion,
            estado: 'IDENTIFICADO',
            responsable: dto.responsable || 'Sin asignar',
            observaciones: dto.observaciones,
            ultimaActuacion: new Date(),
            documentosAdjuntos: 0,
            notificacionesEnviadas: 0,
            valorPagado: 0,
            saldoPendiente: Number(dto.obligacion.valor),
            estadoArchivo: 'ACTIVO'
        });

        const savedProceso = await this.procesoCoactivoRepository.save(proceso);

        // Registrar historial de creación
        await this.registrarHistorial(savedProceso.id, 'CREACION', null, null, null, 'Sistema', 'Proceso creado automáticamente o manualmente');

        return savedProceso;
    }

    async update(id: string, dto: UpdateProcesoCoactivoDto): Promise<ProcesoCoactivo> {
        const proceso = await this.findOne(id);
        const usuario = dto.usuario || 'Sistema';

        // Detectar cambios y registrar auditoría
        if (dto.deudor) {
            // Simplificación: registrar que cambió el deudor sin detalle profundo JSON
            await this.registrarHistorial(id, 'ACTUALIZACION', 'deudor', JSON.stringify(proceso.deudor), JSON.stringify(dto.deudor), usuario, 'Actualización de datos del deudor');
            proceso.deudor = dto.deudor;
        }

        if (dto.obligacion) {
            if (dto.obligacion.valor !== proceso.obligacion.valor) {
                await this.registrarHistorial(id, 'ACTUALIZACION', 'obligacion.valor', proceso.obligacion.valor.toString(), dto.obligacion.valor.toString(), usuario, 'Cambio en valor de obligación');
                // Recalcular saldo si cambia la obligación
                const valorPagado = proceso.valorPagado || 0;
                proceso.saldoPendiente = dto.obligacion.valor - valorPagado;
            }
            proceso.obligacion = dto.obligacion;
        }

        if (dto.estado && dto.estado !== proceso.estado) {
            await this.registrarHistorial(id, 'CAMBIO_ETAPA', 'estado', proceso.estado, dto.estado, usuario, `Cambio de etapa a ${dto.estado}`);
            proceso.estado = dto.estado;
        }

        if (dto.responsable !== undefined && dto.responsable !== proceso.responsable) {
            await this.registrarHistorial(id, 'ACTUALIZACION', 'responsable', proceso.responsable, dto.responsable, usuario, 'Cambio de responsable');
            proceso.responsable = dto.responsable;
        }

        if (dto.observaciones !== undefined) proceso.observaciones = dto.observaciones;
        if (dto.documentosAdjuntos !== undefined) proceso.documentosAdjuntos = dto.documentosAdjuntos;
        if (dto.notificacionesEnviadas !== undefined) proceso.notificacionesEnviadas = dto.notificacionesEnviadas;

        proceso.ultimaActuacion = new Date();

        return this.procesoCoactivoRepository.save(proceso);
    }

    async delete(id: string): Promise<void> {
        // Deprecated: use eliminarPermanente or archivar instead
        // Kept for backward compatibility if needed, performing hard delete
        const proceso = await this.findOne(id);
        await this.procesoCoactivoRepository.remove(proceso);
    }

    // ============ SISTEMA DE ARCHIVO ============

    async archivar(id: string, motivo: string, usuario: string): Promise<ProcesoCoactivo> {
        const proceso = await this.findOne(id);
        proceso.estadoArchivo = 'ARCHIVADO';
        proceso.fechaArchivo = new Date();
        proceso.usuarioArchivo = usuario;
        proceso.motivoArchivo = motivo;
        // Opcional: cambiar estado a FINALIZADO? No necesariamente.

        await this.registrarHistorial(id, 'ARCHIVADO', 'estadoArchivo', 'ACTIVO', 'ARCHIVADO', usuario, `Proceso archivado. Motivo: ${motivo}`);

        return this.procesoCoactivoRepository.save(proceso);
    }

    async restaurar(id: string, usuario: string): Promise<ProcesoCoactivo> {
        const proceso = await this.findOne(id);
        const estadoAnterior = proceso.estadoArchivo;

        proceso.estadoArchivo = 'ACTIVO';
        proceso.fechaArchivo = null;
        proceso.usuarioArchivo = null;
        proceso.motivoArchivo = null;

        await this.registrarHistorial(id, 'RESTAURADO', 'estadoArchivo', estadoAnterior, 'ACTIVO', usuario, 'Proceso restaurado del archivo');

        return this.procesoCoactivoRepository.save(proceso);
    }

    async eliminarPermanente(id: string, usuario: string, motivo: string): Promise<void> {
        const proceso = await this.findOne(id);

        // Si ya está eliminado (soft delete), procedemos a borrarlo físicamente (hard delete)
        if (proceso.estadoArchivo === 'ELIMINADO') {
            await this.procesoCoactivoRepository.remove(proceso);
            return;
        }

        // Si no, hacemos Soft Delete (marcar como ELIMINADO para auditoría/papelera)
        proceso.estadoArchivo = 'ELIMINADO';
        proceso.fechaArchivo = new Date();
        proceso.usuarioArchivo = usuario;
        proceso.motivoArchivo = motivo;

        await this.registrarHistorial(id, 'ELIMINADO', 'estadoArchivo', 'ACTIVO/ARCHIVADO', 'ELIMINADO', usuario, `Proceso movido a papelera. Motivo: ${motivo}`);

        await this.procesoCoactivoRepository.save(proceso);
    }

    async getStats(): Promise<ProcesoCoactivoStats> {
        const procesos = await this.procesoCoactivoRepository.find();

        const hoy = new Date();
        let totalMonto = 0; // Ahora representa saldo pendiente total
        let totalOriginal = 0; // Monto original de todas las obligaciones
        let activos = 0;
        let criticos = 0;
        const porEstado: Record<string, number> = {};

        for (const proceso of procesos) {
            // Sumar monto original
            totalOriginal += proceso.obligacion?.valor || 0;

            // Sumar saldo pendiente (si no hay saldoPendiente, usar el valor original)
            totalMonto += proceso.saldoPendiente ?? proceso.obligacion?.valor ?? 0;

            // Contar activos (no finalizados)
            if (proceso.estado !== 'FINALIZADO') {
                activos++;
            }

            // Calcular días para vencimiento (crítico si vence pronto o ya venció)
            const fechaVencimiento = proceso.obligacion?.fechaVencimiento
                ? new Date(proceso.obligacion.fechaVencimiento)
                : null;
            if (fechaVencimiento && proceso.estado !== 'FINALIZADO') {
                const diasParaVencer = Math.floor((fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                // Es crítico si vence en 7 días o menos (incluye ya vencidos)
                if (diasParaVencer <= 7) {
                    criticos++;
                }
            }

            // Contar por estado
            porEstado[proceso.estado] = (porEstado[proceso.estado] || 0) + 1;
        }

        return {
            total: procesos.length,
            activos,
            criticos,
            totalMonto, // Ahora es saldo pendiente
            porEstado
        };
    }

    // ============ GESTIÓN DE PAGOS Y AUDITORÍA ============

    async registrarPago(procesoId: string, dto: CreatePagoCoactivoDto): Promise<PagoCoactivo> {
        const proceso = await this.findOne(procesoId);

        // Crear registro de pago
        const pago = this.pagoRepository.create({
            proceso,
            valor: dto.valor,
            fechaPago: dto.fechaPago,
            origen: dto.origen,
            observaciones: dto.observaciones,
            soporteUrl: dto.soporteUrl
        });
        const savedPago = await this.pagoRepository.save(pago);

        // Actualizar acumulados en proceso
        const totalPagado = Number(proceso.valorPagado || 0) + Number(dto.valor);
        const nuevoSaldo = Number(proceso.obligacion.valor) - totalPagado;

        proceso.valorPagado = totalPagado;
        proceso.saldoPendiente = nuevoSaldo;
        proceso.ultimaActuacion = new Date();

        await this.procesoCoactivoRepository.save(proceso);

        // Registrar en historial
        await this.registrarHistorial(
            procesoId,
            'PAGO',
            'valorPagado',
            (totalPagado - Number(dto.valor)).toString(),
            totalPagado.toString(),
            dto.usuario || 'Sistema',
            `Pago registrado por $${dto.valor}`
        );

        return savedPago;
    }

    async getPagos(procesoId: string): Promise<PagoCoactivo[]> {
        return this.pagoRepository.find({
            where: { proceso: { id: procesoId } },
            order: { fechaPago: 'DESC' }
        });
    }

    async deletePago(pagoId: string): Promise<void> {
        // Buscar el pago con su proceso
        const pago = await this.pagoRepository.findOne({
            where: { id: pagoId },
            relations: ['proceso']
        });

        if (!pago) {
            throw new NotFoundException(`Pago ${pagoId} no encontrado`);
        }

        const proceso = await this.findOne(pago.proceso.id);
        const valorPago = Number(pago.valor);

        // Recalcular balance
        const nuevoValorPagado = Number(proceso.valorPagado || 0) - valorPago;
        const nuevoSaldo = Number(proceso.obligacion.valor) - nuevoValorPagado;

        proceso.valorPagado = Math.max(0, nuevoValorPagado);
        proceso.saldoPendiente = nuevoSaldo;
        proceso.ultimaActuacion = new Date();

        // Eliminar el pago
        await this.pagoRepository.delete(pagoId);

        // Guardar proceso actualizado
        await this.procesoCoactivoRepository.save(proceso);

        // Registrar en historial
        await this.registrarHistorial(
            proceso.id,
            'ELIMINACION_PAGO',
            'valorPagado',
            (nuevoValorPagado + valorPago).toString(),
            nuevoValorPagado.toString(),
            'Sistema',
            `Pago eliminado por $${valorPago}. Nuevo saldo pendiente: $${nuevoSaldo}`
        );
    }

    async getHistorial(procesoId: string): Promise<CoactivoHistorial[]> {
        return this.historialRepository.find({
            where: { proceso: { id: procesoId } },
            order: { fechaEvento: 'DESC' }
        });
    }

    private async registrarHistorial(
        procesoId: string,
        tipoEvento: string,
        campoModificado: string | null,
        valorAnterior: string | null,
        valorNuevo: string | null,
        usuario: string,
        detalles: string
    ): Promise<void> {
        const historial = this.historialRepository.create({
            procesoId: procesoId,
            tipoEvento,
            campoModificado,
            valorAnterior,
            valorNuevo,
            usuario,
            detalles,
            fechaEvento: new Date()
        } as any);
        await this.historialRepository.save(historial);
    }

    async addAdjunto(procesoId: string, file: Express.Multer.File, tipo: string = 'DOCUMENTO'): Promise<ProcesoCoactivoAdjunto> {
        const proceso = await this.findOne(procesoId);

        const adjunto = this.adjuntoRepository.create({
            proceso,
            nombreOriginal: file.originalname,
            nombreArchivo: file.filename,
            mimeType: file.mimetype,
            tamano: file.size,
            tipo,
            archivoUrl: `/files/${file.filename}`,
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

    // ============ SERVIR ARCHIVOS DE PAGOS ============
    async getSoportePagoStream(filename: string): Promise<fs.ReadStream> {
        const filePath = path.join(process.cwd(), 'uploads', filename);
        if (!fs.existsSync(filePath)) {
            throw new NotFoundException('Archivo de soporte no encontrado');
        }
        return fs.createReadStream(filePath);
    }
}
