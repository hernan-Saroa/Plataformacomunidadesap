import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { RundManualIdentityClient } from '../services/api/rundManualIdentityApi';

/** Preparación opcional: no se monta en el banco activo y no hace HTTP al montar. */
export function useRundManualIdentitySession() {
  const {manualOperatorSession:connection}=useAuth();
  const [client,setClient]=useState<RundManualIdentityClient|null>(null);
  const state=useRef<{connection:typeof connection;actorId:string;client:RundManualIdentityClient}|null>(null);
  const revision=useRef(0),pending=useRef<AbortController|null>(null),mounted=useRef(false);
  const current=useRef(connection);current.current=connection;
  useEffect(()=>{
    mounted.current=true;
    const invalidate=()=>{revision.current++;pending.current?.abort();pending.current=null;state.current=null;setClient(null);};
    invalidate();const unsubscribe=connection?.subscribe(invalidate);
    return ()=>{mounted.current=false;revision.current++;pending.current?.abort();pending.current=null;state.current=null;unsubscribe?.();};
  },[connection]);
  const resolve=useCallback(async()=>{
    if(!connection||current.current!==connection||!mounted.current)throw new Error('La sesión manual RUND no está disponible.');
    pending.current?.abort();const controller=new AbortController(),generation=++revision.current;pending.current=controller;
    setClient(null);
    try{
      const principal=await connection.resolve({signal:controller.signal});
      if(!mounted.current||current.current!==connection||generation!==revision.current||controller.signal.aborted
        ||principal?.version!==1||typeof principal.actorId!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(principal.actorId))
        throw new Error();
      const actorId=principal.actorId.toLowerCase();
      const resolved=state.current?.connection===connection&&state.current.actorId===actorId?state.current.client:new RundManualIdentityClient(actorId);
      state.current={connection,actorId,client:resolved};setClient(resolved);return resolved;
    }catch{
      if(mounted.current&&generation===revision.current){state.current=null;setClient(null);}
      throw new Error('No fue posible confirmar la sesión manual RUND.');
    }finally{if(pending.current===controller)pending.current=null;}
  },[connection]);
  return {client:state.current?.connection===connection?client:null,resolve,available:Boolean(connection)};
}
