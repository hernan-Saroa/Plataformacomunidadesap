import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { BancoDocentesPTA } from './BancoDocentesPTA';
import { getBancoDocentes, previewRundDeletion, confirmRundDeletion } from '../../../services/api/ptaApi';
import { downloadBancoDocentesExport } from '../../../utils/bancoDocentesExcel';

vi.mock('../../../services/api/ptaApi', () => ({ getRundConvocatorias: vi.fn().mockResolvedValue([]),
  getBancoDocentes: vi.fn(),
  getBancoDocenteStats: vi.fn().mockResolvedValue({ success: true, data: { total: 1 } }),
  getCatalogoTerritoriales: vi.fn().mockResolvedValue({ success: true, data: [] }),
  previewRundDeletion: vi.fn(), confirmRundDeletion: vi.fn(),
}));
vi.mock('../../../../../shell/src/services/api', () => ({ apiClient: {
  get: vi.fn().mockResolvedValue([{ codigo: '2026-2', estado: 'en_curso' }]),
} }));
let grantedPermissions: string[] | null = null;
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ hasPermission: (permission: string) => grantedPermissions === null || grantedPermissions.includes(permission) }) }));
vi.mock('../../../utils/bancoDocentesExcel', () => ({ downloadBancoDocentesTemplate: vi.fn(), downloadBancoDocentesExport: vi.fn() }));
vi.mock('./BancoDocenteDetalleInline', () => ({ BancoDocenteDetalleInline: () => <tr><td>Detalle abierto</td></tr> }));
vi.mock('./BancoDocenteEditModal', () => ({ BancoDocenteEditModal: () => null }));
vi.mock('./BancoDocenteEstadoModal', () => ({ BancoDocenteEstadoModal: () => null }));
vi.mock('./BancoDocentesBulkUpload', () => ({ BancoDocentesBulkUpload: () => null }));
vi.mock('./TableroInvitacionesRUND', () => ({ TableroInvitacionesRUND: () => null }));
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
