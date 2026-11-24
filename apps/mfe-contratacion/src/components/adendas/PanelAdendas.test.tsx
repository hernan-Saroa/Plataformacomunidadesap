import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PanelAdendas } from './PanelAdendas';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../shared/Permitido', () => ({
  Permitido: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const estado = (cambios: Record<string, unknown> = {}) => ({
  aplica: true,
  motivoNoAplica: null,
  modalidad: 'LICITACION_PUBLICA',
  modalidadNombre: 'Licitación pública',
  publicado: true,
  abierto: true,
  puedeEmitir: true,
  motivoNoPuedeEmitir: null,
  soloCronograma: false,
  motivoNoFondo: null,
  puedeGestionar: true,
  vencimientoVigente: '2026-12-01',
  horaVigente: '10:00:00',
  mueve: 'CIERRE_OFERTAS',
  adendas: [],
  ...cambios,
});

const actividad = (numeral: string, nombre: string, cambios: Record<string, unknown> = {}) => ({
  numeral,
  id: null,
  propia: false,
  nombre,
  etapa: Number(numeral.split('.')[0]),
  fechaInicio: null,
  fechaFin: '2026-12-10',
  diasAntes: null,
  avisarA: ['QUIEN_LA_HACE'],
  canal: 'CAMPANA',
  correos: [],
  nota: null,
  actualizadoPor: null,
  actualizadoAt: null,
  estado: 'VIGENTE',
  diasRestantes: 20,
  ...cambios,
});

/** Las adendas de cronograma mueven fechas del cronograma de la 5.2 (139, EFDS-1152). */
describe('PanelAdendas · fechas del cronograma', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(contratacionService, 'firmaDeActividad').mockResolvedValue({ requiereFirma: false } as never);
    vi.spyOn(contratacionService, 'adendas').mockResolvedValue(estado() as never);
    vi.spyOn(contratacionService, 'cronograma').mockResolvedValue({
      anticipacion: 5,
      etapas: [],
      actividades: [
        actividad('6.1', 'Cierre del proceso y recepción de ofertas'),
        actividad('6.6', 'Subsanaciones'),
      ],
      historial: [],
    } as never);
  });

  it('emite una de cronograma que solo mueve una fecha del cronograma, sin tocar el cierre', async () => {
    const usuario = userEvent.setup();
    const emitir = vi.spyOn(contratacionService, 'emitirAdenda').mockResolvedValue(estado() as never);
    const { container } = render(<PanelAdendas procesoId="p-1" />);

    await usuario.click(await screen.findByRole('button', { name: /Emitir una adenda/ }));
    await usuario.selectOptions(screen.getByLabelText(/Qué modifica/), 'CRONOGRAMA');
    await usuario.type(screen.getByLabelText(/Objeto del cambio/), 'Se amplía el plazo de subsanaciones');
    await usuario.upload(
      container.querySelector('input[type="file"]') as HTMLInputElement,
      new File(['x'], 'adenda.pdf', { type: 'application/pdf' }),
    );

    await usuario.click(await screen.findByRole('button', { name: /Mover una fecha del cronograma/ }));
    const que = screen.getByLabelText('Qué mueve la fecha 1 del cronograma');
    // La 6.1 no se ofrece: se mueve con la nueva fecha de cierre.
    expect(que.querySelector('option[value="ACTIVIDAD:6.1"]')).toBeNull();
    await usuario.selectOptions(que, 'ACTIVIDAD:6.6');
    await usuario.type(screen.getByLabelText('Nuevo fin de la fecha 1 del cronograma'), '2026-12-15');
    await usuario.click(screen.getByRole('button', { name: /^Emitir adenda$/ }));

    await waitFor(() => expect(emitir).toHaveBeenCalled());
    const [, datos] = emitir.mock.calls[0];
    expect(datos.vencimientoNuevo).toBeUndefined();
    expect(datos.cambiosCronograma).toEqual([
      { ambito: 'ACTIVIDAD', clave: '6.6', fechaInicio: null, fechaFin: '2026-12-15' },
    ]);
  });

  it('muestra lo que movió una adenda publicada', async () => {
    vi.spyOn(contratacionService, 'adendas').mockResolvedValue(
      estado({
        adendas: [
          {
            id: 'a-1',
            numero: 1,
            tipo: 'CRONOGRAMA',
            objeto: 'Se amplía el plazo de subsanaciones',
            estado: 'PUBLICADA',
            emitidaPor: 'Laura',
            emitidaAt: '2026-11-01T10:00:00Z',
            fechaPublicacion: '2026-11-02',
            publicadaPor: 'Laura',
            vencimientoAnterior: null,
            vencimientoNuevo: null,
            horaAnterior: null,
            horaNueva: null,
            cambiosCronograma: [
              {
                ambito: 'ACTIVIDAD',
                clave: '6.6',
                nombre: '6.6 · Subsanaciones',
                fechaFin: '2026-12-15',
                antes: { fechaInicio: null, fechaFin: '2026-12-10' },
              },
            ],
            motivoAnulacion: null,
            documento: null,
            evidencia: null,
          },
        ],
      }) as never,
    );
    render(<PanelAdendas procesoId="p-1" />);

    expect(await screen.findByText('Movió en el cronograma:')).toBeInTheDocument();
    expect(screen.getByText(/6\.6 · Subsanaciones/)).toBeInTheDocument();
  });
});
