import { PtaService } from './pta.service';

describe('PtaService - solicitud de edicion bloqueada durante creacion/aprobacion (EFDS-1408)', () => {
  const authAdmin = {
    userId: 'admin-1',
    name: 'Administrador PTA',
    email: 'admin@esap.edu.co',
    roles: ['SUPER_ADMIN'],
    isSuperUser: true,
    approvesAll: true,
    permissions: new Set<string>(),
    allowedComponents: [],
    approvalLevels: [1, 2, 3],
  };

  it('rechaza la solicitud de edicion en Borrador y en medio de la aprobacion; la admite una vez Aprobado', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const pta = {
      id: 'pta-1',
      docenteId: 'docente-1',
      estado: 'Borrador',
      periodo: '2026-2',
      version: 2,
      datosEstructurados: { docente_nombre: 'Docente Prueba' },
    };

    service.resolveDocenteId = jest.fn().mockResolvedValue('docente-1');
    service.ptaRepo = { findOne: jest.fn().mockResolvedValue(pta) };
    service.solicitudRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value: any) => ({ id: 'sol-1', ...value })),
      save: jest.fn((value: any) => Promise.resolve(value)),
    };
    service.historialRepo = {
      create: jest.fn((value: any) => value),
      save: jest.fn((value: any) => Promise.resolve(value)),
    };
    service.logEvento = jest.fn().mockResolvedValue(undefined);

    const payload = {
      docenteId: 'docente-1',
      docenteNombre: 'Docente Prueba',
      tipoSolicitud: 'edicion_componentes',
      caso: 'edicion_pta',
      ptaId: 'pta-1',
      componentes: ['investigacion'],
      justificacion: 'Necesito corregir un dato antes de que finalice la aprobacion.',
    };

    // En creacion (Borrador): bloqueada.
    await expect(service.crearSolicitudPTA(payload)).rejects.toThrow(
      /no admite una solicitud/i,
    );

    // A mitad del proceso de aprobacion (aun no aprobado en su totalidad): bloqueada.
    pta.estado = 'Pendiente Jefatura';
    await expect(service.crearSolicitudPTA(payload)).rejects.toThrow(
      /no admite una solicitud/i,
    );

    // Una vez aprobado en su totalidad: habilitada.
    pta.estado = 'Aprobado';
    await expect(service.crearSolicitudPTA(payload)).resolves.toMatchObject({
      ptaId: 'pta-1',
      estado: 'pendiente',
      estadoPtaAnterior: 'Aprobado',
    });
  });

  it('al autorizar la correccion sobre un PTA ya aprobado consolida como aprobados los componentes residuales no seleccionados', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const solicitud = {
      id: 'sol-1',
      docenteId: 'docente-1',
      docenteNombre: 'Docente Prueba',
      tipoSolicitud: 'edicion_componentes',
      ptaId: 'pta-1',
      componentes: ['investigacion'],
      justificacion: 'Corregir el componente ya aprobado.',
      estado: 'pendiente',
    };
    const pta = {
      id: 'pta-1',
      docenteId: 'docente-1',
      estado: 'Aprobado',
      version: 2,
      datosEstructurados: { docente_nombre: 'Docente Prueba' },
    };
    const approvals = [
      { ptaId: 'pta-1', componente: 'academica', estado: 'pendiente' },
      { ptaId: 'pta-1', componente: 'investigacion', estado: 'pendiente' },
      { ptaId: 'pta-1', componente: 'complementarias', estado: 'aprobado' },
    ];
    const approvalSave = jest.fn((value: any) => Promise.resolve(value));
    const ptaSave = jest.fn((value: any) => Promise.resolve(value));
    const manager = {
      getRepository: jest.fn((entity: any) => {
        if (entity.name === 'SolicitudPtaEntity') {
          return {
            findOne: jest.fn().mockResolvedValue(solicitud),
            save: jest.fn((value: any) => Promise.resolve(value)),
          };
        }
        if (entity.name === 'PlanTrabajoAcademicoEntity') {
          return {
            findOne: jest.fn().mockResolvedValue(pta),
            save: ptaSave,
          };
        }
        if (entity.name === 'PtaComponentApprovalEntity') {
          return {
            find: jest.fn().mockResolvedValue(approvals),
            findOne: jest.fn(({ where }: any) => Promise.resolve(
              approvals.find(row => row.componente === where.componente) || null,
            )),
            create: jest.fn((value: any) => value),
            save: approvalSave,
          };
        }
        if (entity.name === 'HistorialEstadoPtaEntity') {
          return {
            create: jest.fn((value: any) => value),
            save: jest.fn((value: any) => Promise.resolve(value)),
          };
        }
        if (entity.name === 'PtaComponentReviewEntity') {
          return {
            delete: jest.fn().mockResolvedValue(undefined),
          };
        }
        throw new Error(`Repositorio inesperado: ${entity.name}`);
      }),
    };

    service.solicitudRepo = { findOne: jest.fn().mockResolvedValue(solicitud) };
    service.ptaRepo = {
      findOne: jest.fn().mockResolvedValue(pta),
      manager: { transaction: jest.fn((callback: any) => callback(manager)) },
    };
    service.getComponentesAprobacion = jest.fn().mockResolvedValue(approvals);
    service.logEvento = jest.fn().mockResolvedValue(undefined);

    await service.resolverSolicitudPTA(
      'sol-1',
      { decision: 'aprobado', motivo: 'Correccion autorizada.' },
      authAdmin,
    );

    expect(approvalSave).toHaveBeenCalledWith(expect.objectContaining({
      componente: 'investigacion',
      estado: 'devuelto',
      scope: 'solicitud_edicion',
    }));
    // 'academica' seguía 'pendiente' con el PTA ya Aprobado: es un residuo
    // histórico de antes de la matriz granular y se consolida como aprobado
    // al reabrir otro componente (EFDS-1408: la solicitud de edición solo
    // procede sobre un PTA ya cerrado, así que cualquier pendiente restante
    // aquí no puede ser un componente en aprobación inicial real).
    expect(approvalSave).toHaveBeenCalledWith(expect.objectContaining({
      componente: 'academica',
      estado: 'aprobado',
      aprobadorRol: 'Consolidación histórica',
    }));
    // 'complementarias' ya estaba aprobado explícitamente: no se re-guarda.
    expect(approvalSave).not.toHaveBeenCalledWith(expect.objectContaining({
      componente: 'complementarias',
    }));
    expect(ptaSave).toHaveBeenCalledWith(expect.objectContaining({
      estado: 'REVISION_DOCENTE_N2',
    }));
  });

  it('finaliza en Aprobado cuando termina la correccion solicitada sobre un PTA ya aprobado', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const pta = {
      id: 'pta-1',
      docenteId: 'docente-1',
      estado: 'REVISION_DOCENTE_N2',
      version: 5,
      datosEstructurados: { docente_nombre: 'Docente Prueba' },
    };
    const approval = {
      ptaId: 'pta-1',
      componente: 'investigacion',
      estado: 'pendiente',
      scope: 'solicitud_edicion',
      scopeId: 'sol-1',
    };
    const solicitud = {
      id: 'sol-1',
      ptaId: 'pta-1',
      tipoSolicitud: 'edicion_componentes',
      estado: 'en_aprobacion',
      estadoPtaAnterior: 'Aprobado',
      componentes: ['investigacion'],
    };
    const allApproved = [
      { componente: 'academica', estado: 'aprobado' },
      { componente: 'investigacion', estado: 'aprobado' },
      { componente: 'ext_capacitacion', estado: 'aprobado' },
      { componente: 'ext_procesos', estado: 'aprobado' },
      { componente: 'ext_fortalecimiento', estado: 'aprobado' },
      { componente: 'ext_gobierno', estado: 'aprobado' },
      { componente: 'complementarias', estado: 'aprobado' },
    ];

    service.ptaRepo = {
      findOne: jest.fn().mockResolvedValue(pta),
      save: jest.fn((value: any) => Promise.resolve(value)),
    };
    service.ptaComponentApprovalRepo = {
      findOne: jest.fn().mockResolvedValue(approval),
      save: jest.fn((value: any) => Promise.resolve(value)),
    };
    service.getComponentesAprobacion = jest.fn().mockResolvedValue(allApproved);
    service.solicitudRepo = {
      findOne: jest.fn().mockResolvedValue(solicitud),
      save: jest.fn((value: any) => Promise.resolve(value)),
    };
    service.historialRepo = {
      create: jest.fn((value: any) => value),
      save: jest.fn((value: any) => Promise.resolve(value)),
    };
    service.logEvento = jest.fn().mockResolvedValue(undefined);
    service.ptaNotifications = {
      notifyProfesorComponenteAprobado: jest.fn().mockResolvedValue(undefined),
    };

    const result = await service.aprobarComponente(
      'pta-1',
      {
        componente: 'investigacion',
        estado: 'aprobado',
        comentarios: 'Correccion conforme.',
      },
      authAdmin,
    );

    expect(result.estadoGeneral).toBe('Aprobado');
    expect(service.ptaRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      estado: 'Aprobado',
    }));
    expect(service.solicitudRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      estado: 'gestionada',
      resolucionAccion: 'edicion_componentes_aprobada',
    }));
  });
});
