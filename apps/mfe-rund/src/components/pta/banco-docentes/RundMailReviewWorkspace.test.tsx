import { StrictMode } from 'react';
import { act,cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
vi.mock('../../../services/api/apiClient',()=>({apiClient:{get:vi.fn(),post:vi.fn()}}));
import { apiClient } from '../../../services/api/apiClient';
import { AuthProvider } from '../../../contexts/AuthContext';
import type { RundManualOperatorConnection } from '../../../contexts/rundManualOperator';
import { RundManualIdentityClient } from '../../../services/api/rundManualIdentityApi';
import { RundMailReviewWorkspace } from './RundMailReviewWorkspace';
import { actor,other,review,omission,diagnostic,closure } from '../../../services/api/rundMailOperations.fixtures';

const base='/rund/api/v1/banco-docentes/identidad/correos/revisiones';
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}));
function connection(actorId=actor){
  const listeners=new Set<()=>void>();
  return {resolve:vi.fn(async(_options?:{signal?:AbortSignal}):Promise<any>=>({version:1,actorId})),
    subscribe:(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};},
    notify:()=>listeners.forEach(fn=>fn()),listeners};
}
function setup(enabled:boolean|undefined=true,role='ADMIN',source:RundManualOperatorConnection|undefined=connection(),authenticated=true){
  const props={enabled,role,source,authenticated,permisos:[] as string[]};
  const panel=()=><StrictMode><AuthProvider userPersonId={props.authenticated?other:undefined} userEmail={props.authenticated?'gestion@example.test':undefined}
    userRole={props.role} permisos={props.permisos} manualOperatorSession={props.source}>
    <RundMailReviewWorkspace enabled={props.enabled}/>
  </AuthProvider></StrictMode>;
  const view=render(panel());return{...view,props,change:(patch:Partial<typeof props>)=>{Object.assign(props,patch);view.rerender(panel());}};
}
async function open(){click('Abrir revisiones de correo');await screen.findByRole('button',{name:'Consultar desde el inicio'});}
async function load(){click('Consultar desde el inicio');await screen.findByRole('table');}
beforeEach(()=>{vi.restoreAllMocks();vi.clearAllMocks();sessionStorage.clear();localStorage.clear();
  vi.mocked(apiClient.get).mockReset();vi.mocked(apiClient.post).mockReset();
  vi.mocked(apiClient.get).mockResolvedValue({casos:[review()],siguienteCursor:null});
});
afterEach(cleanup);

describe('Entrada opcional de revisiones con principal verificado',()=>{
  it('opción ausente no monta conexión, consulta o suscripción',()=>{
    const source=connection(),s=setup(false,'ADMIN',source);s.change({enabled:undefined});
    expect(screen.queryByRole('button')).toBeNull();expect(source.listeners.size).toBe(0);expect(source.resolve).not.toHaveBeenCalled();
    expect(apiClient.get).not.toHaveBeenCalled();expect(apiClient.post).not.toHaveBeenCalled();
  });
  it('habilitar y montar en StrictMode no resuelve principal ni consulta HTTP',()=>{
    const source=connection(),s=setup(false,'ADMIN',source);s.change({enabled:true});
    expect(screen.getByRole('button',{name:'Abrir revisiones de correo'})).toBeTruthy();expect(source.listeners.size).toBe(2);
    expect(source.resolve).not.toHaveBeenCalled();expect(apiClient.get).not.toHaveBeenCalled();
  });
  it('sin conexión no infiere actor desde persona o email',()=>{
    const s=setup();s.change({source:undefined});expect(screen.getByText(/conexión de sesión.*no está disponible/)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();expect(apiClient.get).not.toHaveBeenCalled();
  });
  it.each(['DOCENTE','LECTOR'])('rol %s sin manage no monta resolver',role=>{
    const source=connection();setup(true,role,source);expect(screen.queryByRole('button')).toBeNull();
    expect(source.listeners.size).toBe(0);expect(source.resolve).not.toHaveBeenCalled();
  });
  it('ADMIN sin autenticación no monta resolver',()=>{
    const source=connection();setup(true,'ADMIN',source,false);expect(screen.queryByRole('button')).toBeNull();expect(source.listeners.size).toBe(0);
  });
  it.each(['ADMIN','SUPER_ADMIN','GESTION_PROFESORAL'])('rol %s abre con cuenta resuelta y no hace consultas de lista automáticas',async role=>{
    const source=connection();setup(true,role,source);const factory=vi.spyOn(RundManualIdentityClient.prototype,'operacionesCorreo');
    await open();expect(source.resolve).toHaveBeenCalledOnce();expect(source.resolve.mock.calls[0][0]?.signal).toBeTruthy();
    expect(factory).toHaveBeenCalledOnce();expect(factory.mock.results[0].value.actorId).toBe(actor);
    expect(apiClient.get).not.toHaveBeenCalled();expect(apiClient.post).not.toHaveBeenCalled();
    expect(screen.queryByRole('button',{name:'Abrir revisiones de correo'})).toBeNull();
  });
  it('manage explícito permite abrir sin convertir el ID de persona en principal',async()=>{
    const source=connection(),s=setup(true,'DOCENTE',source);s.change({permisos:['banco-docentes.rund.manage']});
    const factory=vi.spyOn(RundManualIdentityClient.prototype,'operacionesCorreo');await open();
    expect(factory.mock.results[0].value.actorId).toBe(actor);expect(factory.mock.results[0].value.actorId).not.toBe(other);
  });
  it('usa cliente real sin leer, crear, cerrar o sustituir solicitudes manuales almacenadas',async()=>{
    const source=connection();setup(true,'ADMIN',source);const key='rund:creacion-manual:'+actor;sessionStorage.setItem(key,other);
    const get=vi.spyOn(Storage.prototype,'getItem'),set=vi.spyOn(Storage.prototype,'setItem'),remove=vi.spyOn(Storage.prototype,'removeItem');
    await open();await load();expect(get).not.toHaveBeenCalled();expect(set).not.toHaveBeenCalled();expect(remove).not.toHaveBeenCalled();
    expect(apiClient.get).toHaveBeenCalledWith(base,{limite:'25'},expect.objectContaining({retries:0,cache:'no-store',skipAuthRefresh:true}));
    expect(apiClient.post).not.toHaveBeenCalled();get.mockRestore();expect(sessionStorage.getItem(key)).toBe(other);
  });
  it.each([null,{}, {version:2,actorId:actor},{version:1,actorId:'PERSONA'},{version:1,personId:actor}])('principal inválido %j no monta bandeja',async principal=>{
    const source=connection();source.resolve.mockResolvedValue(principal);setup(true,'ADMIN',source);
    click('Abrir revisiones de correo');await screen.findByRole('alert');expect(screen.queryByRole('button',{name:'Consultar desde el inicio'})).toBeNull();
    expect(apiClient.get).not.toHaveBeenCalled();expect(apiClient.post).not.toHaveBeenCalled();
  });
  it('fallo al resolver es genérico, no reintenta y admite nueva apertura explícita',async()=>{
    const source=connection();source.resolve.mockRejectedValueOnce(Error('TOKEN Y DATOS PRIVADOS'));setup(true,'ADMIN',source);
    click('Abrir revisiones de correo');await screen.findByRole('alert');expect(source.resolve).toHaveBeenCalledOnce();expect(screen.queryByText(/DATOS PRIVADOS/)).toBeNull();
    await open();expect(source.resolve).toHaveBeenCalledTimes(2);expect(screen.queryByRole('alert')).toBeNull();
  });
  it('doble clic mientras resuelve no crea clientes o resoluciones duplicadas',async()=>{
    const source=connection();let finish!:(v:any)=>void;source.resolve.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    setup(true,'ADMIN',source);const factory=vi.spyOn(RundManualIdentityClient.prototype,'operacionesCorreo');
    click('Abrir revisiones de correo');click('Abrir revisiones de correo');expect(source.resolve).toHaveBeenCalledOnce();
    await act(async()=>{finish({version:1,actorId:actor});});await screen.findByRole('button',{name:'Consultar desde el inicio'});expect(factory).toHaveBeenCalledOnce();
  });
  it('notificación durante resolver permite nueva apertura sin esperar la respuesta antigua',async()=>{
    const source=connection();let finish!:(v:any)=>void;source.resolve.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    setup(true,'ADMIN',source);click('Abrir revisiones de correo');act(()=>source.notify());
    expect(source.resolve.mock.calls[0][0]?.signal?.aborted).toBe(true);expect(screen.getByText(/La sesión cambió/)).toBeTruthy();
    source.resolve.mockResolvedValue({version:1,actorId:other});const factory=vi.spyOn(RundManualIdentityClient.prototype,'operacionesCorreo');await open();
    await act(async()=>{finish({version:1,actorId:actor});});expect(factory).toHaveBeenCalledOnce();expect(factory.mock.results[0].value.actorId).toBe(other);
    expect(screen.queryByRole('alert')).toBeNull();expect(apiClient.get).not.toHaveBeenCalled();
  });
  it('respuesta antigua rechazada no retira busy ni muestra error de una apertura nueva',async()=>{
    const source=connection();let rejectOld!:(e:Error)=>void,finishNew!:(v:any)=>void;
    source.resolve.mockImplementationOnce(()=>new Promise((_resolve,reject)=>{rejectOld=reject;}));setup(true,'ADMIN',source);
    click('Abrir revisiones de correo');act(()=>source.notify());source.resolve.mockImplementationOnce(()=>new Promise(resolve=>{finishNew=resolve;}));
    click('Abrir revisiones de correo');await act(async()=>{rejectOld(Error('PRIVADO'));});
    expect(screen.getByRole('button',{name:'Abrir revisiones de correo'}).hasAttribute('disabled')).toBe(true);expect(screen.queryByRole('alert')).toBeNull();
    await act(async()=>{finishNew({version:1,actorId:actor});});await screen.findByRole('button',{name:'Consultar desde el inicio'});
  });
  it('notificación con lista publicada retira filas y permite nuevo cliente incluso para la misma cuenta',async()=>{
    const source=connection();setup(true,'ADMIN',source);const factory=vi.spyOn(RundManualIdentityClient.prototype,'operacionesCorreo');await open();await load();
    const old=factory.mock.results[0].value;act(()=>source.notify());expect(screen.queryByRole('table')).toBeNull();
    await expect(old.list()).rejects.toThrow();const calls=vi.mocked(apiClient.get).mock.calls.length;await open();
    expect(factory.mock.results[1].value).not.toBe(old);expect(apiClient.get).toHaveBeenCalledTimes(calls);await load();
  });
  it('GET tardío de lista no reaparece en la sesión siguiente',async()=>{
    const source=connection();setup(true,'ADMIN',source);await open();let finish!:(v:any)=>void;
    vi.mocked(apiClient.get).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));click('Consultar desde el inicio');act(()=>source.notify());
    await open();await act(async()=>{finish({casos:[review()],siguienteCursor:null});});expect(screen.queryByRole('table')).toBeNull();expect(screen.queryByRole('alert')).toBeNull();
  });
  it('cambiar conexión desmonta el ámbito anterior sin transferir su resultado y permite abrir el nuevo',async()=>{
    const source=connection(),next=connection(other),s=setup(true,'ADMIN',source);let finish!:(v:any)=>void;
    source.resolve.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));click('Abrir revisiones de correo');s.change({source:next});
    expect(source.listeners.size).toBe(0);expect(source.resolve.mock.calls[0][0]?.signal?.aborted).toBe(true);await open();
    await act(async()=>{finish({version:1,actorId:actor});});expect(screen.queryByRole('alert')).toBeNull();expect(next.resolve).toHaveBeenCalledOnce();
  });
  it.each(['enabled','permission','authentication','connection'])('revocar %s retira cliente/datos; restituir exige abrir otra vez',async what=>{
    const source=connection(),s=setup(true,'ADMIN',source),factory=vi.spyOn(RundManualIdentityClient.prototype,'operacionesCorreo');await open();await load();
    const old=factory.mock.results[0].value;
    s.change(what==='enabled'?{enabled:false}:what==='permission'?{role:'DOCENTE'}:what==='authentication'?{authenticated:false}:{source:undefined});
    expect(screen.queryByRole('table')).toBeNull();expect(source.listeners.size).toBe(0);await expect(old.list()).rejects.toThrow();
    s.change({enabled:true,role:'ADMIN',authenticated:true,source});expect(screen.getByRole('button',{name:'Abrir revisiones de correo'})).toBeTruthy();
    expect(screen.queryByRole('button',{name:'Consultar desde el inicio'})).toBeNull();await open();expect(factory.mock.results[1].value).not.toBe(old);
  });
  it('desmontaje aborta resolver y limpia suscripciones sin publicar respuesta tardía',async()=>{
    const source=connection();let finish!:(v:any)=>void;source.resolve.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    const s=setup(true,'ADMIN',source),factory=vi.spyOn(RundManualIdentityClient.prototype,'operacionesCorreo');click('Abrir revisiones de correo');s.unmount();
    expect(source.listeners.size).toBe(0);expect(source.resolve.mock.calls[0][0]?.signal?.aborted).toBe(true);
    await act(async()=>{finish({version:1,actorId:actor});});expect(factory).not.toHaveBeenCalled();expect(apiClient.get).not.toHaveBeenCalled();
  });
  it('entrada real reutiliza diagnóstico/asignación y bloquea la bandeja durante una decisión',async()=>{
    const source=connection();setup(true,'ADMIN',source);await open();await load();click('Ver gestión del caso 1');
    const state={review:review()};
    vi.mocked(apiClient.get).mockImplementation(async(path:string)=>path.endsWith('/omision')?omission():path.endsWith('/cierre')?closure():state.review);
    vi.mocked(apiClient.post).mockResolvedValue(diagnostic('RESULTADO_INCIERTO',true));click('Consultar gestión del correo');
    await screen.findByRole('button',{name:'Asumir revisión'});let finish!:(v:any)=>void;
    vi.mocked(apiClient.post).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));click('Asumir revisión');click('Consultar desde el inicio');
    expect(screen.getByRole('combobox').hasAttribute('disabled')).toBe(true);expect(vi.mocked(apiClient.post).mock.calls.filter(c=>c[0].endsWith('/asumir'))).toHaveLength(1);
    state.review=review('INCIERTO',actor);await act(async()=>{finish(state.review);});await screen.findByText(/asignada a su cuenta/);
    expect(screen.getByRole('button',{name:'Consultar desde el inicio'}).hasAttribute('disabled')).toBe(false);
    expect(vi.mocked(apiClient.post).mock.calls.every(c=>JSON.stringify(c[1])==='{}')).toBe(true);
  });
  it('cambio de sesión durante decisión descarta respuesta y no reenvía el POST',async()=>{
    const source=connection();setup(true,'ADMIN',source);await open();await load();click('Ver gestión del caso 1');
    vi.mocked(apiClient.get).mockImplementation(async(path:string)=>path.endsWith('/omision')?omission():path.endsWith('/cierre')?closure():review());
    vi.mocked(apiClient.post).mockResolvedValue(diagnostic('RESULTADO_INCIERTO',true));click('Consultar gestión del correo');await screen.findByRole('button',{name:'Asumir revisión'});
    let finish!:(v:any)=>void;vi.mocked(apiClient.post).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));click('Asumir revisión');act(()=>source.notify());
    await act(async()=>{finish(review('INCIERTO',actor));});expect(screen.getByText(/La sesión cambió/)).toBeTruthy();expect(screen.queryByText(/asignada a su cuenta/)).toBeNull();
    expect(vi.mocked(apiClient.post).mock.calls.filter(c=>c[0].endsWith('/asumir'))).toHaveLength(1);
    await open();expect(screen.queryByRole('button',{name:'Asumir revisión'})).toBeNull();
  });
});
