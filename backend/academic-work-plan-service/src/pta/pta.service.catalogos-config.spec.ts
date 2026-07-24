import { BadRequestException } from '@nestjs/common';
import { PtaService } from './pta.service';

const compSections = [
  {
    key: 'complementarias_docencia',
    label: 'ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA',
    columnas: ['_items_'],
  },
  {
    key: 'academico_administrativas',
    label: 'ACTIVIDADES ACADÉMICO-ADMINISTRATIVAS',
    columnas: ['_items_'],
  },
];

describe('PtaService - catálogos derivados de la configuración', () => {
  it('usa el intervalo configurado en la fila aunque el ID tuviera otro significado legacy', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.getConfiguracionPTAGlobal = jest.fn().mockResolvedValue({
      comp_secciones: compSections,
      comp_actividades_v2: {
        complementarias_docencia: [{
          id: 'COMP_08',
          nombre: 'Coordinación escuela doctoral',
          items: [{ nombre: 'Desde 40 hasta 80 horas', tipo: 'intervalo', horas_min: 40, horas: 80 }],
        }],
      },
      comp_actividades: [{
        id: 'COMP_08',
        nombre: 'Valor legacy incorrecto',
        tipo: 'intervalo',
        min_horas: 60,
        max_horas: 120,
      }],
    });

    await expect(service.getCatalogoActividadesComplementarias()).resolves.toEqual([expect.objectContaining({
      id: 'COMP_08',
      nombre: 'Coordinación escuela doctoral',
      tipo: 'intervalo',
      min_horas: 40,
      max_horas: 80,
    })]);
  });

  it('combina de forma coherente varias filas horarias del mismo bloque', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.getConfiguracionPTAGlobal = jest.fn().mockResolvedValue({
      comp_secciones: compSections,
      comp_actividades_v2: {
        complementarias_docencia: [{
          id: 'COMP_14',
          nombre: 'Examen de habilitación o segundo calificador',
          items: [
            { nombre: 'Por grupo', tipo: 'hasta', horas: 10 },
            { nombre: 'Individual', tipo: 'hasta', horas: 3 },
          ],
        }],
      },
    });

    await expect(service.getCatalogoActividadesComplementarias()).resolves.toEqual([expect.objectContaining({
      id: 'COMP_14',
      tipo: 'intervalo',
      min_horas: 1,
      max_horas: 13,
    })]);
  });

  it('conserva una clave de fila estable cuando el administrador reordena la configuración', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const first = { nombre: 'Por grupo', tipo: 'hasta', horas: 10 };
    const second = { nombre: 'Individual', tipo: 'hasta', horas: 3 };
    service.getConfiguracionPTAGlobal = jest.fn()
      .mockResolvedValueOnce({
        comp_secciones: compSections,
        comp_actividades_v2: {
          complementarias_docencia: [{ id: 'COMP_KEYS', nombre: 'Actividad', items: [first, second] }],
        },
      })
      .mockResolvedValueOnce({
        comp_secciones: compSections,
        comp_actividades_v2: {
          complementarias_docencia: [{ id: 'COMP_KEYS', nombre: 'Actividad', items: [second, first] }],
        },
      });

    const [before] = await service.getCatalogoActividadesComplementarias();
    const [after] = await service.getCatalogoActividadesComplementarias();
    const beforeKeys = Object.fromEntries(before.filas_reconocimiento.map((row: any) => [row.nombre, row.clave]));
    const afterKeys = Object.fromEntries(after.filas_reconocimiento.map((row: any) => [row.nombre, row.clave]));
    expect(afterKeys).toEqual(beforeKeys);
  });

  it('conserva cada reconocimiento cuando un bloque mezcla horas y porcentaje', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.getConfiguracionPTAGlobal = jest.fn().mockResolvedValue({
      comp_secciones: compSections,
      comp_actividades_v2: {
        complementarias_docencia: [{
          id: 'COMP_MIXTA',
          nombre: 'Actividad mixta',
          items: [
            { nombre: 'Base', tipo: 'fija', horas: 20 },
            { nombre: 'Dedicación', tipo: 'porcentaje', porcentaje_pta: 10 },
          ],
        }],
      },
    });

    await expect(service.getCatalogoActividadesComplementarias()).resolves.toEqual([
      expect.objectContaining({
        id: 'COMP_MIXTA',
        filas_reconocimiento: [
          expect.objectContaining({ tipo: 'fija', max_horas: 20 }),
          expect.objectContaining({ tipo: 'porcentaje', porcentaje_pta: 10 }),
        ],
      }),
    ]);
  });

  it('respeta horas fijas de una tabla simple sin filas', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.getConfiguracionPTAGlobal = jest.fn().mockResolvedValue({
      comp_secciones: [{ ...compSections[1], columnas: [] }],
      comp_actividades_v2: {
        academico_administrativas: [{
          id: 'AADM_01',
          nombre: 'Cargo directivo',
          tipo: 'fija',
          max_horas: 200,
          items: [],
        }],
      },
    });

    await expect(service.getCatalogoActividadesAcademicoAdmin()).resolves.toEqual([expect.objectContaining({
      id: 'AADM_01',
      tipo: 'fija',
      max_horas: 200,
    })]);
  });

  it('no resucita el catálogo legacy cuando la sección v2 fue vaciada', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.getConfiguracionPTAGlobal = jest.fn().mockResolvedValue({
      comp_secciones: compSections,
      comp_actividades_v2: { complementarias_docencia: [] },
      comp_actividades: [{ id: 'COMP_01', nombre: 'Eliminada', max_horas: 20 }],
    });

    await expect(service.getCatalogoActividadesComplementarias()).resolves.toEqual([]);
  });

  it('rechaza en servidor horas fuera del intervalo realmente configurado', () => {
    const service = Object.create(PtaService.prototype) as any;
    const rules = {
      comp_secciones: compSections,
      comp_actividades_v2: {
        complementarias_docencia: [{
          id: 'COMP_08',
          nombre: 'Coordinación escuela doctoral',
          items: [{ nombre: 'Desde 40 hasta 80 horas', tipo: 'intervalo', horas_min: 40, horas: 80 }],
        }],
      },
    };

    expect(() => service.validatePtaForSubmission(
      {
        complementarias: [{
          actividad_id: 'COMP_08',
          seccion: 'complementarias_docencia',
          horas: 39,
        }],
      },
      { sumDocencia: 0, sumInv: 0, sumExt: 0, sumComp: 39, sumAcad: 0, total: 39 },
      800,
      rules,
    )).toThrow(BadRequestException);
  });

  it.each(['complementarias_docencia', 'academico_administrativas'])(
    'valida cada fila de %s y no solamente el rango agregado',
    (sectionKey) => {
      const service = Object.create(PtaService.prototype) as any;
      const activityId = sectionKey === 'academico_administrativas' ? 'AADM_ROWS' : 'COMP_ROWS';
      const rules = {
        comp_secciones: compSections,
        comp_actividades_v2: {
          [sectionKey]: [{
            id: activityId,
            nombre: 'Actividad con dos topes',
            items: [
              { nombre: 'Por grupo', tipo: 'hasta', horas: 10 },
              { nombre: 'Individual', tipo: 'hasta', horas: 3 },
            ],
          }],
        },
      };

      expect(() => service.validatePtaForSubmission(
        {
          complementarias: [{
            actividad_id: activityId,
            seccion: sectionKey,
            horas: 0,
            items_cantidades: { 0: 0, 1: 0 },
          }],
        },
        {
          sumDocencia: 0,
          sumInv: 0,
          sumExt: 0,
          sumComp: 0,
          sumAcad: 0,
          total: 0,
        },
        800,
        rules,
      )).toThrow('al menos 1h');
    },
  );

  it.each(['complementarias_docencia', 'academico_administrativas'])(
    'permite dejar una fila Hasta en 0 cuando otra fila de %s tiene horas',
    (sectionKey) => {
      const service = Object.create(PtaService.prototype) as any;
      const activityId = sectionKey === 'academico_administrativas' ? 'AADM_OPTIONAL' : 'COMP_OPTIONAL';
      const rules = {
        comp_secciones: compSections,
        comp_actividades_v2: {
          [sectionKey]: [{
            id: activityId,
            nombre: 'Alternativas',
            items: [
              { nombre: 'Primera', tipo: 'hasta', horas: 10 },
              { nombre: 'Segunda', tipo: 'hasta', horas: 3 },
            ],
          }],
        },
      };

      expect(() => service.validatePtaForSubmission(
        {
          complementarias: [{
            actividad_id: activityId,
            seccion: sectionKey,
            horas: 7,
            items_cantidades: { 0: 7, 1: 0 },
          }],
        },
        {
          sumDocencia: 0,
          sumInv: 0,
          sumExt: 0,
          sumComp: sectionKey === 'complementarias_docencia' ? 7 : 0,
          sumAcad: sectionKey === 'academico_administrativas' ? 7 : 0,
          total: 7,
        },
        800,
        rules,
      )).toThrow('Debe incluir al menos una asignatura');
    },
  );

  it('calcula en servidor un bloque mixto con porcentaje sobre las horas reales del PTA', () => {
    const service = Object.create(PtaService.prototype) as any;
    const rules = {
      comp_secciones: compSections,
      comp_actividades_v2: {
        complementarias_docencia: [{
          id: 'COMP_MIXTA',
          nombre: 'Actividad mixta',
          items: [
            { nombre: 'Base', tipo: 'fija', horas: 20 },
            { nombre: 'Dedicación', tipo: 'porcentaje', porcentaje_pta: 10 },
          ],
        }],
      },
    };

    expect(() => service.validatePtaForSubmission(
      {
        complementarias: [{
          actividad_id: 'COMP_MIXTA',
          seccion: 'complementarias_docencia',
          horas: 99,
        }],
      },
      { sumDocencia: 0, sumInv: 0, sumExt: 0, sumComp: 99, sumAcad: 0, total: 99 },
      800,
      rules,
    )).toThrow('debe registrar exactamente 100h');
  });

  it.each([
    ['fija', { tipo: 'fija', horas: 20 }, { tipo: 'fija', max_horas: 20, min_horas: undefined }],
    ['hasta', { tipo: 'hasta', horas: 30 }, { tipo: 'hasta', max_horas: 30, min_horas: undefined }],
    ['intervalo', { tipo: 'intervalo', horas_min: 12, horas: 40 }, { tipo: 'intervalo', min_horas: 12, max_horas: 40 }],
    ['porcentaje', { tipo: 'porcentaje', porcentaje_pta: 25, horas: 1 }, { tipo: 'porcentaje', porcentaje_pta: 25, max_horas: null }],
  ])('transporta completa la modalidad %s desde la fila configurada', async (_name, row, expected) => {
    const service = Object.create(PtaService.prototype) as any;
    service.getConfiguracionPTAGlobal = jest.fn().mockResolvedValue({
      comp_secciones: compSections,
      comp_actividades_v2: {
        complementarias_docencia: [{ id: `CUSTOM_${_name}`, nombre: String(_name), items: [row] }],
      },
    });

    const [catalogActivity] = await service.getCatalogoActividadesComplementarias();
    expect(catalogActivity).toEqual(expect.objectContaining(expected));
  });

  it('transporta las cuatro modalidades en Actividades Académico-Administrativas', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const rows = [
      { nombre: 'Exacta', tipo: 'fija', horas: 8 },
      { nombre: 'Máximo', tipo: 'hasta', horas: 20 },
      { nombre: 'Rango', tipo: 'intervalo', horas_min: 10, horas: 30 },
      { nombre: 'Porcentaje', tipo: 'porcentaje', porcentaje_pta: 25 },
    ];
    service.getConfiguracionPTAGlobal = jest.fn().mockResolvedValue({
      comp_secciones: compSections,
      comp_actividades_v2: {
        academico_administrativas: [{ id: 'AADM_MIXTA', nombre: 'Mixta', items: rows }],
      },
    });

    const [catalogActivity] = await service.getCatalogoActividadesAcademicoAdmin();
    expect(catalogActivity.filas_reconocimiento).toEqual([
      expect.objectContaining({ tipo: 'fija', max_horas: 8 }),
      expect.objectContaining({ tipo: 'hasta', max_horas: 20 }),
      expect.objectContaining({ tipo: 'intervalo', min_horas: 10, max_horas: 30 }),
      expect.objectContaining({ tipo: 'porcentaje', porcentaje_pta: 25 }),
    ]);
  });

  it.each([
    ['fija', { tipo: 'fija', horas: 20 }, 19],
    ['hasta', { tipo: 'hasta', horas: 30 }, 31],
    ['intervalo', { tipo: 'intervalo', horas_min: 12, horas: 40 }, 11],
    ['porcentaje', { tipo: 'porcentaje', porcentaje_pta: 25, horas: 1 }, 199],
  ])('valida en servidor la modalidad %s sin depender del ID', (_name, row, submittedHours) => {
    const service = Object.create(PtaService.prototype) as any;
    const activityId = `CUSTOM_${_name}`;
    const rules = {
      comp_secciones: compSections,
      comp_actividades_v2: {
        complementarias_docencia: [{ id: activityId, nombre: String(_name), items: [row] }],
      },
    };

    expect(() => service.validatePtaForSubmission(
      {
        complementarias: [{
          actividad_id: activityId,
          seccion: 'complementarias_docencia',
          horas: submittedHours,
        }],
      },
      { sumDocencia: 0, sumInv: 0, sumExt: 0, sumComp: submittedHours, sumAcad: 0, total: submittedHours },
      800,
      rules,
    )).toThrow(BadRequestException);
  });

  it('conserva las cuatro modalidades en las cuatro secciones de Extensión', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const sectionKeys = ['capacitacion', 'seleccion', 'fortalecimiento', 'alto_gobierno'];
    const configuredItems = [
      { nombre: 'Exacta', tipo: 'fija', horas: 8 },
      { nombre: 'Máximo', tipo: 'hasta', horas: 20 },
      { nombre: 'Rango', tipo: 'intervalo', horas_min: 10, horas: 30 },
      { nombre: 'Porcentaje', tipo: 'porcentaje', porcentaje_pta: 25, horas: 1 },
    ];
    service.getConfiguracionPTAGlobal = jest.fn().mockResolvedValue({
      ext_actividades: Object.fromEntries(sectionKeys.map((key, index) => [key, [{
        id: `EXT_${index + 1}`,
        nombre: key,
        items: configuredItems,
      }]])),
    });

    const catalog = await service.getCatalogoActividadesExtension();
    sectionKeys.forEach((key) => {
      expect(catalog[key][0].items).toEqual(configuredItems);
    });
  });

  it.each(['capacitacion', 'seleccion', 'fortalecimiento', 'alto_gobierno'])(
    'valida las modalidades configuradas en la sección de Extensión %s',
    (sectionKey) => {
      const service = Object.create(PtaService.prototype) as any;
      const rules = {
        ext_secciones: [{
          key: sectionKey,
          label: sectionKey,
          color: '#2563EB',
          orden: 1,
          multiplicador: 1,
          columnas: ['_items_'],
        }],
        ext_actividades: {
          [sectionKey]: [{
            id: `EXT_${sectionKey}`,
            nombre: sectionKey,
            items: [{ nombre: 'Rango', tipo: 'intervalo', horas_min: 10, horas: 30 }],
          }],
        },
      };

      expect(() => service.validatePtaForSubmission(
        {
          extension_actividades: [{
            actividad_id: `EXT_${sectionKey}`,
            seccion: sectionKey,
            horas: 9,
            items_cantidades: { 0: 9 },
          }],
        },
        { sumDocencia: 0, sumInv: 0, sumExt: 9, sumComp: 0, sumAcad: 0, total: 9 },
        800,
        rules,
      )).toThrow(BadRequestException);
    },
  );

  it.each(['capacitacion', 'seleccion', 'fortalecimiento', 'alto_gobierno'])(
    'permite una fila Hasta en 0 si otra fila de Extensión %s tiene horas',
    (sectionKey) => {
      const service = Object.create(PtaService.prototype) as any;
      const activityId = `EXT_OPTIONAL_${sectionKey}`;
      const rules = {
        ext_secciones: [{
          key: sectionKey,
          label: sectionKey,
          color: '#2563EB',
          orden: 1,
          multiplicador: 1,
          columnas: ['_items_'],
        }],
        ext_actividades: {
          [sectionKey]: [{
            id: activityId,
            nombre: 'Alternativas',
            items: [
              { nombre: 'Primera', tipo: 'hasta', horas: 13 },
              { nombre: 'Segunda', tipo: 'hasta', horas: 3 },
            ],
          }],
        },
      };

      expect(() => service.validatePtaForSubmission(
        {
          extension_actividades: [{
            actividad_id: activityId,
            seccion: sectionKey,
            horas: 5,
            items_cantidades: { 0: 5, 1: 0 },
          }],
        },
        { sumDocencia: 0, sumInv: 0, sumExt: 5, sumComp: 0, sumAcad: 0, total: 5 },
        800,
        rules,
      )).toThrow('Debe incluir al menos una asignatura');
    },
  );

  it('rechaza una actividad de Extensión con todas sus filas Hasta en 0', () => {
    const service = Object.create(PtaService.prototype) as any;
    const rules = {
      ext_secciones: [{
        key: 'seleccion',
        label: 'Selección',
        color: '#0284C7',
        orden: 2,
        multiplicador: 1,
        columnas: ['_items_'],
      }],
      ext_actividades: {
        seleccion: [{
          id: 'EXT_ZERO',
          nombre: 'Alternativas vacías',
          items: [
            { nombre: 'Primera', tipo: 'hasta', horas: 13 },
            { nombre: 'Segunda', tipo: 'hasta', horas: 3 },
          ],
        }],
      },
    };

    expect(() => service.validatePtaForSubmission(
      {
        extension_actividades: [{
          actividad_id: 'EXT_ZERO',
          seccion: 'seleccion',
          horas: 0,
          items_cantidades: { 0: 0, 1: 0 },
        }],
      },
      { sumDocencia: 0, sumInv: 0, sumExt: 0, sumComp: 0, sumAcad: 0, total: 0 },
      800,
      rules,
    )).toThrow('al menos 1h');
  });

  it.each([
    ['fija', { tipo: 'fija', max_horas: 20 }, 19],
    ['hasta', { tipo: 'hasta', max_horas: 30 }, 31],
    ['intervalo', { tipo: 'intervalo', min_horas: 12, max_horas: 40 }, 11],
    ['porcentaje', { tipo: 'porcentaje', porcentaje_pta: 25 }, 199],
  ])('valida en servidor una tabla simple de Extensión con modalidad %s', (_name, recognition, submittedHours) => {
    const service = Object.create(PtaService.prototype) as any;
    const activityId = `EXT_ROOT_${_name}`;
    const rules = {
      ext_secciones: [{
        key: 'fortalecimiento',
        label: 'Fortalecimiento',
        color: '#7C3AED',
        orden: 3,
        multiplicador: 1,
        columnas: [],
      }],
      ext_actividades: {
        fortalecimiento: [{ id: activityId, nombre: String(_name), ...recognition }],
      },
    };

    expect(() => service.validatePtaForSubmission(
      {
        extension_actividades: [{
          actividad_id: activityId,
          seccion: 'fortalecimiento',
          horas: submittedHours,
        }],
      },
      { sumDocencia: 0, sumInv: 0, sumExt: submittedHours, sumComp: 0, sumAcad: 0, total: submittedHours },
      800,
      rules,
    )).toThrow(BadRequestException);
  });

  it('valida cada fila configurada de Extensión y no solamente el total del bloque', () => {
    const service = Object.create(PtaService.prototype) as any;
    const rules = {
      ext_secciones: [{
        key: 'fortalecimiento',
        label: 'Fortalecimiento',
        color: '#7C3AED',
        orden: 3,
        multiplicador: 1,
        columnas: ['_items_'],
      }],
      ext_actividades: {
        fortalecimiento: [{
          id: 'EXT_ROWS',
          nombre: 'Filas mixtas',
          items: [
            { nombre: 'Exacta', tipo: 'fija', horas: 20 },
            { nombre: 'Máximo', tipo: 'hasta', horas: 30 },
            { nombre: 'Rango', tipo: 'intervalo', horas_min: 12, horas: 40 },
            { nombre: 'Porcentaje', tipo: 'porcentaje', porcentaje_pta: 10 },
          ],
        }],
      },
    };

    expect(() => service.validatePtaForSubmission(
      {
        extension_actividades: [{
          actividad_id: 'EXT_ROWS',
          seccion: 'fortalecimiento',
          horas: 131,
          items_cantidades: { 0: 19, 1: 20, 2: 12, 3: 80 },
        }],
      },
      { sumDocencia: 0, sumInv: 0, sumExt: 131, sumComp: 0, sumAcad: 0, total: 131 },
      800,
      rules,
    )).toThrow(BadRequestException);
  });
});
