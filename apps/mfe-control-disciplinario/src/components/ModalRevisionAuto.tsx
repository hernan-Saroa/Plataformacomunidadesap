/**
 * MODAL DE REVISIÓN Y APROBACIÓN DE AUTOS - COMPONENTE CENTRAL
 * Sistema unificado para revisar y aprobar documentos de actuación
 * Usado por: Revisión y Aprobación + Dashboard Kanban Operativo
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { disciplinaryService } from '../../../services/api/disciplinary.service';
import { buildApiUrl, API_MODE } from '../../../config/environment';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Eye, CheckCircle, XCircle, Edit2,
  MessageSquare, Clock, Send, Download, Upload, FileSignature,
  User, AlertCircle, History, X, Check,
  RotateCcw, Mail, Calendar, Info,
  Shield, Key, Users, Trash2, ChevronDown,
  Filter, Paperclip, ListFilter, List
} from 'lucide-react';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { toast } from 'sonner';

// ==================== INTERFACES ====================

export interface BorradorPendiente {
  id: string;
  autoId?: string; // ID real del auto en el backend (si cargado desde API)
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

export interface AccionRevision {
  id: string;
  tipo: 'recibido' | 'revision_iniciada' | 'editado' | 'comentario_agregado' | 'aprobado' | 'aprobado_con_observaciones' | 'devuelto' | 'firma_solicitada' | 'firmado' | 'enviado_notificacion';
  usuario: string;
  fecha: string;
  descripcion: string;
  detalles?: any;
}

interface ModalRevisionAutoProps {
  borrador: BorradorPendiente;
  onClose: () => void;
  onAprobar: (comentarios: string) => void;
  onDevolver?: (motivo: string, comentarios: string, archivos: File[]) => void;
  mostrarBotonDevolver?: boolean;
  tituloModal?: string;
  descripcionModal?: string;
}

// ==================== UTILIDADES ====================

const getInitials = (nombre: string) => {
  const parts = nombre.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return nombre.substring(0, 2).toUpperCase();
};

// ==================== MODAL DE APROBACIÓN ====================

function ModalAprobacion({
  onConfirm,
  onCancel
}: {
  onConfirm: (comentarios: string, tipoFirma: 'electronica' | 'digital' | 'local') => void;
  onCancel: () => void;
}) {
  const [comentarios, setComentarios] = useState('');
  const [tipoFirma, setTipoFirma] = useState<'electronica' | 'digital' | 'local'>('local');

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.60)', padding: '4vh 4vw' }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#D1FAE5' }}>
            <CheckCircle className="w-6 h-6" style={{ color: '#059669' }} />
          </div>
          <div>
            <h3 className="text-xl font-bold" style={{ color: '#1F2937' }}>
              Aprobar Auto
            </h3>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Confirma la aprobación del documento
            </p>
          </div>
        </div>

        {/* Tipo de Firma */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
            Tipo de Firma
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setTipoFirma('local')}
              className={`p-3 rounded-xl border-2 transition-all ${
                tipoFirma === 'local' ? 'border-[#003DA5] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Key className={`w-5 h-5 mx-auto mb-1 ${tipoFirma === 'local' ? 'text-[#003DA5]' : 'text-gray-500'}`} />
              <p className={`text-xs font-semibold ${tipoFirma === 'local' ? 'text-[#003DA5]' : 'text-gray-600'}`}>
                Local
              </p>
            </button>
            <button
              onClick={() => setTipoFirma('electronica')}
              className={`p-3 rounded-xl border-2 transition-all ${
                tipoFirma === 'electronica' ? 'border-[#003DA5] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <FileSignature className={`w-5 h-5 mx-auto mb-1 ${tipoFirma === 'electronica' ? 'text-[#003DA5]' : 'text-gray-500'}`} />
              <p className={`text-xs font-semibold ${tipoFirma === 'electronica' ? 'text-[#003DA5]' : 'text-gray-600'}`}>
                Electrónica
              </p>
            </button>
            <button
              onClick={() => setTipoFirma('digital')}
              className={`p-3 rounded-xl border-2 transition-all ${
                tipoFirma === 'digital' ? 'border-[#003DA5] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Shield className={`w-5 h-5 mx-auto mb-1 ${tipoFirma === 'digital' ? 'text-[#003DA5]' : 'text-gray-500'}`} />
              <p className={`text-xs font-semibold ${tipoFirma === 'digital' ? 'text-[#003DA5]' : 'text-gray-600'}`}>
                Digital
              </p>
            </button>
          </div>
        </div>

        {/* Comentarios */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
            Comentarios (Opcional)
          </label>
          <textarea
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            placeholder="Observaciones adicionales sobre la aprobación..."
            className="w-full h-32 p-3 border-2 rounded-xl focus:outline-none focus:border-[#003DA5] resize-none"
            style={{ borderColor: '#E5E7EB' }}
          />
        </div>

        {/* Botones */}
        <div className="flex gap-3">
          <button
            onClick={() => onConfirm(comentarios, tipoFirma)}
            className="flex-1 px-6 py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            style={{ background: '#059669' }}
          >
            <Check className="w-4 h-4" />
            Confirmar Aprobación
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-3 rounded-xl font-semibold border-2 hover:bg-gray-100 transition-colors"
            style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

// ==================== MODAL DE DEVOLUCIÓN ====================

function ModalDevolucion({
  onConfirm,
  onCancel
}: {
  onConfirm: (motivo: string, comentarios: string, archivos: File[]) => void;
  onCancel: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);

  const motivosComunes = [
    'Errores de forma',
    'Falta de fundamentación jurídica',
    'Inconsistencias en hechos',
    'Documentación incompleta',
    'Otro (especificar en comentarios)'
  ];

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.60)', padding: '4vh 4vw' }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] overflow-y-auto p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#FEE2E2' }}>
            <RotateCcw className="w-6 h-6" style={{ color: '#DC2626' }} />
          </div>
          <div>
            <h3 className="text-xl font-bold" style={{ color: '#1F2937' }}>
              Devolver Documento
            </h3>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Indica el motivo de devolución
            </p>
          </div>
        </div>

        {/* Motivo */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
            Motivo de Devolución *
          </label>
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="w-full p-3 border-2 rounded-xl focus:outline-none focus:border-[#003DA5]"
            style={{ borderColor: '#E5E7EB' }}
          >
            <option value="">Seleccionar motivo...</option>
            {motivosComunes.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Comentarios */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
            Comentarios Detallados *
          </label>
          <textarea
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            placeholder="Describe los cambios necesarios..."
            className="w-full h-32 p-3 border-2 rounded-xl focus:outline-none focus:border-[#003DA5] resize-none"
            style={{ borderColor: '#E5E7EB' }}
          />
        </div>

        {/* Adjuntar archivos */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
            Archivos de Soporte (Opcional)
          </label>
          <label className="block">
            <div className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
              style={{ borderColor: '#E5E7EB' }}
            >
              <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: '#6B7280' }} />
              <p className="text-sm font-semibold mb-1" style={{ color: '#374151' }}>
                Click para adjuntar archivos
              </p>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                PDF, Word, imágenes (máx. 10MB)
              </p>
            </div>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => {
                if (e.target.files) {
                  setArchivos(Array.from(e.target.files));
                }
              }}
              className="hidden"
            />
          </label>
          {archivos.length > 0 && (
            <div className="mt-3 space-y-2">
              {archivos.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                  <Paperclip className="w-4 h-4" style={{ color: '#6B7280' }} />
                  <span className="text-sm flex-1" style={{ color: '#374151' }}>{file.name}</span>
                  <button
                    onClick={() => setArchivos(archivos.filter((_, i) => i !== idx))}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <X className="w-4 h-4" style={{ color: '#DC2626' }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (!motivo || !comentarios) {
                toast.error('Campos Requeridos', {
                  description: 'Debes seleccionar un motivo y agregar comentarios'
                });
                return;
              }
              onConfirm(motivo, comentarios, archivos);
            }}
            className="flex-1 px-6 py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            style={{ background: '#DC2626' }}
          >
            <RotateCcw className="w-4 h-4" />
            Confirmar Devolución
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-3 rounded-xl font-semibold border-2 hover:bg-gray-100 transition-colors"
            style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

// ==================== COMPONENTE PRINCIPAL ====================

export function ModalRevisionAuto({
  borrador,
  onClose,
  onAprobar,
  onDevolver,
  mostrarBotonDevolver = true,
  tituloModal = 'Revisión de Auto',
  descripcionModal
}: ModalRevisionAutoProps) {
  const [contenidoEditado, setContenidoEditado] = useState(borrador.contenido);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [comentariosJefe, setComentariosJefe] = useState('');
  const [showModalAprobar, setShowModalAprobar] = useState(false);
  const [showModalDevolver, setShowModalDevolver] = useState(false);
  const [activeTab, setActiveTab] = useState<'documento' | 'historial'>('documento');
  const [archivoAuto, setArchivoAuto] = useState<File | null>(null);
  const [tipoVista, setTipoVista] = useState<'texto' | 'archivo'>('texto');
  const [documentoBackendUrl, setDocumentoBackendUrl] = useState<string | null>(null);
  const [cargandoDoc, setCargandoDoc] = useState(false);

  useEffect(() => {
    if (!borrador.autoId) return;
    let blobUrl: string | null = null;
    const cargarDocumento = async () => {
      try {
        setCargandoDoc(true);
        const auto = await disciplinaryService.getAutoById(borrador.autoId!);
        if (auto.documentUrl) {
          const restPath = auto.documentUrl;
          const fileUrl = buildApiUrl('control-disciplinario', API_MODE === 'direct' ? restPath : `/api/v1${restPath}`);
          const token = localStorage.getItem('esap_access_token');
          const response = await fetch(fileUrl, {
            method: 'GET',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          if (response.ok) {
            const blob = await response.blob();
            blobUrl = window.URL.createObjectURL(blob);
            setDocumentoBackendUrl(blobUrl);
          }
        } else if (auto.contenido) {
          setContenidoEditado(auto.contenido);
        }
      } catch {
        // si falla, conservar el contenido existente
      } finally {
        setCargandoDoc(false);
      }
    };
    cargarDocumento();
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [borrador.autoId]);

  const handleGuardarEdicion = () => {
    toast.success('Cambios Guardados', {
      description: 'Las modificaciones han sido registradas en la auditoría'
    });
    setModoEdicion(false);
  };

  const handleConfirmarAprobacion = (comentarios: string, tipoFirma: 'electronica' | 'digital' | 'local') => {
    onAprobar(comentarios);
    setShowModalAprobar(false);
    onClose();
  };

  const handleConfirmarDevolucion = (motivo: string, comentarios: string, archivos: File[]) => {
    if (onDevolver) {
      onDevolver(motivo, comentarios, archivos);
    }
    setShowModalDevolver(false);
    onClose();
  };

  const initials = getInitials(borrador.profesional.nombre);

  return createPortal(
    <>
      <motion.div
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
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col"
          style={{ width: '92vw', maxWidth: 720, maxHeight: '88vh' }}
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
                    {tituloModal}
                  </h2>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    {descripcionModal || borrador.numeroProceso}
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
            <div className="flex items-center gap-2 flex-wrap">
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
              {borrador.tiempoEspera && (
                <Badge style={{ background: '#FEF3C7', color: '#D97706' }}>
                  ⏱️ {borrador.tiempoEspera}
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
                Documento
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
                {borrador.observacionesProfesional && (
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
                )}

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
                  ) : cargandoDoc ? (
                    <div className="flex items-center justify-center p-10 rounded-xl border-2" style={{ borderColor: '#E5E7EB', background: '#F8FAFC' }}>
                      <div className="text-center">
                        <div className="w-8 h-8 border-4 border-[#003DA5] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm" style={{ color: '#6B7280' }}>Cargando documento...</p>
                      </div>
                    </div>
                  ) : documentoBackendUrl ? (
                    <div className="rounded-xl border-2 overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
                      <iframe
                        src={documentoBackendUrl}
                        className="w-full"
                        style={{ height: '65vh', minHeight: '400px', border: 'none' }}
                        title="Visor PDF"
                      />
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
                {borrador.historial.map((accion) => (
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
            {mostrarBotonDevolver && onDevolver && (
              <button
                onClick={() => setShowModalDevolver(true)}
                className="px-6 py-3 rounded-xl font-semibold border-2 hover:bg-gray-100 transition-colors flex items-center gap-2"
                style={{ borderColor: '#E5E7EB', color: '#DC2626' }}
              >
                <RotateCcw className="w-4 h-4" />
                Devolver
              </button>
            )}
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
      </motion.div>

      {/* Modales Anidados */}
      <AnimatePresence>
        {showModalAprobar && (
          <ModalAprobacion
            onConfirm={handleConfirmarAprobacion}
            onCancel={() => setShowModalAprobar(false)}
          />
        )}
        {showModalDevolver && (
          <ModalDevolucion
            onConfirm={handleConfirmarDevolucion}
            onCancel={() => setShowModalDevolver(false)}
          />
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}