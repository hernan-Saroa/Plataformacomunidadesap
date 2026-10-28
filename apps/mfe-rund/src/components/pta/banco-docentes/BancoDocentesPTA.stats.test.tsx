import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { BancoDocentesPTA } from './BancoDocentesPTA';
import { getBancoDocentes, getBancoDocenteStats } from '../../../services/api/rundApi';

vi.mock('../../../services/api/rundApi', () => ({ getBancoDocentes: vi.fn(), getBancoDocenteStats: vi.fn(),
  getCatalogoTerritoriales: vi.fn().mockResolvedValue({ success: true, data: [{ id: '43', nombre: 'Norte De Santander' }, { id: '44', nombre: 'Risaralda' }] }),
}));
vi.mock('../../../services/api/apiClient', () => ({ apiClient: { get: vi.fn().mockResolvedValue([
  { codigo: '2026-2', estado: 'en_curso' }, { codigo: '2025-2', estado: 'cerrado' },
]) } }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ hasPermission: () => true }) }));
vi.mock('../../../utils/bancoDocentesExcel', () => ({ downloadBancoDocentesTemplate: vi.fn() }));
vi.mock('./BancoDocenteDetalleInline', () => ({ BancoDocenteDetalleInline: () => null }));
vi.mock('./BancoDocenteEditModal', () => ({ BancoDocenteEditModal: () => null }));
vi.mock('./BancoDocenteEstadoModal', () => ({ BancoDocenteEstadoModal: () => null }));
vi.mock('./BancoDocentesBulkUpload', () => ({ BancoDocentesBulkUpload: () => null }));
vi.mock('./TableroInvitacionesRUND', () => ({ TableroInvitacionesRUND: () => null }));
vi.mock('./RundRegistrationHistory', () => ({ RundRegistrationHistory: () => null }));

const stats = { total: 8, activos: 5, inactivos: 3, total_horas: 6400, promedio_horas: 800,
  por_dedicacion: [{ dedicacion: 'TC', total: 8 }],
  por_categoria: [{ categoria: 'Titular', total: 5 }, { categoria: 'Sin categoría', total: 3 }],
  por_territorial: [{ territorial: 'NORTESANTANDER', territorial_id: '28', total: 5 }, { territorial: 'Sin territorial', territorial_id: null, total: 3 }],
  por_sede: [{ sede: 'Sin CETAP', sede_id: null, total: 8 }],
  por_vinculacion: [{ vinculacion: 'Carrera', total: 8 }],
  por_nivel_formacion: [{ nivel_formacion: 'Maestría', total: 8 }],
  por_genero: [{ genero: 'M', total: 5 }, { genero: 'F', total: 3 }],
  por_rango_edad: [{ rango_edad: 'De 36 a 45 años', total: 8 }],
  por_nucleo_tematico: [{ nucleo_tematico: 'Ciencias sociales', total: 5 }, { nucleo_tematico: 'Gestión pública', total: 2 }, { nucleo_tematico: 'Sin núcleo temático', total: 1 }],
};
const response = (data = stats) => ({ success: true, data });
beforeEach(() => {
  vi.mocked(getBancoDocentes).mockReset().mockResolvedValue({ success: true, data: { data: [], total: 0, pages: 1 } } as any);
  vi.mocked(getBancoDocenteStats).mockReset().mockResolvedValue(response());
});
afterEach(cleanup);
async function open() {
  render(<BancoDocentesPTA />);
  await screen.findByRole('button', { name: '2026-2', exact: true });
  fireEvent.click(screen.getByRole('button', { name: 'Estadísticas', exact: true }));
  await screen.findByRole('group', { name: 'Total Docentes' });
}

it('reemplaza CETAP por núcleos temáticos y conserva los ocho indicadores con información útil', async () => {
  await open();
  for (const [name, value] of [['Total Docentes', '8'], ['Activos', '5'], ['Inactivos', '3'], ['Total Horas', '6.400h'],
    ['Promedio Horas', '800h'], ['Territoriales', '1'], ['Núcleos temáticos', '2'], ['Categorías', '1']]) {
    expect(within(screen.getByRole('group', { name, exact: true })).getByText(value)).toBeTruthy();
  }
  for (const heading of ['Distribución por Dedicación', 'Distribución por Categoría', 'Tipo de Vinculación', 'Nivel de Formación',
    'Distribución por Género', 'Distribución por Rango de Edad', 'Docentes por Territorial', 'Docentes por núcleo temático']) {
    expect(screen.getByRole('heading', { name: new RegExp(heading) })).toBeTruthy();
  }
  // A complete SVG arc has identical endpoints and disappears; a single group needs a circle.
  const donut = screen.getByRole('img', { name: 'Tiempo Completo: 8' });
  expect(donut.querySelector('circle[fill="#1E40AF"]')).toBeTruthy();
  expect(screen.getByRole('img', { name: 'Masculino: 5, Femenino: 3' })).toBeTruthy();
  expect(screen.queryByRole('group', { name: 'CETAP/Sedes' })).toBeNull();
  expect(screen.queryByText('Sin CETAP')).toBeNull();
  expect(screen.getByText('1 docente sin núcleo temático registrado.')).toBeTruthy();
});

it('no sustituye las cifras del periodo seleccionado por una respuesta antigua', async () => {
  await open();
  const pending: Array<(result: any) => void> = [];
  vi.mocked(getBancoDocenteStats).mockImplementation(filters => filters?.periodoCarga === '2025-2'
    ? new Promise(resolve => pending.push(resolve)) : Promise.resolve(response({ ...stats, total: 3 })));
  fireEvent.change(screen.getByRole('combobox', { name: 'Periodo de estadísticas' }), { target: { value: '2025-2' } });
  await waitFor(() => expect(pending.length).toBeGreaterThan(0));
  expect(screen.queryByRole('group', { name: 'Total Docentes' })).toBeNull();
  fireEvent.change(screen.getByRole('combobox', { name: 'Periodo de estadísticas' }), { target: { value: '2026-2' } });
  await waitFor(() => expect(within(screen.getByRole('group', { name: 'Total Docentes' })).getByText('3')).toBeTruthy());
  await act(async () => pending.forEach(resolve => resolve(response({ ...stats, total: 99 }))));
  expect(within(screen.getByRole('group', { name: 'Total Docentes' })).queryByText('99')).toBeNull();
});

it('actualiza todos los periodos y permite cambiar de territorial sin que desaparezcan las opciones', async () => {
  await open();
  fireEvent.change(screen.getByRole('combobox', { name: 'Territorial de estadísticas' }), { target: { value: '43' } });
  await waitFor(() => expect(getBancoDocenteStats).toHaveBeenCalledWith(expect.objectContaining({ territorial: '43', periodoCarga: '2026-2' })));
  expect(within(screen.getByRole('combobox', { name: 'Territorial de estadísticas' })).getByRole('option', { name: 'Risaralda' })).toBeTruthy();
  expect(screen.getByText('Territorial: Norte De Santander')).toBeTruthy();
  fireEvent.change(screen.getByRole('combobox', { name: 'Territorial de estadísticas' }), { target: { value: '44' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Periodo de estadísticas' }), { target: { value: '' } });
  await waitFor(() => expect(getBancoDocenteStats).toHaveBeenCalledWith(expect.objectContaining({ territorial: '44', periodoCarga: undefined })));
  fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
  await waitFor(() => expect(getBancoDocenteStats).toHaveBeenCalledWith(expect.objectContaining({ territorial: undefined, dedicacion: undefined, estado: undefined, periodoCarga: undefined })));
});

it('conserva periodo y filtros al abrir el listado desde una cifra', async () => {
  await open();
  fireEvent.change(screen.getByRole('combobox', { name: 'Territorial de estadísticas' }), { target: { value: '43' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Dedicación de estadísticas' }), { target: { value: 'TC' } });
  await screen.findByRole('group', { name: 'Activos' });
  fireEvent.click(screen.getByRole('group', { name: 'Activos' }));
  await waitFor(() => expect(getBancoDocentes).toHaveBeenCalledWith(expect.objectContaining({ periodoCarga: '2026-2', territorial: '43', dedicacion: 'TC', estado: 'ACTIVO' })));
  expect((screen.getByRole('combobox', { name: 'Filtrar docentes por territorial' }) as HTMLSelectElement).value).toBe('43');
});

it('vuelve a consultar al entrar y permite reintentar sin conservar cifras de una consulta fallida', async () => {
  await open();
  fireEvent.click(screen.getByRole('button', { name: 'Listado de Docentes', exact: true }));
  vi.mocked(getBancoDocenteStats).mockResolvedValue({ success: false, data: null });
  fireEvent.click(screen.getByRole('button', { name: 'Estadísticas', exact: true }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('No fue posible'));
  expect(screen.queryByRole('group', { name: 'Total Docentes' })).toBeNull();
  vi.mocked(getBancoDocenteStats).mockResolvedValue(response({ ...stats, total: 9 }));
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await waitFor(() => expect(within(screen.getByRole('group', { name: 'Total Docentes' })).getByText('9')).toBeTruthy());
});

it('conserva todos los territoriales y núcleos y no confunde un periodo vacío con un error', async () => {
  vi.mocked(getBancoDocenteStats).mockResolvedValue(response({ ...stats,
    por_territorial: Array.from({length: 25}, (_,i) => ({ territorial: `Territorial ${i+1}`, territorial_id: String(i), total: 1 })),
    por_nucleo_tematico: Array.from({length: 35}, (_,i) => ({ nucleo_tematico: `Núcleo ${i+1}`, total: 1 })),
  }));
  await open();
  expect(screen.getByText('Territorial 25')).toBeTruthy();
  expect(screen.getByText('Núcleo 35')).toBeTruthy();
  vi.mocked(getBancoDocenteStats).mockResolvedValue(response({ total: 0, activos: 0, inactivos: 0, total_horas: 0, promedio_horas: 0 } as any));
  fireEvent.change(screen.getByRole('combobox', { name: 'Periodo de estadísticas' }), { target: { value: '2025-2' } });
  await waitFor(() => expect(within(screen.getByRole('group', { name: 'Total Docentes' })).getByText('0')).toBeTruthy());
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.queryByText('Territorial 25')).toBeNull();
  expect(screen.queryByRole('region', { name: 'Docentes por núcleo temático' })).toBeNull();
});

it('no dibuja distribuciones formadas únicamente por campos sin información', async () => {
  vi.mocked(getBancoDocenteStats).mockResolvedValue(response({ ...stats,
    por_dedicacion: [{ dedicacion: 'SIN_DEDICACION', total: 8 }],
    por_categoria: [{ categoria: 'Sin categoría', total: 8 }],
    por_vinculacion: [{ vinculacion: 'Sin vinculación', total: 8 }],
    por_nivel_formacion: [{ nivel_formacion: 'Sin información', total: 8 }],
    por_genero: [{ genero: 'No especificado', total: 8 }],
    por_rango_edad: [{ rango_edad: 'Sin dato', total: 8 }],
    por_territorial: [{ territorial: 'Sin territorial', territorial_id: null, total: 8 }],
    por_nucleo_tematico: [{ nucleo_tematico: 'Sin núcleo temático', total: 8 }],
  }));
  await open();
  expect(screen.queryAllByRole('img')).toHaveLength(0);
  expect(screen.queryByRole('heading', { name: /Distribución/ })).toBeNull();
  expect(screen.queryByRole('heading', { name: /Docentes por/ })).toBeNull();
  expect(screen.getByText('Los registros de esta consulta aún no tienen información para mostrar distribuciones.')).toBeTruthy();
});

it('agrupa núcleos repetidos y retira la gráfica si el otro periodo no tiene núcleos registrados', async () => {
  vi.mocked(getBancoDocenteStats).mockResolvedValue(response({ ...stats, por_nucleo_tematico: [
    { nucleo_tematico: 'Ciencias sociales', total: 3 }, { nucleo_tematico: ' CIENCIAS SOCIALES ', total: 4 },
    { nucleo_tematico: 'Sin núcleo temático', total: 1 },
  ] }));
  await open();
  const list=screen.getByRole('list', { name: 'Distribución por núcleo temático' });
  expect(within(list).getAllByRole('listitem')).toHaveLength(1);
  expect(within(list).getByText('7')).toBeTruthy();
  vi.mocked(getBancoDocenteStats).mockResolvedValue(response({ ...stats, por_nucleo_tematico: [{ nucleo_tematico: 'Sin núcleo temático', total: 8 }] }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Periodo de estadísticas' }), { target: { value: '2025-2' } });
  await waitFor(() => expect(within(screen.getByRole('group', { name: 'Núcleos temáticos' })).getByText('0')).toBeTruthy());
  expect(screen.queryByRole('region', { name: 'Docentes por núcleo temático' })).toBeNull();
});
