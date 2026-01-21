/**
 * AlertasVencimientoService - Servicio para alertas automáticas de vencimiento
 * Ejecuta verificación diaria de consultas próximas a vencer o vencidas
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { ConsultaJuridica } from '../entities/consulta-juridica.entity';
import { ConsultaJuridicaHistorial } from '../entities/consulta-juridica-historial.entity';

@Injectable()
export class AlertasVencimientoService {
    private readonly logger = new Logger(AlertasVencimientoService.name);

    constructor(
        @InjectRepository(ConsultaJuridica)
        private readonly consultaRepository: Repository<ConsultaJuridica>,
        @InjectRepository(ConsultaJuridicaHistorial)
        private readonly historialRepository: Repository<ConsultaJuridicaHistorial>
    ) { }

    /**
     * Ejecuta verificación diaria a las 7:00 AM Colombia (UTC-5)
     * CronExpression.EVERY_DAY_AT_7AM = '0 7 * * *'
     */
    @Cron('0 7 * * *', {
        name: 'verificar-vencimientos-consultas',
        timeZone: 'America/Bogota'
    })
    async verificarVencimientos(): Promise<void> {
        this.logger.log('[ALERTAS] Iniciando verificación de vencimientos de consultas jurídicas...');

        const hoy = new Date();
        const enTresDias = new Date();
        enTresDias.setDate(hoy.getDate() + 3);

        try {
            // 1. Marcar como VENCIDAS las consultas que pasaron fecha máxima
            await this.marcarVencidas(hoy);

            // 2. Actualizar prioridad a ALTA para consultas próximas a vencer (≤3 días)
            await this.actualizarPrioridadUrgente(hoy, enTresDias);

            this.logger.log('[ALERTAS] Verificación de vencimientos completada.');
        } catch (error) {
            this.logger.error('[ALERTAS] Error en verificación de vencimientos:', error);
        }
    }

    /**
     * Marca consultas como vencidas si pasaron la fecha máxima de respuesta
     * Solo afecta consultas que están en estados activos (no respondidas ni cerradas)
     */
    private async marcarVencidas(fechaActual: Date): Promise<void> {
        const estadosActivos = ['en_radicacion', 'asignado', 'en_analisis', 'en_revision'];

        const consultasVencidas = await this.consultaRepository.find({
            where: {
                estado: In(estadosActivos),
                fechaMaximaRespuesta: LessThan(fechaActual)
            }
        });

        this.logger.log(`[ALERTAS] Encontradas ${consultasVencidas.length} consultas vencidas`);

        for (const consulta of consultasVencidas) {
            const estadoAnterior = consulta.estado;
            consulta.estado = 'vencido';

            await this.consultaRepository.save(consulta);

            // Registrar en historial
            await this.registrarEvento(
                consulta.id,
                'VENCIMIENTO',
                `Consulta marcada como vencida automáticamente`,
                `Estado anterior: ${estadoAnterior}, Fecha máxima: ${consulta.fechaMaximaRespuesta?.toISOString()}`,
                'Sistema (Cron)'
            );

            this.logger.warn(`[ALERTAS] Consulta ${consulta.numeroRadicado} marcada como VENCIDA`);
        }
    }

    /**
     * Actualiza prioridad a ALTA para consultas que vencen en 3 días o menos
     */
    private async actualizarPrioridadUrgente(fechaActual: Date, fechaLimite: Date): Promise<void> {
        const estadosActivos = ['en_radicacion', 'asignado', 'en_analisis', 'en_revision'];

        // Consultas que vencen pronto pero aún no están vencidas
        const consultasProximasVencer = await this.consultaRepository
            .createQueryBuilder('c')
            .where('c.estado IN (:...estados)', { estados: estadosActivos })
            .andWhere('c.fechaMaximaRespuesta >= :hoy', { hoy: fechaActual })
            .andWhere('c.fechaMaximaRespuesta <= :limite', { limite: fechaLimite })
            .andWhere('c.prioridad != :prioridadAlta', { prioridadAlta: 'alta' })
            .getMany();

        this.logger.log(`[ALERTAS] Encontradas ${consultasProximasVencer.length} consultas próximas a vencer`);

        for (const consulta of consultasProximasVencer) {
            const prioridadAnterior = consulta.prioridad;
            consulta.prioridad = 'alta';

            await this.consultaRepository.save(consulta);

            // Registrar alerta en historial
            await this.registrarEvento(
                consulta.id,
                'ALERTA_VENCIMIENTO',
                `Prioridad actualizada a ALTA por proximidad de vencimiento`,
                `Prioridad anterior: ${prioridadAnterior}, Días restantes: ${this.calcularDiasRestantes(consulta.fechaMaximaRespuesta)}`,
                'Sistema (Cron)'
            );

            this.logger.warn(`[ALERTAS] Consulta ${consulta.numeroRadicado} marcada como URGENTE`);
        }
    }

    private calcularDiasRestantes(fechaMaxima: Date | null): number {
        if (!fechaMaxima) return 0;
        const hoy = new Date();
        const diff = fechaMaxima.getTime() - hoy.getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    private async registrarEvento(
        consultaId: string,
        tipo: string,
        descripcion: string,
        detalle: string,
        usuario: string
    ): Promise<void> {
        const evento = this.historialRepository.create({
            consultaId,
            tipoEvento: tipo,
            descripcion,
            detalle,
            usuario,
            fecha: new Date()
        });
        await this.historialRepository.save(evento);
    }

    /**
     * Método manual para ejecutar verificación (útil para testing)
     */
    async ejecutarVerificacionManual(): Promise<{ vencidas: number; urgentes: number }> {
        this.logger.log('[ALERTAS] Ejecutando verificación manual...');

        const hoy = new Date();
        const enTresDias = new Date();
        enTresDias.setDate(hoy.getDate() + 3);

        const estadosActivos = ['en_radicacion', 'asignado', 'en_analisis', 'en_revision'];

        const vencidas = await this.consultaRepository.count({
            where: {
                estado: In(estadosActivos),
                fechaMaximaRespuesta: LessThan(hoy)
            }
        });

        const urgentes = await this.consultaRepository
            .createQueryBuilder('c')
            .where('c.estado IN (:...estados)', { estados: estadosActivos })
            .andWhere('c.fechaMaximaRespuesta >= :hoy', { hoy })
            .andWhere('c.fechaMaximaRespuesta <= :limite', { limite: enTresDias })
            .getCount();

        await this.verificarVencimientos();

        return { vencidas, urgentes };
    }
}
