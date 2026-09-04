import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PanelAuditoria } from './PanelAuditoria';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

/** Lo mínimo que el panel necesita para pintarse. */
const expediente = (cambios: Record<string, unknown> = {}) => ({
  proceso: {
    id: 'p-1', radicado: 'CTO-2026-0010', objeto: 'Apoyo jurídico',
    modalidad: 'DIRECTA', valor_estimado: '60000000', etapa: 3,
    fecha_radicacion: '2026-09-04T00:00:00.000Z', created_by: 'Ana', created_at: '2026-09-04T00:00:00.000Z',
  },
  contrato: null,
  actividades: [{ numeral: '3.2', nombre: 'Análisis del sector', etapa: 3, estado: 'EN_REVISION', enviado_por: 'Ana', updated_at: null }],
  documentos: [],
  supervisiones: [],
  modificaciones: [],
  casosIncumplimiento: 0,
  revisiones: [],
  trazabilidad: [],
  ...cambios,
});

describe('PanelAuditoria · el expediente para auditoría', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('no se cae cuando el servidor responde sin las revisiones', async () => {
    // Es un campo nuevo: un servidor que aún no se reinició responde sin él, y
    // el expediente entero se caía al pedirle el `length` a un undefined.
    const sinCampo = expediente();
    delete (sinCampo as any).revisiones;
    vi.spyOn(contratacionService, 'auditoria').mockResolvedValue(sinCampo as never);

    render(<PanelAuditoria procesoId="p-1" />);

    expect(await screen.findByText(/CTO-2026-0010/)).toBeInTheDocument();
    expect(screen.queryByText(/Historial de aprobaciones/)).toBeNull();
  });

  it('muestra el historial cuando hay revisiones', async () => {
    vi.spyOn(contratacionService, 'auditoria').mockResolvedValue(
      expediente({
        revisiones: [
          {
            numeral: '3.2', decision: 'DEVUELTO',
            observaciones: 'Falta la ficha técnica.',
            version_revisada: 1, revisado_por: 'Ana Prieto',
            created_at: '2026-09-03T10:00:00.000Z',
          },
        ],
      }) as never,
    );

    render(<PanelAuditoria procesoId="p-1" />);

    expect(await screen.findByText(/Historial de aprobaciones/)).toBeInTheDocument();
  });
});
