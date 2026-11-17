import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { BancoDocentesPTA } from './BancoDocentesPTA';
import { getBancoDocentes, getAlertasPeriodoPrueba, previewRundDeletion, confirmRundDeletion } from '../../../services/api/ptaApi';
import { downloadBancoDocentesExport } from '../../../utils/bancoDocentesExcel';

vi.mock('../../../services/api/ptaApi', () => ({ getRundConvocatorias: vi.fn().mockResolvedValue([]),
  getBancoDocentes: vi.fn(),
  getBancoDocenteStats: vi.fn().mockResolvedValue({ success: true, data: { total: 1 } }),
  getCatalogoTerritoriales: vi.fn().mockResolvedValue({ success: true, data: [] }),
  previewRundDeletion: vi.fn(), confirmRundDeletion: vi.fn(),
  getAlertasPeriodoPrueba: vi.fn().mockResolvedValue({ success: false, data: null }),
}));
vi.mock('../../../../../shell/src/services/api', () => ({ apiClient: {
  get: vi.fn().mockResolvedValue([{ codigo: '2026-2', estado: 'en_curso' }]),
} }));
let grantedPermissions: string[] | null = null;
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ hasPermission: (permission: string) => grantedPermissions === null || grantedPermissions.includes(permission), session: { permisos: grantedPermissions ?? [] } }) }));
vi.mock('../../../utils/bancoDocentesExcel', () => ({ downloadBancoDocentesTemplate: vi.fn(), downloadBancoDocentesExport: vi.fn() }));
vi.mock('./BancoDocenteDetalleInline', () => ({ BancoDocenteDetalleInline: () => <tr><td>Detalle abierto</td></tr> }));
vi.mock('./BancoDocenteEditModal', () => ({ BancoDocenteEditModal: () => null }));
vi.mock('./BancoDocenteEstadoModal', () => ({ BancoDocenteEstadoModal: () => null }));
vi.mock('./BancoDocenteDecisionPruebaModal', () => ({ BancoDocenteDecisionPruebaModal: ({ docente }: any) => <div role="dialog">Decisión del comité de {docente.nombre_completo}</div> }));
vi.mock('./BancoDocentesBulkUpload', () => ({ BancoDocentesBulkUpload: () => null }));
vi.mock('./TableroInvitacionesRUND', () => ({ TableroInvitacionesRUND: () => null }));
vi.mock('./RundConfiguracionCarpetas', () => ({ RundConfiguracionCarpetas: () => <div>Configuración de carpetas abierta</div> }));
vi.mock('./RundRegistrationHistory', () => ({ RundRegistrationHistory: ({ periodoCarga }: any) => <div>Historial del periodo {periodoCarga}</div> }));
afterEach(() => { cleanup(); localStorage.removeItem('esap_user'); sessionStorage.removeItem('esap_user'); });
beforeEach(() => { vi.clearAllMocks(); grantedPermissions = null; });

it('distingue en todos los registros la revisión pendiente, la corrección solicitada y la aprobación',async()=>{
  const approved=Object.fromEntries(['IDENTIDAD','FORMACION','VINCULACION','ACADEMICO','TRANSVERSAL'].map(block=>[block,'Aprobado']));
  vi.mocked(getBancoDocentes).mockResolvedValue({success:true,data:{data:[
    {id:'pending',nombre_completo:'PERFIL SIN REVISAR',completitud:null},
    {id:'returned',nombre_completo:'PERFIL CON DATO DEVUELTO',completitud:{IDENTIDAD:'Devuelto'}},
    {id:'approved',nombre_completo:'PERFIL APROBADO',completitud:approved},
  ],total:3,pages:1}} as any);
  render(<BancoDocentesPTA/>);
  const pending=(await screen.findByText('PERFIL SIN REVISAR')).closest('tr')!;
  expect(within(pending).getByText('Pendiente de revisión').getAttribute('title')).toContain('soportes es opcional');
  expect(within(pending).queryByText('Pendiente de corrección')).toBeNull();
  const returned=screen.getByText('PERFIL CON DATO DEVUELTO').closest('tr')!;
  expect(within(returned).getByText('Pendiente de corrección').getAttribute('title')).toContain('datos o un bloque');
  const accepted=screen.getByText('PERFIL APROBADO').closest('tr')!;
  expect(within(accepted).getByText('Perfil RUND aprobado')).toBeTruthy();
  expect(within(accepted).queryByText('Pendiente de revisión')).toBeNull();
});

it('abre trazabilidad con el periodo del encabezado y conserva el regreso al listado', async () => {
  grantedPermissions = ['banco-docentes.rund.carga'];
  vi.mocked(getBancoDocentes).mockResolvedValue({ success: true, data: { data: [], total: 0, pages: 0 } } as any);
  render(<BancoDocentesPTA />);
  fireEvent.click(screen.getByRole('button', { name: 'Trazabilidad' }));
  expect(await screen.findByText('Historial del periodo 2026-2')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Listado de Docentes' }));
  expect(screen.queryByText(/Historial del periodo/)).toBeNull();
  expect(screen.getByRole('button', { name: 'Carga Masiva' })).toBeTruthy();
});

it.each([
  { permissions: ['banco-docentes.rund.view','banco-docentes.rund.edit','banco-docentes.rund.documents.manage'], create: false, edit: true },
  { permissions: ['banco-docentes.rund.view','banco-docentes.rund.validate'], create: false, edit: false },
  { permissions: ['banco-docentes.rund.manage'], create: true, edit: true },
  { permissions: ['banco-docentes.rund.carga'], create: true, edit: true },
  { permissions: ['banco-docentes.rund.revision'], create: false, edit: false },
  { permissions: ['banco-docentes.rund.incorporacion'], create: false, edit: false },
  { permissions: ['banco-docentes.rund.carga', 'banco-docentes.rund.revision'], create: true, edit: true },
])('ajusta creación y edición a los permisos de la API: $permissions', async ({ permissions, create, edit }) => {
  grantedPermissions = permissions;
  vi.mocked(getBancoDocentes).mockResolvedValue({ success: true, data: {
    data: [{ id: 'docente-1', nombre_completo: 'DOCENTE DE PRUEBA', estado: 'ACTIVO' }], total: 1, pages: 1,
  } } as any);
  render(<BancoDocentesPTA />);
  await screen.findByText('DOCENTE DE PRUEBA');
  expect(Boolean(screen.queryByRole('button', { name: 'Crear Docente (Canal 2)' }))).toBe(create);
  expect(Boolean(screen.queryByTitle('Editar docente'))).toBe(edit);
  expect(Boolean(screen.queryByTitle('Eliminar de RUND'))).toBe(permissions.includes('banco-docentes.rund.carga') || permissions.includes('banco-docentes.rund.manage'));
});

it('selecciona todos los resultados del periodo, permite excluir filas y cancelar sin eliminar', async () => {
  grantedPermissions = ['banco-docentes.rund.carga'];
  vi.mocked(getBancoDocentes).mockResolvedValue({ success: true, data: { data: [
    { id: 'docente-1', nombre_completo: 'ANA PRUEBA' }, { id: 'docente-2', nombre_completo: 'LUIS PRUEBA' },
  ], total: 100, pages: 2 } } as any);
  vi.mocked(previewRundDeletion).mockResolvedValue({ ids: ['docente-2'], fingerprint: 'huella', total: 1,
    registros: [{ id: 'docente-2', nombre_completo: 'LUIS PRUEBA', documento_identidad: 'TEST-2', periodo_carga: '2026-2' }] });
  render(<BancoDocentesPTA />);
  await screen.findByText('ANA PRUEBA');
  await screen.findByRole('button', { name: '2026-2', exact: true });
  await waitFor(() => expect(getBancoDocentes).toHaveBeenCalledWith(expect.objectContaining({ periodoCarga: '2026-2' })));
  await waitFor(() => expect((screen.getByRole('checkbox', { name: 'Seleccionar docentes de esta página' }) as HTMLInputElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar docentes de esta página' }));
  fireEvent.click(screen.getByRole('button', { name: 'Seleccionar todos los resultados (100)' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar a ANA PRUEBA' }));
  expect(screen.getByRole('button', { name: 'Eliminar seleccionados (99)' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar seleccionados (99)' }));
  await screen.findByRole('dialog');
  await waitFor(() => expect(previewRundDeletion).toHaveBeenCalledWith(expect.objectContaining({
    todosFiltrados: true, excluirIds: ['docente-1'], filters: expect.objectContaining({ periodoCarga: '2026-2' }),
  })));
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(confirmRundDeletion).not.toHaveBeenCalled();
});

it.each(['localStorage', 'sessionStorage'])('ignora un Super Admin anterior guardado en %s', async storage => {
  window[storage as 'localStorage' | 'sessionStorage'].setItem('esap_user', JSON.stringify({ roles: ['SUPER_ADMIN'], email: 'desarrollo.ccd@esap.edu.co' }));
  grantedPermissions = ['banco-docentes.rund.revision'];
  vi.mocked(getBancoDocentes).mockResolvedValue({ success: true, data: {
    data: [{ id: 'docente-1', nombre_completo: 'DOCENTE DE PRUEBA', estado: 'ACTIVO' }], total: 1, pages: 1,
  } } as any);
  render(<BancoDocentesPTA />);
  await screen.findByText('DOCENTE DE PRUEBA');
  expect(screen.queryByRole('button', { name: 'Crear Docente (Canal 2)' })).toBeNull();
  expect(screen.queryByTitle('Editar docente')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Carga Masiva' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Invitaciones', exact: true })).toBeNull();
});

it('administración RUND ofrece importación e invitaciones que la API permite', async () => {
  grantedPermissions = ['banco-docentes.rund.manage'];
  render(<BancoDocentesPTA />);
  expect(screen.getByRole('button', { name: 'Carga Masiva' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Invitaciones', exact: true })).toBeTruthy();
});

it('conserva el listado del periodo activo cuando una consulta inicial termina tarde', async () => {
  const anteriores: Array<(result: any) => void> = [];
  const result = (nombre_completo: string) => ({ success: true, data: {
    data: [{ id: nombre_completo, nombre_completo, estado: 'ACTIVO' }], total: 100, pages: 2,
  } });
  vi.mocked(getBancoDocentes).mockImplementation((filters) => filters?.periodoCarga === '2026-2'
    ? Promise.resolve(result('DOCENTE PERIODO ACTUAL'))
    : new Promise((resolve) => { anteriores.push(resolve); }));
  render(<BancoDocentesPTA />);
  await screen.findByText('DOCENTE PERIODO ACTUAL');
  expect(anteriores.length).toBeGreaterThan(0);
  const consultasIniciales = anteriores.length;
  // El debounce inicial debe cancelarse al resolver el periodo activo.
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 450)); });
  expect(anteriores).toHaveLength(consultasIniciales);
  await act(async () => { anteriores.forEach((resolve) => resolve(result('DOCENTE PERIODO ANTERIOR'))); });
  expect(screen.queryByText('DOCENTE PERIODO ANTERIOR')).toBeNull();
  expect(screen.getByText('DOCENTE PERIODO ACTUAL')).toBeTruthy();
  // Los controles originales de consulta, cierre y edición permanecen.
  fireEvent.click(screen.getByTitle('Ver detalle'));
  await waitFor(() => expect(screen.getByText('Detalle abierto')).toBeTruthy());
  expect(screen.getByTitle('Editar docente')).toBeTruthy();
  fireEvent.click(screen.getByTitle('Cerrar detalle'));
  expect(screen.queryByText('Detalle abierto')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '2', exact: true }));
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 450)); });
  expect(vi.mocked(getBancoDocentes).mock.calls.at(-1)?.[0]).toMatchObject({ page: 2, periodoCarga: '2026-2' });
});

it('RUND-003: exporta a Excel todas las páginas del listado filtrado, solo con permiso de exportación', async () => {
  grantedPermissions = ['banco-docentes.rund.view', 'banco-docentes.rund.export'];
  vi.mocked(getBancoDocentes).mockImplementation(((filtros: any) => Promise.resolve({ success: true, data: {
    data: [{ id: `d${filtros.page}`, nombre_completo: `DOCENTE PAGINA ${filtros.page}`, titulos_adicionales: { pregrado: ['Abogado'] } }], total: 2, pages: 2 } })) as unknown as typeof getBancoDocentes);
  render(<BancoDocentesPTA />);
  await screen.findByText('DOCENTE PAGINA 1');
  fireEvent.click(screen.getByRole('button', { name: /Exportar Excel/ }));
  await waitFor(() => expect(downloadBancoDocentesExport).toHaveBeenCalledOnce());
  const exportados = vi.mocked(downloadBancoDocentesExport).mock.calls[0][0] as any[];
  expect(exportados.map(d => d.id)).toEqual(['d1', 'd2']);
  expect(exportados[0].titulos_adicionales).toEqual({ pregrado: ['Abogado'] });
});

it('RUND-003: sin permiso de exportación no se ofrece el botón', async () => {
  grantedPermissions = ['banco-docentes.rund.view'];
  vi.mocked(getBancoDocentes).mockResolvedValue({ success: true, data: { data: [{ id: 'x', nombre_completo: 'DOCENTE X' }], total: 1, pages: 1 } } as any);
  render(<BancoDocentesPTA />);
  await screen.findByText('DOCENTE X');
  expect(screen.queryByRole('button', { name: /Exportar Excel/ })).toBeNull();
});

it('RUND-002: la pestaña Configuración solo aparece con su permiso propio', async () => {
  grantedPermissions = ['banco-docentes.rund.manage', 'banco-docentes.rund.view'];
  vi.mocked(getBancoDocentes).mockResolvedValue({ success: true, data: { data: [], total: 0, pages: 0 } } as any);
  render(<BancoDocentesPTA />);
  expect(screen.queryByRole('button', { name: 'Configuración' })).toBeNull();
});

it('RUND-002: con el permiso de configuración se abre la pestaña Configuración', async () => {
  grantedPermissions = ['banco-docentes.rund.configure'];
  vi.mocked(getBancoDocentes).mockResolvedValue({ success: true, data: { data: [], total: 0, pages: 0 } } as any);
  render(<BancoDocentesPTA />);
  fireEvent.click(screen.getByRole('button', { name: 'Configuración' }));
  expect(await screen.findByText('Configuración de carpetas abierta')).toBeTruthy();
});

it('HU 2426: el perfil Consulta RUND busca y lista, pero no ve trazabilidad, cargue masivo, exportación ni acciones de cambio', async () => {
  // Lo que entrega AuthContext al expandir el perfil de consulta.
  grantedPermissions = ['banco-docentes.rund.consulta', 'banco-docentes.rund.view', 'banco-docentes.rund.sensitive.view'];
  vi.mocked(getBancoDocentes).mockResolvedValue({ success: true, data: { data: [
    { id: 'docente-1', nombre_completo: 'DOCENTE VISIBLE', completitud: null },
  ], total: 1, pages: 1 } } as any);
  render(<BancoDocentesPTA />);
  expect(await screen.findByText('DOCENTE VISIBLE')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Listado de Docentes' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Estadísticas' })).toBeTruthy();
  for (const oculto of ['Trazabilidad', 'Carga Masiva', 'Invitaciones', 'Configuración'])
    expect(screen.queryByRole('button', { name: oculto })).toBeNull();
  expect(screen.queryByText(/Crear Docente/)).toBeNull();
  expect(screen.queryByRole('button', { name: /Exportar/ })).toBeNull();
});

it('HU 2426: quien tiene view y otro perfil operativo sigue viendo la trazabilidad', async () => {
  grantedPermissions = ['banco-docentes.rund.consulta', 'banco-docentes.rund.view', 'banco-docentes.rund.carga'];
  vi.mocked(getBancoDocentes).mockResolvedValue({ success: true, data: { data: [], total: 0, pages: 0 } } as any);
  render(<BancoDocentesPTA />);
  expect(await screen.findByRole('button', { name: 'Trazabilidad' })).toBeTruthy();
});

describe('HU 2424 · periodo de prueba en el Banco de Docentes', () => {
  const enPrueba = {
    id: 'prueba-1', nombre_completo: 'DOCENTE EN PRUEBA', estado: 'ACTIVO', vinculacion: 'Periodo de Prueba', vinculacion_codigo: 'PERIODO_DE_PRUEBA',
    periodo_prueba: { en_periodo_prueba: true, inicio: '2025-08-01', cumplimiento: '2026-08-01', dias_restantes: -106, pendiente_decision: true, decision: null },
  };
  const carrera = { id: 'carrera-1', nombre_completo: 'DOCENTE CARRERA', estado: 'ACTIVO', vinculacion: 'Carrera2', periodo_prueba: null };
  const listado = (rows: any[]) => vi.mocked(getBancoDocentes).mockResolvedValue({ success: true, data: { data: rows, total: rows.length, pages: 1 } } as any);

  it('CA-01: muestra inicio, fecha de cumplimiento y días restantes solo de quien está en prueba', async () => {
    grantedPermissions = ['banco-docentes.rund.manage'];
    listado([enPrueba, carrera]);
    render(<BancoDocentesPTA />);
    const fila = (await screen.findByText('DOCENTE EN PRUEBA')).closest('tr')!;
    expect(within(fila).getByText('Inicio: 01/08/2025')).toBeTruthy();
    expect(within(fila).getByText('Cumple: 01/08/2026')).toBeTruthy();
    expect(within(fila).getByText('Vencido hace 106 días')).toBeTruthy();
    expect(within(fila).getByText('Pendiente de decisión del comité')).toBeTruthy();
    expect(within(screen.getByText('DOCENTE CARRERA').closest('tr')!).queryByText(/Inicio:/)).toBeNull();
  });

  it('CA-01: el filtro envía periodoPrueba al listado y a las estadísticas, y Limpiar lo quita', async () => {
    grantedPermissions = ['banco-docentes.rund.manage'];
    listado([enPrueba]);
    render(<BancoDocentesPTA />);
    await screen.findByText('DOCENTE EN PRUEBA');
    fireEvent.change(screen.getByLabelText('Filtrar docentes por periodo de prueba'), { target: { value: 'EN_PRUEBA' } });
    await waitFor(() => expect(getBancoDocentes).toHaveBeenCalledWith(expect.objectContaining({ periodoPrueba: 'EN_PRUEBA' })));
    fireEvent.change(screen.getByLabelText('Filtrar docentes por periodo de prueba'), { target: { value: 'PENDIENTE' } });
    await waitFor(() => expect(getBancoDocentes).toHaveBeenCalledWith(expect.objectContaining({ periodoPrueba: 'PENDIENTE' })));
    fireEvent.click(screen.getByRole('button', { name: /Limpiar/ }));
    await waitFor(() => expect((screen.getByLabelText('Filtrar docentes por periodo de prueba') as HTMLSelectElement).value).toBe(''));
  });

  it('CA-08: solo quien gestiona el RUND ve el botón de decisión; el de otra vinculación nunca', async () => {
    grantedPermissions = ['banco-docentes.rund.manage'];
    listado([enPrueba, carrera]);
    const { unmount } = render(<BancoDocentesPTA />);
    await screen.findByText('DOCENTE EN PRUEBA');
    expect(screen.getAllByTitle('Registrar decisión del comité')).toHaveLength(1);
    unmount();

    for (const permissions of [['banco-docentes.rund.revision'], ['banco-docentes.rund.view', 'banco-docentes.rund.edit'], ['banco-docentes.rund.consulta']]) {
      grantedPermissions = permissions;
      const view = render(<BancoDocentesPTA />);
      await screen.findByText('DOCENTE EN PRUEBA');
      expect(screen.queryByTitle('Registrar decisión del comité')).toBeNull();
      view.unmount();
    }
  });

  it('abre el modal de decisión del docente elegido', async () => {
    grantedPermissions = ['banco-docentes.rund.manage'];
    listado([enPrueba]);
    render(<BancoDocentesPTA />);
    await screen.findByText('DOCENTE EN PRUEBA');
    fireEvent.click(screen.getByTitle('Registrar decisión del comité'));
    expect(await screen.findByText('Decisión del comité de DOCENTE EN PRUEBA')).toBeTruthy();
  });

  it('con decisión registrada ofrece corregirla y muestra el resultado', async () => {
    grantedPermissions = ['banco-docentes.rund.manage'];
    listado([{ ...carrera, nombre_completo: 'DOCENTE QUE SUPERO', periodo_prueba: { en_periodo_prueba: false, inicio: '2024-08-01', cumplimiento: '2025-08-01', dias_restantes: -470, pendiente_decision: false,
      decision: { resultado: 'SUPERA', resultadoEtiqueta: 'Supera el periodo de prueba', fechaComite: '2025-08-10', motivo: null, observacion: null, soporteNombre: 'acta.pdf' } } }]);
    render(<BancoDocentesPTA />);
    const fila = (await screen.findByText('DOCENTE QUE SUPERO')).closest('tr')!;
    expect(within(fila).getByText('Supera el periodo de prueba · comité 10/08/2025')).toBeTruthy();
    expect(within(fila).getByTitle('Corregir decisión del comité')).toBeTruthy();
  });

  it('CA-03: avisa al GGP cuántos docentes tienen el año cumplido y permite ver los pendientes', async () => {
    grantedPermissions = ['banco-docentes.rund.manage'];
    listado([enPrueba]);
    vi.mocked(getAlertasPeriodoPrueba).mockResolvedValue({ success: true, data: { total: 2, items: [
      { docente_id: 'a', nombre_completo: 'ANA ALERTA', periodo_carga: '2026-2', inicio: '2025-08-01', cumplimiento: '2026-08-01', dias_vencido: 106 },
      { docente_id: 'b', nombre_completo: 'BETO ALERTA', periodo_carga: '2026-2', inicio: '2025-11-15', cumplimiento: '2026-11-15', dias_vencido: 0 },
    ] } } as any);
    render(<BancoDocentesPTA />);
    const alerta = await screen.findByTestId('alerta-periodo-prueba');
    expect(alerta.textContent).toContain('2 docentes cumplieron el año de periodo de prueba');
    expect(alerta.textContent).toContain('ANA ALERTA · cumplió el 01/08/2026 (Vencido hace 106 días)');
    expect(alerta.textContent).toContain('BETO ALERTA · cumplió el 15/11/2026 (Se cumple hoy)');
    fireEvent.click(within(alerta).getByRole('button', { name: 'Ver pendientes' }));
    await waitFor(() => expect(getBancoDocentes).toHaveBeenCalledWith(expect.objectContaining({ periodoPrueba: 'PENDIENTE' })));
  });

  it('sin permiso de gestión no consulta ni muestra la alerta; sin pendientes tampoco la muestra', async () => {
    grantedPermissions = ['banco-docentes.rund.revision'];
    listado([enPrueba]);
    const { unmount } = render(<BancoDocentesPTA />);
    await screen.findByText('DOCENTE EN PRUEBA');
    expect(getAlertasPeriodoPrueba).not.toHaveBeenCalled();
    expect(screen.queryByTestId('alerta-periodo-prueba')).toBeNull();
    unmount();

    grantedPermissions = ['banco-docentes.rund.manage'];
    vi.mocked(getAlertasPeriodoPrueba).mockResolvedValue({ success: true, data: { total: 0, items: [] } } as any);
    render(<BancoDocentesPTA />);
    await screen.findByText('DOCENTE EN PRUEBA');
    await waitFor(() => expect(getAlertasPeriodoPrueba).toHaveBeenCalled());
    expect(screen.queryByTestId('alerta-periodo-prueba')).toBeNull();
  });

  it('la notificación de la alerta abre el listado ya filtrado por pendientes', async () => {
    grantedPermissions = ['banco-docentes.rund.manage'];
    listado([enPrueba]);
    window.history.pushState({}, '', '/?module=banco-docentes-pta&rundPeriodoPrueba=PENDIENTE');
    try {
      render(<BancoDocentesPTA />);
      await screen.findByText('DOCENTE EN PRUEBA');
      expect((screen.getByLabelText('Filtrar docentes por periodo de prueba') as HTMLSelectElement).value).toBe('PENDIENTE');
      expect(getBancoDocentes).toHaveBeenCalledWith(expect.objectContaining({ periodoPrueba: 'PENDIENTE' }));
    } finally {
      window.history.pushState({}, '', '/');
    }
  });

  it('el borrado masivo de «todos los resultados» conserva el filtro de periodo de prueba', async () => {
    grantedPermissions = ['banco-docentes.rund.carga'];
    listado([enPrueba, { ...enPrueba, id: 'prueba-2', nombre_completo: 'OTRO EN PRUEBA' }]);
    vi.mocked(getBancoDocentes).mockResolvedValue({ success: true, data: { data: [enPrueba, { ...enPrueba, id: 'prueba-2', nombre_completo: 'OTRO EN PRUEBA' }], total: 80, pages: 2 } } as any);
    vi.mocked(previewRundDeletion).mockResolvedValue({ ids: ['prueba-1'], fingerprint: 'h', total: 1, registros: [{ id: 'prueba-1', nombre_completo: 'DOCENTE EN PRUEBA', documento_identidad: 'T', periodo_carga: '2026-2' }] });
    render(<BancoDocentesPTA />);
    await screen.findByText('DOCENTE EN PRUEBA');
    fireEvent.change(screen.getByLabelText('Filtrar docentes por periodo de prueba'), { target: { value: 'PENDIENTE' } });
    await waitFor(() => expect((screen.getByRole('checkbox', { name: 'Seleccionar docentes de esta página' }) as HTMLInputElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar docentes de esta página' }));
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar todos los resultados (80)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar seleccionados (80)' }));
    await waitFor(() => expect(previewRundDeletion).toHaveBeenCalledWith(expect.objectContaining({
      todosFiltrados: true, filters: expect.objectContaining({ periodoPrueba: 'PENDIENTE' }),
    })));
  });
});
