/**
 * `observaciones` es un campo compartido: además de la descripción del informe guarda el
 * historial de comentarios y los metadatos de los documentos adjuntos. Estas pruebas blindan
 * el caso que más duele al editar —guardar una descripción nueva y perder por el camino los
 * comentarios o, peor, los adjuntos, que desaparecerían del detalle del informe—.
 */
import { describe, it, expect } from 'vitest';
import { componerObservaciones, separarObservaciones } from './observacionesTermino';

const ADJUNTO = '[ARCHIVO_ADJUNTO] informe.pdf|file-123.pdf|24.00 KB|2026-09-01T10:00:00.000Z';
const COMENTARIO = '[15/09/2026 10:00:00] Ana Gómez:\nSe solicitó prórroga a la Contraloría';

describe('separarObservaciones', () => {
    it('devuelve la descripción sola cuando no hay comentarios ni adjuntos', () => {
        const r = separarObservaciones('Informe trimestral de contabilidad');

        expect(r.descripcionBase).toBe('Informe trimestral de contabilidad');
        expect(r.comentarios).toEqual([]);
        expect(r.adjuntos).toEqual([]);
    });

    it('separa los comentarios de la descripción', () => {
        const r = separarObservaciones(`Descripción original\n\n---\n${COMENTARIO}`);

        expect(r.descripcionBase).toBe('Descripción original');
        expect(r.comentarios).toEqual([COMENTARIO]);
    });

    it('extrae las líneas de adjuntos estén donde estén', () => {
        const r = separarObservaciones(`Descripción original\n${ADJUNTO}\n\n---\n${COMENTARIO}`);

        expect(r.descripcionBase).toBe('Descripción original');
        expect(r.comentarios).toEqual([COMENTARIO]);
        expect(r.adjuntos).toEqual([ADJUNTO]);
    });

    it('tolera un campo vacío o nulo', () => {
        expect(separarObservaciones(null)).toEqual({ descripcionBase: '', comentarios: [], adjuntos: [] });
        expect(separarObservaciones('')).toEqual({ descripcionBase: '', comentarios: [], adjuntos: [] });
    });
});

describe('componerObservaciones', () => {
    it('cambia solo la descripción y conserva comentarios y adjuntos', () => {
        const original = separarObservaciones(`Descripción original\n\n---\n${COMENTARIO}\n${ADJUNTO}`);

        const resultado = componerObservaciones('Descripción corregida', original);

        expect(resultado).toContain('Descripción corregida');
        expect(resultado).not.toContain('Descripción original');
        expect(resultado).toContain(COMENTARIO);
        expect(resultado).toContain(ADJUNTO);
    });

    it('lo que compone se vuelve a separar igual (ida y vuelta estable)', () => {
        const original = separarObservaciones(`Antes\n\n---\n${COMENTARIO}\n${ADJUNTO}`);

        const recompuesto = separarObservaciones(componerObservaciones('Después', original));

        expect(recompuesto.descripcionBase).toBe('Después');
        expect(recompuesto.comentarios).toEqual(original.comentarios);
        expect(recompuesto.adjuntos).toEqual(original.adjuntos);
    });

    it('no deja separadores sueltos al vaciar la descripción de un informe con adjuntos', () => {
        const original = separarObservaciones(`Algo\n${ADJUNTO}`);

        expect(componerObservaciones('', original)).toBe(ADJUNTO);
    });
});
