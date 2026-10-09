import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DetalleVersion } from './DetalleVersion';
import { contratacionService } from '../../services/contratacionService';
import { fijarAlcance } from '../../auth/alcance';

vi.mock('../../services/contratacionService', () => ({
  contratacionService: {
    paa: {
      version: vi.fn(),
      comparacion: vi.fn(),
      afectados: vi.fn(),
      activar: vi.fn(),
      descartar: vi.fn(),
    },
  },
}));

const paa = (contratacionService as unknown as { paa: Record<string, ReturnType<typeof vi.fn>> }).paa;

const VERSION = {
  id: 'ver-32',
  vigenciaId: 'v-2026',
  numero: 32,
  estado: 'VALIDADA',
  nombreArchivo: 'PAA V32.xlsx',
  totalLineas: 1498,
  cargadaPor: 'director',
  cargadaAt: '2026-10-09T10:00:00Z',
  activadaPor: null,
  activadaAt: null,
  descartadaPor: null,
  descartadaAt: null,
  motivoDescarte: null,
  reemplazadaAt: null,
  documento: { id: 'd-sede', nombre: 'Sede Central y Chocó' },
  anio: 2026,
  vigente: true,
  errores: [],
  advertencias: [],
  porRegion: [{ id: 'r-sede', nombre: 'Sede Central', lineas: 1414 }],
  comparacion: {
    id: 'c-1',
    tipo: 'MISMA_VIGENCIA',
    confiable: true,
    resumen: { nuevas: 1, eliminadas: 1, modificadas: 1, sinCambios: 1495, columnasNuevas: 0, columnasRetiradas: 0, porRegion: {} },
    avisos: [],
    base: { id: 'ver-31', numero: 31, anio: 2026 },
  },
};

const AFECTADOS = {
  version: { id: 'ver-32', numero: 32, estado: 'VALIDADA' },
  anio: 2026,
  versionActiva: { id: 'ver-31', numero: 31 },
  resumen: { procesos: 2, sinCambios: 0, actualizados: 1, modificadosSinEfecto: 0, eliminados: 1, revisiones: 2, bloqueados: 1 },
  procesos: [
    {
      procesoId: 'p-1',
      radicado: 'CTO-2026-0001',
      objeto: 'Soporte',
      etapa: 3,
      codigo: 'CHOCO 3',
      tratamiento: 'ELIMINADA',
      revision: { tipo: 'ELIMINACION', bloquea: true },
      abogado: null,
      cambios: { linea: [], proceso: [] },
      lineaNuevaId: null,
    },
  ],
};

describe('DetalleVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fijarAlcance({ alcances: [{ accion: 'aprobar', lugar: 'PAA' }], transversales: [] });
    paa.comparacion.mockResolvedValue({ ...VERSION.comparacion, detalle: { nuevas: [], eliminadas: [], modificadas: [], columnasNuevas: [], columnasRetiradas: [], avisos: [] }, regiones: [] });
    paa.afectados.mockResolvedValue(AFECTADOS);
  });

  it('no deja activar un archivo con errores y dice dónde están', async () => {
    paa.version.mockResolvedValue({
      ...VERSION,
      estado: 'INVALIDA',
      comparacion: null,
      errores: [{ fila: 4, columna: 'Descripción', valor: 'LINEA 1', mensaje: 'El código LINEA 1 ya está en la fila 3.' }],
    });
    render(<DetalleVersion versionId="ver-32" onCambio={vi.fn()} />);

    expect(await screen.findByText('El código LINEA 1 ya está en la fila 3.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Activar esta versión/ })).toBeNull();
  });

  it('muestra a qué procesos toca y activa después de confirmar', async () => {
    paa.version.mockResolvedValue(VERSION);
    paa.activar.mockResolvedValue({ version: { id: 'ver-32', numero: 32 }, anio: 2026, resumen: AFECTADOS.resumen });
    const onCambio = vi.fn();
    render(<DetalleVersion versionId="ver-32" onCambio={onCambio} />);

    await userEvent.click(await screen.findByRole('tab', { name: /Procesos afectados/ }));
    expect(await screen.findByText('CTO-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Línea retirada · se detiene')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Activar esta versión/ }));
    await userEvent.click(await screen.findByRole('button', { name: /^Activar la versión$/ }));

    await waitFor(() => expect(paa.activar).toHaveBeenCalledWith('ver-32'));
    expect(onCambio).toHaveBeenCalled();
  });

  it('no ofrece activar si la comparación no es confiable', async () => {
    paa.version.mockResolvedValue({ ...VERSION, comparacion: { ...VERSION.comparacion, confiable: false, avisos: ['La versión nueva repite códigos (LINEA 1)'] } });
    render(<DetalleVersion versionId="ver-32" onCambio={vi.fn()} />);

    expect(await screen.findByText(/No se puede activar: la comparación no es confiable/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Activar esta versión/ })).toBeDisabled();
  });
});
