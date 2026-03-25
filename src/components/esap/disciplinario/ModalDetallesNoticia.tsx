/**
 * ═══════════════════════════════════════════════════════════════
 * MODAL DETALLES DE NOTICIA — World Class
 * ═══════════════════════════════════════════════════════════════
 * 
 * Modal completo que muestra TODOS los datos ingresados durante
 * la creación de una noticia disciplinaria, incluyendo:
 * - Datos básicos (origen, territorial, fechas, conducta)
 * - Múltiples denunciados con apoderados
 * - Múltiples denunciantes con apoderados
 * - Hechos separados
 * - Archivos adjuntos
 * - Proceso asociado
 * 
 * Patrón canónico: createPortal, z-[200], rgba overlay
 * ═══════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  X, FileText, User, AlertTriangle, ClipboardList, Calendar,
  MapPin, Building2, Paperclip, FileEdit, PlusCircle,
  CheckCircle, Phone, Mail, Briefcase,
  Scale, Clock, FileWarning, Download, Eye, Users, Gavel
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TIPOS (extendidos para datos completos de creación)
// ═══════════════════════════════════════════════════════════════

interface Apoderado {
  nombre: string;
  cedula: string;
  correo: string;
  celular: string;
}

interface DenunciadoCompleto {
  id: string;
  nombre: string;
  identificacion: string;
  cargo: string;
  lugarHechos: string;
  apoderado?: Apoderado;
}

interface DenuncianteCompleto {
  id: string;
  nombre: string;
  identificacion: string;
  direccion: string;
  telefono: string;
  correo: string;
  cargo: string;
  entidad: string;
  tipo: 'Denunciante' | 'Víctima';
  apoderado?: Apoderado;
}

interface HechoSeparado {
  id: string;
  descripcion: string;
  fecha?: string;
}

interface ArchivoAdjunto {
  nombre: string;
  tipo: string;
  tamano: number;
  fechaSubida: string;
}

export interface NoticiaCompleta {
  id: string;
  numero: string;
  fechaRecepcion: string;
  origen: string;
  denunciante: any;
  denunciado: any;
  hechos: string;
  estado: string;
  prioridad: 'alta' | 'media' | 'baja';
  diasPendientes: number;
  tipo: 'noticia';
  procesoAsociado?: {
    id: string;
    numeroProceso: string;
    fechaAsociacion: string;
    justificacion: string;
  };
  // Campos extendidos de creación
  territorial?: string;
  fechaHechos?: string;
  cargo?: string;
  dependencia?: string;
  conductaSeleccionada?: string;
  conductaPersonalizada?: string;
  denunciados?: DenunciadoCompleto[];
  denunciantes?: DenuncianteCompleto[];
  hechosSeparados?: HechoSeparado[];
  archivosAdjuntos?: ArchivoAdjunto[];
  radicador?: string;
  fechaRegistro?: string;
}

interface ModalDetallesNoticiaProps {
  noticia: NoticiaCompleta;
  onClose: () => void;
  onEditar: (noticia: NoticiaCompleta) => void;
  onConvertir: (noticia: NoticiaCompleta) => void;
}

type TabNoticia = 'general' | 'personas' | 'hechos' | 'adjuntos';

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export function ModalDetallesNoticia({ noticia, onClose, onEditar, onConvertir }: ModalDetallesNoticiaProps) {
  const [tabActiva, setTabActiva] = useState<TabNoticia>('general');
  
  // ✅ Validación defensiva: asegurar que noticia existe y tiene la estructura esperada
  const n = noticia || {
    id: '',
    numero: '',
    fechaRecepcion: '',
    origen: '',
    denunciante: null,
    denunciado: null,
    hechos: '',
    estado: 'pendiente',
    prioridad: 'media',
    diasPendientes: 0,
    tipo: 'noticia'
  };

  // Extraer datos de persona (compatibilidad con formato string o Persona)
  const getDenuncianteNombre = () => {
    if (typeof n.denunciante === 'string') return n.denunciante || 'Sin información';
    return n.denunciante?.nombre || 'Sin información';
  };
  const getDenunciadoNombre = () => {
    if (typeof n.denunciado === 'string') return n.denunciado || 'Sin información';
    return n.denunciado?.nombre || 'Sin información';
  };
  const getDenunciadoId = () => {
    if (typeof n.denunciado !== 'string' && n.denunciado?.numeroIdentificacion) {
      return `${n.denunciado.tipoIdentificacion || 'CC'}: ${n.denunciado.numeroIdentificacion}`;
    }
    return '';
  };
  const getDenuncianteId = () => {
    if (typeof n.denunciante !== 'string' && n.denunciante?.numeroIdentificacion) {
      return `${n.denunciante.tipoIdentificacion || 'CC'}: ${n.denunciante.numeroIdentificacion}`;
    }
    return '';
  };

  const prioridadMeta: Record<string, { bg: string; text: string; border: string; label: string }> = {
    alta:  { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5', label: 'ALTA' },
    media: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D', label: 'MEDIA' },
    baja:  { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7', label: 'BAJA' },
  };
  const prioridadValue = n.prioridad || 'media';
  const pm = prioridadMeta[prioridadValue] || prioridadMeta.media;

  const estadoMeta: Record<string, { bg: string; text: string; label: string }> = {
    'pendiente':      { bg: '#FEF3C7', text: '#92400E', label: 'Pendiente' },
    'en-valoracion':  { bg: '#DBEAFE', text: '#1E40AF', label: 'En Valoración' },
    'asignada':       { bg: '#D1FAE5', text: '#065F46', label: 'Asignada' },
    'archivada':      { bg: '#F3F4F6', text: '#374151', label: 'Archivada' },
    'remitida':       { bg: '#EDE9FE', text: '#7C3AED', label: 'Remitida' },
  };
  const estadoValue = n.estado || 'pendiente';
  const em = estadoMeta[estadoValue] || estadoMeta.pendiente;

  // Conteos para badges en tabs
  const cantDenunciados = n.denunciados?.length || (n.denunciado ? 1 : 0);
  const cantDenunciantes = n.denunciantes?.length || (n.denunciante ? 1 : 0);
  const cantHechos = n.hechosSeparados?.length || (n.hechos ? 1 : 0);
  const cantAdjuntos = n.archivosAdjuntos?.length || 0;

  const tabs: { id: TabNoticia; label: string; icon: any; count?: number }[] = [
    { id: 'general', label: 'General', icon: FileText },
    { id: 'personas', label: 'Personas', icon: Users, count: cantDenunciados + cantDenunciantes },
    { id: 'hechos', label: 'Hechos', icon: ClipboardList, count: cantHechos },
    { id: 'adjuntos', label: 'Adjuntos', icon: Paperclip, count: cantAdjuntos },
  ];

  // Fecha de caducidad (5 años desde fecha de hechos)
  const fechaCaducidad = n.fechaHechos ? (() => {
    const f = new Date(n.fechaHechos);
    f.setFullYear(f.getFullYear() + 5);
    return f.toISOString().split('T')[0];
  })() : null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return createPortal(
    <motion.div
      key="noticia-detalles-wc-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.60)', padding: '4vh 4vw' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '92vw', height: '88vh', maxWidth: 720, maxHeight: '95vh', minHeight: 'min(480px, 80vh)' }}
      >
        {/* ── Header ── */}
        <div
          className="px-5 py-3 flex items-center justify-between flex-shrink-0 border-b border-gray-200"
          style={{ background: 'linear-gradient(135deg, #001A6E 0%, #003DA5 100%)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/10">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black text-white">{n.numero}</span>
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase"
                  style={{ backgroundColor: em.bg, color: em.text }}>
                  {em.label}
                </span>
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase border"
                  style={{ backgroundColor: pm.bg, color: pm.text, borderColor: pm.border }}>
                  {pm.label}
                </span>
              </div>
              <p className="text-[11px] text-blue-200 mt-0.5 truncate">
                {n.origen} · {getDenunciadoNombre()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0 ml-2"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTabActiva(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                tabActiva === tab.id
                  ? 'text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
              style={tabActiva === tab.id ? { backgroundColor: '#003DA5' } : {}}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                  tabActiva === tab.id ? 'bg-white/20 text-white' : 'bg-gray-300 text-gray-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Contenido ── */}
        <div className="flex-1 overflow-y-auto p-5 min-h-0">
          {tabActiva === 'general' && (
            <TabGeneral
              n={n}
              pm={pm}
              em={em}
              fechaCaducidad={fechaCaducidad}
              cantAdjuntos={cantAdjuntos}
              getDenuncianteNombre={getDenuncianteNombre}
              getDenunciadoNombre={getDenunciadoNombre}
              getDenuncianteId={getDenuncianteId}
              getDenunciadoId={getDenunciadoId}
            />
          )}
          {tabActiva === 'personas' && (
            <TabPersonas
              n={n}
              getDenuncianteNombre={getDenuncianteNombre}
              getDenunciadoNombre={getDenunciadoNombre}
              getDenuncianteId={getDenuncianteId}
              getDenunciadoId={getDenunciadoId}
            />
          )}
          {tabActiva === 'hechos' && <TabHechos n={n} />}
          {tabActiva === 'adjuntos' && <TabAdjuntos n={n} formatFileSize={formatFileSize} />}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-all"
            >
              <X className="w-3.5 h-3.5" />
              Cerrar
            </button>
            <span className="text-[10px] text-gray-400">
              Radicado {n.fechaRegistro ? new Date(n.fechaRegistro).toLocaleDateString('es-CO') : new Date(n.fechaRecepcion).toLocaleDateString('es-CO')}
              {n.radicador && ` por ${n.radicador}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onClose(); onEditar(n); }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg border text-gray-700 hover:bg-gray-100 transition-all"
              style={{ borderColor: '#003DA5', color: '#003DA5' }}
            >
              <FileEdit className="w-3.5 h-3.5" />
              Editar
            </button>
            <button
              onClick={() => { onClose(); onConvertir(n); }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg text-white transition-all hover:opacity-90"
              style={{ backgroundColor: '#003DA5' }}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Convertir a Proceso
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB: GENERAL
// ═══════════════════════════════════════════════════════════════

function TabGeneral({
  n, pm, em, fechaCaducidad,
  cantAdjuntos,
  getDenuncianteNombre, getDenunciadoNombre, getDenuncianteId, getDenunciadoId
}: {
  n: NoticiaCompleta;
  pm: any; em: any;
  fechaCaducidad: string | null;
  cantAdjuntos: number;
  getDenuncianteNombre: () => string;
  getDenunciadoNombre: () => string;
  getDenuncianteId: () => string;
  getDenunciadoId: () => string;
}) {
  return (
    <div className="space-y-4">
      {/* Datos de radicación */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Datos de Radicación</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
          {[
            { label: 'NÚMERO', value: n.numero },
            { label: 'ORIGEN', value: n.origen || '—' },
            { label: 'FECHA RECEPCIÓN', value: n.fechaRecepcion ? new Date(n.fechaRecepcion).toLocaleDateString('es-CO') : '—' },
            { label: 'PRIORIDAD', value: n.prioridad?.toUpperCase() || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="px-4 py-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
              <p className="text-sm font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Datos geográficos y temporales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {n.territorial && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Territorial</span>
            </div>
            <p className="text-sm font-bold text-gray-900">{n.territorial}</p>
          </div>
        )}
        {n.dependencia && (
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-purple-600" />
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Dependencia</span>
            </div>
            <p className="text-sm font-bold text-gray-900">{n.dependencia}</p>
          </div>
        )}
        {n.fechaHechos && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Fecha de Hechos</span>
            </div>
            <p className="text-sm font-bold text-gray-900">
              {new Date(n.fechaHechos).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            {fechaCaducidad && (
              <p className="text-[11px] text-amber-700 mt-1">
                Caducidad: {new Date(fechaCaducidad).toLocaleDateString('es-CO')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Conducta */}
      {n.conductaSeleccionada && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Gavel className="w-4 h-4 text-red-600" />
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Presunta Conducta Disciplinaria</span>
          </div>
          <p className="text-sm font-bold text-gray-900">{n.conductaSeleccionada}</p>
          {n.conductaPersonalizada && (
            <p className="text-xs text-gray-600 mt-1 italic">{n.conductaPersonalizada}</p>
          )}
        </div>
      )}

      {/* Resumen de personas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">
              Disciplinado{(n.denunciados?.length || 0) > 1 ? 's' : ''}
            </span>
            {(n.denunciados?.length || 0) > 1 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-orange-200 text-orange-700">
                {n.denunciados!.length}
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-gray-900">{getDenunciadoNombre()}</p>
          {getDenunciadoId() && <p className="text-xs text-gray-500 mt-0.5">{getDenunciadoId()}</p>}
          {n.cargo && <p className="text-xs text-gray-500 mt-0.5">{n.cargo}</p>}
          {(n.denunciados?.length || 0) > 1 && (
            <p className="text-[11px] text-orange-600 mt-2 font-semibold">
              +{n.denunciados!.length - 1} disciplinado(s) adicional(es)
            </p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-gray-500" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Denunciante{(n.denunciantes?.length || 0) > 1 ? 's' : ''}
            </span>
            {(n.denunciantes?.length || 0) > 1 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-gray-200 text-gray-700">
                {n.denunciantes!.length}
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-gray-900">{getDenuncianteNombre()}</p>
          {getDenuncianteId() && <p className="text-xs text-gray-500 mt-0.5">{getDenuncianteId()}</p>}
          {(n.denunciantes?.length || 0) > 1 && (
            <p className="text-[11px] text-blue-600 mt-2 font-semibold">
              +{n.denunciantes!.length - 1} denunciante(s) adicional(es)
            </p>
          )}
        </div>
      </div>

      {/* Hechos (resumen) */}
      {n.hechos && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="w-4 h-4 text-amber-700" />
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Hechos</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{n.hechos}</p>
        </div>
      )}

      {/* Info adicional: proceso asociado, días */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 text-xs font-bold" style={{ color: '#003DA5' }}>
          <Clock className="w-3.5 h-3.5" />
          {n.diasPendientes} días pendientes
        </span>
        {n.procesoAsociado && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-green-200 bg-green-50 text-xs font-bold text-green-700">
            <CheckCircle className="w-3.5 h-3.5" />
            Proceso: {n.procesoAsociado.numeroProceso}
          </span>
        )}
        {cantAdjuntos > 0 && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-purple-200 bg-purple-50 text-xs font-bold text-purple-700">
            <Paperclip className="w-3.5 h-3.5" />
            {cantAdjuntos} adjunto{cantAdjuntos !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB: PERSONAS
// ═══════════════════════════════════════════════════════════════

function TabPersonas({
  n,
  getDenuncianteNombre, getDenunciadoNombre, getDenuncianteId, getDenunciadoId
}: {
  n: NoticiaCompleta;
  getDenuncianteNombre: () => string;
  getDenunciadoNombre: () => string;
  getDenuncianteId: () => string;
  getDenunciadoId: () => string;
}) {
  const denunciados = n.denunciados && n.denunciados.length > 0
    ? n.denunciados
    : [{
        id: '1',
        nombre: getDenunciadoNombre(),
        identificacion: getDenunciadoId(),
        cargo: n.cargo || '',
        lugarHechos: n.dependencia || '',
      }];

  const denunciantes = n.denunciantes && n.denunciantes.length > 0
    ? n.denunciantes
    : [{
        id: '1',
        nombre: getDenuncianteNombre(),
        identificacion: getDenuncianteId(),
        direccion: '',
        telefono: '',
        correo: '',
        cargo: '',
        entidad: '',
        tipo: 'Denunciante' as const,
      }];

  return (
    <div className="space-y-5">
      {/* Disciplinados */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
            Disciplinado{denunciados.length > 1 ? `s (${denunciados.length})` : ''}
          </h3>
        </div>
        <div className="space-y-3">
          {denunciados.map((d, idx) => (
            <div key={d.id || idx} className="rounded-xl border-2 border-orange-200 bg-orange-50/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white"
                  style={{ backgroundColor: '#EA580C' }}>
                  {idx + 1}
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">{d.nombre || 'Sin información'}</p>
                  {d.identificacion && <p className="text-xs text-gray-500">{d.identificacion}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {d.cargo && (
                  <div className="flex items-start gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Cargo</p>
                      <p className="text-xs font-semibold text-gray-700">{d.cargo}</p>
                    </div>
                  </div>
                )}
                {d.lugarHechos && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Lugar de Hechos</p>
                      <p className="text-xs font-semibold text-gray-700">{d.lugarHechos}</p>
                    </div>
                  </div>
                )}
              </div>
              {d.apoderado && (
                <div className="mt-3 pt-3 border-t border-orange-200">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Scale className="w-3.5 h-3.5 text-orange-600" />
                    <span className="text-[10px] font-bold text-orange-600 uppercase">Apoderado</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div><span className="text-gray-400 text-[10px] font-bold">NOMBRE</span><p className="font-semibold text-gray-700">{d.apoderado.nombre}</p></div>
                    <div><span className="text-gray-400 text-[10px] font-bold">CÉDULA</span><p className="font-semibold text-gray-700">{d.apoderado.cedula}</p></div>
                    <div><span className="text-gray-400 text-[10px] font-bold">CORREO</span><p className="font-semibold text-gray-700">{d.apoderado.correo}</p></div>
                    <div><span className="text-gray-400 text-[10px] font-bold">CELULAR</span><p className="font-semibold text-gray-700">{d.apoderado.celular}</p></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Denunciantes */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
            Denunciante{denunciantes.length > 1 ? `s (${denunciantes.length})` : ''}
          </h3>
        </div>
        <div className="space-y-3">
          {denunciantes.map((d, idx) => (
            <div key={d.id || idx} className="rounded-xl border-2 border-blue-200 bg-blue-50/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white"
                  style={{ backgroundColor: '#003DA5' }}>
                  {idx + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-gray-900">{d.nombre || 'Sin información'}</p>
                    {'tipo' in d && d.tipo && (
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        d.tipo === 'Víctima' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {d.tipo}
                      </span>
                    )}
                  </div>
                  {d.identificacion && <p className="text-xs text-gray-500">{d.identificacion}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {d.correo && (
                  <div className="flex items-start gap-2">
                    <Mail className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Correo</p>
                      <p className="text-xs font-semibold text-gray-700">{d.correo}</p>
                    </div>
                  </div>
                )}
                {d.telefono && (
                  <div className="flex items-start gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Teléfono</p>
                      <p className="text-xs font-semibold text-gray-700">{d.telefono}</p>
                    </div>
                  </div>
                )}
                {d.direccion && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Dirección</p>
                      <p className="text-xs font-semibold text-gray-700">{d.direccion}</p>
                    </div>
                  </div>
                )}
                {d.cargo && (
                  <div className="flex items-start gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Cargo</p>
                      <p className="text-xs font-semibold text-gray-700">{d.cargo}</p>
                    </div>
                  </div>
                )}
                {d.entidad && (
                  <div className="flex items-start gap-2">
                    <Building2 className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Entidad</p>
                      <p className="text-xs font-semibold text-gray-700">{d.entidad}</p>
                    </div>
                  </div>
                )}
              </div>
              {d.apoderado && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Scale className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[10px] font-bold text-blue-600 uppercase">Apoderado</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div><span className="text-gray-400 text-[10px] font-bold">NOMBRE</span><p className="font-semibold text-gray-700">{d.apoderado.nombre}</p></div>
                    <div><span className="text-gray-400 text-[10px] font-bold">CÉDULA</span><p className="font-semibold text-gray-700">{d.apoderado.cedula}</p></div>
                    <div><span className="text-gray-400 text-[10px] font-bold">CORREO</span><p className="font-semibold text-gray-700">{d.apoderado.correo}</p></div>
                    <div><span className="text-gray-400 text-[10px] font-bold">CELULAR</span><p className="font-semibold text-gray-700">{d.apoderado.celular}</p></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB: HECHOS
// ═══════════════════════════════════════════════════════════════

function TabHechos({ n }: { n: NoticiaCompleta }) {
  return (
    <div className="space-y-4">
      {/* Descripción general de hechos */}
      {n.hechos && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-amber-700" />
            <h3 className="text-xs font-black text-amber-700 uppercase tracking-wider">Descripción General de los Hechos</h3>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{n.hechos}</p>
        </div>
      )}

      {/* Hechos separados */}
      {n.hechosSeparados && n.hechosSeparados.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileWarning className="w-4 h-4 text-orange-600" />
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
              Hechos Individualizados ({n.hechosSeparados.length})
            </h3>
          </div>
          <div className="space-y-3">
            {n.hechosSeparados.map((hecho, idx) => (
              <div key={hecho.id || idx} className="rounded-xl border-2 border-gray-200 p-4 bg-white">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: '#003DA5' }}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 leading-relaxed">{hecho.descripcion}</p>
                    {hecho.fecha && (
                      <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(hecho.fecha).toLocaleDateString('es-CO')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conducta presunta */}
      {n.conductaSeleccionada && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Gavel className="w-4 h-4 text-red-600" />
            <h3 className="text-xs font-black text-red-700 uppercase tracking-wider">Presunta Conducta Disciplinaria</h3>
          </div>
          <p className="text-sm font-bold text-gray-900">{n.conductaSeleccionada}</p>
          {n.conductaPersonalizada && (
            <p className="text-xs text-gray-600 mt-2 italic bg-white rounded-lg p-3 border border-red-100">
              {n.conductaPersonalizada}
            </p>
          )}
        </div>
      )}

      {/* Estado vacío */}
      {!n.hechos && (!n.hechosSeparados || n.hechosSeparados.length === 0) && (
        <div className="text-center py-12">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-400">No se registraron hechos</p>
          <p className="text-xs text-gray-300 mt-1">Los hechos se ingresan durante la creación de la noticia</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB: ADJUNTOS
// ═══════════════════════════════════════════════════════════════

function TabAdjuntos({ n, formatFileSize }: { n: NoticiaCompleta; formatFileSize: (b: number) => string }) {
  const adjuntos = n.archivosAdjuntos || [];

  const getIconByType = (tipo: string) => {
    if (tipo.includes('pdf')) return { icon: FileText, color: '#DC2626', bg: '#FEE2E2' };
    if (tipo.includes('image') || tipo.includes('png') || tipo.includes('jpg')) return { icon: Eye, color: '#7C3AED', bg: '#EDE9FE' };
    if (tipo.includes('word') || tipo.includes('doc')) return { icon: FileText, color: '#2563EB', bg: '#DBEAFE' };
    if (tipo.includes('excel') || tipo.includes('xls') || tipo.includes('sheet')) return { icon: FileText, color: '#059669', bg: '#D1FAE5' };
    return { icon: Paperclip, color: '#6B7280', bg: '#F3F4F6' };
  };

  if (adjuntos.length === 0) {
    return (
      <div className="text-center py-12">
        <Paperclip className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-bold text-gray-400">No hay archivos adjuntos</p>
        <p className="text-xs text-gray-300 mt-1">Los archivos se adjuntan durante la creación o edición de la noticia</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Paperclip className="w-4 h-4 text-gray-600" />
        <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
          Archivos Adjuntos ({adjuntos.length})
        </h3>
      </div>
      <div className="space-y-2">
        {adjuntos.map((archivo, idx) => {
          const { icon: Icon, color, bg } = getIconByType(archivo.tipo);
          return (
            <div key={idx} className="flex items-center gap-3 rounded-xl border-2 border-gray-200 p-3 hover:bg-gray-50 transition-colors group">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: bg }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{archivo.nombre}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-gray-400">{formatFileSize(archivo.tamano)}</span>
                  <span className="text-gray-300">·</span>
                  <span className="text-[11px] text-gray-400">
                    {new Date(archivo.fechaSubida).toLocaleDateString('es-CO')}
                  </span>
                </div>
              </div>
              <button className="p-2 rounded-lg hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100">
                <Download className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}