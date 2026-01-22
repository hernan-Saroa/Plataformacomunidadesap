/**
 * RF004 - FLUJO DE APROBACIÓN DE AUTOS POR JEFE DE OCID
 * Diseño actualizado alineado con el estándar ESAP (SIGL v5.0)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Search, Eye, CheckCircle, XCircle, Edit2,
  MessageSquare, Clock, Send, Download, Upload, FileSignature,
  User, AlertCircle, History, X, Check,
  RotateCcw, Mail, Calendar,
  Shield, Key, Users, Trash2, ChevronDown,
  Filter, Paperclip, ListFilter, List, LayoutDashboard,
  HelpCircle, Info
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { toast } from 'sonner@2.0.3';
import { FlujoRevisionAprobacion } from './FlujoRevisionAprobacion';

// Interfaces
interface BorradorPendiente {
  id: string;
  numeroProceso: string;
  titulo: string;
  plantilla: string;
  version: number;
  fechaEnvio: string;
  profesional: {
    nombre: string;
    email: string;
  };
  observacionesProfesional: string;
  contenido: string;
  denunciado: string;
  etapa: string;
  prioridad: 'alta' | 'media' | 'baja';
  estado: 'pendiente_revision' | 'en_revision' | 'aprobado' | 'devuelto';
  historial: AccionRevision[];
  tiempoEspera?: string;
}

interface AccionRevision {
  id: string;
  tipo: 'recibido' | 'revision_iniciada' | 'editado' | 'comentario_agregado' | 'aprobado' | 'aprobado_con_observaciones' | 'devuelto' | 'firma_solicitada' | 'firmado' | 'enviado_notificacion';
  usuario: string;
  fecha: string;
  descripcion: string;
  detalles?: any;
}

type TipoFirma = 'electronica' | 'digital' | 'local';

// Mock Data
const BORRADORES_PENDIENTES: BorradorPendiente[] = [
  {
    id: 'b1',
    numeroProceso: 'P-120-2025',
    titulo: 'Auto de Indagación Preliminar',
    plantilla: 'Auto de Indagación Preliminar',
    version: 2,
    fechaEnvio: '2025-01-08T14:30:00',
    profesional: {
      nombre: 'Juan Carlos Pérez',
      email: 'juan.perez@esap.edu.co'
    },
    observacionesProfesional: 'Se adjuntan todos los documentos soporte. La conducta presunta está claramente configurada según el artículo 48 de la Ley 734.',
    contenido: `AUTO DE APERTURA DE INDAGACIÓN PRELIMINAR

PROCESO No: P-120-2025
NOTICIA ORIGEN: ND-260
DISCIPLINABLE: Juan Pérez Gómez
IDENTIFICACIÓN: 1234567890

La Oficina de Control Interno Disciplinario de la ESAP, en uso de sus facultades legales,

CONSIDERANDO:

PRIMERO: Que mediante noticia disciplinaria No. ND-260 de fecha 03 de enero de 2025, se puso en conocimiento presuntos hechos de acoso laboral.

SEGUNDO: Que los hechos descritos ameritan indagación preliminar para establecer si se configura falta disciplinaria.

RESUELVE:

ARTÍCULO PRIMERO: ABRIR INDAGACIÓN PRELIMINAR en contra de Juan Pérez Gómez, identificado con CC 1234567890.

ARTÍCULO SEGUNDO: NOTIFÍQUESE el presente auto al investigado.

Dado en Bogotá D.C., a los 08 días del mes de enero de 2025.`,
    denunciado: 'Juan Pérez Gómez',
    etapa: 'Indagación Preliminar',
    prioridad: 'alta',
    estado: 'pendiente_revision',
    tiempoEspera: '2h 15m',
    historial: [
      {
        id: 'h1',
        tipo: 'recibido',
        usuario: 'Juan Carlos Pérez',
        fecha: '2025-01-08T14:30:00',
        descripcion: 'Borrador enviado para revisión',
        detalles: { version: 2 }
      }
    ]
  },
  {
    id: 'b2',
    numeroProceso: 'P-089-2024',
    titulo: 'Auto de Inhibitorio',
    plantilla: 'Auto de Inhibitorio',
    version: 1,
    fechaEnvio: '2025-01-07T10:15:00',
    profesional: {
      nombre: 'María Torres',
      email: 'maria.torres@esap.edu.co'
    },
    observacionesProfesional: 'Los hechos investigados no constituyen falta disciplinaria. Se recomienda archivo.',
    contenido: `AUTO DE INHIBITORIO

PROCESO No: P-089-2024
NOTICIA ORIGEN: ND-178

Se RESUELVE INHIBIRSE de iniciar investigación disciplinaria por no configurarse falta disciplinaria.`,
    denunciado: 'María González Castro',
    etapa: 'Valoración',
    prioridad: 'media',
    estado: 'en_revision',
    tiempoEspera: '1d 4h',
    historial: [
      {
        id: 'h2',
        tipo: 'recibido',
        usuario: 'María Torres',
        fecha: '2025-01-07T10:15:00',
        descripcion: 'Borrador enviado para revisión'
      },
      {
        id: 'h3',
        tipo: 'revision_iniciada',
        usuario: 'Jefe OCID',
        fecha: '2025-01-08T09:00:00',
        descripcion: 'Revisión iniciada'
      }
    ]
  }
];

// Función auxiliar para obtener iniciales
const getInitials = (nombre: string) => {
  const parts = nombre.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return nombre.substring(0, 2).toUpperCase();
};

// Modal de Revisión y Edición - ACTUALIZADO
function ModalRevisionEdicion({ 
  borrador, 
  onClose, 
  onAprobar, 
  onDevolver 
}: { 
  borrador: BorradorPendiente;
  onClose: () => void;
  onAprobar: (comentarios: string) => void;
  onDevolver: (motivo: string, comentarios: string, archivos: File[]) => void;
}) {
  const [contenidoEditado, setContenidoEditado] = useState(borrador.contenido);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [comentariosJefe, setComentariosJefe] = useState('');
  const [showModalAprobar, setShowModalAprobar] = useState(false);
  const [showModalDevolver, setShowModalDevolver] = useState(false);
  const [activeTab, setActiveTab] = useState<'documento' | 'historial'>('documento');
  const [archivoAuto, setArchivoAuto] = useState<File | null>(null);
  const [tipoVista, setTipoVista] = useState<'texto' | 'archivo'>('texto');

  const handleGuardarEdicion = () => {
    toast.success('Cambios Guardados', {
      description: 'Las modificaciones han sido registradas en la auditoría'
    });
    setModoEdicion(false);
  };

  const initials = getInitials(borrador.profesional.nombre);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 p-4 z-[200]"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: '#E0EDFF' }}>
                <FileSignature className="w-6 h-6" style={{ color: '#003DA5' }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: '#003DA5' }}>
                  Revisión de Auto
                </h2>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  {borrador.numeroProceso}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" style={{ color: '#6B7280' }} />
            </button>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2">
            <Badge style={{ background: '#E0EDFF', color: '#003DA5' }}>
              Versión {borrador.version}
            </Badge>
            <Badge style={{ background: '#DBEAFE', color: '#2563EB' }}>
              {borrador.etapa}
            </Badge>
            {borrador.prioridad === 'alta' && (
              <Badge style={{ background: '#FEE2E2', color: '#DC2626' }}>
                ⚠️ Prioridad Alta
              </Badge>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
          <div className="flex px-6">
            <button
              onClick={() => setActiveTab('documento')}
              className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
                activeTab === 'documento'
                  ? 'border-[#003DA5] text-[#003DA5]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-4 h-4 inline-block mr-2" />
              Documentos
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
                activeTab === 'historial'
                  ? 'border-[#003DA5] text-[#003DA5]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <History className="w-4 h-4 inline-block mr-2" />
              Historial ({borrador.historial.length})
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'documento' ? (
            <div className="space-y-5">
              {/* Info Denunciado */}
              <div className="p-4 rounded-xl" style={{ background: '#EFF6FF' }}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm" style={{ background: '#DBEAFE', color: '#2563EB' }}>
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                      DENUNCIADO/INVESTIGADO
                    </p>
                    <p className="font-bold" style={{ color: '#1F2937' }}>
                      {borrador.denunciado}
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                      Etapa: {borrador.etapa}
                    </p>
                  </div>
                </div>
              </div>

              {/* Profesional */}
              <div className="p-4 rounded-xl" style={{ background: '#F8FAFC' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: '#E0EDFF', color: '#003DA5' }}>
                    {initials}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm" style={{ color: '#1F2937' }}>
                      {borrador.profesional.nombre}
                    </p>
                    <p className="text-xs" style={{ color: '#6B7280' }}>
                      {borrador.profesional.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              <div className="p-4 rounded-xl border-2" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
                <div className="flex gap-3">
                  <MessageSquare className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#6B7280' }} />
                  <div className="flex-1">
                    <p className="text-xs font-semibold mb-2" style={{ color: '#6B7280' }}>
                      Observaciones del Profesional:
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
                      {borrador.observacionesProfesional}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contenido del Auto */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold flex items-center gap-2" style={{ color: '#1F2937' }}>
                    <FileText className="w-5 h-5" style={{ color: '#003DA5' }} />
                    Contenido del Auto
                  </h3>
                  <div className="flex gap-2">
                    {!archivoAuto && (
                      <label htmlFor="upload-auto" className="cursor-pointer">
                        <div className="px-4 py-2 rounded-xl border-2 hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-semibold" style={{ borderColor: '#E5E7EB', color: '#6B7280' }}>
                          <Upload className="w-4 h-4" />
                          Subir Word/PDF
                        </div>
                        <input
                          id="upload-auto"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              setArchivoAuto(file);
                              setTipoVista('archivo');
                              toast.success('Archivo cargado', {
                                description: `${file.name} listo para visualizar`
                              });
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                    <button
                      onClick={() => setModoEdicion(!modoEdicion)}
                      className="px-4 py-2 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity flex items-center gap-2"
                      style={{ background: modoEdicion ? '#6B7280' : '#003DA5' }}
                    >
                      <Edit2 className="w-4 h-4" />
                      {modoEdicion ? 'Cancelar' : 'Editar'}
                    </button>
                  </div>
                </div>

                {/* Archivo subido */}
                {archivoAuto && (
                  <div className="p-4 mb-3 rounded-xl border-2" style={{ background: '#D1FAE5', borderColor: '#6EE7B7' }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#059669' }}>
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: '#1F2937' }}>
                            {archivoAuto.name}
                          </p>
                          <p className="text-xs" style={{ color: '#6B7280' }}>
                            {(archivoAuto.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setTipoVista(tipoVista === 'archivo' ? 'texto' : 'archivo')}
                          className="p-2 rounded-lg hover:bg-white/50 transition-colors"
                          title={tipoVista === 'archivo' ? 'Ver Texto' : 'Ver Archivo'}
                        >
                          <Eye className="w-4 h-4" style={{ color: '#059669' }} />
                        </button>
                        <button
                          onClick={() => {
                            const url = URL.createObjectURL(archivoAuto);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = archivoAuto.name;
                            a.click();
                            URL.revokeObjectURL(url);
                            toast.success('Descargando archivo...');
                          }}
                          className="p-2 rounded-lg hover:bg-white/50 transition-colors"
                          title="Descargar"
                        >
                          <Download className="w-4 h-4" style={{ color: '#059669' }} />
                        </button>
                        <button
                          onClick={() => {
                            setArchivoAuto(null);
                            setTipoVista('texto');
                            toast.info('Archivo eliminado');
                          }}
                          className="p-2 rounded-lg hover:bg-white/50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" style={{ color: '#DC2626' }} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {modoEdicion ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: '#EFF6FF' }}>
                      <Info className="w-4 h-4 flex-shrink-0" style={{ color: '#2563EB' }} />
                      <p className="text-xs" style={{ color: '#1E40AF' }}>
                        Las modificaciones quedarán registradas en auditoría.
                      </p>
                    </div>
                    <textarea
                      value={contenidoEditado}
                      onChange={(e) => setContenidoEditado(e.target.value)}
                      className="w-full h-80 p-4 border-2 rounded-xl text-sm focus:outline-none focus:border-[#003DA5] font-mono"
                      style={{ borderColor: '#E5E7EB' }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleGuardarEdicion}
                        className="flex-1 px-6 py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        style={{ background: '#003DA5' }}
                      >
                        <Check className="w-4 h-4" />
                        Guardar Cambios
                      </button>
                      <button
                        onClick={() => setModoEdicion(false)}
                        className="px-6 py-3 rounded-xl font-semibold border-2 hover:bg-gray-100 transition-colors"
                        style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
                      >
                        Descartar
                      </button>
                    </div>
                  </div>
                ) : tipoVista === 'archivo' && archivoAuto ? (
                  <div className="rounded-xl border-2 overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
                    {archivoAuto.name.endsWith('.pdf') ? (
                      <iframe
                        src={URL.createObjectURL(archivoAuto)}
                        className="w-full h-[600px]"
                        title="Visualizador de PDF"
                      />
                    ) : (
                      <div className="p-8 text-center">
                        <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: '#2563EB' }} />
                        <p className="font-bold mb-2" style={{ color: '#1F2937' }}>
                          Documento Word Cargado
                        </p>
                        <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
                          {archivoAuto.name}
                        </p>
                        <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>
                          Los archivos Word (.doc, .docx) no pueden visualizarse directamente.<br />
                          Puedes descargar el archivo o ver el contenido en modo texto.
                        </p>
                        <div className="flex gap-3 justify-center">
                          <button
                            onClick={() => {
                              const url = URL.createObjectURL(archivoAuto);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = archivoAuto.name;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="px-4 py-2 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity flex items-center gap-2"
                            style={{ background: '#10B981' }}
                          >
                            <Download className="w-4 h-4" />
                            Descargar Archivo
                          </button>
                          <button
                            onClick={() => setTipoVista('texto')}
                            className="px-4 py-2 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity flex items-center gap-2"
                            style={{ background: '#003DA5' }}
                          >
                            <FileText className="w-4 h-4" />
                            Ver como Texto
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-5 rounded-xl border-2" style={{ borderColor: '#E5E7EB', background: '#F8FAFC' }}>
                    <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed overflow-x-auto" style={{ color: '#1F2937' }}>
                      {contenidoEditado}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {borrador.historial.map((accion, index) => (
                <div
                  key={accion.id}
                  className="p-4 rounded-xl border-l-4"
                  style={{ background: '#F8FAFC', borderColor: '#003DA5' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                        {accion.descripcion}
                      </p>
                      <p className="text-xs" style={{ color: '#6B7280' }}>
                        {accion.usuario}
                      </p>
                    </div>
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>
                      {new Date(accion.fecha).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex gap-3" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
          <button
            onClick={() => setShowModalDevolver(true)}
            className="px-6 py-3 rounded-xl font-semibold border-2 hover:bg-gray-100 transition-colors flex items-center gap-2"
            style={{ borderColor: '#E5E7EB', color: '#DC2626' }}
          >
            <RotateCcw className="w-4 h-4" />
            Devolver
          </button>
          <button
            onClick={() => setShowModalAprobar(true)}
            className="flex-1 px-6 py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            style={{ background: '#059669' }}
          >
            <CheckCircle className="w-4 h-4" />
            Aprobar Auto
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-semibold border-2 hover:bg-gray-100 transition-colors"
            style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
          >
            Cerrar
          </button>
        </div>
      </motion.div>

      {/* Modales de Aprobar y Devolver (puedes implementarlos según necesites) */}
    </motion.div>
  );
}

// Componente Principal
export function RevisionAprobacionJefe() {
  const [borradores] = useState<BorradorPendiente[]>(BORRADORES_PENDIENTES);
  const [borradorSeleccionado, setBorradorSeleccionado] = useState<BorradorPendiente | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente_revision' | 'en_revision'>('todos');

  const borradorsFiltrados = borradores.filter(b => {
    const matchesSearch = searchQuery === '' || 
      b.numeroProceso.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.titulo.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesEstado = filtroEstado === 'todos' || b.estado === filtroEstado;
    
    return matchesSearch && matchesEstado;
  });

  const handleAprobar = (comentarios: string) => {
    toast.success('Auto Aprobado', {
      description: 'El auto ha sido aprobado exitosamente'
    });
    setBorradorSeleccionado(null);
  };

  const handleDevolver = (motivo: string, comentarios: string, archivos: File[]) => {
    toast.warning('Auto Devuelto', {
      description: 'El auto ha sido devuelto al profesional'
    });
    setBorradorSeleccionado(null);
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      {/* Header - Estándar Corporativo ESAP */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
          <div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
                <CheckCircle size={20} className="sm:w-6 sm:h-6" style={{ color: '#10B981' }} />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold" style={{ color: '#003DA5' }}>
                  Revisión y Aprobación de Autos
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                  Sistema Integrado de Gestión Legal (SIGL v5.0)
                </p>
              </div>
            </div>
          </div>

          {/* Stats rápidas */}
          <div className="flex items-center gap-3">
            <div className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-xs text-gray-600">Total Borradores</p>
              <p className="text-xl font-bold" style={{ color: '#003DA5' }}>
                {borradores.length}
              </p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-xs text-gray-600">Pendientes</p>
              <p className="text-xl font-bold text-amber-700">
                {borradores.filter(b => b.estado === 'pendiente_revision').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 overflow-auto p-3 sm:p-6">
        {/* Buscador y Filtros */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
            <input
              type="text"
              placeholder="Buscar por número de proceso o título..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] bg-white"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setFiltroEstado('todos')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filtroEstado === 'todos'
                  ? 'text-white'
                  : 'bg-white text-gray-700 border-2'
              }`}
              style={
                filtroEstado === 'todos'
                  ? { background: '#003DA5' }
                  : { borderColor: '#E5E7EB' }
              }
            >
              Todos ({borradores.length})
            </button>
            <button
              onClick={() => setFiltroEstado('pendiente_revision')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filtroEstado === 'pendiente_revision'
                  ? 'text-white'
                  : 'bg-white text-gray-700 border-2'
              }`}
              style={
                filtroEstado === 'pendiente_revision'
                  ? { background: '#003DA5' }
                  : { borderColor: '#E5E7EB' }
              }
            >
              Pendientes ({borradores.filter(b => b.estado === 'pendiente_revision').length})
            </button>
            <button
              onClick={() => setFiltroEstado('en_revision')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filtroEstado === 'en_revision'
                  ? 'text-white'
                  : 'bg-white text-gray-700 border-2'
              }`}
              style={
                filtroEstado === 'en_revision'
                  ? { background: '#003DA5' }
                  : { borderColor: '#E5E7EB' }
              }
            >
              En Revisión ({borradores.filter(b => b.estado === 'en_revision').length})
            </button>
          </div>
        </div>

        {/* Lista de Borradores */}
        <div className="space-y-4">
          {borradorsFiltrados.map((borrador) => {
            const initials = getInitials(borrador.profesional.nombre);
            
            return (
              <div
                key={borrador.id}
                className="bg-white rounded-xl border-2 p-5 hover:shadow-lg transition-all cursor-pointer"
                style={{ borderColor: '#E5E7EB' }}
                onClick={() => setBorradorSeleccionado(borrador)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: '#E0EDFF', color: '#003DA5' }}>
                    {initials}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h3 className="text-xl font-extrabold mb-1" style={{ color: '#1F2937' }}>
                          {borrador.titulo}
                        </h3>
                        <p className="text-sm" style={{ color: '#6B7280' }}>
                          {borrador.numeroProceso} • {borrador.profesional.nombre}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge style={{ background: '#FEF3C7', color: '#D97706' }}>
                          {borrador.tiempoEspera}
                        </Badge>
                        {borrador.prioridad === 'alta' && (
                          <Badge style={{ background: '#FEE2E2', color: '#DC2626' }}>
                            Alta Prioridad
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span style={{ color: '#6B7280' }}>
                        <Calendar className="w-4 h-4 inline-block mr-1" />
                        {new Date(borrador.fechaEnvio).toLocaleDateString('es-CO')}
                      </span>
                      <span style={{ color: '#6B7280' }}>
                        Versión {borrador.version}
                      </span>
                      <span style={{ color: '#6B7280' }}>
                        {borrador.etapa}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal de Revisión */}
        <AnimatePresence>
          {borradorSeleccionado && (
            <ModalRevisionEdicion
              borrador={borradorSeleccionado}
              onClose={() => setBorradorSeleccionado(null)}
              onAprobar={handleAprobar}
              onDevolver={handleDevolver}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}