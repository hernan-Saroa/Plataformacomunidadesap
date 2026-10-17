import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import type { RundMailOperationsClient } from '../../../services/api/rundMailOperationsApi';
import type { MailReview } from '../../../services/api/rundMailOperationsContracts';
import type { MailReviewPage, MailReviewState } from '../../../services/api/rundMailReviewInboxContracts';
import { RundMailOperationsPanel } from './RundMailOperationsPanel';

interface Props { client:RundMailOperationsClient; enabled?:boolean }
const mailLabels={ENVIANDO:'Sin resultado definitivo',INCIERTO:'Resultado incierto',ENVIADO:'Envío registrado'};

/** Entrada opcional para un cliente ligado al principal verificado. No se monta en el banco activo. */
export function RundMailReviewInbox({client,enabled=false}:Props){
  const auth=useAuth(),role=(auth.session?.rol||auth.userRole||'').trim().toUpperCase();
  const allowed=enabled&&auth.isAuthenticated&&(auth.hasPermission('banco-docentes.rund.manage')||['ADMIN','SUPER_ADMIN','GESTION_PROFESORAL'].includes(role));
  const [filter,setFilter]=useState<MailReviewState|null>(null),[page,setPage]=useState<MailReviewPage|null>(null);
  const [selected,setSelected]=useState<MailReview|null>(null),[busy,setBusy]=useState(false),[detailBusy,setDetailBusy]=useState(false);
  const [error,setError]=useState(false),[invalidated,setInvalidated]=useState(false);
  const owner=useRef({client,connection:auth.manualOperatorSession}),stale=useRef(false),mounted=useRef(false);
  const current=useRef({allowed,client});current.current={allowed,client};
  const running=useRef(false),detailRunning=useRef(false),pending=useRef<AbortController|null>(null),generation=useRef(0);
  if(owner.current.client!==client||owner.current.connection!==auth.manualOperatorSession)stale.current=true;
  const onDetailBusy=useCallback((value:boolean)=>{detailRunning.current=value;setDetailBusy(value);},[]);
  useEffect(()=>{
    mounted.current=true;
    const unsubscribe=enabled?auth.manualOperatorSession?.subscribe(()=>{
      stale.current=true;client.invalidate();generation.current++;pending.current?.abort();
      setPage(null);setSelected(null);setError(false);setInvalidated(true);
    }):undefined;
    return()=>{mounted.current=false;generation.current++;pending.current?.abort();unsubscribe?.();};
  },[client,auth.manualOperatorSession,enabled]);
  useEffect(()=>{
    if(!allowed){generation.current++;pending.current?.abort();setPage(null);setSelected(null);setError(false);}
  },[allowed]);
  const valid=()=>mounted.current&&!stale.current&&current.current.allowed&&current.current.client===client;
  async function load(cursor?:string){
    if(!valid()||running.current||detailRunning.current)return;
    running.current=true;setBusy(true);setPage(null);setSelected(null);setError(false);
    const controller=new AbortController(),revision=++generation.current;pending.current=controller;
    try{
      const result=await client.list({limite:25,estado:filter,...(cursor?{cursor}:{})},controller.signal);
      if(valid()&&!controller.signal.aborted&&generation.current===revision)setPage(result);
    }catch{if(valid()&&generation.current===revision)setError(true);}
    finally{if(pending.current===controller)pending.current=null;running.current=false;if(mounted.current)setBusy(false);}
  }
  function changeFilter(value:string){
    if(!valid()||running.current||detailRunning.current)return;
    setFilter(value===''?null:value as MailReviewState);setPage(null);setSelected(null);setError(false);
  }
  function select(row:MailReview){
    if(!valid()||running.current||detailRunning.current)return;
    setSelected(row);setPage(null); // La página es una observación pasada, no autoridad para decidir.
  }
  if(!enabled)return null;
  if(stale.current||invalidated)return <section aria-label="Revisiones de correo"><p>La sesión cambió. Vuelva a abrir la bandeja con su sesión vigente.</p></section>;
  if(!allowed)return <section aria-label="Revisiones de correo"><p>Se requiere una sesión con permiso de gestión del banco docente.</p></section>;
  return <section aria-label="Revisiones de correo" aria-busy={busy||detailBusy}>
    <h2>Revisiones del correo de bienvenida</h2>
    <p>Incluye historial. La asignación y el estado del envío no acreditan el cierre de la revisión ni la recepción del correo.</p>
    <label>Asignación <select aria-label="Asignación" value={filter??''} disabled={busy||detailBusy} onChange={event=>changeFilter(event.target.value)}>
      <option value="">Todas</option><option value="PENDIENTE">Pendiente de asignación</option><option value="EN_REVISION">Asignada</option>
    </select></label>
    <button type="button" disabled={busy||detailBusy} onClick={()=>void load()}>Consultar desde el inicio</button>
    {busy&&<p role="status">Consultando revisiones…</p>}
    {error&&<p role="alert">No fue posible confirmar la lista de revisiones. Consulte de nuevo desde el inicio.</p>}
    {page&&<>
      <p role="status">Casos en esta página: {page.casos.length}. Los datos pueden cambiar; consulte el detalle antes de decidir.</p>
      {page.casos.length===0?<p>No hay casos para esta consulta.</p>:<table>
        <caption>Revisiones consultadas</caption>
        <thead><tr><th scope="col">Creación</th><th scope="col">Asignación</th><th scope="col">Envío</th><th scope="col">Gestión</th></tr></thead>
        <tbody>{page.casos.map((row,index)=><tr key={row.casoId}>
          <td><time dateTime={row.creadaEn}>{new Date(row.creadaEn).toLocaleString('es-CO')}</time></td>
          <td>{row.estado==='PENDIENTE'?'Pendiente de asignación':row.asumidaPor===client.actorId?'Asignada a su cuenta':'Asignada a otra cuenta'}</td>
          <td>{mailLabels[row.estadoCorreo]}</td>
          <td><button type="button" disabled={busy||detailBusy} onClick={()=>select(row)} aria-label={`Ver gestión del caso ${index+1}`}>Ver gestión</button></td>
        </tr>)}</tbody>
      </table>}
      {page.siguienteCursor&&<button type="button" disabled={busy||detailBusy} onClick={()=>void load(page.siguienteCursor!)}>Página siguiente</button>}
    </>}
    {selected&&<>
      <p>Consulte el estado actual del caso seleccionado para gestionar su revisión. Volver a consultar la bandeja descarta este detalle.</p>
      <RundMailOperationsPanel key={selected.casoId} client={client} intencionId={selected.intencionId} onBusyChange={onDetailBusy}/>
    </>}
  </section>;
}
