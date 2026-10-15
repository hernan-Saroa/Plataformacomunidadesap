import { RESPONDE_EL_ASIGNADO, respondeElAsignado } from './quien-responde';

/**
 * Quién responde por las actividades que no son de un rol sino de una persona
 * del proceso. La pantalla lo lee de aquí para decir a quién le toca, así que
 * lo que cambie en esta tabla cambia lo que dice la ficha y «Mi trabajo».
 */
describe('quién responde por cada actividad', () => {
  it('la revisión, la causal y el comité son del abogado, que las aprueba', () => {
    for (const numeral of ['3.4', '3.6', '3.7']) {
      expect(respondeElAsignado(numeral)).toMatchObject({
        papel: 'ABOGADO',
        accion: 'aprobar',
        soloEnRevision: false,
      });
    }
  });

  it('el abogado se asigna, no se toma de una bandeja', () => {
    expect(respondeElAsignado('3.7')?.seToma).toBe(false);
  });

  it('lo demás lo responden los roles de su alcance', () => {
    expect(respondeElAsignado('3.1')).toBeNull();
    expect(respondeElAsignado('6.1')).toBeNull();
    // El cargue del CDP es del área desde la 103: ya no lo toma la Financiera.
    expect(respondeElAsignado('4.2')).toBeNull();
    expect(Object.keys(RESPONDE_EL_ASIGNADO)).toEqual(['3.4', '3.6', '3.7']);
  });
});
