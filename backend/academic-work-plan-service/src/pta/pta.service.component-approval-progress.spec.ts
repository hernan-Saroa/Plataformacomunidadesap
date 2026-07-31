import { PtaService } from './pta.service';

describe('PtaService - avance de aprobación por componente', () => {
  function createService(approvals: any[] = []) {
    const service = Object.create(PtaService.prototype) as any;
    service.ptaComponentApprovalRepo = {
      find: jest.fn().mockResolvedValue(approvals),
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

    expect(dtos[0].componentes_total).toBe(4);
    expect(dtos[0].componentes_aprobados).toBe(0);
    expect(dtos[0].componentes_estado).toEqual([
      expect.objectContaining({ key: 'academica', estado: 'no_iniciado' }),
      expect.objectContaining({ key: 'investigacion', estado: 'no_iniciado' }),
      expect.objectContaining({ key: 'complementarias', estado: 'no_iniciado' }),
      expect.objectContaining({ key: 'extension', estado: 'no_iniciado' }),
    ]);
  });

  it('conserva la autoaprobación de componentes vacíos después de iniciar la revisión', async () => {
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

    expect(dtos[0].componentes_total).toBe(3);
    expect(dtos[0].componentes_aprobados).toBe(2);
    expect(dtos[0].componentes_estado).toEqual([
      // 'en_revision': Docencia tiene horas y ninguna fila de PtaComponentReview
      // todavía (etapa de Revisión pendiente antes de poder aprobarse).
      expect.objectContaining({ key: 'academica', estado: 'en_revision' }),
      expect.objectContaining({ key: 'investigacion', estado: 'aprobado' }),
      expect.objectContaining({ key: 'complementarias', estado: 'aprobado' }),
    ]);
  });
});
