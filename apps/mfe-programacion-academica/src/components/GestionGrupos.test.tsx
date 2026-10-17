// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GestionGrupos } from './GestionGrupos';
import { actualizarOfertaCetapGrupo, crearGrupos, getGrupos, getOfertasCetapGrupo } from '../services/api/catalogoApi';

vi.mock('../services/api/catalogoApi', () => ({
  actualizarOfertaCetapGrupo: vi.fn(), crearGrupos: vi.fn(), eliminarGrupo: vi.fn(),
  getGrupos: vi.fn(), getOfertasCetapGrupo: vi.fn(),
}));
vi.mock('./CalendarioHorario', () => ({ CalendarioHorario: () => null }));

const oferta = (id: string, nombre: string, territorial: string | null = '900001') => ({
  idOfertaCetap: id, idPrograma: '5', idPeriodoAcademico: '11',
  cetap: { id, codigo: `CET-${id}`, nombre },
  territorial: { codigo: 'SC', nombre: 'SEDE_CENTRAL', idSeccional: territorial },
});
const grupo = { idGrupo: 'grupo-1', idAsignatura: 'asig-1', idPeriodo: '11',
  idOfertaCetap: null, numeroGrupo: 1, idDocente: null, cupoMaximo: 30,
  estado: 'activo', fechaInicio: null, fechaFin: null };
const props = { idAsignatura: 'asig-1', nombreAsignatura: 'Derecho', codigoAsignatura: 'DER-1', idPeriodo: '11' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getGrupos).mockResolvedValue([grupo] as any);
  vi.mocked(getOfertasCetapGrupo).mockResolvedValue([
    oferta('165', 'Sede Central'), oferta('166', 'Neiva'), oferta('167', 'Sin cruce', null),
  ] as any);
  vi.mocked(crearGrupos).mockResolvedValue([]);
  vi.mocked(actualizarOfertaCetapGrupo).mockImplementation(async (_id, idOfertaCetap) =>
    ({ ...grupo, idOfertaCetap }) as any);
});
afterEach(cleanup);

describe('oferta CETAP de grupos', () => {
  it('consulta por asignatura y periodo, busca y guarda la oferta al crear grupos', async () => {
    render(<GestionGrupos {...props} />);
    await waitFor(() => expect(getOfertasCetapGrupo).toHaveBeenCalledWith('asig-1', '11'));
    await waitFor(() => expect((screen.getByRole('combobox', { name: 'Oferta CETAP para grupos nuevos' }) as HTMLSelectElement).disabled).toBe(false));
    fireEvent.change(screen.getByLabelText('Oferta CETAP para grupos nuevos', { selector: 'select' }),
      { target: { value: '165' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear grupos' }));
    await waitFor(() => expect(crearGrupos).toHaveBeenCalledWith('asig-1', 1, '11', '165'));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar oferta cetap para grupos nuevos' }),
      { target: { value: 'Neiva' } });
    expect(screen.getByLabelText('Oferta CETAP para grupos nuevos', { selector: 'select' }).textContent).toContain('Neiva');
    expect(screen.getByLabelText('Oferta CETAP para grupos nuevos', { selector: 'select' }).textContent).not.toContain('Sin cruce');
  });

  it('asigna y quita la oferta de un grupo existente con PATCH', async () => {
    vi.mocked(getGrupos).mockResolvedValueOnce([grupo] as any)
      .mockResolvedValueOnce([{ ...grupo, idOfertaCetap: '166' }] as any)
      .mockResolvedValue([{ ...grupo, idOfertaCetap: null }] as any);
    render(<GestionGrupos {...props} />);
    const selector = await screen.findByLabelText('Oferta CETAP del grupo 1', { selector: 'select' });
    await waitFor(() => expect((selector as HTMLSelectElement).disabled).toBe(false));
    fireEvent.change(selector, { target: { value: '166' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar ubicación' }));
    await waitFor(() => expect(actualizarOfertaCetapGrupo).toHaveBeenCalledWith('grupo-1', '166'));
    await waitFor(() => expect((screen.getByLabelText('Oferta CETAP del grupo 1', { selector: 'select' }) as HTMLSelectElement).value).toBe('166'));
    fireEvent.change(await screen.findByLabelText('Oferta CETAP del grupo 1', { selector: 'select' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar ubicación' }));
    await waitFor(() => expect(actualizarOfertaCetapGrupo).toHaveBeenCalledWith('grupo-1', null));
  });

  it('avisa si la oferta no tiene territorial vinculada y revierte el valor rechazado', async () => {
    vi.mocked(actualizarOfertaCetapGrupo).mockRejectedValue(new Error('Las aulas 101 del grupo no son del CETAP CET-167.'));
    vi.mocked(getGrupos).mockResolvedValue([{ ...grupo, idOfertaCetap: '165' }] as any);
    render(<GestionGrupos {...props} />);
    const selector = await screen.findByLabelText('Oferta CETAP del grupo 1', { selector: 'select' });
    await waitFor(() => expect((selector as HTMLSelectElement).disabled).toBe(false));
    fireEvent.change(selector, { target: { value: '167' } });
    expect(screen.getByText(/no tiene territorial vinculada/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar ubicación' }));
    expect(await screen.findByText('Las aulas 101 del grupo no son del CETAP CET-167.')).toBeTruthy();
    expect((screen.getByLabelText('Oferta CETAP del grupo 1', { selector: 'select' }) as HTMLSelectElement).value).toBe('165');
  });

  it('un periodo sin ofertas conserva la creación opcional sin idOfertaCetap', async () => {
    vi.mocked(getOfertasCetapGrupo).mockResolvedValue([]);
    render(<GestionGrupos {...props} />);
    expect(await screen.findByText(/No hay ofertas CETAP activas/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Crear grupos' }));
    await waitFor(() => expect(crearGrupos).toHaveBeenCalledWith('asig-1', 1, '11', null));
  });

  it('permite crear grupos sin oferta mientras se consultan las ofertas', async () => {
    vi.mocked(getOfertasCetapGrupo).mockImplementation(() => new Promise(() => {}));
    render(<GestionGrupos {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Crear grupos' }));
    await waitFor(() => expect(crearGrupos).toHaveBeenCalledWith('asig-1', 1, '11', null));
  });

  it('permite crear grupos sin oferta si la consulta de ofertas falla', async () => {
    vi.mocked(getOfertasCetapGrupo).mockRejectedValue(new Error('Servicio no disponible'));
    render(<GestionGrupos {...props} />);
    expect(await screen.findByText(/No se pudieron cargar las ofertas CETAP/)).toBeTruthy();
    expect(screen.getByText(/Puedes crear grupos sin oferta y asignarla después/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Crear grupos' }));
    await waitFor(() => expect(crearGrupos).toHaveBeenCalledWith('asig-1', 1, '11', null));
  });
});
