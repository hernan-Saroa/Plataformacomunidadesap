import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { VistaCriterios } from './VistaCriterios';
import { contratacionService } from '../../services/contratacionService';
import { CatalogoCriterios } from '../../types';

vi.mock('../../services/contratacionService', () => ({
  contratacionService: {
    criteriosEvaluacion: vi.fn(),
    crearCriterio: vi.fn(),
    actualizarCriterio: vi.fn(),
    cambiarActivoCriterio: vi.fn(),
  },
}));

const servicio = contratacionService as unknown as {
  criteriosEvaluacion: ReturnType<typeof vi.fn>;
  cambiarActivoCriterio: ReturnType<typeof vi.fn>;
};

const criterio = (parcial: Partial<CatalogoCriterios['criterios'][number]>) => ({
  id: 'c1',
  modalidad: null,
  modalidadNombre: null,
  dimension: 'JURIDICO' as const,
  tipo: 'HABILITANTE' as const,
  nombre: 'Capacidad jurídica',
  descripcion: null,
  puntajeMaximo: null,
  orden: 10,
  activo: true,
  fundamento: null,
  confirmado: false,
  actualizadoEn: '2026-08-18T00:00:00.000Z',
  evaluacionesQueLoUsan: 0,
  ...parcial,
});

const catalogo = (parcial: Partial<CatalogoCriterios> = {}): CatalogoCriterios => ({
  puedeEditar: true,
  dimensiones: [
    { codigo: 'JURIDICO', nombre: 'Jurídica', calculada: false },
    { codigo: 'ECONOMICO', nombre: 'Económica', calculada: true },
  ],
  modalidades: [{ codigo: 'LICITACION_PUBLICA', nombre: 'Licitación Pública' }],
  haySinConfirmar: true,
  criterios: [criterio({})],
  totales: [{ modalidad: 'LICITACION_PUBLICA', nombre: 'Licitación Pública', total: 100, propios: 0 }],
  ...parcial,
});

/**
 * De estos criterios sale quién queda habilitado y quién gana, así que la
 * pantalla tiene dos obligaciones que no son decorativas: decir cuáles siguen
 * sin ratificar, y no ofrecerle acciones de escritura a quien la API va a
 * rechazar.
 */
describe('VistaCriterios · catálogo de criterios de evaluación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('avisa de los criterios que nadie ha confirmado', async () => {
    servicio.criteriosEvaluacion.mockResolvedValue(catalogo());
    render(<VistaCriterios />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/1 criterio sin confirmar/i);
  });

  it('no avisa cuando todos están ratificados', async () => {
    servicio.criteriosEvaluacion.mockResolvedValue(
      catalogo({ haySinConfirmar: false, criterios: [criterio({ confirmado: true })] }),
    );
    render(<VistaCriterios />);

    expect(await screen.findByText('Capacidad jurídica')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('al gestor le enseña el catálogo pero no los botones de edición', async () => {
    servicio.criteriosEvaluacion.mockResolvedValue(catalogo({ puedeEditar: false }));
    render(<VistaCriterios />);

    expect(await screen.findByText('Capacidad jurídica')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Agregar criterio/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar/i })).not.toBeInTheDocument();
    expect(
      screen.getByText(/Quien evalúa no reescribe la regla con la que se le evalúa/i),
    ).toBeInTheDocument();
  });

  it('retirar un criterio no lo borra: lo deja tachado y ofrece devolverlo', async () => {
    servicio.criteriosEvaluacion.mockResolvedValue(catalogo());
    servicio.cambiarActivoCriterio.mockResolvedValue(
      catalogo({ criterios: [criterio({ activo: false })] }),
    );

    render(<VistaCriterios />);
    await userEvent.click(await screen.findByRole('button', { name: /Retirar/i }));

    await waitFor(() => expect(servicio.cambiarActivoCriterio).toHaveBeenCalledWith('c1', false));
    expect(await screen.findByRole('button', { name: /Devolver/i })).toBeInTheDocument();
    // Sigue en la lista: es lo que explica una evaluación vieja con un renglón
    // que ya no aparece en las nuevas.
    expect(screen.getByText('Capacidad jurídica')).toBeInTheDocument();
  });
});
