import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
vi.mock('../../../../services/api/legal.service', () => ({
  legalService: { getUsuariosResponsablesIndicador: vi.fn() },
}));
// Provider ajeno a lo que se prueba
vi.mock('../config/ConfiguracionesSIGLContext', () => ({
  useConfiguracionesSIGL: () => ({
    getEjesEstrategicosActivos: () => [{ id: 'GESTION_INSTITUCIONAL', nombre: 'Gestión Institucional', icono: '🏛️' }],
    getTiposIndicadoresActivos: () => [{ id: 'EFICIENCIA', nombre: 'Eficiencia', icono: '⚡' }],
  }),
}));

import { toast } from 'sonner';
import { legalService } from '../../../../services/api/legal.service';
import { ModalEditarIndicador } from './ModalEditarIndicador';
import { ModalNuevoIndicador } from './ModalNuevoIndicador';

const user = (id: string, nombre: string, doc: string, email: string, extra: any = {}) => ({
  id: `p-${id}`,
  identification_number: doc,
  full_name: nombre,
  email,
  cargo: extra.cargo ?? null,
  dependencia: extra.dependencia ?? null,
  user: { id_user: id, is_active: extra.activo ?? true, roles: [{ code: extra.rol ?? 'RESUELVE_GESTION_LEGAL' }] },
});

const USUARIOS = [
  user('u-ana', 'Ana Lucía Abogada', '1098765432', 'ana.abogada@esap.edu.co', { cargo: { nomCargo: 'Abogada Especializada' }, dependencia: { nomDependencia: 'Oficina Jurídica' } }),
  user('u-carlos', 'Carlos Pérez', '79123456', 'carlos.perez@esap.edu.co', { rol: 'JEFE_GESTION_LEGAL' }),
  user('u-retirado', 'Luis Retirado', '70000001', 'luis@esap.edu.co', { activo: false }),
  user('u-docente', 'Docente Externo', '70000002', 'docente@esap.edu.co', { rol: 'DOCENTE' }),
];

const indicador = (over: any = {}) => ({
  id: '1', codigo: '1', nombre: 'Indicador QA', descripcion: 'Desc', ejeEstrategico: 'GESTION_INSTITUCIONAL',
  responsable: 'Dr Carlos perez', responsableId: null, meta: 100, valorActual: 0, unidadMedida: '%',
  fechaInicio: new Date('2026-01-01'), fechaFin: new Date('2026-12-31'),
  prioridad: 'MEDIA', periodicidad: 'TRIMESTRAL', tipoIndicador: 'EFICIENCIA', ...over,
});

const combo = () => screen.getByRole('combobox', { name: /Responsable del Indicador/ });

const abrirLista = async (u: ReturnType<typeof userEvent.setup>) => {
  await u.click(combo());
  return screen.findByRole('listbox', { name: 'Responsables' });
};

describe('Responsable del Indicador · Editar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(legalService.getUsuariosResponsablesIndicador).mockResolvedValue(USUARIOS as any);
  });

  it('es una lista desplegable (no un campo de texto libre) con solo usuarios activos del proceso legal', async () => {
    const u = userEvent.setup();
    render(<ModalEditarIndicador isOpen onClose={vi.fn()} indicador={indicador({ responsableId: 'u-ana', responsable: 'Ana Lucía Abogada' }) as any} />);
    await screen.findByText('Ana Lucía Abogada');
    expect(screen.queryByPlaceholderText(/Carlos Mendoza/)).toBeNull();

    const lista = await abrirLista(u);
    const nombres = within(lista).getAllByRole('option').map(o => o.textContent);
    expect(nombres).toHaveLength(2);
    expect(nombres.join('|')).toContain('Ana Lucía Abogada');
    expect(nombres.join('|')).toContain('Carlos Pérez');
    expect(nombres.join('|')).not.toContain('Luis Retirado');
    expect(nombres.join('|')).not.toContain('Docente Externo');
  });

  it('cada opción muestra nombre, cargo o rol y dependencia', async () => {
    const u = userEvent.setup();
    render(<ModalEditarIndicador isOpen onClose={vi.fn()} indicador={indicador() as any} />);
    const lista = await abrirLista(u);
    const [ana, carlos] = within(lista).getAllByRole('option');
    expect(ana.textContent).toContain('Ana Lucía Abogada');
    expect(ana.textContent).toContain('Abogada Especializada · Oficina Jurídica');
    expect(carlos.textContent).toContain('Jefe de Gestión Legal');
  });

  it('busca por nombre, documento y correo, y muestra mensaje si no hay coincidencias', async () => {
    const u = userEvent.setup();
    render(<ModalEditarIndicador isOpen onClose={vi.fn()} indicador={indicador() as any} />);
    const lista = await abrirLista(u);
    const buscador = screen.getByLabelText('Buscar responsable');

    await u.type(buscador, 'perez');
    expect(within(lista).getAllByRole('option')).toHaveLength(1);

    await u.clear(buscador);
    await u.type(buscador, '1098765');
    expect(within(lista).getAllByRole('option')[0].textContent).toContain('Ana Lucía');

    await u.clear(buscador);
    await u.type(buscador, 'ana.abogada@');
    expect(within(lista).getAllByRole('option')).toHaveLength(1);

    await u.clear(buscador);
    await u.type(buscador, 'zzz');
    expect(within(lista).queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText('No hay usuarios activos del proceso Gestión Legal que coincidan con la búsqueda')).toBeTruthy();
  });

  it('precarga el responsable actual cuando el indicador tiene responsableId', async () => {
    render(<ModalEditarIndicador isOpen onClose={vi.fn()} indicador={indicador({ responsableId: 'u-carlos', responsable: 'Carlos Pérez' }) as any} />);
    await screen.findByText('Carlos Pérez');
    expect(combo().textContent).toContain('Carlos Pérez');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('indicador con texto libre sin coincidencia: pide reasignar y NO deja guardar sin elegir de la lista', async () => {
    const onGuardar = vi.fn();
    const onClose = vi.fn();
    render(<ModalEditarIndicador isOpen onClose={onClose} onGuardar={onGuardar} indicador={indicador() as any} />);

    expect((await screen.findByRole('alert')).textContent).toContain('texto libre');
    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

    expect(toast.error).toHaveBeenCalledWith('Debe seleccionar un responsable de la lista');
    expect(onGuardar).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('indicador cuyo responsable ya no está activo se identifica para reasignación', async () => {
    render(<ModalEditarIndicador isOpen onClose={vi.fn()} indicador={indicador({ responsableId: 'u-retirado', responsable: 'Luis Retirado' }) as any} />);
    expect((await screen.findByRole('alert')).textContent).toContain('ya no está activo');
  });

  it('texto libre que coincide exactamente con un usuario: lo sugiere precargado', async () => {
    render(<ModalEditarIndicador isOpen onClose={vi.fn()} indicador={indicador({ responsable: 'carlos perez' }) as any} />);
    await waitFor(() => expect(combo().textContent).toContain('Carlos Pérez'));
  });

  it('al elegir otro usuario envía responsableId y el nombre tomado del registro del usuario', async () => {
    const u = userEvent.setup();
    const onGuardar = vi.fn();
    render(<ModalEditarIndicador isOpen onClose={vi.fn()} onGuardar={onGuardar} indicador={indicador({ responsableId: 'u-ana', responsable: 'ana (texto viejo)' }) as any} />);
    await waitFor(() => expect(combo().textContent).toContain('Ana Lucía Abogada'));

    const lista = await abrirLista(u);
    await u.click(within(lista).getByText('Carlos Pérez'));
    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

    await waitFor(() => expect(onGuardar).toHaveBeenCalledTimes(1));
    expect(onGuardar.mock.calls[0][0]).toEqual(expect.objectContaining({ responsableId: 'u-carlos', responsable: 'Carlos Pérez' }));
  });

  it('si no se pudo cargar la lista no permite guardar', async () => {
    vi.mocked(legalService.getUsuariosResponsablesIndicador).mockRejectedValue(new Error('x'));
    const onGuardar = vi.fn();
    render(<ModalEditarIndicador isOpen onClose={vi.fn()} onGuardar={onGuardar} indicador={indicador({ responsableId: 'u-ana' }) as any} />);
    await screen.findByText('No se pudo cargar la lista de responsables');
    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }));
    expect(onGuardar).not.toHaveBeenCalled();
  });
});

describe('Responsable del Indicador · Nuevo (mismo comportamiento que Editar)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(legalService.getUsuariosResponsablesIndicador).mockResolvedValue(USUARIOS as any);
  });

  const llenarObligatorios = () => {
    fireEvent.change(screen.getByLabelText(/Nombre del Indicador/i), { target: { value: 'Nuevo QA' } });
    fireEvent.change(screen.getByLabelText(/Descripción/i), { target: { value: 'Desc' } });
    fireEvent.change(screen.getByLabelText(/^Meta/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/Fecha de Inicio/i), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText(/Fecha Límite/i), { target: { value: '2026-12-31' } });
  };

  it('muestra la misma lista filtrada (solo activos del proceso legal)', async () => {
    const u = userEvent.setup();
    render(<ModalNuevoIndicador isOpen onClose={vi.fn()} />);
    const lista = await abrirLista(u);
    expect(within(lista).getAllByRole('option')).toHaveLength(2);
  });

  it('no deja crear sin elegir responsable de la lista', async () => {
    const onGuardar = vi.fn();
    render(<ModalNuevoIndicador isOpen onClose={vi.fn()} onGuardar={onGuardar} />);
    await screen.findByText('-- Seleccione un responsable --');
    llenarObligatorios();
    fireEvent.click(screen.getByRole('button', { name: /Crear Indicador/i }));
    expect(toast.error).toHaveBeenCalledWith('Debe seleccionar un responsable de la lista');
    expect(onGuardar).not.toHaveBeenCalled();
  });

  it('al elegir un usuario envía responsableId y su nombre', async () => {
    const u = userEvent.setup();
    const onGuardar = vi.fn();
    render(<ModalNuevoIndicador isOpen onClose={vi.fn()} onGuardar={onGuardar} />);
    llenarObligatorios();
    const lista = await abrirLista(u);
    await u.click(within(lista).getByText('Ana Lucía Abogada'));
    fireEvent.click(screen.getByRole('button', { name: /Crear Indicador/i }));

    await waitFor(() => expect(onGuardar).toHaveBeenCalledTimes(1));
    expect(onGuardar.mock.calls[0][0]).toEqual(expect.objectContaining({ responsableId: 'u-ana', responsable: 'Ana Lucía Abogada' }));
  });
});

describe('Responsable del Indicador · teclado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(legalService.getUsuariosResponsablesIndicador).mockResolvedValue(USUARIOS as any);
  });

  it('Escape en el buscador cierra el desplegable, devuelve el foco al campo y no cierra el modal', async () => {
    const u = userEvent.setup();
    const onClose = vi.fn();
    render(<ModalEditarIndicador isOpen onClose={onClose} indicador={indicador() as any} />);
    await abrirLista(u);
    await u.type(screen.getByLabelText('Buscar responsable'), 'zzzz');

    await u.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(combo()).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();

    await u.click(combo());
    expect(screen.getByLabelText('Buscar responsable')).toHaveValue('');
  });
});
