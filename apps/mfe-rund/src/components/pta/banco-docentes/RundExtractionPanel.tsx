import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, RefreshCw, FileText, Loader2, Bell, Clock3, ChevronDown, AlertTriangle, CheckCircle2, ArrowRight, Eye, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../../../../shell/src/services/api';
import { getAppOnlineStatus } from '../../../../../shell/src/utils/connectivity';
import './RundExtractionPanel.css';

export type RundSuggestion = { id:string; campo:string; label:string; valor:string; valor_previo:string; pagina:number; evidencia:string;
  estado:string; baja_confianza:boolean; valor_confirmado?:string; revisado_en?:string; motivo?:string };
type Props = { docenteId:string; revision:number; activeBlock?:string; activeBlockLabel?:string; activeBlockColor?:string; onConfirmed?:()=>void|Promise<void>; onPendingChange?:(block:string,count:number)=>void; onView:(url:string,name:string,label:string)=>void };
const statuses:Record<string,string> = { PENDIENTE:'En espera',PROCESANDO:'Procesando PDF',COMPLETADO:'Procesado',ERROR:'No se pudo procesar',OBSOLETO:'Documento reemplazado o eliminado' };
const stages = [
  {code:'LEYENDO',label:'Preparar PDF'}, {code:'OCR',label:'Leer texto'},
  {code:'MODELO',label:'Extraer datos'}, {code:'VALIDANDO',label:'Verificar sugerencias'},
];
const comparableValue=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]/g,'').toUpperCase();
const valuesMatch=(suggestion:RundSuggestion)=>Boolean(suggestion.valor_previo)
  && comparableValue(suggestion.valor_previo)===comparableValue(suggestion.valor);
const extractionFieldBlock:Record<string,string> = {
  documentType:'IDENTIDAD',documentNumber:'IDENTIDAD',nombreCompleto:'IDENTIDAD',genero:'IDENTIDAD',sexoBiologico:'IDENTIDAD',fechaNacimiento:'IDENTIDAD',
  pregrado:'FORMACION',especializacion:'FORMACION',maestria:'FORMACION',doctorado:'FORMACION',posDoctorado:'FORMACION',perfilAcademico:'FORMACION',
  actoAdministrativoVinculacion:'VINCULACION',fechaInicioVinculacion:'VINCULACION',fechaFinVinculacion:'VINCULACION',origenVinculacion:'VINCULACION',situacionAdministrativa:'VINCULACION',escalafon:'VINCULACION',
  nucleoTematico:'ACADEMICO',investigacion:'ACADEMICO',ultimaEvaluacion:'ACADEMICO',
};
const extractionSupportBlock:Record<string,string> = {
  documento_identidad:'IDENTIDAD',cedula_extranjeria:'IDENTIDAD',pasaporte:'IDENTIDAD',
  diploma_pregrado:'FORMACION',acta_grado_pregrado:'FORMACION',diploma_especializacion:'FORMACION',acta_grado_especializacion:'FORMACION',diploma_maestria:'FORMACION',acta_grado_maestria:'FORMACION',diploma_doctorado:'FORMACION',acta_grado_doctorado:'FORMACION',certificado_posdoctoral:'FORMACION',hoja_vida_pro:'FORMACION',
  contrato:'VINCULACION',acto_administrativo_vinculacion:'VINCULACION',resolucion_convocatoria:'VINCULACION',acto_administrativo_situacion:'VINCULACION',resolucion_escalafon:'VINCULACION',
  acto_asignacion_nucleo:'ACADEMICO',certificacion_investigacion:'ACADEMICO',acta_evaluacion_desempeno:'ACADEMICO',
};
const extractionCategoryBlock:Record<string,string> = { IDENTIDAD:'IDENTIDAD',TITULOS:'FORMACION',CONTRATOS:'VINCULACION' };
const resourceBelongsToBlock=(resource:any,activeBlock?:string)=>!activeBlock
  || extractionSupportBlock[resource?.tipo_soporte]===activeBlock
  || (!resource?.tipo_soporte&&extractionCategoryBlock[resource?.categoria_codigo]===activeBlock);
const suggestionBelongsToBlock=(suggestion:RundSuggestion,activeBlock?:string)=>!activeBlock||extractionFieldBlock[suggestion.campo]===activeBlock;
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
export function RundExtractionPanel({docenteId,revision,activeBlock,activeBlockLabel,activeBlockColor,onConfirmed,onPendingChange,onView}:Props) {
  const [data,setData]=useState<any>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState<string|null>(null);
  const [reasons,setReasons]=useState<Record<string,string>>({});
  const [discardOpen,setDiscardOpen]=useState<Record<string,boolean>>({});
  const [expanded,setExpanded]=useState(false);
  const actionRef=useRef(false);
  const [refresh,setRefresh]=useState(0);
  const base=`/rund/api/v1/pta/banco-docentes/${docenteId}/extracciones`;
  useEffect(()=>{ setData(null); setReasons({}); setDiscardOpen({}); setExpanded(false); setError(''); },[docenteId]);
  useEffect(()=>{ setDiscardOpen({}); setExpanded(false); },[activeBlock]);
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
    actionRef.current=true;setBusy(key);setExpanded(true);
    try{
      const response=await apiClient.post<any>(`${base}/${path}`,body,{retries:0,skipErrorToast:true});
      if(response?.success===false)throw new Error(response.message);
      const result=response?.data??response;
      if(!result?.queued&&!result?.discarded&&!result?.confirmed)throw new Error('El servidor no confirmó la acción.');
      if(result?.confirmed){
        toast.success(result.changed?'Dato aplicado al perfil':'Coincidencia confirmada');
        await onConfirmed?.();
      }else if(key.startsWith('discard-job')){
        toast.success('Sugerencias rechazadas');
      }else{
        toast.success(key.startsWith('discard')?'Sugerencia rechazada':'Documento en espera de extracción');
      }
      if(key.startsWith('discard'))setDiscardOpen(current=>({...current,[key.replace('discard-','')]:false}));
      setRefresh(n=>n+1);
    }catch(e:any){toast.error(e?.message||'No se pudo registrar la acción.');}
    finally{actionRef.current=false;setBusy(null);}
  };
  const scopedJobs=(data?.jobs||[]).map((job:any)=>({...job,sugerencias:(job.sugerencias||[]).filter((suggestion:RundSuggestion)=>suggestionBelongsToBlock(suggestion,activeBlock))}))
    .filter((job:any)=>job.sugerencias.length>0||resourceBelongsToBlock(job,activeBlock));
  const scopedDocuments=(data?.documents||[]).filter((document:any)=>resourceBelongsToBlock(document,activeBlock));
  const visibleJobs=scopedJobs.filter((job:any,index:number)=>index===0
    || ['PENDIENTE','PROCESANDO','ERROR'].includes(job.estado)
    || job.sugerencias?.some((suggestion:RundSuggestion)=>suggestion.estado==='PENDIENTE'));
  const pendingSuggestions:RundSuggestion[]=visibleJobs.flatMap((job:any)=>job.sugerencias||[]).filter((suggestion:RundSuggestion)=>suggestion.estado==='PENDIENTE');
  const differentCount=pendingSuggestions.filter(suggestion=>!valuesMatch(suggestion)).length;
  const lowConfidenceCount=pendingSuggestions.filter(suggestion=>suggestion.baja_confianza).length;
  const runningJob=visibleJobs.find((job:any)=>['PENDIENTE','PROCESANDO'].includes(job.estado));
  const sectionName=activeBlockLabel||activeBlock;
  const hasScopedContent=visibleJobs.length>0||scopedDocuments.length>0;
  useEffect(()=>{
    if(activeBlock&&data)onPendingChange?.(activeBlock,data.enabled===false?0:pendingSuggestions.length);
  },[activeBlock,data,onPendingChange,pendingSuggestions.length]);
  if(data?.enabled===false)return null;
  const summary=!data&&!error?'Consultando análisis…':error?'No fue posible actualizar el análisis':runningJob?(statuses[runningJob.estado]||'Procesando'):
    pendingSuggestions.length?`${pendingSuggestions.length} ${pendingSuggestions.length===1?'dato':'datos'} por revisar · ${differentCount} ${differentCount===1?'diferencia':'diferencias'}`:
      scopedDocuments.length?`${scopedDocuments.length} ${scopedDocuments.length===1?'documento disponible':'documentos disponibles'}`:
        sectionName?`Sin sugerencias OCR para ${sectionName}`:'Sin sugerencias pendientes';

  return <section className={`rund-extraction ${expanded?'is-expanded':''}`} aria-label="Asistente de captura documental"
    style={{'--rund-extraction-accent':activeBlockColor||'#5b21b6'} as React.CSSProperties}>
    <header className="rund-extraction-shell-heading">
      <div className="rund-extraction-brand"><span className="rund-extraction-brand-icon"><Sparkles size={19}/></span><div>
        <div className="rund-extraction-title"><h3>Asistente de captura</h3><span className="rund-extraction-badge">{sectionName||'IA local'}</span>{sectionName&&<small>IA local</small>}</div>
        <p>{summary}</p>
        {pendingSuggestions.length>0&&<div className="rund-extraction-metrics">
          <span>{pendingSuggestions.length} pendientes</span><span className={differentCount?'is-different':'is-match'}>{differentCount} cambios</span>
          {lowConfidenceCount>0&&<span className="is-low">{lowConfidenceCount} con baja confianza</span>}
        </div>}
      </div></div>
      <div className="rund-extraction-shell-actions">
        <button type="button" className="rund-extraction-icon-button" aria-label="Actualizar sugerencias" disabled={!!busy} onClick={()=>setRefresh(n=>n+1)}><RefreshCw size={15}/></button>
        {(hasScopedContent||error||!data)&&<button type="button" className="rund-extraction-toggle" aria-expanded={expanded} aria-controls={`rund-extraction-body-${docenteId}`} onClick={()=>setExpanded(value=>!value)}>
          {expanded?'Ocultar':'Revisar sugerencias'}<ChevronDown size={16}/>
        </button>}
      </div>
    </header>

    {expanded&&<div className="rund-extraction-body" id={`rund-extraction-body-${docenteId}`}>
      <div className="rund-extraction-guide" aria-label="Cómo revisar las sugerencias">
        <span><b>1</b> Compara</span><span><b>2</b> Verifica la evidencia</span><span><b>3</b> Confirma o rechaza</span>
        <p>La IA propone; ningún dato cambia hasta que una persona lo confirme.</p>
      </div>
      {error&&<p role="alert" className="rund-extraction-warning">{error}</p>}
      {!data&&!error&&<p role="status" className="rund-extraction-loading"><Loader2 size={15} className="rund-extraction-spinner"/> Consultando sugerencias…</p>}
      {scopedDocuments.length>0&&<div className="rund-extraction-documents">{scopedDocuments.map((document:any)=><div key={document.id}>
        <span><FileText size={16}/><span><strong>{document.nombre_archivo}</strong><small>Listo para analizar en segundo plano</small></span></span>
        <button type="button" className="rund-extraction-button rund-extraction-primary" disabled={!!busy} onClick={()=>mutate(document.id,`documentos/${document.id}`,{})}>{busy===document.id?'Solicitando…':'Extraer datos'}</button>
      </div>)}</div>}
      {visibleJobs.map((job:any)=>{
        const pending=(job.sugerencias||[]).filter((suggestion:RundSuggestion)=>suggestion.estado==='PENDIENTE');
        const identityConflict=pending.filter((suggestion:RundSuggestion)=>['documentNumber','nombreCompleto'].includes(suggestion.campo) && suggestion.valor_previo && !valuesMatch(suggestion)).length>=2;
        return <article className="rund-extraction-job" key={job.id}>
          <header className="rund-extraction-job-heading"><div><FileText size={18}/><span><strong>{job.nombre_archivo}</strong><small>Versión {job.version} · {pending.length} campos pendientes</small></span></div><div>
            {job.sugerencias?.length>0&&<button type="button" className="rund-extraction-button" disabled={!!busy} onClick={()=>onView(`/rund/api/v1/pta/banco-docentes/${docenteId}/documentos/${job.documento_id}/contenido`,job.nombre_archivo,'Documento analizado')}><Eye size={14}/> Ver PDF</button>}
            <span className="rund-extraction-badge">{statuses[job.estado]||job.estado}</span>
          </div></header>
          {identityConflict&&<div className="rund-extraction-identity-alert"><AlertTriangle size={18}/><div><strong>Datos principales distintos al perfil</strong><p>El número y el nombre reconocidos son diferentes. Puede tratarse de una corrección válida o de un documento equivocado: verifica el PDF y decide cada propuesta.</p></div><button type="button" className="rund-extraction-button rund-extraction-danger" disabled={!!busy} onClick={()=>mutate(`discard-job-${job.id}`,`trabajos/${job.id}/descartar`,{motivo:'El documento no corresponde al perfil revisado.'})}>{busy===`discard-job-${job.id}`?'Rechazando…':'Rechazar todas'}</button></div>}
          {['PENDIENTE','PROCESANDO'].includes(job.estado)&&<RundExtractionProgress job={job}/>}
          {job.estado==='ERROR'&&<div className="rund-extraction-warning">El servicio local no completó la extracción. Puede seguir usando el documento y reintentar después.
            {job.documento_estado==='ACTIVO'&&<button type="button" className="rund-extraction-button" disabled={!!busy} onClick={()=>mutate(job.id,`documentos/${job.documento_id}`,{})}>Reintentar</button>}</div>}
          {job.estado==='COMPLETADO'&&job.sugerencias.length===0&&<div className="rund-extraction-empty">No se identificaron datos con suficiente evidencia. Puede completar el perfil manualmente.</div>}
          <div className="rund-extraction-list">{job.sugerencias.map((suggestion:RundSuggestion)=>{
            const match=valuesMatch(suggestion);
            const pending=suggestion.estado==='PENDIENTE';
            const stateLabel=pending?(suggestion.baja_confianza?'Revisar con cuidado':match?'Coincide con el perfil':'Cambio detectado'):
              suggestion.estado==='DESCARTADA'?'Descartado':suggestion.estado==='CORREGIDA'?'Corregido y confirmado':'Confirmado';
            return <article className={`rund-extraction-suggestion ${match?'is-match':'is-change'} ${suggestion.baja_confianza?'is-low':''}`} key={suggestion.id}>
              <header><div className="rund-extraction-field-title">{match?<CheckCircle2 size={17}/>:<ArrowRight size={17}/>}<strong>{suggestion.label}</strong></div>
                <span className="rund-extraction-field-state">{stateLabel}</span></header>
              <div className="rund-extraction-values"><div><small>Perfil actual</small><p>{suggestion.valor_previo||'Sin dato registrado'}</p></div>
                <span className="rund-extraction-value-arrow"><ArrowRight size={16}/></span>
                <div className="is-proposed"><small>Documento</small><p>{suggestion.valor}</p></div>
                {suggestion.valor_confirmado&&<div className="is-confirmed"><small>Confirmado</small><p>{suggestion.valor_confirmado}</p></div>}</div>
              <div className="rund-extraction-row-footer">
                <details className="rund-extraction-evidence"><summary>Ver evidencia · pág. {suggestion.pagina}</summary><blockquote>{suggestion.evidencia}</blockquote></details>
                {pending&&<div className="rund-extraction-actions">
                  {job.documento_estado==='ACTIVO'&&job.estado==='COMPLETADO'&&<button type="button" className="rund-extraction-button rund-extraction-primary" disabled={!!busy} onClick={()=>mutate(`confirm-${suggestion.id}`,`sugerencias/${suggestion.id}/confirmar`,{})}>{busy===`confirm-${suggestion.id}`?'Guardando…':match?'Confirmar coincidencia':'Aplicar al perfil'}</button>}
                  <button type="button" className="rund-extraction-button rund-extraction-reject" disabled={!!busy} onClick={()=>setDiscardOpen(current=>({...current,[suggestion.id]:!current[suggestion.id]}))}><XCircle size={15}/> Rechazar sugerencia</button>
                </div>}
              </div>
              {pending&&job.documento_estado!=='ACTIVO'&&<p className="rund-extraction-warning">El documento de origen ya no está vigente. Esta sugerencia no puede aplicarse.</p>}
              {discardOpen[suggestion.id]&&<div className="rund-extraction-discard"><label htmlFor={`discard-${suggestion.id}`}>Motivo del rechazo</label><div><input id={`discard-${suggestion.id}`} aria-label={`Motivo de rechazo de ${suggestion.label}`} value={reasons[suggestion.id]||''} maxLength={1000} placeholder="Explique por qué no corresponde" onChange={event=>setReasons(current=>({...current,[suggestion.id]:event.target.value}))}/>
                <button type="button" className="rund-extraction-button" onClick={()=>setDiscardOpen(current=>({...current,[suggestion.id]:false}))}>Cancelar</button>
                <button type="button" className="rund-extraction-button rund-extraction-danger" disabled={!!busy||(reasons[suggestion.id]||'').trim().length<3} onClick={()=>mutate(`discard-${suggestion.id}`,`sugerencias/${suggestion.id}/descartar`,{motivo:reasons[suggestion.id]})}>Confirmar rechazo</button></div></div>}
              {suggestion.revisado_en&&<p className="rund-extraction-review">Revisado el {new Date(suggestion.revisado_en).toLocaleString('es-CO')}{suggestion.motivo?` · ${suggestion.motivo}`:''}</p>}
            </article>;
          })}</div>
        </article>;
      })}
      {data&&visibleJobs.length===0&&scopedDocuments.length===0&&<div className="rund-extraction-empty">No hay sugerencias OCR para esta sección. La captura manual continúa disponible.</div>}
    </div>}
  </section>;
}
