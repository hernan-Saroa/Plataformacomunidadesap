// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GestionPeriodos } from './GestionPeriodos';
import { useImportAsignaturas } from '../hooks/useImportAsignaturas';

vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ hasPermission: () => false, loading: false }) }));
vi.mock('../hooks/useImportAsignaturas', () => ({ useImportAsignaturas: vi.fn() }));
const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { error: (m: string) => toastError(m), success: vi.fn() } }));
vi.mock('../services/api/apiClient', () => ({ apiClient: { post: vi.fn() } }));

const principal = { id: '12', codigo: '2027-2', tipo: 'semestral', nombre: null, anio: 2027, semestre: 2, fechaInicio: '2027-07-01', fechaFin: '2027-12-15', estado: 'en_curso', extraordinario: false, motivoExtraordinario: null };
const getPeriodos = vi.fn(), createPeriodo = vi.fn(), alCambiar = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  getPeriodos.mockResolvedValue([principal]);
  createPeriodo.mockResolvedValue({ codigo: '2028-INT' });
  vi.mocked(useImportAsignaturas).mockReturnValue({
    getPeriodos, createPeriodo, getLastImport: vi.fn().mockResolvedValue({ success: true, counts: {} }), loading: false,
  } as any);
});
afterEach(cleanup);

const abrirCrear = async () => {
  render(<GestionPeriodos onBack={() => {}} onNavigateToImport={() => {}} onPeriodosChanged={alCambiar} />);
  fireEvent.click((await screen.findAllByRole('button', { name: /Crear Periodo/ }))[0]);
  return screen.findByLabelText('Tipo de periodo') as Promise<HTMLSelectElement>;
};
const llenarFechas = () => {
  const [inicio, fin] = Array.from(document.querySelectorAll('input[type=date]')) as HTMLInputElement[];
  fireEvent.change(inicio, { target: { value: '2028-06-15' } });
  fireEvent.change(fin, { target: { value: '2028-06-30' } });
};

it('el tipo de periodo ofrece semestre 1, semestre 2 y personalizado', async () => {
  const tipo = await abrirCrear();
  expect(Array.from(tipo.options).map(o => o.value)).toEqual(['1', '2', 'personalizado']);
  expect(screen.queryByLabelText(/Nombre del periodo/)).toBeNull();
});

it('un periodo personalizado se crea con nombre y código que define quien lo crea, sin semestre', async () => {
  const tipo = await abrirCrear();
  fireEvent.change(tipo, { target: { value: 'personalizado' } });
  fireEvent.change(await screen.findByPlaceholderText(/Interperiodo 2027/), { target: { value: '  Interperiodo 2028  ' } });
  fireEvent.change(screen.getByPlaceholderText('INT'), { target: { value: 'int' } });
  const anio = document.querySelector('input[type=number]') as HTMLInputElement;
  fireEvent.change(anio, { target: { value: '2028' } });
  llenarFechas();
  fireEvent.click(document.querySelector('form button[type=submit]') as HTMLButtonElement);
  // El envío del formulario resuelve en una tarea posterior; se espera antes de consultar el espía.
  await new Promise(r => setTimeout(r, 300));
  await waitFor(() => expect(createPeriodo).toHaveBeenCalledTimes(1), { timeout: 4000 });
  expect(createPeriodo).toHaveBeenCalledWith({
    tipo: 'personalizado', anio: 2028, codigo: '2028-INT', nombre: 'Interperiodo 2028', fechaInicio: '2028-06-15', fechaFin: '2028-06-30',
  });
  expect(alCambiar).toHaveBeenCalledTimes(1);
});

it('un código personalizado que se confunde con un semestre (1 o 2) no se envía', async () => {
  const tipo = await abrirCrear();
  fireEvent.change(tipo, { target: { value: 'personalizado' } });
  fireEvent.change(await screen.findByPlaceholderText(/Interperiodo 2027/), { target: { value: 'Verano' } });
  fireEvent.change(screen.getByPlaceholderText('INT'), { target: { value: '1' } });
  llenarFechas();
  fireEvent.click(document.querySelector('form button[type=submit]') as HTMLButtonElement);
  await new Promise(r => setTimeout(r, 100));
  expect(createPeriodo).not.toHaveBeenCalled();
  expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/no puede ser 1 ni 2/));
});

it('el semestre sigue creándose como antes: sin tipo, nombre ni código', async () => {
  const tipo = await abrirCrear();
  fireEvent.change(tipo, { target: { value: '1' } });
  fireEvent.change(document.querySelector('input[type=number]') as HTMLInputElement, { target: { value: '2028' } });
  llenarFechas();
  fireEvent.click(document.querySelector('form button[type=submit]') as HTMLButtonElement);
  await waitFor(() => expect(createPeriodo).toHaveBeenCalledWith({ anio: 2028, semestre: 1, fechaInicio: '2028-06-15', fechaFin: '2028-06-30' }));
});
