import { PtaService } from './pta.service';

describe('PtaService - catálogo histórico durante la reaprobación parcial', () => {
  function setup() {
    const service = Object.create(PtaService.prototype) as any;
    const actividad = {
      actividad_id: 'COMP_REA',
      nombre: 'Elaboración de Recursos Educativos Abiertos del programa PREAAP',
      seccion: 'complementarias_docencia',
      horas: 60,
      filas_seleccionadas: ['opcion-historica'],
      filas_cantidades: { 'opcion-historica': 60 },
      seleccion_jerarquica: [{ clave: 'opcion-historica', nombre: 'Opción anterior', horas: 60 }],
    };
    const ds = {
      asignaturas: [{
        asignatura_id: 'asig-1', programa_id: 'programa-1', pensum: '2026',
        creditos: 3, total_horas: 576, fecha_inicio: '2026-01-01', fecha_fin: '2026-06-01',
      }],
      complementarias: [actividad],
      extension_actividades: [] as any[],
      academico_admin: [] as any[],
    };
    const pta = {
      id: 'pta-1', docenteId: 'docente-1', periodo: '2026-1',
      estado: 'REVISION_DOCENTE_N1', horasTotales: 636, horasAsignables: 800,
      version: 4, datosEstructurados: ds,
    };
    const solicitud = {
      id: 'sol-1', ptaId: pta.id, tipoSolicitud: 'edicion_componentes',
      estado: 'aprobado', componentes: ['docencia'], estadoPtaAnterior: 'Aprobado',
    };
    const approvals = [
      { componente: 'academica_pregrado', estado: 'devuelto', scope: 'solicitud_edicion', scopeId: 'sol-1' },
      { componente: 'complementarias_gestion_profesoral', estado: 'aprobado', aprobadorId: 'revisor-1', fechaAprobacion: '2026-06-01' },
      { componente: 'ext_fortalecimiento', estado: 'aprobado', aprobadorId: 'revisor-2' },
    ];
    const rules = {
      comp_actividades_v2: {
        complementarias_docencia: [{
          id: 'COMP_REA', nombre: actividad.nombre,
          items: [{ nombre: 'Opción vigente', tipo: 'fija', horas: 60 }],
        }],
        academico_administrativas: [{
          id: 'AA_REA', nombre: 'Actividad administrativa histórica',
          items: [{ nombre: 'Opción vigente', tipo: 'fija', horas: 60 }],
        }],
      },
      ext_secciones: [{ key: 'fortalecimiento', label: 'Fortalecimiento', columnas: ['_items_'] }],
      ext_actividades: {
        fortalecimiento: [{
          id: 'EXT_REA', nombre: 'Actividad histórica de extensión',
          items: [{ nombre: 'Opción vigente', tipo: 'fija', horas: 60 }],
        }],
      },
    };
    service.ptaRepo = {
      findOne: jest.fn().mockResolvedValue(pta),
      save: jest.fn(async (value: any) => value),
    };
    service.solicitudRepo = {
      findOne: jest.fn().mockResolvedValue(solicitud),
      save: jest.fn(async (value: any) => value),
    };
    service.ptaComponentApprovalRepo = { find: jest.fn().mockResolvedValue(approvals) };
    service.historialRepo = { create: jest.fn(value => value), save: jest.fn().mockResolvedValue({}) };
    service.getConfiguracionPTAGlobal = jest.fn().mockResolvedValue(rules);
    service.getExtMultiplicadores = jest.fn().mockResolvedValue({});
    service.resolveHorasAProgramar = jest.fn().mockResolvedValue(800);
    service.resolveDocenteId = jest.fn().mockResolvedValue('docente-1');
    service.syncAsignaturasPensum = jest.fn(async value => value);
    service.resetParallelApprovalWorkflow = jest.fn();
    service.resetComponentApprovalWorkflow = jest.fn().mockResolvedValue(undefined);
    service.getComponentesAprobacion = jest.fn().mockResolvedValue([
      { componente: 'academica_pregrado', estado: 'pendiente' },
      ...approvals.slice(1),
    ]);
    service.logEvento = jest.fn().mockResolvedValue(undefined);
    service.ptaNotifications = {
      notifyApproversPtaEnRevision: jest.fn().mockResolvedValue(undefined),
      notifyProfesorPtaEnviadoAprobacion: jest.fn().mockResolvedValue(undefined),
    };
    service.enrichHorasDesdeBanco = jest.fn().mockResolvedValue(undefined);
    return { service, pta, ds, actividad, solicitud, approvals };
  }

  it.each(['complementarias', 'extension', 'academico_admin'])(
    'reenvía Docencia y conserva intacta la actividad aprobada de %s aunque cambie el catálogo',
    async tipo => {
      const { service, ds, actividad, solicitud, approvals } = setup();
      if (tipo === 'extension') {
        ds.complementarias = [];
        ds.extension_actividades = [{ ...actividad, actividad_id: 'EXT_REA', seccion: 'fortalecimiento' }];
      } else if (tipo === 'academico_admin') {
        ds.complementarias = [];
        ds.academico_admin = [{ ...actividad, actividad_id: 'AA_REA', seccion: 'academico_administrativas' }];
      }
      const datosAntes = JSON.parse(JSON.stringify(ds));
      const aprobacionesAntes = JSON.parse(JSON.stringify(approvals));

      await expect(service.updatePTAStatus('pta-1', { accion: 'reenviar_corregido' }))
        .resolves.toMatchObject({ nuevoEstado: 'Pendiente Jefatura', version: 5 });

      expect(service.ptaRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        datosEstructurados: datosAntes,
      }));
      expect(approvals).toEqual(aprobacionesAntes);
      expect(service.resetParallelApprovalWorkflow).not.toHaveBeenCalled();
      expect(service.resetComponentApprovalWorkflow).toHaveBeenCalledWith('pta-1', true, null, {});
      expect(solicitud.estado).toBe('en_aprobacion');
    },
  );

  it.each(['sin solicitud', 'componente reabierto', 'componente pendiente', 'solicitud sin alcance'])(
    'sigue rechazando opciones retiradas cuando hay %s',
    async caso => {
      const { service, solicitud, approvals } = setup();
      if (caso === 'sin solicitud') service.solicitudRepo.findOne.mockResolvedValue(null);
      if (caso === 'componente reabierto') solicitud.componentes = ['docencia', 'complementarias'];
      if (caso === 'componente pendiente') approvals[1].estado = 'pendiente';
      if (caso === 'solicitud sin alcance') solicitud.componentes = [];

      await expect(service.updatePTAStatus('pta-1', { accion: 'reenviar_corregido' }))
        .rejects.toThrow('contiene una opción que ya no existe en la configuración vigente');

      expect(service.ptaRepo.save).not.toHaveBeenCalled();
      expect(service.resetComponentApprovalWorkflow).not.toHaveBeenCalled();
      expect(service.solicitudRepo.save).not.toHaveBeenCalled();
    },
  );

  it('mantiene el tope global incluyendo las horas de actividades históricas aprobadas', async () => {
    const { service, ds } = setup();
    ds.asignaturas[0].total_horas = 760;
    await expect(service.updatePTAStatus('pta-1', { accion: 'reenviar_corregido' }))
      .rejects.toThrow('820h / 800h');
    expect(service.ptaRepo.save).not.toHaveBeenCalled();
  });

  it('sigue validando los datos de Docencia que se envían a reaprobación', async () => {
    const { service, ds } = setup();
    ds.asignaturas[0].pensum = '';
    await expect(service.updatePTAStatus('pta-1', { accion: 'reenviar_corregido' }))
      .rejects.toThrow('Seleccione el Pensum');
    expect(service.ptaRepo.save).not.toHaveBeenCalled();
  });

  it.each(['aprobado', 'en_aprobacion'])(
    'comprueba el reenvío sin modificar datos ni aprobaciones de una solicitud %s',
    async estadoSolicitud => {
      const { service, pta, solicitud, approvals } = setup();
      solicitud.estado = estadoSolicitud;
      const antes = JSON.parse(JSON.stringify({ pta, solicitud, approvals }));
      service.syncAsignaturasPensum.mockImplementation(async (asignaturas: any[]) => {
        asignaturas[0].pensum = 'Pensum sincronizado';
        return asignaturas;
      });
      await expect(service.validarReenvioPTA('pta-1', { userId: 'user-1' }))
        .resolves.toEqual({ valido: true });
      expect({ pta, solicitud, approvals }).toEqual(antes);
      expect(service.ptaRepo.save).not.toHaveBeenCalled();
      expect(service.solicitudRepo.save).not.toHaveBeenCalled();
      expect(service.historialRepo.save).not.toHaveBeenCalled();
      expect(service.resetComponentApprovalWorkflow).not.toHaveBeenCalled();
      expect(service.resetParallelApprovalWorkflow).not.toHaveBeenCalled();
      expect(service.ptaNotifications.notifyApproversPtaEnRevision).not.toHaveBeenCalled();
    },
  );

  it('informa antes de firmar una opción retirada del componente reabierto', async () => {
    const { service, solicitud } = setup();
    solicitud.componentes = ['complementarias'];
    await expect(service.validarReenvioPTA('pta-1', { userId: 'user-1' }))
      .rejects.toThrow('Vuelve a seleccionar una opción vigente');
    expect(service.ptaRepo.save).not.toHaveBeenCalled();
    expect(service.solicitudRepo.save).not.toHaveBeenCalled();
  });

  it('vuelve a comprobar las reglas al enviar aunque la comprobación previa haya pasado', async () => {
    const { service, ds } = setup();
    await service.validarReenvioPTA('pta-1', { userId: 'user-1' });
    ds.asignaturas[0].total_horas = 760;
    await expect(service.updatePTAStatus('pta-1', { accion: 'reenviar_corregido' }))
      .rejects.toThrow('820h / 800h');
    expect(service.ptaRepo.save).not.toHaveBeenCalled();
  });

  it('rechaza la comprobación de otro docente', async () => {
    const { service } = setup();
    service.resolveDocenteId.mockResolvedValue('otro-docente');
    await expect(service.validarReenvioPTA('pta-1', { userId: 'user-2' }))
      .rejects.toThrow('Solo el docente propietario');
    expect(service.getConfiguracionPTAGlobal).not.toHaveBeenCalled();
  });

  it('requiere sesión y un PTA habilitado para corregir', async () => {
    const { service, pta } = setup();
    await expect(service.validarReenvioPTA('pta-1')).rejects.toThrow('docente autenticado');
    pta.estado = 'Aprobado';
    await expect(service.validarReenvioPTA('pta-1', { userId: 'user-1' }))
      .rejects.toThrow('no está habilitado para el reenvío');
    expect(service.ptaRepo.save).not.toHaveBeenCalled();
  });
});
