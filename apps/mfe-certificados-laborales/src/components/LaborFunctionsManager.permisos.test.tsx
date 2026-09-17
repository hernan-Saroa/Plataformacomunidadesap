import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LaborFunctionsManager } from './LaborFunctionsManager';
import { certificadosService } from '../../services/api/certificados.service';

vi.mock('../../services/api/certificados.service', () => ({ certificadosService: { laborales: {
  listarFuncionesLaborales: vi.fn(), consultarEmpleadoFuncionesLaborales: vi.fn(),
  listarSeleccionFuncionesLaborales: vi.fn(),
} } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

const api = certificadosService.laborales;
const profile = { id: 'p1', combined_code: '202812', position_code: '2028', grade_code: '12',
  position_name: 'Profesional de prueba', department_name: 'Dirección', functions: [], function_count: 2 };
const result = (items = [profile]) => ({ items, total: items.length, page: 1, limit: 15, totalPages: 1,
  stats: { profiles: items.length, functions: items.length * 2 } });
const tick = async (ms = 300) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };

beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  vi.mocked(api.listarFuncionesLaborales).mockResolvedValue(result() as any);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

/**
 * `certificados-laborales.functions.view` abre el módulo en solo lectura y
 * `certificados-laborales.functions.manage` habilita la escritura, incluida la
 * carga masiva. Sin el segundo, la matriz se consulta pero no se modifica.
 */
describe('Matriz de funciones en solo lectura (sin permiso de gestión)', () => {
  it('muestra la matriz pero ninguna acción de escritura', async () => {
    render(<LaborFunctionsManager canManage={false} />); await tick();

    expect(screen.getByText('Profesional de prueba')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Carga masiva/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Agregar individual/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Plantilla con ejemplos/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Editar Profesional de prueba/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Eliminar Profesional de prueba/i })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Acciones' })).toBeNull();
  });

  it('no ofrece la selección múltiple, que solo sirve para eliminar', async () => {
    render(<LaborFunctionsManager canManage={false} />); await tick();

    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /Seleccionar todos/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Eliminar seleccionados/i })).toBeNull();
  });

  it('conserva la consulta de empleado, que es de lectura', async () => {
    render(<LaborFunctionsManager canManage={false} />); await tick();

    expect(screen.getByRole('button', { name: /Consultar empleado/i })).toBeTruthy();
  });

  it('con permiso de gestión vuelven a estar todas las acciones', async () => {
    render(<LaborFunctionsManager canManage />); await tick();

    expect(screen.getByRole('button', { name: /Carga masiva/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Agregar individual/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Editar Profesional de prueba/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Eliminar Profesional de prueba/i })).toBeTruthy();
  });

  it('el valor por omisión es cerrado: sin prop no hay acciones de escritura', async () => {
    render(<LaborFunctionsManager />); await tick();

    expect(screen.queryByRole('button', { name: /Carga masiva/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Agregar individual/i })).toBeNull();
  });
});
