/**
 * Icono y etiqueta según el tipo de contenido de un recurso del Centro de Ayuda.
 */
import {
  FileSpreadsheet,
  FileText,
  FileType,
  Link2,
  Presentation,
  Video,
  type LucideIcon,
} from 'lucide-react';
import type { RecursoCentroAyuda } from '../../../services/api/centroAyuda.service';

export interface TipoRecurso {
  Icono: LucideIcon;
  etiqueta: string;
  /** Clases de fondo y color del icono. */
  tono: string;
}

export function tipoDeRecurso(recurso: Pick<RecursoCentroAyuda, 'archivo' | 'enlace'>): TipoRecurso {
  const archivo = recurso.archivo;
  if (archivo) {
    if (archivo.esVideo) return { Icono: Video, etiqueta: 'Video', tono: 'bg-rose-50 text-rose-600' };
    const ext = (archivo.nombre.split('.').pop() || '').toLowerCase();
    if (ext === 'pdf') return { Icono: FileText, etiqueta: 'PDF', tono: 'bg-red-50 text-red-600' };
    if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) {
      return { Icono: FileSpreadsheet, etiqueta: 'Hoja de cálculo', tono: 'bg-emerald-50 text-emerald-600' };
    }
    if (['ppt', 'pptx', 'odp'].includes(ext)) {
      return { Icono: Presentation, etiqueta: 'Presentación', tono: 'bg-orange-50 text-orange-600' };
    }
    return { Icono: FileType, etiqueta: 'Documento', tono: 'bg-blue-50 text-[#1e5da8]' };
  }
  if (recurso.enlace) return { Icono: Link2, etiqueta: 'Enlace', tono: 'bg-indigo-50 text-indigo-600' };
  return { Icono: FileText, etiqueta: 'Texto', tono: 'bg-slate-100 text-slate-600' };
}

export function tamanoLegible(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function IconoRecurso({ recurso, className = 'h-5 w-5' }: { recurso: Pick<RecursoCentroAyuda, 'archivo' | 'enlace'>; className?: string }) {
  const { Icono, tono } = tipoDeRecurso(recurso);
  return (
    <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${tono}`}>
      <Icono className={className} />
    </span>
  );
}
