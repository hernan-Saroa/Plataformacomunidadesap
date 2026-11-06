import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PanelOfertas } from './PanelOfertas';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const recepcion = (cambios: Record<string, unknown> = {}) => ({
  id: 'r-1',
  estado: 'ABIERTA',
  // Las cinco de la tarde en Bogotá, que es la hora de cierre de ventanilla.
  vencimiento: '2026-10-15T17:00:00.000-05:00',
  vencimientoDia: '2026-10-15',
  plazoDiasHabiles: 10,
  vencido: false,
  diasHabilesRestantes: 8,
  estadoPlazo: 'VIGENTE',
  cerradaAt: null,
  cerradaPor: null,
  ...cambios,
});

const estado = (cambios: Record<string, unknown> = {}) => ({
  aplica: true,
  motivoNoAplica: null,
  modalidad: 'LICITACION_PUBLICA',
  modalidadNombre: 'Licitación pública',
  etapa: 6,
  abierto: true,
  plazoParametrizado: true,
  plazoConfirmado: true,
  recepcion: recepcion(),
  puedeRegistrar: true,
  puedeCorregirVencimiento: true,
  puedeCerrar: false,
  audienciaRiesgos: { cumplido: true, motivo: null },
  listaPublicada: false,
  prorrogas: [],
  oferentes: [],
  ...cambios,
});

/**
 * El vencimiento del plazo de ofertas — actividad 6.1 (EFDS-1155).
 *
 * Era un `window.prompt` que pedía «AAAA-MM-DD HH:MM» en texto libre: un
 * diálogo gris del navegador que bloquea la pestaña, no se puede estilar y no
 * valida nada hasta enviarlo.
 */
describe('PanelOfertas · el vencimiento del plazo', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const pintar = (datos: Record<string, unknown>) => {
    vi.spyOn(contratacionService, 'ofertas').mockResolvedValue(datos as never);
    render(<PanelOfertas procesoId="p-1" />);
  };

  const abrir = async () =>
    userEvent.click(await screen.findByRole('button', { name: /Corregir el vencimiento/ }));

  it('fuera de las pruebas internas, el cierre ya fijado no se corrige a mano', async () => {
    // Sesión de QA del 04/11 (EFDS-1157): en la operación la fecha de cierre
    // solo se mueve con una adenda de cronograma.
    pintar(estado({ puedeCorregirVencimiento: false }));

    await screen.findByText(/Registrar una oferta/);
    expect(screen.queryByRole('button', { name: /Corregir el vencimiento/ })).not.toBeInTheDocument();
  });

  it('se pide en campos de fecha y hora, no escrito a mano', async () => {
    pintar(estado());
    await abrir();

    expect(screen.getByLabelText(/Fecha/)).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText(/Hora/)).toHaveAttribute('type', 'time');
  });

  it('llega precargado con el vencimiento que ya tenía', async () => {
    // Casi siempre se entra aquí a mover la hora del cronograma, no a inventar
    // una fecha desde cero.
    pintar(estado());
    await abrir();

    expect(screen.getByLabelText(/Fecha/)).toHaveValue('2026-10-15');
    expect(screen.getByLabelText(/Hora/)).toHaveValue('17:00');
  });

  it('sin vencimiento todavía, propone hoy a las cinco', async () => {
    pintar(estado({ recepcion: null, plazoParametrizado: false }));

    await userEvent.click(
      await screen.findByRole('button', { name: /Fijar el vencimiento/ }),
    );

    expect(screen.getByLabelText(/Hora/)).toHaveValue('17:00');
  });

  it('no deja guardar lo mismo que ya estaba', async () => {
    // Guardar sin cambio dejaría `plazoDiasHabiles` en null —el vencimiento
    // pasaría a ser «fijado a mano»— sin que nadie hubiera cambiado nada.
    pintar(estado());
    await abrir();

    expect(screen.getByRole('button', { name: /Guardar el vencimiento/ })).toBeDisabled();
  });

  it('avisa cuando la fecha elegida ya pasó, porque eso habilita el cierre', async () => {
    pintar(estado());
    await abrir();

    const fecha = screen.getByLabelText(/Fecha/);
    await userEvent.clear(fecha);
    await userEvent.type(fecha, '2020-01-02');

    expect(screen.getByText(/Ese vencimiento ya pasó/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardar el vencimiento/ })).toBeEnabled();
  });

  it('manda el instante con el desfase de Bogotá escrito', async () => {
    // En UTC, las 23:59 de Bogotá son ya el día siguiente: dejarlo a la zona
    // del navegador es un plazo mal contado.
    const fijar = vi
      .spyOn(contratacionService, 'fijarPlazoOfertas')
      .mockResolvedValue(estado() as never);
    pintar(estado());
    await abrir();

    const hora = screen.getByLabelText(/Hora/);
    await userEvent.clear(hora);
    await userEvent.type(hora, '10:30');
    await userEvent.click(screen.getByRole('button', { name: /Guardar el vencimiento/ }));

    expect(fijar).toHaveBeenCalledWith('p-1', '2026-10-15T10:30:00-05:00');
  });

  it('cancelar lo cierra sin tocar nada', async () => {
    const fijar = vi.spyOn(contratacionService, 'fijarPlazoOfertas');
    pintar(estado());
    await abrir();

    await userEvent.click(screen.getByRole('button', { name: /Cancelar/ }));

    expect(screen.queryByLabelText(/Hora/)).toBeNull();
    expect(fijar).not.toHaveBeenCalled();
  });

  it('cerrada la recepción ya no se ofrece: mover el plazo cambiaría la regla aplicada', async () => {
    pintar(
      estado({
        listaPublicada: true,
        recepcion: recepcion({ estado: 'CERRADA', vencido: true, cerradaAt: '2026-10-15T22:00:00Z' }),
      }),
    );

    expect(await screen.findByText(/Lista de oferentes publicada/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /vencimiento/ })).toBeNull();
  });
});

/** La revisión de QA de la 6.1 (EFDS-1155): nombre, .zip y 200 MB. */
describe('PanelOfertas · el soporte de la oferta', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const abrirRegistro = async () => {
    vi.spyOn(contratacionService, 'ofertas').mockResolvedValue(estado() as never);
    const vista = render(<PanelOfertas procesoId="p-1" />);
    await userEvent.click(await screen.findByRole('button', { name: /Registrar una oferta/ }));
    return vista.container.querySelector('input[type="file"]') as HTMLInputElement;
  };

  it('se titula como la metodología', async () => {
    vi.spyOn(contratacionService, 'ofertas').mockResolvedValue(estado() as never);
    render(<PanelOfertas procesoId="p-1" />);

    expect(await screen.findByText('Cierre del proceso y recepción de ofertas')).toBeInTheDocument();
  });

  it('acepta un .zip con todos los documentos de la oferta', async () => {
    const input = await abrirRegistro();
    expect(input.accept).toContain('.zip');

    const zip = new File(['z'], 'oferta-completa.zip', { type: 'application/zip' });
    await userEvent.upload(input, zip);

    expect(screen.getByText('oferta-completa.zip')).toBeInTheDocument();
  });

  it('acepta un soporte de más de 50 MB mientras no pase de 200 MB', async () => {
    const input = await abrirRegistro();

    const grande = new File(['x'], 'oferta-grande.zip', { type: 'application/zip' });
    Object.defineProperty(grande, 'size', { value: 150 * 1024 * 1024 });
    await userEvent.upload(input, grande);

    expect(screen.getByText('oferta-grande.zip')).toBeInTheDocument();
  });

  it('rechaza antes de subir un archivo de más de 200 MB', async () => {
    const { toast } = await import('sonner');
    const input = await abrirRegistro();

    const pesado = new File(['x'], 'oferta.pdf', { type: 'application/pdf' });
    Object.defineProperty(pesado, 'size', { value: 201 * 1024 * 1024 });
    await userEvent.upload(input, pesado);

    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/máximo son 200 MB/));
    expect(screen.queryByText('oferta.pdf')).toBeNull();
  });
});

/**
 * La fecha de cierre se extiende con una adenda de cronograma, aunque ya se
 * estén recibiendo ofertas (revisión de QA de EFDS-1155).
 */
describe('PanelOfertas · extender el cierre por adenda', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const pintar = (datos: Record<string, unknown>, onIrAAdendas?: () => void) => {
    vi.spyOn(contratacionService, 'ofertas').mockResolvedValue(datos as never);
    render(<PanelOfertas procesoId="p-1" onIrAAdendas={onIrAAdendas} />);
  };

  it('con la recepción abierta lleva a las adendas', async () => {
    const irAAdendas = vi.fn();
    pintar(estado(), irAAdendas);

    await userEvent.click(
      await screen.findByRole('button', { name: /Extender el cierre con una adenda/ }),
    );
    expect(irAAdendas).toHaveBeenCalled();
  });

  it('cerrada la recepción ya no se ofrece', async () => {
    pintar(
      estado({
        listaPublicada: true,
        recepcion: recepcion({ estado: 'CERRADA', vencido: true, cerradaAt: '2026-10-15T22:00:00Z' }),
      }),
      vi.fn(),
    );

    expect(await screen.findByText(/Lista de oferentes publicada/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Extender el cierre/ })).toBeNull();
  });

  it('muestra de qué fecha a qué fecha la movió cada adenda', async () => {
    pintar(
      estado({
        prorrogas: [
          {
            adendaId: 'a-2',
            numero: 2,
            fechaPublicacion: '2026-10-10',
            publicadaPor: 'Laura Pineda',
            vencimientoAnterior: '2026-10-15',
            horaAnterior: '10:00:00',
            vencimientoNuevo: '2026-10-22',
            horaNueva: '17:00:00',
          },
        ],
      }),
    );

    expect(await screen.findByText(/Cierre extendido por adenda/)).toBeInTheDocument();
    expect(screen.getByText(/Adenda 2:.*a las 10:00.*al .*a las 17:00.*Laura Pineda/)).toBeInTheDocument();
  });
});
