import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ManualExecutionReceipt, RundManualIdentityClient } from '../../../services/api/rundManualIdentityApi';
import { MANUAL_CAPTURE_LABELS, type ManualCaptureField, type ManualCaptureReview } from '../../../services/api/rundManualIdentityCapture';
import type { ManualCloseReceipt } from '../../../services/api/rundManualIdentityClose';
import type { ManualMailReceipt } from '../../../services/api/rundManualIdentityMail';

interface Props {
  client: RundManualIdentityClient;
  onClose: () => void;
  onSaved: () => void;
  renderForm: (preparar: (formulario: Record<string, unknown>) => Promise<void>) => ReactNode;
}

const failure = 'No se pudo confirmar la solicitud. Conserve este registro y consulte su estado antes de continuar.';

/** Ciclo visual preparatorio; sin HTTP al montar, reintentos automáticos o escritura alternativa. */
export function BancoDocenteManualRequestModal({ client, onClose, onSaved, renderForm }: Props) {
  const [initial] = useState(() => {
    try { return { id: client.pendiente(), error: null as string | null }; }
    catch { return { id: null, error: 'No se puede recuperar la solicitud en este navegador. No se enviaron datos.' }; }
  });
  const [started, setStarted] = useState(Boolean(initial.id || initial.error));
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(initial.error);
  const [result, setResult] = useState<ManualExecutionReceipt | null>(null);
  const [capture, setCapture] = useState<ManualCaptureReview | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [abandoned, setAbandoned] = useState(false);
  const [abandonRequested, setAbandonRequested] = useState(false);
  const [closure, setClosure] = useState<ManualCloseReceipt | null>(null);
  const [closeRequested, setCloseRequested] = useState(false);
  const [mail, setMail] = useState<ManualMailReceipt | null>(null);
  const [mailError, setMailError] = useState<string | null>(null);
  const snapshot = useRef<Record<string, unknown> | null>(null);
  const running = useRef(false);
  const owner = useRef(client);
  const mounted = useRef(true);
  const stale = useRef(false);
  if (client !== owner.current) stale.current = true;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const valid = () => mounted.current && !stale.current;

  async function run(action: () => Promise<void>) {
    if (running.current || !valid() || initial.error) return;
    running.current = true;
    setBusy(true); setError(null); setMail(null); setMailError(null);
    try { await action(); }
    catch { if (valid()) { setError(failure); setCapture(null); setReviewed(false); setReady(false); } }
    finally { running.current = false; if (valid()) setBusy(false); }
  }
  async function prepare(formulario?: Record<string, unknown>) {
    await run(async () => {
      if (formulario) snapshot.current = { ...formulario };
      setStarted(true); setReady(false); setCapture(null); setReviewed(false);
      const prepared = snapshot.current ? await client.preparar(snapshot.current) : await client.reanudar();
      if (!valid()) return;
      const captured = await client.revisarCaptura();
      if (captured.intencionId !== prepared.intencionId) throw new Error(failure);
      if (valid()) { setCapture(captured); setReady(true); }
    });
  }
  async function consult() {
    await run(async () => {
      setReady(false); setCapture(null); setReviewed(false);
      const receipt = await client.consultarEjecucion();
      if (valid()) { setResult(receipt); setReady(false); }
    });
  }
  async function reviewCapture() {
    await run(async () => {
      setReady(false); setCapture(null); setReviewed(false);
      const captured = await client.revisarCaptura();
      if (valid()) setCapture(captured);
    });
  }
  async function execute() {
    if (!ready || !capture || !reviewed) return;
    await run(async () => {
      // Un error puede ocurrir después del commit: exige consultar o preparar de nuevo.
      setReady(false); setCapture(null); setReviewed(false);
      const receipt = await client.ejecutar();
      if (valid()) setResult(receipt);
    });
  }
  async function abandon(consultOnly = false) {
    await run(async () => {
      setReady(false); setCapture(null); setReviewed(false); setAbandonRequested(false);
      if (consultOnly) await client.consultarAbandono(); else await client.abandonar();
      if (valid()) { setAbandoned(true); setResult(null); snapshot.current = null; }
    });
  }
  async function restart() {
    await run(async () => {
      if (closure?.estado === 'CERRADA') await client.liberarCerrada(); else await client.cerrarAbandonada();
      if (valid()) { setAbandoned(false); setStarted(false); setAbandonRequested(false); setResult(null); setClosure(null); setCloseRequested(false); }
    });
  }
  async function closeOperation(consultOnly = false) {
    await run(async () => {
      setReady(false); setCapture(null); setReviewed(false); setCloseRequested(false); setAbandonRequested(false);
      const known = consultOnly ? await client.consultarCierre() : await client.cerrarOperacion();
      if (valid()) { setClosure(known); if (known.estado !== 'PENDIENTE') snapshot.current = null; }
    });
  }
  async function consultMail() {
    await run(async () => {
      try {
        const known = await client.consultarCorreo();
        const intention = result?.estado === 'CONFIRMADA' ? result.intencionId : closure?.intencionId;
        if (!known.registroConfirmado || known.intencionId !== intention) throw new Error();
        if (valid()) setMail(known);
      } catch {
        if (valid()) setMailError('No se pudo consultar el correo. El registro confirmado se conserva; puede volver a consultar su estado.');
      }
    });
  }
  if (!started && !stale.current) return <>{renderForm(prepare)}</>;
  const changed = stale.current;
  const blocked = busy || Boolean(initial.error) || changed;
  const confirmed = result?.estado === 'CONFIRMADA' || closure?.estado === 'CONFIRMADA';
  const aborted = result?.estado === 'ABORTADA' || closure?.decisionNativa === 'ABORTADA';
  const closed = closure?.estado === 'CERRADA';
  const review = closure?.estado === 'REVISION_REQUERIDA';
  return <div style={{ position: 'fixed', inset: 0, zIndex: 9100, background: 'rgba(15,23,42,.6)', display: 'grid', placeItems: 'center', padding: 20 }}>
    <section role="dialog" aria-modal="true" aria-labelledby="manual-request-title" aria-busy={busy}
      style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 680, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
      <h2 id="manual-request-title">Solicitud de creación del docente</h2>
      {changed ? <p role="alert">La sesión de esta solicitud cambió. Cierre esta ventana y vuelva a abrirla con la sesión correspondiente.</p>
        : error && <p role="alert">{error}</p>}
      <p role="status">{closed ? 'La operación quedó cerrada con resolución confirmada de identidad.'
        : review ? 'El registro no se confirmó y la identidad requiere revisión. Conserve esta solicitud.'
        : abandoned ? 'La solicitud fue abandonada antes de iniciar una operación de identidad.'
        : confirmed ? 'El registro está confirmado en RUND.' : aborted ? 'Esta solicitud fue abortada y no se puede ejecutar.'
        : busy ? 'Verificando la solicitud…' : ready ? 'La solicitud está preparada. Confirme para guardar el registro.'
        : 'Hay una solicitud pendiente. Consulte el resultado o recupere su preparación.'}</p>
      {confirmed && !changed && <section aria-label="Estado del correo de acceso">
        <p>La confirmación del registro no acredita el envío del correo. Consulte su estado por separado.</p>
        {mailError && <p role="alert">{mailError}</p>}
        {mail && <p role="status">{mail.estado === 'NO_APLICA'
          ? 'No corresponde correo de bienvenida: esta operación utilizó una cuenta existente.'
          : mail.estado === 'PENDIENTE' ? 'El aviso está guardado y pendiente de un intento de envío. Consultar no lo envía.'
          : mail.estado === 'ENVIANDO' ? 'Hay un intento de envío iniciado, sin confirmación final. Puede estar en curso o requerir conciliación. No se reenviará automáticamente.'
          : mail.estado === 'ENVIADO' ? 'El servicio de notificaciones confirmó el envío. Esto no acredita recepción o lectura en el buzón.'
          : 'El resultado del envío es incierto y requiere revisión. Consultar no vuelve a enviarlo.'}</p>}
      </section>}
      {review && !changed && <p>Caso de revisión: {closure.casoRevisionId}. No se puede iniciar otra solicitud desde este cierre.</p>}
      {closed && <p>Puede iniciar otro registro. Los datos y recibos de esta solicitud se conservan en el servidor.</p>}
      {capture && !confirmed && !aborted && !changed && <section aria-label="Datos guardados de la solicitud">
        <h3>Datos guardados para este registro</h3>
        <p>Revise estos valores antes de confirmar. Esta vista no permite modificarlos.</p>
        {!capture.proteccionDatos.accesoCompleto && <p>Su sesión tiene acceso restringido al documento de identidad y al puntaje salarial.</p>}
        <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 1fr) minmax(0, 2fr)', gap: '8px 16px' }}>
          {(Object.keys(MANUAL_CAPTURE_LABELS) as ManualCaptureField[]).map(field => <div key={field} style={{ display: 'contents' }}>
            <dt>{MANUAL_CAPTURE_LABELS[field]}</dt>
            <dd style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {field === 'puntajeSalarial' && capture.proteccionDatos.camposEnmascarados.includes(field)
                ? 'Restringido por permisos' : capture.campos[field] ?? 'No informado'}
            </dd>
          </div>)}
        </dl>
        {ready && <label style={{ display: 'flex', gap: 8, margin: '18px 0' }}>
          <input type="checkbox" checked={reviewed} disabled={blocked} onChange={event => setReviewed(event.target.checked)} />
          He revisado los datos guardados de esta solicitud.
        </label>}
      </section>}
      {!confirmed && !aborted && !abandoned && <p>Recuperar usa los datos ya enviados. No cierre para crear otro registro del mismo docente mientras el resultado sea incierto.</p>}
      {abandonRequested && !abandoned && <div role="group" aria-label="Confirmación de abandono">
        <p>Solo puede abandonarse una solicitud sin operación de identidad reservada. Si ya avanzó, deberá recuperarla.
          La captura anterior se conserva y no podrá reactivarse con el mismo ID.</p>
        <button disabled={blocked} onClick={() => abandon()}>Confirmar abandono</button>
        <button disabled={blocked} onClick={() => setAbandonRequested(false)}>Seguir con la solicitud</button>
      </div>}
      {closeRequested && !closed && !review && <div role="group" aria-label="Confirmación de cierre de operación">
        <p>El cierre impedirá confirmar este registro y solicitará resolver los cambios de identidad en Auth.
          Si se creó una identidad o existen cambios posteriores, puede requerir revisión humana. Un cierre pendiente conserva su solicitud.</p>
        <button disabled={blocked} onClick={() => closeOperation()}>Confirmar cierre de operación</button>
        <button disabled={blocked} onClick={() => setCloseRequested(false)}>Continuar con la operación</button>
      </div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {confirmed && <button disabled={blocked} onClick={consultMail}>Consultar estado del correo</button>}
        {!abandoned && !closed && <button disabled={blocked} onClick={consult}>Consultar resultado</button>}
        {!confirmed && !aborted && !abandoned && <button disabled={blocked} onClick={reviewCapture}>Revisar datos guardados</button>}
        {!confirmed && !aborted && !abandoned && <button disabled={blocked} onClick={() => prepare()}>Recuperar preparación</button>}
        {ready && !confirmed && !aborted && !abandoned && !abandonRequested && !closeRequested && <button disabled={blocked || !capture || !reviewed} onClick={execute}>Confirmar creación</button>}
        {!confirmed && !abandoned && !closed && !review && <button disabled={blocked} onClick={() => abandon(true)}>Consultar abandono</button>}
        {!confirmed && !aborted && !abandoned && <button disabled={blocked} onClick={() => { setCloseRequested(false); setAbandonRequested(true); }}>Abandonar solicitud</button>}
        {!confirmed && !abandoned && <button disabled={blocked} onClick={() => closeOperation(true)}>Consultar cierre</button>}
        {!confirmed && !abandoned && !closed && !review && <button disabled={blocked} onClick={() => { setAbandonRequested(false); setCloseRequested(true); }}>Cerrar operación</button>}
        {(abandoned || closed) && <button disabled={blocked} onClick={restart}>Iniciar otro registro</button>}
        {result?.estado === 'CONFIRMADA' && <button disabled={blocked} onClick={() => run(async () => {
          client.cerrar(result);
          if (valid()) onSaved();
        })}>Finalizar registro</button>}
        <button disabled={busy && !changed} onClick={onClose}>Cerrar</button>
      </div>
    </section>
  </div>;
}
