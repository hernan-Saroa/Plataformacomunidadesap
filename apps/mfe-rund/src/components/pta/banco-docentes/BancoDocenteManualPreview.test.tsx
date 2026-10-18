import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../../services/api/apiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../../../services/api/rundApi', () => ({ createBancoDocente: vi.fn(), updateBancoDocente: vi.fn(), vincularRundSoporte: vi.fn() }));
import { apiClient } from '../../../services/api/apiClient';
import { createBancoDocente, updateBancoDocente, vincularRundSoporte } from '../../../services/api/rundApi';
import { AuthProvider } from '../../../contexts/AuthContext';
import { RundManualIdentityClient } from '../../../services/api/rundManualIdentityApi';
import { MANUAL_CAPTURE_LABELS } from '../../../services/api/rundManualIdentityCapture';
import { BancoDocenteEditModal } from './BancoDocenteEditModal';

const actor = '11111111-1111-4111-8111-111111111111', request = '22222222-2222-4222-8222-222222222222';
const key = 'rund:creacion-manual:' + actor;
const compatible = () => ({ version: 1, compatibilidad: 'COMPATIBLE_AL_CONSULTAR', reserva: false,
  solicitudCreada: false, ejecucionAutorizada: false, requierePreparacion: true });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name, exact: true }));
const visibleCompatibility = () => screen.queryByText(/Los datos eran compatibles al consultar/);
function field(label: string, value: string) {
  fireEvent.change(screen.getByText(label, { selector: 'label' }).parentElement!.querySelector('input,select,textarea')!, { target: { value } });
}
function fill() {
  field('Documento de Identidad', '987654321'); field('Nombre Completo', 'DOCENTE FICTICIO');
  const territorial = screen.getByText('Territorial', { selector: 'label' }).parentElement!.querySelector('select')!;
  fireEvent.change(territorial, { target: { value: territorial.options[1].value } });
  field('Categoría / Escalafón', 'Auxiliar'); field('Acto Administrativo', 'ACTO FICTICIO');
  field('Horas programables PTA', '800'); field('Inicio Vinculación', '2026-01-01'); click('Siguiente');
  field('Nivel de Formación', 'Pregrado'); field('Núcleo Temático', 'Administración');
  field('Pregrado', 'Administración Pública'); field('Perfil Académico', 'DOCENCIA'); click('Siguiente');
  field('Correo Institucional', 'FICTICIO@esap.edu.co'); click('Siguiente');
  field('Género', 'Femenino'); field('Fecha de Nacimiento', '1985-06-15');
}
function setup(options: { enabled?: boolean; pending?: boolean; withClient?: boolean; editing?: boolean; role?: string } = {}) {
  const uuid = vi.fn(() => request), client = new RundManualIdentityClient(actor, sessionStorage, apiClient, uuid);
  const listeners = new Set<() => void>(), connection = { resolve: vi.fn(), subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; } };
  const saved = vi.fn(), closed = vi.fn();
  if (options.pending) sessionStorage.setItem(key, request);
  const element = (role = options.role || 'ADMIN', c = client, conn = connection, person = 'PERSONA-DISTINTA') =>
    <AuthProvider userPersonId={person} userEmail="operador@example.test" userRole={role} manualOperatorSession={conn}>
      <BancoDocenteEditModal docente={options.editing ? { docente_id: 'PERFIL-FICTICIO' } : null} periodoSeleccionado="2026-2"
        manualIdentityClient={options.withClient === false ? undefined : c} enableManualPreview={options.enabled !== false} onClose={closed} onSaved={saved}/>
    </AuthProvider>;
  return { ...render(element()), element, client, uuid, listeners, connection, saved, closed };
}
beforeEach(() => { vi.resetAllMocks(); sessionStorage.clear(); vi.mocked(apiClient.post).mockResolvedValue(compatible()); });
afterEach(cleanup);

describe('Previsualización en el formulario opcional real', () => {
  it('monta sin HTTP, UUID, solicitud o resolución de principal adicionales', () => {
    const s = setup(); expect(screen.getByRole('button', { name: 'Consultar compatibilidad' })).toBeTruthy();
    expect(apiClient.post).not.toHaveBeenCalled(); expect(apiClient.get).not.toHaveBeenCalled(); expect(s.uuid).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0); expect(s.connection.resolve).not.toHaveBeenCalled();
  });
  it.each([{ enabled: false }, { withClient: false }, { editing: true }, { pending: true }])('no ofrece preview fuera de un alta opcional habilitada: %j', options => {
    setup(options); expect(screen.queryByRole('button', { name: 'Consultar compatibilidad' })).toBeNull(); expect(apiClient.post).not.toHaveBeenCalled();
  });
  it('valida el formulario completo antes de consultar', () => {
    setup(); click('Consultar compatibilidad'); expect(screen.getByText(/No se puede guardar/)).toBeTruthy(); expect(apiClient.post).not.toHaveBeenCalled();
  });
  it('consulta sin reservar y preparar conserva exactamente el mismo payload y la confirmación de captura', async () => {
    const s = setup(); fill(); click('Consultar compatibilidad'); await screen.findByText(/Los datos eran compatibles/);
    expect(sessionStorage.getItem(key)).toBeNull(); expect(s.uuid).not.toHaveBeenCalled(); expect(s.saved).not.toHaveBeenCalled();
    const queried = vi.mocked(apiClient.post).mock.calls[0][1];
    expect(queried).toMatchObject({ formulario: { documentNumber: '987654321', correoInstitucional: 'ficticio@esap.edu.co', horasPta: 800, periodoCarga: '2026-2' } });
    for (const name of ['actorId', 'soporteEdicionId', 'justificacionEdicion', 'rundSuggestionIds']) expect((queried as any).formulario).not.toHaveProperty(name);
    expect(screen.queryByRole('button', { name: 'Confirmar creación' })).toBeNull();
    vi.mocked(apiClient.post).mockResolvedValue({ solicitudId: request, intencionId: actor, preparacion: 'LISTA', entradaCapturada: true, prevalidacion: { estado: 'COMPATIBLE', reserva: false } });
    vi.mocked(apiClient.get).mockResolvedValue({ version: 1, solicitudId: request, intencionId: actor,
      campos: { ...Object.fromEntries(Object.keys(MANUAL_CAPTURE_LABELS).map(name => [name, null])), fullName: 'DOCENTE FICTICIO' },
      proteccionDatos: { accesoCompleto: true, camposEnmascarados: [] } });
    click('Preparar solicitud'); await screen.findByText(/La solicitud está preparada/);
    expect(vi.mocked(apiClient.post).mock.calls[1][0]).toBe('/rund/api/v1/banco-docentes/identidad/solicitudes-manuales/' + request + '/preparar');
    expect(vi.mocked(apiClient.post).mock.calls[1][1]).toEqual(queried); expect(sessionStorage.getItem(key)).toBe(request);
    const execute = screen.getByRole('button', { name: 'Confirmar creación' });
    expect(execute.hasAttribute('disabled')).toBe(true); fireEvent.click(execute); expect(apiClient.post).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('checkbox', { name: 'He revisado los datos guardados de esta solicitud.' }));
    expect(execute.hasAttribute('disabled')).toBe(false); expect(s.saved).not.toHaveBeenCalled();
    expect(createBancoDocente).not.toHaveBeenCalled(); expect(updateBancoDocente).not.toHaveBeenCalled(); expect(vincularRundSoporte).not.toHaveBeenCalled();
  });
  it('retira la observación al modificar datos, incluso si luego se restituye el valor', async () => {
    setup(); fill(); click('Consultar compatibilidad'); await screen.findByText(/Los datos eran compatibles/);
    field('Fecha de Nacimiento', '1985-06-16'); expect(visibleCompatibility()).toBeNull();
    field('Fecha de Nacimiento', '1985-06-15'); expect(visibleCompatibility()).toBeNull();
    click('Consultar compatibilidad'); await screen.findByText(/Los datos eran compatibles/); expect(apiClient.post).toHaveBeenCalledTimes(2);
  });
  it('cambiar de paso no cambia el borrador ni retira una observación vigente', async () => {
    setup(); fill(); click('Consultar compatibilidad'); await screen.findByText(/Los datos eran compatibles/); click('Anterior');
    expect(visibleCompatibility()).toBeTruthy(); expect(apiClient.post).toHaveBeenCalledTimes(1);
  });
  it('cambiar datos en vuelo cancela la observación y bloquea preparación concurrente', async () => {
    let done!: (value: any) => void; vi.mocked(apiClient.post).mockImplementation(() => new Promise(resolve => { done = resolve; }));
    setup(); fill(); click('Consultar compatibilidad'); click('Consultar compatibilidad');
    const save = screen.getByRole('button', { name: 'Guardando...' }); expect(save.hasAttribute('disabled')).toBe(true); fireEvent.click(save);
    expect(apiClient.post).toHaveBeenCalledTimes(1); expect(sessionStorage.length).toBe(0);
    field('Fecha de Nacimiento', '1985-06-16'); const signal = vi.mocked(apiClient.post).mock.calls[0][2]!.signal!;
    expect(signal.aborted).toBe(true); await act(async () => { done(compatible()); });
    expect(visibleCompatibility()).toBeNull(); expect(screen.queryByText(/No se pudo comprobar/)).toBeNull();
  });
  it.each([401, 403, 409, 503])('fallo %s solo muestra error genérico, sin escritura alternativa', async status => {
    vi.mocked(apiClient.post).mockRejectedValue(Object.assign(new Error('SQL PRIVADO'), { status }));
    const s = setup(); fill(); click('Consultar compatibilidad'); await screen.findByText(/No se pudo comprobar/);
    expect(visibleCompatibility()).toBeNull(); expect(screen.queryByText(/SQL PRIVADO/)).toBeNull(); expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(sessionStorage.length).toBe(0); expect(s.uuid).not.toHaveBeenCalled(); expect(createBancoDocente).not.toHaveBeenCalled();
  });
  it('una respuesta con autorización o reserva inesperada no muestra compatibilidad', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ ...compatible(), ejecucionAutorizada: true });
    setup(); fill(); click('Consultar compatibilidad'); await screen.findByText(/No se pudo comprobar/); expect(visibleCompatibility()).toBeNull();
  });
  it('una notificación de sesión invalida el resultado y exige reabrir', async () => {
    const s = setup(); fill(); click('Consultar compatibilidad'); await screen.findByText(/Los datos eran compatibles/);
    act(() => { s.listeners.forEach(fn => fn()); }); expect(visibleCompatibility()).toBeNull();
    expect(screen.getByText(/La sesión cambió/)).toBeTruthy(); click('Consultar compatibilidad'); expect(apiClient.post).toHaveBeenCalledTimes(1);
  });
  it('descarta respuesta tardía tras invalidación de sesión, sin refrescar o repetir', async () => {
    let done!: (value: any) => void; vi.mocked(apiClient.post).mockImplementation(() => new Promise(resolve => { done = resolve; }));
    const s = setup(); fill(); click('Consultar compatibilidad'); act(() => { s.listeners.forEach(fn => fn()); });
    await act(async () => { done(compatible()); }); expect(visibleCompatibility()).toBeNull(); expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(sessionStorage.length).toBe(0); expect(s.connection.resolve).not.toHaveBeenCalled();
  });
  it('pérdida y restauración de permiso no restaura una observación anterior', async () => {
    const s = setup(); fill(); click('Consultar compatibilidad'); await screen.findByText(/Los datos eran compatibles/);
    s.rerender(s.element('DOCENTE')); expect(visibleCompatibility()).toBeNull(); click('Consultar compatibilidad'); expect(apiClient.post).toHaveBeenCalledTimes(1);
    s.rerender(s.element()); expect(visibleCompatibility()).toBeNull(); click('Consultar compatibilidad'); await screen.findByText(/Los datos eran compatibles/);
    expect(apiClient.post).toHaveBeenCalledTimes(2);
  });
  it('una sesión sin gestión no puede iniciar la consulta desde el formulario', () => {
    setup({ role: 'DOCENTE' }); fill(); click('Consultar compatibilidad');
    expect(screen.getByText(/Se requiere una sesión con permiso de gestión/)).toBeTruthy();
    expect(apiClient.post).not.toHaveBeenCalled(); expect(sessionStorage.length).toBe(0);
  });
  it('retirar el permiso en vuelo descarta la respuesta aunque se restaure antes de recibirla', async () => {
    let done!: (value: any) => void; vi.mocked(apiClient.post).mockImplementation(() => new Promise(resolve => { done = resolve; }));
    const s = setup(); fill(); click('Consultar compatibilidad');
    s.rerender(s.element('DOCENTE')); s.rerender(s.element()); await act(async () => { done(compatible()); });
    expect(visibleCompatibility()).toBeNull(); expect(screen.queryByText(/No se pudo comprobar/)).toBeNull();
    expect(apiClient.post).toHaveBeenCalledTimes(1); expect(sessionStorage.length).toBe(0);
  });
  it.each(['cliente', 'conexión', 'cuenta'])('cambio de %s retira compatibilidad y no reutiliza la consulta', async kind => {
    const s = setup(); fill(); click('Consultar compatibilidad'); await screen.findByText(/Los datos eran compatibles/);
    s.rerender(s.element('ADMIN', kind === 'cliente' ? new RundManualIdentityClient(request) : s.client,
      kind === 'conexión' ? { ...s.connection } : s.connection, kind === 'cuenta' ? 'OTRA-PERSONA' : 'PERSONA-DISTINTA'));
    expect(visibleCompatibility()).toBeNull(); expect(apiClient.post).toHaveBeenCalledTimes(1);
  });
  it('desmontar cancela la observación y retira la suscripción sin crear solicitud', async () => {
    let done!: (value: any) => void; vi.mocked(apiClient.post).mockImplementation(() => new Promise(resolve => { done = resolve; }));
    const s = setup(); fill(); click('Consultar compatibilidad'); const signal = vi.mocked(apiClient.post).mock.calls[0][2]!.signal!;
    expect(s.listeners.size).toBe(1); s.unmount(); expect(s.listeners.size).toBe(0); expect(signal.aborted).toBe(true);
    await act(async () => { done(compatible()); }); expect(sessionStorage.length).toBe(0); expect(s.saved).not.toHaveBeenCalled();
  });
  it('permite preparar explícitamente sin exigir un preview como aprobación', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('PRIVADO'));
    setup(); fill(); click('Preparar solicitud'); await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    expect(vi.mocked(apiClient.post).mock.calls[0][0]).toContain('/' + request + '/preparar');
  });
});
