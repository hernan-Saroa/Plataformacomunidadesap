/**
 * Reglas puras del seguimiento cuatrimestral de controles de riesgos (EFDS-2416).
 * Fechas como 'YYYY-MM-DD' para evitar corrimientos por zona horaria.
 */
import type { ResultadoSeguimientoControl } from '../entities/riesgo-control-seguimiento.entity';

export type EstadoCorte = 'PENDIENTE' | 'REGISTRADO' | 'VENCIDO';

export const CUATRIMESTRES = [
    { numero: 1, label: 'Cuatrimestre 1', mesInicio: 1, mesFin: 4 },
    { numero: 2, label: 'Cuatrimestre 2', mesInicio: 5, mesFin: 8 },
    { numero: 3, label: 'Cuatrimestre 3', mesInicio: 9, mesFin: 12 },
] as const;

export const RESULTADOS_SEGUIMIENTO: ResultadoSeguimientoControl[] = ['APLICADO', 'APLICADO_PARCIALMENTE', 'NO_APLICADO'];

export const RESULTADO_LABEL: Record<ResultadoSeguimientoControl, string> = {
    APLICADO: 'Aplicado',
    APLICADO_PARCIALMENTE: 'Aplicado parcialmente',
    NO_APLICADO: 'No aplicado',
};

export const EXTENSIONES_EVIDENCIA_PERMITIDAS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
export const MAX_MB_EVIDENCIA_POR_DEFECTO = 10;
export const CLAVE_CONFIG_EVIDENCIAS = 'riesgos.seguimiento.evidencias';

const pad = (n: number) => String(n).padStart(2, '0');

/** Fecha de hoy en Colombia ('YYYY-MM-DD'), independiente de la zona horaria del servidor. */
export function hoyColombia(ahora: Date = new Date()): string {
    return ahora.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

export function rangoCuatrimestre(vigencia: number, cuatrimestre: number): { inicio: string; fin: string } {
    const c = CUATRIMESTRES.find(x => x.numero === cuatrimestre);
    if (!c) throw new RangeError(`Cuatrimestre inválido: ${cuatrimestre}`);
    const ultimoDia = new Date(Date.UTC(vigencia, c.mesFin, 0)).getUTCDate();
    return {
        inicio: `${vigencia}-${pad(c.mesInicio)}-01`,
        fin: `${vigencia}-${pad(c.mesFin)}-${pad(ultimoDia)}`,
    };
}

export function cuatrimestreDeFecha(fecha: string): { vigencia: number; cuatrimestre: number } {
    const [anio, mes] = fecha.split('-').map(Number);
    return { vigencia: anio, cuatrimestre: Math.ceil(mes / 4) };
}

/** Abierto = hoy cae dentro del cuatrimestre. Cerrado = ya terminó. Futuro = aún no inicia. */
export function estadoApertura(vigencia: number, cuatrimestre: number, hoy: string): 'FUTURO' | 'ABIERTO' | 'CERRADO' {
    const { inicio, fin } = rangoCuatrimestre(vigencia, cuatrimestre);
    if (hoy < inicio) return 'FUTURO';
    if (hoy > fin) return 'CERRADO';
    return 'ABIERTO';
}

export function estadoCorte(vigencia: number, cuatrimestre: number, hoy: string, registrado: boolean): EstadoCorte {
    if (registrado) return 'REGISTRADO';
    return estadoApertura(vigencia, cuatrimestre, hoy) === 'CERRADO' ? 'VENCIDO' : 'PENDIENTE';
}

/** Último cuatrimestre ya cerrado a la fecha dada (null si aún no cierra ninguno de esa vigencia). */
export function ultimoCuatrimestreCerrado(hoy: string): { vigencia: number; cuatrimestre: number } | null {
    const anio = Number(hoy.slice(0, 4));
    for (const c of [3, 2, 1]) {
        if (estadoApertura(anio, c, hoy) === 'CERRADO') return { vigencia: anio, cuatrimestre: c };
    }
    return { vigencia: anio - 1, cuatrimestre: 3 };
}

/** Identificador estable de un control; los controles antiguos sin `id` usan su posición. */
export function claveControl(control: { id?: string }, indice: number): string {
    return control.id ? String(control.id) : `idx-${indice}`;
}

export interface DatosSeguimiento {
    cuatrimestre?: unknown;
    fechaEjecucion?: unknown;
    comentarios?: unknown;
    resultado?: unknown;
    efectividad?: unknown;
}

export interface SeguimientoValidado {
    cuatrimestre: number;
    fechaEjecucion: string;
    comentarios: string;
    resultado: ResultadoSeguimientoControl;
    efectividad: number;
}

/** Valida los campos obligatorios. Devuelve los errores (vacío = válido) y los valores normalizados. */
export function validarSeguimiento(
    datos: DatosSeguimiento,
    vigencia: number,
    hoy: string,
): { errores: string[]; valores: SeguimientoValidado | null } {
    const errores: string[] = [];

    const cuatrimestre = Number(datos.cuatrimestre);
    if (![1, 2, 3].includes(cuatrimestre)) errores.push('El cuatrimestre es obligatorio (1, 2 o 3)');

    const fecha = typeof datos.fechaEjecucion === 'string' ? datos.fechaEjecucion.trim().slice(0, 10) : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(fecha))) {
        errores.push('La fecha de ejecución del seguimiento es obligatoria');
    } else if (fecha > hoy) {
        errores.push('La fecha de ejecución no puede ser posterior a la fecha actual');
    } else if ([1, 2, 3].includes(cuatrimestre)) {
        const { inicio, fin } = rangoCuatrimestre(vigencia, cuatrimestre);
        if (fecha < inicio || fecha > fin) {
            errores.push(`La fecha de ejecución debe estar dentro del cuatrimestre ${cuatrimestre} (${inicio} a ${fin})`);
        }
    }

    const comentarios = typeof datos.comentarios === 'string' ? datos.comentarios.trim() : '';
    if (!comentarios) errores.push('Los comentarios / observaciones son obligatorios');

    const resultado = datos.resultado as ResultadoSeguimientoControl;
    if (!RESULTADOS_SEGUIMIENTO.includes(resultado)) {
        errores.push('El resultado del control es obligatorio (Aplicado, Aplicado parcialmente o No aplicado)');
    }

    const efectividadTexto = typeof datos.efectividad === 'string' ? datos.efectividad.trim() : datos.efectividad;
    const efectividad = efectividadTexto === '' || efectividadTexto === null || efectividadTexto === undefined
        ? NaN
        : Number(efectividadTexto);
    if (!Number.isInteger(efectividad) || efectividad < 0 || efectividad > 100) {
        errores.push('El porcentaje de efectividad debe ser un entero entre 0 y 100');
    }

    if (errores.length > 0) return { errores, valores: null };
    return { errores, valores: { cuatrimestre, fechaEjecucion: fecha, comentarios, resultado, efectividad } };
}

export function extensionDe(nombre: string): string {
    const i = nombre.lastIndexOf('.');
    return i >= 0 ? nombre.slice(i + 1).toLowerCase() : '';
}

/** Valida tipo y tamaño de las evidencias nuevas. Devuelve mensajes de error. */
export function validarEvidencias(
    archivos: { originalname: string; size: number }[],
    maxMb: number,
): string[] {
    const errores: string[] = [];
    for (const a of archivos) {
        if (!EXTENSIONES_EVIDENCIA_PERMITIDAS.includes(extensionDe(a.originalname))) {
            errores.push(`"${a.originalname}": tipo no permitido (use PDF, Word, Excel o imágenes)`);
        } else if (a.size > maxMb * 1024 * 1024) {
            errores.push(`"${a.originalname}": supera el tamaño máximo de ${maxMb} MB`);
        }
    }
    return errores;
}
