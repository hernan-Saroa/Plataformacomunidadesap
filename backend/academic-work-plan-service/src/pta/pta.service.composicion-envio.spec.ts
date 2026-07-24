import { BadRequestException } from '@nestjs/common';
import { PtaService } from './pta.service';

describe('PtaService - composicion permitida al enviar el PTA', () => {
  const service = Object.create(PtaService.prototype) as any;
  const rules = {
    max_pct_investigacion: 50,
    max_horas_investigacion_global: 400,
    max_pct_extension: 25,
    max_horas_extension_global: 200,
    max_pct_complementarias: 25,
    max_horas_complementarias_global: 200,
  };
  const asignatura = {
    asignatura_id: 'asignatura-1',
    asignatura_nombre: 'Administracion Publica',
    programa_id: 'programa-1',
    creditos: 3,
    total_horas: 600,
    fecha_inicio: '2026-07-01',
    fecha_fin: '2026-07-31',
  };

  it('permite enviar un PTA compuesto solo por Docencia y Complementarias', () => {
    const body = {
      tipo_vinculacion: 'CARRERA',
      asignaturas: [asignatura],
      investigacion_proyecto: null,
      investigacion_actividades: [],
      extension_actividades: [],
      complementarias: [{
        actividad_id: 'complementaria-1',
        nombre: 'Actividad complementaria',
        seccion: 'complementarias_docencia',
        horas: 200,
      }],
    };
    const hours = service.computeHorasTotales(body);

    expect(hours).toMatchObject({
      sumDocencia: 600,
      sumInv: 0,
      sumExt: 0,
      sumComp: 200,
      total: 800,
    });
    expect(() => service.validatePtaForSubmission(body, hours, 800, rules))
      .not.toThrow();
  });

  it('conserva la validacion de Actividades Complementarias obligatorias', () => {
    const body = {
      tipo_vinculacion: 'CARRERA',
      asignaturas: [{ ...asignatura, total_horas: 800 }],
      investigacion_proyecto: null,
      investigacion_actividades: [],
      extension_actividades: [],
      complementarias: [],
    };
    const hours = service.computeHorasTotales(body);

    expect(() => service.validatePtaForSubmission(body, hours, 800, rules))
      .toThrow(BadRequestException);
    expect(() => service.validatePtaForSubmission(body, hours, 800, rules))
      .toThrow(/actividades complementarias/i);
  });
});
