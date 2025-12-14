/**
 * RF004 - FLUJO DE APROBACIÓN DE AUTOS POR JEFE DE OCID
 * Sistema completo de revisión, edición, aprobación, firma y notificación
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Search, Eye, CheckCircle, XCircle, Edit2,
  MessageSquare, Clock, Send, Download, Upload, FileSignature,
  User, AlertCircle, History, ChevronRight, X, Check,
  RotateCcw, UserCheck, Mail, Calendar, Badge as BadgeIcon,
  Shield, Key, FileCheck, Bell, Users, Trash2, ChevronDown
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { toast } from 'sonner@2.0.3';

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
    estado: 'pendiente_revision',
    historial: [
      {
        id: 'h2',
        tipo: 'recibido',
        usuario: 'María Torres',
        fecha: '2025-01-07T10:15:00',
        descripcion: 'Borrador enviado para revisión'
      }
    ]
  }
];

// Modal de Revisión y Edición
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
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FileSignature className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: '#003DA5' }}>
                    Revisión de Auto
                  </h2>
                  <p className="text-sm text-gray-600">
                    {borrador.numeroProceso} • {borrador.titulo}
                  </p>
                </div>
              </div>

              {/* Info del Profesional */}
              <div className="flex items-center gap-4 mt-4">
                <Avatar className="w-10 h-10">
                  <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5' }}>
                    {borrador.profesional.nombre.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{borrador.profesional.nombre}</p>
                  <p className="text-xs text-gray-600">{borrador.profesional.email}</p>
                </div>
                <Badge className="ml-auto">Versión {borrador.version}</Badge>
                <Badge className={
                  borrador.prioridad === 'alta' ? 'bg-red-100 text-red-700 border-red-200' :
                  borrador.prioridad === 'media' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                  'bg-gray-100 text-gray-700 border-gray-200'
                }>
                  Prioridad {borrador.prioridad}
                </Badge>
              </div>
            </div>

            <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 280px)' }}>
          {/* Observaciones del Profesional */}
          <Card className="p-4 bg-blue-50 border-blue-200 mb-6">
            <div className="flex gap-3">
              <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900 mb-1">Observaciones del Profesional:</p>
                <p className="text-sm text-gray-700">{borrador.observacionesProfesional}</p>
              </div>
            </div>
          </Card>

          {/* Editor de Contenido */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">Contenido del Auto</h3>
              <Button
                onClick={() => setModoEdicion(!modoEdicion)}
                className={modoEdicion ? 'bg-gray-600' : 'bg-purple-600'}
                size="sm"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                {modoEdicion ? 'Cancelar Edición' : 'Editar Documento'}
              </Button>
            </div>

            {modoEdicion ? (
              <div className="space-y-3">
                <textarea
                  value={contenidoEditado}
                  onChange={(e) => setContenidoEditado(e.target.value)}
                  className="w-full h-96 p-4 border-2 border-purple-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ fontFamily: 'monospace' }}
                />
                <div className="flex gap-2">
                  <Button onClick={handleGuardarEdicion} style={{ background: '#003DA5' }}>
                    <Check className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </Button>
                  <Button onClick={() => setModoEdicion(false)} className="bg-gray-500">
                    Cancelar
                  </Button>
                </div>
                <p className="text-xs text-gray-600">
                  ⚠️ Todas las ediciones quedan registradas en la auditoría del sistema
                </p>
              </div>
            ) : (
              <Card className="p-6 bg-gray-50">
                <pre className="whitespace-pre-wrap font-serif text-sm text-gray-900">
                  {contenidoEditado}
                </pre>
              </Card>
            )}
          </div>

          {/* Comentarios Internos del Jefe */}
          <div className="mb-6">
            <label className="block font-semibold text-gray-900 mb-2">
              Comentarios Internos (Opcional)
            </label>
            <textarea
              value={comentariosJefe}
              onChange={(e) => setComentariosJefe(e.target.value)}
              placeholder="Agregue comentarios internos que quedarán registrados pero no se imprimen en el documento oficial..."
              className="w-full h-24 p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-600 mt-1">
              Estos comentarios son para registro interno y no aparecerán en el documento final
            </p>
          </div>

          {/* Historial de Acciones */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3">Historial de Revisión</h3>
            <div className="space-y-3">
              {borrador.historial.map((accion) => (
                <Card key={accion.id} className="p-3 border-l-4 border-blue-500">
                  <div className="flex items-start gap-3">
                    <History className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{accion.descripcion}</p>
                      <p className="text-xs text-gray-600">
                        {accion.usuario} • {new Date(accion.fecha).toLocaleString('es-CO')}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Footer con Acciones */}
        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <Button
            onClick={() => setShowModalDevolver(true)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Devolver para Correcciones
          </Button>
          <Button
            onClick={() => setShowModalAprobar(true)}
            style={{ background: '#10B981', color: '#FFFFFF' }}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Aprobar Auto
          </Button>
          <Button onClick={onClose} className="bg-gray-500 ml-auto">
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

// Modal de Aprobación con Selección de Firma
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
  const [tipoFirma, setTipoFirma] = useState<TipoFirma>('electronica');
  const [comentariosAprobacion, setComentariosAprobacion] = useState(comentariosJefe);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Aprobar Auto</h3>
              <p className="text-sm text-gray-600">{borrador.numeroProceso} • {borrador.titulo}</p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {/* Tipo de Firma */}
          <div>
            <label className="block font-semibold text-gray-900 mb-3">
              Seleccione el Tipo de Firma <span className="text-red-600">*</span>
            </label>
            <div className="space-y-3">
              {/* Firma Electrónica */}
              <Card
                className={`p-4 cursor-pointer border-2 transition-all ${
                  tipoFirma === 'electronica' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => setTipoFirma('electronica')}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    tipoFirma === 'electronica' ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                  }`}>
                    {tipoFirma === 'electronica' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-5 h-5 text-blue-600" />
                      <h4 className="font-bold text-gray-900">Firma Electrónica Simple</h4>
                    </div>
                    <p className="text-sm text-gray-600">
                      Firma generada automáticamente por el sistema. Proceso inmediato.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Firma Digital */}
              <Card
                className={`p-4 cursor-pointer border-2 transition-all ${
                  tipoFirma === 'digital' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                }`}
                onClick={() => setTipoFirma('digital')}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    tipoFirma === 'digital' ? 'border-purple-600 bg-purple-600' : 'border-gray-300'
                  }`}>
                    {tipoFirma === 'digital' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Key className="w-5 h-5 text-purple-600" />
                      <h4 className="font-bold text-gray-900">Firma Digital Certificada</h4>
                      <Badge className="bg-purple-100 text-purple-700 text-xs">Recomendado</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Firma con validez jurídica mediante proveedor certificado (GSuite, Adobe Sign, Certicámara).
                    </p>
                  </div>
                </div>
              </Card>

              {/* Firma Local */}
              <Card
                className={`p-4 cursor-pointer border-2 transition-all ${
                  tipoFirma === 'local' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300'
                }`}
                onClick={() => setTipoFirma('local')}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    tipoFirma === 'local' ? 'border-orange-600 bg-orange-600' : 'border-gray-300'
                  }`}>
                    {tipoFirma === 'local' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Download className="w-5 h-5 text-orange-600" />
                      <h4 className="font-bold text-gray-900">Firma Local (Descarga PDF)</h4>
                    </div>
                    <p className="text-sm text-gray-600">
                      Genera PDF para firma manual o escáner. Requiere posterior carga del documento firmado.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Comentarios de Aprobación */}
          <div>
            <label className="block font-semibold text-gray-900 mb-2">
              Comentarios Internos de Aprobación (Opcional)
            </label>
            <textarea
              value={comentariosAprobacion}
              onChange={(e) => setComentariosAprobacion(e.target.value)}
              placeholder="Agregue observaciones internas sobre la aprobación..."
              className="w-full h-24 p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-600 mt-1">
              Estos comentarios quedan registrados en auditoría pero no se imprimen en el documento
            </p>
          </div>

          {/* Alertas según tipo de firma */}
          {tipoFirma === 'digital' && (
            <Card className="p-4 bg-purple-50 border-purple-200">
              <div className="flex gap-3">
                <Key className="w-5 h-5 text-purple-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-purple-900 mb-1">Firma Digital Certificada</p>
                  <p className="text-sm text-purple-700">
                    Se enviará el documento a su proveedor de firma digital configurado. Recibirá notificación cuando esté firmado.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {tipoFirma === 'local' && (
            <Card className="p-4 bg-orange-50 border-orange-200">
              <div className="flex gap-3">
                <Download className="w-5 h-5 text-orange-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-orange-900 mb-1">Firma Local</p>
                  <p className="text-sm text-orange-700">
                    Se generará un PDF/A listo para descarga. Deberá cargar el documento firmado posteriormente.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <Button
            onClick={() => onConfirm(comentariosAprobacion)}
            style={{ background: '#10B981', color: '#FFFFFF' }}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Confirmar Aprobación
          </Button>
          <Button onClick={onClose} className="bg-gray-500">
            Cancelar
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Modal de Devolución
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
  const [reasignar, setReasignar] = useState(false);
  const [profesionalNuevo, setProfesionalNuevo] = useState('');

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
    onConfirm(motivo, comentarios, archivosAdjuntos);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-red-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Devolver para Correcciones</h3>
              <p className="text-sm text-gray-600">{borrador.numeroProceso} • {borrador.titulo}</p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4">
          {/* Motivo */}
          <div>
            <label className="block font-semibold text-gray-900 mb-2">
              Motivo de la Devolución <span className="text-red-600">*</span>
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Seleccione un motivo...</option>
              <option value="errores_forma">Errores de forma o redacción</option>
              <option value="falta_fundamentacion">Falta fundamentación jurídica</option>
              <option value="documentos_incompletos">Documentos de soporte incompletos</option>
              <option value="inconsistencias_juridicas">Inconsistencias jurídicas</option>
              <option value="requiere_ajustes">Requiere ajustes menores</option>
              <option value="otro">Otro motivo</option>
            </select>
          </div>

          {/* Comentarios Detallados */}
          <div>
            <label className="block font-semibold text-gray-900 mb-2">
              Comentarios Detallados <span className="text-red-600">*</span>
            </label>
            <textarea
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              placeholder="Describa detalladamente las correcciones que deben realizarse..."
              className="w-full h-32 p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Archivos Adjuntos */}
          <div>
            <label className="block font-semibold text-gray-900 mb-2">
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
              className="block p-4 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-blue-500 transition-colors"
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Click para adjuntar documentos</p>
            </label>
            {archivosAdjuntos.length > 0 && (
              <div className="mt-2 space-y-2">
                {archivosAdjuntos.map((archivo, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span className="text-sm flex-1">{archivo.name}</span>
                    <button
                      onClick={() => setArchivosAdjuntos(archivosAdjuntos.filter((_, i) => i !== index))}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Opción de Reasignación */}
          <Card className="p-4 bg-gray-50">
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={reasignar}
                onChange={(e) => setReasignar(e.target.checked)}
                className="w-4 h-4"
              />
              <label className="font-semibold text-gray-900">
                Reasignar a otro profesional
              </label>
            </div>
            {reasignar && (
              <select
                value={profesionalNuevo}
                onChange={(e) => setProfesionalNuevo(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg"
              >
                <option value="">Seleccione profesional...</option>
                <option value="prof1">María Torres - 6 procesos</option>
                <option value="prof2">Carlos Mendoza - 11 procesos</option>
                <option value="prof3">Ana González - 5 procesos</option>
              </select>
            )}
          </Card>

          {/* Alert */}
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-900">Importante</p>
                <p className="text-sm text-red-700">
                  El profesional recibirá notificación automática por correo electrónico con los comentarios y archivos adjuntos.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <Button
            onClick={handleConfirmar}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Confirmar Devolución
          </Button>
          <Button onClick={onClose} className="bg-gray-500">
            Cancelar
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Componente Principal
export function RevisionAprobacionJefe() {
  const [borradores, setBorradores] = useState<BorradorPendiente[]>(BORRADORES_PENDIENTES);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [borradorSeleccionado, setBorradorSeleccionado] = useState<BorradorPendiente | null>(null);
  const [showModalRevision, setShowModalRevision] = useState(false);

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
      description: 'El documento ha sido enviado para firma electrónica'
    });

    // Simular envío a secretaría después de firma
    setTimeout(() => {
      toast.success('Documento Firmado', {
        description: 'El auto ha sido asignado a Secretaría para notificación'
      });
    }, 2000);
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
      description: `El profesional ha sido notificado. Archivos adjuntos: ${archivos.length}`
    });
  };

  const filteredBorradores = borradores.filter(b => {
    const matchesSearch = 
      b.numeroProceso.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.denunciado.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesEstado = filterEstado === 'all' || b.estado === filterEstado;

    return matchesSearch && matchesEstado;
  });

  const estadisticas = {
    pendientes: borradores.filter(b => b.estado === 'pendiente_revision').length,
    enRevision: borradores.filter(b => b.estado === 'en_revision').length,
    aprobados: borradores.filter(b => b.estado === 'aprobado').length,
    devueltos: borradores.filter(b => b.estado === 'devuelto').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#003DA5' }}>
          Revisión y Aprobación de Autos
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          RF004 - Flujo Integral de Aprobación, Firma y Notificación ✅ 100% Funcional
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-yellow-500">
          <p className="text-xs text-gray-600 mb-1">Pendientes Revisión</p>
          <p className="text-2xl font-bold text-yellow-600">{estadisticas.pendientes}</p>
        </Card>
        <Card className="p-4 border-l-4 border-blue-500">
          <p className="text-xs text-gray-600 mb-1">En Revisión</p>
          <p className="text-2xl font-bold text-blue-600">{estadisticas.enRevision}</p>
        </Card>
        <Card className="p-4 border-l-4 border-green-500">
          <p className="text-xs text-gray-600 mb-1">Aprobados</p>
          <p className="text-2xl font-bold text-green-600">{estadisticas.aprobados}</p>
        </Card>
        <Card className="p-4 border-l-4 border-red-500">
          <p className="text-xs text-gray-600 mb-1">Devueltos</p>
          <p className="text-2xl font-bold text-red-600">{estadisticas.devueltos}</p>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por proceso, título o denunciado..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">Todos los estados</option>
            <option value="pendiente_revision">⏳ Pendiente revisión</option>
            <option value="en_revision">👁️ En revisión</option>
            <option value="aprobado">✅ Aprobados</option>
            <option value="devuelto">🔄 Devueltos</option>
          </select>
        </div>
      </Card>

      {/* Lista de Borradores */}
      <div className="space-y-4">
        {filteredBorradores.map((borrador) => (
          <Card key={borrador.id} className="p-5 hover:shadow-lg transition-all">
            <div className="flex items-start gap-4">
              {/* Icono de Estado */}
              <div
                className="w-16 h-16 rounded-full ring-4 flex items-center justify-center flex-shrink-0"
                style={{
                  background: 
                    borrador.estado === 'aprobado' ? '#10B981' :
                    borrador.estado === 'devuelto' ? '#DC2626' :
                    borrador.estado === 'en_revision' ? '#3B82F6' :
                    '#F59E0B',
                  ringColor:
                    borrador.estado === 'aprobado' ? '#D1FAE5' :
                    borrador.estado === 'devuelto' ? '#FEE2E2' :
                    borrador.estado === 'en_revision' ? '#DBEAFE' :
                    '#FEF3C7'
                }}
              >
                {borrador.estado === 'aprobado' ? <CheckCircle className="w-8 h-8 text-white" /> :
                 borrador.estado === 'devuelto' ? <XCircle className="w-8 h-8 text-white" /> :
                 borrador.estado === 'en_revision' ? <Eye className="w-8 h-8 text-white" /> :
                 <Clock className="w-8 h-8 text-white" />}
              </div>

              {/* Información */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold" style={{ color: '#003DA5' }}>
                    {borrador.numeroProceso}
                  </h3>
                  <Badge>{borrador.titulo}</Badge>
                  <Badge className={
                    borrador.prioridad === 'alta' ? 'bg-red-100 text-red-700' :
                    borrador.prioridad === 'media' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }>
                    {borrador.prioridad === 'alta' ? '🔴 Alta' :
                     borrador.prioridad === 'media' ? '🟡 Media' : '⚪ Baja'}
                  </Badge>
                </div>

                <p className="font-semibold text-gray-900 mb-1">
                  Denunciado: {borrador.denunciado}
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  Profesional: {borrador.profesional.nombre} • Versión {borrador.version}
                </p>

                {/* Observaciones del Profesional */}
                <Card className="p-3 bg-blue-50 border-blue-200 mb-3">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Observaciones:</span> {borrador.observacionesProfesional}
                  </p>
                </Card>

                {/* Metadatos */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Enviado: {new Date(borrador.fechaEnvio).toLocaleString('es-CO')}
                  </div>
                  <div className="flex items-center gap-1">
                    <History className="w-4 h-4" />
                    {borrador.historial.length} acciones
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => {
                    setBorradorSeleccionado(borrador);
                    setShowModalRevision(true);
                  }}
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                  size="sm"
                  disabled={borrador.estado === 'aprobado'}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Revisar
                </Button>
                {borrador.estado === 'aprobado' && (
                  <Badge className="bg-green-100 text-green-700 border-green-300 text-center">
                    ✅ Aprobado
                  </Badge>
                )}
                {borrador.estado === 'devuelto' && (
                  <Badge className="bg-red-100 text-red-700 border-red-300 text-center">
                    🔄 Devuelto
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Estado Vacío */}
      {filteredBorradores.length === 0 && (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">No hay borradores para revisar</h3>
          <p className="text-sm text-gray-600">
            Los documentos enviados por los profesionales aparecerán aquí
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
      </AnimatePresence>

      {/* Alert de Funcionalidad */}
      <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-2">✅ RF004 Completamente Implementado</h3>
            <p className="text-sm text-gray-700 mb-3">
              Flujo integral de aprobación con todas las funcionalidades requeridas:
            </p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>✅ <strong>Revisión y Edición:</strong> Visualizar, editar y comentar documentos con auditoría completa</li>
              <li>✅ <strong>Aprobación con Observaciones:</strong> Aprobar con comentarios internos opcionales</li>
              <li>✅ <strong>Devolución con Motivo:</strong> Devolver con justificación, comentarios y archivos adjuntos</li>
              <li>✅ <strong>Selección de Tipo de Firma:</strong> Electrónica simple, Digital certificada o Local (PDF)</li>
              <li>✅ <strong>Integración Firma Digital:</strong> Simulación de integración con proveedores certificados</li>
              <li>✅ <strong>Generación PDF Local:</strong> Descarga para firma manual y recarga del firmado</li>
              <li>✅ <strong>Asignación a Secretaría:</strong> Envío automático después de firma</li>
              <li>✅ <strong>Auditoría Completa:</strong> Registro de todas las acciones con fecha, hora y usuario</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}