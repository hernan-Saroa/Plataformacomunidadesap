import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RundConfiguracionCarpetas } from './RundConfiguracionCarpetas';
import { apiClient } from '../../../../../shell/src/services/api';

vi.mock('../../../../../shell/src/services/api', () => ({ apiClient: { get: vi.fn(), put: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const matriz = (inactivas: Record<string, string[]> = {}) => ({
  tipos: [{ codigo: 'CATEDRA', nombre: 'Hora cátedra' }, { codigo: 'CARRERA2', nombre: 'Carrera 2' }],
  carpetas: [
    { bloque: 'IDENTIDAD', obligatoria: true }, { bloque: 'PRODUCTIVIDAD_ACADEMICA', obligatoria: false },
    { bloque: 'SEGUNDA_LENGUA', obligatoria: false },
  ],
  inactivas,
});

beforeEach(() => { vi.clearAllMocks(); vi.mocked(apiClient.get).mockResolvedValue(matriz() as any); vi.mocked(apiClient.put).mockResolvedValue({} as any); });
afterEach(cleanup);

describe('Pestaña Configuración de carpetas', () => {
  it('muestra una fila por carpeta y una columna por tipo de vinculación', async () => {
    render(<RundConfiguracionCarpetas />);
    await screen.findByText('Configuración de carpetas');
    expect(screen.getByRole('columnheader', { name: /Hora cátedra/ })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: /Carrera 2/ })).toBeTruthy();
    expect(screen.getByRole('rowheader', { name: /05\s*Productividad académica/ })).toBeTruthy();
    expect(screen.getAllByRole('switch')).toHaveLength(6);
  });

  it('las carpetas obligatorias para activar el perfil no se pueden desactivar', async () => {
    render(<RundConfiguracionCarpetas />);
    const interruptor = await screen.findByRole('switch', { name: /00 Datos básicos · Hora cátedra/ }) as HTMLInputElement;
    expect(interruptor.disabled).toBe(true);
    expect(interruptor.checked).toBe(true);
    expect(screen.getAllByText('Obligatoria').length).toBe(1);
  });

  it('las cuatro primeras carpetas (00 a 03) son obligatorias y bloqueadas para todos los tipos de vinculación', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      tipos: [{ codigo: 'CATEDRA', nombre: 'Hora cátedra' }, { codigo: 'CARRERA2', nombre: 'Carrera 2' }],
      carpetas: [
        { bloque: 'IDENTIDAD', obligatoria: true }, { bloque: 'FORMACION', obligatoria: true },
        { bloque: 'EXPERIENCIA_DOCENTE', obligatoria: true }, { bloque: 'EXPERIENCIA_LABORAL', obligatoria: true },
        { bloque: 'PRODUCTIVIDAD_ACADEMICA', obligatoria: false },
      ],
      inactivas: {},
    } as any);
    render(<RundConfiguracionCarpetas />);
    await screen.findByText('Configuración de carpetas');
    expect(screen.getAllByText('Obligatoria')).toHaveLength(4);
    for (const carpeta of ['00 Datos básicos', '01 Títulos de formación', '02 Experiencia docente', '03 Experiencia laboral']) {
      for (const tipo of ['Hora cátedra', 'Carrera 2']) {
        const interruptor = screen.getByRole('switch', { name: new RegExp(`${carpeta} · ${tipo}`) }) as HTMLInputElement;
        expect(interruptor.disabled).toBe(true);
        expect(interruptor.checked).toBe(true);
      }
    }
    expect((screen.getByRole('switch', { name: /05 Productividad académica · Hora cátedra/ }) as HTMLInputElement).disabled).toBe(false);
  });

  it('desactivar una carpeta para un tipo guarda el cambio y lo refleja', async () => {
    render(<RundConfiguracionCarpetas />);
    const interruptor = await screen.findByRole('switch', { name: /05 Productividad académica · Hora cátedra/ }) as HTMLInputElement;
    expect(interruptor.checked).toBe(true);
    fireEvent.click(interruptor);
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith(expect.stringContaining('/carpetas/configuracion'),
      { tipoVinculacion: 'CATEDRA', bloque: 'PRODUCTIVIDAD_ACADEMICA', activo: false }));
    await waitFor(() => expect((screen.getByRole('switch', { name: /05 Productividad académica · Hora cátedra/ }) as HTMLInputElement).checked).toBe(false));
    expect((screen.getByRole('switch', { name: /05 Productividad académica · Carrera 2/ }) as HTMLInputElement).checked).toBe(true);
  });

  it('muestra como "No aplica" lo que ya estaba desactivado', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(matriz({ CATEDRA: ['SEGUNDA_LENGUA'] }) as any);
    render(<RundConfiguracionCarpetas />);
    const interruptor = await screen.findByRole('switch', { name: /06 Dominio de segunda lengua · Hora cátedra/ }) as HTMLInputElement;
    expect(interruptor.checked).toBe(false);
    expect(screen.getAllByText('No aplica')).toHaveLength(1);
  });

  it('si el servidor rechaza el cambio, el interruptor vuelve a su estado anterior', async () => {
    vi.mocked(apiClient.put).mockRejectedValue(new Error('Sin permiso'));
    render(<RundConfiguracionCarpetas />);
    const interruptor = await screen.findByRole('switch', { name: /05 Productividad académica · Hora cátedra/ }) as HTMLInputElement;
    fireEvent.click(interruptor);
    await waitFor(() => expect(apiClient.put).toHaveBeenCalled());
    await waitFor(() => expect((screen.getByRole('switch', { name: /05 Productividad académica · Hora cátedra/ }) as HTMLInputElement).checked).toBe(true));
  });

  it('si no carga la configuración ofrece reintentar', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Error de red'));
    render(<RundConfiguracionCarpetas />);
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByText('Configuración de carpetas');
  });
});
