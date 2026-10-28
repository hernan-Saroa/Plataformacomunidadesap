/**
 * Icono y etiqueta según el tipo de contenido de un recurso del Centro de Ayuda.
 */
import {
  FileSpreadsheet,
  FileText,
  FileType,
  Keyboard,
  Link2,
  Presentation,
  Video,
  type LucideIcon,
} from 'lucide-react';
import type {
  RecursoCentroAyuda,
  TipoSeccion,
} from '../../../services/api/centroAyuda.service';
import { iconoDeSeccion } from './IconoSeccion';

/** La sección del recurso: su tipo decide el icono de los atajos y su icono el de los textos. */
export interface SeccionDelRecurso {
  tipo: TipoSeccion;
  icono: string;
}

type DatosDeTipo = Pick<RecursoCentroAyuda, 'archivo' | 'enlace'>;

export interface TipoRecurso {
  Icono: LucideIcon;
  etiqueta: string;
  /** Clases de fondo y color del icono. */
  tono: string;
}

export function tipoDeRecurso(recurso: DatosDeTipo, seccion?: SeccionDelRecurso): TipoRecurso {
  if (seccion?.tipo === 'atajos') {
    return { Icono: Keyboard, etiqueta: 'Atajo', tono: 'bg-blue-50 text-[#1e5da8]' };
  }
  const archivo = recurso.archivo;
  if (archivo) {
    if (archivo.esVideo) return { Icono: Video, etiqueta: 'Video', tono: 'bg-purple-50 text-purple-600' };
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
  // Solo texto: el icono de su sección dice más que uno de documento genérico
  return { Icono: iconoDeSeccion(seccion?.icono), etiqueta: 'Texto', tono: 'bg-blue-50 text-[#1e5da8]' };
}

export function tamanoLegible(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function IconoRecurso({ recurso, seccion, className = 'h-5 w-5' }: {
  recurso: DatosDeTipo;
  seccion?: SeccionDelRecurso;
  className?: string;
}) {
  const { Icono, tono } = tipoDeRecurso(recurso, seccion);
  return (
    <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${tono}`}>
      <Icono className={className} />
    </span>
  );
}
