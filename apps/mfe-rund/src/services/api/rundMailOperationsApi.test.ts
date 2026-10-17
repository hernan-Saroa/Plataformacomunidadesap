import { describe, expect, it, vi } from 'vitest';
vi.mock('./apiClient',()=>({apiClient:{get:vi.fn(),post:vi.fn()}}));
import { RundMailOperationsClient } from './rundMailOperationsApi';
import { mailDiagnostic, mailOmission, mailReview, mailReviewClosure, type Diagnosis } from './rundMailOperationsContracts';
import { actor,intention,caseId,other,omission,diagnostic,review,closure } from './rundMailOperations.fixtures';
const base='/rund/api/v1/banco-docentes/identidad/correos/revisiones';
function setup(){const transport={get:vi.fn(),post:vi.fn()};return{transport,client:new RundMailOperationsClient(actor,transport)};}
describe('Contratos operativos de correo',()=>{
  it.each(['VIGENCIA_CONFIRMADA_AL_CONSULTAR','VIGENCIA_RECHAZADA','VIGENCIA_NO_CONFIRMADA','SIN_RESULTADO_OBSERVADO','RESULTADO_INCIERTO',
    'INCERTIDUMBRE_PENDIENTE_CONCILIAR','ACEPTACION_PENDIENTE_CONCILIAR','ACEPTACION_REGISTRADA','ENVIADO_SIN_RESULTADO_REGISTRADO']as Diagnosis[])('acepta diagnóstico %s sin cambiar semántica',kind=>{
    const d=diagnostic(kind);expect(mailDiagnostic(d,intention)).toEqual(d);
  });
  it.each([{version:2},{intencionId:other},{permiteReenvio:true},{extra:'PRIVADO'},{casoId:'no'},{estadoCorreo:'ENVIADO'},
    {motivoVigencia:'CREDENCIALES_NO_VIGENTES'},{siguientePaso:'ENVIAR'},{requiereIntervencion:false},{cierreRegistrado:true}])('rechaza diagnóstico incoherente %j',patch=>{
    expect(()=>mailDiagnostic({...diagnostic(),...patch},intention)).toThrow('No fue posible confirmar');
  });
  it.each(['intencion','booleano','responsable','fecha','motivo','extra'])('omisión incoherente %s no bloquea falsamente ni habilita acciones',kind=>{
    const o:any=omission(true);if(kind==='intencion')o.intencionId=other;if(kind==='booleano')o.envioBloqueado=false;
    if(kind==='responsable')o.omitidaPor=null;if(kind==='fecha')o.omitidaEn='2026-02-31T00:00:00.123456Z';
    if(kind==='motivo')o.motivo='FALLO_SMTP';if(kind==='extra')o.documento='FICTICIO';expect(()=>mailOmission(o,intention)).toThrow();
  });
  it('caso y cierre exigen IDs, fechas, coherencia y campos exactos',()=>{
    expect(mailReview(review(),intention,caseId)).toEqual(review());expect(mailReviewClosure(closure(true),intention,caseId)).toEqual(closure(true));
    for(const patch of [{casoId:other},{intencionId:other},{asumidaPor:actor},{requiereRevision:false},{creadaEn:'no'},{contexto:{}}])expect(()=>mailReview({...review(),...patch},intention,caseId)).toThrow();
    for(const patch of [{casoId:other},{intencionId:other},{cerradaPor:null},{motivo:null},{cerradaEn:'no'},{contexto:{}}])expect(()=>mailReviewClosure({...closure(true),...patch},intention,caseId)).toThrow();
    expect(()=>mailReview({...review('INCIERTO',actor),asumidaEn:'2026-10-16T11:00:00.123456Z'},intention,caseId)).toThrow();
    expect(()=>mailReviewClosure({...closure(),cerradaPor:actor},intention,caseId)).toThrow();
  });
});
describe('Cliente opcional sin envío, retries o almacenamiento',()=>{
  it('construcción/fábrica no hace HTTP y actor inválido o ID inválido no consulta',async()=>{
    const s=setup();expect(s.transport.get).not.toHaveBeenCalled();expect(()=>new RundMailOperationsClient('persona')).toThrow();
    await expect(s.client.inspect('no')).rejects.toThrow();await expect(s.client.close(intention,'no')).rejects.toThrow();expect(s.transport.post).not.toHaveBeenCalled();
  });
  it('lee omisión primero y un bloqueo evita incluso POST de diagnóstico',async()=>{
    const s=setup();s.transport.get.mockResolvedValue(omission(true));expect(await s.client.inspect(intention)).toEqual({omision:omission(true),diagnostico:null,revision:null,cierre:null});
    expect(s.transport.get).toHaveBeenCalledWith(`${base}/por-intencion/${intention}/omision`,undefined,expect.objectContaining({retries:0,skipAuthRefresh:true,skipErrorLog:true,skipErrorToast:true,cache:'no-store'}));
    expect(s.transport.post).not.toHaveBeenCalled();
  });
  it('no ignora fallo de omisión para mostrar otro diagnóstico',async()=>{
    const s=setup();s.transport.get.mockRejectedValue(Error('SQL PRIVADO'));await expect(s.client.inspect(intention)).rejects.toThrow('No fue posible confirmar');expect(s.transport.post).not.toHaveBeenCalled();
  });
  it('consulta caso y cierre del ID exacto con cuerpo vacío y sin principal en el body',async()=>{
    const s=setup();s.transport.get.mockResolvedValueOnce(omission()).mockResolvedValueOnce(review()).mockResolvedValueOnce(closure());s.transport.post.mockResolvedValue(diagnostic('RESULTADO_INCIERTO',true));
    const result=await s.client.inspect(intention);expect(result.revision?.casoId).toBe(caseId);expect(s.transport.get.mock.calls.map(c=>c[0])).toEqual([`${base}/por-intencion/${intention}/omision`,`${base}/${caseId}`,`${base}/${caseId}/cierre`]);
    expect(s.transport.post).toHaveBeenCalledWith(`${base}/por-intencion/${intention}/diagnosticar`,{},expect.objectContaining({retries:0,cache:'no-store'}));
  });
  it.each(['otro-caso','otro-estado','otro-cierre'])('lecturas concurrentes incoherentes %s requieren nueva consulta',async kind=>{
    const s=setup();s.transport.get.mockResolvedValueOnce(omission()).mockResolvedValueOnce(kind==='otro-caso'?{...review(),casoId:other}:kind==='otro-estado'?review('ENVIADO'):review())
      .mockResolvedValueOnce(kind==='otro-cierre'?closure(true):closure());s.transport.post.mockResolvedValue(diagnostic('RESULTADO_INCIERTO',true));await expect(s.client.inspect(intention)).rejects.toThrow();
  });
  it('las cuatro acciones usan rutas fijas y nunca envían datos de actor, resultado o credenciales',async()=>{
    const s=setup();s.transport.post.mockResolvedValueOnce(review()).mockResolvedValueOnce(review()).mockResolvedValueOnce(review('INCIERTO',actor)).mockResolvedValueOnce(closure(true)).mockResolvedValueOnce(omission(true));
    await s.client.open(intention,false);await s.client.open(intention,true);await s.client.assign(intention,caseId);await s.client.close(intention,caseId);await s.client.omit(intention);
    expect(s.transport.post.mock.calls.map(c=>c[0])).toEqual([`${base}/por-intencion/${intention}`,`${base}/por-intencion/${intention}/revisar-resultado-incierto`,`${base}/${caseId}/asumir`,`${base}/${caseId}/cerrar`,`${base}/por-intencion/${intention}/omitir-por-vigencia`]);
    s.transport.post.mock.calls.forEach(c=>{expect(c[1]).toEqual({});expect(c[2]).toMatchObject({retries:0,skipAuthRefresh:true,skipErrorLog:true,skipErrorToast:true,cache:'no-store'});});
    expect(sessionStorage.length).toBe(0);
  });
  it.each(['otro-responsable','fecha-anterior'])('cierre incompatible %s no se presenta como resuelto',async kind=>{
    const s=setup();s.transport.get.mockResolvedValueOnce(omission()).mockResolvedValueOnce(review('ENVIADO',actor))
      .mockResolvedValueOnce(kind==='otro-responsable'?closure(true,other):{...closure(true),cerradaEn:'2026-10-16T11:00:00.123456Z'});
    s.transport.post.mockResolvedValueOnce(diagnostic('ACEPTACION_REGISTRADA',true,true));await expect(s.client.inspect(intention)).rejects.toThrow();
  });
  it.each(['omitir','asumir','cerrar'])('respuesta atribuida a otra cuenta no confirma %s',async action=>{
    const s=setup();s.transport.post.mockResolvedValue(action==='omitir'?omission(true,other):action==='asumir'?review('INCIERTO',other):closure(true,other));
    await expect(action==='omitir'?s.client.omit(intention):action==='asumir'?s.client.assign(intention,caseId):s.client.close(intention,caseId)).rejects.toThrow();
  });
  it('doble mutación y lectura mientras se decide no duplican HTTP',async()=>{
    const s=setup();let finish!:(v:unknown)=>void;s.transport.post.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    const pending=s.client.omit(intention);await expect(s.client.omit(intention)).rejects.toThrow();await expect(s.client.inspect(intention)).rejects.toThrow();expect(s.transport.post).toHaveBeenCalledOnce();finish(omission(true));await pending;
  });
  it('respuesta perdida no reintenta POST y la consulta posterior recupera una omisión confirmada',async()=>{
    const s=setup();s.transport.post.mockRejectedValueOnce(Error('DETALLE PRIVADO'));await expect(s.client.omit(intention)).rejects.toThrow('No fue posible confirmar');
    s.transport.get.mockResolvedValueOnce(omission(true));expect((await s.client.inspect(intention)).omision.omitida).toBe(true);expect(s.transport.post).toHaveBeenCalledOnce();
  });
  it('cancelación o invalidación descarta respuesta tardía incluso si el transporte ignora AbortSignal',async()=>{
    const s=setup(),controller=new AbortController();let finish!:(v:unknown)=>void;
    s.transport.get.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));const pending=s.client.inspect(intention,controller.signal);controller.abort();finish(omission(true));await expect(pending).rejects.toThrow();expect(s.transport.post).not.toHaveBeenCalled();
    s.client.invalidate();await expect(s.client.open(intention,false)).rejects.toThrow();expect(s.transport.post).not.toHaveBeenCalled();
  });
});
