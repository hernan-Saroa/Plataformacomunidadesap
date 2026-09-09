import { assertRundEvidenceData, hasRundData } from './rund-evidence-data';

describe('Carga RUND exige datos actuales', () => {
  it.each([null, undefined, '', '   ', '—', 'No aplica', ' N/A ', 'Sin información', false])('rechaza ausencia: %s', value => {
    expect(hasRundData(value)).toBe(false);
  });
  it('cero es un valor válido', () => expect(hasRundData(0)).toBe(true));
  it('valida la fila elegida aunque otra fila del soporte tenga dato', async () => {
    const query = { query: jest.fn().mockResolvedValue([{ num_identificacion: '123', fec_nacimiento: null }]) };
    await expect(assertRundEvidenceData(query, '1', 'documento_identidad', 'FECHA_NACIMIENTO')).rejects.toThrow('Registre primero');
    await expect(assertRundEvidenceData(query, '1', 'documento_identidad', 'DOCUMENTO_IDENTIDAD')).resolves.toBeUndefined();
    await expect(assertRundEvidenceData(query, '1', 'documento_identidad', 'CAMPO_INVENTADO')).rejects.toThrow('fila');
  });
  it.each(['diploma_maestria', 'acta_grado_maestria', 'contrato', 'hoja_vida_pro', 'certificacion_investigacion'])('la biblioteca también exige datos: %s', async type => {
    const query = { query: jest.fn().mockResolvedValue([{ datosCargaMasiva: { maestria: 'Título antiguo' } }]) };
    await expect(assertRundEvidenceData(query, '1', type)).rejects.toThrow('Registre primero');
  });
  it('acepta títulos declarados y puntaje cero', async () => {
    const query = { query: jest.fn().mockResolvedValue([{ maestria: 'Título', puntajeSalarial: 0 }]) };
    await expect(assertRundEvidenceData(query, '1', 'acta_grado_maestria')).resolves.toBeUndefined();
    await expect(assertRundEvidenceData(query, '1', 'resolucion_puntaje_salarial')).resolves.toBeUndefined();
  });
  it.each([undefined, 'autorizacion_habeas_data', 'soporte_edicion_perfil', 'soporte_cambio_estado_perfil'])('conserva documentos sin fila de datos: %s', async type => {
    const query = { query: jest.fn() };
    await expect(assertRundEvidenceData(query, '1', type)).resolves.toBeUndefined();
    expect(query.query).not.toHaveBeenCalled();
  });
});
