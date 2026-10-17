/** Solo se ejecuta desde verify-rund-service-integration.cjs sobre HTTP/SQL temporal. */
import { StrictMode } from 'react';
import { act,cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { AuthProvider } from '../../../contexts/AuthContext';
import { RundMailReviewWorkspace } from './RundMailReviewWorkspace';
import { RundManualIdentityClient } from '../../../services/api/rundManualIdentityApi';
import { API_MODE,MICROSERVICE_URLS,getApiGatewayBaseUrl } from '../../../config/environment';
vi.mock('../../../../../shell/src/config/environment',async()=>await import('../../../config/environment'));
import { RundOperatorSession } from '../../../../../shell/src/components/rund/rundOperatorSession';

const nativeFetch=globalThis.fetch,controlUrl=process.env.RUND_MAIL_WORKSPACE_CONTROL_URL!,key=process.env.RUND_MAIL_WORKSPACE_CONTROL_KEY!;
interface Seed {actor:string;person:string;ids:{caseId:string;intention:string}[];position:number;pendingPageIds:string[];cookie:string;viewCookie:string;expiredCookie:string}
const sessions:RundOperatorSession[]=[];
let seed:Seed,cookie:string,calls:{url:URL;method:string;body:unknown;status?:number;cache:RequestCache;credentials:RequestCredentials}[]=[];
async function command(op:string,body:Record<string,unknown>={}){
  const response=await nativeFetch(controlUrl,{method:'POST',headers:{'content-type':'application/json','x-fixture-key':key},body:JSON.stringify({op,...body})});
  if(!response.ok)throw Error('Falló el control de la prueba HTTP');return response.json();
}
async function prepare(options:Record<string,unknown>={}){seed=await command('setup',options);cookie=seed.cookie;}
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}));
function mount(enabled:boolean|undefined=true){
  const session=new RundOperatorSession();session.activate();sessions.push(session);
  const view=render(<StrictMode><AuthProvider userEmail="gestion@example.test" userPersonId={seed.person} userRole="ADMIN" manualOperatorSession={session.connection}>
    <RundMailReviewWorkspace enabled={enabled}/>
  </AuthProvider></StrictMode>);return{...view,session};
}
async function open(){click('Abrir revisiones de correo');await screen.findByRole('button',{name:'Consultar desde el inicio'});}
async function list(){click('Consultar desde el inicio');await screen.findByRole('table');}
async function detail(){await open();await list();
  for(let page=0;page<Math.floor(seed.position/25);page++){
    click('Página siguiente');await waitFor(()=>expect(screen.getByRole('button',{name:'Consultar desde el inicio'}).hasAttribute('disabled')).toBe(false));
  }
  click('Ver gestión del caso '+(seed.position%25+1));click('Consultar gestión del correo');
  await waitFor(()=>expect(screen.getByRole('button',{name:'Consultar gestión del correo'}).hasAttribute('disabled')).toBe(false));}
const posts=(suffix:string)=>calls.filter(c=>c.method==='POST'&&c.url.pathname.endsWith(suffix));
beforeEach(async()=>{
  expect(new URL(controlUrl).hostname).toBe('127.0.0.1');await prepare();calls=[];sessionStorage.clear();localStorage.clear();
  const origins=new Set([MICROSERVICE_URLS.auth,MICROSERVICE_URLS.rund,getApiGatewayBaseUrl()].map(value=>new URL(value).origin));
  vi.stubGlobal('fetch',async(input:string|URL|Request,options:RequestInit={})=>{
    const url=new URL(String(input));expect(url.hostname).toBe('127.0.0.1');expect(origins.has(url.origin)).toBe(true);
    expect(options.credentials).toBe('include');expect(options.cache).toBe('no-store');
    const headers=new Headers(options.headers);expect(headers.has('authorization')).toBe(false);expect(headers.has('x-internal-service-token')).toBe(false);
    headers.set('cookie','esap_access_token='+cookie); // Incorporación que haría el navegador; solo JWT ficticio en memoria.
    const entry={url,method:options.method||'GET',body:options.body,status:undefined as number|undefined,cache:options.cache!,credentials:options.credentials!};calls.push(entry);
    const response=await nativeFetch(url,{...options,headers});entry.status=response.status;
    if(response.ok)expect(response.headers.get('cache-control')).toBe('private, no-store');return response;
  });
});
afterEach(async()=>{cleanup();sessions.splice(0).forEach(s=>s.deactivate());await command('release');await command('verify');vi.unstubAllGlobals();vi.restoreAllMocks();});

describe('Entrada de revisiones contra Auth y RUND por HTTP real',()=>{
  it('opción ausente y montaje habilitado no consultan y no tocan solicitudes almacenadas',async()=>{
    const key='rund:creacion-manual:'+seed.actor;sessionStorage.setItem(key,seed.person);
    const s=mount(false);expect(calls).toHaveLength(0);s.unmount();mount();expect(calls).toHaveLength(0);
    await open();expect(calls).toHaveLength(1);expect(calls[0].url.pathname.endsWith('/me')).toBe(true);
    expect(sessionStorage.getItem(key)).toBe(seed.person);expect(localStorage.length).toBe(0);
  });
  it('resuelve cuenta distinta de persona y conserva rutas, precedencia y asignación durable',async()=>{
    const factory=vi.spyOn(RundManualIdentityClient.prototype,'operacionesCorreo');mount();await detail();
    expect(factory.mock.results[0].value.actorId).toBe(seed.actor);expect(seed.actor).not.toBe(seed.person);
    const paths=calls.map(c=>c.url.pathname);expect(paths[0]).toBe(API_MODE==='direct'?'/me':'/services/auth/api/v1/me');
    expect(paths[1]).toBe((API_MODE==='direct'?'':'/services/rund/api/v1')+'/banco-docentes/identidad/correos/revisiones');
    const firstDetail=paths.findIndex(p=>p.endsWith('/omision'));expect(firstDetail).toBeGreaterThan(1);expect(paths[firstDetail+1].endsWith('/diagnosticar')).toBe(true);
    click('Asumir revisión');await screen.findByText(/asignada a su cuenta/);expect((await command('state')).review.asumida_por).toBe(seed.actor);
    expect(posts('/asumir')).toHaveLength(1);expect(posts('/asumir')[0].body).toBe('{}');
  });
  it('página siguiente usa cursor real ligado a filtro y cambio de filtro exige consulta explícita',async()=>{
    await prepare({many:true});mount();await open();
    fireEvent.change(screen.getByRole('combobox'),{target:{value:'PENDIENTE'}});await list();expect(screen.getAllByRole('row')).toHaveLength(26);
    click('Página siguiente');await waitFor(()=>expect(screen.getByRole('button',{name:'Consultar desde el inicio'}).hasAttribute('disabled')).toBe(false));
    const last=calls[calls.length-1],cursor=last.url.searchParams.get('cursor')!;
    const decoded=JSON.parse(atob(cursor.replace(/-/g,'+').replace(/_/g,'/')));expect(decoded.casoId).toBe(seed.pendingPageIds[24]);expect(decoded.estado).toBe('PENDIENTE');
    expect(last.url.searchParams.get('limite')).toBe('25');const count=calls.length;
    fireEvent.change(screen.getByRole('combobox'),{target:{value:'EN_REVISION'}});expect(calls).toHaveLength(count);expect(screen.queryByRole('table')).toBeNull();
    click('Consultar desde el inicio');await waitFor(()=>expect(calls.length).toBe(count+1));
    await waitFor(()=>expect(screen.getByRole('button',{name:'Consultar desde el inicio'}).hasAttribute('disabled')).toBe(false));
    expect(calls[calls.length-1].url.searchParams.get('estado')).toBe('EN_REVISION');expect(calls[calls.length-1].url.searchParams.has('cursor')).toBe(false);
  });
  it('sesión Auth vencida rechaza apertura sin refresh, listado o suplencia por persona',async()=>{
    cookie=seed.expiredCookie;mount();click('Abrir revisiones de correo');await screen.findByRole('alert');
    expect(calls).toHaveLength(1);expect(calls[0].status).toBe(401);expect(screen.queryByRole('button',{name:'Consultar desde el inicio'})).toBeNull();
  });
  it('permiso view real no permite gestionar aunque la interfaz tenga rol ADMIN',async()=>{
    cookie=seed.viewCookie;mount();await open();click('Consultar desde el inicio');await screen.findByRole('alert');
    expect(calls).toHaveLength(2);expect(calls[1].status).toBe(403);expect(screen.queryByRole('table')).toBeNull();expect(posts('/asumir')).toHaveLength(0);
  });
  it('revocar manage retira lista sin reintentar y recupera por consulta explícita',async()=>{
    mount();await open();await list();await command('grant',{enabled:false});click('Consultar desde el inicio');await screen.findByRole('alert');
    expect(screen.queryByRole('table')).toBeNull();expect(calls[calls.length-1].status).toBe(403);const count=calls.length;
    await command('grant',{enabled:true});await list();expect(calls).toHaveLength(count+1);expect(calls.some(c=>c.url.pathname.endsWith('/refresh'))).toBe(false);
  });
  it('respuesta POST perdida conserva asignación y consulta recupera recibo sin repetirla',async()=>{
    mount();await detail();await command('drop-next');click('Asumir revisión');await screen.findByRole('alert');
    expect((await command('state')).review.asumida_por).toBe(seed.actor);expect(screen.queryByRole('button',{name:'Asumir revisión'})).toBeNull();
    click('Consultar gestión del correo');await screen.findByText(/asignada a su cuenta/);expect(posts('/asumir')).toHaveLength(1);
  });
  it('aceptación permite cierre confirmado con recibo durable sin afirmar entrega final',async()=>{
    await prepare({accepted:true});mount();await detail();expect(screen.getByText(/No acredita recepción o lectura/)).toBeTruthy();
    click('Cerrar revisión');expect(screen.getByRole('button',{name:'Confirmar cierre de revisión'}).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('checkbox'));click('Confirmar cierre de revisión');await screen.findByText(/cierre registrado/);
    expect(posts('/cerrar')).toHaveLength(1);expect(posts('/cerrar')[0].status).toBe(200);
  });
  it('otro responsable impide cerrar aunque exista aceptación y rol visual ADMIN',async()=>{
    await prepare({accepted:true,otherOwner:true});mount();await detail();expect(screen.getByText(/otro responsable/)).toBeTruthy();
    expect(screen.queryByRole('button',{name:'Cerrar revisión'})).toBeNull();expect(screen.queryByRole('button',{name:'Asumir revisión'})).toBeNull();expect(posts('/cerrar')).toHaveLength(0);
  });
  it('notificación mientras Auth responde descarta principal previo y permite nueva apertura',async()=>{
    await command('hold-auth');const s=mount();click('Abrir revisiones de correo');
    await waitFor(async()=>expect((await command('state')).authHeld).toBe(true));act(()=>s.session.invalidate());
    await open();await command('release');expect(screen.queryByRole('alert')).toBeNull();expect(calls.filter(c=>c.url.pathname.endsWith('/me'))).toHaveLength(2);
  });
  it('lista SQL tardía no reaparece tras invalidación de sesión y nueva apertura',async()=>{
    const s=mount();await open();await command('hold-read');click('Consultar desde el inicio');
    await waitFor(async()=>expect((await command('state')).readHeld).toBe(true));act(()=>s.session.invalidate());await open();await command('release');
    await waitFor(()=>expect(calls.filter(c=>c.url.pathname.endsWith('/revisiones'))[0].status).toBe(200));
    expect(screen.queryByRole('table')).toBeNull();expect(screen.queryByRole('alert')).toBeNull();
  });
});
