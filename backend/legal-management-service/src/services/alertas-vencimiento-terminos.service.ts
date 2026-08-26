/**
 * AlertasVencimientoTerminosService - Alertas automáticas y recordatorios de
 * vencimiento para el módulo de Términos e Informes.
 *
 * A diferencia de AlertasVencimientoService (que solo actualiza estado/prioridad
 * de ConsultaJuridica sin notificar a nadie), este servicio SÍ dispara
 * notificaciones reales vía LegalNotificationsService, cubriendo 3 fuentes de
 * anticipación por término:
 *   1) Reglas globales activas (terminos_reglas_alerta) — aplican a todos los
 *      términos que no tengan anticipación personalizada.
 *   2) Anticipación personalizada del propio término (ignora las reglas globales).
 *   3) Recordatorio manual programado por el usuario (envío único, se limpia
 *      después de enviarse).
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { AlertaTerminoEnviada } from '../entities/alerta-termino-enviada.entity';
import { ReglaAlertaTermino } from '../entities/regla-alerta-termino.entity';
import { TerminoProcesal } from '../entities/termino-procesal.entity';
import { LegalNotificationsService } from './legal-notifications.service';
import { TerminosService } from './terminos.service';

const ESTADOS_EXCLUIDOS = ['CUMPLIDO', 'ELIMINADO'];

@Injectable()
export class AlertasVencimientoTerminosService {
    private readonly logger = new Logger(AlertasVencimientoTerminosService.name);

    constructor(
        @InjectRepository(TerminoProcesal)
        private readonly terminoRepository: Repository<TerminoProcesal>,
        @InjectRepository(ReglaAlertaTermino)
        private readonly reglaRepository: Repository<ReglaAlertaTermino>,
        @InjectRepository(AlertaTerminoEnviada)
        private readonly alertaEnviadaRepository: Repository<AlertaTerminoEnviada>,
        private readonly legalNotifications: LegalNotificationsService,
        private readonly terminosService: TerminosService,
    ) { }

    @Cron('0 7 * * *', {
        name: 'verificar-alertas-terminos',
        timeZone: 'America/Bogota',
    })
    async verificarAlertas(): Promise<void> {
        this.logger.log('[ALERTAS-TERMINOS] Iniciando verificación de alertas de vencimiento...');
        try {
            const resultado = await this.ejecutarVerificacionManual();
            this.logger.log(
                `[ALERTAS-TERMINOS] Verificación completada. Alertas enviadas: ${resultado.alertasEnviadas}, recordatorios enviados: ${resultado.recordatoriosEnviados}`,
            );
        } catch (error: any) {
            this.logger.error('[ALERTAS-TERMINOS] Error en verificación de alertas:', error);
        }
    }

    /**
     * Ejecuta la verificación completa de forma síncrona (útil para testing/trigger manual).
     */
    async ejecutarVerificacionManual(): Promise<{ alertasEnviadas: number; recordatoriosEnviados: number }> {
        const reglasActivas = await this.reglaRepository.find({ where: { activa: true } });
        const terminosPendientes = await this.terminoRepository.find({
            where: { estado: Not(In(ESTADOS_EXCLUIDOS)) },
        });

        let alertasEnviadas = 0;
        let recordatoriosEnviados = 0;
        const ahora = new Date();

        for (const termino of terminosPendientes) {
            if (!termino.fechaVencimiento) continue;
            const horasRestantes = (new Date(termino.fechaVencimiento).getTime() - ahora.getTime()) / (1000 * 60 * 60);

            if (termino.horasAnticipacionAlertaPersonalizada != null) {
                const enviada = await this.intentarEnviarAlerta(
                    termino,
                    termino.horasAnticipacionAlertaPersonalizada,
                    horasRestantes,
                    null,
                    'personalizada',
                );
                if (enviada) alertasEnviadas++;
            } else {
                for (const regla of reglasActivas) {
                    const enviada = await this.intentarEnviarAlerta(termino, regla.horasAnticipacion, horasRestantes, regla.id, 'automatica');
                    if (enviada) alertasEnviadas++;
                }
            }

            if (
                termino.recordatorioManualHorasAnticipacion != null &&
                horasRestantes <= termino.recordatorioManualHorasAnticipacion
            ) {
                await this.legalNotifications.notifyTerminoProximoAVencer({
                    terminoId: termino.id,
                    responsableId: termino.responsableId,
                    nombreActuacion: termino.nombreActuacion,
                    numeroRadicado: termino.numeroRadicado,
                    horasRestantes,
                    origen: 'manual',
                });
                await this.terminosService.addNota(
                    termino.id,
                    `Recordatorio manual enviado (${termino.recordatorioManualHorasAnticipacion}h de anticipación)`,
                    'Sistema',
                );
                // Envío único: se limpia con un update parcial, sin re-guardar la
                // entidad completa (evita pisar la nota recién agregada por addNota).
                await this.terminoRepository.update(termino.id, { recordatorioManualHorasAnticipacion: null });
                recordatoriosEnviados++;
            }
        }

        return { alertasEnviadas, recordatoriosEnviados };
    }

    /**
     * Envía la notificación si se cruzó el umbral y no se había enviado antes.
     * Retorna true si efectivamente se envió.
     */
    private async intentarEnviarAlerta(
        termino: TerminoProcesal,
        umbralHoras: number,
        horasRestantes: number,
        reglaId: string | null,
        origen: 'automatica' | 'personalizada',
    ): Promise<boolean> {
        if (horasRestantes > umbralHoras) return false;

        const yaEnviada = await this.alertaEnviadaRepository.findOne({
            where: { terminoId: termino.id, reglaId: reglaId === null ? IsNull() : reglaId },
        });
        if (yaEnviada) return false;

        await this.legalNotifications.notifyTerminoProximoAVencer({
            terminoId: termino.id,
            responsableId: termino.responsableId,
            nombreActuacion: termino.nombreActuacion,
            numeroRadicado: termino.numeroRadicado,
            horasRestantes,
            origen,
        });

        await this.alertaEnviadaRepository.save(
            this.alertaEnviadaRepository.create({ terminoId: termino.id, reglaId }),
        );
        await this.terminosService.addNota(
            termino.id,
            `Alerta ${origen === 'personalizada' ? 'personalizada' : 'automática'} enviada (${umbralHoras}h de anticipación)`,
            'Sistema',
        );

        return true;
    }
}
