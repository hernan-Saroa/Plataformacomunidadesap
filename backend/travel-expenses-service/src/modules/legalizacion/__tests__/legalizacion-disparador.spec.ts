import { alcanzoDisparador } from '../legalizacion-disparador.service';

describe('EFDS-1309 — disparador de la legalización por configuración', () => {
  it('con disparador PAGADA, abre al llegar a PAGADA', () => {
    expect(alcanzoDisparador('PAGADA', 'PAGADA')).toBe(true);
  });

  it('con disparador PAGADA, no abre en OBLIGADA ni COMPROMETIDA', () => {
    expect(alcanzoDisparador('OBLIGADA', 'PAGADA')).toBe(false);
    expect(alcanzoDisparador('COMPROMETIDA', 'PAGADA')).toBe(false);
  });

  it('cambiar el disparador a COMPROMETIDA (D-1) abre en COMPROMETIDA y estados posteriores', () => {
    expect(alcanzoDisparador('COMPROMETIDA', 'COMPROMETIDA')).toBe(true);
    expect(alcanzoDisparador('OBLIGADA', 'COMPROMETIDA')).toBe(true);
    expect(alcanzoDisparador('PAGADA', 'COMPROMETIDA')).toBe(true);
    expect(alcanzoDisparador('AUTORIZADA', 'COMPROMETIDA')).toBe(false);
  });

  it('una solicitud en PENDIENTE_LEGALIZACION ya alcanzó cualquier disparador', () => {
    expect(alcanzoDisparador('PENDIENTE_LEGALIZACION', 'PAGADA')).toBe(true);
  });

  it.each(['CANCELADA', 'RECHAZADO', 'DEVUELTA', 'RADICADA', 'LEGALIZADO', 'EN_COMISION'])(
    'nunca abre desde %s',
    (estado) => {
      expect(alcanzoDisparador(estado, 'AUTORIZADA')).toBe(false);
    },
  );

  it('un disparador desconocido no abre nada (no se confía en datos fuera del CHECK)', () => {
    expect(alcanzoDisparador('PAGADA', 'EN_COMISION')).toBe(false);
  });
});
