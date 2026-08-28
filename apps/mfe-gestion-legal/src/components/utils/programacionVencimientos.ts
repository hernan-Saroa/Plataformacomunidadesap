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

// Cuántos años hacia adelante se generan cuando la duración se deja "Indefinida".
// No es posible generar vencimientos realmente infinitos (cada ocurrencia crea un
// registro), así que se usa un horizonte fijo que cubre varios años por adelantado.
export const HORIZONTE_DURACION_INDEFINIDA_ANIOS = 5;

export interface ProgramacionVencimientos {
    periodicidad: Periodicidad;
    plazoDesde: number;
    plazoHasta: number;
    tipoDias: TipoDiasPlazo;
    mesesActivos: number[]; // 1 (Ene) .. 12 (Dic)
    // Fecha (YYYY-MM-DD) desde la cual empieza a contar la periodicidad. Cualquier
    // ocurrencia anterior a esta fecha se descarta, sin importar el año en que caiga.
    fechaInicio: string;
    // Cuántos años (a partir del año de fechaInicio) se generan vencimientos.
    // null = "Indefinida" (usa HORIZONTE_DURACION_INDEFINIDA_ANIOS).
    duracionAnios: number | null;
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
 * Genera los vencimientos (uno por mes activo, por cada año cubierto) a partir de
 * `fechaInicio` y durante `duracionAnios` años (u HORIZONTE_DURACION_INDEFINIDA_ANIOS
 * si la duración es indefinida), marcando cuáles ya pasaron y cuál es el próximo a vencer.
 *
 * Cualquier ocurrencia cuya fecha de vencimiento caiga antes de `fechaInicio` se descarta,
 * de modo que la periodicidad realmente empiece a contar desde la fecha configurada (por
 * ejemplo, "bimestral empezando en 2 meses" en vez de asumir el próximo período natural).
 */
export function generarOcurrencias(config: ProgramacionVencimientos): OcurrenciaVencimiento[] {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (config.mesesActivos.length === 0 || !config.fechaInicio) return [];

    const inicio = new Date(`${config.fechaInicio}T00:00:00`);
    if (Number.isNaN(inicio.getTime())) return [];
    const anioInicio = inicio.getFullYear();
    const anios = config.duracionAnios && config.duracionAnios > 0 ? config.duracionAnios : HORIZONTE_DURACION_INDEFINIDA_ANIOS;

    let ocurrencias: OcurrenciaVencimiento[] = [];
    for (let i = 0; i < anios; i++) {
        ocurrencias = ocurrencias.concat(generarOcurrenciasParaAnio(config, anioInicio + i, hoy));
    }

    ocurrencias = ocurrencias.filter((o) => o.fechaVencimiento >= inicio);

    ocurrencias.forEach((o) => { o.esProximo = false; });
    const proximo = ocurrencias.find((o) => !o.esPasado);
    if (proximo) proximo.esProximo = true;

    return ocurrencias;
}

/** Sólo las ocurrencias que aún no han vencido (las únicas que tiene sentido crear) */
export function ocurrenciasFuturas(ocurrencias: OcurrenciaVencimiento[]): OcurrenciaVencimiento[] {
    return ocurrencias.filter((o) => !o.esPasado);
}

export function etiquetaPlazo(config: ProgramacionVencimientos): string {
    const tipo = config.tipoDias === 'HABILES' ? 'hábiles' : 'calendario';
    return `días ${String(config.plazoDesde).padStart(2, '0')}-${String(config.plazoHasta).padStart(2, '0')} ${tipo}`;
}

export function etiquetaDuracion(config: ProgramacionVencimientos): string {
    if (!config.duracionAnios) return 'indefinida';
    return `${config.duracionAnios} año${config.duracionAnios === 1 ? '' : 's'}`;
}

export function resumenProgramacion(config: ProgramacionVencimientos): string {
    const label = PERIODICIDADES.find((p) => p.value === config.periodicidad)?.label || config.periodicidad;
    const n = config.mesesActivos.length;
    const desde = config.fechaInicio ? ` · desde ${config.fechaInicio}` : '';
    return `${label} · ${n} vencimiento${n === 1 ? '' : 's'}/año · ${etiquetaPlazo(config)}${desde} · duración ${etiquetaDuracion(config)}`;
}
