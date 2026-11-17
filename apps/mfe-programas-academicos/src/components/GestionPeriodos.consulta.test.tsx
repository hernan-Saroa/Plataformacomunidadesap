// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GestionPeriodos } from './GestionPeriodos';
const getPeriodos = vi.fn(), getPeriodoDetalle = vi.fn(), crear = vi.fn();
vi.mock('../hooks/useImportAsignaturas', () => ({ useImportAsignaturas: () => ({ getPeriodos, getPeriodoDetalle, createPeriodo: crear, updatePeriodo: crear, deletePeriodo: crear }) }));
const principal = { id: 'p1', codigo: '2027-2', semestre: 2, estado: 'en_curso', fechaInicio: '2027-07-01', fechaFin: '2027-12-15' };
beforeEach(() => { vi.clearAllMocks(); getPeriodos.mockResolvedValue([principal, { ...principal, id: 'p2', codigo: '2027-INT', tipo: 'personalizado', nombre: 'Interperiodo', extraordinario: true }]); getPeriodoDetalle.mockResolvedValue({ success: true, programs: [{ id: 'pr1', codigo: 'AP', nombre: 'Administración Pública', subjectsCount: 7, activeCetaps: 1 }], cetaps: [] }); });
afterEach(cleanup);
const montar = () => render(<GestionPeriodos onBack={() => {}} onNavigateToImport={() => {}} />);
it('es solo consulta y enlaza al módulo del shell sin URL de remoto ni puerto fijo', async () => {
  montar(); await screen.findByText('2027-2');
  expect(screen.queryByRole('form')).toBeNull(); expect(document.querySelector('input')).toBeNull();
  for (const nombre of [/Crear Periodo/, /Activar/, /Desactivar/, /Eliminar/, /Importar/]) expect(screen.queryByRole('button', { name: nombre })).toBeNull();
  const href = (screen.getByRole('link', { name: 'Ir a Programación Académica' }) as HTMLAnchorElement).href;
  expect(new URL(href).origin).toBe(window.location.origin);
  expect(new URL(href).searchParams.get('module')).toBe('programacion-academica');
  expect(screen.getByText(/Principal en curso/)).toBeTruthy(); expect(screen.getByText(/Extraordinario en curso/)).toBeTruthy(); expect(crear).not.toHaveBeenCalled();
});
it('conserva la consulta del detalle de programas y oferta CETAP', async () => {
  montar(); fireEvent.click((await screen.findAllByRole('button', { name: 'Consultar detalle' }))[0]);
  expect(await screen.findByText(/Administración Pública/)).toBeTruthy();
  expect(screen.getByText('Sin oferta CETAP en este periodo.')).toBeTruthy();
  expect(getPeriodoDetalle).toHaveBeenCalledWith('p1');
});
it('distingue carga, vacío y error de consulta', async () => {
  getPeriodos.mockResolvedValueOnce([]); montar();
  expect(await screen.findByText(/No hay periodos registrados/)).toBeTruthy(); cleanup();
  getPeriodos.mockRejectedValueOnce(new Error('Consulta no disponible')); montar();
  await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Consulta no disponible'));
});
