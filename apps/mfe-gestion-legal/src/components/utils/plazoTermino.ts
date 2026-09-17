/**
 * PARAMETRIZACIÓN DEL PLAZO DE UN TÉRMINO / INFORME
 *
 * Un término queda definido por cuatro datos que tienen que ser coherentes entre sí:
 *   - `fechaBase`        — desde cuándo corre el plazo.
 *   - `tipoDias`         — en qué unidad se cuenta (calendario, hábiles u horas).
 *   - `diasTermino`      — cuánto dura el plazo en esa unidad.
 *   - `fechaVencimiento` — cuándo se acaba.
 *
 * Al crear el término esa coherencia la resuelve el backend (`TerminosController.createManual`
 * calcula `diasTermino` a partir de las dos fechas). Al EDITARLO hay que mantenerla en los dos
 * sentidos, porque el usuario puede aplazar el informe de dos formas distintas: moviendo la
 * fecha límite ("ahora vence el 30") o cambiando la duración del plazo ("son 15 días hábiles,
 * no 10"). Estas funciones son la única fuente de verdad de esa conversión, y trabajan con
 * fechas en formato `YYYY-MM-DD` (lo que emite/espera un `<input type="date">`), sin construir
 * `Date` a partir del string crudo para no caer en el corrimiento de un día por UTC.
 */

import { esDiaHabil } from './diasHabiles';

export type TipoDiasTermino = 'CALENDARIO' | 'HABILES' | 'HORAS';

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Convierte "YYYY-MM-DD" a un Date local a medianoche (sin corrimiento por zona horaria). */
export function parseYMD(valor: string): Date | null {
    const m = YMD.exec((valor || '').trim());
    if (!m) return null;
    const fecha = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/** Inverso de `parseYMD`: formatea un Date local como "YYYY-MM-DD". */
export function toYMD(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
}

const OFFSET_BOGOTA_MS = 5 * 60 * 60 * 1000; // Colombia no tiene horario de verano.

/**
 * Normaliza a "YYYY-MM-DD" lo que venga del backend para un campo de fecha.
 *
 * Hay DOS formas de instante conviviendo en `terminos_procesales`, y el formulario tiene que
 * mostrar la misma fecha calendario que el usuario escribió en las dos:
 *
 *   - Términos creados/editados desde el formulario: el controller los ancla al huso de Bogotá
 *     (`parseFechaBogota`), con el vencimiento al FINAL del día — el 31/01 se guarda como
 *     `2026-02-01T04:59:59.999Z`. Leerlo en UTC daría el 1 de febrero: un día de más, y como el
 *     formulario reenvía lo que muestra, cada edición correría el plazo un día hacia adelante.
 *   - Términos más antiguos o generados por sincronización: se guardaron como fecha calendario
 *     pura, es decir medianoche UTC (`2026-09-15T00:00:00.000Z`). Ahí sí la fecha buena es la
 *     de los componentes UTC; convertirla a Bogotá mostraría el día anterior.
 *
 * La medianoche UTC exacta es lo que distingue el segundo caso del primero.
 */
export function fechaBackendAYMD(valor: string | Date | null | undefined): string {
    if (!valor) return '';
    if (typeof valor === 'string' && YMD.test(valor.trim())) return valor.trim();
    const d = new Date(valor as any);
    if (Number.isNaN(d.getTime())) return '';

    const esMedianocheUTC = d.getUTCHours() === 0 && d.getUTCMinutes() === 0
        && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
    const referencia = esMedianocheUTC ? d : new Date(d.getTime() - OFFSET_BOGOTA_MS);

    const mes = String(referencia.getUTCMonth() + 1).padStart(2, '0');
    const dia = String(referencia.getUTCDate()).padStart(2, '0');
    return `${referencia.getUTCFullYear()}-${mes}-${dia}`;
}

/**
 * Días transcurridos entre dos fechas según la unidad del plazo.
 *
 * - CALENDARIO / HORAS: diferencia simple de días (para HORAS el backend guarda el número
 *   en la misma columna `diasTermino`, así que no se intenta reinterpretarlo aquí).
 * - HABILES: cuenta los días hábiles del rango, excluyendo la fecha base e incluyendo el
 *   vencimiento — es decir, "5 días hábiles" es el 5.º día hábil posterior a la base.
 *
 * Devuelve `null` si alguna fecha es inválida, y nunca un número negativo.
 */
export function calcularDiasTermino(
    fechaBaseYMD: string,
    fechaVencimientoYMD: string,
    tipoDias: TipoDiasTermino,
): number | null {
    const base = parseYMD(fechaBaseYMD);
    const vencimiento = parseYMD(fechaVencimientoYMD);
    if (!base || !vencimiento) return null;
    if (vencimiento <= base) return 0;

    if (tipoDias === 'HABILES') {
        let habiles = 0;
        const cursor = new Date(base);
        while (cursor < vencimiento) {
            cursor.setDate(cursor.getDate() + 1);
            if (esDiaHabil(cursor)) habiles++;
        }
        return habiles;
    }

    const MS_POR_DIA = 24 * 60 * 60 * 1000;
    return Math.round((vencimiento.getTime() - base.getTime()) / MS_POR_DIA);
}

/**
 * Operación inversa: fecha de vencimiento resultante de aplicar `dias` a `fechaBase`.
 *
 * Para HORAS no hay conversión posible con la granularidad de día de un `<input type="date">`,
 * así que devuelve `null` y la UI deja la fecha límite como dato autoritativo.
 */
export function calcularFechaVencimiento(
    fechaBaseYMD: string,
    dias: number,
    tipoDias: TipoDiasTermino,
): string | null {
    const base = parseYMD(fechaBaseYMD);
    if (!base || !Number.isFinite(dias) || dias < 0) return null;
    if (tipoDias === 'HORAS') return null;

    const cursor = new Date(base);
    if (tipoDias === 'HABILES') {
        let restantes = Math.floor(dias);
        // Tope defensivo: sin él, un valor absurdo (p. ej. 99999) congelaría la UI en el bucle.
        let vueltas = 0;
        while (restantes > 0 && vueltas < 20000) {
            cursor.setDate(cursor.getDate() + 1);
            vueltas++;
            if (esDiaHabil(cursor)) restantes--;
        }
        return toYMD(cursor);
    }

    cursor.setDate(cursor.getDate() + Math.floor(dias));
    return toYMD(cursor);
}

export const ETIQUETA_UNIDAD_PLAZO: Record<TipoDiasTermino, string> = {
    CALENDARIO: 'Días calendario',
    HABILES: 'Días hábiles',
    HORAS: 'Horas',
};
