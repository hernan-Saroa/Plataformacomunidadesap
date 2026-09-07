// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PTAWorldClassToolbar } from './PTAWorldClassToolbar';

// Sin `globals: true` en vite.config.ts, @testing-library/react no detecta un
// `afterEach` global y no desmonta el render anterior antes del siguiente test.
afterEach(cleanup);

// EXCEL-XX: "El contador de la vista principal no se actualiza tras ejecutar la
// tarea (aplica a todos los roles)". Las pestañas Todos/Aprobación/Aprobado de
// este toolbar son "el contador de la vista principal" del ticket: sus badges
// se recalculan a partir del prop `ptas` en cada render, así que el fix real
// (PtaBackofficeModule ahora llama loadData() tras onUpdated) depende de que
// este componente refleje fielmente cualquier `ptas` fresco que reciba. Estas
// pruebas fijan ese contrato.

function baseProps(overrides: Partial<React.ComponentProps<typeof PTAWorldClassToolbar>> = {}) {
  return {
    estadisticas: {},
    filtroEstado: '',
    setFiltroEstado: vi.fn(),
    ptas: [] as any[],
    searchQuery: '',
    setSearchQuery: vi.fn(),
    filtroPeriodo: '2026-1',
    setFiltroPeriodo: vi.fn(),
    periodosAcademicos: [],
    filtroEstadoRegistro: '',
    setFiltroEstadoRegistro: vi.fn(),
    estadosRegistro: [{ key: '', label: 'Todos los estados' }],
    vistaActual: 'tabla',
    setVistaActual: vi.fn(),
    ...overrides,
  };
}

function tabButton(label: string) {
  return screen.getByText(label).closest('button') as HTMLButtonElement;
}

describe('PTAWorldClassToolbar — contadores de las pestañas Todos/Aprobación/Aprobado', () => {
  it('cuenta cada PTA en su pestaña de flujo (Aprobación=pendientes, Aprobado=aprobados)', () => {
    const ptas = [
      { id: '1', estado: 'Pendiente Jefatura' },
      { id: '2', estado: 'Pendiente Decanatura' },
      { id: '3', estado: 'Aprobado' },
    ];
    render(<PTAWorldClassToolbar {...baseProps({ ptas })} />);

    expect(tabButton('Todos').textContent).toContain('3');
    expect(tabButton('Aprobación').textContent).toContain('2');
    expect(tabButton('Aprobado').textContent).toContain('1');
  });

  it('actualiza los contadores cuando `ptas` refleja una aprobación reciente (simula el refresh de loadData tras onUpdated)', () => {
    const pendientes = [
      { id: '1', estado: 'Pendiente Jefatura' },
      { id: '2', estado: 'Pendiente Decanatura' },
      { id: '3', estado: 'Aprobado' },
    ];
    const { rerender } = render(<PTAWorldClassToolbar {...baseProps({ ptas: pendientes })} />);
    expect(tabButton('Aprobación').textContent).toContain('2');
    expect(tabButton('Aprobado').textContent).toContain('1');

    // Un Revisor/Aprobador resuelve el último componente pendiente del PTA "2":
    // su estado pasa a Aprobado. Si el padre solo mergea el estado localmente
    // pero nunca vuelve a pedir datos, este componente jamás vería este array
    // nuevo. El fix hace que loadData() se dispare, lo que en la práctica se
    // traduce en que el toolbar reciba este `ptas` actualizado.
    const actualizados = [
      { id: '1', estado: 'Pendiente Jefatura' },
      { id: '2', estado: 'Aprobado' },
      { id: '3', estado: 'Aprobado' },
    ];
    rerender(<PTAWorldClassToolbar {...baseProps({ ptas: actualizados })} />);

    expect(tabButton('Aprobación').textContent).toContain('1');
    expect(tabButton('Aprobado').textContent).toContain('2');
  });

  it('no muestra badge de conteo en una pestaña sin PTAs (evita mostrar "0")', () => {
    const ptas = [{ id: '1', estado: 'Aprobado' }];
    render(<PTAWorldClassToolbar {...baseProps({ ptas })} />);

    // "Aprobación" (pendientes) no tiene ningún PTA: no debe renderizar el "0".
    expect(tabButton('Aprobación').textContent?.trim()).toBe('Aprobación');
  });

  it('notifica el cambio de pestaña con el id de flujo correcto al hacer clic', () => {
    const setFiltroEstado = vi.fn();
    const ptas = [{ id: '1', estado: 'Aprobado' }];
    render(<PTAWorldClassToolbar {...baseProps({ ptas, setFiltroEstado })} />);

    tabButton('Aprobado').click();
    expect(setFiltroEstado).toHaveBeenCalledWith('aprobado');
  });
});
