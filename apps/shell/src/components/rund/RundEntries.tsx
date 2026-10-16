import { lazy, Suspense, useLayoutEffect, useMemo, type ComponentType } from 'react';
import { useLocation } from 'react-router-dom';
import { RundOperatorSession } from './rundOperatorSession';

export const RUND_PUBLIC_AUTOGESTION_PATH = '/rund/autogestion/docentes';

/** Algunos exports federados llegan dentro de default, aunque sean exports nombrados. */
export function resolveRundRemote(namespace: unknown, name: string): ComponentType<any> {
  const visited = new Set<unknown>();
  let current = namespace;
  while (current && !visited.has(current)) {
    visited.add(current);
    if (typeof current === 'function' || (typeof current === 'object' && '$$typeof' in current)) return current as ComponentType<any>;
    if (typeof current !== 'object') break;
    const record = current as Record<string, unknown>;
    const candidate = record[name];
    if (typeof candidate === 'function' || (candidate && typeof candidate === 'object' && '$$typeof' in candidate)) return candidate as ComponentType<any>;
    current = record.default;
  }
  throw new Error(`No fue posible resolver la entrada RUND: ${name}`);
}

const RemoteRundModule = lazy(() => import('rund/Module').then(module => ({ default: resolveRundRemote(module, 'RundModulePremium') })));
const RemoteAutogestion = lazy(() => import('rund/Autogestion').then(module => ({ default: resolveRundRemote(module, 'AutogestionDocenteRUND') })));

export interface RundSessionProps {
  userPersonId?: string;
  userName?: string;
  userEmail?: string;
  userRoles?: string[];
  userPermissions?: string[];
}

function RundLoading() {
  return <div role="status" className="flex min-h-64 items-center justify-center text-slate-500">Cargando RUND...</div>;
}

export function RundShellModule(session: RundSessionProps) {
  // Limpiar datos y formularios del remote cuando cambia la identidad o su autorización.
  const sessionKey = JSON.stringify([session.userPersonId, session.userEmail, session.userRoles || [], session.userPermissions || []]);
  const operator=useMemo(()=>new RundOperatorSession(),[sessionKey]);
  useLayoutEffect(()=>{
    operator.activate();
    // Es solo invalidación: no confiar en los datos del evento ni hacer HTTP automáticamente.
    const changed=()=>operator.invalidate();
    window.addEventListener('esap:auth-user-changed',changed);
    return ()=>{window.removeEventListener('esap:auth-user-changed',changed);operator.deactivate();};
  },[operator]);
  return <Suspense fallback={<RundLoading />}>
    <RemoteRundModule key={sessionKey} {...session} manualOperatorSession={operator.connection} embedded />
  </Suspense>;
}

export function RundPublicAutogestionPage() {
  const location = useLocation();
  return <Suspense fallback={<RundLoading />}>
    <RemoteAutogestion key={location.search} />
  </Suspense>;
}
