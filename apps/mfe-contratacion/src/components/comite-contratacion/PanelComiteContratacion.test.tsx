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
