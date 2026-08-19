/**
 * PROGRAMACIÓN DE VENCIMIENTOS RECURRENTES
 *
 * Permite definir, para un término/informe, una periodicidad (mensual, trimestral,
 * semestral, anual o personalizada) con un plazo en días (calendario o hábiles) y
 * genera los vencimientos correspondientes a cada período/mes del año.
 */

import { esDiaHabil } from './diasHabiles';

export type Periodicidad = 'MENSUAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL' | 'PERSONALIZADA';
export type TipoDiasPlazo = 'CALENDARIO' | 'HABILES';

export interface ProgramacionVencimientos {
    periodicidad: Periodicidad;
    plazoDesde: number;
    plazoHasta: number;
    tipoDias: TipoDiasPlazo;
    mesesActivos: number[]; // 1 (Ene) .. 12 (Dic)
}

export interface OcurrenciaVencimiento {
    mes: number; // 1..12
    anio: number;
    fechaInicio: Date;
    fechaVencimiento: Date;
    esPasado: boolean;
    esProximo: boolean;
}

export const NOMBRES_MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const NOMBRES_MESES_CORTOS = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export const PERIODICIDADES: { value: Periodicidad; label: string }[] = [
    { value: 'MENSUAL', label: 'Mensual' },
    { value: 'TRIMESTRAL', label: 'Trimestral' },
    { value: 'SEMESTRAL', label: 'Semestral' },
    { value: 'ANUAL', label: 'Anual' },
    { value: 'PERSONALIZADA', label: 'Personalizada' },
];

/** Meses activos por defecto según la periodicidad seleccionada */
export function mesesPorDefecto(periodicidad: Periodicidad, mesActual: number = new Date().getMonth() + 1): number[] {
    switch (periodicidad) {
        case 'MENSUAL':
            return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        case 'TRIMESTRAL':
            return [3, 6, 9, 12];
        case 'SEMESTRAL':
            return [6, 12];
        case 'ANUAL':
            return [mesActual];
        case 'PERSONALIZADA':
        default:
            return [];
    }
}

function diasEnMes(anio: number, mes: number): number {
    return new Date(anio, mes, 0).getDate();
}

/**
 * Calcula la fecha correspondiente al N-ésimo día (calendario o hábil) de un mes.
 * Si N excede los días disponibles del mes, se ajusta al último día válido.
 */
export function fechaPorNumeroDiaDelMes(anio: number, mes: number, numeroDia: number, tipoDias: TipoDiasPlazo): Date {
    const totalDias = diasEnMes(anio, mes);

    if (tipoDias === 'CALENDARIO') {
        const dia = Math.min(Math.max(numeroDia, 1), totalDias);
        return new Date(anio, mes - 1, dia);
    }

    let contadorHabiles = 0;
    let ultimaFechaHabil = new Date(anio, mes - 1, totalDias);
    for (let dia = 1; dia <= totalDias; dia++) {
        const fecha = new Date(anio, mes - 1, dia);
        if (esDiaHabil(fecha)) {
            contadorHabiles++;
            ultimaFechaHabil = fecha;
            if (contadorHabiles === numeroDia) return fecha;
        }
    }
    return ultimaFechaHabil;
}

function generarOcurrenciasParaAnio(config: ProgramacionVencimientos, anio: number, hoy: Date): OcurrenciaVencimiento[] {
    const meses = Array.from(new Set(config.mesesActivos)).sort((a, b) => a - b);

    const ocurrencias: OcurrenciaVencimiento[] = meses.map((mes) => {
        const fechaInicio = fechaPorNumeroDiaDelMes(anio, mes, config.plazoDesde, config.tipoDias);
        const fechaVencimiento = fechaPorNumeroDiaDelMes(anio, mes, config.plazoHasta, config.tipoDias);
        return {
            mes,
            anio,
            fechaInicio,
            fechaVencimiento,
            esPasado: fechaVencimiento < hoy,
            esProximo: false,
        };
    });

    const proximo = ocurrencias.find((o) => !o.esPasado);
    if (proximo) proximo.esProximo = true;

    return ocurrencias;
}

/**
 * Genera los vencimientos (uno por mes activo) para el año indicado,
 * marcando cuáles ya pasaron y cuál es el próximo a vencer.
 *
 * Si TODAS las ocurrencias del año de referencia ya vencieron (por ejemplo,
 * una periodicidad Anual/Semestral cuyo(s) mes(es) configurado(s) ya pasaron
 * este año), se generan en su lugar las ocurrencias del año siguiente, de modo
 * que siempre haya al menos un vencimiento futuro disponible para crear.
 */
export function generarOcurrencias(config: ProgramacionVencimientos, anio: number = new Date().getFullYear()): OcurrenciaVencimiento[] {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (config.mesesActivos.length === 0) return [];

    const ocurrenciasAnioActual = generarOcurrenciasParaAnio(config, anio, hoy);
    if (ocurrenciasAnioActual.some((o) => !o.esPasado)) {
        return ocurrenciasAnioActual;
    }

    return generarOcurrenciasParaAnio(config, anio + 1, hoy);
}

/** Sólo las ocurrencias que aún no han vencido (las únicas que tiene sentido crear) */
export function ocurrenciasFuturas(ocurrencias: OcurrenciaVencimiento[]): OcurrenciaVencimiento[] {
    return ocurrencias.filter((o) => !o.esPasado);
}

export function etiquetaPlazo(config: ProgramacionVencimientos): string {
    const tipo = config.tipoDias === 'HABILES' ? 'hábiles' : 'calendario';
    return `días ${String(config.plazoDesde).padStart(2, '0')}-${String(config.plazoHasta).padStart(2, '0')} ${tipo}`;
}

export function resumenProgramacion(config: ProgramacionVencimientos): string {
    const label = PERIODICIDADES.find((p) => p.value === config.periodicidad)?.label || config.periodicidad;
    const n = config.mesesActivos.length;
    return `${label} · ${n} vencimiento${n === 1 ? '' : 's'}/año · ${etiquetaPlazo(config)}`;
}
