import { describe, expect, it } from 'vitest';
import {
  formatHierarchySelectionText,
  getHierarchySelectionInfo,
} from './extensionSelection';

describe('HierarchySelectionSummary & extensionSelection hours display', () => {
  it('displays parent selection hours when branch.horas is 0 (as in live submitted PTAs)', () => {
    const activity = {
      nombre: 'Asistencia Técnica Territorial',
      horas: 10,
      seleccion_jerarquica: [
        {
          clave: 'etapa-bateria',
          etiqueta: 'ETAPA',
          nombre: 'Batería de indicadores para medir los resultados y el impacto de la Asistencia Técnica realizada en los municipios priorizados',
          horas: 10,
          horas_base: 10,
          reconocimiento: { tipo: 'hasta', max_horas: 80 },
          ramificaciones: [
            {
              clave: 'opcion-proponer',
              nombre: 'Proponer/presentar una propuesta de batería de indicadores que permitan medir los resultados y el impacto de las Asistencias Técnicas Territoriales Realizadas',
              horas: 0,
              ruta: [
                {
                  columna: 'Actividad',
                  valor: 'Proponer/presentar una propuesta de batería de indicadores que permitan medir los resultados y el impacto de las Asistencias Técnicas Territoriales Realizadas',
                },
              ],
            },
          ],
        },
      ],
    };

    const text = formatHierarchySelectionText(activity);
    expect(text).toContain('[10h]');
    expect(text).not.toContain('[0h]');

    const info = getHierarchySelectionInfo(activity);
    expect(info).toHaveLength(1);
    expect(info[0].horas).toBe(10);
    expect(info[0].ramificaciones).toHaveLength(1);
  });

  it('displays specific branch hours when explicitly assigned on the branch', () => {
    const activity = {
      nombre: 'Actividad con ramas horarias',
      horas: 30,
      seleccion_jerarquica: [
        {
          clave: 'bloque-1',
          etiqueta: 'ACTIVIDAD / ÍTEM',
          nombre: 'Ítem con subopciones',
          horas: 30,
          horas_base: 30,
          ramificaciones: [
            {
              clave: 'rama-1',
              nombre: 'Subopción A',
              horas: 15,
              ruta: [{ columna: 'Tipo', valor: 'Subopción A' }],
            },
            {
              clave: 'rama-2',
              nombre: 'Subopción B',
              horas: 15,
              ruta: [{ columna: 'Tipo', valor: 'Subopción B' }],
            },
          ],
        },
      ],
    };

    const text = formatHierarchySelectionText(activity);
    expect(text).toContain('[15h]');
  });
});
