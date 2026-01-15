/**
 * RF004 - FLUJO DE APROBACIÓN DE AUTOS POR JEFE DE OCID
 * Sistema completo de revisión, edición, aprobación, firma y notificación
 * VERSIÓN OPTIMIZADA: Responsive y Paleta Corporativa ESAP
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Search, Eye, CheckCircle, XCircle, Edit2,
  MessageSquare, Clock, Send, Download, Upload, FileSignature,
  User, AlertCircle, History, X, Check,
  RotateCcw, Mail, Calendar,
  Shield, Key, Users, Trash2, ChevronDown, AlertTriangle,
  Filter, Paperclip, ListFilter, List, LayoutDashboard,
  HelpCircle, Info
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { toast } from 'sonner';
import { FlujoRevisionAprobacion } from './FlujoRevisionAprobacion';
import { disciplinaryService, LegalAuto } from '../../../services/api/disciplinary.service';

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
  estado: 'pendiente_revision' | 'en_revision' | 'aprobado' | 'devuelto' | 'REVISION_JEFE' | 'APROBADO' | 'FIRMADO' | 'NOTIFICADO' | 'BORRADOR';
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

// Helper to map backend status to frontend status
const mapBackendStatus = (status: string) => status;

// Helper configuration for statuses
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'BORRADOR':
      return { label: 'Borrador', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: FileText };
    case 'REVISION_JEFE':
      return { label: 'En Revisión', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock };
    case 'APROBADO':
      return { label: 'Aprobado', color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle };
    case 'DEVUELTO':
      return { label: 'Devuelto', color: 'bg-red-50 text-red-700 border-red-200', icon: RotateCcw };
    case 'FIRMADO':
      return { label: 'Firmado', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: FileSignature };
    case 'NOTIFICADO':
      return { label: 'Notificado', color: 'bg-teal-50 text-teal-700 border-teal-200', icon: Send };
    default:
      return { label: 'Desconocido', color: 'bg-gray-50 text-gray-500 border-gray-100', icon: HelpCircle };
  }
};

// Mock Data - Empty as it will be loaded from backend
// Mock Data - Empty as it will be loaded from backend
const BORRADORES_PENDIENTES: BorradorPendiente[] = [];

// Modal de Revisión y Edición - RESPONSIVE
// Modal de Revisión y Edición - RESPONSIVE
function ModalRevisionEdicion({
  borrador,
  onClose,
  onAprobar,
  onDevolver,
  onFirmar,
  onNotificar
}: {
  borrador: BorradorPendiente;
  onClose: () => void;
  onAprobar: (comentarios: string) => void;
  onDevolver: (motivo: string, comentarios: string, archivos: File[]) => void;
  onFirmar: () => void;
  onNotificar: (fecha: string, archivo: File) => void;
}) {
  const [comentariosJefe, setComentariosJefe] = useState('');
  const [showModalAprobar, setShowModalAprobar] = useState(false); // For Signing
  const [showModalDevolver, setShowModalDevolver] = useState(false);
  const [showConfirmAprobar, setShowConfirmAprobar] = useState(false); // For Approval
  const [showModalNotificar, setShowModalNotificar] = useState(false); // For Notification
  const [activeTab, setActiveTab] = useState<'documento' | 'historial'>('documento');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-6xl max-h-[98vh] sm:max-h-[95vh] overflow-hidden flex flex-col"
      >
        {/* Header - RESPONSIVE */}
        <div className="p-4 sm:p-6 border-b" style={{ background: '#003DA5' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <FileSignature className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                    Revisión de Auto
                  </h2>
                  <p className="text-xs sm:text-sm text-white/90 truncate">{borrador.numeroProceso}</p>
                </div>
              </div>

              {/* Info Compacta Mobile */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-white/90 text-blue-900 border-0 text-xs">
                  v{borrador.version}
                </Badge>
                <Badge className="bg-white/90 text-blue-900 border-0 text-xs">
                  {borrador.etapa}
                </Badge>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b bg-gray-50 overflow-x-auto">
          <div className="flex px-3 sm:px-6 min-w-max">
            <button
              onClick={() => setActiveTab('documento')}
              className={`px-4 sm:px-6 py-2.5 sm:py-3 font-semibold text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'documento'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline-block mr-1.5" />
              Documento
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              className={`px-4 sm:px-6 py-2.5 sm:py-3 font-semibold text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'historial'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              <History className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline-block mr-1.5" />
              Historial ({borrador.historial.length})
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {activeTab === 'documento' ? (
            <div className="space-y-4 sm:space-y-5">
              {/* Info Denunciado */}
              <Card className="p-3 sm:p-4 bg-blue-50 border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-blue-600 mb-1">DENUNCIADO/INVESTIGADO</p>
                    <p className="font-bold text-gray-900 text-sm sm:text-base truncate">{borrador.denunciado}</p>
                    <p className="text-xs text-gray-600 mt-1">Etapa: {borrador.etapa}</p>
                  </div>
                </div>
              </Card>

              {/* Profesional */}
              <Card className="p-3 sm:p-4 bg-gray-50 border-gray-200">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 ring-2 ring-blue-100">
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                      {borrador.profesional.nombre.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{borrador.profesional.nombre}</p>
                    <p className="text-xs text-gray-600 truncate">{borrador.profesional.email}</p>
                  </div>
                </div>
              </Card>

              {/* Contenido Texto */}
              <div className="mt-4">
                <Card className="p-4 bg-gray-50 border-gray-200">
                  <pre className="whitespace-pre-wrap font-serif text-sm text-gray-900">{borrador.contenido}</pre>
                </Card>
              </div>

              {/* Comentarios Internos */}
              <div className="mt-4">
                <label className="block font-semibold text-gray-900 mb-2 text-sm">
                  Comentarios Internos (Opcional)
                </label>
                <textarea
                  value={comentariosJefe}
                  onChange={(e) => setComentariosJefe(e.target.value)}
                  placeholder="Agregue comentarios internos..."
                  className="w-full h-24 p-3 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>
          ) : (
            // Tab de Historial
            <div className="space-y-3 sm:space-y-4">
              {borrador.historial.map((accion, index) => (
                <Card key={accion.id || index} className="p-3 sm:p-4 border-l-4" style={{ borderLeftColor: '#003DA5' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <History className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 mb-1">{accion.descripcion}</p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-gray-600">
                        <span className="truncate">{accion.usuario}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>{new Date(accion.fecha).toLocaleDateString('es-CO')}</span>
                      </div>
                      {/* Evidence Link */}
                      {accion.detalles?.evidenceUrl && (
                        <div className="mt-2">
                          <a
                            href={accion.detalles.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            <Paperclip className="w-3 h-3" />
                            Ver Soporte de Notificación
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-6 border-t bg-gray-50 flex flex-col sm:flex-row gap-2 sm:gap-3">
          {borrador.estado === 'REVISION_JEFE' && (
            <>
              <Button
                onClick={() => setShowModalDevolver(true)}
                className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto order-2 sm:order-1"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Devolver
              </Button>
              <Button
                onClick={() => setShowConfirmAprobar(true)}
                style={{ background: '#10B981', color: '#FFFFFF' }}
                className="hover:opacity-90 w-full sm:flex-1 order-1 sm:order-2"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Aprobar (Visto Bueno)
              </Button>
            </>
          )}

          {borrador.estado === 'FIRMADO' && (
            <Button
              onClick={() => setShowModalNotificar(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white w-full sm:flex-1 order-1 sm:order-2"
            >
              <Send className="w-4 h-4 mr-2" />
              Registrar Notificación
            </Button>
          )}

          {borrador.estado === 'APROBADO' && (
            <Button
              onClick={() => setShowModalAprobar(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:flex-1 order-1 sm:order-2"
            >
              <FileSignature className="w-4 h-4 mr-2" />
              Firmar Digitalmente
            </Button>
          )}

          <Button onClick={onClose} className="bg-gray-500 hover:bg-gray-600 w-full sm:w-auto order-3">
            Cerrar
          </Button>
        </div>

        {/* Modales Anidados */}
        <AnimatePresence>
          {showModalAprobar && (
            <ModalAprobar
              borrador={borrador}
              comentariosJefe={comentariosJefe}
              onClose={() => setShowModalAprobar(false)}
              onConfirm={(comentarios) => {
                onFirmar();
                setShowModalAprobar(false);
              }}
            />
          )}

          {showConfirmAprobar && (
            <ModalConfirmarAprobacion
              onClose={() => setShowConfirmAprobar(false)}
              onConfirm={() => {
                onAprobar(comentariosJefe);
                setShowConfirmAprobar(false);
              }}
            />
          )}

          {showModalDevolver && (
            <ModalDevolver
              borrador={borrador}
              onClose={() => setShowModalDevolver(false)}
              onConfirm={(motivo, comentarios, archivos) => {
                onDevolver(motivo, comentarios, archivos);
                setShowModalDevolver(false);
              }}
            />
          )}

          {showModalNotificar && (
            <ModalRegistrarNotificacion
              borrador={borrador}
              onClose={() => setShowModalNotificar(false)}
              onConfirm={(fecha, archivo) => {
                onNotificar(fecha, archivo);
                setShowModalNotificar(false);
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// Modal simple para confirmar aprobación (Visto Bueno)
function ModalConfirmarAprobacion({ onClose, onConfirm }: { onClose: () => void, onConfirm: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">¿Aprobar Borrador?</h3>
          <p className="text-gray-600 mb-6">
            Al aprobar este borrador, certifica que cumple con los requisitos jurídicos.
            El estado cambiará a <strong>APROBADO</strong> y quedará habilitado para firma.
          </p>
          <div className="flex gap-3 w-full">
            <Button onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200">
              Cancelar
            </Button>
            <Button onClick={onConfirm} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
              Confirmar Aprobación
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Modal de Aprobación FINAL y Firma
function ModalAprobar({
  borrador,
  comentariosJefe,
  onClose,
  onConfirm
}: {
  borrador: BorradorPendiente;
  comentariosJefe: string;
  onClose: () => void;
  onConfirm: (comentarios: string) => void;
}) {
  const [signatureMethod, setSignatureMethod] = useState<'ELECTRONIC' | 'DIGITAL_PROVIDER' | 'LOCAL_PDF'>('ELECTRONIC');
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [comentariosAprobacion, setComentariosAprobacion] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSignature, setHasSignature] = useState<boolean | null>(null);
  const [checkingSignature, setCheckingSignature] = useState(true);

  // Simulación de usuario actual (temporal)
  const currentUser = { id: '770e8400-e29b-41d4-a716-446655440002', nombre: 'Admin Sistema' };

  useEffect(() => {
    checkSignature();
  }, []);

  const checkSignature = async () => {
    try {
      setCheckingSignature(true);
      const professionals = await disciplinaryService.getProfesionales();

      // Intentar encontrar al usuario por ID o correo (lógica de mock para desarrollo)
      const me = professionals.find((p: any) => p.id === currentUser.id) ||
        professionals.find((p: any) => p.email === 'juan.perez@esap.edu.co') ||
        professionals[0]; // Fallback al primero si no encuentra los anteriores

      setHasSignature(!!(me && me.firmaUrl));
    } catch (error) {
      console.error('Error checking signature:', error);
      setHasSignature(false);
    } finally {
      setCheckingSignature(false);
    }
  };

  const handleFirmar = () => {
    if (signatureMethod === 'ELECTRONIC') {
      if (!hasSignature) {
        toast.error('No tiene una firma configurada', {
          description: 'Debe cargar su firma digital en el Módulo de Configuración antes de firmar.'
        });
        return;
      }
    } else if (signatureMethod === 'LOCAL_PDF' && !localFile) {
      toast.error('Archivo requerido', {
        description: 'Debe adjuntar el PDF firmado.'
      });
      return;
    }

    setLoading(true);
    setTimeout(() => {
      onConfirm(comentariosAprobacion);
      setLoading(false);
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-2 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header - Firma */}
        <div className="p-4 sm:p-6 border-b" style={{ background: '#003DA5' }}>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <FileSignature className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-white">Firmar Auto</h3>
              <p className="text-xs sm:text-sm text-white/90 truncate">{borrador.numeroProceso}</p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">

          <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: '#E0EDFF' }}>
            <AlertTriangle className="w-5 h-5 text-blue-800 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              Al firmar este documento, usted certifica su validez jurídica y procedimental.
            </p>
          </div>

          {/* Tipo de Firma */}
          <div>
            <label className="block font-bold text-gray-900 mb-3 text-sm sm:text-base">
              Método de Firma
            </label>
            <div className="space-y-3">
              {/* Firma Electrónica */}
              <button
                onClick={() => setSignatureMethod('ELECTRONIC')}
                className={`w-full text-left p-3 sm:p-4 border-2 transition-all flex items-center gap-3 rounded-lg ${signatureMethod === 'ELECTRONIC' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
              >
                <div className={`p-2 rounded-full ${signatureMethod === 'ELECTRONIC' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <FileText className={`w-5 h-5 ${signatureMethod === 'ELECTRONIC' ? 'text-blue-600' : 'text-gray-500'}`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-sm sm:text-base">Firma Electrónica (Interna)</h4>
                  <p className="text-xs text-gray-500">Usar mi firma cargada en el sistema</p>
                </div>
                {signatureMethod === 'ELECTRONIC' && <CheckCircle className="w-5 h-5 text-blue-600" />}
              </button>

              {/* Firma Digital Proveedor */}
              <button
                onClick={() => setSignatureMethod('DIGITAL_PROVIDER')}
                className={`w-full text-left p-3 sm:p-4 border-2 transition-all flex items-center gap-3 rounded-lg ${signatureMethod === 'DIGITAL_PROVIDER' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
              >
                <div className={`p-2 rounded-full ${signatureMethod === 'DIGITAL_PROVIDER' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <Shield className={`w-5 h-5 ${signatureMethod === 'DIGITAL_PROVIDER' ? 'text-blue-600' : 'text-gray-500'}`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-sm sm:text-base">Firma Digital (Certicámara/Otros)</h4>
                  <p className="text-xs text-gray-500">Usar token o integración con proveedor</p>
                </div>
                {signatureMethod === 'DIGITAL_PROVIDER' && <CheckCircle className="w-5 h-5 text-blue-600" />}
              </button>

              {/* Firma Local */}
              <button
                onClick={() => setSignatureMethod('LOCAL_PDF')}
                className={`w-full text-left p-3 sm:p-4 border-2 transition-all flex items-center gap-3 rounded-lg ${signatureMethod === 'LOCAL_PDF' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
              >
                <div className={`p-2 rounded-full ${signatureMethod === 'LOCAL_PDF' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <Upload className={`w-5 h-5 ${signatureMethod === 'LOCAL_PDF' ? 'text-blue-600' : 'text-gray-500'}`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-sm sm:text-base">Firma Local (Subir PDF)</h4>
                  <p className="text-xs text-gray-500">Descargar, firmar localmente y subir</p>
                </div>
                {signatureMethod === 'LOCAL_PDF' && <CheckCircle className="w-5 h-5 text-blue-600" />}
              </button>
            </div>
          </div>

          {/* Configuración Específica según método */}
          <AnimatePresence mode="wait">
            {signatureMethod === 'ELECTRONIC' && (
              <motion.div
                key="electronic"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {!checkingSignature && !hasSignature && (
                  <div className="p-4 rounded-xl flex items-start gap-3 mt-2" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-800">Firma no configurada</p>
                      <p className="text-sm text-red-700">
                        No se ha detectado una firma digital asociada a su usuario.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {signatureMethod === 'DIGITAL_PROVIDER' && (
              <motion.div
                key="provider"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2"
              >
                <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-sm">
                  <p className="font-bold flex items-center gap-2">
                    <Info className="w-4 h-4" /> Integración Externa
                  </p>
                  <p className="mt-1">
                    Será redirigido al portal del proveedor de firma digital autorizada (ej. Certicámara) para completar el proceso.
                  </p>
                </div>
              </motion.div>
            )}

            {signatureMethod === 'LOCAL_PDF' && (
              <motion.div
                key="local"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 space-y-3"
              >
                <div className="flex gap-3">
                  <Button className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300">
                    <Download className="w-4 h-4 mr-2" />
                    1. Descargar PDF
                  </Button>
                  <div className="flex-1 relative">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setLocalFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full z-10"
                    />
                    <Button className={`w-full ${localFile ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                      {localFile ? <CheckCircle className="w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                      {localFile ? 'PDF Cargado' : '2. Subir Firmado'}
                    </Button>
                  </div>
                </div>
                {localFile && (
                  <p className="text-xs text-green-600 font-medium text-center">
                    Archivo seleccionado: {localFile.name}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Comentarios */}
          <div>
            <label className="block font-bold text-gray-900 mb-2 text-sm sm:text-base">
              Comentarios de la Firma (Opcional)
            </label>
            <textarea
              value={comentariosAprobacion}
              onChange={(e) => setComentariosAprobacion(e.target.value)}
              placeholder="Agregue observaciones finales..."
              className="w-full h-24 p-3 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t bg-gray-50 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button onClick={onClose} className="bg-gray-500 hover:bg-gray-600 w-full sm:w-auto order-2 sm:order-1">
            Cancelar
          </Button>
          <Button
            onClick={handleFirmar}
            disabled={loading || checkingSignature || !hasSignature}
            style={{ background: hasSignature ? '#003DA5' : '#9CA3AF', color: '#FFFFFF' }}
            className={`hover:opacity-90 w-full sm:flex-1 order-1 sm:order-2 ${!hasSignature ? 'cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Firmando...
              </>
            ) : (
              <>
                <FileSignature className="w-4 h-4 mr-2" />
                Firmar Digitalmente
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Modal de Devolución - RESPONSIVE Y CORPORATIVO
// Modal de Devolución - RESPONSIVE Y CORPORATIVO
function ModalDevolver({
  borrador,
  onClose,
  onConfirm
}: {
  borrador: BorradorPendiente;
  onClose: () => void;
  onConfirm: (motivo: string, comentarios: string, archivos: File[]) => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [archivosAdjuntos, setArchivosAdjuntos] = useState<File[]>([]);

  const handleAgregarArchivos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setArchivosAdjuntos([...archivosAdjuntos, ...Array.from(e.target.files)]);
    }
  };

  const handleConfirmar = () => {
    if (!motivo.trim()) {
      toast.error('Motivo Requerido', {
        description: 'Debe especificar el motivo de la devolución'
      });
      return;
    }
    if (!comentarios.trim()) {
      toast.error('Comentarios Requeridos', {
        description: 'Proporcione comentarios detallados'
      });
      return;
    }
    onConfirm(motivo, comentarios, archivosAdjuntos);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-2 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b bg-red-600">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-white">Devolver para Correcciones</h3>
              <p className="text-xs sm:text-sm text-white/90 truncate">{borrador.numeroProceso}</p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Motivo */}
          <div>
            <label className="block font-bold text-gray-900 mb-2 text-sm sm:text-base">
              Motivo de la Devolución <span className="text-red-600">*</span>
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Seleccione un motivo...</option>
              <option value="correccion_forma">Corrección de Forma/Redacción</option>
              <option value="falta_revisar_pruebas">Falta Revisión de Pruebas</option>
              <option value="error_fundamentacion">Error en Fundamentación Jurídica</option>
              <option value="documentos_faltantes">Documentos Soporte Faltantes</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          {/* Comentarios */}
          <div>
            <label className="block font-bold text-gray-900 mb-2 text-sm sm:text-base">
              Observaciones Detalladas <span className="text-red-600">*</span>
            </label>
            <textarea
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              placeholder="Describa las correcciones requeridas..."
              className="w-full h-32 p-3 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            />
          </div>

          {/* Adjuntar Archivos */}
          <div className="space-y-3">
            <label className="block font-bold text-gray-900 text-sm sm:text-base">
              Adjuntar Correcciones (Opcional)
            </label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click para subir</span>
                  </p>
                  <p className="text-xs text-gray-500">Word, PDF (Max 10MB)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={handleAgregarArchivos}
                />
              </label>
            </div>

            {/* Lista de Archivos */}
            {archivosAdjuntos.length > 0 && (
              <div className="space-y-2">
                {archivosAdjuntos.map((archivo, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 truncate">
                      <Paperclip className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700 truncate">{archivo.name}</span>
                    </div>
                    <button
                      onClick={() => setArchivosAdjuntos(archivosAdjuntos.filter((_, i) => i !== index))}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t bg-gray-50 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            onClick={handleConfirmar}
            className="bg-red-600 hover:bg-red-700 text-white w-full sm:flex-1"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Confirmar Devolución
          </Button>
          <Button onClick={onClose} className="bg-gray-500 hover:bg-gray-600 w-full sm:w-auto">
            Cancelar
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Modal de Registro de Notificación - NUEVO
function ModalRegistrarNotificacion({
  borrador,
  onClose,
  onConfirm
}: {
  borrador: BorradorPendiente;
  onClose: () => void;
  onConfirm: (fecha: string, archivo: File) => void;
}) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [archivo, setArchivo] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArchivo(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (!archivo) {
      toast.error('Evidencia Requerida', { description: 'Debe adjuntar el soporte de la notificación (PDF/Imagen)' });
      return;
    }
    onConfirm(fecha, archivo);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 bg-teal-600 text-white flex items-center gap-3">
          <Send className="w-6 h-6" />
          <h3 className="text-lg font-bold">Registrar Notificación</h3>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Notificación</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Evidencia (Soporte)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
              <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf,image/*" />
              {archivo ? (
                <div className="flex items-center gap-2 text-teal-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium truncate max-w-[200px]">{archivo.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Click para subir soporte</p>
                  <p className="text-xs text-gray-400">PDF o Imagen</p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t flex gap-3">
          <Button onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 hover:bg-gray-300">Cancelar</Button>
          <Button onClick={handleSubmit} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white">Confirmar</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Componente Principal - RESPONSIVE Y CORPORATIVO
export function RevisionAprobacionJefe() {
  const [borradores, setBorradores] = useState<BorradorPendiente[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [filterPrioridad, setFilterPrioridad] = useState('all');
  const [filterEtapa, setFilterEtapa] = useState('all');
  const [filterTipoAuto, setFilterTipoAuto] = useState('all');
  const [borradorSeleccionado, setBorradorSeleccionado] = useState<BorradorPendiente | null>(null);
  const [showModalRevision, setShowModalRevision] = useState(false);
  const [showFlujoModal, setShowFlujoModal] = useState(false);
  const [hideFinalized, setHideFinalized] = useState(false);

  // Authentication Context Placeholder - Using ADMIN ID from seed
  const currentUser = { id: '770e8400-e29b-41d4-a716-446655440002', nombre: 'Admin Sistema' };

  const loadAutos = async () => {
    try {
      setLoading(true);
      const autos = await disciplinaryService.getAllAutos();

      // Filter out drafts (but keep NOTIFICADO)
      const mappedBorradores: BorradorPendiente[] = autos
        .filter(auto => auto.estado !== 'BORRADOR')
        .map(auto => {
          const proceso = (auto as any).process || {};
          const abogado = proceso.abogadoAsignado || {};
          const news = proceso.news || {};
          const disciplinableList = Array.isArray(news.disciplinable)
            ? news.disciplinable
            : (news.disciplinable ? [news.disciplinable] : []);

          const denunciadoNombre = disciplinableList.length > 0
            ? disciplinableList[0].nombre
            : 'Desconocido';

          // Map history from versions
          const sortedVersions = ((auto as any).versions || []).sort((a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          const historial = sortedVersions.map((v: any) => {
            let nombreUsuario = 'Sistema';
            if (v.createdBy === currentUser.id) {
              nombreUsuario = 'Jefe (Yo)';
            } else if (abogado && v.createdBy === abogado.id) {
              nombreUsuario = 'Profesional';
            }

            // Parse structured changeReason
            let descripcion = v.changeReason || `Versión ${v.versionNumber}`;
            let detalles = {};

            try {
              if (descripcion.startsWith('{')) {
                const parsed = JSON.parse(descripcion);
                if (parsed.action === 'NOTIFICACION_REGISTRADA') {
                  descripcion = `Notificación Registrada (Fecha: ${parsed.date})`;
                  detalles = { evidenceUrl: parsed.evidenceUrl };
                }
              }
            } catch (e) {
              // Not JSON, keep original description
            }

            return {
              id: v.id,
              descripcion: descripcion,
              usuario: nombreUsuario,
              fecha: v.createdAt,
              detalles: detalles
            };
          });


          return {
            id: auto.id,
            numeroProceso: proceso.radicadoProceso || 'SIN-RADICADO',
            titulo: auto.tipo,
            plantilla: auto.tipo,
            version: (auto as any).currentVersion || 1,
            fechaEnvio: auto.createdAt,
            profesional: {
              nombre: abogado.nombreCompleto || abogado.nombre || 'Sin Asignar',
              email: abogado.email || 'N/A'
            },
            observacionesProfesional: (auto as any).comentarios || 'Sin observaciones',
            contenido: auto.contenido,
            denunciado: denunciadoNombre,
            etapa: proceso.etapaActual || 'Etapa desconocida',
            prioridad: 'media',
            estado: mapBackendStatus(auto.estado) as any,
            historial: historial,
            tiempoEspera: '0h'
          };
        });

      setBorradores(mappedBorradores);
    } catch (error) {
      console.error('Error loading autos:', error);
      toast.error('Error al cargar revisiones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAutos();
  }, []);

  const handleAprobar = async (borradorId: string, comentarios: string) => {
    try {
      await disciplinaryService.aprobarAuto(borradorId, currentUser.id);

      toast.success('Auto Aprobado', {
        description: 'El documento ha pasado a estado Aprobado y está listo para firma'
      });

      setShowModalRevision(false);
      setBorradorSeleccionado(null);
      loadAutos(); // Refresh
    } catch (error) {
      console.error(error);
      toast.error('Error al aprobar el auto');
    }
  };

  const handleFirmar = async (borradorId: string) => {
    try {
      await disciplinaryService.firmarAuto(borradorId, currentUser.id);

      toast.success('Auto Firmado Exitosamente', {
        description: `El documento ha sido firmado digitalmente por ${currentUser.nombre}`
      });

      setShowModalRevision(false);
      setBorradorSeleccionado(null);
      loadAutos(); // Refresh
    } catch (error) {
      console.error(error);
      toast.error('Error al firmar el auto');
    }
  };

  const handleDevolver = async (borradorId: string, motivo: string, comentarios: string, archivos: File[]) => {
    try {
      await disciplinaryService.devolverAuto(borradorId, currentUser.id, `${motivo}: ${comentarios}`);

      toast.success('Auto Devuelto', {
        description: 'Se ha notificado al profesional para correcciones'
      });

      setShowModalRevision(false);
      setBorradorSeleccionado(null);
      loadAutos(); // Refresh
    } catch (error) {
      console.error(error);
      toast.error('Error al devolver el auto');
    }
  };

  const handleNotificar = async (borradorId: string, fecha: string, archivo: File) => {
    try {
      // 1. Subir archivo
      const uploadRes = await disciplinaryService.uploadFile(archivo);

      // 2. Registrar Notificación
      await disciplinaryService.registrarNotificacion(borradorId, fecha, uploadRes.url);

      toast.success('Notificación Registrada', {
        description: 'El auto ha cambiado a estado NOTIFICADO'
      });

      setShowModalRevision(false);
      setBorradorSeleccionado(null);
      loadAutos(); // Refresh
    } catch (error) {
      console.error('Error notificando:', error);
      toast.error('Error al registrar notificación');
    }
  };

  const filteredBorradores = borradores.filter(b => {
    const matchesSearch =
      b.numeroProceso.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.profesional.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.denunciado.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesEstado = filterEstado === 'all' || b.estado === filterEstado;
    const matchesPrioridad = filterPrioridad === 'all' || b.prioridad === filterPrioridad;
    const matchesEtapa = filterEtapa === 'all' || b.etapa === filterEtapa;
    const matchesTipo = filterTipoAuto === 'all' || b.plantilla === filterTipoAuto;
    const filterFinalized = hideFinalized ? (b.estado !== 'FIRMADO' && b.estado !== 'DEVUELTO') : true;

    return matchesSearch && matchesEstado && matchesPrioridad && matchesEtapa && matchesTipo && filterFinalized;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-10">
      {/* Header Corporativo Fixed */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 sm:py-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-600 rounded-xl shadow-lg shadow-red-200">
                <FileSignature className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                  Revisión y Aprobación
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 font-medium">
                  Control Interno Disciplinario
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFlujoModal(true)}
                className="hidden sm:flex text-blue-700 border-blue-200 hover:bg-blue-50"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Ver Flujo
              </Button>
              <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 hidden sm:block">
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-0.5">Pendientes</p>
                <p className="text-2xl font-bold text-blue-900 leading-none">
                  {borradores.filter(b => b.estado === 'pendiente_revision').length}
                </p>
              </div>
            </div>
          </div>

          {/* Filtros Avanzados - Responsive Grid */}
          <div className="py-4 border-t space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Buscador Principal */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por radicado, profesional o denunciado..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                />
              </div>

              {/* Filtros Rápidos Mobile */}
              <div className="flex sm:hidden gap-2 overflow-x-auto pb-1">
                <select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                  className="bg-white border text-sm rounded-lg px-3 py-2 whitespace-nowrap"
                >
                  <option value="all">Todos los Estados</option>
                  <option value="pendiente_revision">Pendientes</option>
                  <option value="en_revision">En Revisión</option>
                </select>
                {/* Más filtros si es necesario */}
              </div>
            </div>

            {/* Filtros Desktop */}
            <div className="hidden sm:flex flex-wrap gap-3">
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="bg-white border-none py-2 px-4 rounded-lg text-sm font-medium text-gray-600 ring-1 ring-gray-200 hover:ring-gray-300 focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
              >
                <option value="all">Todos los Estados</option>
                <option value="REVISION_JEFE">En Revisión</option>
                <option value="APROBADO">Aprobados</option>
                <option value="DEVUELTO">Devueltos</option>
                <option value="NOTIFICADO">Notificados</option>
                <option value="BORRADOR">Borradores</option>
              </select>

              <select
                value={filterPrioridad}
                onChange={(e) => setFilterPrioridad(e.target.value)}
                className="bg-white border-none py-2 px-4 rounded-lg text-sm font-medium text-gray-600 ring-1 ring-gray-200 hover:ring-gray-300 focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
              >
                <option value="all">Todas las Prioridades</option>
                <option value="alta">Alta Prioridad</option>
                <option value="media">Prioridad Media</option>
                <option value="baja">Prioridad Baja</option>
              </select>

              <select
                value={filterEtapa}
                onChange={(e) => setFilterEtapa(e.target.value)}
                className="bg-white border-none py-2 px-4 rounded-lg text-sm font-medium text-gray-600 ring-1 ring-gray-200 hover:ring-gray-300 focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
              >
                <option value="all">Todas las Etapas</option>
                <option value="Indagación Preliminar">Indagación Preliminar</option>
                <option value="Investigación">Investigación</option>
                <option value="Juzgamiento">Juzgamiento</option>
              </select>

              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  id="hideFinalized"
                  checked={hideFinalized}
                  onChange={(e) => setHideFinalized(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="hideFinalized" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                  Ocultar Finalizados
                </label>
              </div>

              <div className="flex-1" /> {/* Spacer */}

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Filter className="w-4 h-4" />
                <span>{filteredBorradores.length} resultados</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Tarjetas - GRID RESPONSIVE */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loading ? (
          <div className="flex justify-center py-10">
            <span className="loading loading-spinner text-primary"></span>
          </div>
        ) : filteredBorradores.length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <div className="bg-gray-50 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <FileSignature className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No hay revisiones pendientes</h3>
            <p className="text-gray-500 max-w-sm mx-auto text-sm sm:text-base">
              Al parecer estás al día con tus responsabilidades. ¡Buen trabajo!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            <AnimatePresence>
              {filteredBorradores.map((borrador) => (
                <motion.div
                  key={borrador.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Card
                    className="group hover:shadow-xl transition-all duration-300 border-l-4 overflow-hidden relative"
                    style={{
                      borderLeftColor:
                        borrador.prioridad === 'alta' ? '#EF4444' :
                          borrador.prioridad === 'media' ? '#F59E0B' : '#10B981'
                    }}
                  >
                    {/* Badge de Estado Absoluto */}
                    <div className="absolute top-3 right-3">
                      <Badge className={`
                        ${getStatusConfig(borrador.estado).color}
                        border-0 px-2 py-1 text-xs font-semibold flex items-center gap-1.5
                      `}>
                        {(() => {
                          const Icon = getStatusConfig(borrador.estado).icon;
                          return <Icon className="w-3 h-3" />;
                        })()}
                        {getStatusConfig(borrador.estado).label}
                      </Badge>
                    </div>

                    <div className="p-4 sm:p-5">
                      {/* Cabecera Tarjeta */}
                      <div className="mb-4 pr-16 sm:pr-20">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 line-clamp-2" title={borrador.titulo}>
                          {borrador.titulo}
                        </h3>
                        <p className="text-xs font-mono text-gray-500 flex items-center gap-2">
                          {borrador.numeroProceso}
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          v{borrador.version}
                        </p>
                      </div>

                      {/* Info Principal */}
                      <div className="space-y-3 mb-4 sm:mb-5">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-8 h-8 ring-2 ring-gray-100">
                            <AvatarFallback className="bg-gray-100 text-gray-600 text-xs font-bold">
                              {borrador.profesional.nombre.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{borrador.profesional.nombre}</p>
                            <p className="text-xs text-gray-500">Profesional Asignado</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span className="truncate flex-1 font-medium">{borrador.denunciado}</span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>Enviado: {new Date(borrador.fechaEnvio).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Botón Acción */}
                      <Button
                        onClick={() => {
                          setBorradorSeleccionado(borrador);
                          setShowModalRevision(true);
                        }}
                        className="w-full bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 hover:border-blue-300 font-semibold group-hover:bg-blue-600 group-hover:text-white group-hover:border-transparent transition-all duration-300 shadow-sm"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Revisar Documento
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Modal Principal de Revisión */}
      <AnimatePresence>
        {showModalRevision && borradorSeleccionado && (
          <ModalRevisionEdicion
            borrador={borradorSeleccionado}
            onClose={() => {
              setShowModalRevision(false);
              setBorradorSeleccionado(null);
            }}
            onAprobar={(comentarios) => handleAprobar(borradorSeleccionado.id, comentarios)}
            onDevolver={(motivo, comentarios, archivos) => handleDevolver(borradorSeleccionado.id, motivo, comentarios, archivos)}
            onFirmar={() => handleFirmar(borradorSeleccionado.id)}
            onNotificar={(fecha, archivo) => handleNotificar(borradorSeleccionado.id, fecha, archivo)}
          />
        )}
      </AnimatePresence>

      {/* Modal de Ayuda */}
      <FlujoRevisionAprobacion
        isOpen={showFlujoModal}
        onClose={() => setShowFlujoModal(false)}
      />
    </div>
  );
}