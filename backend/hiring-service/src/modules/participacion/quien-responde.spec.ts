import { ContextoResponde, respondeEn } from './quien-responde';

/**
 * Quién responde por cada actividad en un proceso (109). La pantalla lo lee
 * para decir a quién le toca, con la misma regla que exige el servidor.
 */
describe('quién responde por cada actividad', () => {
  const ctx: ContextoResponde = {
    reglas: [
      { numeral: '3.6', modalidad: null, regla: { puestoId: 'p-abogado' } },
      { numeral: '5.1', modalidad: null, regla: { personas: ['persona-1'] } },
    ],
    puestos: new Map([['p-abogado', 'Abogado']]),
    ocupantes: new Map([
      ['proc-1', new Map([['p-abogado', { nombre: 'Andrés Rojas', usuarioId: 'u-1', usuarioNombre: 'arojas' }]])],
    ]),
    personas: new Map([['persona-1', 'Laura Pineda']]),
    miPersona: null,
  };

  it('con puesto, nombra a quien lo ocupa y dice si es quien mira', () => {
    expect(respondeEn(ctx, 'proc-1', null, '3.6', { userId: 'u-1', userName: 'arojas' })).toMatchObject({
      puesto: 'Abogado',
      persona: { nombre: 'Andrés Rojas', esMio: true },
      accion: 'aprobar',
    });
  });

  it('con el puesto vacío, lo dice: nadie la hace todavía', () => {
    expect(respondeEn(ctx, 'proc-2', null, '3.6')).toMatchObject({ puesto: 'Abogado', persona: null });
  });

  it('con personas, las nombra', () => {
    expect(respondeEn(ctx, 'proc-1', null, '5.1')).toMatchObject({
      puesto: null,
      persona: { nombre: 'Laura Pineda', esMio: false },
      accion: 'editar',
    });
  });

  it('sin regla responden los roles de su alcance', () => {
    expect(respondeEn(ctx, 'proc-1', null, '3.7')).toBeNull();
  });
});
