import { crearDias, validarDias } from '../services/api/horarioQaApi';
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarioHorario } from './CalendarioHorario';
import { actualizarOfertaCetapGrupo, getAulas, getGrupo, getHorasGrupo, getSesiones } from '../services/api/catalogoApi';

vi.mock('../services/api/horarioQaApi', () => ({ crearDias: vi.fn(), validarDias: vi.fn(), editarSesion: vi.fn(), borrarSesion: vi.fn(), ErrorHorario: class extends Error {} }));
vi.mock('../services/actualizacionProgramacion', () => ({ useRevisionProgramacion: () => 0 }));
vi.mock('../services/api/catalogoApi', () => ({
  actualizarOfertaCetapGrupo: vi.fn(), crearSesion: vi.fn(), eliminarSesion: vi.fn(),
  getAulas: vi.fn(), getGrupo: vi.fn(), getHorasGrupo: vi.fn(), getSesiones: vi.fn(), definirPeriodoGrupo: vi.fn(),
  esSinAula: (m: string) => m === 'virtual' || m === 'distancia',
  etiquetaModalidad: (m: string) => m === 'distancia' ? 'A distancia' : m === 'virtual' ? 'Virtual' : 'Presencial',
}));

const grupo = { idGrupo: 'grupo-1', idAsignatura: 'asig-1', idPeriodo: '11', idOfertaCetap: null,
  numeroGrupo: 1, idDocente: null, cupoMaximo: 30, estado: 'activo', fechaInicio: null, fechaFin: null };
const aula = { codigo: 'A-202', nombre: 'Aula 202', sedeCodigo: 'HUI', capacidad: 30, provisional: false,
  territorial: { codigo: 'HUI', nombre: 'Huila' }, cetap: { codigo: 'CET-0135', nombre: 'Neiva' }, idOfertaCetap: '165' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(validarDias).mockResolvedValue({ valido: true, dias: [{ diaSemana: 'LUNES', ok: true, conflictos: [] }], horas: { programadasDespues: 32, requeridas: 64, excede: false } });
  vi.mocked(crearDias).mockResolvedValue({ creadas: [], horas: { programadas: 32, requeridas: 64, semanas: 16, excede: false } });
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.mocked(getGrupo).mockResolvedValue(grupo as any);
  vi.mocked(getAulas).mockResolvedValue([aula] as any);
  vi.mocked(getSesiones).mockResolvedValue([]);
  vi.mocked(getHorasGrupo).mockResolvedValue({ programadas: 0, requeridas: 20, semanas: 10, excede: false });
  vi.mocked(actualizarOfertaCetapGrupo).mockResolvedValue({ ...grupo, idOfertaCetap: '165' } as any);
  vi.mocked(crearDias).mockResolvedValue({ idFranja: 'franja-1' } as any);
});
afterEach(cleanup);

describe('aula y oferta relacionadas', () => {
  it('consulta aulas válidas para el grupo y completa la oferta al guardar la primera sesión presencial', async () => {
    const onOfertaActualizada = vi.fn();
    render(<CalendarioHorario idGrupo="grupo-1" numeroGrupo={1} nombreAsignatura="Derecho" onOfertaActualizada={onOfertaActualizada} />);
    await waitFor(() => expect(getAulas).toHaveBeenCalledWith({ grupo: 'grupo-1' }));
    const dia = await screen.findByTitle(/Clic o arrastre para agregar una sesión el lun/i);
    fireEvent.click(screen.getByRole('button', { name: 'Agregar sesión' }));
    const aulaSelect = await screen.findByRole('combobox', { name: /Aula/i });
    fireEvent.change(aulaSelect, { target: { value: 'A-202' } });
    expect(screen.getByText(/oferta CETAP de esta aula se asignará automáticamente/)).toBeTruthy();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Validar días' }));
    fireEvent.click(await within(screen.getByRole('dialog')).findByRole('button', { name: 'Agregar sesiones' }));
    await waitFor(() => expect(actualizarOfertaCetapGrupo).toHaveBeenCalledWith('grupo-1', '165'));
    await waitFor(() => expect(crearDias).toHaveBeenCalledWith(expect.objectContaining({ idGrupo: 'grupo-1', aulaCodigo: 'A-202', tipoSesion: 'presencial' })));
    expect(onOfertaActualizada).toHaveBeenCalledWith(expect.objectContaining({ idOfertaCetap: '165' }));
    expect(vi.mocked(actualizarOfertaCetapGrupo).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(crearDias).mock.invocationCallOrder[0]);
  });

  it('con oferta existente usa aulas filtradas y no vuelve a asignarla', async () => {
    vi.mocked(getGrupo).mockResolvedValue({ ...grupo, idOfertaCetap: '165' } as any);
    render(<CalendarioHorario idGrupo="grupo-1" numeroGrupo={1} nombreAsignatura="Derecho" />);
    await waitFor(() => expect(getAulas).toHaveBeenCalledWith({ grupo: 'grupo-1' }));
    const dia = await screen.findByTitle(/Clic o arrastre para agregar una sesión el lun/i);
    fireEvent.click(screen.getByRole('button', { name: 'Agregar sesión' }));
    fireEvent.change(await screen.findByRole('combobox', { name: /Aula/i }), { target: { value: 'A-202' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Validar días' }));
    fireEvent.click(await within(screen.getByRole('dialog')).findByRole('button', { name: 'Agregar sesiones' }));
    await waitFor(() => expect(crearDias).toHaveBeenCalled());
    expect(actualizarOfertaCetapGrupo).not.toHaveBeenCalled();
  });

  it('el botón «Agregar sesión» abre el MODAL; un grupo a distancia solo permite sesiones mediadas, sin aula', async () => {
    render(<CalendarioHorario idGrupo="grupo-1" numeroGrupo={1} nombreAsignatura="Derecho" modalidad="distancia" />);
    expect(await screen.findByRole('note')).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: 'Agregar sesión' }));
    const dialogo = await screen.findByRole('dialog');
    expect((within(dialogo).getByRole('radio', { name: 'Presencial' }) as HTMLInputElement).disabled).toBe(true);
    expect((within(dialogo).getByRole('radio', { name: 'Mediada por tecnología' }) as HTMLInputElement).checked).toBe(true);
    expect((within(dialogo).getByRole('combobox', { name: /Aula/i }) as HTMLSelectElement).disabled).toBe(true);
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Validar días' }));
    fireEvent.click(await within(dialogo).findByRole('button', { name: 'Agregar sesiones' }));
    await waitFor(() => expect(crearDias).toHaveBeenCalledWith(expect.objectContaining({ tipoSesion: 'mediada_tecnologia', aulaCodigo: null })));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
