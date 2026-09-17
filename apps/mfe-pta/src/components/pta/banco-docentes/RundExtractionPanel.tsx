import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, RefreshCw, FileText, Loader2, Bell, Clock3 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../../../../shell/src/services/api';
import { getAppOnlineStatus } from '../../../../../shell/src/utils/connectivity';
import './RundExtractionPanel.css';

export type RundSuggestion = { id:string; campo:string; label:string; valor:string; valor_previo:string; pagina:number; evidencia:string;
  estado:string; baja_confianza:boolean; valor_confirmado?:string; revisado_en?:string; motivo?:string };
type Props = { docenteId:string; revision:number; onUse:(suggestion:RundSuggestion)=>void; onView:(url:string,name:string,label:string)=>void };
const statuses:Record<string,string> = { PENDIENTE:'En espera',PROCESANDO:'Procesando PDF',COMPLETADO:'Procesado',ERROR:'No se pudo procesar',OBSOLETO:'Documento reemplazado o eliminado' };
const stages = [
  {code:'LEYENDO',label:'Preparar PDF'}, {code:'OCR',label:'Leer texto'},
  {code:'MODELO',label:'Extraer datos'}, {code:'VALIDANDO',label:'Verificar sugerencias'},
];
export function RundExtractionProgress({job}:{job:any}) {
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  const started=Date.parse(job.iniciado_en||job.creado_en);
  const seconds=Number.isFinite(started)?Math.max(0,Math.floor((now-started)/1000)):0;
  const waiting=job.estado==='PENDIENTE';
  const index=waiting?-1:stages.findIndex(s=>s.code===job.etapa);
  const label=waiting?(job.intentos>0?'Esperando reintento automático':'En cola para comenzar'):
    index>=0?stages[index].label:'Preparando el análisis';
  return <div className="rund-extraction-progress">
    <div className="rund-extraction-progress-title"><span role="status"><Loader2 size={15} className="rund-extraction-spinner"/> {label}</span>
      <small><Clock3 size={12}/> {Math.floor(seconds/60)} min {String(seconds%60).padStart(2,'0')} s transcurridos</small></div>
    <div className="rund-extraction-track" role="progressbar" aria-label="Etapas del análisis documental"
      aria-valuemin={0} aria-valuemax={4} aria-valuenow={Math.max(0,index)} aria-valuetext={label}>
      {stages.map((s,i)=><span key={s.code} className={i<index?'is-complete':i===index?'is-current':''}/>)}</div>
    <ol className="rund-extraction-steps">{stages.map((s,i)=><li key={s.code} aria-current={i===index?'step':undefined}>{s.label}</li>)}</ol>
    <p className="rund-extraction-background"><Bell size={14}/> Puedes cambiar de módulo o cerrar sesión. El análisis continúa en el servidor y recibirás un aviso en la campanita al finalizar.</p>
    {job.etapa==='MODELO'&&<p className="rund-extraction-timing">El primer análisis puede tardar varios minutos mientras se carga el modelo. La barra indica etapas, no un porcentaje de tiempo.</p>}
    {job.error_codigo==='PROCESAMIENTO_INTERRUMPIDO'&&<p className="rund-extraction-timing">Se está recuperando el análisis después de una interrupción. No necesitas cargar el archivo otra vez.</p>}
  </div>;
}
export function RundExtractionPanel({docenteId,revision,onUse,onView}:Props) {
  const [data,setData]=useState<any>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState<string|null>(null);
  const [reasons,setReasons]=useState<Record<string,string>>({});
  const actionRef=useRef(false);
  const [refresh,setRefresh]=useState(0);
  const base=`/pta/api/v1/pta/banco-docentes/${docenteId}/extracciones`;
  useEffect(()=>{ setData(null); setReasons({}); setError(''); },[docenteId]);
  useEffect(()=>{
    let alive=true, running=false;
    const load=async()=>{
      if(running || document.hidden || !getAppOnlineStatus())return;
      running=true;
      try{
        const raw=await apiClient.get<any>(base,undefined,{cache:'no-store',retries:0,skipErrorToast:true});
        if(raw?.success===false)throw new Error();
        if(alive){setData(raw?.data??raw);setError('');}
      }catch{if(alive)setError('No fue posible consultar las sugerencias. La gestión del perfil sigue disponible.');}
      finally{running=false;}
    };
    void load(); const timer=setInterval(load,10000);
    document.addEventListener('visibilitychange',load); window.addEventListener('online',load);
    return()=>{alive=false;clearInterval(timer);document.removeEventListener('visibilitychange',load);window.removeEventListener('online',load);};
  },[base,revision,refresh]);
  const mutate=async(key:string,path:string,body:any)=>{
    if(actionRef.current)return;
    if(!getAppOnlineStatus()){toast.error('Se necesita conexión para registrar esta acción.');return;}
    actionRef.current=true;setBusy(key);
    try{
      const response=await apiClient.post<any>(`${base}/${path}`,body,{retries:0,skipErrorToast:true});
      if(response?.success===false)throw new Error(response.message);
      const result=response?.data??response;
      if(!result?.queued&&!result?.discarded)throw new Error('El servidor no confirmó la acción.');
      toast.success(key.startsWith('discard')?'Sugerencia descartada':'Documento en espera de extracción');
      setRefresh(n=>n+1);
    }catch(e:any){toast.error(e?.message||'No se pudo registrar la acción.');}
    finally{actionRef.current=false;setBusy(null);}
  };
  if(data?.enabled===false)return null;
  return <section className="rund-extraction" aria-label="Sugerencias de documentos">
    <div className="rund-extraction-heading"><div><h3><Sparkles size={18}/> Asistente de captura <span className="rund-extraction-badge">Experimental</span></h3>
      <p>Los datos extraídos son sugerencias. Revise el PDF y confirme la edición para incorporarlos al perfil.</p></div>
      <button type="button" className="rund-extraction-button" disabled={!!busy} onClick={()=>setRefresh(n=>n+1)}><RefreshCw size={14}/> Actualizar</button></div>
    {error&&<p role="alert" className="rund-extraction-warning">{error}</p>}
    {!data&&!error&&<p role="status">Consultando sugerencias…</p>}
    {data?.documents?.length>0&&<div className="rund-extraction-documents">{data.documents.map((d:any)=><div key={d.id}><span><FileText size={15}/> {d.nombre_archivo}</span>
      <button type="button" className="rund-extraction-button" disabled={!!busy} onClick={()=>mutate(d.id,`documentos/${d.id}`,{})}>{busy===d.id?'Solicitando…':'Extraer sugerencias'}</button></div>)}</div>}
    {data?.jobs?.map((j:any)=><article className="rund-extraction-job" key={j.id}>
      <div className="rund-extraction-heading"><strong>{j.nombre_archivo} · Versión {j.version}</strong><span className="rund-extraction-badge">{statuses[j.estado]||j.estado}</span></div>
      {['PENDIENTE','PROCESANDO'].includes(j.estado)&&<RundExtractionProgress job={j}/>}
      {j.estado==='ERROR'&&<div className="rund-extraction-warning">El servicio local no completó la extracción. Puede seguir usando el documento y reintentar después.
        {j.documento_estado==='ACTIVO'&&<button type="button" className="rund-extraction-button" disabled={!!busy} onClick={()=>mutate(j.id,`documentos/${j.documento_id}`,{})}>Reintentar</button>}</div>}
      {j.estado==='COMPLETADO'&&j.sugerencias.length===0&&<p>No se identificaron campos compatibles con suficiente evidencia. Complete los datos manualmente.</p>}
      {j.sugerencias.map((s:RundSuggestion)=><div className="rund-extraction-suggestion" key={s.id}>
        <div className="rund-extraction-heading"><strong>{s.label}</strong><span className={`rund-extraction-badge ${s.baja_confianza?'rund-extraction-low':''}`}>
          {s.estado==='PENDIENTE'?(s.baja_confianza?'Baja confianza · Sugerido, pendiente de validación':'Sugerido, pendiente de validación'):
            s.estado==='DESCARTADA'?'Descartado':s.estado==='CORREGIDA'?'Corregido y confirmado por una persona':'Confirmado por una persona'}</span></div>
        <div className="rund-extraction-values"><div><small>Dato al extraer</small><p>{s.valor_previo||'Sin dato'}</p></div><div><small>Sugerencia del documento</small><p>{s.valor}</p></div>
          {s.valor_confirmado&&<div><small>Dato confirmado</small><p>{s.valor_confirmado}</p></div>}</div>
        <blockquote>{s.evidencia}<span> Página {s.pagina}</span></blockquote>
        {s.estado==='PENDIENTE'&&j.documento_estado!=='ACTIVO'&&<p className="rund-extraction-warning">El documento de origen ya no está vigente. Esta sugerencia no puede aplicarse al perfil.</p>}
        <div className="rund-extraction-actions"><button type="button" className="rund-extraction-button" disabled={!!busy} onClick={()=>onView(`/pta/api/v1/pta/banco-docentes/${docenteId}/documentos/${j.documento_id}/contenido`,j.nombre_archivo,s.label)}>Ver PDF de origen</button>
          {s.estado==='PENDIENTE'&&<>
            {j.documento_estado==='ACTIVO'&&j.estado==='COMPLETADO'&&<button type="button" className="rund-extraction-button rund-extraction-primary" disabled={!!busy} onClick={()=>onUse(s)}>Revisar y aplicar</button>}
            <input aria-label={`Motivo de descarte de ${s.label}`} value={reasons[s.id]||''} maxLength={1000} placeholder="Motivo del descarte" onChange={e=>setReasons(p=>({...p,[s.id]:e.target.value}))}/>
            <button type="button" className="rund-extraction-button" disabled={!!busy||(reasons[s.id]||'').trim().length<3} onClick={()=>mutate(`discard-${s.id}`,`sugerencias/${s.id}/descartar`,{motivo:reasons[s.id]})}>Descartar</button>
          </>}
        </div>
        {s.revisado_en&&<p className="rund-extraction-review">Revisado el {new Date(s.revisado_en).toLocaleString('es-CO')}{s.motivo?` · ${s.motivo}`:''}</p>}
      </div>)}
    </article>)}
    {data&&data.jobs?.length===0&&data.documents?.length===0&&<p>Los nuevos soportes compatibles se procesarán en segundo plano. La captura manual continúa disponible.</p>}
  </section>;
}
