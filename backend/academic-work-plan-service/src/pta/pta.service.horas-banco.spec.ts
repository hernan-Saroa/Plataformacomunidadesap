import { PtaService } from './pta.service';

describe('PtaService - horas autoritativas del Banco de Docentes', () => {
  const createService = (docente: any) => {
    const service = Object.create(PtaService.prototype) as any;
    service.docenteRepo = {
      findOne: jest.fn().mockResolvedValue(docente),
    };
    service.calcHorasProgramables = jest.fn().mockResolvedValue(800);
    return service;
  };

  it('ignora las 800h enviadas por el navegador cuando el Banco registra 720h', async () => {
    const service = createService({ id: 'docente-1', personaId: null, horasAsignables: 720 });

    await expect(service.resolveHorasAProgramar('docente-1', {
      horas_a_programar: 800,
      semanas_prorrateo: 16,
    })).resolves.toBe(720);
  });

  it('aplica el prorrateo sobre la bolsa del Banco y no sobre una base normativa fija', async () => {
    const service = createService({ id: 'docente-1', personaId: null, horasAsignables: 720 });

    await expect(service.resolveHorasAProgramar('docente-1', {
      horas_a_programar: 800,
      semanas_prorrateo: 8,
    })).resolves.toBe(360);
  });

  it('acepta cualquier bolsa positiva cargada por RUND', async () => {
    const service = createService({ id: 'docente-1', personaId: null, horasAsignables: 635 });

    await expect(service.resolveHorasAProgramar('docente-1', {
      horas_a_programar: 800,
      semanas_prorrateo: 16,
    })).resolves.toBe(635);
  });

  it('respeta una bolsa RUND de 0h sin convertirla en 800h', async () => {
    const service = createService({ id: 'docente-1', personaId: null, horasAsignables: 0 });

    await expect(service.resolveHorasAProgramar('docente-1', {
      horas_a_programar: 800,
    })).resolves.toBe(0);
  });

  it('calcula los topes de investigacion sobre 720h para el rol configurado', () => {
    const service = Object.create(PtaService.prototype) as any;
    const rules = {
      max_pct_investigacion: 50,
      max_horas_investigacion_global: 400,
      inv_roles: [{
        nombre: 'INVESTIGADOR LIDER DE PROYECTO',
        horas_max: 400,
        pct_max: 50,
      }],
    };

    expect(service.getInvestigacionLimit({
      investigacion_proyecto: { rol: 'INVESTIGADOR LIDER DE PROYECTO' },
    }, rules, 720)).toBe(360);
  });

  it('escala el 50% de investigacion por encima de 800h sin recortarlo a 400h', () => {
    const service = Object.create(PtaService.prototype) as any;
    const rules = {
      max_pct_investigacion: 50,
      max_horas_investigacion_global: 400,
      inv_roles: [{
        nombre: 'INVESTIGADOR LIDER DE PROYECTO',
        horas_max: 400,
        pct_max: 50,
      }],
    };

    expect(service.getInvestigacionLimit({
      investigacion_proyecto: { rol: 'INVESTIGADOR LIDER DE PROYECTO' },
    }, rules, 900)).toBe(450);
  });

  it('aplica el menor entre hasta horas y sin exceder porcentaje del rol', () => {
    const service = Object.create(PtaService.prototype) as any;
    const rules = {
      max_pct_investigacion: 50,
      max_horas_investigacion_global: 400,
      inv_roles: [{
        nombre: 'INVESTIGADOR LIDER DE PROYECTO',
        horas_max: 300,
        pct_max: 50,
      }],
    };

    expect(service.getInvestigacionLimit({
      investigacion_proyecto: { rol: 'INVESTIGADOR LIDER DE PROYECTO' },
    }, rules, 720)).toBe(270);
  });

  it('acepta horas graduables por debajo del tope dinamico del rol', () => {
    const service = Object.create(PtaService.prototype) as any;
    const body = {
      tipo_vinculacion: 'CARRERA_003',
      investigacion_proyecto: {
        rol: 'INVESTIGADOR LIDER DE PROYECTO',
        horas_solicitadas: 180,
      },
      asignaturas: [{
        asignatura_id: 'asignatura-1',
        programa_id: 'programa-1',
        asignatura_nombre: 'Economia de lo Publico',
        pensum: '2026',
        creditos: 3,
        total_horas: 144,
        fecha_inicio: '2026-07-01',
        fecha_fin: '2026-07-03',
      }],
      complementarias: [{
        actividad_id: 'comp-legacy',
        nombre: 'Actividad complementaria',
        seccion: 'complementarias_docencia',
        horas: 20,
      }],
    };
    const hours = {
      total: 344,
      sumDocencia: 144,
      sumInv: 180,
      sumExt: 0,
      sumComp: 20,
      sumAcad: 0,
    };
    const rules = {
      max_pct_docencia: 100,
      max_horas_docencia_global: 800,
      max_pct_investigacion: 50,
      max_horas_investigacion_global: 400,
      max_pct_extension: 25,
      max_horas_extension_global: 200,
      max_pct_complementarias: 25,
      max_horas_complementarias_global: 200,
      inv_roles: [{
        nombre: 'INVESTIGADOR LIDER DE PROYECTO',
        horas_max: 400,
        pct_max: 50,
      }],
    };

    expect(() => service.validatePtaForSubmission(body, hours, 720, rules)).not.toThrow();
  });

  it('rechaza un rol sin horas reconocidas y conserva el tope dinamico en el mensaje', () => {
    const service = Object.create(PtaService.prototype) as any;
    const body = {
      investigacion_proyecto: {
        rol: 'INVESTIGADOR LIDER DE PROYECTO',
        horas_solicitadas: 0,
      },
      asignaturas: [],
      complementarias: [],
    };
    const hours = {
      total: 20,
      sumDocencia: 0,
      sumInv: 0,
      sumExt: 20,
      sumComp: 0,
      sumAcad: 0,
    };
    const rules = {
      max_pct_investigacion: 50,
      max_horas_investigacion_global: 400,
      inv_roles: [{
        nombre: 'INVESTIGADOR LIDER DE PROYECTO',
        horas_max: 400,
        pct_max: 50,
      }],
    };

    expect(() => service.validatePtaForSubmission(body, hours, 720, rules))
      .toThrow('deben estar entre 1h y 360h');
  });

  it.each([
    ['Extension', { sumExt: 181, sumComp: 0 }],
    ['Complementarias', { sumExt: 0, sumComp: 181 }],
  ])('aplica a %s el 25%% de la bolsa de 720h', (component, partialHours) => {
    const service = Object.create(PtaService.prototype) as any;
    const hours = {
      total: 181,
      sumDocencia: 0,
      sumInv: 0,
      sumExt: partialHours.sumExt,
      sumComp: partialHours.sumComp,
      sumAcad: 0,
    };

    expect(() => service.validatePtaForSubmission(
      { complementarias: [] },
      hours,
      720,
      {
        max_pct_investigacion: 50,
        max_horas_investigacion_global: 400,
        max_pct_extension: 25,
        max_horas_extension_global: 200,
        max_pct_complementarias: 25,
        max_horas_complementarias_global: 200,
      },
    )).toThrow(`${component} excede el limite permitido: 181h / 180h`);
  });

  it.each([
    ['Extension', { sumExt: 226, sumComp: 0 }],
    ['Complementarias', { sumExt: 0, sumComp: 226 }],
  ])('escala a 225h el 25%% de %s para una bolsa RUND de 900h', (component, partialHours) => {
    const service = Object.create(PtaService.prototype) as any;
    const hours = {
      total: 226,
      sumDocencia: 0,
      sumInv: 0,
      sumExt: partialHours.sumExt,
      sumComp: partialHours.sumComp,
      sumAcad: 0,
    };

    expect(() => service.validatePtaForSubmission(
      { complementarias: [] },
      hours,
      900,
      {
        max_pct_investigacion: 50,
        max_horas_investigacion_global: 400,
        max_pct_extension: 25,
        max_horas_extension_global: 200,
        max_pct_complementarias: 25,
        max_horas_complementarias_global: 200,
      },
    )).toThrow(`${component} excede el limite permitido: 226h / 225h`);
  });

  it('conserva el fallback legacy solo cuando el docente aun no tiene horas en el Banco', async () => {
    const service = createService(null);

    await expect(service.resolveHorasAProgramar('docente-legacy', {
      horas_a_programar: 640,
    })).resolves.toBe(640);
  });

  it('refresca en lote las horas usadas por listados, reportes y concertacion', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.ptaRepo = {
      manager: {
        query: jest.fn().mockResolvedValue([
          { docente_id: 'docente-1', periodo: '2026-1', horas: 675 },
        ]),
      },
    };
    service.logger = { warn: jest.fn() };
    const dtos = [{
      id: 'pta-1',
      docente_id: 'docente-1',
      periodo: '2026-1',
      horas_a_programar: 800,
      horas_asignables: 800,
    }];

    await service.enrichHorasDesdeBanco(dtos);

    expect(dtos[0]).toMatchObject({
      horas_a_programar: 675,
      horas_asignables: 675,
      horas_fuente: 'BANCO_DOCENTES',
    });
    expect(service.ptaRepo.manager.query).toHaveBeenCalledTimes(1);
  });
});
