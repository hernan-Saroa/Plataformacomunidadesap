import { PtaService } from './pta.service';

// Cubre el bug de QA "No se identifica el origen de carga de la información"
// en el Reporte R-01 (IDENTIFICACION DEL DOCENTE): el PTA solo persiste lo que
// el docente envía en su formulario (nombre, dedicación, tipo de vinculación),
// por lo que "Documento" siempre llegaba vacío ('N/A') y campos como escalafón
// o núcleo temático dependían de valores por defecto hardcodeados en el
// frontend. Ahora enrichPtaSummaries resuelve esos campos contra la ficha
// institucional del docente (academic_work_plan."Docente" + auth.personas),
// sin sobrescribir nunca un valor que el PTA ya traiga.
describe('PtaService - identificación institucional del docente en reportes', () => {
  function createService(queryImpl: jest.Mock) {
    const service = Object.create(PtaService.prototype) as any;
    service.enrichHorasDesdeBanco = jest.fn().mockResolvedValue(undefined);
    service.enrichExtensionSelections = jest.fn().mockResolvedValue(undefined);
    service.attachComponentApprovalProgress = jest.fn().mockResolvedValue(undefined);
    service.logger = { warn: jest.fn() };
    service.ptaRepo = { manager: { query: queryImpl } };
    return service;
  }

  it('completa documento, escalafón, núcleo temático y territorial desde la ficha institucional cuando el PTA no los trae', async () => {
    const query = jest.fn().mockResolvedValue([{
      docente_id: 'docente-1',
      documento_identidad: '123456789',
      tipo_documento: 'CC',
      categoria_escalafon: 'Titular',
      nucleo_tematico: 'Administración Pública',
      territorial: 'Antioquia',
    }]);
    const service = createService(query);

    const dtos = [{ id: 'pta-1', docente_id: 'docente-1' }];

    await service.enrichPtaSummaries(dtos);

    expect(dtos[0]).toMatchObject({
      documento_identidad: '123456789',
      docente_identificacion: '123456789',
      cedula: '123456789',
      numero_documento: '123456789',
      tipo_documento: 'CC',
      categoria_escalafon: 'Titular',
      escalafon: 'Titular',
      nucleo_tematico: 'Administración Pública',
      territorial: 'Antioquia',
    });
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][1]).toEqual([['docente-1']]);
  });

  it('nunca sobrescribe un valor que el PTA ya trae, solo completa lo que falta', async () => {
    const query = jest.fn().mockResolvedValue([{
      docente_id: 'docente-1',
      documento_identidad: '999999999',
      categoria_escalafon: 'Auxiliar',
      nucleo_tematico: 'Otro núcleo',
      territorial: 'Otra territorial',
    }]);
    const service = createService(query);

    const dtos = [{
      id: 'pta-1',
      docente_id: 'docente-1',
      cedula: '111111111',
      categoria_escalafon: 'Asociado',
      nucleo_tematico: 'Administración Pública',
      territorial: 'Cundinamarca',
    }];

    await service.enrichPtaSummaries(dtos);

    expect(dtos[0]).toMatchObject({
      cedula: '111111111',
      categoria_escalafon: 'Asociado',
      nucleo_tematico: 'Administración Pública',
      territorial: 'Cundinamarca',
      documento_identidad: '999999999',
      numero_documento: '999999999',
    });
  });

  it('sin docente_id en el PTA no consulta la ficha institucional', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const service = createService(query);
    const dtos = [{ id: 'pta-1' }];

    await service.enrichPtaSummaries(dtos);

    expect(query).not.toHaveBeenCalled();
    expect(dtos[0].documento_identidad).toBeUndefined();
  });

  it('un fallo al consultar la ficha institucional no bloquea el reporte (aditivo y tolerante)', async () => {
    const query = jest.fn().mockRejectedValue(new Error('DB caída'));
    const service = createService(query);
    const dtos = [{ id: 'pta-1', docente_id: 'docente-1' }];

    await expect(service.enrichPtaSummaries(dtos)).resolves.toEqual(dtos);
    expect(service.logger.warn).toHaveBeenCalled();
  });
});
