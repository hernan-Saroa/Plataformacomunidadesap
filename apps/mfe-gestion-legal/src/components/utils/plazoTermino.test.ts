import { describe, it, expect } from 'vitest';
import {
    calcularDiasTermino,
    calcularFechaVencimiento,
    fechaBackendAYMD,
    parseYMD,
    toYMD,
} from './plazoTermino';

describe('parseYMD / toYMD', () => {
    it('interpreta "YYYY-MM-DD" como fecha LOCAL, no como medianoche UTC', () => {
        const fecha = parseYMD('2026-09-15')!;
        // `new Date('2026-09-15')` daría el 14 en Colombia (UTC-5); por eso no se usa.
        expect(fecha.getFullYear()).toBe(2026);
        expect(fecha.getMonth()).toBe(8);
        expect(fecha.getDate()).toBe(15);
    });

    it('rechaza cadenas que no sean una fecha completa', () => {
        expect(parseYMD('')).toBeNull();
        expect(parseYMD('2026-09')).toBeNull();
        expect(parseYMD('15/09/2026')).toBeNull();
    });

    it('toYMD es el inverso exacto de parseYMD', () => {
        expect(toYMD(parseYMD('2026-01-05')!)).toBe('2026-01-05');
    });
});

describe('fechaBackendAYMD', () => {
    it('devuelve la fecha de Bogotá para un vencimiento anclado al final del día', () => {
        // Así es como el controller guarda un vencimiento escrito como 15/09/2026:
        // 15/09 23:59:59.999 en Bogotá = 16/09 04:59:59.999 UTC. Leerlo en UTC daría el 16, y
        // como el formulario reenvía lo que muestra, cada edición correría el plazo un día.
        expect(fechaBackendAYMD('2026-09-16T04:59:59.999Z')).toBe('2026-09-15');
        expect(fechaBackendAYMD('2026-02-01T04:59:59.999Z')).toBe('2026-01-31');
    });

    it('conserva la fecha de los términos antiguos guardados como medianoche UTC', () => {
        expect(fechaBackendAYMD('2026-09-15T00:00:00.000Z')).toBe('2026-09-15');
    });

    it('devuelve la fecha de Bogotá para una fecha base anclada al inicio del día', () => {
        // 01/01/2026 00:00 en Bogotá = 01/01 05:00 UTC.
        expect(fechaBackendAYMD('2026-01-01T05:00:00.000Z')).toBe('2026-01-01');
    });

    it('deja pasar tal cual una fecha que ya viene como YYYY-MM-DD', () => {
        expect(fechaBackendAYMD('2026-09-15')).toBe('2026-09-15');
    });

    it('devuelve cadena vacía para valores ausentes o inválidos', () => {
        expect(fechaBackendAYMD(null)).toBe('');
        expect(fechaBackendAYMD(undefined)).toBe('');
        expect(fechaBackendAYMD('no es fecha')).toBe('');
    });
});

describe('calcularDiasTermino', () => {
    it('cuenta días calendario entre la fecha base y el vencimiento', () => {
        expect(calcularDiasTermino('2026-01-01', '2026-01-11', 'CALENDARIO')).toBe(10);
    });

    it('cuenta solo días hábiles cuando el plazo se mide en hábiles', () => {
        // Del jueves 1 al domingo 11 de enero de 2026 hay 11 días calendario, pero descontando
        // fines de semana y el festivo del lunes 12 (Epifanía) quedan 6 días hábiles.
        expect(calcularDiasTermino('2026-01-01', '2026-01-11', 'HABILES')).toBe(6);
    });

    it('devuelve 0 si el vencimiento no es posterior a la fecha base', () => {
        expect(calcularDiasTermino('2026-01-11', '2026-01-11', 'CALENDARIO')).toBe(0);
        expect(calcularDiasTermino('2026-01-11', '2026-01-01', 'CALENDARIO')).toBe(0);
    });

    it('devuelve null si falta alguna de las dos fechas', () => {
        expect(calcularDiasTermino('', '2026-01-11', 'CALENDARIO')).toBeNull();
        expect(calcularDiasTermino('2026-01-01', '', 'CALENDARIO')).toBeNull();
    });
});

describe('calcularFechaVencimiento', () => {
    it('es la operación inversa de calcularDiasTermino en días calendario', () => {
        expect(calcularFechaVencimiento('2026-01-01', 10, 'CALENDARIO')).toBe('2026-01-11');
    });

    it('salta fines de semana y festivos cuando el plazo es en días hábiles', () => {
        // Devuelve el PRIMER día que completa el plazo: el 6.º hábil desde el jueves 1/01/2026
        // es el viernes 9 (el 3-4 y el 10-11 son fines de semana). Que el 11 también dé 6 días
        // hábiles no lo contradice: es la misma duración expresada con un vencimiento en domingo.
        expect(calcularFechaVencimiento('2026-01-01', 6, 'HABILES')).toBe('2026-01-09');
        expect(calcularDiasTermino('2026-01-01', '2026-01-09', 'HABILES')).toBe(6);

        // Ida y vuelta sobre un rango más largo, ya sin ambigüedad de fin de semana.
        const ida = calcularFechaVencimiento('2026-03-02', 15, 'HABILES')!;
        expect(calcularDiasTermino('2026-03-02', ida, 'HABILES')).toBe(15);
    });

    it('no convierte cuando la unidad del plazo son horas (la fecha límite manda)', () => {
        expect(calcularFechaVencimiento('2026-01-01', 48, 'HORAS')).toBeNull();
    });

    it('devuelve null ante una fecha base inválida o una duración negativa', () => {
        expect(calcularFechaVencimiento('', 10, 'CALENDARIO')).toBeNull();
        expect(calcularFechaVencimiento('2026-01-01', -1, 'CALENDARIO')).toBeNull();
    });

    it('no se cuelga con una duración absurda en días hábiles (tope defensivo)', () => {
        expect(calcularFechaVencimiento('2026-01-01', 999999, 'HABILES')).toBeTruthy();
    });
});
