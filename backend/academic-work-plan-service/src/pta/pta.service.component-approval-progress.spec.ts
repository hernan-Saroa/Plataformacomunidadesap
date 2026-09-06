import { PtaService } from './pta.service';

describe('PtaService - avance de aprobación por componente', () => {
  function createService(approvals: any[] = []) {
    const service = Object.create(PtaService.prototype) as any;
    service.ptaComponentApprovalRepo = {
      find: jest.fn().mockResolvedValue(approvals),
    };
    service.configuracionRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    service.logger = { warn: jest.fn() };
    return service;
  }

  it('no presenta componentes aprobados mientras el PTA está en Borrador', async () => {
    const service = createService([
      // Incluso un registro residual no debe pintar aprobaciones antes del envío.
      { ptaId: 'pta-draft', componente: 'ext_fortalecimiento', estado: 'aprobado' },
    ]);
    const dtos: any[] = [{
      id: 'pta-draft',
      estado: 'Borrador',
      horas_docencia: 564,
      horas_investigacion: 0,
      horas_complementarias: 0,
      extension_actividades: [{
        seccion: 'fortalecimiento',
        horas: 16,
        horas_ejecutadas: 16,
      }],
    }];

    await service.attachComponentApprovalProgress(dtos);

    expect(dtos[0].componentes_total).toBe(2);
    expect(dtos[0].componentes_aprobados).toBe(0);
    expect(dtos[0].componentes_estado).toHaveLength(4);
    expect(dtos[0].componentes_estado).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'academica', estado: 'no_iniciado' }),
      expect.objectContaining({ key: 'investigacion', estado: 'no_aplica', horas: 0 }),
      expect.objectContaining({ key: 'extension', estado: 'no_iniciado' }),
      expect.objectContaining({ key: 'complementarias', estado: 'no_aplica', horas: 0 }),
    ]));
  });

  it('calcula horas aprobadas/pendientes de Docencia cuando solo Posgrado está aprobado', async () => {
    const service = createService([
      { ptaId: 'pta-parcial', componente: 'academica_posgrado', estado: 'aprobado' },
    ]);
    const dtos: any[] = [{
      id: 'pta-parcial',
      estado: 'Pendiente Jefatura',
      horas_investigacion: 0,
      horas_complementarias: 0,
      extension_actividades: [],
      asignaturas: [
        { total_horas: 50, programa_id: 'prog-pos' },
        { total_horas: 50, programa_id: 'prog-pre' },
      ],
    }];
    service.programaRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 'prog-pos', tipo: 'maestria' },
        { id: 'prog-pre', tipo: 'pregrado' },
      ]),
    };

    await service.attachComponentApprovalProgress(dtos);

    const docencia = dtos[0].componentes_estado.find((c: any) => c.key === 'academica');
    expect(docencia).toEqual(expect.objectContaining({
      // 'en_revision': igual que en el otro test, sin filas de PtaComponentReview
      // el rótulo de la etapa de Revisión aún no pasa a "pendiente" de aprobación.
      // Lo que valida este caso es que las horas SÍ reflejan la aprobación parcial.
      estado: 'en_revision',
      horas: 100,
      horas_aprobadas: 50,
      horas_pendientes: 50,
    }));
    expect(dtos[0].componentes_estado).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'investigacion', estado: 'no_aplica' }),
      expect.objectContaining({ key: 'extension', estado: 'no_aplica' }),
      expect.objectContaining({ key: 'complementarias', estado: 'no_aplica' }),
    ]));
  });

  it('marca No aplica los componentes vacíos después de iniciar la revisión', async () => {
    const service = createService();
    const dtos: any[] = [{
      id: 'pta-review',
      estado: 'Pendiente Jefatura',
      horas_docencia: 564,
      horas_investigacion: 0,
      horas_complementarias: 0,
      extension_actividades: [],
    }];

    await service.attachComponentApprovalProgress(dtos);

    expect(dtos[0].componentes_total).toBe(1);
    expect(dtos[0].componentes_aprobados).toBe(0);
    expect(dtos[0].componentes_estado).toHaveLength(4);
    expect(dtos[0].componentes_estado).toEqual(expect.arrayContaining([
      // 'en_revision': Docencia tiene horas y ninguna fila de PtaComponentReview
      // todavía (etapa de Revisión pendiente antes de poder aprobarse).
      expect.objectContaining({ key: 'academica', estado: 'en_revision' }),
      expect.objectContaining({ key: 'investigacion', estado: 'no_aplica' }),
      expect.objectContaining({ key: 'extension', estado: 'no_aplica' }),
      expect.objectContaining({ key: 'complementarias', estado: 'no_aplica' }),
    ]));
  });

  it('mantiene visible la reaprobación humana cuando se retiró la última actividad', async () => {
    const service = createService([
      { ptaId: 'pta-edicion', componente: 'academica_pregrado', estado: 'aprobado' },
      { ptaId: 'pta-edicion', componente: 'ext_capacitacion', estado: 'pendiente', scope: 'solicitud_edicion' },
    ]);
    const dtos: any[] = [{
      id: 'pta-edicion', estado: 'Pendiente Jefatura', horas_docencia: 384,
      horas_investigacion: 0, horas_complementarias: 0, extension_actividades: [],
    }];
    await service.attachComponentApprovalProgress(dtos);
    expect(dtos[0].componentes_total).toBe(2);
    expect(dtos[0].componentes_aprobados).toBe(1);
    expect(dtos[0].componentes_estado).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'extension', horas: 0, estado: 'pendiente', requiere_reaprobacion: true }),
    ]));
  });

  it('no convierte en aprobado un componente vacío aunque el PTA global esté aprobado', async () => {
    const service = createService();
    const dtos: any[] = [{
      id: 'pta-aprobado',
      estado: 'Aprobado',
      horas_docencia: 384,
      horas_investigacion: 200,
      horas_complementarias: 170,
      extension_actividades: [],
    }];

    await service.attachComponentApprovalProgress(dtos);

    expect(dtos[0].componentes_total).toBe(3);
    expect(dtos[0].componentes_aprobados).toBe(3);
    expect(dtos[0].componentes_estado).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'academica', estado: 'aprobado', horas: 384 }),
      expect.objectContaining({ key: 'investigacion', estado: 'aprobado', horas: 200 }),
      expect.objectContaining({ key: 'extension', estado: 'no_aplica', horas: 0 }),
      expect.objectContaining({ key: 'complementarias', estado: 'aprobado', horas: 170 }),
    ]));
  });
});
