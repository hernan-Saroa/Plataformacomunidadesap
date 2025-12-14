/**
 * RF004 - FLUJO DE APROBACIÓN DE AUTOS POR JEFE DE OCID
 * Sistema completo de revisión, edición, aprobación, firma y notificación
 * VERSIÓN OPTIMIZADA: Responsive y Paleta Corporativa ESAP
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
  HelpCircle
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

// Modal de Revisión y Edición - RESPONSIVE
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

        {/* Tabs - RESPONSIVE */}
        <div className="border-b bg-gray-50 overflow-x-auto">
          <div className="flex px-3 sm:px-6 min-w-max">
            <button
              onClick={() => setActiveTab('documento')}
              className={`px-4 sm:px-6 py-2.5 sm:py-3 font-semibold text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'documento'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline-block mr-1.5" />
              Documento
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              className={`px-4 sm:px-6 py-2.5 sm:py-3 font-semibold text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'historial'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <History className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline-block mr-1.5" />
              Historial ({borrador.historial.length})
            </button>
          </div>
        </div>

        {/* Contenido - RESPONSIVE */}
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

              {/* Profesional - Mobile */}
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

              {/* Observaciones */}
              <Card className="p-3 sm:p-4 bg-gray-50 border-gray-300">
                <div className="flex gap-3">
                  <MessageSquare className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Observaciones del Profesional:</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{borrador.observacionesProfesional}</p>
                  </div>
                </div>
              </Card>

              {/* Contenido del Auto */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5" style={{ color: '#003DA5' }} />
                    Contenido del Auto
                  </h3>
                  <div className="flex gap-2">
                    {!archivoAuto && (
                      <label htmlFor="upload-auto" className="cursor-pointer">
                        <div className="px-3 py-2 rounded-lg border-2 border-blue-500 text-blue-700 hover:bg-blue-50 transition-colors flex items-center gap-2 text-sm font-semibold">
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
                    <Button
                      onClick={() => setModoEdicion(!modoEdicion)}
                      style={{ background: modoEdicion ? '#6B7280' : '#003DA5' }}
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      {modoEdicion ? 'Cancelar' : 'Editar'}
                    </Button>
                  </div>
                </div>

                {/* Archivo subido */}
                {archivoAuto && (
                  <Card className="p-4 mb-3 bg-green-50 border-green-200">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                          {archivoAuto.name.endsWith('.pdf') ? (
                            <FileText className="w-5 h-5 text-green-700" />
                          ) : (
                            <FileText className="w-5 h-5 text-blue-700" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{archivoAuto.name}</p>
                          <p className="text-xs text-gray-600">
                            {(archivoAuto.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => setTipoVista(tipoVista === 'archivo' ? 'texto' : 'archivo')}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          {tipoVista === 'archivo' ? 'Ver Texto' : 'Ver Archivo'}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            const url = URL.createObjectURL(archivoAuto);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = archivoAuto.name;
                            a.click();
                            URL.revokeObjectURL(url);
                            toast.success('Descargando archivo...');
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setArchivoAuto(null);
                            setTipoVista('texto');
                            toast.info('Archivo eliminado');
                          }}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {modoEdicion ? (
                  <div className="space-y-3">
                    <Card className="p-3 bg-blue-50 border-blue-200">
                      <p className="text-xs text-gray-700">
                        <AlertCircle className="w-3.5 h-3.5 inline-block mr-1" />
                        Las modificaciones quedarán registradas en auditoría.
                      </p>
                    </Card>
                    <textarea
                      value={contenidoEditado}
                      onChange={(e) => setContenidoEditado(e.target.value)}
                      className="w-full h-64 sm:h-80 p-3 sm:p-4 border-2 border-blue-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                    />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button 
                        onClick={handleGuardarEdicion} 
                        style={{ background: '#003DA5' }}
                        className="w-full sm:flex-1"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Guardar Cambios
                      </Button>
                      <Button 
                        onClick={() => setModoEdicion(false)} 
                        className="bg-gray-500 hover:bg-gray-600 w-full sm:w-auto"
                      >
                        Descartar
                      </Button>
                    </div>
                  </div>
                ) : tipoVista === 'archivo' && archivoAuto ? (
                  <Card className="p-0 border-2 border-gray-300 overflow-hidden">
                    {archivoAuto.name.endsWith('.pdf') ? (
                      <iframe
                        src={URL.createObjectURL(archivoAuto)}
                        className="w-full h-[500px] sm:h-[600px]"
                        title="Visualizador de PDF"
                      />
                    ) : (
                      <div className="p-8 text-center">
                        <FileText className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                        <p className="font-bold text-gray-900 mb-2">
                          Documento Word Cargado
                        </p>
                        <p className="text-sm text-gray-600 mb-4">
                          {archivoAuto.name}
                        </p>
                        <p className="text-xs text-gray-500 mb-4">
                          Los archivos Word (.doc, .docx) no pueden visualizarse directamente.<br />
                          Puedes descargar el archivo o ver el contenido en modo texto.
                        </p>
                        <div className="flex gap-3 justify-center">
                          <Button
                            onClick={() => {
                              const url = URL.createObjectURL(archivoAuto);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = archivoAuto.name;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            style={{ background: '#10B981' }}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Descargar Archivo
                          </Button>
                          <Button
                            onClick={() => setTipoVista('texto')}
                            style={{ background: '#003DA5' }}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Ver como Texto
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ) : (
                  <Card className="p-4 sm:p-5 bg-gray-50 border-gray-200">
                    <pre className="whitespace-pre-wrap font-serif text-xs sm:text-sm text-gray-900 leading-relaxed overflow-x-auto">
                      {contenidoEditado}
                    </pre>
                  </Card>
                )}
              </div>

              {/* Comentarios Internos */}
              <div>
                <label className="block font-semibold text-gray-900 mb-2 text-sm">
                  Comentarios Internos (Opcional)
                </label>
                <textarea
                  value={comentariosJefe}
                  onChange={(e) => setComentariosJefe(e.target.value)}
                  placeholder="Agregue comentarios internos..."
                  className="w-full h-24 p-3 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <p className="text-xs text-gray-500 mt-2">
                  <AlertCircle className="w-3 h-3 inline-block mr-1" />
                  Para registro interno. No aparecerán en el documento final.
                </p>
              </div>
            </div>
          ) : (
            // Tab de Historial
            <div className="space-y-3 sm:space-y-4">
              {borrador.historial.map((accion, index) => (
                <Card key={accion.id} className="p-3 sm:p-4 border-l-4" style={{ borderLeftColor: '#003DA5' }}>
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
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer - RESPONSIVE */}
        <div className="p-3 sm:p-6 border-t bg-gray-50 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            onClick={() => setShowModalDevolver(true)}
            className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto order-2 sm:order-1"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Devolver
          </Button>
          <Button
            onClick={() => setShowModalAprobar(true)}
            style={{ background: '#10B981', color: '#FFFFFF' }}
            className="hover:opacity-90 w-full sm:flex-1 order-1 sm:order-2"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Aprobar Auto
          </Button>
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
                onAprobar(comentarios);
                setShowModalAprobar(false);
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
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// Modal de Aprobación - RESPONSIVE Y CORPORATIVO
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
  const [tipoFirma, setTipoFirma] = useState<TipoFirma>('digital');
  const [comentariosAprobacion, setComentariosAprobacion] = useState(comentariosJefe);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[10000] p-2 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b bg-green-600">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-white">Aprobar Auto</h3>
              <p className="text-xs sm:text-sm text-white/90 truncate">{borrador.numeroProceso}</p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
          {/* Tipo de Firma */}
          <div>
            <label className="block font-bold text-gray-900 mb-3 text-sm sm:text-base">
              Seleccione el Tipo de Firma <span className="text-red-600">*</span>
            </label>
            <div className="space-y-3">
              {/* Firma Electrónica */}
              <Card
                className={`p-3 sm:p-4 cursor-pointer border-2 transition-all ${
                  tipoFirma === 'electronica' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => setTipoFirma('electronica')}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    tipoFirma === 'electronica' ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                  }`}>
                    {tipoFirma === 'electronica' && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base">Firma Electrónica Simple</h4>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Firma automática del sistema. Proceso inmediato.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Firma Digital */}
              <Card
                className={`p-3 sm:p-4 cursor-pointer border-2 transition-all ${
                  tipoFirma === 'digital' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => setTipoFirma('digital')}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    tipoFirma === 'digital' ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                  }`}>
                    {tipoFirma === 'digital' && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Key className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base">Firma Digital Certificada</h4>
                      <Badge className="bg-blue-600 text-white text-xs border-0">Recomendado</Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Validez jurídica mediante proveedor certificado.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Firma Local */}
              <Card
                className={`p-3 sm:p-4 cursor-pointer border-2 transition-all ${
                  tipoFirma === 'local' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => setTipoFirma('local')}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    tipoFirma === 'local' ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                  }`}>
                    {tipoFirma === 'local' && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Download className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base">Firma Local (PDF)</h4>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Descarga PDF para firma manual. Requiere carga posterior.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Comentarios */}
          <div>
            <label className="block font-semibold text-gray-900 mb-2 text-sm">
              Comentarios Internos (Opcional)
            </label>
            <textarea
              value={comentariosAprobacion}
              onChange={(e) => setComentariosAprobacion(e.target.value)}
              placeholder="Agregue observaciones internas..."
              className="w-full h-24 p-3 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            />
          </div>

          {/* Alerta según tipo */}
          {tipoFirma === 'digital' && (
            <Card className="p-3 sm:p-4 bg-blue-50 border-blue-200">
              <div className="flex gap-3">
                <Key className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-blue-900 font-semibold mb-1">Firma Digital Certificada</p>
                  <p className="text-xs sm:text-sm text-blue-700">
                    Se enviará a su proveedor configurado.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t bg-gray-50 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            onClick={() => onConfirm(comentariosAprobacion)}
            style={{ background: '#10B981', color: '#FFFFFF' }}
            className="hover:opacity-90 w-full sm:flex-1"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Confirmar Aprobación
          </Button>
          <Button onClick={onClose} className="bg-gray-500 hover:bg-gray-600 w-full sm:w-auto">
            Cancelar
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

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
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[10000] p-2 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col"
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
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Motivo */}
          <div>
            <label className="block font-bold text-gray-900 mb-2 text-sm sm:text-base">
              Motivo de la Devolución <span className="text-red-600">*</span>
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            >
              <option value="">Seleccione un motivo...</option>
              <option value="errores_forma">Errores de forma o redacción</option>
              <option value="falta_fundamentacion">Falta fundamentación jurídica</option>
              <option value="documentos_incompletos">Documentos incompletos</option>
              <option value="inconsistencias_juridicas">Inconsistencias jurídicas</option>
              <option value="requiere_ajustes">Requiere ajustes menores</option>
              <option value="otro">Otro motivo</option>
            </select>
          </div>

          {/* Comentarios */}
          <div>
            <label className="block font-bold text-gray-900 mb-2 text-sm sm:text-base">
              Comentarios Detallados <span className="text-red-600">*</span>
            </label>
            <textarea
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              placeholder="Describa detalladamente las correcciones..."
              className="w-full h-32 p-3 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            />
          </div>

          {/* Archivos */}
          <div>
            <label className="block font-semibold text-gray-900 mb-2 text-sm">
              Archivos Complementarios (Opcional)
            </label>
            <input
              type="file"
              multiple
              onChange={handleAgregarArchivos}
              className="hidden"
              id="archivos-devolucion"
            />
            <label
              htmlFor="archivos-devolucion"
              className="block p-4 sm:p-6 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-red-400 hover:bg-red-50 transition-all"
            >
              <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-xs sm:text-sm font-semibold text-gray-700">Click para adjuntar</p>
            </label>
            {archivosAdjuntos.length > 0 && (
              <div className="mt-3 space-y-2">
                {archivosAdjuntos.map((archivo, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                    <FileText className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    <span className="text-xs sm:text-sm flex-1 truncate">{archivo.name}</span>
                    <button
                      onClick={() => setArchivosAdjuntos(archivosAdjuntos.filter((_, i) => i !== index))}
                      className="p-1 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alerta */}
          <Card className="p-3 sm:p-4 bg-red-50 border-red-200">
            <div className="flex gap-3">
              <Mail className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-red-900 mb-1">Notificación Automática</p>
                <p className="text-xs sm:text-sm text-red-700">
                  El profesional recibirá notificación por correo con los comentarios y archivos adjuntos.
                </p>
              </div>
            </div>
          </Card>
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

// Componente Principal - RESPONSIVE Y CORPORATIVO
export function RevisionAprobacionJefe() {
  const [borradores, setBorradores] = useState<BorradorPendiente[]>(BORRADORES_PENDIENTES);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [borradorSeleccionado, setBorradorSeleccionado] = useState<BorradorPendiente | null>(null);
  const [showModalRevision, setShowModalRevision] = useState(false);
  const [showFlujoModal, setShowFlujoModal] = useState(false);

  const handleAprobar = (borradorId: string, comentarios: string) => {
    setBorradores(borradores.map(b =>
      b.id === borradorId
        ? {
            ...b,
            estado: 'aprobado',
            historial: [
              ...b.historial,
              {
                id: Date.now().toString(),
                tipo: 'aprobado',
                usuario: 'Jefe OCID',
                fecha: new Date().toISOString(),
                descripcion: 'Auto aprobado y enviado para firma',
                detalles: { comentarios }
              }
            ]
          }
        : b
    ));

    setShowModalRevision(false);
    toast.success('Auto Aprobado', {
      description: 'Enviado para firma electrónica'
    });
  };

  const handleDevolver = (borradorId: string, motivo: string, comentarios: string, archivos: File[]) => {
    setBorradores(borradores.map(b =>
      b.id === borradorId
        ? {
            ...b,
            estado: 'devuelto',
            historial: [
              ...b.historial,
              {
                id: Date.now().toString(),
                tipo: 'devuelto',
                usuario: 'Jefe OCID',
                fecha: new Date().toISOString(),
                descripcion: 'Auto devuelto para correcciones',
                detalles: { motivo, comentarios, archivos: archivos.length }
              }
            ]
          }
        : b
    ));

    setShowModalRevision(false);
    toast.success('Auto Devuelto', {
      description: `Profesional notificado. ${archivos.length} archivos adjuntos`
    });
  };

  const filteredBorradores = borradores.filter(b => {
    const matchesSearch = 
      b.numeroProceso.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.denunciado.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.profesional.nombre.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesEstado = filterEstado === 'all' || b.estado === filterEstado;

    return matchesSearch && matchesEstado;
  });

  const estadisticas = {
    pendientes: borradores.filter(b => b.estado === 'pendiente_revision').length,
    enRevision: borradores.filter(b => b.estado === 'en_revision').length,
    aprobados: borradores.filter(b => b.estado === 'aprobado').length,
    devueltos: borradores.filter(b => b.estado === 'devuelto').length,
    total: borradores.length
  };

  const getEstadoBadge = (estado: string) => {
    switch(estado) {
      case 'pendiente_revision':
        return { bg: '#FEF3C7', color: '#F59E0B', text: 'Pendiente' };
      case 'en_revision':
        return { bg: '#DBEAFE', color: '#003DA5', text: 'En Revisión' };
      case 'aprobado':
        return { bg: '#D1FAE5', color: '#10B981', text: 'Aprobado' };
      case 'devuelto':
        return { bg: '#FEE2E2', color: '#DC2626', text: 'Devuelto' };
      default:
        return { bg: '#F3F4F6', color: '#6B7280', text: 'Desconocido' };
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#003DA5' }}>
          Revisión y Aprobación de Autos
        </h1>
      </div>

      {/* Filtros - RESPONSIVE */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por proceso, denunciado..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtro Estado */}
          <div className="relative">
            <ListFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 pointer-events-none" />
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="w-full sm:w-auto pl-10 sm:pl-11 pr-8 sm:pr-10 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer"
            >
              <option value="all">Todos</option>
              <option value="pendiente_revision">Pendientes</option>
              <option value="en_revision">En Revisión</option>
              <option value="aprobado">Aprobados</option>
              <option value="devuelto">Devueltos</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </Card>

      {/* Lista de Borradores - RESPONSIVE */}
      <div className="space-y-3 sm:space-y-4">
        {filteredBorradores.map((borrador, index) => {
          const estadoBadge = getEstadoBadge(borrador.estado);

          return (
            <motion.div
              key={borrador.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-4 sm:p-5 hover:shadow-lg transition-all border-l-4" style={{ borderLeftColor: estadoBadge.color }}>
                <div className="space-y-3 sm:space-y-4">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-lg sm:text-xl font-bold" style={{ color: '#003DA5' }}>
                          {borrador.numeroProceso}
                        </h3>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">{borrador.titulo}</p>
                      <p className="text-sm sm:text-base font-semibold text-gray-900 mb-2">
                        Denunciado: {borrador.denunciado}
                      </p>
                    </div>

                    {/* Botón Revisar - Desktop */}
                    <Button
                      onClick={() => {
                        setBorradorSeleccionado(borrador);
                        setShowModalRevision(true);
                      }}
                      style={{ background: '#003DA5' }}
                      size="sm"
                      disabled={borrador.estado === 'aprobado'}
                      className="hidden sm:flex"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Revisar
                    </Button>
                  </div>

                  {/* Profesional y Metadata */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5' }} className="text-xs">
                          {borrador.profesional.nombre.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 truncate">{borrador.profesional.nombre}</p>
                        <p className="text-xs text-gray-500 truncate">{borrador.profesional.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{new Date(borrador.fechaEnvio).toLocaleDateString('es-CO')}</span>
                    </div>
                  </div>

                  {/* Observaciones */}
                  <Card className="p-3 bg-gray-50 border-gray-200">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Observaciones:</p>
                    <p className="text-xs sm:text-sm text-gray-700 line-clamp-2">{borrador.observacionesProfesional}</p>
                  </Card>

                  {/* Botón Revisar - Mobile */}
                  <Button
                    onClick={() => {
                      setBorradorSeleccionado(borrador);
                      setShowModalRevision(true);
                    }}
                    style={{ background: '#003DA5' }}
                    disabled={borrador.estado === 'aprobado'}
                    className="w-full sm:hidden"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {borrador.estado === 'aprobado' ? 'Aprobado' : 'Revisar Documento'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Estado Vacío */}
      {filteredBorradores.length === 0 && (
        <Card className="p-8 sm:p-12 text-center">
          <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="font-bold text-gray-900 mb-2 text-base sm:text-lg">No hay documentos</h3>
          <p className="text-xs sm:text-sm text-gray-600">
            {searchQuery 
              ? 'No se encontraron resultados'
              : 'Los documentos aparecerán aquí'}
          </p>
        </Card>
      )}

      {/* Modal de Revisión */}
      <AnimatePresence>
        {showModalRevision && borradorSeleccionado && (
          <ModalRevisionEdicion
            borrador={borradorSeleccionado}
            onClose={() => {
              setShowModalRevision(false);
              setBorradorSeleccionado(null);
            }}
            onAprobar={(comentarios) => handleAprobar(borradorSeleccionado.id, comentarios)}
            onDevolver={(motivo, comentarios, archivos) => 
              handleDevolver(borradorSeleccionado.id, motivo, comentarios, archivos)
            }
          />
        )}

        {showFlujoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowFlujoModal(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-6xl max-h-[90vh] overflow-auto rounded-2xl shadow-2xl"
              style={{ background: '#FFFFFF' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  ¿Cómo funciona la Revisión y Aprobación de Autos?
                </h2>
                <button
                  onClick={() => setShowFlujoModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="p-6">
                <FlujoRevisionAprobacion />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón Flotante de Ayuda */}
      <motion.button
        onClick={() => setShowFlujoModal(true)}
        className="fixed bottom-8 right-8 p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all z-40"
        style={{ background: '#10B981' }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <HelpCircle className="w-6 h-6 text-white" />
      </motion.button>
    </div>
  );
}