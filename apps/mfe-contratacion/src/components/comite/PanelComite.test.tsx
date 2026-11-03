import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PanelComite } from './PanelComite';
import { contratacionService } from '../../services/contratacionService';
import { EstadoComite } from '../../types';

vi.mock('../../services/contratacionService', () => ({
  contratacionService: {
    comite: vi.fn(),
    designarComite: vi.fn(),
    cargarMemorandoComite: vi.fn(),
    revocarComite: vi.fn(),
    firmaDeActividad: vi.fn().mockResolvedValue({ requiereFirma: false }),
  },
}));

// El directorio real consulta al servidor; aquí basta con elegir a alguien.
vi.mock('../estudio-previo/SelectorPersona', () => ({
  SelectorPersona: ({ onSeleccionar }: { onSeleccionar: (p: any) => void }) => (
    <button type="button" onClick={() => onSeleccionar({ id: 'per-1', nombre: 'Ana Ruiz' })}>
      Elegir a Ana
    </button>
  ),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const servicio = contratacionService as unknown as {
  comite: ReturnType<typeof vi.fn>;
  designarComite: ReturnType<typeof vi.fn>;
  cargarMemorandoComite: ReturnType<typeof vi.fn>;
};

const estado = (parcial: Partial<EstadoComite> = {}): EstadoComite => ({
  aplica: true,
  motivoNoAplica: null,
  modalidad: 'LICITACION_PUBLICA',
  modalidadNombre: 'Licitación pública',
  soyEvaluador: false,
  misDimensiones: [],
  recepcionCerrada: true,
  totalOferentes: 2,
  designado: false,
  puedeDesignar: true,
  comite: null,
  miembros: [],
  ...parcial,
});

const sinMemorando = estado({
  designado: true,
  puedeDesignar: false,
  comite: {
    id: 'c-1',
    fechaDesignacion: null,
    designadoPor: 'Gestora',
    designadoAt: '2026-10-19T15:00:00.000Z',
    memorando: null,
    puedeCargarMemorando: true,
  },
  miembros: [{ id: 'm-1', personaId: 'per-1', nombre: 'Ana Ruiz', rol: 'FINANCIERO' } as any],
});

describe('PanelComite · actividad 6.2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicio.comite.mockResolvedValue(estado());
  });

  it('designa sin memorando y llama al rol «Financiera y económica»', async () => {
    const usuario = userEvent.setup();
    servicio.designarComite.mockResolvedValue(sinMemorando);
    render(<PanelComite procesoId="p-1" />);

    await usuario.click(await screen.findByRole('button', { name: /Designar el comité/i }));
    expect(screen.queryByText('Nuevo comité evaluador')).not.toBeInTheDocument();
    // La fecha es la del memorando: sin memorando no se pide.
    expect(screen.queryByLabelText(/Fecha del memorando/i)).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Elegir a Ana' }));
    await usuario.selectOptions(screen.getByLabelText('Dimensión que evalúa'), 'FINANCIERO');
    expect(
      screen.getByRole('option', { name: 'Evaluación financiera y económica' }),
    ).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /^Agregar$/ }));
    await usuario.click(screen.getByRole('button', { name: /Designar comité/i }));

    await waitFor(() => expect(servicio.designarComite).toHaveBeenCalled());
    const [, datos, memorando] = servicio.designarComite.mock.calls[0];
    expect(memorando).toBeNull();
    expect(datos.fechaDesignacion).toBeUndefined();
    expect(datos.miembros).toEqual([{ personaId: 'per-1', nombre: 'Ana Ruiz', rol: 'FINANCIERO' }]);
  });

  it('sin memorando avisa que falta y deja cargarlo después', async () => {
    const usuario = userEvent.setup();
    servicio.comite.mockResolvedValue(sinMemorando);
    servicio.cargarMemorandoComite.mockResolvedValue(sinMemorando);
    const { container } = render(<PanelComite procesoId="p-1" />);

    expect(await screen.findByText('Falta el memorando de designación')).toBeInTheDocument();
    expect(screen.getByText(/Evaluación financiera y económica/i)).toBeInTheDocument();

    const archivo = new File(['m'], 'memorando.pdf', { type: 'application/pdf' });
    await usuario.upload(container.querySelector('input[type="file"]') as HTMLInputElement, archivo);
    await usuario.click(screen.getByRole('button', { name: /Cargar el memorando/i }));

    await waitFor(() => expect(servicio.cargarMemorandoComite).toHaveBeenCalled());
    const [procesoId, fecha, enviado] = servicio.cargarMemorandoComite.mock.calls[0];
    expect(procesoId).toBe('p-1');
    expect(fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(enviado.name).toBe('memorando.pdf');
  });
});
