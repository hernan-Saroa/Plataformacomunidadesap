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
    service.asignaturaRepo = {
      query: jest.fn().mockResolvedValue([{
        id: 'asignatura-vigente-1',
        id_programa: 'programa-1',
        pensum: 'APT_52',
        nombre: 'Administración Pública Territorial I',
        nombre_base: 'Administración Pública Territorial I',
        codigo: 'ASIG-001',
        modalidad: 'virtual',
        creditos: 3,
        semestre: 'Tercer semestre',
        nucleo_tematico: 'Núcleo vigente',
      }, {
        id: 'asignatura-vigente-2',
        id_programa: 'programa-1',
        pensum: 'APT_53',
        nombre: 'Administración Pública Territorial I',
        nombre_base: 'Administración Pública Territorial I',
        codigo: 'ASIG-002',
        modalidad: 'distancia',
        creditos: 3,
        semestre: 'Tercer semestre',
        nucleo_tematico: 'Núcleo anterior',
      }]),
    };

    const dtos = [{
      id: 'pta-1',
      asignaturas: [{
        asignatura_id: 'asignatura-legacy-1',
        asignatura_nombre: 'Administración Pública Territorial I',
        nucleo_tematico: 'Núcleo vigente',
        semestre: 'Tercer semestre',
        modalidad: 'VIRTUAL',
        creditos: 3,
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
      asignatura_id: 'asignatura-vigente-1',
      pensum: 'APT_52',
    });
    expect(dtos[0]).toMatchObject({
      programa: 'Administración Pública Territorial',
      programasAsignaturas: ['Administración Pública Territorial'],
    });
    expect(service.asignaturaRepo.query).toHaveBeenCalledTimes(1);
  });
});
