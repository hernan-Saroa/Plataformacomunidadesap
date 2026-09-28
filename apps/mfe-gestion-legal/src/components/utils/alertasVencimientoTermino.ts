/**
 * PREVISUALIZACIÓN DE LAS ALERTAS QUE DISPARARÁ UNA EDICIÓN DE VENCIMIENTO
 *
 * Al editar un informe y mover su fecha de vencimiento, el backend NO espera a la corrida
 * horaria del cron: `TerminosController.update()` detecta el cambio, borra los envíos previos
 * (rearme) y `AlertasVencimientoTerminosService.verificarTerminoInmediato()` contrasta el
 * plazo nuevo contra las reglas globales de `terminos_reglas_alerta` (p. ej. la de 3 días =
 * 72 horas de anticipación) y contra la anticipación personalizada del término.
 *
 * Este módulo reproduce ESA MISMA decisión en el formulario para poder avisarle al usuario,
 * antes de guardar, qué alertas va a provocar el cambio. Es una previsualización: la fuente
 * de verdad sigue siendo el backend, y por eso la lógica se mantiene alineada con
 * `alertas-vencimiento-terminos.service.ts -> evaluarTermino()`:
 *
 *   - Si el término tiene anticipación personalizada, las reglas globales se IGNORAN por
 *     completo y solo cuenta ese umbral propio.
 *   - Si no la tiene, se evalúa cada regla global activa: dispara la que cumpla
 *     `horasRestantes <= horasAnticipacion`.
 *   - Un vencimiento ya pasado (`horasRestantes <= 0`) además dispara el aviso de vencido.
 */

import { parseYMD } from './plazoTermino';

export interface ReglaAlertaGlobal {
    id: string;
    horasAnticipacion: number;
    activa?: boolean;
    descripcion?: string | null;
}

export interface PrevisualizacionAlertas {
    /** Horas que faltarán para el vencimiento, contadas desde `ahora`. Negativo = ya vencido. */
    horasRestantes: number;
    /** Qué gobierna el aviso: el umbral propio del término o las reglas globales. */
    modo: 'personalizada' | 'globales';
    /** true si al guardar se enviará al menos una alerta de anticipación. */
    disparaAlerta: boolean;
    /** true si el vencimiento elegido ya pasó (además se envía el aviso de "ya venció"). */
    yaVencido: boolean;
    /** Reglas globales que quedan cruzadas con el vencimiento nuevo (vacío en modo personalizada). */
    reglasQueDisparan: ReglaAlertaGlobal[];
    /** Umbral propio del término, en horas, cuando `modo === 'personalizada'`. */
    horasAnticipacionPersonalizada: number | null;
}

const MS_POR_HORA = 60 * 60 * 1000;

/**
 * El vencimiento se guarda anclado al FINAL del día de Bogotá (ver `parseFechaBogota` en
 * `terminos.controller.ts`): se tiene plazo hasta que termina esa fecha. La previsualización
 * usa el mismo instante para que las horas restantes coincidan con las que calculará el
 * backend, y no se avise de una alerta que en realidad no se va a disparar (o viceversa).
 */
export function instanteVencimientoBogota(fechaVencimientoYMD: string): Date | null {
    if (!parseYMD(fechaVencimientoYMD)) return null;
    const instante = new Date(`${fechaVencimientoYMD.trim()}T23:59:59.999-05:00`);
    return Number.isNaN(instante.getTime()) ? null : instante;
}

export function previsualizarAlertas(params: {
    fechaVencimientoYMD: string;
    reglasGlobales: ReglaAlertaGlobal[];
    horasAnticipacionPersonalizada?: number | null;
    ahora?: Date;
}): PrevisualizacionAlertas | null {
    const vencimiento = instanteVencimientoBogota(params.fechaVencimientoYMD);
    if (!vencimiento) return null;

    const ahora = params.ahora ?? new Date();
    const horasRestantes = (vencimiento.getTime() - ahora.getTime()) / MS_POR_HORA;
    const yaVencido = horasRestantes <= 0;
    const personalizada = params.horasAnticipacionPersonalizada ?? null;

    if (personalizada != null) {
        return {
            horasRestantes,
            modo: 'personalizada',
            disparaAlerta: horasRestantes <= personalizada,
            yaVencido,
            reglasQueDisparan: [],
            horasAnticipacionPersonalizada: personalizada,
        };
    }

    const reglasQueDisparan = (params.reglasGlobales || [])
        .filter((r) => r.activa !== false)
        .filter((r) => Number.isFinite(r.horasAnticipacion) && horasRestantes <= r.horasAnticipacion)
        .sort((a, b) => a.horasAnticipacion - b.horasAnticipacion);

    return {
        horasRestantes,
        modo: 'globales',
        disparaAlerta: reglasQueDisparan.length > 0,
        yaVencido,
        reglasQueDisparan,
        horasAnticipacionPersonalizada: null,
    };
}

/** "72" -> "3 día(s)"; "5" -> "5 hora(s)". Mismo formato que usa el resto del módulo. */
export function etiquetaAnticipacion(horas: number): string {
    return horas % 24 === 0 ? `${horas / 24} día(s)` : `${horas} hora(s)`;
}
