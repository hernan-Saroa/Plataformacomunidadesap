import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle, RefreshCw, Upload, XCircle } from 'lucide-react';
import { apiClient } from '../../../../../shell/src/services/api';
import { PHOTO_ACCEPT, PHOTO_API, PHOTO_HELP, PublishedAvatar, onPhotoChanged, photoChanged, validatePhotoFile } from '../../../../../shared/profile-photos';
import './RundPhotoPanel.css';

type Photo = { id: string; nombre: string; estado: string; origen: string; creado_en: string; revisado_en?: string; observacion?: string; ancho: number; alto: number };
type Status = { personaId: string; publicada: Photo | null; solicitud: Photo | null; historial: Photo[] };
const labels: Record<string,string> = { PENDIENTE: 'Pendiente de validación',APROBADA: 'Aprobada',RECHAZADA: 'Rechazada',REEMPLAZADA: 'Solicitud reemplazada',ARCHIVADA: 'Foto anterior' };

export function RundPhotoPanel({ docenteId, canUpload = false, canValidate = false, own = false, name = '', onChanged }: {
  docenteId?: string; canUpload?: boolean; canValidate?: boolean; own?: boolean; name?: string; onChanged?: () => void;
}) {
  const base = `${PHOTO_API}/${own ? 'mia' : `docentes/${encodeURIComponent(docenteId || '')}`}`;
  const [loaded,setLoaded] = useState<{ base: string; data: Status } | null>(null);
  const data = loaded?.base === base ? loaded.data : null;
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState('');
  const [note,setNote] = useState('');
  const [preview,setPreview] = useState<{ id: string; url: string } | null>(null);
  const [previewError,setPreviewError] = useState('');
  const [previewReady,setPreviewReady] = useState<string | null>(null);
  const [previewAttempt,setPreviewAttempt] = useState(0);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const sequence = ++request.current;
    try {
      const value = await apiClient.get<Status>(base,undefined,{ skipErrorToast: true,cache: 'no-store' });
      if (!value?.personaId || !Array.isArray(value.historial)) throw new Error('La consulta de fotos no está disponible. Actualice para reintentar.');
      if (request.current === sequence) { setLoaded({ base,data: value }); setError(''); }
    } catch (e: any) { if (request.current === sequence) setError(e.message || 'No fue posible consultar la foto.'); }
  },[base]);
  useEffect(() => { setNote(''); setNotice(''); refresh(); const off = onPhotoChanged(refresh); return () => { ++request.current; off(); }; },[refresh]);
  const candidate = data?.solicitud;
  useEffect(() => {
    let active = true;
    setPreview(null); setPreviewReady(null); setPreviewError(''); setNote('');
    if (candidate && candidate.id !== data?.publicada?.id) {
      apiClient.get<{ url: string }>(`${base}/versiones/${candidate.id}`,undefined,{ skipErrorToast: true,cache: 'no-store' })
        .then(result => { if (active) setPreview({ id: candidate.id,url: result.url }); })
        .catch(() => { if (active) setPreviewError('No se pudo cargar la imagen. Actualice para revisarla antes de decidir.'); });
    }
    return () => { active=false; };
  },[base,candidate?.id,data?.publicada?.id,previewAttempt]);

  const retry = () => { setPreviewAttempt(attempt => attempt + 1); void refresh(); };

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value=''; if (!file || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await validatePhotoFile(file);
      const form = new FormData(); form.append('file',file);
      await apiClient.upload(base,form);
      setNotice('Foto enviada. Queda pendiente de validación del grupo; la foto publicada se conserva.');
      photoChanged(); await refresh(); onChanged?.();
    } catch (e: any) { setError(e.message || 'No se pudo cargar la foto.'); }
    finally { setBusy(false); }
  };
  const decide = async (estado: 'APROBADA'|'RECHAZADA') => {
    if (!candidate || (estado === 'APROBADA' && previewReady !== candidate.id) || error || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await apiClient.post(`${base}/versiones/${candidate.id}/decision`,{ estado,observacion: note },{ retries: 0 });
      setNotice(estado === 'APROBADA' ? 'Foto aprobada y publicada en PTA y RUND.' : 'Foto rechazada. Se conserva la última foto aprobada.');
      photoChanged(); await refresh(); onChanged?.();
    } catch (e: any) { await refresh(); setError(e.message || 'No fue posible guardar la decisión.'); }
    finally { setBusy(false); }
  };

  return <section className="rund-photo" aria-label="Foto de perfil" aria-busy={busy}>
    <div className="rund-photo-heading"><h4><Camera size={19} /> Foto de perfil</h4><button type="button" disabled={busy} onClick={retry} aria-label="Actualizar foto y solicitud"><RefreshCw size={15} /> Actualizar</button></div>
    <p>La nueva foto se publica únicamente cuando un usuario con el permiso de validación de fotos RUND la aprueba.</p>
    {error && <p role="alert" className="rund-photo-error">{error}</p>}
    {notice && <p role="status" className="rund-photo-success">{notice}</p>}
    {!data && !error && <p role="status">Consultando foto…</p>}
    {data && <>
      <div className="rund-photo-grid">
        <div className="rund-photo-card"><strong>Foto publicada</strong><PublishedAvatar personaId={data.personaId} name={name} size={96} /><span>{data.publicada ? 'Última foto aprobada' : 'Sin foto aprobada; se muestran las iniciales'}</span></div>
        <div className="rund-photo-card"><strong>{candidate && candidate.id !== data.publicada?.id ? labels[candidate.estado] : 'Nueva solicitud'}</strong>
          {candidate && candidate.id !== data.publicada?.id ? <>
            {preview?.id === candidate.id ? <img className="rund-photo-preview" src={preview.url} alt="Foto propuesta para revisión" onLoad={() => setPreviewReady(candidate.id)} onError={() => { setPreview(null); setPreviewReady(null); setPreviewError('No se pudo leer la imagen. Solicite una nueva foto válida antes de aprobar.'); }} /> : <p role={previewError ? 'alert' : 'status'}>{previewError || 'Cargando vista previa…'}</p>}
            <span>{candidate.nombre} · {candidate.ancho} × {candidate.alto} px</span>
            <small>Origen: {candidate.origen} · {new Date(candidate.creado_en).toLocaleString('es-CO')}</small>
            {candidate.observacion && <p className="rund-photo-error">Observación: {candidate.observacion}</p>}
          </> : <span>No hay una foto pendiente de validación.</span>}
        </div>
      </div>
      {(own || canUpload) && <div className="rund-photo-upload"><label>Seleccionar nueva foto<input aria-label="Seleccionar nueva foto" type="file" accept={PHOTO_ACCEPT} disabled={busy} onChange={upload} /></label><p>{PHOTO_HELP}</p><small>Si existe una solicitud pendiente, la nueva carga la reemplaza. La foto aprobada permanece publicada.</small></div>}
      {canValidate && !own && candidate?.estado === 'PENDIENTE' && <div className="rund-photo-review">
        <label>Observación de revisión (obligatoria para rechazar)<textarea maxLength={1000} value={note} disabled={busy} onChange={event=>setNote(event.target.value)} placeholder="Explique qué debe corregir el docente" /></label>
        <div className="rund-photo-actions"><button type="button" disabled={busy || !!error || previewReady !== candidate.id} onClick={()=>decide('APROBADA')}><CheckCircle size={16} /> Aprobar foto</button><button type="button" disabled={busy || !!error || note.trim().length < 5} onClick={()=>decide('RECHAZADA')}><XCircle size={16} /> Rechazar foto</button></div>
      </div>}
      {data.historial.length > 0 && <details><summary>Historial de fotos ({data.historial.length})</summary><ul>{data.historial.map(photo=><li key={photo.id}><strong>{labels[photo.estado]}</strong> · {photo.nombre} · {photo.origen} · {new Date(photo.creado_en).toLocaleString('es-CO')}{photo.observacion && <span> · {photo.observacion}</span>}</li>)}</ul></details>}
    </>}
  </section>;
}

export function RundPhotoInbox() {
  const [page,setPage] = useState(1);
  const [data,setData] = useState<{ items: any[]; total: number }>({ items: [],total: 0 });
  const [selected,setSelected] = useState<any>(null);
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(true);
  const request = useRef(0);
  const refresh = useCallback(async()=>{
    const sequence = ++request.current;
    setLoading(true);
    try {
      const value = await apiClient.get<{ items: any[]; total: number }>(`${PHOTO_API}/pendientes`,{ page },{ skipErrorToast: true,cache: 'no-store' });
      if (!Array.isArray(value?.items) || !Number.isFinite(value.total)) throw new Error('No fue posible leer la bandeja de fotos.');
      if (request.current === sequence) { setData(value); setError(''); }
    }
    catch(e: any) { if (request.current === sequence) setError(e.message || 'No se pudo consultar la bandeja.'); }
    finally { if (request.current === sequence) setLoading(false); }
  },[page]);
  useEffect(()=>{ refresh(); const off = onPhotoChanged(refresh); return () => { ++request.current; off(); }; },[refresh]);
  return <div className="rund-photo-inbox"><div className="rund-photo-heading"><h3>Fotos pendientes de validación ({data.total})</h3><button type="button" onClick={refresh} disabled={loading}>Actualizar bandeja</button></div>
    <p>Solicitudes de PTA, Identidad RUND y carga masiva. La decisión se aplica a la persona en todos sus periodos.</p>
    {error && <p role="alert">{error}</p>}{loading && <p role="status">Consultando solicitudes…</p>}
    {!loading && !error && !data.items.length && <p>No hay fotos pendientes en esta página.</p>}
    <div className="rund-photo-requests">{data.items.map(item=><button type="button" key={item.id} onClick={()=>setSelected(item)}><strong>{item.nombre_persona}</strong><span>{item.origen} · {new Date(item.creado_en).toLocaleString('es-CO')}</span><span>Revisar foto</span></button>)}</div>
    <div className="rund-photo-actions"><button type="button" disabled={page===1 || loading} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>Página {page}</span><button type="button" disabled={page*20>=data.total || loading} onClick={()=>setPage(p=>p+1)}>Siguiente</button></div>
    {selected && <><button type="button" onClick={()=>setSelected(null)}>Cerrar revisión</button><RundPhotoPanel key={selected.persona_id} docenteId={selected.persona_id} name={selected.nombre_persona} canValidate onChanged={refresh} /></>}
  </div>;
}

export function RundPhotoBulkUpload() {
  const [files,setFiles] = useState<File[]>([]);
  const [results,setResults] = useState<any[]>([]);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const upload = async()=>{
    setBusy(true); setError(''); setResults([]);
    try {
      for (const file of files) await validatePhotoFile(file);
      const form = new FormData(); files.forEach(file=>form.append('files',file));
      const data = await apiClient.upload<{ results: any[] }>(`${PHOTO_API}/masiva`,form);
      setResults(data.results); setFiles([]); photoChanged();
    } catch(e: any) { setError(e.message || 'No fue posible cargar las fotos.'); }
    finally { setBusy(false); }
  };
  return <section className="rund-photo" aria-label="Carga masiva de fotos"><h3><Upload size={18} /> Carga masiva de fotos</h3><p>Registre primero los docentes. Seleccione hasta 20 fotos por lote con el número de documento como nombre: <strong>12345678.jpg</strong>. Cada foto queda pendiente de aprobación.</p><p>{PHOTO_HELP}</p>
    <input aria-label="Seleccionar fotos para carga masiva" type="file" multiple accept={PHOTO_ACCEPT} disabled={busy} onChange={event=>{ const picked=Array.from(event.target.files || []); event.target.value=''; setResults([]); if (picked.length>20) { setError('Seleccione máximo 20 fotos por lote.'); setFiles([]); } else { setError(''); setFiles(picked); } }} />
    <p>{files.length} fotos seleccionadas</p><button type="button" onClick={upload} disabled={busy || !files.length}>{busy ? 'Enviando fotos…' : 'Enviar fotos a validación'}</button>
    {error && <p role="alert" className="rund-photo-error">{error}</p>}{results.length>0 && <ul role="status">{results.map((result,index)=><li key={index}>{result.nombre}: {result.success ? 'Pendiente de validación' : result.message}</li>)}</ul>}
  </section>;
}
