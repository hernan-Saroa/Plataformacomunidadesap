import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {createRundInlineClient,defaultProfile,profileDocuments,RundProfileCatalog} from './rundInlineClient';

/** La clave incluye propietario y perfil; las respuestas de otra persona nunca sustituyen la selección actual. */
export function useRundInline(api:Parameters<typeof createRundInlineClient>[0],person:string,documents:any[],onRefresh?:()=>void) {
  const client=useMemo(()=>createRundInlineClient(api),[api]);
  const [catalog,setCatalog]=useState<RundProfileCatalog|null>(null),[key,setKey]=useState('');
  const [loading,setLoading]=useState(false),[error,setError]=useState<string|null>(null),[busy,setBusy]=useState(false);
  const generation=useRef(0),selection=useRef(''),operation=useRef(false),currentPerson=useRef(person),loadedPerson=useRef('');
  currentPerson.current=person;
  const refresh=useCallback(async()=>{
    const request=++generation.current,target=person;
    if(!target){loadedPerson.current='';setCatalog(null);setKey('');selection.current='';setError(null);setLoading(false);return;}
    setLoading(true);setError(null);
    try {
      const next=await client.catalog(target);
      if(request!==generation.current || currentPerson.current!==target)return;
      const previous=loadedPerson.current===target?selection.current:'';
      const chosen=next.perfiles.some(p=>p.clave===previous)?previous:defaultProfile(next);
      loadedPerson.current=target;selection.current=chosen;setCatalog(next);setKey(chosen);
    } catch(e:any) {if(request===generation.current && currentPerson.current===target){setError(e?.message||'No se pudieron consultar los perfiles.');setCatalog(null);setKey('');selection.current='';}}
    finally{if(request===generation.current && currentPerson.current===target)setLoading(false);}
  },[client,person]);
  useEffect(()=>{void refresh();return()=>{generation.current++;};},[refresh]);
  const selected=loadedPerson.current===person?catalog?.perfiles.find(p=>p.clave===key) || null:null;
  const selectedDocs=useMemo(()=>profileDocuments(documents,selected),[documents,selected]);
  const choose=useCallback((next:string)=>{if(operation.current)return;if(next && !catalog?.perfiles.some(p=>p.clave===next))return;selection.current=next;setKey(next);},[catalog]);
  const upload=useCallback(async(file:File,block:string,type:string,expectedKey:string)=>{
    if(operation.current)throw new Error('Ya hay una carga en curso.');
    if(!selected || loading || error || expectedKey!==selection.current || expectedKey!==selected.clave || loadedPerson.current!==currentPerson.current)
      throw new Error('El perfil cambió. Seleccione de nuevo el requisito antes de adjuntar.');
    const token=generation.current,target=person;
    const existing=selectedDocs.filter(d=>String(d.tipo_soporte_rund || String(d.tipo_documento_id||'').replace(/^rund_/,'')).trim().toLowerCase()===type);
    if(existing.length>1)throw new Error('Hay más de un original para este requisito. Revíselo desde su módulo propietario.');
    operation.current=true;setBusy(true);
    try {
      await client.upload(selected,block,type,file,existing[0]);
      if(currentPerson.current!==target || generation.current!==token)throw new Error('El archivo se envió al perfil seleccionado. Actualice esa carpeta para verificar el resultado.');
      await onRefresh?.();
      await refresh();
      if(currentPerson.current!==target)throw new Error('El archivo se guardó en el perfil seleccionado. Actualice esa carpeta para verificarlo.');
    }finally{operation.current=false;setBusy(false);}
  },[client,selected,selectedDocs,loading,error,person,onRefresh,refresh]);
  return {catalog,selected,key,loading,error,busy,choose,refresh,upload,selectedDocs};
}
