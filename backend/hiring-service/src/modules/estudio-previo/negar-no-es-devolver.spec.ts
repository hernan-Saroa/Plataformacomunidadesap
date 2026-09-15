import { desenlaceTrasDecision, estadoTrasDecision } from './estudio-previo.service';

/**
 * EFDS-1183. Una revisión admitía dos desenlaces y hacían falta tres.
 *
 * Devolver es «corrígelo y vuelve»: el trabajo regresa a quien lo hizo y el
 * proceso sigue vivo esperando la corrección. Negar es «esto no procede»: no
 * hay nada que corregir. Sin la segunda, un proceso rechazado de plano se
 * devolvía —y el área se quedaba esperando saber qué arreglar— o se quedaba en
 * revisión para siempre.
 */
describe('negar no es devolver', () => {
  it('devolver deja la actividad editable para que el área corrija', () => {
    expect(estadoTrasDecision('DEVUELTO')).toBe('BORRADOR');
  });

  it('negar la deja negada, que no vuelve a ser editable', () => {
    // Si negar reusara DEVUELTO, el riel le ofrecería al área editar y reenviar
    // algo que ya nadie va a mirar.
    expect(estadoTrasDecision('NEGADO')).toBe('NEGADO');
    expect(estadoTrasDecision('NEGADO')).not.toBe(estadoTrasDecision('DEVUELTO'));
  });

  it('aprobar la cierra', () => {
    expect(estadoTrasDecision('APROBADO')).toBe('APROBADO');
  });

  it('solo negar termina el proceso', () => {
    // El desenlace es del proceso y no solo de la actividad: dejarlo EN_CURSO
    // con su estudio previo negado haría que el listado y las estadísticas
    // contaran como vivo un expediente que nadie va a volver a tocar.
    expect(desenlaceTrasDecision('NEGADO')).toBe('NEGADO');
    expect(desenlaceTrasDecision('DEVUELTO')).toBeNull();
    expect(desenlaceTrasDecision('APROBADO')).toBeNull();
  });
});
