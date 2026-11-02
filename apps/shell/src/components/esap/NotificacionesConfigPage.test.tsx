import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import NotificacionesConfigPage from './NotificacionesConfigPage';
import { notificacionesConfigService } from '../../services/api/notificacionesConfig.service';

// apiClient arrastra la caché offline (indexedDB), que no existe en jsdom.
vi.mock('../../services/api/apiClient', () => ({ apiClient: {} }));

vi.mock('../../services/api/notificacionesConfig.service', async () => {
  const real = await vi.importActual<typeof import('../../services/api/notificacionesConfig.service')>('../../services/api/notificacionesConfig.service');
  return {
    ...real,
    notificacionesConfigService: {
      misPermisos: vi.fn(),
      listarModulos: vi.fn(),
      actualizarModulo: vi.fn(),
      listarEventos: vi.fn(),
      actualizarEvento: vi.fn(),
      probar: vi.fn(),
      historial: vi.fn(),
      omitidas: vi.fn(),
    },
  };
});
vi.mock('../../services/api/roles.service', () => ({ rolesService: { getRoles: vi.fn().mockResolvedValue({ roles: [], total: 0 }) } }));
vi.mock('../../services/api/dependencias.service', () => ({ dependenciasService: { listar: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/api/estructura.service', () => ({ estructuraService: { sedes: { listar: vi.fn().mockResolvedValue({ data: [] }) } } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));

const servicio = notificacionesConfigService as unknown as Record<string, ReturnType<typeof vi.fn>>;

const modulo = (extra: Record<string, unknown> = {}) => ({
  codigo: 'pta', nombre: 'Plan de Trabajo Académico (PTA)', activo: true, canal_defecto: 'ambos', orden: 10,
  actualizado_en: '2026-11-01T10:00:00Z', actualizado_por: null, eventos: 2, eventos_activos: 2, omitidas_7d: 0, ...extra,
});

const evento = (extra: Record<string, unknown> = {}) => ({
  clave: 'pta_aprobado', codigo_modulo: 'pta', nombre: 'Pta aprobado', descripcion: null, activo: true, canal: null,
  obligatorio: false, prioridad: null, prioridad_codigo: 'Alta', envia_correo: true, roles_adicionales: [],
  dependencias_adicionales: [], sedes_adicionales: [], visto_en: null, verificado_en: null, verificado_por: null,
  actualizado_en: '2026-11-01T10:00:00Z', actualizado_por: null, ...extra,
});

describe('NotificacionesConfigPage (EFDS-2406)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicio.misPermisos.mockResolvedValue({ gestionar: true, compuerta_encendida: true });
    servicio.listarModulos.mockResolvedValue([modulo(), modulo({ codigo: 'viaticos', nombre: 'Viáticos', activo: false, eventos: 5, eventos_activos: 3, omitidas_7d: 4 })]);
    servicio.listarEventos.mockResolvedValue([evento(), evento({ clave: 'pta_otp', nombre: 'Otp', obligatorio: true, envia_correo: false })]);
  });

  it('sin el permiso no muestra la consola y dice cuál pedir (CA7)', async () => {
    servicio.misPermisos.mockResolvedValue({ gestionar: false, compuerta_encendida: true });
    render(<NotificacionesConfigPage />);
    expect(await screen.findByText('No tiene permiso para configurar las notificaciones')).toBeInTheDocument();
    expect(screen.getByText(/Configuración de Notificaciones/)).toBeInTheDocument();
  });

  it('lista los módulos con su estado y los eventos del primero', async () => {
    render(<NotificacionesConfigPage />);
    expect((await screen.findAllByText('Plan de Trabajo Académico (PTA)')).length).toBeGreaterThan(0);
    expect(screen.getByText('Viáticos')).toBeInTheDocument();
    expect(screen.getByText('3/5 eventos · 4 omitidas')).toBeInTheDocument();
    expect(await screen.findByText('pta_aprobado')).toBeInTheDocument();
    expect(screen.getByText('Obligatorio', { selector: 'span' })).toBeInTheDocument();
    expect(servicio.listarEventos).toHaveBeenCalledWith('pta');
  });

  it('apagar el módulo llama al servicio y explica que lo omitido queda en la bitácora (CA1)', async () => {
    servicio.actualizarModulo.mockResolvedValue(modulo({ activo: false, actualizado_por: 'admin' }));
    render(<NotificacionesConfigPage />);
    await screen.findByText('pta_aprobado');
    fireEvent.click(screen.getByRole('switch', { name: /Desactivar las notificaciones de Plan de Trabajo/ }));
    await waitFor(() => expect(servicio.actualizarModulo).toHaveBeenCalledWith('pta', { activo: false }));
    expect(await screen.findByText('No notifica')).toBeInTheDocument();
    expect(screen.getByText(/Ningún evento sale, salvo los obligatorios/)).toBeInTheDocument();
  });

  it('un evento obligatorio no se puede apagar (CA3) y "solo correo" no se ofrece si el evento no manda correo', async () => {
    render(<NotificacionesConfigPage />);
    await screen.findByText('pta_otp');
    expect(screen.getByRole('switch', { name: /Desactivar Otp/ })).toBeDisabled();
    const selects = screen.getAllByRole('combobox', { name: 'Canal del evento' });
    const opcionesOtp = Array.from((selects[1] as HTMLSelectElement).options);
    expect(opcionesOtp.find((o) => o.value === 'correo')?.disabled).toBe(true);
    const opcionesAprobado = Array.from((selects[0] as HTMLSelectElement).options);
    expect(opcionesAprobado.find((o) => o.value === 'correo')?.disabled).toBe(false);
  });

  it('cambiar el canal de un evento guarda solo ese campo (CA2)', async () => {
    servicio.actualizarEvento.mockResolvedValue(evento({ canal: 'plataforma' }));
    render(<NotificacionesConfigPage />);
    await screen.findByText('pta_aprobado');
    fireEvent.change(screen.getAllByRole('combobox', { name: 'Canal del evento' })[0], { target: { value: 'plataforma' } });
    await waitFor(() => expect(servicio.actualizarEvento).toHaveBeenCalledWith('pta_aprobado', { canal: 'plataforma' }));
  });

  it('la prueba informa qué pasó por cada canal y recarga para mostrar "Verificado" (función 15)', async () => {
    const { toast } = await import('sonner');
    servicio.probar.mockResolvedValue({ plataforma: { estado: 'enviado' }, correo: { estado: 'omitido', motivo: 'canal_solo_plataforma' }, verificado: true });
    render(<NotificacionesConfigPage />);
    await screen.findByText('pta_aprobado');
    fireEvent.click(screen.getAllByRole('button', { name: 'Ver detalle' })[0]);
    servicio.listarEventos.mockResolvedValue([evento({ verificado_en: '2026-11-01T12:00:00Z', verificado_por: 'admin' })]);
    fireEvent.click(screen.getByRole('button', { name: /Enviarme una prueba/ }));
    await waitFor(() => expect(servicio.probar).toHaveBeenCalledWith('pta_aprobado'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Prueba enviada: mire la campana', expect.objectContaining({ description: expect.stringContaining('solo de plataforma') })));
    expect(await screen.findByText('Verificado', { selector: 'span' })).toBeInTheDocument();
  });

  it('avisa cuando el interruptor general del servidor está apagado', async () => {
    servicio.misPermisos.mockResolvedValue({ gestionar: true, compuerta_encendida: false });
    render(<NotificacionesConfigPage />);
    expect(await screen.findByText(/NOTIFICACIONES_COMPUERTA/)).toBeInTheDocument();
  });

  it('muestra el historial con el valor anterior y el nuevo (RN5)', async () => {
    servicio.historial.mockResolvedValue([{ id: '1', entidad: 'modulo', clave: 'pta', anterior: { activo: true }, nuevo: { activo: false }, usuario: 'admin', fecha: '2026-11-01T10:00:00Z' }]);
    render(<NotificacionesConfigPage />);
    await screen.findByText('pta_aprobado');
    fireEvent.click(screen.getByRole('button', { name: 'Historial de cambios' }));
    expect(await screen.findByText('Sí')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByText(/admin/)).toBeInTheDocument();
  });
});
