import { pendientesParaArchivar } from './expediente-archivado';

describe('pendientesParaArchivar (EFDS-1174)', () => {
  const todo = { actaVigente: true, publicadaEnSecop: true, cierreVigente: true };

  it('no deja pendientes cuando el acta está publicada y el contrato cerrado', () => {
    expect(pendientesParaArchivar(todo)).toEqual([]);
  });

  it('pide el acta antes que su publicación: sin acta no hay nada que publicar', () => {
    const pendientes = pendientesParaArchivar({ ...todo, actaVigente: false, publicadaEnSecop: false });

    expect(pendientes).toHaveLength(1);
    expect(pendientes[0]).toContain('acta de liquidación vigente');
  });

  it('pide la publicación cuando el acta existe y no se publicó', () => {
    const pendientes = pendientesParaArchivar({ ...todo, publicadaEnSecop: false });

    expect(pendientes).toEqual(['el acta de liquidación no se ha publicado en SECOP II']);
  });

  /**
   * La historia solo pide «contrato liquidado». Exigir el cierre es criterio del
   * equipo: la matriz pone la 10.3 antes de la 10.4, y archivar con el saldo del
   * RP sin liberar deja plata amarrada a un contrato que ya nadie va a mirar.
   */
  it('exige el cierre financiero aunque el acta ya esté publicada', () => {
    const pendientes = pendientesParaArchivar({ ...todo, cierreVigente: false });

    expect(pendientes).toEqual(['el contrato no tiene cierre financiero vigente (10.3)']);
  });

  it('acumula lo que falte, para que el Archivo de Gestión no lo descubra de a uno', () => {
    const pendientes = pendientesParaArchivar({
      actaVigente: false,
      publicadaEnSecop: false,
      cierreVigente: false,
    });

    expect(pendientes).toHaveLength(2);
  });
});
