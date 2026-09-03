import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// El módulo importa legalService/authService (usados por el componente principal y sus
// modales hijos); se mockean para que este test de VistaLista no dependa del backend real.
vi.mock('../../../../services/api/legal.service', () => ({
  legalService: {},
}));
vi.mock('../../../../services/api/authService', () => ({
  authService: { hasRole: vi.fn(() => false), getCurrentUser: vi.fn(() => null) },
}));

import { VistaLista, formatearFuenteInformativa } from './ModuloTerminosInformesV3';
import { SolicitudInforme } from '../core/types';

function crearSolicitud(overrides: Partial<SolicitudInforme> = {}): SolicitudInforme {
  return {
    id: 'TERM-2026-0001',
    etapa: 'RECIBIDA',
    tipoInforme: 'MANUAL',
    enteSolicitante: 'Contraloría',
    radicadoExterno: 'N/A',
    asunto: 'Informe de contabilidad — septiembre 2026',
    responsable: 'Luis Ramírez Torres',
    fechaSolicitud: new Date('2026-08-01'),
    fechaVencimiento: new Date('2026-09-10'),
    diasTotales: 30,
    diasRestantes: 10,
    ...overrides,
  } as SolicitudInforme;
}

describe('formatearFuenteInformativa', () => {
  it('devuelve "Sin especificar" cuando no hay fundamento normativo', () => {
    expect(formatearFuenteInformativa(undefined)).toBe('Sin especificar');
    expect(formatearFuenteInformativa([])).toBe('Sin especificar');
  });

  it('formatea una sola fuente como "tipo: cita"', () => {
    expect(formatearFuenteInformativa([{ tipo: 'Resolución', cita: 'Res. 123 de 2024' }]))
      .toBe('Resolución: Res. 123 de 2024');
  });

  it('une múltiples fuentes con "; "', () => {
    const resultado = formatearFuenteInformativa([
      { tipo: 'Resolución', cita: 'Res. 123 de 2024' },
      { tipo: 'Contrato', cita: 'Contrato N° 45' },
    ]);
    expect(resultado).toBe('Resolución: Res. 123 de 2024; Contrato: Contrato N° 45');
  });
});

describe('VistaLista · Calendario de Vencimientos', () => {
  it('reemplaza "Tipo de Actividad" por "Nombre de Informe" e incluye Destinatario y Fuente Informativa', () => {
    render(<VistaLista solicitudes={[crearSolicitud()]} onVerDetalle={vi.fn()} />);

    expect(screen.getByText('Nombre de Informe')).toBeInTheDocument();
    expect(screen.getByText('Destinatario de Informe')).toBeInTheDocument();
    expect(screen.getByText('Fuente Informativa')).toBeInTheDocument();
    expect(screen.queryByText('Tipo de Actividad')).not.toBeInTheDocument();
  });

  it('muestra el destinatario y la fuente informativa de la solicitud', () => {
    render(
      <VistaLista
        solicitudes={[
          crearSolicitud({
            destinatario: 'Contaduría General de la Nación',
            fundamentoNormativo: [{ tipo: 'Resolución', cita: 'Res. 123 de 2024' }],
          }),
        ]}
        onVerDetalle={vi.fn()}
      />,
    );

    expect(screen.getByText('Contaduría General de la Nación')).toBeInTheDocument();
    expect(screen.getByText('Resolución: Res. 123 de 2024')).toBeInTheDocument();
  });

  it('usa valores por defecto cuando no hay destinatario ni fuente informativa registrados', () => {
    render(<VistaLista solicitudes={[crearSolicitud()]} onVerDetalle={vi.fn()} />);

    expect(screen.getByText('Sin asignar')).toBeInTheDocument();
    expect(screen.getByText('Sin especificar')).toBeInTheDocument();
  });
});
