import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { ModulesManagementModulePremium } from '../ModulesManagementModulePremium';
import { notificacionesConfigService, validarCorreoDesvio } from '../../../services/api/notificacionesConfig.service';
import { modulesService } from '../../../services/api/modules.service';

// apiClient arrastra la caché offline (indexedDB), que no existe en jsdom.
vi.mock('../../../services/api/apiClient', () => ({ apiClient: {} }));
vi.mock('@esap-mfe/shared-ui', () => ({ ResponsiveHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock('../../../services/api/modules.service', () => ({
  modulesService: { getModulesWithPermissions: vi.fn(), updateModule: vi.fn() },
}));
vi.mock('../../../services/api/notificacionesConfig.service', async () => {
  const real = await vi.importActual<typeof import('../../../services/api/notificacionesConfig.service')>('../../../services/api/notificacionesConfig.service');
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
vi.mock('../../../services/api/roles.service', () => ({ rolesService: { getRoles: vi.fn().mockResolvedValue({ roles: [], total: 0 }) } }));
vi.mock('../../../services/api/dependencias.service', () => ({ dependenciasService: { listar: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../../services/api/estructura.service', () => ({ estructuraService: { sedes: { listar: vi.fn().mockResolvedValue({ data: [] }) } } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));

const servicio = notificacionesConfigService as unknown as Record<string, ReturnType<typeof vi.fn>>;
const modulos = modulesService as unknown as Record<string, ReturnType<typeof vi.fn>>;

const moduloAuth = (extra: Record<string, unknown> = {}) => ({
  id: '1', code: 'pta', name: 'Plan de Trabajo Académico (PTA)', description: 'PTA', icon: 'Shield', color: '#003DA5',
  display_order: 1, category: 'backoffice', is_active: true, permissions: [], ...extra,
});

const modulo = (extra: Record<string, unknown> = {}) => ({
  codigo: 'pta', nombre: 'Plan de Trabajo Académico (PTA)', activo: true, canal_defecto: 'ambos', correo_desvio: null, orden: 10,
  actualizado_en: '2026-11-01T10:00:00Z', actualizado_por: null, eventos: 2, eventos_activos: 2, omitidas_7d: 0, ...extra,
});

const evento = (extra: Record<string, unknown> = {}) => ({
  clave: 'pta_aprobado', codigo_modulo: 'pta', nombre: 'Pta aprobado', descripcion: null, activo: true, canal: null,
  obligatorio: false, prioridad: null, prioridad_codigo: 'Alta', envia_correo: true, envia_campana: true, roles_adicionales: [],
  dependencias_adicionales: [], sedes_adicionales: [], visto_en: null, verificado_en: null, verificado_por: null,
  actualizado_en: '2026-11-01T10:00:00Z', actualizado_por: null, ...extra,
});

async function abrirConfiguracionDePta() {
  render(<ModulesManagementModulePremium />);
  fireEvent.click(await screen.findByRole('button', { name: /Configurar notificaciones de Plan de Trabajo/ }));
  await screen.findByText('Pta aprobado');
}

describe('Notificaciones dentro de Gestión de módulos (EFDS-2406)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    modulos.getModulesWithPermissions.mockResolvedValue([moduloAuth(), moduloAuth({ id: '2', code: 'contratacion', name: 'Contratación' })]);
    servicio.misPermisos.mockResolvedValue({ gestionar: true, compuerta_encendida: true });
    servicio.listarModulos.mockResolvedValue([
      modulo(),
      modulo({ codigo: 'sistema', nombre: 'Sistema', activo: false, eventos: 5, eventos_activos: 3, orden: 90 }),
    ]);
    servicio.listarEventos.mockResolvedValue([evento(), evento({ clave: 'pta_otp', nombre: 'Otp', obligatorio: true, envia_correo: true, envia_campana: false })]);
    servicio.omitidas.mockResolvedValue([]);
    servicio.historial.mockResolvedValue([]);
  });

  it('sin el permiso no aparece nada de notificaciones ni se piden los módulos (CA7)', async () => {
    servicio.misPermisos.mockResolvedValue({ gestionar: false, compuerta_encendida: true });
    render(<ModulesManagementModulePremium />);
    expect(await screen.findByText('Contratación')).toBeInTheDocument();
    await waitFor(() => expect(servicio.misPermisos).toHaveBeenCalled());
    expect(screen.queryByText('Notificaciones')).not.toBeInTheDocument();
    expect(screen.queryByText('Registro de notificaciones')).not.toBeInTheDocument();
    expect(servicio.listarModulos).not.toHaveBeenCalled();
  });

  it('la tabla muestra el estado y el número de avisos cruzando por código; sin cruce dice "Sin avisos"', async () => {
    render(<ModulesManagementModulePremium />);
    expect(await screen.findByText('Notificaciones', { selector: 'th' })).toBeInTheDocument();
    expect(await screen.findByText('Activas')).toBeInTheDocument();
    expect(screen.getAllByText('2 avisos').length).toBeGreaterThan(0);
    const filaContratacion = screen.getByText('Contratación').closest('tr') as HTMLElement;
    expect(within(filaContratacion).getByText('Sin avisos')).toBeInTheDocument();
    expect(within(filaContratacion).queryByRole('button', { name: /Configurar notificaciones/ })).not.toBeInTheDocument();
  });

  it('los módulos que no están en el menú van en "Otros remitentes de notificaciones"', async () => {
    render(<ModulesManagementModulePremium />);
    const bloque = await screen.findByLabelText('Otros remitentes de notificaciones');
    expect(within(bloque).getByText('Sistema')).toBeInTheDocument();
    expect(within(bloque).getByText('Apagadas')).toBeInTheDocument();
    expect(within(bloque).queryByText('Plan de Trabajo Académico (PTA)')).not.toBeInTheDocument();
  });

  it('apagar las notificaciones del módulo llama al servicio y no toca el estado del menú (CA1)', async () => {
    servicio.actualizarModulo.mockResolvedValue(modulo({ activo: false, actualizado_por: 'admin' }));
    await abrirConfiguracionDePta();
    fireEvent.click(screen.getByRole('switch', { name: /Desactivar las notificaciones de Plan de Trabajo/ }));
    await waitFor(() => expect(servicio.actualizarModulo).toHaveBeenCalledWith('pta', { activo: false }));
    expect(await screen.findByText('Notificaciones apagadas')).toBeInTheDocument();
    expect(screen.getByText(/No sale ningún aviso, salvo los obligatorios/)).toBeInTheDocument();
    expect(modulos.updateModule).not.toHaveBeenCalled();
  });

  it('un aviso obligatorio no se puede apagar (CA3) y "solo correo" no se ofrece si el aviso no manda correo', async () => {
    servicio.listarEventos.mockResolvedValue([evento(), evento({ clave: 'pta_otp', nombre: 'Otp', obligatorio: true, envia_correo: false, envia_campana: true })]);
    await abrirConfiguracionDePta();
    expect(screen.getByRole('switch', { name: /Desactivar Otp/ })).toBeDisabled();
    const selects = screen.getAllByRole('combobox', { name: 'Canal del evento' });
    expect(Array.from((selects[1] as HTMLSelectElement).options).find((o) => o.value === 'correo')?.disabled).toBe(true);
    expect(Array.from((selects[0] as HTMLSelectElement).options).find((o) => o.value === 'correo')?.disabled).toBe(false);
  });

  it('a la vista solo van nombre, canal e interruptor; lo demás está en «Más opciones»', async () => {
    await abrirConfiguracionDePta();
    expect(screen.queryByRole('combobox', { name: 'Prioridad del evento' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Destinatarios adicionales/)).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Más opciones' })[0]);
    expect(screen.getByRole('combobox', { name: 'Prioridad del evento' })).toBeInTheDocument();
    expect(screen.getByText(/Destinatarios adicionales/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Obligatorio/ })).toBeInTheDocument();
  });

  it('un aviso solo de correo no ofrece prioridad ni destinatarios adicionales', async () => {
    await abrirConfiguracionDePta();
    // pta_otp (el segundo) solo manda correo.
    fireEvent.click(screen.getAllByRole('button', { name: 'Más opciones' })[1]);
    expect(screen.getByText(/no admite destinatarios adicionales ni prioridad/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Prioridad del evento' })).not.toBeInTheDocument();
  });

  it('cambiar el canal de un aviso guarda solo ese campo en la ruta del módulo (CA2)', async () => {
    servicio.actualizarEvento.mockResolvedValue(evento({ canal: 'plataforma' }));
    await abrirConfiguracionDePta();
    fireEvent.change(screen.getAllByRole('combobox', { name: 'Canal del evento' })[0], { target: { value: 'plataforma' } });
    await waitFor(() => expect(servicio.actualizarEvento).toHaveBeenCalledWith('pta', 'pta_aprobado', { canal: 'plataforma' }));
  });

  it('el buzón de desvío valida correo y dominio antes de llamar al servicio, y vacío lo borra', async () => {
    servicio.actualizarModulo.mockResolvedValue(modulo({ correo_desvio: 'pruebas@esap.edu.co' }));
    await abrirConfiguracionDePta();
    const campoDesvio = screen.getByLabelText(/Buzón para lo apagado/);
    expect(screen.getByText(/Lo que no sale por estar apagado llega aquí\. Vacío: no llega a ningún lado\./)).toBeInTheDocument();

    fireEvent.change(campoDesvio, { target: { value: 'nadie@gmail.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar buzón' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('@esap.edu.co');
    expect(servicio.actualizarModulo).not.toHaveBeenCalled();

    fireEvent.change(campoDesvio, { target: { value: 'pruebas@esap.edu.co' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar buzón' }));
    await waitFor(() => expect(servicio.actualizarModulo).toHaveBeenCalledWith('pta', { correo_desvio: 'pruebas@esap.edu.co' }));

    fireEvent.change(campoDesvio, { target: { value: '' } });
    servicio.actualizarModulo.mockResolvedValue(modulo({ correo_desvio: null }));
    fireEvent.click(await screen.findByRole('button', { name: 'Guardar buzón' }));
    await waitFor(() => expect(servicio.actualizarModulo).toHaveBeenLastCalledWith('pta', { correo_desvio: null }));
  });

  it('la prueba va a la ruta del módulo e informa por canal (función 15)', async () => {
    const { toast } = await import('sonner');
    servicio.probar.mockResolvedValue({ plataforma: { estado: 'enviado' }, correo: { estado: 'omitido', motivo: 'canal_solo_plataforma' }, verificado: true });
    await abrirConfiguracionDePta();
    fireEvent.click(screen.getAllByRole('button', { name: 'Más opciones' })[0]);
    fireEvent.click(screen.getByRole('button', { name: /Enviarme una prueba/ }));
    await waitFor(() => expect(servicio.probar).toHaveBeenCalledWith('pta', 'pta_aprobado'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Prueba enviada: mire la campana', expect.objectContaining({ description: expect.stringContaining('solo de plataforma') })));
  });

  it('avisa cuando el interruptor general del servidor está apagado', async () => {
    servicio.misPermisos.mockResolvedValue({ gestionar: true, compuerta_encendida: false });
    render(<ModulesManagementModulePremium />);
    expect(await screen.findByText(/NOTIFICACIONES_COMPUERTA/)).toBeInTheDocument();
  });
});

describe('validarCorreoDesvio', () => {
  it('acepta vacío, rechaza formato malo y dominios ajenos', () => {
    expect(validarCorreoDesvio('')).toBeNull();
    expect(validarCorreoDesvio('  Buzon@ESAP.edu.co ')).toBeNull();
    expect(validarCorreoDesvio('sin-arroba')).toMatch(/correo válido/);
    expect(validarCorreoDesvio('a@gmail.com')).toMatch(/esap\.edu\.co/);
  });
});
