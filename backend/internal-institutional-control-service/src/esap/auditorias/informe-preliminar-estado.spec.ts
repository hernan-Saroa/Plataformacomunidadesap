import { informePreliminarYaEnviado } from './informe-preliminar-estado';

describe('informePreliminarYaEnviado', () => {
  it('sin hallazgos y sin informe subido no cuenta como enviado', () => {
    expect(informePreliminarYaEnviado({ hallazgos: [] })).toBe(false);
  });

  it('sin hallazgos cuenta como enviado cuando se subió el informe', () => {
    expect(informePreliminarYaEnviado({ hallazgos: [], marcadoEnChecklist: true })).toBe(true);
    expect(informePreliminarYaEnviado({ hallazgos: [], hayDocumento: true })).toBe(true);
  });

  it('con algún hallazgo en borrador no cuenta como enviado', () => {
    expect(informePreliminarYaEnviado({ hallazgos: [{ estado: 'notificado' }, { estado: 'BORRADOR' }] })).toBe(false);
  });

  it('con hallazgos ya notificados cuenta como enviado aunque no esté el archivo (auditorías viejas)', () => {
    expect(informePreliminarYaEnviado({ hallazgos: [{ estado: 'notificado' }, { estado: 'aceptado' }] })).toBe(true);
  });
});
