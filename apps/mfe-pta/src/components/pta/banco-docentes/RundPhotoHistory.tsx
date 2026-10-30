import React, { useEffect, useState } from 'react';
import { Eye, ImageOff, Loader2 } from 'lucide-react';
import { apiClient } from '../../../../../shell/src/services/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../../../shell/src/components/ui/dialog';

export type RundProfilePhoto = {
  id: string; nombre: string; estado: string; origen: string; creado_en: string;
  revisado_en?: string | null; observacion?: string | null; ancho: number; alto: number;
  creado_por?: string; revisado_por?: string | null;
  creadoPorNombre?: string; revisadoPorNombre?: string | null;
};

export const PHOTO_STATUS_LABELS: Record<string,string> = {
  PENDIENTE: 'Pendiente de validación', APROBADA: 'Aprobada', RECHAZADA: 'Rechazada',
  REEMPLAZADA: 'Solicitud reemplazada', ARCHIVADA: 'Aprobada anteriormente',
};
export function photoSourceLabel(origin: string) {
  return ({ PTA: 'Portal del docente (PTA)', RUND: 'Módulo RUND', MASIVA: 'Carga masiva RUND' } as Record<string,string>)[origin] || 'Origen no disponible';
}
function photoDate(value?: string | null) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return 'Fecha no disponible';
  return new Date(value).toLocaleString('es-CO', { timeZone: 'America/Bogota' });
}
function reviewLabel(photo: RundProfilePhoto) {
  if (photo.estado === 'RECHAZADA') return 'Rechazada por';
  if (['APROBADA','ARCHIVADA'].includes(photo.estado)) return 'Aprobada por';
  return 'Revisada por';
}

function PhotoHistoryItem({ base, photo, onView }: {
  base: string; photo: RundProfilePhoto; onView: (photo: RundProfilePhoto, url: string) => void;
}) {
  const [preview,setPreview] = useState<string | null>(null);
  const [loading,setLoading] = useState(true);
  const [failed,setFailed] = useState(false);
  const [attempt,setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setPreview(null); setLoading(true); setFailed(false);
    apiClient.get<{ url: string }>(`${base}/versiones/${encodeURIComponent(photo.id)}`, undefined, { skipErrorToast: true, cache: 'no-store', retries: 0 })
      .then(result => { if (active) { if (!result?.url) setFailed(true); else setPreview(result.url); } })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [base,photo.id,attempt]);
  const reviewed = Boolean(photo.revisado_por || photo.revisado_en || ['APROBADA','ARCHIVADA','RECHAZADA'].includes(photo.estado));
  return <li className="rund-photo-history-item">
    <div className="rund-photo-history-image">
      <div className="rund-photo-history-thumbnail">
        {loading ? <span role="status"><Loader2 size={22} aria-hidden="true" /> Cargando foto…</span>
          : failed || !preview ? <span><ImageOff size={24} aria-hidden="true" /> Vista previa no disponible</span>
          : <img src={preview} alt={`Miniatura de ${photo.nombre}`} loading="lazy" onError={() => setFailed(true)} />}
      </div>
      {failed ? <button type="button" className="rund-photo-history-view" onClick={() => setAttempt(value => value + 1)} aria-label={`Reintentar vista previa de ${photo.nombre}`}>Reintentar</button>
        : <button type="button" className="rund-photo-history-view" disabled={loading || !preview} onClick={() => preview && onView(photo,preview)} aria-label={`Ver foto ${photo.nombre}`}><Eye size={14} aria-hidden="true" /> Ver foto</button>}
    </div>
    <div className="rund-photo-history-info">
      <div className="rund-photo-history-heading"><strong>{photo.nombre}</strong><span className="rund-photo-history-status" data-state={photo.estado}>{PHOTO_STATUS_LABELS[photo.estado] || 'Estado no disponible'}</span></div>
      <dl className="rund-photo-history-metadata">
        <div><dt>Origen</dt><dd>{photoSourceLabel(photo.origen)}</dd></div>
        <div><dt>Cargada por</dt><dd>{photo.creadoPorNombre || 'Usuario no disponible'}</dd></div>
        <div><dt>Fecha de carga</dt><dd>{photoDate(photo.creado_en)}</dd></div>
        {reviewed ? <>
          <div><dt>{reviewLabel(photo)}</dt><dd>{photo.revisadoPorNombre || 'Usuario no disponible'}</dd></div>
          <div><dt>Fecha de revisión</dt><dd>{photoDate(photo.revisado_en)}</dd></div>
        </> : <div><dt>Revisión</dt><dd>{photo.estado === 'REEMPLAZADA' ? 'Reemplazada antes de su validación' : 'Pendiente de validación del grupo'}</dd></div>}
      </dl>
      {photo.observacion && <p className="rund-photo-history-observation"><strong>Observación:</strong> {photo.observacion}</p>}
    </div>
  </li>;
}

const PAGE_SIZE = 6;
export function RundPhotoHistory({ base, photos }: { base: string; photos: RundProfilePhoto[] }) {
  const [page,setPage] = useState(1);
  const [viewing,setViewing] = useState<{ photo: RundProfilePhoto; url: string } | null>(null);
  const pages = Math.max(1, Math.ceil(photos.length / PAGE_SIZE));
  const current = Math.min(page,pages);
  const start = (current - 1) * PAGE_SIZE;
  return <div className="rund-photo-history">
    <p className="rund-photo-history-help">Consulta cada foto, su origen y los responsables de la carga y revisión. Fechas y horas de Colombia.</p>
    <ul className="rund-photo-history-list">{photos.slice(start,start + PAGE_SIZE).map(photo => <PhotoHistoryItem key={photo.id} base={base} photo={photo} onView={(photo,url) => setViewing({ photo,url })} />)}</ul>
    {pages > 1 && <nav className="rund-photo-actions" aria-label="Páginas del historial de fotos">
      <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)}>Fotos anteriores</button>
      <span role="status">{start + 1}–{Math.min(start + PAGE_SIZE,photos.length)} de {photos.length} registros disponibles</span>
      <button type="button" disabled={current === pages} onClick={() => setPage(current + 1)}>Más fotos</button>
    </nav>}
    <Dialog open={Boolean(viewing)} onOpenChange={open => { if (!open) setViewing(null); }}>
      <DialogContent style={{ width: 'calc(100vw - 32px)', maxWidth: 800, maxHeight: 'calc(100dvh - 6rem)', overflowY: 'auto' }}>
        <DialogHeader><DialogTitle>Foto del historial</DialogTitle><DialogDescription>{viewing?.photo.nombre} · {viewing ? PHOTO_STATUS_LABELS[viewing.photo.estado] : ''} · {viewing ? photoSourceLabel(viewing.photo.origen) : ''}</DialogDescription></DialogHeader>
        {viewing && <img src={viewing.url} alt={`Foto histórica: ${viewing.photo.nombre}`} style={{ width: '100%', maxHeight: '65dvh', objectFit: 'contain', borderRadius: 8, background: '#f1f5f9' }} />}
      </DialogContent>
    </Dialog>
  </div>;
}
