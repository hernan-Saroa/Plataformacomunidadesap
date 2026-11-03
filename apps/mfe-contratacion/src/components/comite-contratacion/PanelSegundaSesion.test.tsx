import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PanelSegundaSesion } from './PanelSegundaSesion';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const documento = (cambios: Record<string, unknown> = {}) => ({
  codigo: 'PLIEGO',
  nombre: 'Pliego de condiciones',
  obligatorio: true,
  vigente: {
    id: 'dp-2',
    documentoId: 'd-2',
    nombre: 'pliego-definitivo.pdf',
    descargaUrl: '/files/d-2.pdf',
    mimeType: 'application/pdf',
    subidoPor: 'Andrés Rojas',
    cargadoAt: '2026-10-10T10:00:00Z',
  },
  anteriores: [],
  nuevaVersion: false,
  ...cambios,
});

const estado = (cambios: Record<string, unknown> = {}) => ({
  aplica: true,
  estado: 'BORRADOR',
  cdp: { cumplido: true, motivo: null },
  publicadoEl: '2026-10-01T15:00:00Z',
  documentos: [documento()],
  puedeAjustar: true,
  puedeRetirar: false,
  sesiones: [],
  puedeRegistrar: false,
  motivoNoRegistra: 'Primero el pliego definitivo tiene que aprobarlo el abogado revisor y después la directora',
  puedeCargarActa: true,
  motivoNoDecide: null,
  responsable: { nombre: 'Andrés Rojas', usuarioNombre: 'andres.rojas' },
  puesto: 'Abogado del caso',
  apertura: { cumplido: false, motivo: 'x' },
  ...cambios,
});

/**
 * Actividad 5.6.1 · Pliego definitivo y segunda sesión del Comité (113).
 */
describe('PanelSegundaSesion', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const pintar = (datos: Record<string, unknown>) => {
    vi.spyOn(contratacionService, 'segundaSesionComite').mockResolvedValue(datos as never);
    render(<PanelSegundaSesion procesoId="p-1" />);
  };

  it('sin CDP lo dice: no se envía a revisión ni pasa al comité', async () => {
    pintar(estado({ cdp: { cumplido: false, motivo: 'El proceso todavía no tiene CDP' } }));

    expect(await screen.findByText('Falta el CDP')).toBeInTheDocument();
    expect(screen.getByText(/no se envía a revisión ni pasa a la segunda sesión/)).toBeInTheDocument();
  });

  it('distingue lo que tiene versión definitiva nueva de lo que conserva la aprobada', async () => {
    pintar(
      estado({
        documentos: [
          documento({ codigo: 'PLIEGO', nuevaVersion: true }),
          documento({ codigo: 'ANEXO', nombre: 'Anexo técnico', nuevaVersion: false }),
        ],
      }),
    );

    expect(await screen.findByText('Versión definitiva nueva')).toBeInTheDocument();
    expect(screen.getByText('Conserva la versión aprobada')).toBeInTheDocument();
    expect(screen.getByText(/1 tiene versión definitiva nueva/)).toBeInTheDocument();
  });

  it('enseña el historial de versiones de cada documento', async () => {
    pintar(
      estado({
        documentos: [
          documento({
            nuevaVersion: true,
            anteriores: [
              {
                id: 'dp-1',
                documentoId: 'd-1',
                nombre: 'proyecto-de-pliego.pdf',
                descargaUrl: '/files/d-1.pdf',
                subidoPor: 'Andrés Rojas',
                cargadoAt: '2026-09-20T10:00:00Z',
                sustituidoAt: '2026-10-10T10:00:00Z',
                sustituidoPor: 'Andrés Rojas',
              },
            ],
          }),
        ],
      }),
    );

    await userEvent.click(await screen.findByRole('button', { name: /Ver 1 versión anterior/ }));
    expect(screen.getByText('proyecto-de-pliego.pdf')).toBeInTheDocument();
  });

  it('quien lo trabaja lo envía a revisión desde el panel', async () => {
    pintar(estado());
    const enviar = vi
      .spyOn(contratacionService, 'enviarPliegoDefinitivo')
      .mockResolvedValue({} as never);

    await userEvent.click(await screen.findByRole('button', { name: 'Enviar a revisión' }));
    expect(enviar).toHaveBeenCalledWith('p-1');
  });

  it('sin CDP el envío queda apagado', async () => {
    pintar(estado({ cdp: { cumplido: false, motivo: 'Sin CDP' } }));

    expect(await screen.findByRole('button', { name: 'Enviar a revisión' })).toBeDisabled();
  });

  it('en revisión no deja cambiar documentos', async () => {
    pintar(estado({ estado: 'EN_REVISION', puedeAjustar: false }));

    expect(await screen.findByText('En revisión')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Nueva versión/ })).toBeNull();
  });

  it('antes de que la cadena apruebe, dice por qué no se registra la sesión', async () => {
    pintar(estado());

    expect(await screen.findByText(/tiene que aprobarlo el abogado revisor/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Registrar lo que decidió el comité/ })).toBeNull();
  });

  it('el acta es opcional al registrar la sesión', async () => {
    pintar(estado({ estado: 'APROBADO', puedeAjustar: false, puedeRegistrar: true, motivoNoRegistra: null }));

    await userEvent.click(
      await screen.findByRole('button', { name: /Registrar lo que decidió el comité/ }),
    );
    await userEvent.type(screen.getByLabelText(/Fecha de la sesión/), '2026-10-15');
    expect(screen.getByRole('button', { name: /Registrar la sesión/ })).toBeEnabled();
  });

  it('una sesión sin acta deja cargarla después', async () => {
    pintar(
      estado({
        estado: 'APROBADO',
        puedeAjustar: false,
        motivoNoRegistra: 'El comité ya aprobó el pliego definitivo: lo que sigue es la apertura',
        sesiones: [
          {
            id: 's-2',
            fecha: '2026-10-15',
            decision: 'APROBADO',
            condiciones: null,
            observaciones: null,
            tieneActa: false,
            registradoPor: 'Andrés Rojas',
            createdAt: '2026-10-15T10:00:00Z',
          },
        ],
      }),
    );

    expect(await screen.findByText(/Falta el acta de esta sesión/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cargar el acta/ })).toBeInTheDocument();
  });
});
