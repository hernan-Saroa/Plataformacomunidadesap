import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import type { RundMailOperationsClient } from '../../../services/api/rundMailOperationsApi';
import type { Diagnosis, MailOperationsSnapshot, ValidityReason } from '../../../services/api/rundMailOperationsContracts';

interface Props { client:RundMailOperationsClient; intencionId:string; disabled?:boolean; onBusyChange?:(busy:boolean)=>void }
type Decision='omit'|'close';
const messages:Record<Diagnosis,string>={
  VIGENCIA_CONFIRMADA_AL_CONSULTAR:'La cuenta conserva las condiciones iniciales en esta consulta.',
  VIGENCIA_RECHAZADA:'La bienvenida requiere revisar las condiciones de la cuenta.',
  VIGENCIA_NO_CONFIRMADA:'No se pudo comprobar la vigencia de la cuenta. Consulte nuevamente cuando el servicio esté disponible.',
  SIN_RESULTADO_OBSERVADO:'El envío no tiene un resultado registrado y puede seguir en curso.',
  RESULTADO_INCIERTO:'El resultado del envío es incierto y requiere revisión.',
  INCERTIDUMBRE_PENDIENTE_CONCILIAR:'Existe un resultado incierto pendiente de conciliación antes de iniciar su revisión.',
  ACEPTACION_PENDIENTE_CONCILIAR:'Existe una aceptación pendiente de conciliación antes de revisar su cierre.',
  ACEPTACION_REGISTRADA:'Hay aceptación registrada del envío. No acredita recepción o lectura del destinatario.',
  ENVIADO_SIN_RESULTADO_REGISTRADO:'El envío histórico no conserva un resultado registrado. Requiere revisión operativa.',
};
const reasons:Record<ValidityReason,string>={
  OPERACION_NO_ELEGIBLE:'La operación de identidad ya no cumple las condiciones de la bienvenida.',
  IDENTIDAD_NO_VIGENTE:'Los datos de identidad cambiaron desde la creación.',
  CREDENCIALES_NO_VIGENTES:'Las credenciales iniciales ya no cumplen las condiciones de la bienvenida.',
};

/** Vista opcional por intención. Solo acciones explícitas; sin consultas al montar o polling. */
export function RundMailOperationsPanel({client,intencionId,disabled=false,onBusyChange}:Props){
  const auth=useAuth(),role=(auth.session?.rol||auth.userRole||'').trim().toUpperCase();
  const allowed=auth.isAuthenticated&&(auth.hasPermission('banco-docentes.rund.manage')||['ADMIN','SUPER_ADMIN','GESTION_PROFESORAL'].includes(role));
  const [snapshot,setSnapshot]=useState<MailOperationsSnapshot|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
  const [decision,setDecision]=useState<Decision|null>(null),[confirmed,setConfirmed]=useState(false),[invalidated,setInvalidated]=useState(false);
  const owner=useRef({client,intencionId,connection:auth.manualOperatorSession}),mounted=useRef(false),running=useRef(false),stale=useRef(false);
  const current=useRef({client,intencionId,allowed});current.current={client,intencionId,allowed:allowed&&!disabled};
  const pending=useRef<AbortController|null>(null),generation=useRef(0);
  const busyListener=useRef(onBusyChange);busyListener.current=onBusyChange;
  if(owner.current.client!==client||owner.current.intencionId!==intencionId||owner.current.connection!==auth.manualOperatorSession)stale.current=true;
  useEffect(()=>{
    mounted.current=true;
    const unsubscribe=auth.manualOperatorSession?.subscribe(()=>{
      stale.current=true;client.invalidate();generation.current++;pending.current?.abort();setSnapshot(null);setDecision(null);setConfirmed(false);setInvalidated(true);
    });
    return()=>{mounted.current=false;generation.current++;pending.current?.abort();unsubscribe?.();busyListener.current?.(false);};
  },[client,intencionId,auth.manualOperatorSession]);
  useEffect(()=>{
    if(!allowed||disabled){generation.current++;pending.current?.abort();setSnapshot(null);setDecision(null);setConfirmed(false);setError(null);}
  },[allowed,disabled]);
  const valid=()=>mounted.current&&!stale.current&&current.current.allowed&&current.current.client===client&&current.current.intencionId===intencionId;
  async function run(work:(signal:AbortSignal)=>Promise<void>){
    if(running.current||!valid())return;
    running.current=true;setBusy(true);busyListener.current?.(true);setError(null);setSnapshot(null);setDecision(null);setConfirmed(false);
    const controller=new AbortController(),revision=++generation.current;pending.current=controller;
    try{await work(controller.signal);}catch{
      if(valid()&&generation.current===revision)setError('No se pudo confirmar la gestión del correo. Consulte su estado antes de repetir una decisión.');
    }finally{
      if(pending.current===controller)pending.current=null;running.current=false;
      busyListener.current?.(false);
      if(mounted.current)setBusy(false);
    }
  }
  async function load(signal:AbortSignal){
    const state=await client.inspect(intencionId,signal);
    if(valid()&&!signal.aborted)setSnapshot(state);
  }
  const diagnostic=snapshot?.diagnostico,review=snapshot?.revision,closure=snapshot?.cierre;
  const canOmit=diagnostic?.diagnostico==='VIGENCIA_RECHAZADA'&&!snapshot?.omision.omitida;
  const canOpen=diagnostic&&!review&&['REGISTRAR_REVISION','REVISION_OPERATIVA'].includes(diagnostic.siguientePaso);
  const canAssign=review?.estado==='PENDIENTE'&&review.estadoCorreo!=='ENVIADO'&&!closure?.cerrada;
  const canClose=diagnostic?.diagnostico==='ACEPTACION_REGISTRADA'&&review&&!closure?.cerrada
    &&(review.estado==='PENDIENTE'||review.asumidaPor===client.actorId);
  function choose(value:Decision){if(!busy&&valid()&&(value==='omit'?canOmit:canClose)){setDecision(value);setConfirmed(false);}}
  function decide(){
    if(!confirmed||!decision||!valid()||!(decision==='omit'?canOmit:canClose))return;
    const chosen=decision,caseId=review?.casoId;
    void run(async signal=>{
      if(chosen==='omit')await client.omit(intencionId,signal);
      else if(caseId)await client.close(intencionId,caseId,signal);
      else throw new Error();
      await load(signal);
    });
  }
  if(stale.current||invalidated)return <section aria-label="Gestión del correo"><p>La sesión o el registro cambió. Vuelva a abrir la gestión con su sesión vigente.</p></section>;
  if(!allowed)return <section aria-label="Gestión del correo"><p>Se requiere una sesión con permiso de gestión del banco docente.</p></section>;
  if(disabled)return <section aria-label="Gestión del correo"><p>Espere a que termine la operación del registro para gestionar su correo.</p></section>;
  return <section aria-label="Gestión del correo" aria-busy={busy}>
    <h3>Gestión del correo de bienvenida</h3>
    <button type="button" disabled={busy} onClick={()=>void run(load)}>Consultar gestión del correo</button>
    {busy&&<p role="status">Consultando el estado de la gestión…</p>}
    {error&&<p role="alert">{error}</p>}
    {snapshot?.omision.omitida&&<p>La bienvenida fue omitida y su envío está bloqueado. La cuenta conserva su estado; la recuperación de acceso se gestiona por separado.</p>}
    {diagnostic&&<p role="status">{messages[diagnostic.diagnostico]}</p>}
    {diagnostic?.motivoVigencia&&<p>{reasons[diagnostic.motivoVigencia]}</p>}
    {closure?.cerrada&&<p>La revisión tiene un cierre registrado por la aceptación del envío.</p>}
    {review&&!closure?.cerrada&&<p>{review.estado==='PENDIENTE'?'La revisión está pendiente de asignación.'
      :review.asumidaPor===client.actorId?'La revisión está asignada a su cuenta.':'Esta revisión ya tiene otro responsable.'}</p>}
    {canOpen&&!decision&&<button type="button" disabled={busy} onClick={()=>void run(async signal=>{
      await client.open(intencionId,diagnostic.siguientePaso==='REVISION_OPERATIVA',signal);await load(signal);
    })}>Registrar revisión</button>}
    {canAssign&&!decision&&<button type="button" disabled={busy} onClick={()=>void run(async signal=>{
      await client.assign(intencionId,review.casoId,signal);await load(signal);
    })}>Asumir revisión</button>}
    {canOmit&&!decision&&<button type="button" disabled={busy} onClick={()=>choose('omit')}>Omitir bienvenida</button>}
    {canClose&&!decision&&<button type="button" disabled={busy} onClick={()=>choose('close')}>Cerrar revisión</button>}
    {decision&&<div role="group" aria-label="Confirmación de decisión de correo">
      <p>{decision==='omit'?'Esta decisión impedirá enviar esta bienvenida. No modifica la cuenta ni recupera el acceso.'
        :'Se registrará el cierre de la revisión por la aceptación observada. No acredita recepción o lectura.'}</p>
      <label><input type="checkbox" checked={confirmed} disabled={busy} onChange={event=>setConfirmed(event.target.checked)}/> He revisado esta decisión</label>
      <button type="button" disabled={busy||!confirmed} onClick={decide}>{decision==='omit'?'Confirmar omisión':'Confirmar cierre de revisión'}</button>
      <button type="button" disabled={busy} onClick={()=>{setDecision(null);setConfirmed(false);}}>Cancelar decisión</button>
    </div>}
  </section>;
}
