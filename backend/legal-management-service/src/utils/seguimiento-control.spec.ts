import {
    claveControl,
    cuatrimestreDeFecha,
    estadoApertura,
    estadoCorte,
    hoyColombia,
    rangoCuatrimestre,
    ultimoCuatrimestreCerrado,
    validarEvidencias,
    validarSeguimiento,
} from './seguimiento-control';

describe('seguimiento-control', () => {
    describe('rangoCuatrimestre', () => {
        it('define los tres cortes de la vigencia', () => {
            expect(rangoCuatrimestre(2026, 1)).toEqual({ inicio: '2026-01-01', fin: '2026-04-30' });
            expect(rangoCuatrimestre(2026, 2)).toEqual({ inicio: '2026-05-01', fin: '2026-08-31' });
            expect(rangoCuatrimestre(2026, 3)).toEqual({ inicio: '2026-09-01', fin: '2026-12-31' });
        });
        it('rechaza cuatrimestres inválidos', () => {
            expect(() => rangoCuatrimestre(2026, 4)).toThrow(RangeError);
        });
    });

    describe('cuatrimestreDeFecha', () => {
        it.each([
            ['2026-01-01', 1], ['2026-04-30', 1], ['2026-05-01', 2], ['2026-08-31', 2], ['2026-09-01', 3], ['2026-12-31', 3],
        ])('%s -> cuatrimestre %i', (fecha, esperado) => {
            expect(cuatrimestreDeFecha(fecha)).toEqual({ vigencia: 2026, cuatrimestre: esperado });
        });
    });

    describe('estadoApertura / estadoCorte', () => {
        it('abierto el último día del cuatrimestre y cerrado al día siguiente', () => {
            expect(estadoApertura(2026, 1, '2026-04-30')).toBe('ABIERTO');
            expect(estadoApertura(2026, 1, '2026-05-01')).toBe('CERRADO');
            expect(estadoApertura(2026, 2, '2026-04-30')).toBe('FUTURO');
        });
        it('Pendiente, Registrado y Vencido', () => {
            expect(estadoCorte(2026, 2, '2026-06-10', false)).toBe('PENDIENTE');
            expect(estadoCorte(2026, 3, '2026-06-10', false)).toBe('PENDIENTE'); // futuro: aún no vence
            expect(estadoCorte(2026, 1, '2026-06-10', false)).toBe('VENCIDO');
            expect(estadoCorte(2026, 1, '2026-06-10', true)).toBe('REGISTRADO');
            expect(estadoCorte(2026, 2, '2026-06-10', true)).toBe('REGISTRADO');
        });
    });

    describe('ultimoCuatrimestreCerrado', () => {
        it('devuelve el corte más reciente ya cerrado', () => {
            expect(ultimoCuatrimestreCerrado('2026-05-01')).toEqual({ vigencia: 2026, cuatrimestre: 1 });
            expect(ultimoCuatrimestreCerrado('2026-11-05')).toEqual({ vigencia: 2026, cuatrimestre: 2 });
            expect(ultimoCuatrimestreCerrado('2026-12-31')).toEqual({ vigencia: 2026, cuatrimestre: 2 });
        });
        it('en enero cae al tercer cuatrimestre del año anterior', () => {
            expect(ultimoCuatrimestreCerrado('2027-02-10')).toEqual({ vigencia: 2026, cuatrimestre: 3 });
        });
    });

    describe('hoyColombia', () => {
        it('usa la fecha de Colombia (UTC-5), no la del servidor', () => {
            expect(hoyColombia(new Date('2026-11-05T03:00:00Z'))).toBe('2026-11-04');
            expect(hoyColombia(new Date('2026-11-05T06:00:00Z'))).toBe('2026-11-05');
        });
    });

    describe('claveControl', () => {
        it('usa el id y, en controles antiguos sin id, la posición', () => {
            expect(claveControl({ id: 'abc' }, 3)).toBe('abc');
            expect(claveControl({}, 3)).toBe('idx-3');
        });
    });

    describe('validarSeguimiento', () => {
        const base = { cuatrimestre: '2', fechaEjecucion: '2026-06-10', comentarios: ' Se revisó ', resultado: 'APLICADO', efectividad: '85' };
        const hoy = '2026-11-05';

        it('acepta un seguimiento válido y normaliza', () => {
            const r = validarSeguimiento(base, 2026, hoy);
            expect(r.errores).toEqual([]);
            expect(r.valores).toEqual({ cuatrimestre: 2, fechaEjecucion: '2026-06-10', comentarios: 'Se revisó', resultado: 'APLICADO', efectividad: 85 });
        });
        it('exige todos los campos obligatorios', () => {
            const r = validarSeguimiento({}, 2026, hoy);
            expect(r.valores).toBeNull();
            expect(r.errores).toHaveLength(5);
        });
        it('rechaza fecha posterior a hoy', () => {
            const r = validarSeguimiento({ ...base, cuatrimestre: 3, fechaEjecucion: '2026-11-06' }, 2026, hoy);
            expect(r.errores).toContain('La fecha de ejecución no puede ser posterior a la fecha actual');
        });
        it('acepta la fecha de hoy', () => {
            expect(validarSeguimiento({ ...base, cuatrimestre: 3, fechaEjecucion: hoy }, 2026, hoy).errores).toEqual([]);
        });
        it('rechaza fecha fuera del cuatrimestre elegido', () => {
            const r = validarSeguimiento({ ...base, cuatrimestre: 1 }, 2026, hoy);
            expect(r.errores[0]).toMatch(/dentro del cuatrimestre 1/);
        });
        it('rechaza comentarios en blanco y resultado inválido', () => {
            const r = validarSeguimiento({ ...base, comentarios: '   ', resultado: 'OTRO' }, 2026, hoy);
            expect(r.errores).toHaveLength(2);
        });
        it.each(['-1', '101', '50.5', '', 'abc'])('rechaza efectividad %p', (valor) => {
            expect(validarSeguimiento({ ...base, efectividad: valor }, 2026, hoy).errores).toHaveLength(1);
        });
        it.each(['0', '100'])('acepta efectividad límite %p', (valor) => {
            expect(validarSeguimiento({ ...base, efectividad: valor }, 2026, hoy).errores).toEqual([]);
        });
    });

    describe('validarEvidencias', () => {
        const mb = 1024 * 1024;
        it('acepta PDF, Word, Excel e imágenes dentro del límite', () => {
            const archivos = ['a.pdf', 'b.DOCX', 'c.xlsx', 'd.png', 'e.jpg'].map(n => ({ originalname: n, size: mb }));
            expect(validarEvidencias(archivos, 10)).toEqual([]);
        });
        it('rechaza tipos no permitidos', () => {
            expect(validarEvidencias([{ originalname: 'virus.exe', size: 10 }], 10)[0]).toMatch(/tipo no permitido/);
            expect(validarEvidencias([{ originalname: 'sin-extension', size: 10 }], 10)).toHaveLength(1);
        });
        it('aplica el tamaño máximo parametrizable', () => {
            expect(validarEvidencias([{ originalname: 'a.pdf', size: 5 * mb }], 5)).toEqual([]);
            expect(validarEvidencias([{ originalname: 'a.pdf', size: 5 * mb + 1 }], 5)[0]).toMatch(/5 MB/);
        });
    });
});
