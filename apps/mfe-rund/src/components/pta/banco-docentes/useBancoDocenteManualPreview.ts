import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import type { RundManualIdentityClient } from '../../../services/api/rundManualIdentityApi';

/** Observación efímera del borrador. Nunca prepara, ejecuta o almacena una aprobación. */
export function useBancoDocenteManualPreview(client: RundManualIdentityClient | undefined, draft: object) {
  const auth = useAuth(), connection = auth.manualOperatorSession;
  const role = (auth.session?.rol || auth.userRole || '').trim().toUpperCase();
  const allowed = Boolean(client && auth.isAuthenticated && (auth.hasPermission('banco-docentes.rund.manage')
    || ['ADMIN', 'SUPER_ADMIN', 'GESTION_PROFESORAL'].includes(role)));
  const owner = useRef({ client, connection, person: auth.userPersonId, email: auth.userEmail });
  const mounted = useRef(false), stale = useRef(false), running = useRef(false);
  const pending = useRef<AbortController | null>(null), generation = useRef(0);
  const current = useRef({ draft, allowed }); current.current = { draft, allowed };
  const [busy, setBusy] = useState(false), [invalidated, setInvalidated] = useState(false);
  const [observation, setObservation] = useState<{ draft: object; compatible: boolean } | null>(null);
  if (owner.current.client !== client || owner.current.connection !== connection
    || owner.current.person !== auth.userPersonId || owner.current.email !== auth.userEmail) stale.current = true;
  useEffect(() => {
    mounted.current = true;
    const unsubscribe = client ? connection?.subscribe(() => {
      stale.current = true; generation.current++; pending.current?.abort(); setObservation(null); setInvalidated(true);
    }) : undefined;
    return () => { mounted.current = false; generation.current++; pending.current?.abort(); unsubscribe?.(); };
  }, [client, connection]);
  useEffect(() => {
    generation.current++; pending.current?.abort(); setObservation(null);
  }, [draft, allowed]);
  const valid = () => mounted.current && !stale.current && current.current.allowed;
  async function consultar(formulario: Record<string, unknown>) {
    if (!client || running.current || !valid()) return;
    running.current = true; setBusy(true); setObservation(null);
    const controller = new AbortController(), revision = ++generation.current, queriedDraft = current.current.draft;
    pending.current = controller;
    const publishable = () => valid() && !controller.signal.aborted && generation.current === revision && current.current.draft === queriedDraft;
    try {
      await client.previsualizar(formulario, controller.signal);
      if (publishable()) setObservation({ draft: queriedDraft, compatible: true });
    } catch {
      if (publishable()) setObservation({ draft: queriedDraft, compatible: false });
    } finally {
      if (pending.current === controller) pending.current = null;
      running.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return {
    consultar, pending: () => running.current, busy,
    allowed: allowed && !stale.current && !invalidated,
    invalidated: stale.current || invalidated,
    compatible: allowed && !stale.current && observation?.draft === draft && observation.compatible,
    failed: allowed && !stale.current && observation?.draft === draft && !observation.compatible,
  };
}
