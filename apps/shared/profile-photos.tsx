import React, { useEffect, useState } from 'react';
import { apiClient } from '../shell/src/services/api';

export const PHOTO_API = '/pta/api/v1/pta/fotos-perfil';
export const PHOTO_MANAGE = 'banco-docentes.rund.photos.manage';
export const PHOTO_VALIDATE = 'banco-docentes.rund.photos.validate';
export const PHOTO_ACCEPT = 'image/png,image/jpeg,.png,.jpg,.jpeg';
export const PHOTO_HELP = 'PNG o JPEG (.png, .jpg, .jpeg). Máximo 2 MB. Cada lado debe medir entre 200 y 4096 píxeles. Recomendado: 600 × 600 píxeles, rostro centrado y fondo claro.';
const changedEvent = 'esap:profile-photo-changed';
const publishedCache = new Map<string, { at: number; result: Promise<{ id: string | null; url: string | null }> }>();

export function photoChanged() {
  publishedCache.clear();
  window.dispatchEvent(new Event(changedEvent));
  try { localStorage.setItem(changedEvent, String(Date.now())); } catch { /* Browser privacy mode. */ }
}

export function onPhotoChanged(callback: () => void) {
  const handleChanged = () => { publishedCache.clear(); callback(); };
  const handleStorage = (event: StorageEvent) => { if (event.key === changedEvent) { publishedCache.clear(); callback(); } };
  window.addEventListener(changedEvent,handleChanged);
  window.addEventListener('storage',handleStorage);
  window.addEventListener('focus',callback);
  const timer = window.setInterval(callback,60_000);
  return () => { window.removeEventListener(changedEvent,handleChanged); window.removeEventListener('storage',handleStorage); window.removeEventListener('focus',callback); window.clearInterval(timer); };
}

export function usePublishedPhoto(personaId?: string, enabled = true) {
  const [photo,setPhoto] = useState<{ key: string; url: string | null } | null>(null);
  const key = personaId || 'mia';
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let sequence = 0;
    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      const current = ++sequence;
      const cached = publishedCache.get(key);
      const result = cached && Date.now()-cached.at < 15_000 ? cached.result
        : apiClient.get<{ id: string | null; url: string | null }>(`${PHOTO_API}/${personaId ? `personas/${encodeURIComponent(personaId)}` : 'mia'}/publicada`,undefined,{ skipErrorToast: true, cache: 'no-store' });
      publishedCache.set(key,{ at: Date.now(),result });
      result.then(data => { if (active && current === sequence) setPhoto({ key,url: data.url }); }).catch(() => { publishedCache.delete(key); if (active && current === sequence) setPhoto({ key,url: null }); });
    };
    refresh();
    const unsubscribe = onPhotoChanged(refresh);
    return () => { active = false; unsubscribe(); };
  },[key,personaId,enabled]);
  return enabled && photo?.key === key ? photo.url : null;
}

/** Every avatar reads only the server's approved version. */
export function PublishedAvatar({ personaId, name = '', size = 40, own = false }: { personaId?: string; name?: string; size?: number; own?: boolean }) {
  const url = usePublishedPhoto(personaId,Boolean(personaId) || own);
  const [broken,setBroken] = useState<string | null>(null);
  const initials = name.trim().split(/\s+/).slice(0,2).map(part => part[0]).join('') || 'U';
  return <span style={{ width: size,height: size,borderRadius: '50%',display: 'inline-flex',alignItems: 'center',justifyContent: 'center',flexShrink: 0,overflow: 'hidden',background: '#e0edff',color: '#003da5',fontWeight: 700 }}>
    {url && url !== broken ? <img src={url} alt={`Foto de ${name || 'perfil'}`} style={{ width: '100%',height: '100%',objectFit: 'cover' }} onError={() => setBroken(url)} /> : initials}
  </span>;
}

export async function validatePhotoFile(file: File) {
  if (!['image/png','image/jpeg'].includes(file.type) || !/\.(png|jpe?g)$/i.test(file.name) || !file.size || file.size > 2*1024*1024)
    throw new Error(PHOTO_HELP);
  const src = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve,reject) => { image.onload=()=>resolve(); image.onerror=()=>reject(new Error('No se pudo leer la imagen. Seleccione un PNG o JPEG válido.')); image.src=src; });
    if (image.naturalWidth < 200 || image.naturalHeight < 200 || image.naturalWidth > 4096 || image.naturalHeight > 4096)
      throw new Error(PHOTO_HELP);
  } finally { URL.revokeObjectURL(src); }
}

export async function uploadOwnPhoto(file: File) {
  await validatePhotoFile(file);
  const form = new FormData(); form.append('file',file);
  const result = await apiClient.upload<any>(`${PHOTO_API}/mia`,form);
  photoChanged();
  return result;
}
