import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ProcesoCoactivo, DeudorInfo, ObligacionInfo, EstadoProcesoCoactivo } from '../entities/proceso-coactivo.entity';
import { ProcesoCoactivoAdjunto } from '../entities/proceso-coactivo-adjunto.entity';
import { PagoCoactivo } from '../entities/pago-coactivo.entity';
import { CoactivoHistorial } from '../entities/coactivo-historial.entity';
import { TasaReferencia } from '../entities/tasa-referencia.entity';
import { LegalNotificationsService } from './legal-notifications.service';
import * as fs from 'fs';
import * as path from 'path';

export interface CreateProcesoCoactivoDto {
    deudor: DeudorInfo;
    obligacion: ObligacionInfo;
    responsable?: string;
    observaciones?: string;
    creadoPor?: string;
    usuario?: string;
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
        @InjectRepository(TasaReferencia)
        private readonly tasaRepository: Repository<TasaReferencia>,
        private readonly legalNotifications: LegalNotificationsService,
    ) { }

    async findAll(filtros: { asignadoKeys?: string[] } = {}): Promise<ProcesoCoactivo[]> {
        const query = this.procesoCoactivoRepository
            .createQueryBuilder('proceso')
            .where("proceso.estadoArchivo = 'ACTIVO'")
            .orderBy('proceso.fechaCreacion', 'DESC');

        if (filtros.asignadoKeys?.length) {
            const nameKeys = filtros.asignadoKeys.map(k => k.toLowerCase());
            query.andWhere('LOWER(proceso.responsable) IN (:...nameKeys)', { nameKeys });
        }

        return query.getMany();
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

    private validateDeudor(deudor: DeudorInfo): void {
        if (deudor.identificacion && deudor.identificacion.length > 11) {
            throw new BadRequestException('La identificación no puede superar los 11 dígitos');
        }
        if (deudor.telefono && deudor.telefono.length > 15) {
            throw new BadRequestException('El teléfono no puede superar los 15 caracteres');
        }
    }

    async create(dto: CreateProcesoCoactivoDto): Promise<ProcesoCoactivo> {
        this.validateDeudor(dto.deudor);
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
            estado: 'PERSUASIVA',
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

        const creadoPor = dto.creadoPor || dto.usuario || 'Sistema';
        // Registrar historial de creación
        await this.registrarHistorial(savedProceso.id, 'CREACION', null, null, null, creadoPor, 'Proceso creado automáticamente o manualmente');

        await this.legalNotifications.notifyProcesoCreado({
            modulo: 'PROCESOS_COACTIVOS',
            radicado: savedProceso.radicado,
            procesoId: savedProceso.id,
            creadoPor,
        });

        return savedProceso;
    }

    async update(id: string, dto: UpdateProcesoCoactivoDto): Promise<ProcesoCoactivo> {
        const proceso = await this.findOne(id);
        const usuario = dto.usuario || 'Sistema';

        // Detectar cambios y registrar auditoría
        if (dto.deudor) {
            this.validateDeudor(dto.deudor);
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
            if (proceso.estado !== 'LIQUIDACION') {
                activos++;
            }

            // Calcular prescripción legal (5 años desde fechaEjecutoria)
            if (proceso.fechaEjecutoria && proceso.estado !== 'LIQUIDACION') {
                const fechaPrescripcion = new Date(proceso.fechaEjecutoria);
                fechaPrescripcion.setFullYear(fechaPrescripcion.getFullYear() + 5);

                const diasParaPrescribir = Math.floor((fechaPrescripcion.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

                // Riesgo Crítico si faltan 6 meses (180 días) o menos para prescribir
                if (diasParaPrescribir <= 180) {
                    criticos++;
                }
            } else {
                // Fallback a fecha de vencimiento obligación si no hay ejecutoria
                const fechaVencimiento = proceso.obligacion?.fechaVencimiento
                    ? new Date(proceso.obligacion.fechaVencimiento)
                    : null;
                if (fechaVencimiento && proceso.estado !== 'LIQUIDACION') {
                    const diasParaVencer = Math.floor((fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                    if (diasParaVencer <= 30) {
                        criticos++;
                    }
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

    // ============ LÓGICA DE INTERESES Y LIQUIDACIÓN ============

    async calcularLiquidacionCredito(procesoId: string): Promise<any> {
        const proceso = await this.findOne(procesoId);
        const capitalInicial = Number(proceso.obligacion.valor);
        const costas = Number(proceso.valorCostas || 0);

        let totalInteresMoratorio = 0;
        let detallesMensuales: any[] = [];

        // Solo calcular intereses si hay fecha de ejecutoria
        if (proceso.fechaEjecutoria) {
            const fechaInicio = new Date(proceso.fechaEjecutoria);
            const hoy = new Date();
            const tipoInteres = proceso.tipoInteresAplicable || 'DIAN';

            // Buscar todas las tasas de referencia que apliquen (desde el año de ejecutoria hasta hoy)
            const tasas = await this.tasaRepository.find({
                where: { tipoTasa: tipoInteres as any },
                order: { anio: 'ASC', mes: 'ASC' }
            });

            // Iterar mes a mes desde fechaInicio hasta hoy
            let fechaActual = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), 1);

            while (fechaActual <= hoy) {
                const mesActual = fechaActual.getMonth() + 1;
                const anioActual = fechaActual.getFullYear();

                // Encontrar la tasa para este mes/año específico
                const tasaMes = tasas.find(t => t.anio === anioActual && t.mes === mesActual);

                if (tasaMes) {
                    // Cálculo simple: (Capital * (Tasa Anual / 12) / 100)
                    const interesMensual = capitalInicial * ((tasaMes.valorTasa / 12) / 100);
                    totalInteresMoratorio += interesMensual;

                    detallesMensuales.push({
                        anio: anioActual,
                        mes: mesActual,
                        tasaAplicada: tasaMes.valorTasa,
                        interesGenerado: interesMensual
                    });
                }

                // Avanzar al siguiente mes
                fechaActual.setMonth(fechaActual.getMonth() + 1);
            }
        }

        // Determinar cuánto se ha abonado a cada rubro analizando los pagos históricos
        const pagos = await this.pagoRepository.find({ where: { proceso: { id: procesoId } } });
        let totalAbonoCapital = 0;
        let totalAbonoIntereses = 0;
        let totalAbonoCostas = 0;

        pagos.forEach(pago => {
            totalAbonoCapital += Number(pago.abonoCapital || 0);
            totalAbonoIntereses += Number(pago.abonoIntereses || 0);
            totalAbonoCostas += Number(pago.abonoCostas || 0);
        });

        const saldoCapital = capitalInicial - totalAbonoCapital;
        const saldoIntereses = totalInteresMoratorio - totalAbonoIntereses;
        const saldoCostas = costas - totalAbonoCostas;

        return {
            capitalOriginal: capitalInicial,
            totalInteresMoratorio: Number(totalInteresMoratorio.toFixed(2)),
            costasOriginales: costas,
            pagosAcumulados: {
                capital: totalAbonoCapital,
                intereses: totalAbonoIntereses,
                costas: totalAbonoCostas,
                total: totalAbonoCapital + totalAbonoIntereses + totalAbonoCostas
            },
            saldosPendientes: {
                capital: Number(Math.max(0, saldoCapital).toFixed(2)),
                intereses: Number(Math.max(0, saldoIntereses).toFixed(2)),
                costas: Number(Math.max(0, saldoCostas).toFixed(2)),
                total: Number((Math.max(0, saldoCapital) + Math.max(0, saldoIntereses) + Math.max(0, saldoCostas)).toFixed(2))
            },
            detallesMensuales
        };
    }

    // ============ GESTIÓN DE PAGOS Y AUDITORÍA ============

    async registrarPago(procesoId: string, dto: CreatePagoCoactivoDto): Promise<PagoCoactivo> {
        const liquidacion = await this.calcularLiquidacionCredito(procesoId);
        const proceso = await this.findOne(procesoId);

        let saldoDisponible = Number(dto.valor);
        let abonoCostas = 0;
        let abonoIntereses = 0;
        let abonoCapital = 0;

        // 1. Abonar a Costas Procesales primero
        if (liquidacion.saldosPendientes.costas > 0) {
            abonoCostas = Math.min(saldoDisponible, liquidacion.saldosPendientes.costas);
            saldoDisponible -= abonoCostas;
        }

        // 2. Abonar a Intereses Moratorios segundo
        if (saldoDisponible > 0 && liquidacion.saldosPendientes.intereses > 0) {
            abonoIntereses = Math.min(saldoDisponible, liquidacion.saldosPendientes.intereses);
            saldoDisponible -= abonoIntereses;
        }

        // 3. Abonar a Capital al final
        if (saldoDisponible > 0) {
            abonoCapital = Math.min(saldoDisponible, liquidacion.saldosPendientes.capital);
            // Si por alguna razón paga de más, el excedente queda en saldoDisponible, se podría manejar como saldo a favor
        }

        // Crear registro de pago discriminado
        const pago = this.pagoRepository.create({
            proceso,
            valor: dto.valor,
            fechaPago: dto.fechaPago,
            origen: dto.origen,
            observaciones: dto.observaciones,
            soporteUrl: dto.soporteUrl,
            abonoCostas,
            abonoIntereses,
            abonoCapital
        });
        const savedPago = await this.pagoRepository.save(pago);

        // Actualizar acumulados en proceso globalmente para retrocompatibilidad
        const totalPagado = Number(proceso.valorPagado || 0) + Number(dto.valor);
        const nuevoSaldo = liquidacion.saldosPendientes.total - Number(dto.valor);

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

        // Eliminar el adjunto/soporte asociado al pago (si existe)
        if (pago.soporteUrl) {
            const adjunto = await this.adjuntoRepository.findOne({
                where: { proceso: { id: proceso.id }, nombreArchivo: pago.soporteUrl }
            });
            if (adjunto) {
                // Eliminar archivo físico del soporte
                const filePath = path.join(process.cwd(), 'uploads', adjunto.nombreArchivo);
                if (fs.existsSync(filePath)) {
                    try {
                        fs.unlinkSync(filePath);
                    } catch (err) {
                        console.error(`Error eliminando archivo soporte ${filePath}:`, err);
                    }
                }
                await this.adjuntoRepository.remove(adjunto);
            }
        }

        // Eliminar el pago
        await this.pagoRepository.delete(pagoId);

        // Recalcular contador de documentos adjuntos
        const count = await this.adjuntoRepository.count({ where: { proceso: { id: proceso.id } } });
        proceso.documentosAdjuntos = count;

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

    async addAdjunto(procesoId: string, file: Express.Multer.File, tipo: string = 'DOCUMENTO', subidoPor: string = 'Sistema'): Promise<ProcesoCoactivoAdjunto> {
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

        await this.legalNotifications.notifyDocumentoSubido({
            modulo: 'PROCESOS_COACTIVOS',
            radicado: proceso.radicado,
            procesoId: proceso.id,
            nombreDocumento: file.originalname,
            subidoPor,
        });

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
    // ============ EXPORTAR PDF ============

    async generatePdf(procesoId: string): Promise<Buffer> {
        const proceso = await this.findOne(procesoId);
        const adjuntos = await this.getAdjuntos(procesoId);
        const PDFDocument = require('pdfkit');

        return new Promise<Buffer>((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const buffers: any[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            // ── Encabezado ──────────────────────────────────────
            doc.fontSize(18).font('Helvetica-Bold')
                .text('ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP', { align: 'center' });
            doc.fontSize(14).font('Helvetica-Bold')
                .text('GESTIÓN LEGAL - COBRO COACTIVO', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(16).font('Helvetica-Bold')
                .text('FICHA TÉCNICA DEL PROCESO COACTIVO', { align: 'center' });
            doc.moveDown(0.5);

            // Línea separadora
            doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#003DA5').lineWidth(2).stroke();
            doc.moveDown(0.5);

            // ── Información del proceso ──────────────────────────
            doc.fontSize(12).font('Helvetica-Bold').text('DATOS DEL PROCESO');
            doc.moveDown(0.3);
            doc.fontSize(10).font('Helvetica');
            doc.text(`Radicado:`, { continued: true }).font('Helvetica-Bold').text(`  ${proceso.radicado}`);
            doc.font('Helvetica').text(`Fecha de Creación:`, { continued: true }).font('Helvetica-Bold')
                .text(`  ${new Date(proceso.fechaCreacion).toLocaleDateString('es-CO')}`);
            doc.font('Helvetica').text(`Estado Actual:`, { continued: true }).font('Helvetica-Bold')
                .text(`  ${proceso.estado}`);
            doc.font('Helvetica').text(`Responsable:`, { continued: true }).font('Helvetica-Bold')
                .text(`  ${proceso.responsable || 'Sin asignar'}`);
            doc.moveDown(0.8);

            // ── Información del deudor ───────────────────────────
            doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#CCCCCC').lineWidth(0.5).stroke();
            doc.moveDown(0.3);
            doc.fontSize(12).font('Helvetica-Bold').text('INFORMACIÓN DEL DEUDOR');
            doc.moveDown(0.3);
            doc.fontSize(10).font('Helvetica');
            doc.text(`Nombre / Razón Social:`, { continued: true }).font('Helvetica-Bold').text(`  ${proceso.deudor.nombre}`);
            doc.font('Helvetica').text(`Identificación:`, { continued: true }).font('Helvetica-Bold')
                .text(`  ${proceso.deudor.identificacion}`);
            doc.font('Helvetica').text(`Correo Electrónico:`, { continued: true }).font('Helvetica-Bold')
                .text(`  ${proceso.deudor.email || 'N/A'}`);
            doc.font('Helvetica').text(`Teléfono:`, { continued: true }).font('Helvetica-Bold')
                .text(`  ${proceso.deudor.telefono || 'N/A'}`);
            doc.font('Helvetica').text(`Dirección:`, { continued: true }).font('Helvetica-Bold')
                .text(`  ${proceso.deudor.direccion || 'N/A'}`);
            doc.moveDown(0.8);

            // ── Información de la obligación ─────────────────────
            doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#CCCCCC').lineWidth(0.5).stroke();
            doc.moveDown(0.3);
            doc.fontSize(12).font('Helvetica-Bold').text('INFORMACIÓN DE LA OBLIGACIÓN');
            doc.moveDown(0.3);
            doc.fontSize(10).font('Helvetica');
            doc.text(`Concepto:`, { continued: true }).font('Helvetica-Bold').text(`  ${proceso.obligacion.concepto}`);
            doc.font('Helvetica').text(`Valor Capital:`, { continued: true }).font('Helvetica-Bold')
                .text(`  $${Number(proceso.obligacion.valor).toLocaleString('es-CO')}`);
            doc.font('Helvetica').text(`Fecha de Vencimiento:`, { continued: true }).font('Helvetica-Bold')
                .text(`  ${new Date(proceso.obligacion.fechaVencimiento).toLocaleDateString('es-CO')}`);
            doc.moveDown(0.8);

            // ── Observaciones ────────────────────────────────────
            if (proceso.observaciones) {
                doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#CCCCCC').lineWidth(0.5).stroke();
                doc.moveDown(0.3);
                doc.fontSize(12).font('Helvetica-Bold').text('OBSERVACIONES');
                doc.moveDown(0.3);
                doc.fontSize(10).font('Helvetica').text(proceso.observaciones, { align: 'justify' });
                doc.moveDown(0.8);
            }

            // ── Documentos adjuntos ──────────────────────────────
            doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#CCCCCC').lineWidth(0.5).stroke();
            doc.moveDown(0.3);
            doc.fontSize(12).font('Helvetica-Bold').text('DOCUMENTOS ADJUNTOS');
            doc.moveDown(0.3);
            if (adjuntos.length === 0) {
                doc.fontSize(10).font('Helvetica').text('No hay documentos adjuntos registrados.');
            } else {
                adjuntos.forEach((adj: any, index: number) => {
                    doc.fontSize(10).font('Helvetica')
                        .text(`${index + 1}. ${adj.nombreOriginal}  (${(adj.tamano / 1024).toFixed(1)} KB)`);
                });
            }
            doc.moveDown(1);

            // ── Pie de página ────────────────────────────────────
            doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#003DA5').lineWidth(1).stroke();
            doc.moveDown(0.4);
            doc.fontSize(8).font('Helvetica').fillColor('#666666')
                .text(
                    `Documento generado el ${new Date().toLocaleString('es-CO')} — Sistema de Gestión Legal ESAP`,
                    { align: 'center' }
                );

            doc.end();
        });
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
