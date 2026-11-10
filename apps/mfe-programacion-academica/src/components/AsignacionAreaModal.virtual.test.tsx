// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AsignacionAreaModal } from './AsignacionAreaModal';
import { asignarFranjas, getCandidatosArea } from '../services/api/asignacionAreaApi';

vi.mock('../services/api/asignacionAreaApi', () => ({ getCandidatosArea: vi.fn(), asignarFranjas: vi.fn() }));

const candidato = {
  documento: '1020304055', nombre: 'Lucía Docente', vinculacion: 'Cátedra', perfil: null,
  titulos: { pregrado: null, especializacion: null, maestria: null, doctorado: null, posdoctorado: null },
  nucleos: [], origenArea: 'rund', horasProgramadas: 0, horasImpacto: 64, tope: 304, cruce: false, motivos: [], asignable: true, avisos: [],
};
const grupo: any = { idGrupo: 'g-v', numeroGrupo: 1, franjas: [], docentes: [], modalidad: 'virtual', horarioPorDefinir: true };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCandidatosArea).mockResolvedValue({ grupo: 'g-v', franjas: [], area: { codigo: 'AF-01', nombre: 'Estado y Poder', nucleoAsignatura: null }, candidatos: [candidato], sugerido: null, mensaje: null } as any);
  vi.mocked(asignarFranjas).mockResolvedValue({ asignado: true });
});
afterEach(cleanup);

it('grupo virtual sin horario: consulta candidatos sin franjas y asigna al grupo; el docente define el horario', async () => {
  const cerrar = vi.fn();
  render(<AsignacionAreaModal grupo={grupo} asignatura="Teoría del Estado" cerrar={cerrar} retornarFoco={null} />);
  await waitFor(() => expect(getCandidatosArea).toHaveBeenCalledWith('g-v', []));
  expect(screen.getByText(/Horario por definir: lo define el docente asignado/)).toBeTruthy();
  expect(screen.queryByText('Selecciona al menos una franja.')).toBeNull();
  fireEvent.click(await screen.findByRole('radio'));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
  await waitFor(() => expect(asignarFranjas).toHaveBeenCalledWith('g-v', '1020304055', []));
  await waitFor(() => expect(cerrar).toHaveBeenCalled());
});
