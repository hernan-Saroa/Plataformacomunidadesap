import { motivoParaNoDecidir } from './estudio-previo.service';

/**
 * EFDS-1183. La 3.4 la resuelve el abogado que recibió el proceso en la 3.3.
 *
 * Antes bastaba con tener `contratacion.actividad.approve`, que lo tienen todos
 * los revisores de la Dirección: cualquiera de ellos podía aprobar o devolver
 * cualquier expediente, y el que lo tenía asignado se enteraba después. El
 * permiso dice qué clase de trabajo hace una persona; el reparto dice de qué
 * expedientes responde, y hacen falta los dos.
 */
describe('quién resuelve la 3.4', () => {
  const CON_PERMISO = true;
  const HAY_ABOGADO = true;
  const ES_EL_ABOGADO = true;

  it('el abogado asignado decide', () => {
    expect(motivoParaNoDecidir(CON_PERMISO, HAY_ABOGADO, ES_EL_ABOGADO)).toBeNull();
  });

  it('otro revisor de la Dirección, no, aunque tenga el permiso', () => {
    // Es el caso que motiva la regla: el permiso no basta para decidir sobre un
    // expediente del que responde otra persona.
    expect(motivoParaNoDecidir(CON_PERMISO, HAY_ABOGADO, !ES_EL_ABOGADO)).toBe('NO_ES_TUYO');
  });

  it('sin abogado asignado no se decide, ni siquiera con el permiso', () => {
    // Deliberado, no un descuido: el reparto de la 3.3 es lo que pone a alguien
    // a responder, y aprobar saltándoselo dejaría el expediente sin decir quién
    // lo revisó. Un proceso en revisión y sin abogado sale en las alertas.
    expect(motivoParaNoDecidir(CON_PERMISO, !HAY_ABOGADO, !ES_EL_ABOGADO)).toBe('SIN_ABOGADO');
  });

  it('sin el permiso no se decide aunque figure como abogado', () => {
    // El orden importa: si a alguien le retiran el permiso de aprobar, deja de
    // poder decidir aunque su asignación siga vigente. Manda el permiso, y el
    // reparto lo recorta.
    expect(motivoParaNoDecidir(!CON_PERMISO, HAY_ABOGADO, ES_EL_ABOGADO)).toBe('SIN_PERMISO');
  });
});
