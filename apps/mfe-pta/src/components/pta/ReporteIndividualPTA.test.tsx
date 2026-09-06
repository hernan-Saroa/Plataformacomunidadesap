import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { ReporteIndividualPTA } from './ReporteIndividualPTA';

vi.mock('../../services/api/ptaApi', () => ({ getComponentesAprobacion: vi.fn().mockResolvedValue({ success: false }) }));
afterEach(cleanup);

describe('aprobaciones del reporte R-01 (vista y exportación)', () => {
  it('no imprime firmas automáticas de Extensión y usa los ámbitos actuales', () => {
    const pta = {
      estado: 'Aprobado', horas_docencia: 384, horas_investigacion: 200, horas_extension: 0, horas_complementarias: 170, horas_asignables: 800,
      componentes_aprobacion: [
        { componente: 'academica_territorial', estado: 'aprobado', horas: 384, aprobadorNombre: 'Revisor territorial' },
        { componente: 'complementarias_gestion_profesoral', estado: 'aprobado', horas: 170, aprobadorNombre: 'Gestión Profesoral' },
        ...['ext_capacitacion', 'ext_procesos', 'ext_fortalecimiento', 'ext_gobierno'].map(componente => ({
          componente, estado: 'aprobado', aprobadorNombre: 'Sistema', horas: 0, aplica: false, fechaAprobacion: '2026-08-05',
        })),
      ],
    };
    render(<ReporteIndividualPTA pta={pta} onClose={() => {}} />);
    const cards = screen.getByText('Aprobación por Componente').nextElementSibling as HTMLElement;
    expect(within(cards).getAllByText('No aplica')).toHaveLength(4);
    expect(within(cards).queryByText('Sistema')).toBeNull();
    expect(within(cards).getByText('Revisor territorial')).toBeTruthy();
    expect(within(cards).getByText('Gestión Profesoral')).toBeTruthy();
  });
});
