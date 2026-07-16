import { PtaService } from './pta.service';

describe('PtaService - nombre completo del programa en reportes', () => {
  it('reemplaza la abreviación persistida por el nombre oficial del catálogo', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.enrichHorasDesdeBanco = jest.fn().mockResolvedValue(undefined);
    service.enrichExtensionSelections = jest.fn().mockResolvedValue(undefined);
    service.attachComponentApprovalProgress = jest.fn().mockResolvedValue(undefined);
    service.logger = { warn: jest.fn() };
    service.ptaRepo = {
      manager: {
        query: jest.fn().mockResolvedValue([{
          id: 'programa-1',
          codigo: 'APT',
          nombre: 'Administración Pública Territorial',
          nombreCorto: 'APT',
        }]),
      },
    };

    const dtos = [{
      id: 'pta-1',
      asignaturas: [{
        programa_id: 'programa-1',
        programa_nombre: 'APT',
      }],
    }];

    await service.enrichPtaSummaries(dtos);

    expect(dtos[0].asignaturas[0]).toMatchObject({
      programa_nombre: 'Administración Pública Territorial',
      programa_nombre_completo: 'Administración Pública Territorial',
      programa_codigo: 'APT',
      programa_nombre_corto: 'APT',
    });
    expect(dtos[0]).toMatchObject({
      programa: 'Administración Pública Territorial',
      programasAsignaturas: ['Administración Pública Territorial'],
    });
  });
});
