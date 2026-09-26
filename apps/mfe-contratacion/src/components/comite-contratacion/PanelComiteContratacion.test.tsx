import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PanelComiteContratacion } from './PanelComiteContratacion';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const UMBRAL = {
  valor: 1000,
  unidad: 'SMMLV' as const,
  enPesos: 1_300_000_000,
  fundamento: 'RF-DOC-05: «en directa solo si supera 1.000 SMMLV».',
  confirmado: false,
  smmlvAplicado: { anio: 2026, valor: 1_300_000, confirmado: true },
};

const estado = (cambios: Record<string, unknown> = {}) => ({
  aplica: true,
  va: true,
  motivoNoVa: null,
  estado: 'BORRADOR',
  valorEstimado: 2_000_000_000,
  umbral: UMBRAL,
  sesiones: [],
  reabribles: ['3.1', '3.5', '3.6'],
  puedeRegistrar: false,
  puedeDejarConstancia: false,
  motivoNoDecide: null,
  abogado: { nombre: 'Andrés Rojas', usuarioNombre: 'andres.rojas@esap.edu.co' },
  ...cambios,
});

const sesion = (cambios: Record<string, unknown> = {}) => ({
  id: 's-1',
  fecha: '2026-09-01',
  decision: 'APROBADO',
  condiciones: null,
  observaciones: null,
  tieneActa: true,
  registradoPor: 'Andrés Rojas',
  createdAt: '2026-09-02T10:00:00Z',
  ...cambios,
});

/**
 * Actividad 3.7 · Comité de contratación (la 3.6 de la matriz, RF-DOC-05).
 *
 * Mientras fue el panel genérico de constancia, el comité se cumplía subiendo
 * el acta y la actividad cerraba pasara lo que pasara: un proceso observado
 * avanzaba como si lo hubieran avalado.
 */
describe('PanelComiteContratacion · lo que decidió el comité', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const pintar = (datos: Record<string, unknown>) => {
    vi.spyOn(contratacionService, 'comiteContratacion').mockResolvedValue(datos as never);
    render(<PanelComiteContratacion procesoId="p-1" />);
  };

  it('dice contra qué se comparó la cuantía, no solo si va', async () => {
    // Un «no pasa por comité» sin la cifra de al lado es una decisión que nadie
    // puede revisar después.
    pintar(estado());

    expect(await screen.findByText(/Pasa por comité/)).toBeInTheDocument();
    expect(screen.getByText(/umbral 1000 SMMLV/)).toBeInTheDocument();
    expect(screen.getByText(/RF-DOC-05/)).toBeInTheDocument();
  });

  it('en las tres modalidades que la matriz excluye no ofrece nada', async () => {
    pintar(estado({ aplica: false, va: false, motivoNoVa: 'MODALIDAD', estado: 'NO_APLICA' }));

    expect(await screen.findByText(/Esta modalidad no pasa por comité/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('por debajo del umbral ofrece dejar constancia, no registrar una sesión', async () => {
    pintar(
      estado({
        va: false,
        motivoNoVa: 'NO_SUPERA_EL_UMBRAL',
        valorEstimado: 50_000_000,
        puedeDejarConstancia: true,
      }),
    );

    expect(
      await screen.findByRole('button', { name: /Dejar constancia/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Registrar lo que decidió/ })).toBeNull();
  });

  it('observar exige escribir qué corregir', async () => {
    // Sin ellas el proceso queda devuelto sin saber qué hacer, que es
    // exactamente lo que pasaba con la nota libre.
    pintar(estado({ puedeRegistrar: true }));

    await userEvent.click(
      await screen.findByRole('button', { name: /Registrar lo que decidió el comité/ }),
    );
    await userEvent.selectOptions(screen.getByLabelText(/Qué decidió/), 'OBSERVADO');

    expect(screen.getByLabelText(/Observaciones de fondo/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrar la sesión/ })).toBeDisabled();
  });

  /**
   * Qué actividades se reabren (EFDS-2068).
   *
   * Antes, observar devolvía la 3.7 pero la 3.1 y las demás seguían
   * aprobadas: la corrección que pidió el comité no tenía dónde aplicarse. Y
   * se elegía una sola, aunque una sesión de comité revise el expediente
   * entero y pueda objetar el estudio previo y el análisis del sector a la vez.
   */
  it('observar también exige decir a qué actividades vuelve el proceso', async () => {
    pintar(estado({ puedeRegistrar: true }));

    await userEvent.click(
      await screen.findByRole('button', { name: /Registrar lo que decidió el comité/ }),
    );
    await userEvent.selectOptions(screen.getByLabelText(/Qué decidió/), 'OBSERVADO');
    await userEvent.type(
      screen.getByLabelText(/Observaciones de fondo/),
      'El estudio previo no sustenta la experiencia exigida',
    );
    await userEvent.type(screen.getByLabelText(/Fecha de la sesión/), '2026-09-01');

    expect(screen.getByText(/A qué actividades vuelve el proceso/)).toBeInTheDocument();
    // Con todo lo demás lleno, sigue bloqueado hasta el acta o los numerales.
    expect(screen.getByRole('button', { name: /Registrar la sesión/ })).toBeDisabled();
  });

  it('solo ofrece reabrir las actividades que este proceso ya cerró', async () => {
    // La lista de cuatro dice cuáles son reabribles en general; cuáles están
    // en APROBADO lo sabe el backend. Ofrecer una que no lo está sería ofrecer
    // algo que el servicio va a rechazar al enviarlo.
    pintar(estado({ puedeRegistrar: true, reabribles: ['3.1', '3.6'] }));

    await userEvent.click(
      await screen.findByRole('button', { name: /Registrar lo que decidió el comité/ }),
    );

    expect(screen.getByLabelText(/3.1 · Estudio previo/)).toBeInTheDocument();
    expect(screen.getByLabelText(/3.6 · Causal/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/3.5 · Modalidad/)).toBeNull();
  });

  /**
   * Reabrir sin frenar el proceso: el comité avala, pero quiere que le
   * validen un punto.
   */
  it('aprobar también deja reabrir, y entonces pide qué hay que validar', async () => {
    pintar(estado({ puedeRegistrar: true }));

    await userEvent.click(
      await screen.findByRole('button', { name: /Registrar lo que decidió el comité/ }),
    );

    expect(screen.getByText(/Reabrir para validación/)).toBeInTheDocument();
    // Sin marcar nada no hay nada que validar, así que el campo no está.
    expect(screen.queryByLabelText(/Qué hay que validar/)).toBeNull();

    await userEvent.click(screen.getByLabelText(/3.5 · Modalidad/));
    expect(screen.getByLabelText(/Qué hay que validar/)).toBeInTheDocument();
  });

  it('registra la sesión con los numerales marcados cuando el comité observa', async () => {
    const registrar = vi
      .spyOn(contratacionService, 'registrarSesionComite')
      .mockResolvedValue(estado({ estado: 'DEVUELTO' }) as never);
    pintar(estado({ puedeRegistrar: true }));

    await userEvent.click(
      await screen.findByRole('button', { name: /Registrar lo que decidió el comité/ }),
    );
    await userEvent.type(screen.getByLabelText(/Fecha de la sesión/), '2026-09-01');
    await userEvent.selectOptions(screen.getByLabelText(/Qué decidió/), 'OBSERVADO');
    await userEvent.type(
      screen.getByLabelText(/Observaciones de fondo/),
      'El estudio previo no sustenta la experiencia exigida',
    );
    await userEvent.click(screen.getByLabelText(/3.1 · Estudio previo/));
    await userEvent.click(screen.getByLabelText(/3.5 · Modalidad/));

    const acta = new File(['contenido'], 'acta.pdf', { type: 'application/pdf' });
    await userEvent.upload(
      document.querySelector('input[type="file"]') as HTMLInputElement,
      acta,
    );

    await userEvent.click(screen.getByRole('button', { name: /Registrar la sesión/ }));

    expect(registrar).toHaveBeenCalledWith(
      'p-1',
      expect.objectContaining({
        decision: 'OBSERVADO',
        observaciones: 'El estudio previo no sustenta la experiencia exigida',
        numeralesReabrir: ['3.1', '3.5'],
      }),
      acta,
    );
  });

  /**
   * El rechazo: el comité concluye que el proceso no sale al mercado.
   *
   * Mientras solo existió «observado», un comité que decidía no contratar
   * tenía que mandar la decisión de vuelta a la 3.4 para que otro la firmara.
   */
  it('rechazar pide el motivo y avisa de que termina el proceso', async () => {
    pintar(estado({ puedeRegistrar: true }));

    await userEvent.click(
      await screen.findByRole('button', { name: /Registrar lo que decidió el comité/ }),
    );
    await userEvent.selectOptions(screen.getByLabelText(/Qué decidió/), 'RECHAZADO');

    expect(screen.getByLabelText(/Por qué se rechaza el proceso/)).toBeInTheDocument();
    expect(screen.getByText(/El rechazo termina el proceso/)).toBeInTheDocument();
  });

  it('rechazar no ofrece reabrir nada: el expediente queda negado', async () => {
    // Una actividad devuelta dentro de un proceso muerto es trabajo que se le
    // pide a alguien para nada.
    pintar(estado({ puedeRegistrar: true }));

    await userEvent.click(
      await screen.findByRole('button', { name: /Registrar lo que decidió el comité/ }),
    );
    await userEvent.selectOptions(screen.getByLabelText(/Qué decidió/), 'RECHAZADO');

    expect(screen.queryByLabelText(/3.1 · Estudio previo/)).toBeNull();
    expect(screen.queryByText(/Reabrir para validación/)).toBeNull();
  });

  it('registra el rechazo con su motivo', async () => {
    const registrar = vi
      .spyOn(contratacionService, 'registrarSesionComite')
      .mockResolvedValue(estado({ estado: 'NEGADO' }) as never);
    pintar(estado({ puedeRegistrar: true }));

    await userEvent.click(
      await screen.findByRole('button', { name: /Registrar lo que decidió el comité/ }),
    );
    await userEvent.type(screen.getByLabelText(/Fecha de la sesión/), '2026-09-01');
    await userEvent.selectOptions(screen.getByLabelText(/Qué decidió/), 'RECHAZADO');
    await userEvent.type(
      screen.getByLabelText(/Por qué se rechaza el proceso/),
      'La necesidad ya está cubierta por el contrato marco vigente',
    );

    const acta = new File(['contenido'], 'acta.pdf', { type: 'application/pdf' });
    await userEvent.upload(
      document.querySelector('input[type="file"]') as HTMLInputElement,
      acta,
    );

    await userEvent.click(screen.getByRole('button', { name: /Registrar la sesión/ }));

    expect(registrar).toHaveBeenCalledWith(
      'p-1',
      expect.objectContaining({
        decision: 'RECHAZADO',
        observaciones: 'La necesidad ya está cubierta por el contrato marco vigente',
      }),
      acta,
    );
    expect(registrar.mock.calls[0][1]).not.toHaveProperty('numeralesReabrir');
  });

  it('un proceso rechazado se ve, y dice que la contratación terminó', async () => {
    pintar(
      estado({
        estado: 'NEGADO',
        sesiones: [
          sesion({
            decision: 'RECHAZADO',
            observaciones: 'La necesidad ya está cubierta por el contrato marco vigente',
          }),
        ],
      }),
    );

    // Exacto: el pie repite la frase para explicar por qué ya no hay nada que
    // hacer, y un `findByText` laxo se chocaría con los dos.
    expect(await screen.findByText('El comité rechazó el proceso')).toBeInTheDocument();
    expect(screen.getByText(/contrato marco vigente/)).toBeInTheDocument();
    expect(screen.getByText(/la contratación terminó ahí/)).toBeInTheDocument();
  });

  it('la aprobación condicionada pide las condiciones', async () => {
    pintar(estado({ puedeRegistrar: true }));

    await userEvent.click(
      await screen.findByRole('button', { name: /Registrar lo que decidió el comité/ }),
    );
    await userEvent.selectOptions(
      screen.getByLabelText(/Qué decidió/),
      'APROBADO_CON_CONDICIONES',
    );

    expect(screen.getByLabelText(/A qué queda condicionada/)).toBeInTheDocument();
  });

  it('aprobar sin más no pide texto, pero sí el acta', async () => {
    pintar(estado({ puedeRegistrar: true }));

    await userEvent.click(
      await screen.findByRole('button', { name: /Registrar lo que decidió el comité/ }),
    );

    expect(screen.queryByLabelText(/Observaciones de fondo/)).toBeNull();
    expect(screen.getByText(/Acta de la sesión/)).toBeInTheDocument();
    // Con fecha pero sin acta sigue bloqueado: el acta es lo único que prueba
    // que un cuerpo colegiado sesionó.
    await userEvent.type(screen.getByLabelText(/Fecha de la sesión/), '2026-09-01');
    expect(screen.getByRole('button', { name: /Registrar la sesión/ })).toBeDisabled();
  });

  it('una devolución del comité se ve, y dice que hay que volver', async () => {
    pintar(
      estado({
        estado: 'DEVUELTO',
        sesiones: [
          sesion({
            decision: 'OBSERVADO',
            observaciones: 'El estudio previo no sustenta la experiencia exigida',
          }),
        ],
      }),
    );

    expect(await screen.findByText(/Observado/)).toBeInTheDocument();
    expect(screen.getByText(/no sustenta la experiencia exigida/)).toBeInTheDocument();
    expect(screen.getByText(/volver a llevarlo a comité/)).toBeInTheDocument();
  });

  it('las condiciones de una aprobación condicionada quedan a la vista', async () => {
    pintar(
      estado({
        estado: 'APROBADO',
        sesiones: [
          sesion({
            decision: 'APROBADO_CON_CONDICIONES',
            condiciones: 'Ajustar el análisis del sector antes de publicar',
          }),
        ],
      }),
    );

    expect(await screen.findByText(/Aprobado con condiciones/)).toBeInTheDocument();
    expect(screen.getByText(/Ajustar el análisis del sector/)).toBeInTheDocument();
  });

  it('guarda el historial: dos sesiones explican por qué el proceso tardó', async () => {
    pintar(
      estado({
        estado: 'APROBADO',
        sesiones: [
          sesion({ id: 's-2', fecha: '2026-09-10', decision: 'APROBADO' }),
          sesion({
            id: 's-1',
            fecha: '2026-09-01',
            decision: 'OBSERVADO',
            observaciones: 'Faltaba el análisis del sector',
          }),
        ],
      }),
    );

    expect(await screen.findByText(/Sesiones anteriores/)).toBeInTheDocument();
    expect(screen.getByText(/Faltaba el análisis del sector/)).toBeInTheDocument();
  });

  it('a quien no le toca le dice de quién es', async () => {
    pintar(estado({ motivoNoDecide: 'NO_ES_TUYO' }));

    expect(await screen.findByText(/Lo transcribe Andrés Rojas/)).toBeInTheDocument();
  });
});
