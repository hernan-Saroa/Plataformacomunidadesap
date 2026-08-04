import { BadRequestException } from '@nestjs/common';
import { PtaService } from './pta.service';

describe('PtaService - solapamiento de fechas en Docencia', () => {
  const service = Object.create(PtaService.prototype) as any;
  const subject = (
    name: string,
    modality: string,
    start = '2026-07-01',
    end = '2026-07-03',
    territorial = 'territorial-1',
  ) => ({
    asignatura_id: name,
    asignatura_nombre: name,
    modalidad: modality,
    fecha_inicio: start,
    fecha_fin: end,
    territorial_id: territorial,
  });

  it('bloquea dos asignaturas presenciales con fechas cruzadas aunque sean de territoriales distintas', () => {
    const assignments = [
      subject('Presencial Meta', 'PRESENCIAL', '2026-07-01', '2026-07-03', 'meta'),
      subject('Presencial Arauca', 'PRESENCIAL', '2026-07-03', '2026-07-05', 'arauca'),
    ];

    expect(() => service.validateDocenciaDateOverlaps(assignments))
      .toThrow(BadRequestException);
  });

  it('bloquea dos asignaturas presenciales cruzadas dentro de la misma territorial', () => {
    const assignments = [
      subject('Presencial 1', 'PRESENCIAL'),
      subject('Presencial 2', 'PRESENCIAL'),
    ];

    expect(() => service.validateDocenciaDateOverlaps(assignments))
      .toThrow(/asignaturas presenciales/);
  });

  it('permite dos asignaturas virtuales cruzadas en territoriales distintas', () => {
    const assignments = [
      subject('Virtual Meta', 'VIRTUAL', '2026-07-01', '2026-07-03', 'meta'),
      subject('Virtual Arauca', 'VIRTUAL', '2026-07-01', '2026-07-03', 'arauca'),
    ];

    expect(() => service.validateDocenciaDateOverlaps(assignments)).not.toThrow();
  });

  it.each(['DISTANCIA', 'A distancia', 'Remota', 'En línea', 'Online', 'No presencial'])(
    'permite el cruce cuando la modalidad no presencial es %s',
    (modality) => {
      const assignments = [
        subject('Materia remota', modality, '2026-07-01', '2026-07-03', 'meta'),
        subject('Materia presencial', 'PRESENCIAL', '2026-07-02', '2026-07-04', 'arauca'),
      ];

      expect(() => service.validateDocenciaDateOverlaps(assignments)).not.toThrow();
    },
  );

  it('permite Por definir como dato informativo del catálogo', () => {
    const assignments = [
      subject('Pendiente', 'POR DEFINIR'),
      subject('Presencial', 'PRESENCIAL'),
    ];

    expect(() => service.validateDocenciaDateOverlaps(assignments)).not.toThrow();
  });

  it('permite asignaturas presenciales cuando sus fechas no se cruzan', () => {
    const assignments = [
      subject('Presencial 1', 'PRESENCIAL', '2026-07-01', '2026-07-03'),
      subject('Presencial 2', 'PRESENCIAL', '2026-07-04', '2026-07-06'),
    ];

    expect(() => service.validateDocenciaDateOverlaps(assignments)).not.toThrow();
  });
});
