import { act,cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
vi.mock('../../../services/api/apiClient',()=>({apiClient:{get:vi.fn(),post:vi.fn()}}));
import { RundMailOperationsPanel } from './RundMailOperationsPanel';
import { BancoDocenteEditModal } from './BancoDocenteEditModal';
import { AuthProvider } from '../../../contexts/AuthContext';
import { RundMailOperationsClient } from '../../../services/api/rundMailOperationsApi';
import { RundManualIdentityClient } from '../../../services/api/rundManualIdentityApi';
import { actor,intention,caseId,other,omission,diagnostic,review,closure } from '../../../services/api/rundMailOperations.fixtures';
import type { Diagnosis } from '../../../services/api/rundMailOperationsContracts';
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}));
beforeEach(()=>{sessionStorage.clear();vi.clearAllMocks();});afterEach(cleanup);
function setup(kind:Diagnosis='RESULTADO_INCIERTO',hasCase=false,assigned:string|null=null){
  const state={d:diagnostic(kind,hasCase),o:omission(),r:review(kind==='ACEPTACION_REGISTRADA'?'ENVIADO':kind==='SIN_RESULTADO_OBSERVADO'?'ENVIANDO':'INCIERTO',assigned),c:closure()};
  const transport={get:vi.fn(),post:vi.fn()};
  transport.get.mockImplementation(async(path:string)=>path.endsWith('/omision')?state.o:path.endsWith('/cierre')?state.c:state.r);
  transport.post.mockImplementation(async(path:string)=>{
    if(path.endsWith('/diagnosticar'))return state.d;
    if(path.endsWith('/omitir-por-vigencia')){state.o=omission(true);return state.o;}
    if(path.endsWith('/asumir')){state.r=review(state.r.estadoCorreo,actor);return state.r;}
    if(path.endsWith('/cerrar')){state.c=closure(true);state.d=diagnostic('ACEPTACION_REGISTRADA',true,true);return state.c;}
    state.d=diagnostic(kind,true);return state.r;
  });
  const client=new RundMailOperationsClient(actor,transport),listeners=new Set<()=>void>();
  const connection={resolve:vi.fn(async()=>({version:1 as const,actorId:actor})),subscribe:(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};}};
  const panel=(c=client,id=intention,permitted=true)=><AuthProvider userPersonId={other} userEmail="operador@example.test" userRole={permitted?'ADMIN':'DOCENTE'}
    manualOperatorSession={connection}><RundMailOperationsPanel client={c} intencionId={id}/></AuthProvider>;
  const view=render(panel());return{...view,state,transport,client,connection,listeners,panel};
}
async function inspect(){click('Consultar gestión del correo');await waitFor(()=>expect(screen.getByRole('button',{name:'Consultar gestión del correo'}).hasAttribute('disabled')).toBe(false));}
describe('Vista operativa opcional por intención',()=>{
  it('no hace HTTP al montar y consulta omisión antes de diagnóstico',async()=>{
    const s=setup('VIGENCIA_CONFIRMADA_AL_CONSULTAR');expect(s.transport.get).not.toHaveBeenCalled();expect(s.transport.post).not.toHaveBeenCalled();
    await inspect();expect(s.transport.get.mock.invocationCallOrder[0]).toBeLessThan(s.transport.post.mock.invocationCallOrder[0]);
    expect(screen.getByText(/conserva las condiciones iniciales/)).toBeTruthy();expect(screen.queryByRole('button',{name:/Enviar|Reenviar|Conciliar/})).toBeNull();
    expect(s.connection.resolve).not.toHaveBeenCalled();expect(sessionStorage.length).toBe(0);
  });
  it('omisión registrada prevalece y evita diagnóstico o nuevas decisiones',async()=>{
    const s=setup();s.state.o=omission(true);await inspect();expect(screen.getByText(/bienvenida fue omitida/)).toBeTruthy();expect(s.transport.post).not.toHaveBeenCalled();
    expect(screen.queryByRole('button',{name:'Registrar revisión'})).toBeNull();
  });
  it('omitir exige confirmación revisada y no modifica la solicitud manual',async()=>{
    const s=setup('VIGENCIA_RECHAZADA');sessionStorage.setItem('rund:creacion-manual:'+actor,other);await inspect();click('Omitir bienvenida');
    expect(screen.getByRole('button',{name:'Confirmar omisión'}).hasAttribute('disabled')).toBe(true);expect(s.transport.post).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('checkbox',{name:'He revisado esta decisión'}));click('Confirmar omisión');await screen.findByText(/bienvenida fue omitida/);
    expect(s.transport.post.mock.calls.filter(c=>c[0].endsWith('/omitir-por-vigencia'))).toHaveLength(1);expect(sessionStorage.getItem('rund:creacion-manual:'+actor)).toBe(other);
  });
  it('cancelar o consultar de nuevo retira la confirmación anterior',async()=>{
    const s=setup('VIGENCIA_RECHAZADA');await inspect();click('Omitir bienvenida');fireEvent.click(screen.getByRole('checkbox'));click('Cancelar decisión');
    click('Omitir bienvenida');expect((screen.getByRole('checkbox')as HTMLInputElement).checked).toBe(false);await inspect();expect(screen.queryByRole('checkbox')).toBeNull();
    expect(s.transport.post.mock.calls.some(c=>c[0].endsWith('/omitir-por-vigencia'))).toBe(false);
  });
  it.each([
    ['SIN_RESULTADO_OBSERVADO',''],['RESULTADO_INCIERTO','/revisar-resultado-incierto'],
  ]as const)('abre %s por su entrada y reutiliza asignación',async(kind,suffix)=>{
    const s=setup(kind);await inspect();click('Registrar revisión');await screen.findByText(/pendiente de asignación/);
    expect(s.transport.post.mock.calls.some(c=>c[0].endsWith('/por-intencion/'+intention+suffix))).toBe(true);
    click('Asumir revisión');await screen.findByText(/asignada a su cuenta/);expect(screen.queryByRole('button',{name:'Asumir revisión'})).toBeNull();
    expect(s.transport.post.mock.calls.filter(c=>c[0].endsWith('/asumir'))).toHaveLength(1);
  });
  it('INCIERTO sin journal usa apertura anterior en vez de afirmar resultado registrado',async()=>{
    const s=setup('RESULTADO_INCIERTO');s.state.d.siguientePaso='REGISTRAR_REVISION';await inspect();click('Registrar revisión');await screen.findByText(/pendiente de asignación/);
    expect(s.transport.post.mock.calls.some(c=>c[0].endsWith('/revisar-resultado-incierto'))).toBe(false);
  });
  it('aceptación con caso propio permite cierre confirmado sin afirmar recepción',async()=>{
    const s=setup('ACEPTACION_REGISTRADA',true,actor);await inspect();expect(screen.getByText(/No acredita recepción o lectura/)).toBeTruthy();
    click('Cerrar revisión');expect(screen.getByRole('button',{name:'Confirmar cierre de revisión'}).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('checkbox'));click('Confirmar cierre de revisión');await screen.findByText(/cierre registrado/);
    expect(s.transport.post.mock.calls.filter(c=>c[0].endsWith('/cerrar'))).toHaveLength(1);expect(screen.queryByRole('button',{name:'Cerrar revisión'})).toBeNull();
  });
  it('otro responsable no se sustituye aunque el rol visual sea ADMIN',async()=>{
    setup('ACEPTACION_REGISTRADA',true,other);await inspect();expect(screen.getByText(/otro responsable/)).toBeTruthy();
    expect(screen.queryByRole('button',{name:'Cerrar revisión'})).toBeNull();expect(screen.queryByRole('button',{name:'Asumir revisión'})).toBeNull();
  });
  it.each(['VIGENCIA_NO_CONFIRMADA','ACEPTACION_PENDIENTE_CONCILIAR','INCERTIDUMBRE_PENDIENTE_CONCILIAR','ENVIADO_SIN_RESULTADO_REGISTRADO']as Diagnosis[])('%s ofrece consulta sin inventar resolución',async kind=>{
    const s=setup(kind);await inspect();expect(screen.getAllByRole('button').map(b=>b.textContent)).toEqual(['Consultar gestión del correo']);
    expect(s.transport.post.mock.calls.every(c=>c[0].endsWith('/diagnosticar'))).toBe(true);
  });
  it.each([401,403,409,503])('fallo %s al decidir oculta acciones y permite recuperar por consulta',async status=>{
    const s=setup('VIGENCIA_RECHAZADA');await inspect();click('Omitir bienvenida');fireEvent.click(screen.getByRole('checkbox'));
    s.transport.post.mockImplementationOnce(async()=>{s.state.o=omission(true);throw Object.assign(Error('DETALLE PRIVADO'),{status});});
    click('Confirmar omisión');await screen.findByRole('alert');expect(screen.queryByText(/DETALLE PRIVADO/)).toBeNull();expect(screen.queryByRole('button',{name:'Omitir bienvenida'})).toBeNull();
    await inspect();expect(screen.getByText(/bienvenida fue omitida/)).toBeTruthy();expect(s.transport.post.mock.calls.filter(c=>c[0].endsWith('/omitir-por-vigencia'))).toHaveLength(1);
  });
  it('doble clic no duplica la decisión y un recibo tardío no se usa después de cambiar cliente',async()=>{
    const s=setup('VIGENCIA_RECHAZADA');await inspect();click('Omitir bienvenida');fireEvent.click(screen.getByRole('checkbox'));let finish!:(v:unknown)=>void;
    s.transport.post.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));click('Confirmar omisión');
    expect(screen.queryByRole('button',{name:'Confirmar omisión'})).toBeNull();s.rerender(s.panel(new RundMailOperationsClient(other,s.transport)));
    await act(async()=>{finish(omission(true));});expect(screen.getByText(/sesión o el registro cambió/)).toBeTruthy();expect(screen.queryByText(/bienvenida fue omitida/)).toBeNull();
    expect(s.transport.post.mock.calls.filter(c=>c[0].endsWith('/omitir-por-vigencia'))).toHaveLength(1);
  });
  it('revocación visual durante consulta oculta el resultado y no conserva autoridad al restituir permisos',async()=>{
    const s=setup();let finish!:(v:unknown)=>void;s.transport.get.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));click('Consultar gestión del correo');
    s.rerender(s.panel(s.client,intention,false));await act(async()=>{finish(omission(true));});expect(screen.queryByText(/bienvenida fue omitida/)).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();s.rerender(s.panel());expect(screen.queryByText(/bienvenida fue omitida/)).toBeNull();expect(s.transport.post).not.toHaveBeenCalled();
  });
  it('notificación de sesión invalida el cliente y no publica respuestas previas',async()=>{
    const s=setup();let finish!:(v:unknown)=>void;s.transport.get.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));click('Consultar gestión del correo');
    act(()=>s.listeners.forEach(fn=>fn()));await act(async()=>{finish(omission(true));});expect(screen.getByText(/sesión o el registro cambió/)).toBeTruthy();
    await expect(s.client.omit(intention)).rejects.toThrow();expect(s.transport.post).not.toHaveBeenCalled();
  });
  it('cambio de intención o desmontaje no inicia consultas nuevas o publica respuestas tardías',async()=>{
    const s=setup();let finish!:(v:unknown)=>void;s.transport.get.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));click('Consultar gestión del correo');
    s.rerender(s.panel(s.client,other));await act(async()=>{finish(omission(true));});expect(screen.getByText(/sesión o el registro cambió/)).toBeTruthy();expect(s.transport.get).toHaveBeenCalledOnce();
    s.unmount();expect(s.listeners.size).toBe(0);
  });
  it('desmontar durante decisión no consulta después de recibir la respuesta tardía',async()=>{
    const s=setup('VIGENCIA_RECHAZADA');await inspect();click('Omitir bienvenida');fireEvent.click(screen.getByRole('checkbox'));let finish!:(v:unknown)=>void;
    s.transport.post.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));click('Confirmar omisión');const before=s.transport.get.mock.calls.length;
    s.unmount();await act(async()=>{finish(omission(true));});expect(s.transport.get).toHaveBeenCalledTimes(before);expect(s.listeners.size).toBe(0);
  });
  it('cambiar solo el callback visual no reinicia la suscripción ni aborta una consulta',async()=>{
    const s=setup();let finish!:(v:unknown)=>void;s.transport.get.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    // Mismo cliente/conexión, callbacks nuevos como en un llamador que renderiza de nuevo.
    const node=(onBusyChange:(v:boolean)=>void)=><AuthProvider userEmail="operador@example.test" userRole="ADMIN" manualOperatorSession={s.connection}>
      <RundMailOperationsPanel client={s.client} intencionId={intention} onBusyChange={onBusyChange}/></AuthProvider>;
    s.rerender(node(vi.fn()));click('Consultar gestión del correo');const next=vi.fn();s.rerender(node(next));
    await act(async()=>{finish(omission(true));});await screen.findByText(/bienvenida fue omitida/);expect(next).toHaveBeenCalledWith(false);
  });
});
describe('Integración en modal manual con activación apagada',()=>{
  const confirmed=()=>({solicitudId:other,intencionId:intention,estado:'CONFIRMADA',decisionNativa:'EN_CURSO',estadoAuth:'AUTH_APLICADA',
    estadoNativo:'CONFIRMADA',docenteId:'DOCENTE',confirmadaEn:'2026-10-16T12:00:00.123456Z',correo:'PENDIENTE'});
  function modal(enabled?:boolean){
    sessionStorage.setItem('rund:creacion-manual:'+actor,other);const transport={get:vi.fn(),post:vi.fn()},client=new RundManualIdentityClient(actor,sessionStorage,transport);
    const saved=vi.fn(),close=vi.fn();transport.get.mockResolvedValueOnce(confirmed());
    const view=render(<AuthProvider userEmail="operador@example.test" userRole="ADMIN"><BancoDocenteEditModal manualIdentityClient={client}
      docente={null} onClose={close} onSaved={saved} enableMailOperations={enabled}/></AuthProvider>);
    return{...view,transport,client,saved,close};
  }
  it('opción ausente conserva flujo y no monta la gestión incluso tras confirmar registro',async()=>{
    const s=modal();click('Consultar resultado');await screen.findByText('El registro está confirmado en RUND.');
    expect(screen.queryByRole('region',{name:'Gestión del correo'})).toBeNull();expect(s.transport.get).toHaveBeenCalledOnce();expect(s.transport.post).not.toHaveBeenCalled();
    click('Finalizar registro');await waitFor(()=>expect(s.saved).toHaveBeenCalledOnce());
  });
  it('opción explícita monta sin HTTP adicional y bloquea finalizar/cerrar solo mientras opera',async()=>{
    const s=modal(true);click('Consultar resultado');await screen.findByText('Gestión del correo de bienvenida');expect(s.transport.get).toHaveBeenCalledOnce();
    expect(s.client.operacionesCorreo()).toBe(s.client.operacionesCorreo());let finish!:(v:unknown)=>void;
    s.transport.get.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));click('Consultar gestión del correo');
    expect(screen.getByRole('button',{name:'Finalizar registro'}).hasAttribute('disabled')).toBe(true);expect(screen.getByRole('button',{name:'Cerrar',exact:true}).hasAttribute('disabled')).toBe(true);
    click('Finalizar registro');expect(s.saved).not.toHaveBeenCalled();await act(async()=>{finish(omission(true));});await screen.findByText(/bienvenida fue omitida/);
    click('Finalizar registro');await waitFor(()=>expect(s.saved).toHaveBeenCalledOnce());expect(s.transport.post).not.toHaveBeenCalled();
  });
});
