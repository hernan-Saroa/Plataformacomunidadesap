import React, { useEffect, useId, useRef, useState } from 'react';
import { Sparkles, RefreshCw, FileText, Loader2, Bell, Clock3, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, ArrowRight, Eye, XCircle, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../../../../shell/src/services/api';
import { getAppOnlineStatus } from '../../../../../shell/src/utils/connectivity';
import { rundDocumentBlock } from '../../../utils/rundDocumentScope';
import './RundExtractionPanel.css';

export type RundSuggestion = { id:string; campo:string; label:string; valor:string; valor_previo:string; pagina:number; evidencia:string;
  estado:string; baja_confianza:boolean; valor_confirmado?:string; revisado_en?:string; motivo?:string;
  /** The profile row changed after this analysis (another evidence or an edit was applied). */
  desactualizada?:boolean;
  /** The source document does not accredit this row; it can only be rejected. */
  fuera_de_alcance?:boolean;
  /** Server rechecks old and new analyses before allowing an OCR value to be applied. */
  lectura_no_confiable?:string|null; lectura_visual?:boolean };
const MAX_BATCH=20;
const moveItem=(items:string[],index:number,offset:number)=>{
  const target=index+offset;
  if(target<0||target>=items.length)return items;
  const next=[...items];[next[index],next[target]]=[next[target],next[index]];return next;
};

/** Current evidences ready to analyze: pick several and set the order in which they are processed. */
function ExtractionDocumentSelection({documents,canEdit,automatico,busy,onSingle,onBatch}:{documents:any[];canEdit:boolean;automatico?:boolean;busy:string|null;
  onSingle:(document:any)=>void;onBatch:(ids:string[],key:'batch'|'batch-all')=>void}) {
  const [selected,setSelected]=useState<string[]>([]);
  const available=documents.map(document=>document.id).join('|');
  useEffect(()=>{setSelected(current=>current.filter(id=>documents.some(document=>document.id===id)));},[available]);
  const several=canEdit&&documents.length>1;
  const ordered=[...selected.map(id=>documents.find(document=>document.id===id)).filter(Boolean),...documents.filter(document=>!selected.includes(document.id))];
  const toggle=(id:string)=>setSelected(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
  return <div className="rund-extraction-documents">
    {several&&<div className="rund-extraction-selection-heading">
      <div><strong><Layers size={15}/> Evidencias listas para analizar</strong>
        <small>Marca los archivos y ordénalos con las flechas antes de iniciar. Máximo {MAX_BATCH} por solicitud. {automatico ? 'La carga automática está activa; los trabajos que ya iniciaron continuarán.' : 'Los archivos nuevos esperan tu elección: cargarlos no inicia el OCR.'}</small></div>
      <div className="rund-extraction-selection-actions">
        <button type="button" className="rund-extraction-button" disabled={!!busy} onClick={()=>setSelected(selected.length===documents.length?[]:documents.map(document=>document.id))}>
          {selected.length===documents.length?'Quitar selección':'Seleccionar todas'}</button>
        <button type="button" className="rund-extraction-button" disabled={!!busy||documents.length>MAX_BATCH} title={documents.length>MAX_BATCH?`Máximo ${MAX_BATCH} documentos por solicitud`:undefined}
          onClick={()=>onBatch(ordered.map(document=>document.id),'batch-all')}>{busy==='batch-all'?'Solicitando…':`Analizar todas (${documents.length})`}</button>
        <button type="button" className="rund-extraction-button rund-extraction-primary" disabled={!!busy||!selected.length||selected.length>MAX_BATCH}
          onClick={()=>onBatch(selected,'batch')}>{busy==='batch'?'Solicitando…':`Analizar seleccionadas (${selected.length})`}</button>
      </div>
    </div>}
    <ol className="rund-extraction-selection-list" aria-label="Evidencias disponibles para el análisis">
      {ordered.map((document:any)=>{
        const position=selected.indexOf(document.id);
        return <li key={document.id} data-selected={position>=0}>
          {several&&<label className="rund-extraction-check">
            <input type="checkbox" checked={position>=0} disabled={!!busy} onChange={()=>toggle(document.id)} aria-label={`Incluir ${document.nombre_archivo} en el análisis`}/>
            {position>=0?<span className="rund-extraction-order" aria-label={`Turno ${position+1}`}>{position+1}</span>:null}
          </label>}
          <span className="rund-extraction-document-name"><FileText size={16}/><span><strong>{document.nombre_archivo}</strong>
            <small>{document.analizado_previamente ? 'Resultado disponible abajo · puedes volver a procesarlo' : several?(position>=0?`Turno ${position+1} del análisis`:'Sin seleccionar'):'Listo para analizar en segundo plano'}</small></span></span>
          {canEdit&&<div className="rund-extraction-row-actions">
            {position>=0&&selected.length>1&&<>
              <button type="button" className="rund-extraction-icon-button" disabled={!!busy||position===0} aria-label={`Analizar antes ${document.nombre_archivo}`}
                onClick={()=>setSelected(current=>moveItem(current,position,-1))}><ChevronUp size={15}/></button>
              <button type="button" className="rund-extraction-icon-button" disabled={!!busy||position===selected.length-1} aria-label={`Analizar después ${document.nombre_archivo}`}
                onClick={()=>setSelected(current=>moveItem(current,position,1))}><ChevronDown size={15}/></button>
            </>}
            <button type="button" className="rund-extraction-button rund-extraction-primary" disabled={!!busy} onClick={()=>onSingle(document)}>{busy===document.id?'Solicitando…':document.analizado_previamente?'Volver a procesar':'Extraer datos'}</button>
          </div>}
        </li>;
      })}
    </ol>
  </div>;
}

/** Waiting analyses of this profile can be reordered before they start. */
function ExtractionQueueOrder({jobs,busy,onSave}:{jobs:any[];busy:string|null;onSave:(ids:string[])=>void}) {
  const waiting=jobs.filter(job=>job.estado==='PENDIENTE').sort((a,b)=>(a.posicion_cola||0)-(b.posicion_cola||0));
  const current=waiting.map(job=>job.id);
  const [draft,setDraft]=useState<string[]|null>(null);
  useEffect(()=>setDraft(null),[current.join('|')]);
  if(waiting.length<2)return null;
  const order=draft||current;
  const changed=order.join('|')!==current.join('|');
  return <section className="rund-extraction-queue" aria-label="Orden de análisis en espera">
    <div><strong>Orden de análisis en espera</strong><small>Se analizan de arriba hacia abajo. Puedes cambiar el orden mientras no hayan comenzado.</small></div>
    <ol>{order.map((id,index)=>{
      const job=waiting.find(item=>item.id===id);
      return <li key={id}><span className="rund-extraction-order">{index+1}</span><span className="rund-extraction-queue-name">{job?.nombre_archivo}</span>
        <span className="rund-extraction-row-actions">
          <button type="button" className="rund-extraction-icon-button" disabled={!!busy||index===0} aria-label={`Analizar antes ${job?.nombre_archivo}`} onClick={()=>setDraft(moveItem(order,index,-1))}><ChevronUp size={15}/></button>
          <button type="button" className="rund-extraction-icon-button" disabled={!!busy||index===order.length-1} aria-label={`Analizar después ${job?.nombre_archivo}`} onClick={()=>setDraft(moveItem(order,index,1))}><ChevronDown size={15}/></button>
        </span></li>;
    })}</ol>
    {changed&&<div className="rund-extraction-queue-actions">
      <button type="button" className="rund-extraction-button" disabled={!!busy} onClick={()=>setDraft(null)}>Descartar cambios</button>
      <button type="button" className="rund-extraction-button rund-extraction-primary" disabled={!!busy} onClick={()=>onSave(order)}>{busy==='reorder'?'Guardando…':'Guardar orden'}</button>
    </div>}
  </section>;
}
type Props = { docenteId:string; revision:number; activeBlock?:string; activeBlockLabel?:string; activeBlockColor?:string; canEdit?:boolean; canAnalyze?:boolean; onConfirmed?:()=>void|Promise<void>; onPendingChange?:(block:string,count:number|undefined,processing:boolean)=>void; onView:(url:string,name:string,label:string)=>void };
const statuses:Record<string,string> = { PENDIENTE:'En espera',PROCESANDO:'Procesando PDF',COMPLETADO:'Procesado',ERROR:'No se pudo procesar',OBSOLETO:'Documento reemplazado o eliminado' };
const stages = [
  {code:'LEYENDO',label:'Preparar PDF'}, {code:'OCR',label:'Leer texto'},
  {code:'MODELO',label:'Extraer datos'}, {code:'VALIDANDO',label:'Verificar sugerencias'},
];
// Porcentaje de etapas terminadas; los motores no informan avance por página/token.
const stageIndex=(job:any)=>job.etapa==='VISION'?2:stages.findIndex(stage=>stage.code===job.etapa);
const extractionPercent=(job:any)=>job.estado==='COMPLETADO'?100:
  job.estado==='PROCESANDO'?Math.max(0,stageIndex(job))*25:0;
const extractionErrors:Record<string,string>={
  OCR_CONEXION_FALLIDA:'No se pudo conectar con el motor OCR local. Revisa que el contenedor OCR esté disponible.',
  OCR_TIMEOUT:'El motor OCR superó los 3 minutos de espera para este archivo.',
  OCR_NO_DISPONIBLE:'El motor OCR está ocupado o no está disponible.',
  OCR_INVALIDO:'El motor OCR devolvió una respuesta incompleta o inválida.',
  MODELO_CONEXION_FALLIDA:'No se pudo conectar con el motor local de extracción de datos.',
  MODELO_NO_DISPONIBLE:'El modelo local de extracción de datos no está disponible.',
  MODELO_TIMEOUT:'El modelo local superó los 10 minutos de espera para este archivo.',
  EXTRACCION_TIMEOUT:'El análisis superó el tiempo máximo de procesamiento.',
  PROCESAMIENTO_INTERRUMPIDO:'Se interrumpió el procesamiento y se está recuperando el análisis.',
  PDF_INVALIDO:'El archivo no es un PDF válido o supera los 25 MB.',
  DOCUMENTO_MODIFICADO:'El archivo cambió desde su carga. Revisa el documento antes de analizarlo otra vez.',
};
const extractionError=(job:any)=>extractionErrors[job.error_codigo]||'El servicio local no completó la extracción de este archivo.';
const comparableValue=(value:unknown,field:string)=>{
  const normalized=String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]/g,'').toUpperCase();
  const aliases:Record<string,Record<string,string>>={genero:{M:'MASCULINO',F:'FEMENINO'},sexoBiologico:{M:'HOMBRE',MASCULINO:'HOMBRE',F:'MUJER',FEMENINO:'MUJER'}};
  return aliases[field]?.[normalized]||normalized;
};
const valuesMatch=(suggestion:RundSuggestion)=>Boolean(suggestion.valor_previo)
  && comparableValue(suggestion.valor_previo,suggestion.campo)===comparableValue(suggestion.valor,suggestion.campo);
const extractionFieldBlock:Record<string,string> = {
  documentType:'IDENTIDAD',documentNumber:'IDENTIDAD',nombreCompleto:'IDENTIDAD',genero:'IDENTIDAD',sexoBiologico:'IDENTIDAD',fechaNacimiento:'IDENTIDAD',
  pregrado:'FORMACION',especializacion:'FORMACION',maestria:'FORMACION',doctorado:'FORMACION',posDoctorado:'FORMACION',perfilAcademico:'FORMACION',
  actoAdministrativoVinculacion:'VINCULACION',fechaInicioVinculacion:'VINCULACION',fechaFinVinculacion:'VINCULACION',origenVinculacion:'VINCULACION',situacionAdministrativa:'VINCULACION',escalafon:'VINCULACION',
  nucleoTematico:'ACADEMICO',investigacion:'ACADEMICO',ultimaEvaluacion:'ACADEMICO',
};
const extractionCategoryBlock:Record<string,string> = { IDENTIDAD:'IDENTIDAD',TITULOS:'FORMACION',CONTRATOS:'VINCULACION' };
const resourceBlock=(resource:any)=>rundDocumentBlock(resource)
  || (!resource?.tipo_soporte&&extractionCategoryBlock[resource?.categoria_codigo]) || null;
const resourceBelongsToBlock=(resource:any,activeBlock?:string)=>!activeBlock||resourceBlock(resource)===activeBlock;
const suggestionBelongsToBlock=(suggestion:RundSuggestion,activeBlock?:string)=>!activeBlock||extractionFieldBlock[suggestion.campo]===activeBlock;
export function RundExtractionProgress({job,unavailable=false}:{job:any;unavailable?:boolean}) {
  const [now,setNow]=useState(Date.now());
  const completed=job.estado==='COMPLETADO';
  useEffect(()=>{setNow(Date.now());if(completed)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[job.id,completed]);
  const started=Date.parse(job.iniciado_en||job.creado_en);
  const finished=Date.parse(job.actualizado_en);
  const seconds=Number.isFinite(started)?Math.max(0,Math.floor(((completed&&Number.isFinite(finished)?finished:now)-started)/1000)):0;
  const waiting=job.estado==='PENDIENTE';
  const interrupted=job.estado==='PROCESANDO'&&job.worker_activo===false;
  const index=completed?stages.length:waiting?-1:stageIndex(job);
  const percent=extractionPercent(job);
  const stageStarted=Date.parse(job.etapa_desde);
  const stageSeconds=Number.isFinite(stageStarted)?Math.max(0,Math.floor((now-stageStarted)/1000)):0;
  const retryAt=Date.parse(job.disponible_en);
  const retrySeconds=Number.isFinite(retryAt)?Math.max(0,Math.ceil((retryAt-now)/1000)):0;
  const label=unavailable?'Sin actualización del servidor':interrupted?'Procesamiento interrumpido':completed?'Análisis completado':waiting?(job.intentos>0?'Esperando reintento automático':'En cola para comenzar'):
    job.etapa==='VISION'?'Lectura visual del PDF':index>=0?stages[index].label:'Preparando el análisis';
  return <div className="rund-extraction-progress">
    <div className="rund-extraction-progress-title"><span role="status">{completed?<CheckCircle2 size={15}/>:unavailable||interrupted?<AlertTriangle size={15}/>:<Loader2 size={15} className="rund-extraction-spinner"/>} {label}</span>
      <strong>{percent}% · {completed?4:Math.max(0,index)} de 4 etapas completadas</strong>
      <small><Clock3 size={12}/> {Math.floor(seconds/60)} min {String(seconds%60).padStart(2,'0')} s transcurridos</small></div>
    <div className="rund-extraction-track" role="progressbar" aria-label="Etapas del análisis documental"
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={label}>
      {stages.map((s,i)=><span key={s.code} className={i<index?'is-complete':i===index&&!unavailable&&!interrupted?'is-current':''}/>)}</div>
    <ol className="rund-extraction-steps">{stages.map((s,i)=><li key={s.code} aria-current={i===index?'step':undefined}>{s.label}</li>)}</ol>
    <p className="rund-extraction-timing">Avance por etapas verificadas. El porcentaje cambia al terminar cada etapa; no estima el tiempo restante.</p>
    {!completed&&<p className="rund-extraction-background"><Bell size={14}/> Puedes cambiar de módulo o cerrar sesión. El análisis continúa en el servidor y recibirás un aviso en la campanita al finalizar.</p>}
    {unavailable&&<p className="rund-extraction-warning">Se muestra el último estado recibido. No se puede confirmar el avance hasta recuperar la conexión.</p>}
    {interrupted&&!unavailable&&<p className="rund-extraction-warning">El servidor dejó de confirmar este trabajo. Se recuperará automáticamente cuando el servicio esté disponible.</p>}
    {job.etapa==='MODELO'&&!completed&&<p className="rund-extraction-timing">El primer análisis puede tardar varios minutos mientras se carga el modelo. Tiempo máximo de esta etapa: 10 minutos por intento.</p>}
    {job.etapa==='VISION'&&!completed&&<p className="rund-extraction-timing">La IA local está contrastando los datos con distintas vistas de hasta las tres primeras páginas. Tiempo máximo del respaldo visual: 6 minutos.</p>}
    {job.etapa==='OCR'&&!waiting&&<p className="rund-extraction-timing">Leyendo el texto del PDF. Tiempo máximo de esta etapa: 3 minutos por intento.</p>}
    {!waiting&&!completed&&!unavailable&&!interrupted&&stageSeconds>=60&&<p className="rund-extraction-timing">Esta etapa lleva {Math.floor(stageSeconds/60)} min {stageSeconds%60} s sin terminar. Si el motor no responde dentro del plazo, se mostrará el fallo y se reintentará automáticamente.</p>}
    {waiting&&job.intentos>0&&<p className="rund-extraction-warning">{extractionError(job)} Intento {job.intentos} de 3.{retrySeconds>0?` Próximo intento en ${retrySeconds} s.`:' El siguiente intento comenzará cuando haya un procesador disponible.'}</p>}
  </div>;
}
export function RundExtractionPanel({docenteId,revision,activeBlock,activeBlockLabel,activeBlockColor,canEdit=true,canAnalyze=canEdit,onConfirmed,onPendingChange,onView}:Props) {
  const [data,setData]=useState<any>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState<string|null>(null);
  const [reasons,setReasons]=useState<Record<string,string>>({});
  const [discardOpen,setDiscardOpen]=useState<Record<string,boolean>>({});
  const [correction,setCorrection]=useState<{ id:string; value:string; reason:string }|null>(null);
  const [expanded,setExpanded]=useState(false);
  const [selection,setSelection]=useState<{jobId:string;documentId:string}|null>(null);
  const [reprocess,setReprocess]=useState<{ids:string[];names:string[]}|null>(null);
  const [analysisFeedback,setAnalysisFeedback]=useState<{error:boolean;message:string;block?:string}|null>(null);
  const pendingAnalysis=useRef<{ids:string[];previousJobs:string[];block?:string}|null>(null);
  const feedbackRef=useRef<HTMLDivElement|null>(null);
  const confirmationRef=useRef<HTMLElement|null>(null);
  const resultRef=useRef<HTMLElement|null>(null);
  const focusNewAnalysis=useRef(false);
  const pickerHelpId=useId();
  const resultId=useId();
  const actionRef=useRef(false);
  const mutationSequence=useRef(0);
  const currentProfile=useRef<string|null>(docenteId);
  currentProfile.current=docenteId;
  const [refresh,setRefresh]=useState(0);
  const base=`/pta/api/v1/pta/banco-docentes/${docenteId}/extracciones`;
  useEffect(()=>{
    currentProfile.current=docenteId;
    ++mutationSequence.current;actionRef.current=false;setBusy(null);
    setData(null);setReasons({});setDiscardOpen({});setCorrection(null);setReprocess(null);setSelection(null);setExpanded(false);setError('');
    setAnalysisFeedback(null);pendingAnalysis.current=null;focusNewAnalysis.current=false;
    return()=>{currentProfile.current=null;++mutationSequence.current;};
  },[docenteId]);
  useEffect(()=>{ setDiscardOpen({}); setCorrection(null); setReprocess(null); setExpanded(false); setAnalysisFeedback(null); },[activeBlock]);
  useEffect(()=>{
    if(analysisFeedback?.block===activeBlock){feedbackRef.current?.scrollIntoView?.({behavior:'smooth',block:'start'});feedbackRef.current?.focus({preventScroll:true});}
  },[analysisFeedback,activeBlock]);
  useEffect(()=>{
    if(reprocess){confirmationRef.current?.scrollIntoView?.({behavior:'smooth',block:'center'});confirmationRef.current?.focus({preventScroll:true});}
  },[reprocess]);
  useEffect(()=>{
    const pending=pendingAnalysis.current;
    if(!pending)return;
    const next=(data?.jobs||[]).find((job:any)=>pending.ids.includes(job.documento_id)&&!pending.previousJobs.includes(job.id));
    if(next){pendingAnalysis.current=null;if(resourceBelongsToBlock(next,activeBlock)){focusNewAnalysis.current=true;setSelection({jobId:next.id,documentId:next.documento_id});}}
  },[data,analysisFeedback,activeBlock]);
  useEffect(()=>{
    if(focusNewAnalysis.current&&expanded&&resultRef.current){
      focusNewAnalysis.current=false;resultRef.current.scrollIntoView?.({behavior:'smooth',block:'start'});resultRef.current.focus({preventScroll:true});
    }
  },[selection,expanded]);
  useEffect(()=>{
    let alive=true, running=false;
    const load=async()=>{
      if(running || document.hidden || !getAppOnlineStatus())return;
      running=true;
      let timeout:ReturnType<typeof setTimeout>|undefined;
      try{
        const raw=await Promise.race([
          apiClient.get<any>(base,undefined,{cache:'no-store',retries:0,skipErrorToast:true}),
          new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(new Error('CONSULTA_TIMEOUT')),30000);}),
        ]);
        if(raw?.success===false)throw new Error();
        if(alive){setData(raw?.data??raw);setError('');}
      }catch{if(alive)setError('No fue posible consultar las sugerencias. La gestión del perfil sigue disponible.');}
      finally{if(timeout)clearTimeout(timeout);running=false;}
    };
    void load(); const timer=setInterval(load,5000);
    document.addEventListener('visibilitychange',load); window.addEventListener('online',load);
    return()=>{alive=false;clearInterval(timer);document.removeEventListener('visibilitychange',load);window.removeEventListener('online',load);};
  },[base,revision,refresh]);
  const mutate=async(key:string,path:string,body:any,analysis=false)=>{
    if((analysis?!canAnalyze:!canEdit)||actionRef.current)return;
    if(!getAppOnlineStatus()){
      if(analysis)setAnalysisFeedback({error:true,block:activeBlock,message:'Se necesita conexión para solicitar un nuevo análisis. Vuelve a intentarlo cuando recuperes la conexión.'});
      toast.error('Se necesita conexión para registrar esta acción.');return;
    }
    const requestedIds:string[]=Array.isArray(body.documentos)?body.documentos:path.startsWith('documentos/')?[path.split('/')[1]]:[];
    const previousJobs=(data?.jobs||[]).map((job:any)=>job.id);
    const sequence=++mutationSequence.current;
    const isCurrent=()=>currentProfile.current===docenteId&&mutationSequence.current===sequence;
    actionRef.current=true;setBusy(key);setExpanded(true);
    if(analysis)setAnalysisFeedback(null);
    let accepted=false;
    try{
      const response=await apiClient.post<any>(`${base}/${path}`,body,{retries:0,skipErrorToast:true});
      if(!isCurrent())return;
      if(response?.success===false)throw new Error(response.message);
      const result=response?.data??response;
      if(!result?.queued&&!result?.discarded&&!result?.confirmed&&!result?.reordered)throw new Error('El servidor no confirmó la acción.');
      if(analysis&&Number(result.queued)!==requestedIds.length)throw new Error('El servidor no confirmó todos los archivos solicitados. Actualiza el asistente antes de volver a intentarlo.');
      if(result?.queued){
        accepted=true;pendingAnalysis.current={ids:requestedIds,previousJobs,block:activeBlock};
        setReprocess(null);setCorrection(null);setDiscardOpen({});
        setAnalysisFeedback({error:false,block:activeBlock,message:requestedIds.length===1?'Solicitud aceptada. Consulta abajo el estado del nuevo análisis del PDF.':'Solicitud aceptada. Consulta abajo el estado de los nuevos análisis, solicitados en el orden elegido.'});
        setRefresh(n=>n+1);
      }
      if(result?.confirmed){
        toast.success(result.changed?'Dato aplicado al perfil':'Coincidencia confirmada');
        await onConfirmed?.();
        if(!isCurrent())return;
        setCorrection(null);
      }else if(result?.reordered){
        toast.success('Orden de análisis actualizado');
      }else if(key.startsWith('batch')){
        toast.success(`${result.queued} ${result.queued===1?'evidencia en espera':'evidencias en espera'} de extracción, en el orden elegido`);
        await onConfirmed?.();
      }else if(key.startsWith('discard-job')){
        toast.success('Sugerencias rechazadas');
      }else{
        toast.success(key.startsWith('discard')?'Sugerencia rechazada':'Documento en espera de extracción');
        if(result?.queued)await onConfirmed?.();
      }
      if(!isCurrent())return;
      if(key.startsWith('discard'))setDiscardOpen(current=>({...current,[key.replace('discard-','')]:false}));
      if(!result?.queued)setRefresh(n=>n+1);
    }catch(e:any){if(isCurrent()){
      if(analysis&&!accepted)setAnalysisFeedback({error:true,block:activeBlock,message:e?.message||'No se pudo solicitar el nuevo análisis. Vuelve a intentarlo.'});
      toast.error(accepted?'El análisis fue solicitado, pero no se pudo actualizar el resumen del perfil. Consulta el estado en el asistente.':e?.message||'No se pudo registrar la acción.');
    }}
    finally{if(isCurrent()){actionRef.current=false;setBusy(null);}}
  };
  // Also collapse legacy API responses: attempts are not separate files. Keep the
  // latest result, including failures/empty readings, before counting proposals.
  const latestJobs=new Map<string,any>();
  const resultTime=(job:any)=>Date.parse(job.actualizado_en||job.creado_en||'')||0;
  for(const job of data?.jobs||[]){
    const key=job.documento_id||job.id;
    const previous=latestJobs.get(key);
    if(!previous||resultTime(job)>resultTime(previous))latestJobs.set(key,job);
  }
  const scopedJobs=[...latestJobs.values()].filter((job:any)=>!job.documento_estado||job.documento_estado==='ACTIVO')
    .map((job:any)=>({...job,sugerencias:(job.sugerencias||[]).filter((suggestion:RundSuggestion)=>suggestionBelongsToBlock(suggestion,activeBlock))}))
    .filter((job:any)=>!activeBlock||(resourceBlock(job) ? resourceBelongsToBlock(job,activeBlock) : job.sugerencias.length>0));
  const scopedDocuments=(data?.documents||[]).filter((document:any)=>resourceBelongsToBlock(document,activeBlock)&&!pendingAnalysis.current?.ids.includes(document.id));
  const visibleJobs=scopedJobs;
  const requestReprocess=(ids:string[],immediate=false)=>{
    if(!canAnalyze||busy)return;
    const documents=ids.map(id=>scopedDocuments.find((document:any)=>document.id===id)||visibleJobs.find((job:any)=>job.documento_id===id&&job.documento_estado==='ACTIVO'&&!['PENDIENTE','PROCESANDO'].includes(job.estado)));
    if(documents.some((document:any)=>!document)){
      setAnalysisFeedback({error:true,block:activeBlock,message:'No se encontró el PDF vigente. Actualiza el asistente y comprueba que el archivo no haya sido reemplazado o eliminado.'});setRefresh(n=>n+1);return;
    }
    if(immediate){void mutate(ids[0],'reprocesar',{documentos:ids},true);return;}
    setReprocess({ids,names:documents.map((document:any)=>document.nombre_archivo)});
  };
  const activeJobs=visibleJobs.filter((job:any)=>(!job.documento_estado||job.documento_estado==='ACTIVO')&&!pendingAnalysis.current?.ids.includes(job.documento_id));
  const unreliableCount=activeJobs.flatMap((job:any)=>job.sugerencias||[]).filter((suggestion:RundSuggestion)=>suggestion.estado==='PENDIENTE'&&suggestion.lectura_no_confiable).length;
  const pendingSuggestions:RundSuggestion[]=activeJobs.flatMap((job:any)=>job.sugerencias||[]).filter((suggestion:RundSuggestion)=>suggestion.estado==='PENDIENTE'&&!suggestion.lectura_no_confiable);
  const differentCount=pendingSuggestions.filter(suggestion=>!valuesMatch(suggestion)).length;
  const lowConfidenceCount=pendingSuggestions.filter(suggestion=>suggestion.baja_confianza).length;
  const runningJob=activeJobs.find((job:any)=>['PENDIENTE','PROCESANDO'].includes(job.estado));
  const nextWaitingJob=visibleJobs.filter((job:any)=>job.estado==='PENDIENTE')
    .sort((a:any,b:any)=>(a.posicion_cola||Number.MAX_SAFE_INTEGER)-(b.posicion_cola||Number.MAX_SAFE_INTEGER))[0];
  const displayedJob=(selection&&visibleJobs.find((job:any)=>job.documento_id===selection.documentId||job.id===selection.jobId))||visibleJobs.find((job:any)=>job.estado==='PROCESANDO')||nextWaitingJob||visibleJobs[0];
  // Several evidences may propose a value for the same row; the reviewer chooses which one to apply.
  const proposals=new Map<string,{jobId:string;valor:string;archivo:string}[]>();
  for(const job of activeJobs.filter((item:any)=>item.estado==='COMPLETADO')){
    for(const suggestion of (job.sugerencias||[]).filter((item:RundSuggestion)=>item.estado==='PENDIENTE'&&!item.desactualizada&&!item.fuera_de_alcance&&!item.lectura_no_confiable)){
      proposals.set(suggestion.campo,[...(proposals.get(suggestion.campo)||[]),{jobId:job.id,valor:suggestion.valor,archivo:job.nombre_archivo}]);
    }
  }
  const sectionName=activeBlockLabel||activeBlock;
  const hasScopedContent=visibleJobs.length>0||scopedDocuments.length>0;
  useEffect(()=>{
    if(activeBlock)onPendingChange?.(activeBlock,!data||error?undefined:data.enabled===false?0:pendingSuggestions.length,Boolean(runningJob));
  },[activeBlock,data,error,onPendingChange,pendingSuggestions.length,Boolean(runningJob)]);
  if(data?.enabled===false)return null;
  const awaitingScopedAnalysis=!!pendingAnalysis.current&&pendingAnalysis.current.block===activeBlock;
  const summary=!data&&!error?'Consultando análisis…':error?'No fue posible actualizar el análisis':awaitingScopedAnalysis?'Nuevo análisis solicitado · consultando el estado':runningJob?(statuses[runningJob.estado]||'Procesando'):
    pendingSuggestions.length?`${pendingSuggestions.length} ${pendingSuggestions.length===1?'dato':'datos'} por revisar · ${differentCount} ${differentCount===1?'diferencia':'diferencias'}`:
      unreliableCount?`${unreliableCount} ${unreliableCount===1?'lectura sin suficiente fiabilidad':'lecturas sin suficiente fiabilidad'}`:
      scopedDocuments.length?`${scopedDocuments.length} ${scopedDocuments.length===1?'documento disponible':'documentos disponibles'}`:
        sectionName?`Sin sugerencias OCR para ${sectionName}`:'Sin sugerencias pendientes';

  return <section className={`rund-extraction ${expanded?'is-expanded':''}`} aria-label="Asistente de captura documental"
    style={{'--rund-extraction-accent':activeBlockColor||'#5b21b6'} as React.CSSProperties}>
    <header className="rund-extraction-shell-heading">
      <div className="rund-extraction-brand"><span className="rund-extraction-brand-icon"><Sparkles size={19}/></span><div>
        <div className="rund-extraction-title"><h3>Asistente de captura</h3><span className="rund-extraction-badge">{sectionName||'IA local'}</span><small>{sectionName ? 'IA local · Opcional' : 'Opcional'}</small></div>
        <p>{summary}</p>
        {pendingSuggestions.length>0&&<div className="rund-extraction-metrics">
          <span>{pendingSuggestions.length} pendientes</span><span className={differentCount?'is-different':'is-match'}>{differentCount} cambios</span>
          {lowConfidenceCount>0&&<span className="is-low">{lowConfidenceCount} con baja confianza</span>}
        </div>}
        {unreliableCount>0&&<div className="rund-extraction-metrics"><span className="is-low">{unreliableCount} {unreliableCount===1?'lectura no fiable':'lecturas no fiables'} · revisa el PDF o captura el dato manualmente</span></div>}
      </div></div>
      <div className="rund-extraction-shell-actions">
        <button type="button" className="rund-extraction-icon-button" aria-label="Actualizar sugerencias" disabled={!!busy} onClick={()=>setRefresh(n=>n+1)}><RefreshCw size={15}/></button>
        {(hasScopedContent||error||!data)&&<button type="button" className="rund-extraction-toggle" aria-expanded={expanded} aria-controls={`rund-extraction-body-${docenteId}`} onClick={()=>setExpanded(value=>!value)}>
          {expanded?'Ocultar':'Organizar análisis'}<ChevronDown size={16}/>
        </button>}
      </div>
    </header>
    {analysisFeedback&&analysisFeedback.block===activeBlock&&<div ref={feedbackRef} tabIndex={-1} role={analysisFeedback.error?'alert':'status'} className={`rund-extraction-feedback ${analysisFeedback.error?'is-error':''}`}>
      {analysisFeedback.error?<AlertTriangle size={17}/>:<CheckCircle2 size={17}/>}<span>{analysisFeedback.message}</span>
    </div>}

    {expanded&&<div className="rund-extraction-body" id={`rund-extraction-body-${docenteId}`}>
      <div className="rund-extraction-guide" aria-label="Cómo revisar las sugerencias">
        <span><b>1</b> Compara</span><span><b>2</b> Verifica la evidencia</span><span><b>3</b> Confirma o rechaza</span>
        <p>{canEdit ? 'Ayuda opcional: puedes aplicar, corregir o dejar sin usar las sugerencias OCR. No son un requisito para aprobar los campos o el bloque. Aplicar un cambio al perfil requiere una nueva revisión de los datos afectados.' : 'El OCR es una ayuda opcional. Puedes revisar y aprobar los campos y sus soportes en los puntos de control sin resolver estas sugerencias.'}</p>
      </div>
      {error&&<p role="alert" className="rund-extraction-warning">{error}</p>}
      {!data&&!error&&<p role="status" className="rund-extraction-loading"><Loader2 size={15} className="rund-extraction-spinner"/> Consultando sugerencias…</p>}
      {canAnalyze&&reprocess&&<section ref={confirmationRef} tabIndex={-1} className="rund-extraction-reprocess" aria-label="Confirmar nuevo análisis OCR">
        <strong><RefreshCw size={16}/> Volver a procesar {reprocess.ids.length===1?'el PDF':'los PDF seleccionados'}</strong>
        <p>Se realizará un nuevo análisis en este orden. Cada archivo mostrará únicamente su resultado más reciente. Los datos del perfil y las aprobaciones documentales se conservan.</p>
        <ol>{reprocess.names.map((name,index)=><li key={reprocess.ids[index]}>{name}</li>)}</ol>
        <div><button type="button" className="rund-extraction-button" disabled={!!busy} onClick={()=>setReprocess(null)}>Cancelar nuevo análisis</button>
          <button type="button" className="rund-extraction-button rund-extraction-primary" disabled={!!busy}
            onClick={()=>mutate('reprocess','reprocesar',{documentos:reprocess.ids},true)}>{busy==='reprocess'?'Solicitando…':'Confirmar nuevo análisis'}</button></div>
      </section>}
      {scopedDocuments.length>0&&<ExtractionDocumentSelection documents={scopedDocuments} canEdit={canAnalyze} automatico={data?.automatico} busy={busy}
        onSingle={document=>document.analizado_previamente?requestReprocess([document.id],true):mutate(document.id,`documentos/${document.id}`,{},true)}
        onBatch={(ids,key)=>ids.some(id=>scopedDocuments.find((document:any)=>document.id===id)?.analizado_previamente)
          ?requestReprocess(ids):mutate(key,'lote',{documentos:ids},true)}/>}
      {canAnalyze&&<ExtractionQueueOrder jobs={activeJobs} busy={busy} onSave={ids=>mutate('reorder','orden',{trabajos:ids},true)}/>}
      {visibleJobs.length>0&&<label className="rund-extraction-result-picker">
        <span className="rund-extraction-result-picker__caption"><FileText size={17} aria-hidden="true"/> Archivo para revisar <span>{visibleJobs.length} {visibleJobs.length===1?'archivo analizado':'archivos con análisis'}</span></span>
        <span className="rund-extraction-result-picker__control"><select aria-label="Archivo para revisar" aria-describedby={pickerHelpId} aria-controls={resultId} value={displayedJob?.id||''} onChange={event=>{const job=visibleJobs.find((item:any)=>item.id===event.target.value);if(job)setSelection({jobId:job.id,documentId:job.documento_id});}}>
          {visibleJobs.map((job:any)=><option key={job.documento_id||job.id} value={job.id}>{job.nombre_archivo} · {statuses[job.estado]||job.estado}</option>)}
        </select><span className="rund-extraction-result-picker__arrow" aria-hidden="true"><ChevronDown size={21}/></span></span>
        <small id={pickerHelpId}>Cada archivo muestra su último análisis. Volver a procesarlo reemplaza el resultado mostrado; las sugerencias no aprueban los datos ni sus soportes.</small>
      </label>}
      {(displayedJob?[displayedJob]:[]).map((job:any)=>{
        const awaitingNewAnalysis=!!pendingAnalysis.current?.ids.includes(job.documento_id)&&pendingAnalysis.current.previousJobs.includes(job.id);
        const pending=(job.sugerencias||[]).filter((suggestion:RundSuggestion)=>suggestion.estado==='PENDIENTE'&&!suggestion.lectura_no_confiable);
        const unreadable=(job.sugerencias||[]).filter((suggestion:RundSuggestion)=>suggestion.estado==='PENDIENTE'&&suggestion.lectura_no_confiable).length;
        const identityConflict=pending.filter((suggestion:RundSuggestion)=>['documentNumber','nombreCompleto'].includes(suggestion.campo) && suggestion.valor_previo && !valuesMatch(suggestion)).length>=2;
        return <article ref={resultRef} tabIndex={-1} className="rund-extraction-job" key={job.id} id={resultId}
          aria-labelledby={`${resultId}-heading`}>
          <header className="rund-extraction-job-heading"><div><FileText size={18}/><span><strong id={`${resultId}-heading`} title={job.nombre_archivo}>{job.nombre_archivo}</strong><small>Versión {job.version} · {awaitingNewAnalysis?'Consultando el nuevo análisis':`${pending.length} campos pendientes`}{!awaitingNewAnalysis&&unreadable ? ` · ${unreadable} ${unreadable===1?'lectura no fiable':'lecturas no fiables'}` : ''}</small></span></div><div>
            {job.documento_id&&<button type="button" className="rund-extraction-button" disabled={!!busy} onClick={()=>onView(`/pta/api/v1/pta/banco-docentes/${docenteId}/documentos/${job.documento_id}/contenido`,job.nombre_archivo,'Documento analizado')}><Eye size={14}/> Ver PDF</button>}
            {canAnalyze&&!awaitingNewAnalysis&&job.estado==='COMPLETADO'&&job.documento_estado==='ACTIVO'&&<button type="button" className="rund-extraction-button" disabled={!!busy} onClick={()=>requestReprocess([job.documento_id],true)}><RefreshCw size={14}/> {busy===job.documento_id?'Solicitando nuevo análisis…':'Volver a procesar este PDF'}</button>}
            {job.estado==='PENDIENTE'&&job.posicion_cola>0&&<span className="rund-extraction-turn">Turno {job.posicion_cola}</span>}
            <span className="rund-extraction-badge">{awaitingNewAnalysis?'Nuevo análisis solicitado':statuses[job.estado]||job.estado}</span>
          </div></header>
          {identityConflict&&<div className="rund-extraction-identity-alert"><AlertTriangle size={18}/><div><strong>Datos principales distintos al perfil</strong><p>El número y el nombre reconocidos son diferentes. Puede tratarse de una corrección válida o de un documento equivocado: verifica el PDF y decide cada propuesta.</p></div>{canEdit&&<button type="button" className="rund-extraction-button rund-extraction-danger" disabled={!!busy} onClick={()=>mutate(`discard-job-${job.id}`,`trabajos/${job.id}/descartar`,{motivo:'El documento no corresponde al perfil revisado.'})}>{busy===`discard-job-${job.id}`?'Rechazando…':'Rechazar todas'}</button>}</div>}
          {awaitingNewAnalysis&&<p role="status" className="rund-extraction-loading"><Loader2 size={16} className="rund-extraction-spinner"/> Solicitud aceptada. Consultando el estado del nuevo análisis.</p>}
          {!awaitingNewAnalysis&&['PENDIENTE','PROCESANDO','COMPLETADO'].includes(job.estado)&&<RundExtractionProgress key={job.id} job={job} unavailable={!!error}/>}
          {!awaitingNewAnalysis&&job.estado==='COMPLETADO'&&job.sugerencias.length>0&&['LECTURA_VISUAL_NO_DISPONIBLE','LECTURA_VISUAL_PARCIAL'].includes(job.motor?.visual?.estado)&&<p className="rund-extraction-warning">Hay datos recuperados, pero no se pudo completar todo el cotejo visual. Puedes revisar las propuestas disponibles y volver a procesar el PDF para los datos restantes.</p>}
          {job.estado==='ERROR'&&<div role="alert" className="rund-extraction-warning">{extractionError(job)} Se agotaron los intentos automáticos. Puede seguir usando el documento y reintentar después.
            {canAnalyze&&job.documento_estado==='ACTIVO'&&<button type="button" className="rund-extraction-button" disabled={!!busy} onClick={()=>mutate(job.id,`documentos/${job.documento_id}`,{},true)}>Reintentar</button>}</div>}
          {!awaitingNewAnalysis&&job.estado==='COMPLETADO'&&job.sugerencias.length===0&&<div className="rund-extraction-empty">
            <strong>No fue posible reconocer {job.campos_esperados?.length ? job.campos_esperados.join(', ') : 'datos'} con suficiente fiabilidad.</strong>
            <p>{job.motor?.visual?.estado==='LECTURA_VISUAL_NO_DISPONIBLE'?'El OCR no recuperó el dato y el respaldo visual no estuvo disponible. Vuelve a procesar el archivo cuando el servicio local esté disponible.':job.motor?.visual?.estado==='SIN_COINCIDENCIA_VISUAL'?'Las lecturas visuales no confirmaron los mismos datos con suficiente claridad.':'El texto puede estar borroso, ser ilegible o no contener la información buscada.'} Consulta el PDF y completa o verifica el dato manualmente; el perfil conserva sus valores actuales.</p>
          </div>}
          <div className="rund-extraction-list">{(awaitingNewAnalysis?[]:job.sugerencias).map((suggestion:RundSuggestion)=>{
            const match=valuesMatch(suggestion);
            const pending=suggestion.estado==='PENDIENTE';
            const unreliable=pending&&!!suggestion.lectura_no_confiable;
            const outOfScope=pending&&!!suggestion.fuera_de_alcance;
            const stale=pending&&(!!suggestion.desactualizada||outOfScope);
            const alternatives=pending&&!stale?(proposals.get(suggestion.campo)||[]).filter(item=>item.jobId!==job.id):[];
            const stateLabel=pending?(unreliable?'Lectura no fiable':suggestion.baja_confianza?'Revisar con cuidado':match?'Coincide con el perfil':'Cambio detectado'):
              suggestion.estado==='DESCARTADA'?'Descartado':suggestion.estado==='CORREGIDA'?'Corregido y confirmado':'Confirmado';
            return <article className={`rund-extraction-suggestion ${unreliable?'is-unreadable':match?'is-match':'is-change'} ${suggestion.baja_confianza||unreliable?'is-low':''}`} key={suggestion.id}>
              <header><div className="rund-extraction-field-title">{match?<CheckCircle2 size={17}/>:<ArrowRight size={17}/>}<strong>{suggestion.label}</strong></div>
                <span className="rund-extraction-field-state">{stateLabel}</span></header>
              <div className="rund-extraction-values"><div><small>Perfil actual</small><p>{suggestion.valor_previo||'Sin dato registrado'}</p></div>
                <span className="rund-extraction-value-arrow"><ArrowRight size={16}/></span>
                <div className="is-proposed"><small>Reconocido para {suggestion.label}</small><p>{unreliable?'Sin lectura fiable':suggestion.valor}</p></div>
                {suggestion.valor_confirmado&&<div className="is-confirmed"><small>Confirmado</small><p>{suggestion.valor_confirmado}</p></div>}</div>
              {unreliable&&<p className="rund-extraction-warning">No fue posible reconocer {suggestion.label} con suficiente fiabilidad. {suggestion.lectura_no_confiable} Consulta el PDF y corrige el dato manualmente o vuelve a analizar el archivo.</p>}
              {suggestion.lectura_visual&&<p className="rund-extraction-warning">Lectura visual: el dato coincide en dos vistas del documento. Compruébalo en el PDF antes de confirmar; la coincidencia no garantiza que la lectura sea correcta.</p>}
              <div className="rund-extraction-row-footer">
                <details className="rund-extraction-evidence"><summary>Ver evidencia · pág. {suggestion.pagina}</summary><blockquote>{suggestion.evidencia}</blockquote></details>
                {pending&&canEdit&&<div className="rund-extraction-actions">
                  {!unreliable&&!stale&&job.documento_estado==='ACTIVO'&&job.estado==='COMPLETADO'&&<button type="button" className="rund-extraction-button rund-extraction-primary" disabled={!!busy} onClick={()=>mutate(`confirm-${suggestion.id}`,`sugerencias/${suggestion.id}/confirmar`,{})}>{busy===`confirm-${suggestion.id}`?'Guardando…':match?'Confirmar coincidencia':'Aplicar al perfil'}</button>}
                  {!stale&&job.documento_estado==='ACTIVO'&&job.estado==='COMPLETADO'&&<button type="button" className="rund-extraction-button" disabled={!!busy} onClick={()=>setCorrection({id:suggestion.id,value:unreliable?'':suggestion.valor,reason:''})}>Corregir dato</button>}
                  <button type="button" className="rund-extraction-button rund-extraction-reject" disabled={!!busy} onClick={()=>setDiscardOpen(current=>({...current,[suggestion.id]:!current[suggestion.id]}))}><XCircle size={15}/> Rechazar sugerencia</button>
                </div>}
              </div>
              {pending&&job.documento_estado!=='ACTIVO'&&<p className="rund-extraction-warning">El documento de origen ya no está vigente. Esta sugerencia no puede aplicarse.</p>}
              {outOfScope&&<p className="rund-extraction-warning">Este documento no acredita este dato, por eso la sugerencia no puede aplicarse. Recházala; el dato debe respaldarse con la evidencia de su punto de control.</p>}
              {stale&&!outOfScope&&job.documento_estado==='ACTIVO'&&<p className="rund-extraction-warning">El dato del perfil cambió después de este análisis (por otra evidencia o una edición). Rechaza esta sugerencia o vuelve a analizar el documento.</p>}
              {alternatives.length>0&&<p className="rund-extraction-alternatives"><Layers size={14}/> Otra evidencia también propone este dato: {alternatives.map(item=>`«${item.valor}» (${item.archivo})`).join(' · ')}. Elige cuál aplicar; al aplicar una, las demás quedarán desactualizadas.</p>}
              {canEdit&&correction?.id===suggestion.id&&<div className="rund-extraction-discard rund-extraction-correction">
                <label htmlFor={`correct-${suggestion.id}`}>Valor corregido de {suggestion.label}</label>
                <input id={`correct-${suggestion.id}`} value={correction.value} maxLength={2000} onChange={event=>setCorrection({...correction,value:event.target.value})}/>
                <label htmlFor={`correct-reason-${suggestion.id}`}>Motivo de la corrección</label>
                <input id={`correct-reason-${suggestion.id}`} value={correction.reason} maxLength={1000} onChange={event=>setCorrection({...correction,reason:event.target.value})}/>
                <div><button type="button" className="rund-extraction-button" disabled={!!busy} onClick={()=>setCorrection(null)}>Cancelar corrección</button>
                  <button type="button" className="rund-extraction-button rund-extraction-primary" disabled={!!busy||!correction.value.trim()||correction.reason.trim().length<3} onClick={()=>mutate(`confirm-${suggestion.id}`,`sugerencias/${suggestion.id}/confirmar`,{valorCorregido:correction.value.trim(),motivo:correction.reason.trim()})}>Guardar corrección</button></div>
              </div>}
              {canEdit&&discardOpen[suggestion.id]&&<div className="rund-extraction-discard"><label htmlFor={`discard-${suggestion.id}`}>Motivo del rechazo</label><div><input id={`discard-${suggestion.id}`} aria-label={`Motivo de rechazo de ${suggestion.label}`} value={reasons[suggestion.id]||''} maxLength={1000} placeholder="Explique por qué no corresponde" onChange={event=>setReasons(current=>({...current,[suggestion.id]:event.target.value}))}/>
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
