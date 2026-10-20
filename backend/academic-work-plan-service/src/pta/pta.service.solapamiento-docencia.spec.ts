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

  it('detecta el cruce presencial aunque sean de territoriales distintas, sin lanzar un bloqueo', () => {
    const assignments = [
      subject('Presencial Meta', 'PRESENCIAL', '2026-07-01', '2026-07-03', 'meta'),
      subject('Presencial Arauca', 'PRESENCIAL', '2026-07-03', '2026-07-05', 'arauca'),
    ];

    expect(service.getDocenciaDateOverlaps(assignments)).toEqual([
      expect.objectContaining({ indices: [0, 1], descripcion: expect.stringContaining('Presencial Meta') }),
    ]);
  });

  it('marca ambas asignaturas presenciales cruzadas de la misma territorial', () => {
    const assignments = [
      subject('Presencial 1', 'PRESENCIAL'),
      subject('Presencial 2', 'PRESENCIAL'),
    ];

    expect(service.annotateDocenciaDateOverlaps(assignments).asignaturas)
      .toEqual(assignments.map(asignatura => ({ ...asignatura, cruce_fechas: true })));
  });

  it('permite dos asignaturas virtuales cruzadas en territoriales distintas', () => {
    const assignments = [
      subject('Virtual Meta', 'VIRTUAL', '2026-07-01', '2026-07-03', 'meta'),
      subject('Virtual Arauca', 'VIRTUAL', '2026-07-01', '2026-07-03', 'arauca'),
    ];

    expect(service.getDocenciaDateOverlaps(assignments)).toEqual([]);
  });

  it.each(['DISTANCIA', 'A distancia', 'Remota', 'En línea', 'Online', 'No presencial'])(
    'permite el cruce cuando la modalidad no presencial es %s',
    (modality) => {
      const assignments = [
        subject('Materia remota', modality, '2026-07-01', '2026-07-03', 'meta'),
        subject('Materia presencial', 'PRESENCIAL', '2026-07-02', '2026-07-04', 'arauca'),
      ];

      expect(service.getDocenciaDateOverlaps(assignments)).toEqual([]);
    },
  );

  it('permite Por definir como dato informativo del catálogo', () => {
    const assignments = [
      subject('Pendiente', 'POR DEFINIR'),
      subject('Presencial', 'PRESENCIAL'),
    ];

    expect(service.getDocenciaDateOverlaps(assignments)).toEqual([]);
  });

  it('permite asignaturas presenciales cuando sus fechas no se cruzan', () => {
    const assignments = [
      subject('Presencial 1', 'PRESENCIAL', '2026-07-01', '2026-07-03'),
      subject('Presencial 2', 'PRESENCIAL', '2026-07-04', '2026-07-06'),
    ];

    expect(service.getDocenciaDateOverlaps(assignments)).toEqual([]);
  });

  it('permite enviar y validar nuevamente un PTA con cruces contando todas sus horas', () => {
    const body = { tipo_vinculacion: 'CARRERA', asignaturas: [
      { ...subject('Primera', 'PRESENCIAL'), creditos: 3, programa_id: 'P1', pensum: 'AP_36', total_horas: 192 },
      { ...subject('Segunda', 'PRESENCIAL'), creditos: 3, programa_id: 'P1', pensum: 'AP_36', total_horas: 192 },
    ] };
    const horas = service.computeHorasTotales(body);
    expect(horas.sumDocencia).toBe(384);
    expect(() => service.validatePtaForSubmission(body, horas, 800, {})).not.toThrow();
    // Los otros límites y las fechas inválidas conservan su validación.
    expect(() => service.validatePtaForSubmission(body, horas, 300, {})).toThrow(BadRequestException);
    const invalido = { ...body, asignaturas: [{ ...body.asignaturas[0], fecha_fin: '2026-06-01' }] };
    expect(() => service.validatePtaForSubmission(invalido, service.computeHorasTotales(invalido), 800, {}))
      .toThrow(/rango de fechas/);
  });

  it('expone la alerta al consultar un PTA guardado y recalcula marcas del cliente o históricas', () => {
    const asignaturas = [subject('Primera', 'PRESENCIAL'), subject('Segunda', 'PRESENCIAL'),
      subject('Tercera', 'MIXTA')];
    const dto = service.toPtaDto({ id: 'pta-1', estado: 'Pendiente Jefatura',
      datosEstructurados: { asignaturas, docencia_cruces_fechas: [] } });
    expect(dto.docencia_cruces_fechas).toHaveLength(3);
    expect(dto.asignaturas.every(asignatura => asignatura.cruce_fechas)).toBe(true);
    const corregidas = asignaturas.map((asignatura, index) => ({ ...asignatura, cruce_fechas: true,
      fecha_inicio: `2026-07-${10 + index * 3}`, fecha_fin: `2026-07-${11 + index * 3}` }));
    const corregido = service.toPtaDto({ id: 'pta-1', datosEstructurados: {
      asignaturas: corregidas, docencia_cruces_fechas: dto.docencia_cruces_fechas,
    } });
    expect(corregido.docencia_cruces_fechas).toEqual([]);
    expect(corregido.asignaturas.every(asignatura => asignatura.cruce_fechas === false)).toBe(true);
  });
});
