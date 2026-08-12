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
  it('rechaza en servidor el reordenamiento de columnas configuradas', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const save = jest.fn();
    service.configuracionRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'pta_rules_v2',
        rules: {
          ext_secciones: [{
            key: 'fortalecimiento',
            label: 'Fortalecimiento',
            columnas: ['_items_', 'Evidencia', 'Rol'],
          }],
        },
      }),
      save,
    };

    const result = await service.saveConfiguracionPTAGlobal({
      ext_secciones: [{
        key: 'fortalecimiento',
        label: 'Fortalecimiento',
        columnas: ['Rol', '_items_', 'Evidencia'],
      }],
    });

    expect(result).toEqual(expect.objectContaining({
      _error: expect.stringContaining('No se puede cambiar el orden de las columnas'),
    }));
    expect(save).not.toHaveBeenCalled();
  });

  it('permite agregar una columna al final sin alterar el orden existente', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const existing = {
      id: 'pta_rules_v2',
      rules: {
        ext_secciones: [{
          key: 'fortalecimiento',
          label: 'Fortalecimiento',
          columnas: ['_items_', 'Evidencia'],
        }],
      },
    };
    const save = jest.fn().mockImplementation(async (row: any) => row);
    service.configuracionRepo = {
      findOne: jest.fn().mockResolvedValue(existing),
      save,
    };
    service.notifyConfigChange = jest.fn().mockResolvedValue(undefined);

    const result = await service.saveConfiguracionPTAGlobal({
      ext_secciones: [{
        key: 'fortalecimiento',
        label: 'Fortalecimiento',
        columnas: ['_items_', 'Evidencia', 'Rol'],
      }],
    });

    expect(result._error).toBeUndefined();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('mantiene las referencias y la clasificación del arreglo académico-administrativo legacy', () => {
    const service = Object.create(PtaService.prototype) as any;
    const legacyActivity = {
      actividad_id: 'AA_LEGACY',
      nombre: 'Actividad administrativa anterior',
      horas: 16,
    };
    const result = service.readComplementariasSecciones({
      complementarias: [],
      academico_admin: [legacyActivity],
    });

    expect(result.docencia).toEqual([]);
    expect(result.aadm).toEqual([legacyActivity]);
    expect(result.all).toEqual([legacyActivity]);
    expect(result.aadm[0]).toBe(legacyActivity);
  });

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

  it('entrega las ramificaciones configuradas debajo de la fila que reconoce horas', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.getConfiguracionPTAGlobal = jest.fn().mockResolvedValue({
      comp_secciones: [{
        key: 'complementarias_docencia',
        label: 'Complementarias',
        columnas: ['Línea', '_items_', 'Evidencias'],
        columna_items_nombre: 'Actividad',
      }],
      comp_actividades_v2: {
        complementarias_docencia: [{
          id: 'COMP_TREE',
          nombre: 'Acompañamiento',
          columnas_valores: { Línea: ['20 horas por estudiante'] },
          columnas_meta: { Línea: [{ tipo: 'hasta', horas: 20, horas_en: 'linea' }] },
          items: [
            {
              nombre: 'Práctica administrativa',
              parent_col_idx: 0,
              col_valores: { Evidencias: ['Informe final'] },
            },
            {
              nombre: 'Proyecto aplicado',
              parent_col_idx: 0,
              col_valores: { Evidencias: ['Producto entregado'] },
            },
          ],
        }],
      },
    });

    const [activity] = await service.getCatalogoActividadesComplementarias();
    expect(activity.requiere_seleccion_jerarquica).toBe(true);
    expect(activity.filas_reconocimiento).toEqual([
      expect.objectContaining({
        nombre: '20 horas por estudiante',
        max_horas: 20,
        ramificaciones: [
          expect.objectContaining({
            nombre: 'Informe final',
            ruta: [
              { columna: 'Actividad', valor: 'Práctica administrativa' },
              { columna: 'Evidencias', valor: 'Informe final' },
            ],
          }),
          expect.objectContaining({
            nombre: 'Producto entregado',
            ruta: [
              { columna: 'Actividad', valor: 'Proyecto aplicado' },
              { columna: 'Evidencias', valor: 'Producto entregado' },
            ],
          }),
        ],
      }),
    ]);
  });

  it('transporta y valida las horas configuradas en columnas secundarias profundas', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const section = {
      key: 'complementarias_docencia',
      label: 'Complementarias',
      columnas: ['Linea', '_items_', 'Evidencia', 'Rol'],
      columna_items_nombre: 'Actividad',
    };
    const rules = {
      comp_secciones: [section],
      comp_actividades_v2: {
        complementarias_docencia: [{
          id: 'COMP_DEEP_HOURS',
          nombre: 'Bloque multinivel',
          columnas_valores: { Linea: ['Solo informacion'] },
          columnas_meta: { Linea: [{ tipo: 'sin_horas', horas_en: 'linea' }] },
          items: [{
            nombre: 'Actividad institucional',
            parent_col_idx: 0,
            col_valores: { Evidencia: ['Informe'], Rol: ['Responsable'] },
            col_parents: { Rol: [0] },
            col_meta: {
              Evidencia: [{ tipo: 'sin_horas' }],
              Rol: [{ tipo: 'fija', horas: 5 }],
            },
          }],
        }],
      },
    };
    service.getConfiguracionPTAGlobal = jest.fn().mockResolvedValue(rules);

    const [catalogActivity] = await service.getCatalogoActividadesComplementarias();
    const row = catalogActivity.filas_reconocimiento[0];
    const branch = row.ramificaciones[0];
    expect(row).toEqual(expect.objectContaining({ tipo: 'sin_horas', max_horas: 0 }));
    expect(branch.ruta).toEqual([
      { columna: 'Actividad', valor: 'Actividad institucional' },
      { columna: 'Evidencia', valor: 'Informe', reconocimiento: { tipo: 'sin_horas' } },
      { columna: 'Rol', valor: 'Responsable', reconocimiento: { tipo: 'fija', horas: 5 } },
    ]);

    const submittedActivity: any = {
      actividad_id: 'COMP_DEEP_HOURS',
      seccion: 'complementarias_docencia',
      horas: 5,
      filas_seleccionadas: [row.clave],
      filas_cantidades: { [row.clave]: 0 },
      ramificaciones_seleccionadas: { [row.clave]: [branch.clave] },
      ramificaciones_cantidades: { [row.clave]: { [branch.clave]: 5 } },
    };
    expect(() => service.validatePtaForSubmission(
      { complementarias: [submittedActivity] },
      { sumDocencia: 0, sumInv: 0, sumExt: 0, sumComp: 5, sumAcad: 0, total: 5 },
      800,
      rules,
    )).toThrow('Debe incluir al menos una asignatura');
    expect(submittedActivity.ramificaciones_cantidades).toEqual({
      [row.clave]: { [branch.clave]: 5 },
    });
    expect(submittedActivity.seleccion_jerarquica[0].horas).toBe(5);
  });

  it('permite seleccionar una opción informativa sin exigir ni mostrar horas', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const rules = {
      comp_secciones: compSections,
      comp_actividades_v2: {
        complementarias_docencia: [{
          id: 'COMP_INFORMATIONAL',
          nombre: 'Registro informativo',
          items: [{ nombre: 'Opcion sin horas', tipo: 'sin_horas' }],
        }],
      },
    };
    service.getConfiguracionPTAGlobal = jest.fn().mockResolvedValue(rules);
    const [catalogActivity] = await service.getCatalogoActividadesComplementarias();
    const row = catalogActivity.filas_reconocimiento[0];

    expect(row).toEqual(expect.objectContaining({ tipo: 'sin_horas', max_horas: 0 }));
    expect(() => service.validatePtaForSubmission(
      {
        complementarias: [{
          actividad_id: 'COMP_INFORMATIONAL',
          seccion: 'complementarias_docencia',
          horas: 0,
          filas_seleccionadas: [row.clave],
          filas_cantidades: { [row.clave]: 0 },
          ramificaciones_seleccionadas: {},
        }],
      },
      { sumDocencia: 0, sumInv: 0, sumExt: 0, sumComp: 0, sumAcad: 0, total: 0 },
      800,
      rules,
    )).toThrow('El PTA no tiene horas programadas (0h)');
  });

  it('valida únicamente las filas seleccionadas sin obligar a sumar todo el bloque', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const rules = {
      comp_secciones: compSections,
      comp_actividades_v2: {
        complementarias_docencia: [{
          id: 'COMP_SUBSET',
          nombre: 'Bloque combinable',
          items: [
            { nombre: 'Opción 20', tipo: 'fija', horas: 20 },
            { nombre: 'Opción 30', tipo: 'fija', horas: 30 },
          ],
        }],
      },
    };
    service.getConfiguracionPTAGlobal = jest.fn().mockResolvedValue(rules);
    const [catalogActivity] = await service.getCatalogoActividadesComplementarias();
    const selectedKey = catalogActivity.filas_reconocimiento[0].clave;

    expect(() => service.validatePtaForSubmission(
      {
        complementarias: [{
          actividad_id: 'COMP_SUBSET',
          seccion: 'complementarias_docencia',
          horas: 20,
          filas_seleccionadas: [selectedKey],
          filas_cantidades: { [selectedKey]: 20 },
          ramificaciones_seleccionadas: {},
        }],
      },
      { sumDocencia: 0, sumInv: 0, sumExt: 0, sumComp: 20, sumAcad: 0, total: 20 },
      800,
      rules,
    )).toThrow('Debe incluir al menos una asignatura');
  });

  it('rechaza ramificaciones que no pertenecen a la configuración vigente', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const section = {
      key: 'complementarias_docencia',
      label: 'Complementarias',
      columnas: ['Línea', '_items_'],
    };
    const rules = {
      comp_secciones: [section],
      comp_actividades_v2: {
        complementarias_docencia: [{
          id: 'COMP_BRANCH_VALIDATION',
          nombre: 'Bloque',
          columnas_valores: { Línea: ['Fila'] },
          columnas_meta: { Línea: [{ tipo: 'fija', horas: 20, horas_en: 'linea' }] },
          items: [{ nombre: 'Ramificación válida', parent_col_idx: 0 }],
        }],
      },
    };
    service.getConfiguracionPTAGlobal = jest.fn().mockResolvedValue(rules);
    const [catalogActivity] = await service.getCatalogoActividadesComplementarias();
    const row = catalogActivity.filas_reconocimiento[0];

    expect(() => service.validatePtaForSubmission(
      {
        complementarias: [{
          actividad_id: 'COMP_BRANCH_VALIDATION',
          seccion: 'complementarias_docencia',
          horas: 20,
          filas_seleccionadas: [row.clave],
          filas_cantidades: { [row.clave]: 20 },
          ramificaciones_seleccionadas: { [row.clave]: ['ramificacion-inventada'] },
        }],
      },
      { sumDocencia: 0, sumInv: 0, sumExt: 0, sumComp: 20, sumAcad: 0, total: 20 },
      800,
      rules,
    )).toThrow('ramificación inválida');
  });

  it('mantiene válido un PTA anterior sin marcadores jerárquicos ni redistribuye su total', () => {
    const service = Object.create(PtaService.prototype) as any;
    const rules = {
      comp_secciones: [{
        key: 'complementarias_docencia',
        label: 'Complementarias',
        columnas: ['Línea', '_items_'],
      }],
      comp_actividades_v2: {
        complementarias_docencia: [{
          id: 'COMP_LEGACY_TREE',
          nombre: 'Actividad histórica',
          columnas_valores: { Línea: ['Hasta 20 horas'] },
          columnas_meta: { Línea: [{ tipo: 'hasta', horas: 20, horas_en: 'linea' }] },
          items: [{ nombre: 'Detalle configurado', parent_col_idx: 0 }],
        }],
      },
    };
    const legacyActivity = {
      actividad_id: 'COMP_LEGACY_TREE',
      seccion: 'complementarias_docencia',
      horas: 12,
    };

    expect(() => service.validatePtaForSubmission(
      { complementarias: [legacyActivity] },
      { sumDocencia: 0, sumInv: 0, sumExt: 0, sumComp: 12, sumAcad: 0, total: 12 },
      800,
      rules,
    )).toThrow('Debe incluir al menos una asignatura');
    expect(legacyActivity).toEqual({
      actividad_id: 'COMP_LEGACY_TREE',
      seccion: 'complementarias_docencia',
      horas: 12,
    });
  });

  it('completa de forma compatible las ramificaciones de una transición parcial', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const rules = {
      comp_secciones: [{
        key: 'complementarias_docencia',
        label: 'Complementarias',
        columnas: ['Línea', '_items_'],
      }],
      comp_actividades_v2: {
        complementarias_docencia: [{
          id: 'COMP_TRANSITION',
          nombre: 'Actividad en transición',
          columnas_valores: { Línea: ['20 horas'] },
          columnas_meta: { Línea: [{ tipo: 'fija', horas: 20, horas_en: 'linea' }] },
          items: [{ nombre: 'Ramificación existente', parent_col_idx: 0 }],
        }],
      },
    };
    service.getConfiguracionPTAGlobal = jest.fn().mockResolvedValue(rules);
    const [catalogActivity] = await service.getCatalogoActividadesComplementarias();
    const row = catalogActivity.filas_reconocimiento[0];
    const submittedActivity: any = {
      actividad_id: 'COMP_TRANSITION',
      seccion: 'complementarias_docencia',
      horas: 20,
      filas_seleccionadas: [row.clave],
      filas_cantidades: { [row.clave]: 20, 'fila-obsoleta': 999 },
      items_cantidades: { 0: 20, 99: 999 },
      // La primera versión transitoria todavía no persistía este mapa.
      ramificaciones_seleccionadas: undefined,
    };

    expect(() => service.validatePtaForSubmission(
      { complementarias: [submittedActivity] },
      { sumDocencia: 0, sumInv: 0, sumExt: 0, sumComp: 20, sumAcad: 0, total: 20 },
      800,
      rules,
    )).toThrow('Debe incluir al menos una asignatura');
    expect(submittedActivity.ramificaciones_seleccionadas[row.clave]).toEqual(
      row.ramificaciones.map((branch: any) => branch.clave),
    );
    expect(submittedActivity.filas_cantidades).toEqual({ [row.clave]: 20 });
    expect(submittedActivity.items_cantidades).toEqual({ 0: 20 });
    expect(submittedActivity.seleccion_jerarquica[0]).toEqual(expect.objectContaining({
      clave: row.clave,
      horas: 20,
      ramificaciones: row.ramificaciones.map((branch: any) => ({ ...branch, horas: 0 })),
    }));
  });

  it('permite seleccionar una actividad padre sin exigir sus evidencias', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const rules = {
      comp_secciones: [{
        key: 'complementarias_docencia',
        label: 'Complementarias',
        columnas: ['Línea', '_items_', 'Evidencias'],
        columna_items_nombre: 'Actividad',
      }],
      comp_actividades_v2: {
        complementarias_docencia: [{
          id: 'COMP_PARENT_SELECTION',
          nombre: 'Bloque jerárquico',
          columnas_valores: { Línea: ['20 horas'] },
          columnas_meta: { Línea: [{ tipo: 'fija', horas: 20, horas_en: 'linea' }] },
          items: [{
            nombre: 'Acompañamiento institucional',
            parent_col_idx: 0,
            col_valores: { Evidencias: ['Informe', 'Acta'] },
          }],
        }],
      },
    };
    service.getConfiguracionPTAGlobal = jest.fn().mockResolvedValue(rules);
    const [catalogActivity] = await service.getCatalogoActividadesComplementarias();
    const row = catalogActivity.filas_reconocimiento[0];
    const parentKey = 'grupo:actividad:acompanamiento-institucional';
    const submittedActivity: any = {
      actividad_id: 'COMP_PARENT_SELECTION',
      seccion: 'complementarias_docencia',
      horas: 20,
      filas_seleccionadas: [row.clave],
      filas_cantidades: { [row.clave]: 20 },
      ramificaciones_seleccionadas: { [row.clave]: [parentKey] },
    };

    expect(() => service.validatePtaForSubmission(
      { complementarias: [submittedActivity] },
      { sumDocencia: 0, sumInv: 0, sumExt: 0, sumComp: 20, sumAcad: 0, total: 20 },
      800,
      rules,
    )).toThrow('Debe incluir al menos una asignatura');
    expect(submittedActivity.ramificaciones_seleccionadas).toEqual({
      [row.clave]: [parentKey],
    });
    expect(submittedActivity.seleccion_jerarquica[0].ramificaciones).toEqual([{
      clave: parentKey,
      nombre: 'Acompañamiento institucional',
      ruta: [{ columna: 'Actividad', valor: 'Acompañamiento institucional' }],
      horas: 0,
    }]);
  });

  it('permite combinar padre e hijo y cobra solo el reconocimiento de cada selección explícita', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const rules = {
      comp_secciones: [{
        key: 'complementarias_docencia',
        label: 'Complementarias',
        columnas: ['Línea', '_items_', 'Evidencias'],
        columna_items_nombre: 'Actividad',
      }],
      comp_actividades_v2: {
        complementarias_docencia: [{
          id: 'COMP_OVERLAPPING_SELECTION',
          nombre: 'Bloque jerárquico',
          columnas_valores: { Línea: ['Información general'] },
          columnas_meta: { Línea: [{ tipo: 'sin_horas', horas_en: 'linea' }] },
          items: [{
            nombre: 'Acompañamiento institucional',
            parent_col_idx: 0,
            tipo: 'fija',
            horas: 10,
            col_valores: { Evidencias: ['Informe'] },
            col_meta: { Evidencias: [{ tipo: 'hasta', horas: 100 }] },
          }],
        }],
      },
    };
    service.getConfiguracionPTAGlobal = jest.fn().mockResolvedValue(rules);
    const [catalogActivity] = await service.getCatalogoActividadesComplementarias();
    const row = catalogActivity.filas_reconocimiento[0];
    const parentKey = 'grupo:actividad:acompanamiento-institucional';
    const childKey = row.ramificaciones[0].clave;
    const submittedActivity: any = {
      actividad_id: 'COMP_OVERLAPPING_SELECTION',
      seccion: 'complementarias_docencia',
      horas: 40,
      filas_seleccionadas: [row.clave],
      filas_cantidades: { [row.clave]: 0 },
      ramificaciones_seleccionadas: {
        [row.clave]: [parentKey, childKey],
      },
      ramificaciones_cantidades: {
        [row.clave]: { [parentKey]: 10, [childKey]: 30 },
      },
    };

    expect(() => service.validatePtaForSubmission(
      {
        complementarias: [submittedActivity],
      },
      { sumDocencia: 0, sumInv: 0, sumExt: 0, sumComp: 40, sumAcad: 0, total: 40 },
      800,
      rules,
    )).toThrow('Debe incluir al menos una asignatura');
    expect(submittedActivity.ramificaciones_cantidades[row.clave]).toEqual({
      [parentKey]: 10,
      [childKey]: 30,
    });
    expect(submittedActivity.seleccion_jerarquica[0]).toEqual(expect.objectContaining({
      horas: 40,
      horas_base: 0,
      ramificaciones: [
        expect.objectContaining({ clave: parentKey, horas: 10 }),
        expect.objectContaining({ clave: childKey, horas: 30 }),
      ],
    }));
  });

  it('permite seleccionar un hijo sin seleccionar ni cobrar las horas del padre', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const rules = {
      comp_secciones: [{
        key: 'complementarias_docencia',
        label: 'Complementarias',
        columnas: ['Línea', '_items_', 'Evidencias'],
        columna_items_nombre: 'Actividad',
      }],
      comp_actividades_v2: {
        complementarias_docencia: [{
          id: 'COMP_CHILD_ONLY',
          nombre: 'Bloque independiente',
          columnas_valores: { Línea: ['Información general'] },
          columnas_meta: { Línea: [{ tipo: 'sin_horas', horas_en: 'linea' }] },
          items: [{
            nombre: 'Padre con horas',
            parent_col_idx: 0,
            tipo: 'fija',
            horas: 10,
            col_valores: { Evidencias: ['Hijo elegible'] },
            col_meta: { Evidencias: [{ tipo: 'hasta', horas: 100 }] },
          }],
        }],
      },
    };
    service.getConfiguracionPTAGlobal = jest.fn().mockResolvedValue(rules);
    const [catalogActivity] = await service.getCatalogoActividadesComplementarias();
    const row = catalogActivity.filas_reconocimiento[0];
    const childKey = row.ramificaciones[0].clave;
    const submittedActivity: any = {
      actividad_id: 'COMP_CHILD_ONLY',
      seccion: 'complementarias_docencia',
      horas: 25,
      filas_seleccionadas: [row.clave],
      filas_cantidades: { [row.clave]: 0 },
      ramificaciones_seleccionadas: { [row.clave]: [childKey] },
      ramificaciones_cantidades: { [row.clave]: { [childKey]: 25 } },
    };

    expect(() => service.validatePtaForSubmission(
      { complementarias: [submittedActivity] },
      { sumDocencia: 0, sumInv: 0, sumExt: 0, sumComp: 25, sumAcad: 0, total: 25 },
      800,
      rules,
    )).toThrow('Debe incluir al menos una asignatura');
    expect(submittedActivity.ramificaciones_seleccionadas[row.clave]).toEqual([childKey]);
    expect(submittedActivity.ramificaciones_cantidades[row.clave]).toEqual({ [childKey]: 25 });
    expect(submittedActivity.seleccion_jerarquica[0]).toEqual(expect.objectContaining({
      horas: 25,
      ramificaciones: [expect.objectContaining({ clave: childKey, horas: 25 })],
    }));
  });

  it('no permite omitir las horas de filas seleccionadas en el formato nuevo', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const rules = {
      comp_secciones: compSections,
      comp_actividades_v2: {
        complementarias_docencia: [{
          id: 'COMP_WITHOUT_ROW_HOURS',
          nombre: 'Actividad incompleta',
          items: [{ nombre: 'Fila fija', tipo: 'fija', horas: 20 }],
        }],
      },
    };
    service.getConfiguracionPTAGlobal = jest.fn().mockResolvedValue(rules);
    const [catalogActivity] = await service.getCatalogoActividadesComplementarias();
    const row = catalogActivity.filas_reconocimiento[0];

    expect(() => service.validatePtaForSubmission(
      {
        complementarias: [{
          actividad_id: 'COMP_WITHOUT_ROW_HOURS',
          seccion: 'complementarias_docencia',
          horas: 20,
          filas_seleccionadas: [row.clave],
          ramificaciones_seleccionadas: {},
        }],
      },
      { sumDocencia: 0, sumInv: 0, sumExt: 0, sumComp: 20, sumAcad: 0, total: 20 },
      800,
      rules,
    )).toThrow('no tiene horas registradas para sus opciones seleccionadas');
  });

  it('usa en Extensión las mismas claves filtradas que el portal cuando existen filas informativas', () => {
    const service = Object.create(PtaService.prototype) as any;
    const rowKey = 'nombre:con-horas#1';
    const branchKey = 'actividad:detalle-ejecutable/evidencia:acta-final#1';
    const rules = {
      ext_secciones: [{
        key: 'fortalecimiento',
        label: 'Fortalecimiento',
        multiplicador: 1,
        columnas: ['Línea', '_items_', 'Evidencia'],
        columna_items_nombre: 'Actividad',
      }],
      ext_actividades: {
        fortalecimiento: [{
          id: 'EXT_FILTERED_TREE',
          nombre: 'Bloque con fila informativa',
          columnas_valores: { Línea: ['Solo información', 'Con horas'] },
          columnas_meta: {
            Línea: [
              { tipo: 'hasta', horas: 0, horas_en: 'linea' },
              { tipo: 'fija', horas: 20, horas_en: 'linea' },
            ],
          },
          items: [
            { nombre: 'Texto auxiliar', parent_col_idx: 0 },
            {
              nombre: 'Detalle ejecutable',
              parent_col_idx: 1,
              col_valores: { Evidencia: ['Acta final'] },
            },
          ],
        }],
      },
    };
    const submittedActivity: any = {
      actividad_id: 'EXT_FILTERED_TREE',
      seccion: 'fortalecimiento',
      horas: 20,
      horas_ejecutadas: 20,
      filas_seleccionadas: [rowKey],
      filas_cantidades: { [rowKey]: 20 },
      ramificaciones_seleccionadas: { [rowKey]: [branchKey] },
    };

    expect(() => service.validatePtaForSubmission(
      { extension_actividades: [submittedActivity] },
      { sumDocencia: 0, sumInv: 0, sumExt: 20, sumComp: 0, sumAcad: 0, total: 20 },
      800,
      rules,
    )).toThrow('Debe incluir al menos una asignatura');
    expect(submittedActivity.seleccion_jerarquica[0]).toEqual(expect.objectContaining({
      clave: rowKey,
      horas: 20,
      ramificaciones: [expect.objectContaining({ clave: branchKey, nombre: 'Acta final' })],
    }));
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
