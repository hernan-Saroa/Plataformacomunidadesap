/**
 * GESTIÓN DE NOTICIAS DISCIPLINARIAS - RF001 y RF002
 * Sistema de Gestión de Noticias y Procesos Disciplinarios ESAP
 * RF001 – Gestión de Noticias Disciplinarias
 * RF002 – Revisión y Asignación de Procesos
 * Integrado en el sistema completo de Control Disciplinario
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  FileText,
  Calendar,
  User,
  Building2,
  AlertCircle,
  Download,
  Filter,
  ArrowRight,
  CheckCircle,
  X,
  Save,
  Upload,
  CornerDownLeft,
  UserCheck,
  Clock,
  MessageSquare,
  Paperclip,
  History,
  Bell,
  HelpCircle,
  Send
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CreateNoticiaModal } from '../CreateNoticiaModal';
import { FlujoNoticiasDisciplinarias } from './FlujoNoticiasDisciplinarias';
import { ModalDetallesNoticia } from './ModalDetallesNoticia';
import { ModalArchivarNoticia } from './ModalArchivarNoticia';
import { ModalRemitirCompetencia } from './ModalRemitirCompetencia';

import { disciplinaryService, DisciplinaryNews } from '../../../services/api/disciplinary.service';


// ==================== INTERFACES ====================
interface Profesional {
  id: string;
  nombre: string;
  cargo?: string;
  email?: string;
  procesosAsignados: number;
  capacidadMaxima: number;
}

interface AccionAuditoria {
  id: string;
  tipo: 'creacion' | 'devolucion' | 'asignacion' | 'conversion' | 'edicion';
  usuario: string;
  fecha: string;
  observaciones?: string;
  archivos?: string[];
  profesionalAsignado?: string;
}

interface NoticiaDisciplinaria {
  id: string;
  radicado: string;
  origen: 'Anónimo' | 'Quejoso' | 'Informante' | 'De oficio' | 'Remisión por competencia';
  fechaQueja: string;
  territorial: string;
  fechaRecepcion: string;
  disciplinable: Array<{
    nombre: string;
    cargo: string;
    cedula?: string;
    identificacion?: string;
    email?: string;
    telefono?: string;
  }>;
  denunciante?: Array<{
    nombre: string;
    cedula?: string;
    email?: string;
    telefono?: string;
    direccion?: string;
    cargo?: string;
    dependencia?: string;
    entidad?: string;
  }>;
  estado: 'pendiente' | 'en-valoracion' | 'devuelto' | 'asignado' | 'convertido-proceso';
  estadoLabel: 'Pendiente' | 'En Valoración' | 'Devuelto' | 'Asignado' | 'Convertido a Proceso';
  etapa: string;
  diasTranscurridos: number;
  radicador: string;
  fechaRegistro: string;
  conductas?: string[];
  descripcion?: string;
  adjuntos?: string[];
  profesionalAsignado?: string;
  procesoAsociado?: string; // PD-YYYY-####
  historialAuditoria: AccionAuditoria[];
}

// ==================== MOCK DATA ====================


/*const MOCK_NOTICIAS: NoticiaDisciplinaria[] = [
  {
    id: '1',
    numeroRadicado: 'ND-2025-0025',
    origen: 'Quejoso',
    fechaQueja: '2025-01-15',
    territorial: 'Territorial Bogotá',
    denunciado: {
      nombre: 'Ana María López Martínez',
      identificacion: '52.345.678',
      cargo: 'Profesional Universitario',
      dependencia: 'Territorial Bogotá'
    },
    estado: 'en-valoracion',
    estadoLabel: 'En Valoración',
    etapa: 'Valoración Inicial',
    diasTranscurridos: 3,
    radicador: 'María González',
    fechaRegistro: '2025-01-15T09:30:00',
    conductas: ['Incumplimiento de deberes', 'Negligencia en funciones'],
    descripcion: 'Presunto incumplimiento de funciones en proceso de contratación',
    historialAuditoria: [
      {
        id: '1',
        tipo: 'creacion',
        usuario: 'María González',
        fecha: '2025-01-15T09:30:00',
        observaciones: 'Noticia radicada inicialmente'
      }
    ]
  },
  {
    id: '2',
    numeroRadicado: 'ND-2025-0018',
    origen: 'De oficio',
    fechaQueja: '2024-12-20',
    territorial: 'Territorial Antioquia',
    denunciado: {
      nombre: 'Roberto Sánchez Cruz',
      identificacion: '71.234.567',
      cargo: 'Coordinador Académico',
      dependencia: 'Territorial Antioquia'
    },
    estado: 'convertido-proceso',
    estadoLabel: 'Convertido a Proceso',
    etapa: 'Convertido a PD-2025-0018',
    diasTranscurridos: 48,
    radicador: 'Carlos Ramírez',
    fechaRegistro: '2024-12-20T14:15:00',
    conductas: ['Irregularidades en contratación'],
    descripcion: 'Irregularidades en manejo de calificaciones de estudiantes',
    profesionalAsignado: 'Juan Carlos Pérez',
    procesoAsociado: 'PD-2025-0018',
    historialAuditoria: [
      {
        id: '1',
        tipo: 'creacion',
        usuario: 'Carlos Ramírez',
        fecha: '2024-12-20T14:15:00',
        observaciones: 'Noticia radicada inicialmente'
      },
      {
        id: '2',
        tipo: 'asignacion',
        usuario: 'Jefe OCID',
        fecha: '2024-12-22T10:00:00',
        profesionalAsignado: 'Juan Carlos Pérez',
        observaciones: 'Asignado por experiencia en casos similares'
      },
      {
        id: '3',
        tipo: 'conversion',
        usuario: 'Jefe OCID',
        fecha: '2024-12-22T10:05:00',
        observaciones: 'Convertido a proceso disciplinario PD-2025-0018'
      }
    ]
  },
  {
    id: '3',
    numeroRadicado: 'ND-2024-0156',
    origen: 'Informante',
    fechaQueja: '2024-11-10',
    territorial: 'Dirección Nacional',
    denunciado: {
      nombre: 'Patricia Herrera Gómez',
      identificacion: '39.876.543',
      cargo: 'Jefe de Talento Humano',
      dependencia: 'Dirección Nacional'
    },
    estado: 'pendiente',
    estadoLabel: 'Pendiente',
    etapa: 'Pendiente de Revisión',
    diasTranscurridos: 12,
    radicador: 'Ana Torres',
    fechaRegistro: '2024-11-10T11:00:00',
    conductas: ['Conflicto de intereses', 'Mal uso de recursos públicos'],
    descripcion: 'Presunto favorecimiento en procesos de selección',
    historialAuditoria: [
      {
        id: '1',
        tipo: 'creacion',
        usuario: 'Ana Torres',
        fecha: '2024-11-10T11:00:00',
        observaciones: 'Noticia radicada inicialmente'
      }
    ]
  }
];*/

// ==================== MODAL DEVOLVER ====================
function ModalDevolver({ noticia, onClose, onConfirm }: {
  noticia: NoticiaDisciplinaria;
  onClose: () => void;
  onConfirm: (observaciones: string, archivos: File[]) => void;
}) {
  const [observaciones, setObservaciones] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!observaciones.trim()) {
      toast.error('Debes agregar observaciones para devolver la noticia');
      return;
    }
    onConfirm(observaciones, archivos);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setArchivos(Array.from(e.target.files));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[200]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <CornerDownLeft className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: '#003DA5' }}>
                  Devolver Noticia
                </h2>
                <p className="text-sm text-gray-600">
                  {noticia.radicado} - {noticia.disciplinable[0]?.nombre || 'Sin nombre'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Observaciones */}
          <div>
            <label className="block font-semibold mb-2 text-gray-900">
              Observaciones <span className="text-red-500">*</span>
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Describe los ajustes requeridos o inconsistencias detectadas
            </p>
            <textarea
              required
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Falta adjuntar documentos de soporte. La descripción de hechos debe ser más detallada..."
              className="w-full h-32 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              {observaciones.length}/500 caracteres
            </p>
          </div>

          {/* Archivos adjuntos */}
          <div>
            <label className="block font-semibold mb-2 text-gray-900">
              Archivos de Devolución (Opcional)
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Adjunta documentos con las observaciones o formatos requeridos
            </p>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <label className="cursor-pointer">
                <span className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                  Click para adjuntar archivos
                </span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
              </label>
              <p className="text-xs text-gray-500 mt-1">
                PDF, Word, Imágenes (Máx. 10MB c/u)
              </p>
            </div>

            {/* Lista de archivos */}
            {archivos.length > 0 && (
              <div className="mt-3 space-y-2">
                {archivos.map((archivo, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <Paperclip className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700 flex-1">{archivo.name}</span>
                    <button
                      type="button"
                      onClick={() => setArchivos(archivos.filter((_, i) => i !== idx))}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alert */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-900 mb-1">
                  Se notificará al radicador
                </p>
                <p className="text-sm text-orange-700">
                  {noticia.radicador} recibirá una notificación para realizar las correcciones solicitadas.
                </p>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: '#F59E0B' }}
            >
              <CornerDownLeft className="w-4 h-4" />
              Devolver Noticia
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ==================== MODAL ASIGNAR ====================
function ModalAsignar({ noticia, profesionales, onClose, onConfirm }: {
  noticia: NoticiaDisciplinaria;
  profesionales: { id: string; nombre: string; procesosAsignados: number; capacidadMaxima: number }[];
  onClose: () => void;
  onConfirm: (profesionalId: string, observaciones: string, convertirAProceso: boolean) => void;
}) {
  const [profesionalId, setProfesionalId] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [convertirAProceso, setConvertirAProceso] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profesionalId) {
      toast.error('Debes seleccionar un profesional');
      return;
    }
    onConfirm(profesionalId, observaciones, convertirAProceso);
  };

  const profesionalSeleccionado = profesionales.find(p => p.id === profesionalId);
  const porcentajeCarga = profesionalSeleccionado
    ? (profesionalSeleccionado.procesosAsignados / profesionalSeleccionado.capacidadMaxima) * 100
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[200]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: '#003DA5' }}>
                  Asignar Proceso
                </h2>
                <p className="text-sm text-gray-600">
                  {noticia.radicado} - {noticia.disciplinable[0]?.nombre || 'Sin nombre'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Selección de Profesional */}
          <div>
            <label className="block font-semibold mb-3 text-gray-900">
              Profesional Responsable <span className="text-red-500">*</span>
            </label>

            <div className="grid gap-3">
              {profesionales.map((prof) => {
                const carga = (prof.procesosAsignados / prof.capacidadMaxima) * 100;
                const isSelected = profesionalId === prof.id;

                return (
                  <div
                    key={prof.id}
                    onClick={() => setProfesionalId(prof.id)}
                    className={`
                      p-4 border-2 rounded-xl cursor-pointer transition-all
                      ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                        <AvatarFallback style={{ background: '#003DA5', color: '#FFFFFF' }}>
                          {prof.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-bold text-gray-900">{prof.nombre}</h3>
                          {isSelected && (
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{prof.cargo}</p>

                        {/* Barra de carga */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600">Carga de trabajo</span>
                            <span className="text-xs font-semibold" style={{
                              color: carga >= 90 ? '#DC2626' : carga >= 70 ? '#F59E0B' : '#10B981'
                            }}>
                              {prof.procesosAsignados}/{prof.capacidadMaxima} procesos ({carga.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${carga}%`,
                                background: carga >= 90 ? '#DC2626' : carga >= 70 ? '#F59E0B' : '#10B981'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block font-semibold mb-2 text-gray-900">
              Observaciones de Asignación (Opcional)
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Asignado por experiencia en casos similares, conocimiento del territorial..."
              className="w-full h-24 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Opción de conversión */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={convertirAProceso}
                onChange={(e) => setConvertirAProceso(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <p className="font-semibold text-blue-900 mb-1">
                  Convertir a Proceso Disciplinario
                </p>
                <p className="text-sm text-blue-700">
                  Al activar esta opción, la noticia se convertirá automáticamente en un proceso disciplinario
                  con radicado PD-YYYY-#### y se asignará al profesional seleccionado.
                </p>
              </div>
            </label>
          </div>

          {/* Alert notificación */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex gap-3">
              <Bell className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900 mb-1">
                  Notificación Automática
                </p>
                <p className="text-sm text-green-700">
                  {profesionalSeleccionado?.nombre || 'El profesional seleccionado'} recibirá una notificación
                  automática sobre la asignación.
                </p>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: '#10B981' }}
            >
              <UserCheck className="w-4 h-4" />
              {convertirAProceso ? 'Asignar y Convertir' : 'Asignar'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ==================== MODAL VER HISTORIAL ====================
function ModalHistorial({ noticia, onClose }: { noticia: NoticiaDisciplinaria; onClose: () => void }) {
  const getIconoAccion = (tipo: string) => {
    switch (tipo) {
      case 'creacion': return <FileText className="w-5 h-5" />;
      case 'devolucion': return <CornerDownLeft className="w-5 h-5" />;
      case 'asignacion': return <UserCheck className="w-5 h-5" />;
      case 'conversion': return <CheckCircle className="w-5 h-5" />;
      case 'edicion': return <Edit className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const getColorAccion = (tipo: string) => {
    switch (tipo) {
      case 'creacion': return { bg: '#DBEAFE', text: '#1E40AF' };
      case 'devolucion': return { bg: '#FEF3C7', text: '#92400E' };
      case 'asignacion': return { bg: '#D1FAE5', text: '#065F46' };
      case 'conversion': return { bg: '#D1FAE5', text: '#065F46' };
      case 'edicion': return { bg: '#E0E7FF', text: '#4338CA' };
      default: return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  const getTituloAccion = (tipo: string) => {
    switch (tipo) {
      case 'creacion': return 'Noticia Creada';
      case 'devolucion': return 'Devuelto al Radicador';
      case 'asignacion': return 'Asignado a Profesional';
      case 'conversion': return 'Convertido a Proceso';
      case 'edicion': return 'Noticia Editada';
      case 'archivo': return 'Noticia Archivada';
      default: return 'Acción Registrada';
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(16);
    doc.setTextColor(0, 61, 165); // ESAP Blue
    doc.text('Historial de Auditoría - Noticia Disciplinaria', 14, 20);

    // Info Noticia
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Radicado: ${noticia.radicado || 'N/A'}`, 14, 30);
    doc.text(`Disciplinable: ${(Array.isArray(noticia.disciplinable) ? noticia.disciplinable[0]?.nombre : noticia.disciplinable?.nombre) || 'Sin nombre'}`, 14, 35);
    doc.text(`Fecha de Generación: ${new Date().toLocaleString()}`, 14, 40);

    // Tabla Historial
    const tableBody = (noticia.historialAuditoria || []).map(accion => [
      new Date(accion.fecha).toLocaleString('es-CO'),
      getTituloAccion(accion.tipo),
      accion.usuario,
      accion.observaciones || 'Sin observaciones'
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Fecha', 'Acción', 'Usuario', 'Detalles']],
      body: tableBody,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 61, 165] }
    });

    doc.save(`Historial_Radicado_${noticia.radicado || 'ND'}.pdf`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[200]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <History className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: '#003DA5' }}>
                  Historial de Auditoría
                </h2>
                <p className="text-sm text-gray-600">
                  {noticia.radicado} - {(Array.isArray(noticia.disciplinable) ? noticia.disciplinable[0]?.nombre : noticia.disciplinable?.nombre) || 'Sin nombre'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="p-6">
          <div className="space-y-4">
            {(noticia.historialAuditoria || []).map((accion, index) => {
              const color = getColorAccion(accion.tipo);
              const isLast = index === noticia.historialAuditoria.length - 1;

              return (
                <div key={accion.id || index} className="flex gap-4">
                  {/* Línea temporal */}
                  <div className="flex flex-col items-center">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: color.bg, color: color.text }}
                    >
                      {getIconoAccion(accion.tipo)}
                    </div>
                    {!isLast && (
                      <div className="w-0.5 h-full bg-gray-200 mt-2" />
                    )}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 pb-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-gray-900">
                          {getTituloAccion(accion.tipo)}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {new Date(accion.fecha).toLocaleString('es-CO', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-semibold">Usuario:</span> {accion.usuario}
                      </p>

                      {accion.profesionalAsignado && (
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-semibold">Profesional:</span> {accion.profesionalAsignado}
                        </p>
                      )}

                      {accion.observaciones && (
                        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-700">{accion.observaciones}</p>
                        </div>
                      )}

                      {accion.archivos && accion.archivos.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs font-semibold text-gray-600">Archivos adjuntos:</p>
                          {accion.archivos.map((archivo, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-blue-600">
                              <Paperclip className="w-3 h-3" />
                              <span>{archivo}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handleExportPDF}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Exportar PDF
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================
export function GestionNoticias() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [filterOrigen, setFilterOrigen] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDevolucionModal, setShowDevolucionModal] = useState(false);
  const [showAsignacionModal, setShowAsignacionModal] = useState(false);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [showFlujoModal, setShowFlujoModal] = useState(false);
  const [showDetallesModal, setShowDetallesModal] = useState(false);
  const [showArchivarModal, setShowArchivarModal] = useState(false);
  const [showRemitirCompetenciaModal, setShowRemitirCompetenciaModal] = useState(false);
  const [noticiaSeleccionada, setNoticiaSeleccionada] = useState<NoticiaDisciplinaria | null>(null);
  const [noticias, setNoticias] = useState<NoticiaDisciplinaria[]>([]);
  const [profesionales, setProfesionales] = useState<{ id: string; nombre: string; procesosAsignados: number; capacidadMaxima: number }[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedNewsForAssignment, setSelectedNewsForAssignment] = useState<NoticiaDisciplinaria | null>(null);
  const [selectedNewsForReturn, setSelectedNewsForReturn] = useState<string | null>(null);
  const [selectedNewsForDetail, setSelectedNewsForDetail] = useState<NoticiaDisciplinaria | null>(null);

  const loadNoticias = async () => {
    try {
      setLoading(true);
      const [noticiasData, profesionalesData] = await Promise.all([
        disciplinaryService.getAllNoticias(),
        disciplinaryService.getProfesionales()
      ]);

      const getFrontendStatus = (backendStatus: string): any => {
        const s = (backendStatus || '').toUpperCase();
        if (s === 'RADICADA') return 'pendiente';
        if (s === 'EN_VALORACION') return 'en-valoracion';
        if (s === 'DEVUELTA' || s === 'DEVUELTO') return 'devuelto';
        if (s === 'ASIGNADA' || s === 'ASIGNADO') return 'asignado';
        if (s === 'CONVERTIDO_PROCESO') return 'convertido-proceso';
        return 'pendiente';
      };

      const mappedNews: NoticiaDisciplinaria[] = noticiasData.map((news) => ({
        id: news.id,
        numeroRadicado: news.radicado,
        origen: news.origen as any,
        fechaQueja: news.fechaQueja || news.createdAt,
        territorial: news.territorial,
        disciplinable: Array.isArray(news.disciplinable) ? news.disciplinable : (news.disciplinable ? [news.disciplinable] : []),
        denunciante: Array.isArray(news.denunciante) ? news.denunciante : (news.denunciante ? [news.denunciante] : []),
        fechaRecepcion: news.fechaRecepcion?.toString() || news.createdAt,
        estado: getFrontendStatus(news.estado),
        estadoLabel: (news.estado || 'Pendiente') as any,
        etapa: 'En Evaluación',
        diasTranscurridos: 0,
        radicador: 'Sistema',
        fechaRegistro: news.createdAt,
        conductas: news.conductas || [],
        descripcion: news.hechos,
        adjuntos: (news as any).adjuntos || [],
        historialAuditoria: []
      }));

      setNoticias(mappedNews);

      const mappedProfesionales: Profesional[] = (profesionalesData || []).map((p: any) => ({
        id: p.id,
        nombre: p.nombreCompleto || p.nombre || 'Sin Nombre',
        cargo: p.cargo || 'Sin Cargo',
        email: p.email || '',
        procesosAsignados: p.procesosAsignados || 0,
        capacidadMaxima: p.capacidadMaxima || 10
      }));

      setProfesionales(mappedProfesionales.length > 0 ? mappedProfesionales : PROFESIONALES_MOCK_FALLBACK);

    } catch (error) {
      console.error(error);
      toast.error('Error al cargar noticias');
    } finally {
      setLoading(false);
    }
  };

  const loadProfessionals = async () => {
    try {
      const data = await disciplinaryService.getProfessionalsWorkload();
      setProfesionales(data);
    } catch (error) {
      console.error('Error loading professionals:', error);
    }
  };

  useEffect(() => {
    loadNoticias();
    loadProfessionals();
  }, []);

  // Calculate stats dynamically
  // Debug logs
  useEffect(() => {
    if (noticias.length > 0) {
      console.log("🔍 Noticias loaded:", noticias);
      console.log("🔍 Estados found:", noticias.map(n => n.estado));
    }
  }, [noticias]);

  // Calculate stats dynamically
  const stats = {
    pendientes: noticias.filter(n => n.estado?.toUpperCase() === 'RADICADA' || n.estado?.toLowerCase() === 'pendiente').length,
    enValoracion: noticias.filter(n => n.estado?.toUpperCase() === 'EN_VALORACION' || n.estado?.toLowerCase() === 'en-valoracion').length,
    devueltos: noticias.filter(n => n.estado?.toUpperCase() === 'DEVUELTA' || n.estado?.toLowerCase() === 'devuelto').length,
    asignados: noticias.filter(n => n.estado?.toUpperCase() === 'ASIGNADA' || n.estado?.toLowerCase() === 'asignado').length,
    convertidos: noticias.filter(n => n.estado?.toUpperCase() === 'CONVERTIDO_PROCESO' || n.estado?.toLowerCase() === 'convertido-proceso').length
  };

  const filteredNoticias = noticias.filter(noticia => {
    const matchesSearch =
      (noticia.radicado || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (noticia.disciplinable?.[0]?.nombre || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (noticia.disciplinable?.[0]?.cedula || '').includes(searchQuery);

    // Filter State
    let matchesEstado = true;
    if (filterEstado !== 'all') {
      const normalizedState = noticia.estado === 'RADICADA' ? 'pendiente' :
        noticia.estado === 'EN_VALORACION' ? 'en-valoracion' :
          noticia.estado === 'DEVUELTA' ? 'devuelto' :
            noticia.estado === 'ASIGNADA' ? 'asignado' :
              noticia.estado === 'CONVERTIDO_PROCESO' ? 'convertido-proceso' :
                noticia.estado === 'ARCHIVADA' ? 'archivado' : noticia.estado;
      matchesEstado = (normalizedState === filterEstado);
    }
    const matchesOrigen = filterOrigen === 'all' || noticia.origen === filterOrigen;

    return matchesSearch && matchesEstado && matchesOrigen;
  });

  // const handleDevolver = (id: string) => {
  //     setSelectedNewsForReturn(id);
  // };

  // const handleAsignar = (noticia: DisciplinaryNews) => {
  //     setSelectedNewsForAssignment(noticia);
  // };

  // Map frontend origen to backend enum
  const mapOrigenToEnum = (origen: string): string => {
    const mapping: Record<string, string> = {
      'Anónimo': 'ANONIMO',
      'Quejoso': 'QUEJOSO',
      'De oficio': 'OFICIO',
      'Remisión por competencia': 'REMISION',
      // Fallbacks if already in enum format
      'ANONIMO': 'ANONIMO',
      'QUEJOSO': 'QUEJOSO',
      'OFICIO': 'OFICIO',
      'REMISION': 'REMISION'
    };
    return mapping[origen] || 'QUEJOSO'; // Default to QUEJOSO if unknown
  };

  const handleExportMain = () => {
    if (filteredNoticias.length !== 1) {
      toast.error('Exportación no disponible', {
        description: 'Debes filtrar para obtener una única noticia para exportar.'
      });
      return;
    }

    const noticiaToExport = filteredNoticias[0];
    const doc = new jsPDF();

        const origenMap: Record<string, string> = {
          'Anónimo': 'ANONIMO',
          'Quejoso': 'QUEJOSO',
          'Informante': 'QUEJOSO',
          'De oficio': 'OFICIO',
          'Remisión por competencia': 'REMISION'
        };

      const denunciantesMapped = (data.denunciantes || []).map((d: any) => ({
        nombre: d.nombre,
        cedula: d.identificacion,
        email: d.correo,
        cargo: d.cargo,
        telefono: d.telefono,
        direccion: d.direccion,
        entidad: d.entidad,
        dependencia: d.entidad
      }));

        const disciplinablesMapped = (data.disciplinable || []).map((d: any) => ({
          nombre: d.nombre,
          cedula: d.identificacion,
          cargo: d.cargo,
          dependencia: d.dependencia || d.cargo // Fallback
        }));

      const createDto = {
        origen: origenMap[data.origen] || 'ANONIMO',
        fechaQueja: data.fechaQueja,
        territorial: data.territorial,
        dependenciaDenunciado: data.dependenciaDenunciado || disciplinablesMapped[0]?.dependencia || 'Por determinar',
        hechos: data.descripcionHechos,
        conductas: Array.isArray(data.conductasSeleccionadas) ? data.conductasSeleccionadas : [],
        denunciante: denunciantesMapped,
        disciplinable: disciplinablesMapped,
        adjuntos: uploadedUrls
      };

        console.log('📝 Sending payload:', createDto);
        await disciplinaryService.radicarNoticia(createDto);

        toast.success('Noticia enviada con éxito');

        // Reload news to get the server-generated fields
        await loadData();
        setShowCreateModal(false);
      } catch (error) {
        console.error('Error creating news:', error);
        toast.error('Error al crear la noticia. Verifique los datos.');
      } finally {
        setLoading(false);
      }
    };

    // Header
    doc.setFontSize(16);
    doc.setTextColor(0, 61, 165); // ESAP Blue
    doc.text('Reporte Detallado - Noticia Disciplinaria', 14, 20);

    // Info Noticia
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Radicado: ${noticiaToExport.radicado || 'N/A'}`, 14, 30);
    doc.text(`Fecha Recepción: ${new Date(noticiaToExport.fechaRecepcion).toLocaleDateString()}`, 14, 35);
    doc.text(`Origen: ${noticiaToExport.origen}`, 14, 40);
    doc.text(`Estado: ${noticiaToExport.estado}`, 14, 45);

    let discipName = 'Sin nombre';
    if (Array.isArray(noticiaToExport.disciplinable) && noticiaToExport.disciplinable.length > 0) {
      discipName = noticiaToExport.disciplinable[0].nombre;
    } else if (noticiaToExport.disciplinable && !Array.isArray(noticiaToExport.disciplinable)) {
      discipName = (noticiaToExport.disciplinable as any).nombre;
    }

    doc.text(`Disciplinable: ${discipName}`, 14, 55);
    doc.text(`Dependencia: ${noticiaToExport.dependenciaDenunciado}`, 14, 60);

    doc.text('Hechos:', 14, 70);
    const splitHechos = doc.splitTextToSize(noticiaToExport.hechos, 180);
    doc.text(splitHechos, 14, 75);

    let yPos = 75 + (splitHechos.length * 5) + 10;

    // Tabla Historial
    doc.text('Historial de Auditoría:', 14, yPos);
    yPos += 5;

    const tableBody = (noticiaToExport.historialAuditoria || []).map((accion: any) => [
      new Date(accion.fecha).toLocaleString('es-CO'),
      getActionTitle(accion.tipo),
      accion.usuario,
      accion.observaciones || 'Sin observaciones'
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Fecha', 'Acción', 'Usuario', 'Detalles']],
      body: tableBody,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 61, 165] }
    });

    doc.save(`Reporte_Noticia_${noticiaToExport.radicado || 'ND'}.pdf`);
  };

  const handleCreateNoticia = async (data: any) => {
    try {
      setLoading(true);

      const denuncianteObj = {
        nombre: data.denunciante?.nombre || 'Anónimo',
        email: data.denunciante?.email || '',
        cedula: data.denunciante?.cedula || '',
        cargo: data.denunciante?.cargo || 'Ciudadano',
      };

      // Extract first disciplinable if it's an array
      const mainDisciplinable = Array.isArray(data.disciplinable) && data.disciplinable.length > 0
        ? data.disciplinable[0]
        : (data.disciplinable || { nombre: 'Por determinar', cargo: 'N/A' });

      const createDto: CreateNewsDto = {
        origen: mapOrigenToEnum(data.origen), // Map to backend enum
        territorial: data.territorial,
        dependenciaDenunciado: mainDisciplinable.dependencia || 'Sin Dependencia',
        hechos: data.descripcionHechos || 'Sin descripción',
        denunciante: JSON.stringify(denuncianteObj),
        disciplinable: JSON.stringify(mainDisciplinable),
        // NO enviar: radicado, fechaRecepcion, estado (los genera el backend)
      };

      await disciplinaryService.radicarNoticia(createDto, data.archivosAdjuntos || []);

      toast.success('Noticia Disciplinaria Registrada', {
        description: 'La noticia ha sido radicada exitosamente.'
      });

      loadNoticias(); // Reload to see new item
      setShowCreateModal(false);

    } catch (error) {
      console.error('Error creating noticia:', error);
      toast.error('Error al crear la noticia');
    } finally {
      setLoading(false);
    }
  };

  const handleAsignar = async (profesionalId: string, observaciones: string, convertirAProceso: boolean) => {
    if (!noticiaSeleccionada) return;

    const nuevaAccion: AccionAuditoria = {
      id: Date.now().toString(),
      tipo: 'devolucion',
      usuario: 'Jefe OCID',
      fecha: new Date().toISOString(),
      observaciones,
      archivos: [] // No files for assignment in this snippet
    };

    const profesional = profesionales.find(p => p.id === profesionalId);
    if (!profesional) {
      toast.error('Profesional no encontrado');
      return;
    }

    try {
      setLoading(true);
      if (convertirAProceso) {
        // Asignar y convertir a proceso
        await disciplinaryService.asignarProceso({
          newsId: noticiaSeleccionada.id,
          abogadoId: profesional.id,
          abogadoNombre: profesional.nombre
        });
        toast.success('Proceso asignado y convertido exitosamente');
      } else {
        // Solo asignar (cambiar estado a ASIGNADA)
        await disciplinaryService.changeNewsStatus(noticiaSeleccionada.id, 'ASIGNADA');
        // TODO: Persist professional assignment if backend supports it separately, 
        // currently 'changeNewsStatus' might not store the professional ID unless updated.
        // Assuming 'asignarProceso' is the main way to move forward.
        // If the user wants just "Assign" without "Process conversion", backend might need an update or we use 'asignarProceso' but logic differs.
        // Given the requirement "al asignar debe salir asignado", we'll check backend capabilities.
        // For now, let's assume 'asignarProceso' is the standard way to move forward.
        // However, if 'convertirAProceso' is false, it might just stay as News?
        // Let's rely on 'asignarProceso' for both for now or check service.
      }

      await loadNoticias(); // Reload to get updated state from backend
      setShowAsignacionModal(false);
      setNoticiaSeleccionada(null);
    } catch (error) {
      console.error('Error al asignar:', error);
      toast.error('Error al asignar el proceso');
    } finally {
      setLoading(false);
    }
  };

  const handleDevolver = async (observaciones: string, archivos: File[]) => {
    if (!noticiaSeleccionada) return;

    try {
      setLoading(true);
      await disciplinaryService.returnNews(noticiaSeleccionada.id, observaciones);

      toast.success('Noticia Devuelta', {
        description: `Se ha notificado a ${noticiaSeleccionada.radicador} sobre las correcciones requeridas.`
      });

      await loadNoticias();
      setShowDevolucionModal(false);
      setNoticiaSeleccionada(null);
    } catch (error) {
      console.error(error);
      toast.error('Error al devolver la noticia');
    } finally {
      setLoading(false);
    }
  };



  const getEstadoBadge = (estado: string) => {
    // Map backend status to frontend keys/colors
    const normalized = {
      'RADICADA': 'Pendiente',
      'ASIGNADA': 'Asignado',
      'DEVUELTA': 'Devuelto',
      'EN_VALORACION': 'En Valoración',
      'CONVERTIDO_PROCESO': 'Convertido a Proceso',
      // Fallbacks
      'Pendiente': 'Pendiente',
      'Asignado': 'Asignado',
      'Devuelto': 'Devuelto',
      'En Valoración': 'En Valoración',
      'Convertido a Proceso': 'Convertido a Proceso',
      'ARCHIVADA': 'Archivada'
    }[estado] || 'Pendiente';

    const configs: Record<string, { bg: string; text: string; border: string }> = {
      'Pendiente': { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
      'En Valoración': { bg: '#DBEAFE', text: '#1E40AF', border: '#3B82F6' },
      'Devuelto': { bg: '#FEE2E2', text: '#991B1B', border: '#DC2626' },
      'Asignado': { bg: '#E0E7FF', text: '#4338CA', border: '#6366F1' },
      'Convertido a Proceso': { bg: '#D1FAE5', text: '#065F46', border: '#10B981' },
      'Archivada': { bg: '#F3F4F6', text: '#6B7280', border: '#9CA3AF' }
    };
    const config = configs[normalized] || configs['Pendiente'];

    return (
      <Badge
        className="px-2 py-1"
        style={{
          background: config.bg,
          color: config.text,
          borderColor: config.border,
          border: '1px solid'
        }}
      >
        {normalized}
      </Badge>
    );
  };

  const getOrigenBadge = (origen: string) => {
    // Map backend origin to frontend keys
    const normalized = {
      'ANONIMO': 'Anónimo',
      'QUEJOSO': 'Quejoso',
      'INFORMANTE': 'Informante',
      'OFICIO': 'De oficio',
      'REMISION': 'Remisión por competencia',
      // Fallbacks
      'Anónimo': 'Anónimo',
      'Quejoso': 'Quejoso',
      'Informante': 'Informante',
      'De oficio': 'De oficio',
      'Remisión por competencia': 'Remisión por competencia'
    }[origen] || 'Anónimo';

    const configs: Record<string, { bg: string; text: string }> = {
      'Anónimo': { bg: '#F3F4F6', text: '#6B7280' },
      'Quejoso': { bg: '#DBEAFE', text: '#1E40AF' },
      'Informante': { bg: '#E0E7FF', text: '#4338CA' },
      'De oficio': { bg: '#F3E8FF', text: '#6B21A8' },
      'Remisión por competencia': { bg: '#FEE2E2', text: '#991B1B' }
    };
    const config = configs[normalized] || configs['Anónimo'];

    return (
      <Badge
        variant="outline"
        className="px-2 py-1"
        style={{
          background: config.bg,
          color: config.text,
          borderColor: config.text,
          opacity: 0.9
        }}
      >
        {normalized}
      </Badge>
    );
  };

  // Calculate stats dynamically


  const diasTranscurridos = (data: string) => {
    const fecha = new Date(data);
    const hoy = new Date();
    const diffTime = hoy.getTime() - fecha.getTime();
    const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diasRestantes;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#003DA5' }}>
            Noticias Disciplinarias
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            RF001 - Sistema de Radicación | RF002 - Revisión y Asignación
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 w-full sm:w-auto"
          style={{ background: '#003DA5', color: '#FFFFFF' }}
        >
          <Plus className="w-4 h-4" />
          Nueva Noticia
        </Button>
      </div>

      {/* Estadísticas - RESPONSIVE */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-yellow-600 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-600 mb-0.5">Pendientes</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {stats.pendientes}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-600 mb-0.5">En Valoración</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {stats.enValoracion}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0">
              <CornerDownLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-600 mb-0.5">Devueltos</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {stats.devueltos}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 bg-purple-50 border-purple-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-600 flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-600 mb-0.5">Asignados</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {stats.asignados}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 bg-green-50 border-green-200 col-span-2 sm:col-span-3 lg:col-span-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-600 mb-0.5">Convertidos</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {stats.convertidos}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Búsqueda y Filtros - RESPONSIVE */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por radicado, nombre o cédula..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterOrigen}
            onChange={(e) => setFilterOrigen(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">Todos los orígenes</option>
            <option value="Anónimo">Anónimo</option>
            <option value="Quejoso">Quejoso</option>
            <option value="Informante">Informante</option>
            <option value="De oficio">De oficio</option>
            <option value="Remisión por competencia">Remisión por competencia</option>
          </select>

          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en-valoracion">En Valoración</option>
            <option value="asignado">Asignado</option>
            <option value="devuelto">Devuelto</option>
            <option value="archivado">Archivado</option>
          </select>

          <Button
            onClick={handleExportMain}
            disabled={filteredNoticias.length !== 1}
            className="w-full flex items-center justify-center gap-2"
            variant="outline"
            style={{
              borderColor: filteredNoticias.length === 1 ? '#10B981' : '#E5E7EB',
              color: filteredNoticias.length === 1 ? '#059669' : '#9CA3AF'
            }}
          >
            <Download className="w-4 h-4" />
            Exportar
          </Button>
        </div>
      </Card>

      {/* Resultados */}
      < div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200" >
        <p className="text-sm text-gray-600">
          Mostrando <span className="font-semibold text-gray-900">{filteredNoticias.length}</span> de {noticias.length} noticias
        </p>
      </div >

      {/* Lista de Noticias */}
      <div className="space-y-4">
        {filteredNoticias.map((noticia) => (
          <Card key={noticia.id} className="p-3 sm:p-5 hover:shadow-lg transition-all">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              {/* Información principal */}
              <div className="flex-1" min-w-0>
                <div className="flex items-start gap-3 mb-3">
                  <div 
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ 
                      background: noticia.estado === 'pendiente' ? '#FEF3C7' : 
                                 noticia.estado === 'en-valoracion' ? '#DBEAFE' : 
                                 noticia.estado === 'devuelto' ? '#FEE2E2' :
                                 noticia.estado === 'asignado' ? '#E0E7FF' :
                                 (noticia.estado === 'archivado' || noticia.estado === 'ARCHIVADA') ? '#F3F4F6' :
                                 '#D1FAE5'
                    }}
                  >
                    <FileText 
                      className="w-5 h-5 sm:w-6 sm:h-6" 
                      style={{ 
                        color: noticia.estado === 'pendiente' ? '#92400E' : 
                               noticia.estado === 'en-valoracion' ? '#1E40AF' : 
                               noticia.estado === 'devuelto' ? '#991B1B' :
                               noticia.estado === 'asignado' ? '#4338CA' :
                               (noticia.estado === 'archivado' || noticia.estado === 'ARCHIVADA') ? '#6B7280' :
                               '#065F46'
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-lg" style={{ color: '#003DA5' }}>
                        {noticia.numeroRadicado}
                      </h3>
                      {getEstadoBadge(noticia.estadoLabel)}
                      {getOrigenBadge(noticia.origen)}
                    </div>
                    {/* Handle both object and array for backward compatibility */}
                    <p className="text-sm font-semibold text-gray-900 break-words">
                      {(noticia.disciplinable && 'nombre' in noticia.disciplinable)
                        ? noticia.disciplinable.nombre
                        : (Array.isArray(noticia.disciplinable) ? noticia.disciplinable[0]?.nombre : 'Sin nombre')}
                    </p>
                    <p className="text-xs text-gray-500 break-words">
                      {noticia.estado} • {noticia.territorial}
                    </p>
                  </div>
                </div>

                {/* Detalles adicionales */}
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 sm:pl-15">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Identificación</p>
                    <p className="text-sm font-medium text-gray-90 truncate">
                      {(noticia.disciplinable && ('identificacion' in noticia.disciplinable || 'cedula' in noticia.disciplinable))
                          ? (noticia.disciplinable.identificacion || noticia.disciplinable.cedula)
                          : (Array.isArray(noticia.disciplinable) ? (noticia.disciplinable[0]?.identificacion || noticia.disciplinable[0]?.cedula) : 'N/A')}
                    </p>
                  </div>
                  <div  className="min-w-0">
                    <p className="text-xs text-gray-500 mb-1">Territorial</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{noticia.territorial}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Radicador</p>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {(noticia.denunciante && 'nombre' in noticia.denunciante)
                          ? noticia.denunciante.nombre
                          : (Array.isArray(noticia.denunciante) ? noticia.denunciante[0]?.nombre : 'Anónimo')}
                    </p>
                  </div>
                  {noticia.profesionalAsignado && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Asignado a</p>
                      <p className="text-sm font-medium text-green-700">{noticia.profesionalAsignado}</p>
                    </div>
                  )}
                </div>

                {/* Conductas */}
                {noticia.conductas && noticia.conductas.length > 0 && (
                  <div className="mt-4 pl-15">
                    <p className="text-xs text-gray-500 mb-2">Conductas Indisciplinarias:</p>
                    <div className="flex flex-wrap gap-2">
                      {noticia.conductas.map((conducta, idx) => (
                        <span 
                          key={idx}
                          className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded-md border border-red-200"
                        >
                          {conducta}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Acciones y días */}
              <div className="flex flex-col lg:items-end gap-3 lg:ml-4">
                <div className="flex items-center justify-between lg:block lg:text-right">
                  <p className="text-xs text-gray-500 mb-0 lg:mb-1">Hace</p>
                  <p className="text-lg sm:text-xl font-bold" style={{ color: '#003DA5' }}>
                    {diasTranscurridos(noticia.fechaRecepcion)} días
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* Botón Ver Historial */}
                  <button
                    onClick={() => {
                      setNoticiaSeleccionada(noticia);
                      setShowHistorialModal(true);
                    }}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-purple-300 bg-purple-50 hover:bg-purple-100 transition-colors flex-shrink-0"
                    title="Ver historial de auditoría"
                  >
                    <History className="w-4 h-4 text-purple-600" />
                  </button>

                  {/* Botón Ver Detalles */}
                  <button
                    onClick={() => {
                      setNoticiaSeleccionada(noticia);
                      setShowDetallesModal(true);
                    }}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex-shrink-0"
                    title="Ver detalles completos"
                  >
                    <Eye className="w-4 h-4 text-gray-600" />
                  </button>

                  {/* Botón Archivar */}
                  {(noticia.estado !== 'ARCHIVADA' && noticia.estado !== 'archivado') && (
                    <button
                      onClick={() => {
                        setNoticiaSeleccionada(noticia);
                        setShowArchivarModal(true);
                      }}
                      className="w-9 h-9 flex items-center justify-center rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 transition-colors flex-shrink-0"
                      title="Archivar noticia"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  )}

                  {/* Botón Remitir por Competencia */}
                  {(noticia.estado !== 'ARCHIVADA' && noticia.estado !== 'archivado') && (
                    <button
                      onClick={() => {
                        setNoticiaSeleccionada(noticia);
                        setShowRemitirCompetenciaModal(true);
                      }}
                      className="w-9 h-9 flex items-center justify-center rounded-lg border border-purple-300 bg-purple-50 hover:bg-purple-100 transition-colors"
                      title="Remitir por competencia"
                    >
                      <Send className="w-4 h-4 text-purple-600" />
                    </button>
                  )}
                  
                  {/* RF002: Botones de Revisión y Asignación */}
                  {(noticia.estado === 'RADICADA' || noticia.estado === 'EN_VALORACION' || noticia.estado === 'pendiente' || noticia.estado === 'en-valoracion') && (
                    <>
                      {/* Devolver */}
                      <button
                        onClick={() => {
                          setNoticiaSeleccionada(noticia);
                          setShowDevolucionModal(true);
                        }}
                        className="px-3 h-9 flex items-center justify-center gap-1.5 rounded-lg border-2 border-orange-500 text-orange-700 font-semibold text-sm hover:bg-orange-50 transition-colors flex-shrink-0"
                        title="Devolver al radicador"
                      >
                        <CornerDownLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Devolver</span>
                      </button>
                      
                      {/* Asignar */}
                      <button
                        onClick={() => {
                          setNoticiaSeleccionada(noticia);
                          setShowAsignacionModal(true);
                        }}
                        className="px-3 sm:px-4 h-9 flex items-center justify-center gap-1.5 rounded-lg text-white font-semibold text-sm hover:opacity-90 transition-colors flex-shrink-0"
                        style={{ background: '#10B981' }}
                        title="Asignar a profesional"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span className="hidden sm:inline">Asignar</span>
                      </button>
                    </>
                  )}
                  
                  {(noticia.estado === 'DEVUELTA' || noticia.estado === 'devuelto') && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg w-full sm:w-auto">
                      <CornerDownLeft className="w-4 h-4 text-orange-600 flex-shrink-0" />
                      <span className="text-sm font-semibold text-orange-700">
                        Pendiente de Corrección
                      </span>
                    </div>
                  )}

                  {(noticia.estado === 'ASIGNADA' || noticia.estado === 'asignado' || noticia.estado === 'CONVERTIDO_PROCESO' || noticia.estado === 'convertido-proceso') && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg  w-full sm:w-auto">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm font-semibold text-green-700">
                        {noticia.procesoAsociado || 'Asignado'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Estado vacío */}
      {
        filteredNoticias.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-gray-200">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">No se encontraron noticias</h3>
            <p className="text-sm text-gray-600">
              {searchQuery ? 'Intenta con otros términos de búsqueda' : 'Comienza creando una nueva noticia disciplinaria'}
            </p>
          </div>
        )
      }

      {/* Modales */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateNoticiaModal
            onClose={() => setShowCreateModal(false)}
            onSave={handleCreateNoticia}
          />
        )}

        {showDevolucionModal && noticiaSeleccionada && (
          <ModalDevolver
            noticia={noticiaSeleccionada}
            onClose={() => {
              setShowDevolucionModal(false);
              setNoticiaSeleccionada(null);
            }}
            onConfirm={handleDevolver}
          />
        )}

        {showAsignacionModal && noticiaSeleccionada && (
          <ModalAsignar
            noticia={noticiaSeleccionada}
            profesionales={profesionales}
            onClose={() => {
              setShowAsignacionModal(false);
              setNoticiaSeleccionada(null);
            }}
            onConfirm={handleAsignar}
          />
        )}

        {showHistorialModal && noticiaSeleccionada && (
          <ModalHistorial
            noticia={noticiaSeleccionada}
            onClose={() => {
              setShowHistorialModal(false);
              setNoticiaSeleccionada(null);
            }}
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
                  ¿Cómo funcionan las Noticias Disciplinarias?
                </h2>
                <button
                  onClick={() => setShowFlujoModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="p-6">
                <FlujoNoticiasDisciplinarias />
              </div>
            </motion.div>
          </motion.div>
        )}

        {showDetallesModal && noticiaSeleccionada && (
          <ModalDetallesNoticia
            noticia={noticiaSeleccionada}
            onClose={() => {
              setShowDetallesModal(false);
              setNoticiaSeleccionada(null);
            }}
          />
        )}

        {showArchivarModal && noticiaSeleccionada && (
          <ModalArchivarNoticia
            noticia={noticiaSeleccionada}
            onClose={() => {
              setShowArchivarModal(false);
              setNoticiaSeleccionada(null);
            }}
            onConfirm={async (motivo) => {
              if (noticiaSeleccionada) {
                try {
                  setLoading(true);
                  await disciplinaryService.archiveNews(noticiaSeleccionada.id, motivo);

                  toast.success('Noticia Archivada', {
                    description: `La noticia ${noticiaSeleccionada.radicado} ha sido archivada exitosamente.`
                  });

                  await loadNoticias(); // Reload list
                  setShowArchivarModal(false);
                  setNoticiaSeleccionada(null);
                } catch (error) {
                  console.error(error);
                  toast.error('Error al archivar noticia');
                } finally {
                  setLoading(false);
                }
              }
            }}
          />
        )}

        {showRemitirCompetenciaModal && noticiaSeleccionada && (
          <ModalRemitirCompetencia
            noticia={noticiaSeleccionada}
            onClose={() => {
              setShowRemitirCompetenciaModal(false);
              setNoticiaSeleccionada(null);
            }}
            onConfirm={(data) => {
              // Actualizar la noticia: cambiar el número de ND a RC
              setNoticias(noticias.map(n => {
                if (n.id === noticiaSeleccionada?.id) {
                  return {
                    ...n,
                    radicado: data.numeroRC,
                    origen: 'Remisión por competencia' as const,
                    estado: 'devuelto' as const,
                    estadoLabel: 'Devuelto' as const,
                    historialAuditoria: [
                      ...n.historialAuditoria,
                      {
                        id: Date.now().toString(),
                        tipo: 'devolucion' as const,
                        usuario: 'Sistema',
                        fecha: new Date().toISOString(),
                        observaciones: `Remitido por competencia a: ${data.areaDestino}. Justificación: ${data.justificacion}`
                      }
                    ]
                  };
                }
                return n;
              }));

              toast.success('Remitido por Competencia', {
                description: `La noticia ahora tiene el número ${data.numeroRC} y ha sido remitida a ${data.areaDestino}.`
              });
              setShowRemitirCompetenciaModal(false);
              setNoticiaSeleccionada(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Botón Flotante de Ayuda */}
      <motion.button
        onClick={() => setShowFlujoModal(true)}
        className="fixed bottom-8 right-8 p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all z-40"
        style={{ background: '#003DA5' }}
        whileTap={{ scale: 0.95 }}
      >
        <HelpCircle className="w-6 h-6 text-white" />
      </motion.button>
    </div >
  );
}
