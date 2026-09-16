import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { getBancoDocenteById } from '../../../services/api/ptaApi';
import { BancoDocenteDetalleInline } from './BancoDocenteDetalleInline';

/** Abre el expediente por id, incluso si no está en la página o periodo actual del listado. */
export function RundExtractionNotificationDetail({docenteId,onClose}:{docenteId:string;onClose:()=>void}) {
  const [docente,setDocente]=useState<any>(null);
  const [error,setError]=useState(false);
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    let alive=true;setError(false);
    getBancoDocenteById(docenteId).then(result=>{
      if(!alive)return;
      if(result.success&&result.data)setDocente(result.data);else setError(true);
    }).catch(()=>{if(alive)setError(true);});
    return()=>{alive=false;};
  },[docenteId,revision]);
  return <section aria-label="Resultado del análisis documental" style={{background:'#fff',borderRadius:14,overflow:'hidden'}}>
    <div style={{padding:20}}><button type="button" className="rund-extraction-button" onClick={onClose}><ArrowLeft size={15}/> Volver al listado</button>
      <h2 style={{fontSize:18,marginTop:16}}>Resultado del análisis documental</h2>
      <p>Consulta el Asistente de captura al final de los documentos. Las sugerencias requieren tu revisión.</p></div>
    {error?<p role="alert" style={{padding:20}}>No fue posible abrir el expediente. Comprueba tu acceso o vuelve al listado.</p>:
      !docente?<p role="status" style={{padding:20}}>Cargando expediente…</p>:
      <table style={{width:'100%',tableLayout:'fixed'}}><tbody><BancoDocenteDetalleInline docente={docente} onUpdated={()=>setRevision(n=>n+1)}/></tbody></table>}
  </section>;
}
