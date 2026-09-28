/**
 * La previsualización tiene que decidir EXACTAMENTE lo mismo que
 * `alertas-vencimiento-terminos.service.ts -> evaluarTermino()` en el backend; si se desvía,
 * el formulario le promete al usuario una alerta que no se envía (o al revés). Estas pruebas
 * fijan esa equivalencia, con la regla global de 3 días (72 h) como caso de referencia.
 */
import { describe, it, expect } from 'vitest';
import {
    etiquetaAnticipacion,
    instanteVencimientoBogota,
    previsualizarAlertas,
} from './alertasVencimientoTermino';

const REGLA_3_DIAS = { id: 'r-72', horasAnticipacion: 72, activa: true };
const REGLA_1_DIA = { id: 'r-24', horasAnticipacion: 24, activa: true };

/** 15/09/2026 a las 10:00 de Bogotá, para razonar en horas sin depender del reloj real. */
const AHORA = new Date('2026-09-15T15:00:00.000Z');

describe('instanteVencimientoBogota', () => {
    it('ancla el vencimiento al final del día de Bogotá, igual que el backend', () => {
        expect(instanteVencimientoBogota('2026-09-15')!.toISOString()).toBe('2026-09-16T04:59:59.999Z');
    });

    it('devuelve null si la fecha no es válida', () => {
        expect(instanteVencimientoBogota('')).toBeNull();
        expect(instanteVencimientoBogota('mañana')).toBeNull();
    });
});

describe('previsualizarAlertas · reglas globales', () => {
    it('avisa que la regla de 3 días se dispara cuando el vencimiento queda dentro de la ventana', () => {
        const resultado = previsualizarAlertas({
            fechaVencimientoYMD: '2026-09-17', // ~62 h por delante
            reglasGlobales: [REGLA_3_DIAS],
            ahora: AHORA,
        })!;

        expect(resultado.modo).toBe('globales');
        expect(resultado.disparaAlerta).toBe(true);
        expect(resultado.reglasQueDisparan.map((r) => r.id)).toEqual(['r-72']);
        expect(resultado.yaVencido).toBe(false);
    });

    it('no dispara nada si el vencimiento queda fuera de la ventana de la regla', () => {
        const resultado = previsualizarAlertas({
            fechaVencimientoYMD: '2026-09-30',
            reglasGlobales: [REGLA_3_DIAS],
            ahora: AHORA,
        })!;

        expect(resultado.disparaAlerta).toBe(false);
        expect(resultado.reglasQueDisparan).toEqual([]);
    });

    it('lista todas las reglas cruzadas, de la más cercana a la más lejana', () => {
        const resultado = previsualizarAlertas({
            fechaVencimientoYMD: '2026-09-15', // vence hoy: cruza las dos
            reglasGlobales: [REGLA_3_DIAS, REGLA_1_DIA],
            ahora: AHORA,
        })!;

        expect(resultado.reglasQueDisparan.map((r) => r.horasAnticipacion)).toEqual([24, 72]);
    });

    it('ignora las reglas desactivadas', () => {
        const resultado = previsualizarAlertas({
            fechaVencimientoYMD: '2026-09-17',
            reglasGlobales: [{ ...REGLA_3_DIAS, activa: false }],
            ahora: AHORA,
        })!;

        expect(resultado.disparaAlerta).toBe(false);
    });

    it('marca como vencido un plazo movido al pasado', () => {
        const resultado = previsualizarAlertas({
            fechaVencimientoYMD: '2026-09-10',
            reglasGlobales: [REGLA_3_DIAS],
            ahora: AHORA,
        })!;

        expect(resultado.yaVencido).toBe(true);
        expect(resultado.horasRestantes).toBeLessThan(0);
        expect(resultado.disparaAlerta).toBe(true);
    });

    it('devuelve null si todavía no hay fecha de vencimiento que evaluar', () => {
        expect(previsualizarAlertas({ fechaVencimientoYMD: '', reglasGlobales: [REGLA_3_DIAS], ahora: AHORA })).toBeNull();
    });
});

describe('previsualizarAlertas · anticipación personalizada', () => {
    it('ignora por completo las reglas globales cuando el término tiene umbral propio', () => {
        const resultado = previsualizarAlertas({
            fechaVencimientoYMD: '2026-09-17', // dentro de los 3 días globales
            reglasGlobales: [REGLA_3_DIAS],
            horasAnticipacionPersonalizada: 12,
            ahora: AHORA,
        })!;

        expect(resultado.modo).toBe('personalizada');
        expect(resultado.disparaAlerta).toBe(false);
        expect(resultado.reglasQueDisparan).toEqual([]);
    });

    it('dispara cuando el vencimiento entra en el umbral propio', () => {
        const resultado = previsualizarAlertas({
            fechaVencimientoYMD: '2026-09-15',
            reglasGlobales: [],
            horasAnticipacionPersonalizada: 24,
            ahora: AHORA,
        })!;

        expect(resultado.modo).toBe('personalizada');
        expect(resultado.disparaAlerta).toBe(true);
    });
});

describe('etiquetaAnticipacion', () => {
    it('expresa en días los múltiplos de 24 y en horas el resto', () => {
        expect(etiquetaAnticipacion(72)).toBe('3 día(s)');
        expect(etiquetaAnticipacion(24)).toBe('1 día(s)');
        expect(etiquetaAnticipacion(5)).toBe('5 hora(s)');
    });
});
