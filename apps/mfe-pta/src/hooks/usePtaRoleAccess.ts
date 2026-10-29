import { useCallback, useEffect, useRef, useState } from 'react';
import type { PTARoleAccess } from '../services/api/ptaApi';

/** Revalida los roles de la cuenta sin confiar en permisos antiguos del shell. */
export function usePtaRoleAccess(enabled: boolean, sessionKey: string, roleKey: string) {
  const [snapshot, setSnapshot] = useState<{ key: string; access: PTARoleAccess | null } | null>(null);
  const requestRef = useRef(0);
  const refresh = useCallback(async () => {
    if (!enabled) return;
    const request = ++requestRef.current;
    let access: PTARoleAccess | null = null;
    try {
      // El portal y los consumidores que no sincronizan PTA no necesitan cargar
      // el cliente HTTP ni inicializar sus dependencias de almacenamiento.
      const { getPTACurrentRoleAccess } = await import('../services/api/ptaApi');
      if (request !== requestRef.current) return;
      const result = await getPTACurrentRoleAccess();
      access = result.success ? result.data : null;
    } catch {
      // Un fallo al cargar o verificar los permisos no conserva privilegios.
      access = null;
    }
    if (request !== requestRef.current) return;
    setSnapshot({ key: sessionKey, access });
  }, [enabled, sessionKey]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const revalidate = () => { void refresh(); };
    const onVisible = () => { if (document.visibilityState === 'visible') revalidate(); };
    window.addEventListener('focus', revalidate);
    window.addEventListener('online', revalidate);
    window.addEventListener('esap:role-permissions-updated', revalidate);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      ++requestRef.current;
      window.removeEventListener('focus', revalidate);
      window.removeEventListener('online', revalidate);
      window.removeEventListener('esap:role-permissions-updated', revalidate);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, refresh, roleKey]);

  return { access: enabled && snapshot?.key === sessionKey ? snapshot.access : null,
    checked: !enabled || snapshot?.key === sessionKey, refresh };
}
