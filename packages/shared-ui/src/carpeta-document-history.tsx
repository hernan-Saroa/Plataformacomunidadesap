import { useEffect, useState } from 'react';

type Result = { success: boolean; data?: any; error?: string };
export function CarpetaDocumentHistory({ documentId, name, onClose, load, download, replace, restore, onChanged }: {
  documentId: string; name: string; onClose: () => void;
  load: (id: string) => Promise<Result>; download: (id: string, version: string) => Promise<Result>;
  replace?: (id: string, file: File, comments?: string) => Promise<Result>;
  restore?: (id: string, version: string, comments?: string) => Promise<Result>;
  onChanged?: () => void;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [canRestore, setCanRestore] = useState(false);
  const [revision, setRevision] = useState(0);
  const [working, setWorking] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [comments, setComments] = useState('');
  const [selectedRestore, setSelectedRestore] = useState<any>(null);
  useEffect(() => {
    let current = true;
    setRows([]); setError(''); setLoading(true); setCanRestore(false);
    load(documentId).then(result => {
      if (!current) return;
      if (!result.success) setError(result.error || 'No se pudo consultar el historial.');
      else { setRows(result.data?.versiones || []); setCanRestore(result.data?.permite_restaurar === true); }
    }).catch(() => { if (current) setError('No se pudo consultar el historial.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [documentId, load, revision]);
  const change = async (work: () => Promise<Result>) => {
    if (working) return;
    setWorking(true); setError('');
    try {
      const result = await work();
      if (!result.success) { setError(result.error || 'No se pudo guardar la nueva versión.'); return; }
      setFile(null); setSelectedRestore(null); setComments(''); setRevision(value => value + 1); onChanged?.();
    } catch { setError('No se pudo guardar la nueva versión.'); }
    finally { setWorking(false); }
  };
  const getOriginal = async (version: string) => {
    try {
      const result = await download(documentId, version);
      if (!result.success || !result.data?.url) { setError(result.error || 'No se pudo descargar la versión.'); return; }
      window.open(result.data.url, '_blank', 'noopener,noreferrer');
    } catch { setError('No se pudo descargar la versión.'); }
  };
  return <div role="dialog" aria-label="Historial de versiones" style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#0008', display: 'grid', placeItems: 'center', padding: 16 }}>
    <div style={{ background: 'white', color: '#172033', borderRadius: 16, width: 'min(620px,100%)', maxHeight: '85vh', overflow: 'auto', padding: 24 }}>
      <h3>Historial de versiones</h3><p>{name}</p>
      {loading && <p role="status">Consultando versiones…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && rows.length === 0 && <p>No hay versiones disponibles.</p>}
      {rows.map(row => <div key={row.id} style={{ borderTop: '1px solid #ddd', padding: '12px 0' }}>
        <strong>Versión {row.numero_version}{row.es_version_actual ? ' · vigente' : ''}</strong>
        <p>{row.nombre_archivo}</p><p>{row.fecha_creacion ? new Date(row.fecha_creacion).toLocaleString() : ''}</p>
        {row.comentarios && <p>{row.comentarios}</p>}
        <button type="button" onClick={() => void getOriginal(row.id)}>Descargar versión {row.numero_version}</button>
        {canRestore && restore && !row.es_version_actual && <button type="button" disabled={working} onClick={() => setSelectedRestore(row)}>Restaurar versión {row.numero_version}</button>}
      </div>)}
      {canRestore && replace && <div style={{ marginTop: 16 }}>
        <label>Archivo para una nueva versión<input key={revision} aria-label="Archivo para una nueva versión" type="file" disabled={working} onChange={event => setFile(event.target.files?.[0] || null)} /></label>
        <label>Comentarios<textarea aria-label="Comentarios de la versión" disabled={working} value={comments} onChange={event => setComments(event.target.value)} /></label>
        <p>El original anterior se conserva. La nueva versión queda pendiente de validación.</p>
        <button type="button" disabled={!file || working} onClick={() => file && void change(() => replace(documentId, file, comments))}>Guardar nueva versión</button>
      </div>}
      {selectedRestore && canRestore && restore && <div style={{ marginTop: 16 }}>
        <p>Se creará una nueva versión con el contenido de la versión {selectedRestore.numero_version}. Las versiones anteriores se conservan y el documento queda pendiente de validación.</p>
        <button type="button" disabled={working} onClick={() => void change(() => restore(documentId, selectedRestore.id, comments))}>Confirmar restauración</button>
        <button type="button" disabled={working} onClick={() => setSelectedRestore(null)}>Cancelar restauración</button>
      </div>}
      {working && <p role="status">Guardando versión…</p>}
      <button type="button" onClick={onClose} style={{ marginTop: 20 }}>Cerrar</button>
    </div>
  </div>;
}
