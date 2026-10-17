import { describe,expect,it,vi } from 'vitest';
vi.mock('./apiClient',()=>({apiClient:{get:vi.fn(),post:vi.fn()}}));
import { RundMailOperationsClient } from './rundMailOperationsApi';
import { mailReviewCursor,mailReviewPage,mailReviewQuery } from './rundMailReviewInboxContracts';
import { actor,caseId,other,review } from './rundMailOperations.fixtures';
const base='/rund/api/v1/banco-docentes/identidad/correos/revisiones';
const encode=(value:unknown)=>btoa(JSON.stringify(value)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const cursor=(row=review(),estado:unknown=null)=>encode({version:1,creadaEn:row.creadaEn,casoId:row.casoId,estado});
const query=mailReviewQuery({limite:1});
const page=()=>({casos:[review()],siguienteCursor:cursor()});
const setup=()=>{const transport={get:vi.fn(),post:vi.fn()};return{transport,client:new RundMailOperationsClient(actor,transport)};};

describe('Bandeja de revisiones: contrato del propietario',()=>{
  it('conserva microsegundos y copia cada DTO sin ampliar el contrato',()=>{
    const raw=page(),result=mailReviewPage(raw,query);expect(result).toEqual(raw);expect(result.casos[0]).not.toBe(raw.casos[0]);
    expect(mailReviewCursor(result.siguienteCursor,null).creadaEn).toBe('2026-10-16T12:00:00.123456Z');
  });
  it('acepta página vacía y última página parcial solo sin cursor siguiente',()=>{
    expect(mailReviewPage({casos:[],siguienteCursor:null},query).casos).toEqual([]);
    expect(mailReviewPage({...page(),siguienteCursor:null},mailReviewQuery())).toEqual({...page(),siguienteCursor:null});
  });
  it.each([0,-1,101,1.5,NaN,Infinity,'25',null])('rechaza límite %s sin HTTP',async limite=>{
    const s=setup();await expect(s.client.list({limite}as any)).rejects.toThrow('No fue posible confirmar');expect(s.transport.get).not.toHaveBeenCalled();
  });
  it.each([null,[],{actorId:actor},{estado:'CERRADA'},{cursor:''},{cursor:'abc='},{cursor:'a'.repeat(513)}])('rechaza consulta inválida %j sin HTTP',async q=>{
    const s=setup();await expect(s.client.list(q as any)).rejects.toThrow();expect(s.transport.get).not.toHaveBeenCalled();
  });
  it.each([
    {version:2},{estado:'EN_REVISION'},{casoId:'ajeno'},{creadaEn:'2026-02-30T12:00:00.123456Z'},
    {creadaEn:'2026-10-16T12:00:00.123Z'},{creadaEn:'2026-10-16T12:00:00.123456+00:00'},{email:'privado@example.test'},
  ])('rechaza cursor ajeno al contrato %j',patch=>{
    expect(()=>mailReviewCursor(encode({version:1,creadaEn:review().creadaEn,casoId:caseId,estado:null,...patch}),null)).toThrow();
  });
  it.each([
    (v:any)=>{v.extra='privado';},(v:any)=>{delete v.siguienteCursor;},(v:any)=>{v.casos[0].email='privado';},
    (v:any)=>{v.casos[0].intencionId='invalido';},(v:any)=>{v.casos[0].asumidaPor=actor;},
    (v:any)=>{v.casos.push(review());},(v:any)=>{v.siguienteCursor=undefined;},
    (v:any)=>{v.siguienteCursor=cursor({...review(),casoId:other});},
    (v:any)=>{v.siguienteCursor=cursor({...review(),creadaEn:'2026-10-16T12:00:00.123457Z'});},
    (v:any)=>{v.casos=[];},
  ])('rechaza página parcial, privada, excesiva o cursor que no representa el último caso (%#)',modify=>{
    const v=page();modify(v);expect(()=>mailReviewPage(v,query)).toThrow();
  });
  it('rechaza siguiente cursor en página incompleta y filtro incompatible',()=>{
    expect(()=>mailReviewPage(page(),mailReviewQuery({limite:2}))).toThrow();
    expect(()=>mailReviewPage({...page(),siguienteCursor:null},mailReviewQuery({estado:'EN_REVISION'}))).toThrow();
  });
  it('ordena por microsegundos antes de UUID y permite empate temporal con UUID ascendente',()=>{
    const first=review(),second={...review(),casoId:other,intencionId:other};
    const q=mailReviewQuery({limite:2});
    expect(mailReviewPage({casos:[first,second],siguienteCursor:null},q).casos).toHaveLength(2);
    const micros={...first,creadaEn:'2026-10-16T12:00:00.123457Z',intencionId:actor};
    expect(mailReviewPage({casos:[second,micros],siguienteCursor:null},q).casos).toHaveLength(2);
    expect(()=>mailReviewPage({casos:[second,first],siguienteCursor:null},q)).toThrow();
    expect(()=>mailReviewPage({casos:[micros,second],siguienteCursor:null},q)).toThrow();
  });
  it('rechaza duplicados de caso o intención aun con fechas distintas',()=>{
    const q=mailReviewQuery({limite:2}),first=review(),second={...review(),creadaEn:'2026-10-16T12:00:01.123456Z'};
    expect(()=>mailReviewPage({casos:[first,{...second,intencionId:other}],siguienteCursor:null},q)).toThrow();
    expect(()=>mailReviewPage({casos:[first,{...second,casoId:other}],siguienteCursor:null},q)).toThrow();
  });
  it('rechaza repetir o retroceder respecto al cursor de entrada',()=>{
    const q=mailReviewQuery({cursor:cursor(),limite:1});expect(()=>mailReviewPage(page(),q)).toThrow();
    const newer={...review(),creadaEn:'2026-10-16T12:00:00.123457Z'};
    expect(mailReviewPage({casos:[newer],siguienteCursor:null},q).casos[0]).toEqual(newer);
  });
});

describe('Cliente opcional de bandeja',()=>{
  it('solo GET a ruta fija, límite textual y sin reintento, refresh, caché o mensajes privados',async()=>{
    const s=setup();s.transport.get.mockResolvedValue({casos:[],siguienteCursor:null});await s.client.list();
    expect(s.transport.get).toHaveBeenCalledOnce();expect(s.transport.get).toHaveBeenCalledWith(base,{limite:'25'},
      {retries:0,skipAuthRefresh:true,skipErrorLog:true,skipErrorToast:true,cache:'no-store',signal:undefined});
    expect(s.transport.post).not.toHaveBeenCalled();
  });
  it('envía filtro y cursor ligados entre sí sin incluir actor o datos de la cuenta',async()=>{
    const s=setup(),c=cursor(review(),'PENDIENTE');s.transport.get.mockResolvedValue({casos:[],siguienteCursor:null});
    await s.client.list({estado:'PENDIENTE',limite:100,cursor:c});
    expect(s.transport.get.mock.calls[0][1]).toEqual({limite:'100',estado:'PENDIENTE',cursor:c});expect(s.transport.post).not.toHaveBeenCalled();
  });
  it.each([401,403,409,503])('fallo %s no reintenta ni filtra el error del transporte',async status=>{
    const s=setup();s.transport.get.mockRejectedValue(Object.assign(Error('DATOS PRIVADOS'),{status}));
    await expect(s.client.list()).rejects.toThrow('No fue posible confirmar la gestión del correo RUND.');expect(s.transport.get).toHaveBeenCalledOnce();
  });
  it.each(['abort','invalidate'])('descarta respuesta tardía con %s aunque transporte ignore signal',async how=>{
    const s=setup(),controller=new AbortController();let finish!:(v:unknown)=>void;
    s.transport.get.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));const response=s.client.list({},controller.signal);
    if(how==='abort')controller.abort();else s.client.invalidate();finish({casos:[],siguienteCursor:null});
    await expect(response).rejects.toThrow();await expect(s.client.list({},controller.signal)).rejects.toThrow();expect(s.transport.get).toHaveBeenCalledOnce();
  });
  it('no publica una página con campos privados aunque el GET termine correctamente',async()=>{
    const s=setup();s.transport.get.mockResolvedValue({...page(),credential:'PRIVADO'});await expect(s.client.list()).rejects.toThrow();
    expect(s.transport.post).not.toHaveBeenCalled();
  });
});
