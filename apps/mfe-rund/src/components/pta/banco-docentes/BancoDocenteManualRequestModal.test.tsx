import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../../services/api/apiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../../../services/api/rundApi', () => ({ createBancoDocente: vi.fn(), updateBancoDocente: vi.fn(), vincularRundSoporte: vi.fn() }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ userPersonId: 'PERSONA-DISTINTA-DEL-ACTOR', isSuperUser: true }) }));
import { apiClient } from '../../../services/api/apiClient';
import { createBancoDocente, updateBancoDocente, vincularRundSoporte } from '../../../services/api/rundApi';
import { RundManualIdentityClient } from '../../../services/api/rundManualIdentityApi';
import { BancoDocenteManualRequestModal } from './BancoDocenteManualRequestModal';
import { BancoDocenteEditModal } from './BancoDocenteEditModal';
import { MANUAL_CAPTURE_LABELS } from '../../../services/api/rundManualIdentityCapture';

const actor = 'abcdef00-1111-4111-8111-111111111111';
const id = 'abcdef00-2222-4222-8222-222222222222';
const key = 'rund:creacion-manual:' + actor;
const prepared = () => ({ solicitudId: id, intencionId: actor, preparacion: 'LISTA', entradaCapturada: true,
  prevalidacion: { estado: 'COMPATIBLE', reserva: false } });
const confirmed = () => ({ solicitudId: id, intencionId: actor, estado: 'CONFIRMADA', decisionNativa: 'EN_CURSO',
  estadoAuth: 'AUTH_APLICADA', estadoNativo: 'CONFIRMADA', docenteId: 'DOCENTE-FICTICIO', confirmadaEn: '2026-10-15T10:00:00.123456Z', correo: 'PENDIENTE' });
const pending = (aborted = false) => ({ ...confirmed(), estado: aborted ? 'ABORTADA' : 'PENDIENTE',
  decisionNativa: aborted ? 'ABORTADA' : 'EN_CURSO', estadoNativo: 'PREPARADA', docenteId: null, confirmadaEn: null });
const client = () => new RundManualIdentityClient(actor, sessionStorage, apiClient, () => id);
const saved = vi.fn(), closed = vi.fn();
const form = { nombreCompleto: 'DOCENTE FICTICIO', correoInstitucional: 'ficticio@esap.edu.co' };
const captured = (fullAccess = true) => ({ version: 1, solicitudId: id, intencionId: actor,
  campos: { ...Object.fromEntries(Object.keys(MANUAL_CAPTURE_LABELS).map(key => [key, null])), fullName: 'DOCENTE FICTICIO',
    documentNumber: fullAccess ? '987654321' : '*****4321', periodoCarga: '2026-2', horasAsignables: 800 },
  proteccionDatos: { accesoCompleto: fullAccess, camposEnmascarados: fullAccess ? [] : ['documentNumber', 'puntajeSalarial'] } });
const panel = (c = client()) => <BancoDocenteManualRequestModal client={c} onClose={closed} onSaved={saved}
  renderForm={prepare => <button onClick={() => prepare(form)}>Preparar prueba</button>} />;
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name, exact: true }));
const acknowledge = () => fireEvent.click(screen.getByRole('checkbox', { name: 'He revisado los datos guardados de esta solicitud.' }));
beforeEach(() => { sessionStorage.clear(); vi.resetAllMocks(); vi.mocked(apiClient.get).mockResolvedValue(captured()); });
afterEach(cleanup);

describe('Ciclo visual de solicitud manual con transporte e ID reales', () => {
  it('prepara, exige confirmación y conserva el UUID hasta finalizar explícitamente', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce(prepared()).mockResolvedValueOnce(confirmed());
    render(panel());
    expect(apiClient.post).not.toHaveBeenCalled();
    click('Preparar prueba');
    await screen.findByText(/La solicitud está preparada/);
    expect(apiClient.post).toHaveBeenCalledTimes(1); expect(saved).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(key)).toBe(id);
    expect(sessionStorage.length).toBe(1);
    acknowledge(); click('Confirmar creación');
    await screen.findByText('El registro está confirmado en RUND.');
    expect(screen.getByText(/La confirmación del registro no acredita el envío del correo/)).toBeTruthy();
    expect(saved).not.toHaveBeenCalled(); expect(sessionStorage.getItem(key)).toBe(id);
    click('Finalizar registro');
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(sessionStorage.getItem(key)).toBeNull();
    expect(createBancoDocente).not.toHaveBeenCalled(); expect(updateBancoDocente).not.toHaveBeenCalled();
  });
  it('al reabrir consulta el commit perdido sin preparar o ejecutar de nuevo', async () => {
    sessionStorage.setItem(key, id); vi.mocked(apiClient.get).mockResolvedValue(confirmed());
    render(panel());
    expect(screen.queryByText('Preparar prueba')).toBeNull(); expect(apiClient.get).not.toHaveBeenCalled();
    click('Consultar resultado'); await screen.findByText('El registro está confirmado en RUND.');
    expect(apiClient.post).not.toHaveBeenCalled(); expect(saved).not.toHaveBeenCalled();
    click('Finalizar registro'); await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  });
  it('recupera la captura del servidor y exige otra confirmación antes de ejecutar', async () => {
    sessionStorage.setItem(key, id); vi.mocked(apiClient.post).mockResolvedValue(prepared());
    render(panel()); click('Recuperar preparación'); await screen.findByText(/La solicitud está preparada/);
    expect(apiClient.post).toHaveBeenCalledWith(expect.stringContaining(`/${id}/reanudar-preparacion`), {}, expect.anything());
    expect(apiClient.post).toHaveBeenCalledTimes(1); expect(saved).not.toHaveBeenCalled();
  });
  it('reenvía exactamente la captura en memoria cuando se pierde la respuesta de preparación', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('SQL secreto privado')).mockResolvedValueOnce(prepared());
    render(panel()); click('Preparar prueba'); await screen.findByRole('alert');
    expect(screen.queryByText(/SQL secreto/)).toBeNull();
    click('Recuperar preparación'); await screen.findByText(/La solicitud está preparada/);
    const calls = vi.mocked(apiClient.post).mock.calls;
    expect(calls[1]).toEqual(calls[0]); expect(sessionStorage.getItem(key)).toBe(id);
  });
  it.each([401, 403, 409, 503])('un error %s mantiene la solicitud y nunca usa el escritor anterior', async status => {
    vi.mocked(apiClient.post).mockResolvedValueOnce(prepared()).mockRejectedValueOnce(Object.assign(new Error('detalle privado'), { status }));
    render(panel()); click('Preparar prueba'); await screen.findByText(/La solicitud está preparada/);
    acknowledge(); click('Confirmar creación'); await screen.findByRole('alert');
    expect(sessionStorage.getItem(key)).toBe(id); expect(saved).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Confirmar creación' })).toBeNull();
    expect(createBancoDocente).not.toHaveBeenCalled(); expect(screen.queryByText(/detalle privado/)).toBeNull();
  });
  it('un recibo pendiente no anuncia éxito ni permite borrar la solicitud', async () => {
    sessionStorage.setItem(key, id); vi.mocked(apiClient.get).mockResolvedValue(pending());
    render(panel()); click('Consultar resultado'); await waitFor(() => expect(apiClient.get).toHaveBeenCalledOnce());
    await waitFor(() => expect((screen.getByRole('button', { name: 'Consultar resultado' }) as HTMLButtonElement).disabled).toBe(false));
    expect(screen.queryByText('Finalizar registro')).toBeNull(); expect(saved).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(key)).toBe(id);
  });
  it('un aborto irreversible bloquea preparación y ejecución', async () => {
    sessionStorage.setItem(key, id); vi.mocked(apiClient.get).mockResolvedValue(pending(true));
    render(panel()); click('Consultar resultado'); await screen.findByText(/fue abortada/);
    expect(screen.queryByText('Recuperar preparación')).toBeNull();
    expect(screen.queryByText('Confirmar creación')).toBeNull(); expect(sessionStorage.getItem(key)).toBe(id);
  });
  it('un DTO incompleto conserva el pendiente y no muestra un commit', async () => {
    sessionStorage.setItem(key, id); vi.mocked(apiClient.get).mockResolvedValue({ estado: 'CONFIRMADA' });
    render(panel()); click('Consultar resultado'); await screen.findByRole('alert');
    expect(screen.queryByText('Finalizar registro')).toBeNull(); expect(sessionStorage.getItem(key)).toBe(id);
  });
  it('impide doble ejecución y el cierre mientras hay una petición en vuelo', async () => {
    let finish!: (value: any) => void;
    vi.mocked(apiClient.post).mockResolvedValueOnce(prepared()).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(panel()); click('Preparar prueba'); await screen.findByText(/La solicitud está preparada/);
    acknowledge(); const confirm = screen.getByRole('button', { name: 'Confirmar creación' });
    fireEvent.click(confirm); fireEvent.click(confirm); click('Cerrar');
    expect(apiClient.post).toHaveBeenCalledTimes(2); expect(closed).not.toHaveBeenCalled();
    await act(async () => finish(confirmed())); await screen.findByText('El registro está confirmado en RUND.');
  });
  it('cerrar y reabrir conserva la solicitud, sin petición automática', async () => {
    sessionStorage.setItem(key, id); const view = render(panel()); click('Cerrar');
    expect(closed).toHaveBeenCalledOnce(); view.unmount(); render(panel());
    expect(screen.queryByText('Preparar prueba')).toBeNull(); expect(sessionStorage.getItem(key)).toBe(id);
    expect(apiClient.get).not.toHaveBeenCalled(); expect(apiClient.post).not.toHaveBeenCalled();
  });
  it('storage inválido bloquea HTTP y no permite caer al formulario anterior', () => {
    sessionStorage.setItem(key, 'invalido'); render(panel());
    expect(screen.getByRole('alert').textContent).toContain('No se puede recuperar');
    click('Recuperar preparación'); expect(apiClient.post).not.toHaveBeenCalled();
    expect(screen.queryByText('Preparar prueba')).toBeNull();
  });
  it('cambiar de cliente durante HTTP descarta el resultado y bloquea acciones de la sesión anterior', async () => {
    let finish!: (value: any) => void;
    sessionStorage.setItem(key, id); vi.mocked(apiClient.get).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const view = render(panel()); click('Consultar resultado'); view.rerender(panel(client()));
    await act(async () => finish(confirmed()));
    expect(screen.getByRole('alert').textContent).toContain('sesión');
    expect(screen.queryByText('Finalizar registro')).toBeNull(); expect(saved).not.toHaveBeenCalled();
  });
  it('confirmación exige datos guardados y revisión explícita, incluso tras preparar en esta apertura', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(prepared()); render(panel()); click('Preparar prueba');
    await screen.findByRole('region', { name: 'Datos guardados de la solicitud' });
    expect(screen.getByText('987654321')).toBeTruthy(); expect(screen.getByText('800')).toBeTruthy();
    const confirm = screen.getByRole('button', { name: 'Confirmar creación' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true); fireEvent.click(confirm); expect(apiClient.post).toHaveBeenCalledTimes(1);
    acknowledge(); expect(confirm.disabled).toBe(false);
  });
  it('consultar datos guardados no prepara ni ejecuta; la recuperación exige revisarlos otra vez', async () => {
    sessionStorage.setItem(key, id); vi.mocked(apiClient.post).mockResolvedValue(prepared());
    render(panel()); click('Revisar datos guardados'); await screen.findByText('DOCENTE FICTICIO');
    expect(apiClient.post).not.toHaveBeenCalled(); expect(screen.queryByRole('checkbox')).toBeNull();
    click('Recuperar preparación'); await screen.findByRole('checkbox'); acknowledge();
    click('Recuperar preparación'); await waitFor(() => expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false));
  });
  it('muestra datos protegidos y no inventa acceso al documento o salario', async () => {
    sessionStorage.setItem(key, id); vi.mocked(apiClient.get).mockResolvedValue(captured(false));
    render(panel()); click('Revisar datos guardados'); await screen.findByText('*****4321');
    expect(screen.queryByText('987654321')).toBeNull(); expect(screen.getByText('Restringido por permisos')).toBeTruthy();
  });
  it('fallo de lectura tras preparar impide confirmación y no usa la copia local como autorización', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(prepared()); vi.mocked(apiClient.get).mockRejectedValue(new Error('SQL PRIVADO'));
    render(panel()); click('Preparar prueba'); await screen.findByRole('alert');
    expect(screen.queryByText('Confirmar creación')).toBeNull(); expect(sessionStorage.getItem(key)).toBe(id);
    expect(screen.queryByText(/SQL PRIVADO/)).toBeNull(); expect(createBancoDocente).not.toHaveBeenCalled();
  });
  it('captura de otra intención no habilita confirmación', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(prepared()); vi.mocked(apiClient.get).mockResolvedValue({ ...captured(), intencionId: id });
    render(panel()); click('Preparar prueba'); await screen.findByRole('alert');
    expect(screen.queryByText('Confirmar creación')).toBeNull(); expect(saved).not.toHaveBeenCalled();
  });
  it('un error de sesión al releer elimina los datos privados ya mostrados y la aprobación visual', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(prepared()); render(panel()); click('Preparar prueba'); await screen.findByText('987654321'); acknowledge();
    vi.mocked(apiClient.get).mockRejectedValueOnce(Object.assign(new Error('VENCIDA'), { status: 401 }));
    click('Revisar datos guardados'); await screen.findByRole('alert');
    expect(screen.queryByText('987654321')).toBeNull(); expect(screen.queryByRole('checkbox')).toBeNull(); expect(sessionStorage.getItem(key)).toBe(id);
  });
  it('abandono requiere confirmación y otro GET antes de retirar el ID y abrir el formulario vacío', async () => {
    sessionStorage.setItem(key, id);const receipt={solicitudId:id,estado:'ABANDONADA',puedeIniciarOtra:true};
    vi.mocked(apiClient.post).mockResolvedValue(receipt);vi.mocked(apiClient.get).mockResolvedValue(receipt);
    render(panel());click('Abandonar solicitud');expect(apiClient.post).not.toHaveBeenCalled();
    click('Confirmar abandono');await screen.findByText(/La solicitud fue abandonada/);
    expect(sessionStorage.getItem(key)).toBe(id);expect(saved).not.toHaveBeenCalled();
    expect(screen.queryByText('Recuperar preparación')).toBeNull();click('Iniciar otro registro');
    await screen.findByText('Preparar prueba');expect(sessionStorage.getItem(key)).toBeNull();expect(apiClient.get).toHaveBeenCalledOnce();
  });
  it('una operación reservada rechaza abandono y conserva la posibilidad de recuperar el mismo ID', async () => {
    sessionStorage.setItem(key, id);vi.mocked(apiClient.post).mockRejectedValue(Object.assign(new Error('SQL PRIVADO'),{status:409}));
    render(panel());click('Abandonar solicitud');click('Confirmar abandono');await screen.findByRole('alert');
    expect(sessionStorage.getItem(key)).toBe(id);expect(screen.queryByText('Iniciar otro registro')).toBeNull();
    expect(screen.getByText('Recuperar preparación')).toBeTruthy();expect(createBancoDocente).not.toHaveBeenCalled();
  });
  it('GET recupera respuesta perdida de abandono y nunca llama onSaved', async () => {
    sessionStorage.setItem(key, id);vi.mocked(apiClient.get).mockResolvedValue({solicitudId:id,estado:'ABANDONADA',puedeIniciarOtra:true});
    render(panel());click('Consultar abandono');await screen.findByText(/La solicitud fue abandonada/);
    expect(apiClient.post).not.toHaveBeenCalled();expect(saved).not.toHaveBeenCalled();expect(sessionStorage.getItem(key)).toBe(id);
  });
  it('fallo del GET para iniciar otro registro mantiene el ID y no abre una creación alternativa', async () => {
    sessionStorage.setItem(key, id);vi.mocked(apiClient.get).mockResolvedValueOnce({solicitudId:id,estado:'ABANDONADA',puedeIniciarOtra:true})
      .mockRejectedValueOnce(new Error('CAIDA'));
    render(panel());click('Consultar abandono');await screen.findByText(/La solicitud fue abandonada/);click('Iniciar otro registro');await screen.findByRole('alert');
    expect(sessionStorage.getItem(key)).toBe(id);expect(screen.queryByText('Preparar prueba')).toBeNull();expect(saved).not.toHaveBeenCalled();
  });
  it('cierre de operación exige confirmación y GET antes de abrir otra solicitud',async()=>{
    sessionStorage.setItem(key,id);const closed={solicitudId:id,intencionId:actor,estado:'CERRADA',estadoAuth:'CANCELADA',decisionNativa:'ABORTADA',
      estadoNativo:'PREPARADA',resolucionAuth:null,casoRevisionId:null,puedeIniciarOtra:true};
    vi.mocked(apiClient.post).mockResolvedValue(closed);vi.mocked(apiClient.get).mockResolvedValue(closed);
    render(panel());click('Cerrar operación');expect(apiClient.post).not.toHaveBeenCalled();click('Confirmar cierre de operación');
    await screen.findByText(/La operación quedó cerrada/);expect(sessionStorage.getItem(key)).toBe(id);expect(saved).not.toHaveBeenCalled();
    click('Iniciar otro registro');await screen.findByText('Preparar prueba');expect(sessionStorage.getItem(key)).toBeNull();
  });
  it('revisión humana conserva el ID y muestra el caso sin permitir otra solicitud',async()=>{
    sessionStorage.setItem(key,id);vi.mocked(apiClient.get).mockResolvedValue({solicitudId:id,intencionId:actor,estado:'REVISION_REQUERIDA',estadoAuth:'AUTH_APLICADA',
      decisionNativa:'ABORTADA',estadoNativo:'PREPARADA',resolucionAuth:'REVISION_REQUERIDA',casoRevisionId:actor,puedeIniciarOtra:false});
    render(panel());click('Consultar cierre');await screen.findByText(/la identidad requiere revisión/);
    expect(screen.queryByText('Iniciar otro registro')).toBeNull();expect(sessionStorage.getItem(key)).toBe(id);expect(saved).not.toHaveBeenCalled();
  });
  it('cierre perdido o 503 conserva el pendiente y permite consultar sin POST automático',async()=>{
    sessionStorage.setItem(key,id);vi.mocked(apiClient.post).mockRejectedValue(new Error('PRIVADO'));
    render(panel());click('Cerrar operación');click('Confirmar cierre de operación');await screen.findByRole('alert');
    expect(sessionStorage.getItem(key)).toBe(id);expect(screen.getByText('Consultar cierre')).toBeTruthy();expect(saved).not.toHaveBeenCalled();
  });
  it('un perfil confirmado consultado por cierre requiere recuperar su recibo de ejecución para finalizar',async()=>{
    sessionStorage.setItem(key,id);vi.mocked(apiClient.get).mockResolvedValue({solicitudId:id,intencionId:actor,estado:'CONFIRMADA',estadoAuth:'AUTH_APLICADA',
      decisionNativa:'EN_CURSO',estadoNativo:'CONFIRMADA',resolucionAuth:null,casoRevisionId:null,puedeIniciarOtra:false});
    render(panel());click('Consultar cierre');await screen.findByText('El registro está confirmado en RUND.');
    expect(screen.queryByText('Finalizar registro')).toBeNull();expect(screen.getByText('Consultar resultado')).toBeTruthy();expect(sessionStorage.getItem(key)).toBe(id);
  });
});

function field(label: string, value: string) {
  const element = screen.getByText(label, { selector: 'label' }).parentElement!.querySelector('input,select,textarea')!;
  fireEvent.change(element, { target: { value } });
}
function completeForm(button = 'Guardar Docente', beforeSave?: () => void) {
  field('Documento de Identidad', '987654321'); field('Nombre Completo', 'DOCENTE FICTICIO');
  const territorial = screen.getByText('Territorial', { selector: 'label' }).parentElement!.querySelector('select')!;
  fireEvent.change(territorial, { target: { value: territorial.options[1].value } });
  field('Categoría / Escalafón', 'Auxiliar'); field('Acto Administrativo', 'ACTO FICTICIO');
  field('Horas programables PTA', '800');
  field('Inicio Vinculación', '2026-01-01'); click('Siguiente');
  field('Nivel de Formación', 'Pregrado'); field('Núcleo Temático', 'Administración');
  field('Pregrado', 'Administración Pública'); field('Perfil Académico', 'DOCENCIA'); click('Siguiente');
  field('Correo Institucional', 'ficticio@esap.edu.co'); click('Siguiente');
  field('Género', 'Femenino'); field('Fecha de Nacimiento', '1985-06-15'); beforeSave?.(); click(button);
}
describe('Conexión opcional al formulario real', () => {
  it('sin cliente conserva la creación actual y no llama las rutas preparatorias', async () => {
    vi.mocked(createBancoDocente).mockResolvedValue({ success: true } as any);
    render(<BancoDocenteEditModal docente={null} periodoSeleccionado="2026-2" onClose={closed} onSaved={saved} />);
    completeForm(); await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(createBancoDocente).toHaveBeenCalledOnce(); expect(apiClient.post).not.toHaveBeenCalled();
    expect(vi.mocked(createBancoDocente).mock.calls[0][0].actorId).toBe('PERSONA-DISTINTA-DEL-ACTOR');
  });
  it('la conexión opcional prepara el payload normalizado sin auditoría del navegador', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(prepared());
    render(<BancoDocenteEditModal docente={null} periodoSeleccionado="2026-2" onClose={closed} onSaved={saved} manualIdentityClient={client()} />);
    completeForm('Preparar solicitud'); await screen.findByText(/La solicitud está preparada/);
    const body = vi.mocked(apiClient.post).mock.calls[0][1] as any;
    expect(body.formulario).toMatchObject({ documentNumber: '987654321', documentType: 'CC', dedicacionLabel: 'Tiempo Completo', horasPta: 800, periodoCarga: '2026-2' });
    for (const key of ['actorId', 'soporteEdicionId', 'justificacionEdicion', 'rundSuggestionIds']) expect(body.formulario).not.toHaveProperty(key);
    expect(createBancoDocente).not.toHaveBeenCalled(); expect(saved).not.toHaveBeenCalled();
  });
  it('una solicitud pendiente no reemplaza la edición ni omite el soporte obligatorio', async () => {
    sessionStorage.setItem(key, id);
    render(<BancoDocenteEditModal docente={{ docente_id: 'DOCENTE-FICTICIO' }} periodoSeleccionado="2026-2" onClose={closed} onSaved={saved} manualIdentityClient={client()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    // La navegación al paso final conserva la validación integral antes de subir o editar.
    completeForm();
    expect(screen.getByText(/No se puede guardar/)).toBeTruthy();
    expect(apiClient.post).not.toHaveBeenCalled(); expect(updateBancoDocente).not.toHaveBeenCalled();
    expect(vincularRundSoporte).not.toHaveBeenCalled(); expect(sessionStorage.getItem(key)).toBe(id);
  });
  it('conserva la edición con soporte y sugerencia aunque exista un cliente y una solicitud pendiente', async () => {
    sessionStorage.setItem(key, id);
    vi.mocked(vincularRundSoporte).mockResolvedValue({ success: true, data: { id: 'SOPORTE-FICTICIO' } } as any);
    vi.mocked(updateBancoDocente).mockResolvedValue({ success: true } as any);
    const view = render(<BancoDocenteEditModal docente={{ docente_id: 'DOCENTE-FICTICIO' }} periodoSeleccionado="2026-2"
      onClose={closed} onSaved={saved} manualIdentityClient={client()}
      suggestion={{ id: 'SUGERENCIA-FICTICIA', campo: 'nombreCompleto', valor: 'DOCENTE FICTICIO', label: 'Nombre', valor_previo: '', pagina: 1,
        evidencia: 'Soporte ficticio', estado: 'PENDIENTE', baja_confianza: false }} />);
    completeForm('Guardar Docente', () => {
      field('Justificación de la Edición', 'Corrección con evidencia documental');
      fireEvent.change(view.container.querySelector('input[type="file"]')!, { target: { files: [new File(['ficticio'], 'soporte.pdf', { type: 'application/pdf' })] } });
    });
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(updateBancoDocente).toHaveBeenCalledWith('DOCENTE-FICTICIO', expect.objectContaining({ soporteEdicionId: 'SOPORTE-FICTICIO',
      rundSuggestionIds: ['SUGERENCIA-FICTICIA'], justificacionEdicion: 'Corrección con evidencia documental' }));
    expect(vincularRundSoporte).toHaveBeenCalledOnce(); expect(apiClient.post).not.toHaveBeenCalled();
    expect(createBancoDocente).not.toHaveBeenCalled(); expect(sessionStorage.getItem(key)).toBe(id);
  });
});
