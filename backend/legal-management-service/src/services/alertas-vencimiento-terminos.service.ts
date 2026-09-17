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

// Cada cuántas horas se repite el recordatorio de un término que ya entró en ventana de
// alerta o que ya venció. Coincide con la periodicidad del cron, así que en la práctica
// es "un recordatorio por corrida"; se deja explícito para poder espaciarlo sin tocar el cron.
const HORAS_ENTRE_RECORDATORIOS = 2;

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

    // Corre cada 2 horas (no una vez al día): la UI permite configurar anticipaciones y
    // recordatorios en HORAS, así que una corrida diaria a las 7am dejaba pasar de largo
    // cualquier umbral fino (p. ej. "3 horas antes") sin que se llegara a evaluar a tiempo.
    // La periodicidad manda también sobre los recordatorios recurrentes, que no pueden
    // repetirse más seguido que las corridas del cron.
    @Cron('0 */2 * * *', {
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
            const parcial = await this.evaluarTermino(termino, reglasActivas, ahora);
            alertasEnviadas += parcial.alertasEnviadas;
            recordatoriosEnviados += parcial.recordatoriosEnviados;
        }

        return { alertasEnviadas, recordatoriosEnviados };
    }

    /**
     * Evalúa un único término contra las reglas vigentes y notifica si ya cruzó algún umbral.
     * Se invoca al crear o editar un término para no obligar a esperar hasta la próxima corrida
     * del cron: un término creado con vencimiento dentro del umbral avisa de inmediato.
     */
    async verificarTerminoInmediato(
        terminoId: string,
        opciones: { rearmar?: 'personalizada' | 'todas' } = {},
    ): Promise<{ alertasEnviadas: number; recordatoriosEnviados: number }> {
        const termino = await this.terminoRepository.findOne({ where: { id: terminoId } });
        if (!termino || ESTADOS_EXCLUIDOS.includes(termino.estado)) {
            return { alertasEnviadas: 0, recordatoriosEnviados: 0 };
        }

        // Cambió algo que define CUÁNDO debe avisar este término, así que los envíos previos
        // ya no corresponden: se borran para que el umbral nuevo se contraste de una contra la
        // fecha de vencimiento. Sin esto, un término que ya había alertado quedaba mudo para
        // siempre y el cambio no producía ningún aviso.
        //   'personalizada' → cambió la anticipación propia del término.
        //   'todas'         → cambió la fecha de vencimiento: es un plazo nuevo, y tanto la
        //                     anticipación propia como las reglas globales deben reevaluarse.
        if (opciones.rearmar) {
            await this.alertaEnviadaRepository.delete(
                opciones.rearmar === 'todas' ? { terminoId } : { terminoId, reglaId: IsNull() },
            );
            // Un plazo nuevo estrena también el aviso de vencimiento y el ciclo de
            // recordatorios: si no se limpiaran, un término aplazado nunca volvería a avisar
            // que venció, porque ya tendría la marca del vencimiento anterior.
            if (opciones.rearmar === 'todas') {
                await this.terminoRepository.update(terminoId, {
                    alertaVencimientoEnviadaEn: null,
                    ultimoRecordatorioRecurrenteEn: null,
                });
                termino.alertaVencimientoEnviadaEn = null;
                termino.ultimoRecordatorioRecurrenteEn = null;
            }
        }

        const reglasActivas = await this.reglaRepository.find({ where: { activa: true } });
        return this.evaluarTermino(termino, reglasActivas, new Date());
    }

    /**
     * Reevalúa todos los términos pendientes después de crear o modificar una regla global,
     * sin esperar a la corrida horaria del cron.
     *
     * Si se pasa `reglaIdModificada`, primero se borran sus envíos previos: la regla cambió de
     * umbral, así que el aviso que se mandó con el umbral viejo no debe bloquear el nuevo.
     * Al crear una regla no hace falta, porque todavía no tiene ningún envío registrado.
     */
    async reevaluarPorCambioDeRegla(reglaIdModificada?: string): Promise<{ alertasEnviadas: number; recordatoriosEnviados: number }> {
        if (reglaIdModificada) {
            await this.alertaEnviadaRepository.delete({ reglaId: reglaIdModificada });
        }
        return this.ejecutarVerificacionManual();
    }

    private async evaluarTermino(
        termino: TerminoProcesal,
        reglasActivas: ReglaAlertaTermino[],
        ahora: Date,
    ): Promise<{ alertasEnviadas: number; recordatoriosEnviados: number }> {
        let alertasEnviadas = 0;
        let recordatoriosEnviados = 0;

        if (!termino.fechaVencimiento) return { alertasEnviadas, recordatoriosEnviados };
        const horasRestantes = (new Date(termino.fechaVencimiento).getTime() - ahora.getTime()) / (1000 * 60 * 60);

        // Umbral máximo que abre la "ventana de alerta" del término: a partir de ahí se
        // empiezan a mandar los recordatorios periódicos.
        let umbralMayor: number | null = null;

        if (termino.horasAnticipacionAlertaPersonalizada != null) {
            const enviada = await this.intentarEnviarAlerta(
                termino,
                termino.horasAnticipacionAlertaPersonalizada,
                horasRestantes,
                null,
                'personalizada',
            );
            if (enviada) alertasEnviadas++;
            // La anticipación personalizada NO abre ventana de recordatorios: si el usuario
            // pidió expresamente "avísame 3 horas antes", eso es UN aviso en ese momento, no
            // una repetición cada par de horas. Por eso umbralMayor se queda en null.
        } else {
            for (const regla of reglasActivas) {
                const enviada = await this.intentarEnviarAlerta(termino, regla.horasAnticipacion, horasRestantes, regla.id, 'automatica');
                if (enviada) alertasEnviadas++;
                umbralMayor = Math.max(umbralMayor ?? 0, regla.horasAnticipacion);
            }
        }

        // Aviso puntual de vencimiento (envío único): antes no existía, el responsable se
        // quedaba con el último aviso de anticipación y nunca se le decía que ya venció.
        if (horasRestantes <= 0 && termino.alertaVencimientoEnviadaEn == null) {
            const enviado = await this.legalNotifications.notifyTerminoProximoAVencer({
                terminoId: termino.id,
                responsableId: termino.responsableId,
                nombreActuacion: termino.nombreActuacion,
                numeroRadicado: termino.numeroRadicado,
                horasRestantes,
                origen: 'vencido',
            });
            if (enviado) {
                await this.terminoRepository.update(termino.id, { alertaVencimientoEnviadaEn: ahora });
                termino.alertaVencimientoEnviadaEn = ahora;
                await this.terminosService.addNota(termino.id, 'Aviso de vencimiento enviado', 'Sistema');
                alertasEnviadas++;
            }
        }

        // Recordatorio periódico mientras el término siga sin cumplirse: aplica dentro de la
        // ventana de alerta de las reglas globales y, en cualquier caso, una vez vencido.
        const enVentanaDeAlerta = umbralMayor != null && horasRestantes <= umbralMayor;
        if ((enVentanaDeAlerta || horasRestantes <= 0) && this.tocaRecordatorio(termino, ahora)) {
            const enviado = await this.legalNotifications.notifyTerminoProximoAVencer({
                terminoId: termino.id,
                responsableId: termino.responsableId,
                nombreActuacion: termino.nombreActuacion,
                numeroRadicado: termino.numeroRadicado,
                horasRestantes,
                origen: 'recordatorio',
            });
            // Solo se mueve la marca de tiempo si se despachó; si falló, se reintenta en la
            // siguiente corrida en vez de esperar otras 2 horas.
            if (enviado) {
                await this.terminoRepository.update(termino.id, { ultimoRecordatorioRecurrenteEn: ahora });
                termino.ultimoRecordatorioRecurrenteEn = ahora;
                recordatoriosEnviados++;
            }
        }

        if (
            termino.recordatorioManualHorasAnticipacion != null &&
            horasRestantes <= termino.recordatorioManualHorasAnticipacion
        ) {
            const enviado = await this.legalNotifications.notifyTerminoProximoAVencer({
                terminoId: termino.id,
                responsableId: termino.responsableId,
                nombreActuacion: termino.nombreActuacion,
                numeroRadicado: termino.numeroRadicado,
                horasRestantes,
                origen: 'manual',
            });
            // Solo se limpia el recordatorio (envío único) si realmente se pudo notificar;
            // si falló, se reintenta en la próxima corrida del cron en vez de perderse.
            if (enviado) {
                await this.terminosService.addNota(
                    termino.id,
                    `Recordatorio manual enviado (${termino.recordatorioManualHorasAnticipacion}h de anticipación)`,
                    'Sistema',
                );
                await this.terminoRepository.update(termino.id, { recordatorioManualHorasAnticipacion: null });
                recordatoriosEnviados++;
            }
        }

        return { alertasEnviadas, recordatoriosEnviados };
    }

    /**
     * ¿Ya pasaron HORAS_ENTRE_RECORDATORIOS desde el último recordatorio periódico?
     * Un término que nunca ha recibido uno entra de una.
     */
    private tocaRecordatorio(termino: TerminoProcesal, ahora: Date): boolean {
        if (!termino.ultimoRecordatorioRecurrenteEn) return true;
        const horasDesdeElUltimo =
            (ahora.getTime() - new Date(termino.ultimoRecordatorioRecurrenteEn).getTime()) / (1000 * 60 * 60);
        return horasDesdeElUltimo >= HORAS_ENTRE_RECORDATORIOS;
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

        const enviada = await this.legalNotifications.notifyTerminoProximoAVencer({
            terminoId: termino.id,
            responsableId: termino.responsableId,
            nombreActuacion: termino.nombreActuacion,
            numeroRadicado: termino.numeroRadicado,
            horasRestantes,
            origen,
        });

        // Solo se marca como enviada (y se deja de reintentar) si la notificación
        // realmente se despachó; si falló, se reintenta en la próxima corrida del cron.
        if (!enviada) return false;

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
