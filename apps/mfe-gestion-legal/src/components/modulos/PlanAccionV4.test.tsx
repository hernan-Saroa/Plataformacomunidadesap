import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn(), loading: vi.fn(() => 'id') },
}));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

vi.mock('../../../../services/api/legal.service', () => ({
  legalService: {
    getPeiDashboard: vi.fn(),
    getPeiArchivados: vi.fn().mockResolvedValue([]),
    getUsuariosResponsablesIndicador: vi.fn().mockResolvedValue([]),
    exportPeiZip: vi.fn(),
  },
}));
vi.mock('../../../../services/api/authService', () => ({
  authService: {
    hasRole: vi.fn(() => false),
    getCurrentUser: vi.fn(() => null),
    hasPermission: vi.fn(() => false),
  },
}));
vi.mock('../config/PermisosContext', () => ({
  usePermisos: () => ({ usuario: null }),
  PERMISOS: {},
}));
// Los modales de CRUD requieren providers ajenos a lo que se prueba aquí.
vi.mock('./ModalNuevoIndicador', () => ({ ModalNuevoIndicador: () => null }));
vi.mock('./ModalEditarIndicador', () => ({ ModalEditarIndicador: () => null }));
vi.mock('./ModalCargarAvance', () => ({ ModalCargarAvance: () => null }));
vi.mock('./ModalDetalleIndicador', () => ({ ModalDetalleIndicador: () => null }));
vi.mock('./planAccionExport', async (orig) => ({
  ...(await orig<typeof import('./planAccionExport')>()),
  exportarPlanAccionExcel: vi.fn().mockResolvedValue(undefined),
  exportarPlanAccionPDF: vi.fn().mockResolvedValue(undefined),
}));

import { ModuloPlanAccionV4 } from './PlanAccionV4';
import { legalService } from '../../../../services/api/legal.service';
import { exportarPlanAccionExcel, exportarPlanAccionPDF } from './planAccionExport';

const FUTURO = '2099-12-31';
const PASADO = '2020-01-31';

const ind = (id: number, nombre: string, eje: string, avance: number, fechaFin = FUTURO, extra: any = {}) => ({
  id, nombre, ejeEstrategico: eje, avanceActual: avance, metaObjetivo: 100, valorActual: avance,
  responsableNombre: `Resp ${id}`, fechaInicio: '2019-01-01', fechaFin, unidadMedida: 'PORCENTAJE', registros: [], ...extra,
});

// 1 GESTION vencido(40), 2 GESTION en tiempo(95), 3 TALENTO en riesgo(70), 4 TRANSPARENCIA vencido(20), 5 TECNOLOGIA completado(100)
const backend = [
  ind(1, 'Eficiencia Procesal', 'GESTION', 40, PASADO),
  ind(2, 'Gestión Documental', 'GESTION', 95),
  ind(3, 'Capacitación Docente', 'TALENTO', 70),
  ind(4, 'Rendición de Cuentas', 'TRANSPARENCIA', 20, PASADO),
  ind(5, 'Digitalización', 'TECNOLOGIA', 100),
];

async function abrirDashboard() {
  const user = userEvent.setup();
  render(<ModuloPlanAccionV4 />);
  await screen.findByText('Total Indicadores');
  await user.click(screen.getByRole('button', { name: /Dashboard/ }));
  return user;
}

const seleccionarOpcion = async (user: ReturnType<typeof userEvent.setup>, filtro: RegExp, opcion: RegExp) => {
  await user.click(screen.getByRole('button', { name: filtro }));
  await user.click(await screen.findByRole('checkbox', { name: opcion }));
  await user.keyboard('{Escape}');
};

const metrica = (label: string) => screen.getByText(label).parentElement!.textContent ?? '';

describe('ModuloPlanAccionV4 · filtros Eje / Estado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(legalService.getPeiDashboard).mockResolvedValue({ indicadores: backend } as any);
  });

  it('sin filtros muestra los 4 ejes y todos los totales', async () => {
    await abrirDashboard();
    expect(screen.getAllByTestId(/^eje-card-/)).toHaveLength(4);
    expect(screen.getByText(/Mostrando/).textContent).toMatch(/5 de 5 indicadores/);
  });

  it('el filtro de Eje muestra solo ese eje y recalcula los totales', async () => {
    const user = await abrirDashboard();
    await seleccionarOpcion(user, /Filtro Ejes/, /Gestión Institucional/);

    const cards = screen.getAllByTestId(/^eje-card-/);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveAttribute('data-testid', 'eje-card-GESTION_INSTITUCIONAL');
    expect(screen.getByText(/Mostrando/).textContent).toMatch(/2 de 5 indicadores/);
    expect(metrica('Total Indicadores')).toContain('2');
    expect(metrica('Cumplimiento Promedio')).toContain('68%'); // (40+95)/2 → 67.5
  });

  it('el filtro de Estado muestra solo los indicadores en ese estado, agrupados en su eje', async () => {
    const user = await abrirDashboard();
    await seleccionarOpcion(user, /Filtro Estados/, /^Vencido$/);

    const cards = screen.getAllByTestId(/^eje-card-/);
    expect(cards.map(c => c.getAttribute('data-testid'))).toEqual([
      'eje-card-GESTION_INSTITUCIONAL', 'eje-card-TRANSPARENCIA',
    ]);
    expect(screen.getByText(/Mostrando/).textContent).toMatch(/2 de 5 indicadores/);
  });

  it('Eje + Estado se combinan', async () => {
    const user = await abrirDashboard();
    await seleccionarOpcion(user, /Filtro Ejes/, /Transparencia/);
    await seleccionarOpcion(user, /Filtro Estados/, /^Vencido$/);
    expect(screen.getAllByTestId(/^eje-card-/)).toHaveLength(1);
    expect(metrica('Total Indicadores')).toContain('1');
  });

  it('permite selección múltiple y la opción Todos restablece el filtro', async () => {
    const user = await abrirDashboard();
    await seleccionarOpcion(user, /Filtro Ejes/, /Talento Humano/);
    await seleccionarOpcion(user, /Filtro Ejes/, /Tecnología/);
    expect(screen.getAllByTestId(/^eje-card-/)).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: /Filtro Ejes/ }));
    await user.click(await screen.findByRole('checkbox', { name: 'Todos los Ejes' }));
    await user.keyboard('{Escape}');
    expect(screen.getAllByTestId(/^eje-card-/)).toHaveLength(4);
  });

  it('al expandir un eje muestra cada indicador con meta, ejecutado, avance, responsable y corte', async () => {
    const user = await abrirDashboard();
    await user.click(screen.getByRole('button', { name: /Ver indicadores de Gestión Institucional/ }));
    const item = screen.getByTestId('indicador-2');
    expect(within(item).getByText('Gestión Documental')).toBeInTheDocument();
    expect(item.textContent).toContain('95%');
    expect(item.textContent).toContain('Meta: 100%');
    expect(item.textContent).toContain('Ejecutado: 95%');
    expect(item.textContent).toContain('Resp 2');
    expect(item.textContent).toContain('Corte:');
  });

  it('sin coincidencias muestra el mensaje y "Limpiar filtros" restablece la vista', async () => {
    const user = await abrirDashboard();
    await seleccionarOpcion(user, /Filtro Ejes/, /Tecnología/);
    await seleccionarOpcion(user, /Filtro Estados/, /^Vencido$/);

    expect(screen.getByText('No hay indicadores que coincidan con los filtros seleccionados')).toBeInTheDocument();
    expect(screen.queryAllByTestId(/^eje-card-/)).toHaveLength(0);

    await user.click(screen.getAllByRole('button', { name: /Limpiar filtros/ })[0]);
    expect(screen.queryByText(/No hay indicadores que coincidan/)).not.toBeInTheDocument();
    expect(screen.getAllByTestId(/^eje-card-/)).toHaveLength(4);
  });

  it('el filtro de periodo se combina con los demás', async () => {
    vi.mocked(legalService.getPeiDashboard).mockResolvedValue({
      indicadores: [
        ind(1, 'Antiguo', 'GESTION', 50, FUTURO, { registros: [{ id: 1, valorReportado: 1, porcentajeAvance: 50, fechaRegistro: '2025-02-01T10:00:00' }] }),
        ind(2, 'Reciente', 'GESTION', 50, FUTURO, { registros: [{ id: 2, valorReportado: 1, porcentajeAvance: 50, fechaRegistro: '2025-10-01T10:00:00' }] }),
      ],
    } as any);
    const user = await abrirDashboard();
    await user.type(screen.getByLabelText('Periodo desde'), '2025-09-01');
    expect(screen.getByText(/Mostrando/).textContent).toMatch(/1 de 2 indicadores/);
  });

  it('la exportación a Excel y PDF recibe solo los indicadores filtrados y los filtros', async () => {
    const user = await abrirDashboard();
    await seleccionarOpcion(user, /Filtro Estados/, /^Vencido$/);

    await user.click(screen.getByRole('button', { name: /Excel/ }));
    await waitFor(() => expect(exportarPlanAccionExcel).toHaveBeenCalledTimes(1));
    const [indsExcel, filtrosExcel] = vi.mocked(exportarPlanAccionExcel).mock.calls[0];
    expect(indsExcel.map(i => i.id).sort()).toEqual(['1', '4']);
    expect(filtrosExcel.estados).toEqual(['VENCIDO']);

    await user.click(screen.getByRole('button', { name: /PDF/ }));
    await waitFor(() => expect(exportarPlanAccionPDF).toHaveBeenCalledTimes(1));
    expect(vi.mocked(exportarPlanAccionPDF).mock.calls[0][0].map(i => i.id).sort()).toEqual(['1', '4']);
  });

  it('no exporta cuando no hay resultados', async () => {
    const user = await abrirDashboard();
    await seleccionarOpcion(user, /Filtro Ejes/, /Tecnología/);
    await seleccionarOpcion(user, /Filtro Estados/, /^Vencido$/);
    await user.click(screen.getByRole('button', { name: /Excel/ }));
    expect(exportarPlanAccionExcel).not.toHaveBeenCalled();
  });

  it('la vista Lista también respeta el filtro de eje', async () => {
    const user = userEvent.setup();
    render(<ModuloPlanAccionV4 />);
    await screen.findByText('Total Indicadores');
    await seleccionarOpcion(user, /Filtro Ejes/, /Talento Humano/);
    expect(screen.getByText('Capacitación Docente')).toBeInTheDocument();
    expect(screen.queryByText('Eficiencia Procesal')).not.toBeInTheDocument();
  });
});
