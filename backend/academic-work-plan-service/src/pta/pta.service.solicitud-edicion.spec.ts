import { PtaService } from './pta.service';

describe('PtaService - solicitudes de edición parcial', () => {
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
  const authDocente = {
    userId: 'user-docente-1',
    name: 'Docente Prueba',
    email: 'docente@esap.edu.co',
    roles: ['DOCENTE'],
    isSuperUser: false,
    approvesAll: false,
    permissions: new Set<string>(),
    allowedComponents: [],
    approvalLevels: [],
  };

  it('crea una solicitud sobre el mismo PTA y registra sus componentes', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const pta = {
      id: 'pta-1',
      docenteId: 'docente-1',
      estado: 'Aprobado',
      version: 4,
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
    service.ptaNotifications = {
      resolveUser: jest.fn().mockResolvedValue({
        idUser: 'usuario-docente-1',
        email: 'docente.prueba@esap.edu.co',
        nombre: 'Docente Prueba',
      }),
    };

    const result = await service.crearSolicitudPTA({
      docenteId: 'docente-1',
      docenteNombre: 'Docente Prueba',
      tipoSolicitud: 'edicion_componentes',
      caso: 'edicion_pta',
      ptaId: 'pta-1',
      componentes: ['investigacion', 'complementarias', 'investigacion'],
      justificacion: 'Necesito actualizar las actividades aprobadas.',
    });

    expect(result).toMatchObject({
      tipoSolicitud: 'edicion_componentes',
      ptaId: 'pta-1',
      componentes: ['investigacion', 'complementarias'],
      estadoPtaAnterior: 'Aprobado',
      estado: 'pendiente',
      docenteEmail: 'docente.prueba@esap.edu.co',
    });
    expect(service.historialRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      ptaId: 'pta-1',
      tipoAccion: 'SOLICITUD_EDICION_CREADA',
    }));
  });

  it('impide que un docente cree una solicitud sobre el PTA de otra persona', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.resolveDocenteId = jest.fn((key: string) => Promise.resolve(
      key === 'user-docente-1' ? 'docente-1' : 'docente-2',
    ));
    service.ptaRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'pta-ajeno',
        docenteId: 'docente-2',
        estado: 'Aprobado',
        periodo: '2026-1',
      }),
    };

    await expect(service.crearSolicitudPTA({
      docenteId: 'docente-2',
      tipoSolicitud: 'edicion_componentes',
      caso: 'edicion_pta',
      ptaId: 'pta-ajeno',
      componentes: ['docencia'],
      justificacion: 'Quiero modificar este componente.',
    }, authDocente)).rejects.toThrow(/tus propios PTA/i);
  });

  it('al aprobar habilita únicamente los componentes solicitados', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const solicitud = {
      id: 'sol-1',
      docenteId: 'docente-1',
      docenteNombre: 'Docente Prueba',
      tipoSolicitud: 'edicion_componentes',
      ptaId: 'pta-1',
      componentes: ['investigacion'],
      justificacion: 'Actualizar el proyecto.',
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
      { ptaId: 'pta-1', componente: 'investigacion', estado: 'aprobado' },
      { ptaId: 'pta-1', componente: 'complementarias', estado: 'aprobado' },
    ];
    const approvalSave = jest.fn((value: any) => Promise.resolve(value));
    const solicitudSave = jest.fn((value: any) => Promise.resolve(value));
    const ptaSave = jest.fn((value: any) => Promise.resolve(value));
    const historialSave = jest.fn((value: any) => Promise.resolve(value));
    const txSolicitudRepo = {
      findOne: jest.fn().mockResolvedValue(solicitud),
      save: solicitudSave,
    };
    const txPtaRepo = {
      findOne: jest.fn().mockResolvedValue(pta),
      save: ptaSave,
    };
    const txApprovalRepo = {
      find: jest.fn().mockResolvedValue(approvals),
      findOne: jest.fn(({ where }: any) =>
        Promise.resolve(approvals.find(row => row.componente === where.componente) || null)),
      create: jest.fn((value: any) => value),
      save: approvalSave,
    };
    const txHistorialRepo = {
      create: jest.fn((value: any) => value),
      save: historialSave,
    };
    const manager = {
      getRepository: jest.fn((entity: any) => {
        if (entity.name === 'SolicitudPtaEntity') return txSolicitudRepo;
        if (entity.name === 'PlanTrabajoAcademicoEntity') return txPtaRepo;
        if (entity.name === 'PtaComponentApprovalEntity') return txApprovalRepo;
        if (entity.name === 'HistorialEstadoPtaEntity') return txHistorialRepo;
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
    service.ptaNotifications = {
      notifyProfesorSolicitudEdicionResuelta: jest.fn().mockResolvedValue(true),
    };

    const result = await service.resolverSolicitudPTA(
      'sol-1',
      { decision: 'aprobado', motivo: 'Edición autorizada.' },
      authAdmin,
    );

    expect(result.estado).toBe('aprobado');
    expect(ptaSave).toHaveBeenCalledWith(expect.objectContaining({
      id: 'pta-1',
      estado: 'REVISION_DOCENTE_N2',
    }));
    expect(approvalSave).toHaveBeenCalledWith(expect.objectContaining({
      componente: 'investigacion',
      estado: 'devuelto',
      scope: 'solicitud_edicion',
      scopeId: 'sol-1',
    }));
    expect(approvalSave).toHaveBeenCalledWith(expect.objectContaining({
      componente: 'academica',
      estado: 'aprobado',
    }));
    expect(approvalSave).not.toHaveBeenCalledWith(expect.objectContaining({
      componente: 'complementarias',
      estado: 'devuelto',
    }));
    expect(service.ptaNotifications.notifyProfesorSolicitudEdicionResuelta).toHaveBeenCalledWith(
      expect.objectContaining({
        solicitudId: 'sol-1',
        ptaId: 'pta-1',
        docenteId: 'docente-1',
        decision: 'aprobado',
        componentes: ['investigacion'],
        resueltoPor: 'Administrador PTA',
        motivo: 'Edición autorizada.',
      }),
    );
    const approvalTrace = JSON.parse(historialSave.mock.calls[0][0].detallesTransicion);
    expect(approvalTrace).toMatchObject({
      solicitudId: 'sol-1',
      decision: 'aprobado',
      resueltoPor: 'Administrador PTA',
      resueltoPorRol: 'SUPER_ADMIN',
      motivoResolucion: 'Edición autorizada.',
    });
  });

  it('restaura Terminado al aprobar el último componente reabierto', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const pta = {
      id: 'pta-1',
      docenteId: 'docente-1',
      estado: 'Pendiente Jefatura',
      version: 6,
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
      estadoPtaAnterior: 'Terminado',
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
        comentarios: 'Conforme.',
        scope: 'territorial',
        scopeId: 'Norte de Santander',
      },
      authAdmin,
    );

    expect(result.estadoGeneral).toBe('Terminado');
    expect(service.ptaComponentApprovalRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      scope: 'solicitud_edicion',
      scopeId: 'sol-1',
    }));
    expect(service.ptaRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      estado: 'Terminado',
    }));
    expect(service.solicitudRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      estado: 'gestionada',
      resolucionAccion: 'edicion_componentes_aprobada',
    }));
    expect(service.historialRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      tipoAccion: 'EDICION_COMPONENTES_APROBADA',
    }));
  });

  it('impide aprobar un componente antes de que el docente envíe la edición', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.ptaRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'pta-1',
        docenteId: 'docente-1',
        estado: 'REVISION_DOCENTE_N2',
      }),
    };
    service.ptaComponentApprovalRepo = {
      findOne: jest.fn().mockResolvedValue({
        ptaId: 'pta-1',
        componente: 'investigacion',
        estado: 'devuelto',
        scope: 'solicitud_edicion',
        scopeId: 'sol-1',
      }),
    };
    service.solicitudRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'sol-1',
        ptaId: 'pta-1',
        tipoSolicitud: 'edicion_componentes',
        estado: 'aprobado',
        componentes: ['investigacion'],
      }),
    };

    await expect(service.aprobarComponente(
      'pta-1',
      {
        componente: 'investigacion',
        estado: 'aprobado',
        scope: 'territorial',
      },
      authAdmin,
    )).rejects.toThrow(/todavía no ha enviado los cambios/i);
  });

  it('deniega la solicitud y su traza dentro de una única transacción', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const solicitud = {
      id: 'sol-1',
      ptaId: 'pta-1',
      docenteNombre: 'Docente Prueba',
      tipoSolicitud: 'edicion_componentes',
      estado: 'pendiente',
      componentes: ['docencia'],
    };
    const pta = {
      id: 'pta-1',
      docenteId: 'docente-1',
      estado: 'Aprobado',
      version: 3,
      datosEstructurados: { docente_nombre: 'Docente Prueba' },
    };
    const solicitudSave = jest.fn((value: any) => Promise.resolve(value));
    const historialSave = jest.fn((value: any) => Promise.resolve(value));
    const manager = {
      getRepository: jest.fn((entity: any) => {
        if (entity.name === 'SolicitudPtaEntity') {
          return { findOne: jest.fn().mockResolvedValue(solicitud), save: solicitudSave };
        }
        if (entity.name === 'PlanTrabajoAcademicoEntity') {
          return { findOne: jest.fn().mockResolvedValue(pta) };
        }
        if (entity.name === 'HistorialEstadoPtaEntity') {
          return { create: jest.fn((value: any) => value), save: historialSave };
        }
        throw new Error(`Repositorio inesperado: ${entity.name}`);
      }),
    };
    const transaction = jest.fn((callback: any) => callback(manager));
    service.solicitudRepo = { findOne: jest.fn().mockResolvedValue(solicitud) };
    service.ptaRepo = {
      findOne: jest.fn().mockResolvedValue(pta),
      manager: { transaction },
    };
    service.logEvento = jest.fn().mockResolvedValue(undefined);
    service.ptaNotifications = {
      notifyProfesorSolicitudEdicionResuelta: jest.fn().mockResolvedValue(true),
    };

    const result = await service.resolverSolicitudPTA(
      'sol-1',
      { decision: 'denegado', motivo: 'No procede el cambio solicitado.' },
      authAdmin,
    );

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      estado: 'denegado',
      resolucionAccion: 'denegar_edicion_componentes',
    });
    expect(historialSave).toHaveBeenCalledWith(expect.objectContaining({
      tipoAccion: 'SOLICITUD_EDICION_DENEGADA',
      estadoAnterior: 'Aprobado',
      estadoNuevo: 'Aprobado',
      comentarios: 'No procede el cambio solicitado.',
    }));
    expect(service.ptaNotifications.notifyProfesorSolicitudEdicionResuelta).toHaveBeenCalledWith(
      expect.objectContaining({
        solicitudId: 'sol-1',
        ptaId: 'pta-1',
        docenteId: 'docente-1',
        decision: 'denegado',
        componentes: ['docencia'],
        resueltoPor: 'Administrador PTA',
        motivo: 'No procede el cambio solicitado.',
      }),
    );
    const denialTrace = JSON.parse(historialSave.mock.calls[0][0].detallesTransicion);
    expect(denialTrace).toMatchObject({
      solicitudId: 'sol-1',
      decision: 'denegado',
      componentes: ['docencia'],
      resueltoPor: 'Administrador PTA',
      resueltoPorRol: 'SUPER_ADMIN',
      motivoResolucion: 'No procede el cambio solicitado.',
    });
  });

  it('impide una aprobación global que omita la reaprobación por componente', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.ptaRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'pta-1',
        docenteId: 'docente-1',
        estado: 'Pendiente Jefatura',
      }),
    };
    service.solicitudRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'sol-1',
        ptaId: 'pta-1',
        tipoSolicitud: 'edicion_componentes',
        estado: 'en_aprobacion',
      }),
    };

    await expect(service.updatePTAStatus(
      'pta-1',
      { accion: 'aprobar' },
      authAdmin,
    )).rejects.toThrow(/aprobar o devolver únicamente los componentes habilitados/i);

    await expect(service.updatePTAStatus(
      'pta-1',
      { estado: 'Aprobado' },
      authAdmin,
    )).rejects.toThrow(/solo admite el reenvío del docente y decisiones por componente/i);
  });
});
