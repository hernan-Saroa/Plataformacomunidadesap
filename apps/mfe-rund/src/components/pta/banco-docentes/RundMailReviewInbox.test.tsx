import { act,cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
vi.mock('../../../services/api/apiClient',()=>({apiClient:{get:vi.fn(),post:vi.fn()}}));
import { RundMailReviewInbox } from './RundMailReviewInbox';
import { AuthProvider } from '../../../contexts/AuthContext';
import { RundMailOperationsClient } from '../../../services/api/rundMailOperationsApi';
import { actor,other,review,omission,diagnostic,closure } from '../../../services/api/rundMailOperations.fixtures';
import type { MailReview } from '../../../services/api/rundMailOperationsContracts';
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}));
const base='/rund/api/v1/banco-docentes/identidad/correos/revisiones';
const rows=Array.from({length:26},(_,index)=>({...review(),casoId:`abcdef00-1111-4111-8111-${String(index+1).padStart(12,'0')}`,
  intencionId:`abcdef00-2222-4222-8222-${String(index+1).padStart(12,'0')}`}));
const cursor=(r:MailReview,state:unknown=null)=>btoa(JSON.stringify({version:1,creadaEn:r.creadaEn,casoId:r.casoId,estado:state})).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
beforeEach(()=>{vi.clearAllMocks();sessionStorage.clear();localStorage.clear();});afterEach(cleanup);
function setup(enabled:boolean|undefined=true,role='ADMIN',authenticated=true){
  const transport={get:vi.fn(),post:vi.fn()},data={rows:[review()],more:false};
  transport.get.mockImplementation(async(path:string,q:any)=>{
    if(path!==base)throw Error('No se esperaba detalle automático');
    const current=q.cursor?data.rows.slice(25):data.rows.slice(0,25),last=current[current.length-1];
    return{casos:current,siguienteCursor:data.more&&!q.cursor?cursor(last,q.estado??null):null};
  });
  const client=new RundMailOperationsClient(actor,transport),listeners=new Set<()=>void>();
  const connection={resolve:vi.fn(async()=>({version:1 as const,actorId:actor})),subscribe:(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};}};
  const panel=(c=client,r=role,on=enabled,conn=connection,auth=authenticated,permisos:string[]=[])=>
    <AuthProvider userEmail={auth?'gestion@example.test':undefined} userRole={r} permisos={permisos} manualOperatorSession={conn}>
      <RundMailReviewInbox client={c} enabled={on}/>
    </AuthProvider>;
  const view=render(panel());return{...view,transport,data,client,connection,listeners,panel};
}
async function load(){click('Consultar desde el inicio');await waitFor(()=>expect(screen.getByRole('button',{name:'Consultar desde el inicio'}).hasAttribute('disabled')).toBe(false));}

describe('Bandeja operativa opcional de revisiones',()=>{
  it('opción ausente no monta controles, resuelve principal o consulta HTTP',()=>{
    const s=setup(false);s.rerender(<AuthProvider userEmail="gestion@example.test" userRole="ADMIN" manualOperatorSession={s.connection}>
      <RundMailReviewInbox client={s.client}/></AuthProvider>);
    expect(screen.queryByRole('region')).toBeNull();expect(s.transport.get).not.toHaveBeenCalled();
    expect(s.connection.resolve).not.toHaveBeenCalled();expect(s.listeners.size).toBe(0);
  });
  it('montaje explícito tampoco consulta ni guarda datos; no muestra UUID privados',async()=>{
    const s=setup();expect(s.transport.get).not.toHaveBeenCalled();await load();expect(s.transport.get).toHaveBeenCalledOnce();
    expect(s.transport.post).not.toHaveBeenCalled();expect(s.connection.resolve).not.toHaveBeenCalled();
    expect(screen.queryByText(review().casoId)).toBeNull();expect(screen.queryByText(review().intencionId)).toBeNull();
    expect(sessionStorage.length).toBe(0);expect(localStorage.length).toBe(0);
  });
  it.each(['DOCENTE','LECTOR'])('rol %s sin manage no consulta',role=>{
    const s=setup(true,role);expect(screen.getByText(/Se requiere una sesión/)).toBeTruthy();expect(screen.queryByRole('button')).toBeNull();expect(s.transport.get).not.toHaveBeenCalled();
  });
  it('ADMIN sin sesión autenticada no consulta',()=>{
    const s=setup(true,'ADMIN',false);expect(screen.queryByRole('button')).toBeNull();expect(s.transport.get).not.toHaveBeenCalled();
  });
  it('manage explícito y roles de gestión permiten consultar sin inferir el principal',async()=>{
    const s=setup(true,'DOCENTE');s.rerender(s.panel(s.client,'DOCENTE',true,s.connection,true,['banco-docentes.rund.manage']));await load();
    expect(s.transport.get).toHaveBeenCalledOnce();expect(s.connection.resolve).not.toHaveBeenCalled();
  });
  it('filtro descarta página y cursor sin HTTP automático, y vuelve a iniciar la consulta',async()=>{
    const s=setup();s.data.rows=rows;s.data.more=true;await load();expect(screen.getByRole('button',{name:'Página siguiente'})).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox',{name:'Asignación'}),{target:{value:'PENDIENTE'}});
    expect(screen.queryByRole('table')).toBeNull();expect(screen.queryByRole('button',{name:'Página siguiente'})).toBeNull();expect(s.transport.get).toHaveBeenCalledOnce();
    await load();expect(s.transport.get.mock.calls[1][1]).toEqual({limite:'25',estado:'PENDIENTE'});
  });
  it('pagina con cursor del último caso y permite volver al inicio sin almacenar páginas',async()=>{
    const s=setup();s.data.rows=rows;s.data.more=true;await load();expect(screen.getAllByRole('row')).toHaveLength(26);
    click('Página siguiente');await screen.findByText(/Casos en esta página: 1\./);
    expect(s.transport.get.mock.calls[1][1]).toEqual({limite:'25',cursor:cursor(rows[24])});expect(screen.queryByRole('button',{name:'Página siguiente'})).toBeNull();
    await load();expect(s.transport.get.mock.calls[2][1]).toEqual({limite:'25'});expect(s.transport.post).not.toHaveBeenCalled();
  });
  it('lista vacía no inventa siguiente página o total general',async()=>{
    const s=setup();s.data.rows=[];await load();expect(screen.getByText('No hay casos para esta consulta.')).toBeTruthy();
    expect(screen.queryByRole('button',{name:'Página siguiente'})).toBeNull();expect(screen.queryByRole('table')).toBeNull();
  });
  it('asignación PENDIENTE y correo ENVIADO no se presentan como cierre confirmado',async()=>{
    const s=setup();s.data.rows=[review('ENVIADO')];await load();expect(screen.getByText(/Incluye historial/)).toBeTruthy();
    expect(screen.getByText('Envío registrado')).toBeTruthy();expect(screen.queryByText(/revisión tiene un cierre registrado/)).toBeNull();
    expect(screen.queryByRole('button',{name:'Cerrar revisión'})).toBeNull();expect(s.transport.post).not.toHaveBeenCalled();
  });
  it('selección descarta lista y exige consulta actual del detalle antes de ofrecer decisiones',async()=>{
    const s=setup();await load();click('Ver gestión del caso 1');expect(screen.queryByRole('table')).toBeNull();expect(s.transport.get).toHaveBeenCalledOnce();
    expect(s.transport.post).not.toHaveBeenCalled();expect(screen.queryByRole('button',{name:'Asumir revisión'})).toBeNull();
    s.transport.get.mockImplementation(async(path:string)=>path.endsWith('/omision')?omission():path.endsWith('/cierre')?closure():review());
    s.transport.post.mockResolvedValue(diagnostic('RESULTADO_INCIERTO',true));click('Consultar gestión del correo');await screen.findByRole('button',{name:'Asumir revisión'});
    expect(s.transport.get.mock.calls[1][0]).toMatch(/\/omision$/);expect(s.transport.post).toHaveBeenCalledOnce();
  });
  it('durante consulta del detalle bloquea filtro e inicio y no duplica acciones',async()=>{
    const s=setup();await load();click('Ver gestión del caso 1');let finish!:(v:unknown)=>void;
    s.transport.get.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));click('Consultar gestión del correo');click('Consultar desde el inicio');
    expect(screen.getByRole('combobox').hasAttribute('disabled')).toBe(true);expect(s.transport.get).toHaveBeenCalledTimes(2);
    await act(async()=>{finish(omission(true));});await screen.findByText(/bienvenida fue omitida/);
    expect(screen.getByRole('button',{name:'Consultar desde el inicio'}).hasAttribute('disabled')).toBe(false);
    s.transport.get.mockResolvedValue({casos:[],siguienteCursor:null});await load();expect(screen.queryByRole('button',{name:'Consultar gestión del correo'})).toBeNull();
  });
  it.each([401,403,503])('fallo %s descarta página y expone solo recuperación explícita',async status=>{
    const s=setup();s.data.rows=rows;s.data.more=true;await load();s.transport.get.mockRejectedValueOnce(Object.assign(Error('PRIVADO'),{status}));click('Página siguiente');
    await screen.findByRole('alert');expect(screen.queryByRole('table')).toBeNull();expect(screen.queryByRole('button',{name:'Página siguiente'})).toBeNull();
    expect(screen.queryByText(/PRIVADO/)).toBeNull();expect(s.transport.get).toHaveBeenCalledTimes(2);await load();expect(s.transport.get.mock.calls[2][1]).toEqual({limite:'25'});
  });
  it('doble clic durante GET no duplica consulta',async()=>{
    const s=setup();let finish!:(v:unknown)=>void;s.transport.get.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    click('Consultar desde el inicio');click('Consultar desde el inicio');expect(s.transport.get).toHaveBeenCalledOnce();
    await act(async()=>{finish({casos:[],siguienteCursor:null});});expect(screen.getByText(/No hay casos/)).toBeTruthy();
  });
  it('notificación de sesión retira página y descarta GET tardío aunque ignore señal',async()=>{
    const s=setup();let finish!:(v:unknown)=>void;s.transport.get.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));click('Consultar desde el inicio');
    act(()=>s.listeners.forEach(fn=>fn()));await act(async()=>{finish({casos:[review()],siguienteCursor:null});});
    expect(screen.getByText(/La sesión cambió/)).toBeTruthy();expect(screen.queryByRole('table')).toBeNull();await expect(s.client.list()).rejects.toThrow();
  });
  it.each(['client','connection'])('cambio de %s retira controles y descarta respuesta tardía',async change=>{
    const s=setup();let finish!:(v:unknown)=>void;s.transport.get.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));click('Consultar desde el inicio');
    s.rerender(s.panel(change==='client'?new RundMailOperationsClient(other,s.transport):s.client,'ADMIN',true,change==='connection'?{...s.connection}:s.connection));
    await act(async()=>{finish({casos:[review()],siguienteCursor:null});});expect(screen.getByText(/La sesión cambió/)).toBeTruthy();expect(screen.queryByRole('table')).toBeNull();
  });
  it.each(['permission','disabled'])('revocación de %s oculta lista y no restaura resultados anteriores',async change=>{
    const s=setup();let finish!:(v:unknown)=>void;s.transport.get.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));click('Consultar desde el inicio');
    s.rerender(s.panel(s.client,change==='permission'?'DOCENTE':'ADMIN',change!=='disabled'));
    await act(async()=>{finish({casos:[review()],siguienteCursor:null});});expect(screen.queryByRole('table')).toBeNull();
    s.rerender(s.panel());expect(screen.queryByRole('table')).toBeNull();await load();expect(s.transport.get).toHaveBeenCalledTimes(2);
  });
  it('desmontaje anula suscripción y descarta respuesta sin iniciar diagnóstico',async()=>{
    const s=setup();let finish!:(v:unknown)=>void;s.transport.get.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));click('Consultar desde el inicio');
    const signal=s.transport.get.mock.calls[0][2].signal;s.unmount();expect(signal.aborted).toBe(true);expect(s.listeners.size).toBe(0);
    await act(async()=>{finish({casos:[review()],siguienteCursor:null});});expect(s.transport.post).not.toHaveBeenCalled();
  });
});
