import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRundManualIdentitySession } from '../../../contexts/useRundManualIdentitySession';
import type { RundManualOperatorConnection } from '../../../contexts/rundManualOperator';
import type { RundManualIdentityClient } from '../../../services/api/rundManualIdentityApi';
import type { RundMailOperationsClient } from '../../../services/api/rundMailOperationsApi';
import { RundMailReviewInbox } from './RundMailReviewInbox';

interface Props { enabled?:boolean }
interface OpenedInbox { manual:RundManualIdentityClient; operations:RundMailOperationsClient }

/** Entrada opcional: solo resuelve el principal al abrir; no se instala en el banco activo. */
export function RundMailReviewWorkspace({enabled=false}:Props){
  const auth=useAuth(),connection=auth.manualOperatorSession;
  const role=(auth.session?.rol||auth.userRole||'').trim().toUpperCase();
  const allowed=auth.isAuthenticated&&(auth.hasPermission('banco-docentes.rund.manage')||['ADMIN','SUPER_ADMIN','GESTION_PROFESORAL'].includes(role));
  const boundary=useRef({connection,revision:0});
  if(boundary.current.connection!==connection)boundary.current={connection,revision:boundary.current.revision+1};
  if(!enabled)return null;
  if(!allowed)return <section aria-label="Acceso a revisiones de correo"><p>Se requiere una sesión con permiso de gestión del banco docente.</p></section>;
  if(!connection)return <section aria-label="Acceso a revisiones de correo"><p>La conexión de sesión para consultar revisiones no está disponible.</p></section>;
  return <ConnectedInbox key={boundary.current.revision} connection={connection}/>;
}

function ConnectedInbox({connection}:{connection:RundManualOperatorConnection}){
  const {client,resolve}=useRundManualIdentitySession();
  const [opened,setOpened]=useState<OpenedInbox|null>(null),[busy,setBusy]=useState(false);
  const [error,setError]=useState(false),[sessionChanged,setSessionChanged]=useState(false);
  const owned=useRef<OpenedInbox|null>(null),mounted=useRef(false),running=useRef(false),revision=useRef(0);
  useEffect(()=>{
    mounted.current=true;
    const unsubscribe=connection.subscribe(()=>{
      revision.current++;running.current=false;owned.current?.operations.invalidate();owned.current=null;
      setOpened(null);setBusy(false);setError(false);setSessionChanged(true);
    });
    return()=>{
      mounted.current=false;revision.current++;running.current=false;
      owned.current?.operations.invalidate();owned.current=null;unsubscribe();
    };
  },[connection]);
  async function open(){
    if(!mounted.current||running.current||owned.current)return;
    running.current=true;setBusy(true);setError(false);setSessionChanged(false);
    const generation=++revision.current;
    try{
      const manual=await resolve();
      if(!mounted.current||generation!==revision.current)return;
      const result={manual,operations:manual.operacionesCorreo()};
      owned.current=result;setOpened(result);
    }catch{
      if(mounted.current&&generation===revision.current)setError(true);
    }finally{
      if(mounted.current&&generation===revision.current){running.current=false;setBusy(false);}
    }
  }
  if(opened&&client===opened.manual)return <RundMailReviewInbox client={opened.operations} enabled/>;
  return <section aria-label="Acceso a revisiones de correo" aria-busy={busy}>
    <h2>Revisiones del correo de bienvenida</h2>
    {sessionChanged&&<p>La sesión cambió. Abra de nuevo las revisiones con su sesión vigente.</p>}
    <button type="button" disabled={busy} onClick={()=>void open()}>Abrir revisiones de correo</button>
    {busy&&<p role="status">Comprobando la sesión…</p>}
    {error&&<p role="alert">No fue posible abrir las revisiones. Verifique su sesión e intente de nuevo.</p>}
  </section>;
}
