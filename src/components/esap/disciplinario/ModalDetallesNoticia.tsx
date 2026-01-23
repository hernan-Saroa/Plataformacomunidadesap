/**
 * MODAL DETALLES DE NOTICIA DISCIPLINARIA
 * Diseño actualizado alineado con el estándar ESAP (SIGL v5.0)
 */

import { motion } from 'motion/react';
import {
  X,
  Eye,
  User,
  FileText,
  AlertCircle,
  MessageSquare,
  UserCheck,
  Clock,
  Users,
  Paperclip,
  Download, Calendar, MapPin, Tag, Flag, CheckCircle, Info
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { disciplinaryService } from '../../../services/api/disciplinary.service';

interface NoticiaDisciplinaria {
  id: string;
  numeroRadicado: string;
  origen: string;
  fechaQueja: string;
  territorial: string;
  disciplinable: {
    nombre: string;
    cedula?: string;
    cargo?: string;
    dependencia?: string;
    email?: string;
    telefono?: string;
    direccion?: string;
  }[];
  denunciante?: {
    nombre: string;
    cedula?: string;
    cargo?: string;
    email?: string;
    telefono?: string;
    direccion?: string;
    dependencia?: string;
  }[];
  adjuntos?: string[];
  estado: string;
  estadoLabel: string;
  etapa: string;
  diasTranscurridos: number;
  radicador: string;
  fechaRegistro: string;
  conductas?: string[];
  descripcion?: string;
  profesionalAsignado?: string;
  procesoAsociado?: string;
  historialAuditoria: any[];
}

// Helper for safe date formatting
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'Fecha no disponible';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Fecha inválida';
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const getDiasTranscurridos = (fecha: string | Date | undefined) => {
  if (!fecha) return 0;
  try {
    const fechaDate = new Date(fecha);
    if (isNaN(fechaDate.getTime())) return 0;
    const hoy = new Date();
    const diffTime = Math.abs(hoy.getTime() - fechaDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (e) {
    return 0;
  }
};

const getEstadoLabel = (estado: string) => {
  if (!estado) return 'Desconocido';
  // Capitalize first letter
  return estado.charAt(0).toUpperCase() + estado.slice(1).replace(/-/g, ' ');
};

const getOrigenLabel = (origen: string) => {
  return origen || 'Desconocido';
};

export function ModalDetallesNoticia({ noticia, onClose }: { noticia: any; onClose: () => void }) {
  // Compute values
  const dias = getDiasTranscurridos(noticia.fechaRecepcion || noticia.createdAt);
  const estadoLabel = getEstadoLabel(noticia.estado);
  const origenLabel = getOrigenLabel(noticia.origen);

  // Normalize disciplinables
  const disciplinables = Array.isArray(noticia.disciplinable)
    ? noticia.disciplinable
    : (noticia.disciplinable ? [noticia.disciplinable] : []);

  // Normalize denunciante name
  const radicadorNombre = (noticia.denunciante && 'nombre' in noticia.denunciante)
    ? noticia.denunciante.nombre
    : (Array.isArray(noticia.denunciante) ? noticia.denunciante[0]?.nombre : 'Anónimo');

export function ModalDetallesNoticia({ noticia, onClose }: Props) {
  // Obtener color del estado
  const getEstadoColor = (estado: string) => {
    switch(estado) {
      case 'pendiente':
        return { bg: '#FEF3C7', color: '#D97706' };
      case 'en_revision':
        return { bg: '#DBEAFE', color: '#2563EB' };
      case 'aprobada':
        return { bg: '#D1FAE5', color: '#059669' };
      case 'archivada':
        return { bg: '#F3F4F6', color: '#6B7280' };
      default:
        return { bg: '#E0EDFF', color: '#003DA5' };
    }
  };

  const estadoColor = getEstadoColor(noticia.estado);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 p-4 z-[200]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: '#E0EDFF' }}>
                <FileText className="w-6 h-6" style={{ color: '#003DA5' }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: '#003DA5' }}>
                  Detalles de Noticia Disciplinaria
                </h2>
                <p className="text-sm text-gray-600">
                  {noticia.radicado}
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

          {/* Badges de estado */}
          <div className="flex items-center gap-2">
            <Badge
              className="px-3 py-1 rounded-md text-xs font-bold"
              style={{ background: estadoColor.bg, color: estadoColor.color }}
            >
              {noticia.estadoLabel}
            </Badge>
            <Badge style={{ background: '#E0EDFF', color: '#003DA5' }}>
              {noticia.etapa}
            </Badge>
            {noticia.diasTranscurridos > 30 && (
              <Badge style={{ background: '#FEE2E2', color: '#DC2626' }}>
                ⚠️ {noticia.diasTranscurridos} días transcurridos
              </Badge>
            )}
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Información General */}
          <div className="p-5 rounded-xl" style={{ background: '#EFF6FF' }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-semibold text-blue-600 mb-1">RADICADO</p>
                <p className="text-lg font-bold text-gray-900">{noticia.radicado}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-600 mb-1">ORIGEN</p>
                <p className="text-sm font-semibold text-gray-900">{origenLabel}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-600 mb-1">ESTADO</p>
                <p className="text-sm font-semibold text-gray-900">{estadoLabel}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-600 mb-1">DÍAS TRANSCURRIDOS</p>
                <p className="text-lg font-bold text-gray-900">{dias} días</p>
              </div>
            </div>
          </div>

          {/* Disciplinables (Antes Denunciado) */}
          {/* Información del Denunciado */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5" style={{ color: '#003DA5' }} />
              <h3 className="text-lg font-bold" style={{ color: '#1F2937' }}>
                Información del Denunciado/Investigado
              </h3>
            </div>
            <div className="p-5 rounded-xl border-2" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                    Nombre Completo
                  </p>
                  <p className="text-sm font-bold" style={{ color: '#1F2937' }}>
                    {noticia.denunciado.nombre}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                    Identificación
                  </p>
                  <p className="text-sm font-bold" style={{ color: '#1F2937' }}>
                    {noticia.denunciado.identificacion}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                    Cargo
                  </p>
                  <p className="text-sm font-bold" style={{ color: '#1F2937' }}>
                    {noticia.denunciado.cargo}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                    Dependencia
                  </p>
                  <p className="text-sm font-bold" style={{ color: '#1F2937' }}>
                    {noticia.denunciado.dependencia}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Información de Radicación */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5" style={{ color: '#003DA5' }} />
              <h3 className="text-lg font-bold" style={{ color: '#1F2937' }}>
                Información de Radicación
              </h3>
            </div>
            <div className="p-5 rounded-xl border-2" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Fecha de Queja</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDate(noticia.fechaRecepcion || noticia.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Fecha de Registro</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDate(noticia.fechaRegistro)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Radicador</p>
                  <p className="text-sm font-semibold text-gray-900">{radicadorNombre}</p>
                </div>
                {noticia.profesionalAsignado && (
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                      Profesional Asignado
                    </p>
                    <p className="text-sm font-bold" style={{ color: '#1F2937' }}>
                      {noticia.profesionalAsignado}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Conductas */}
          {noticia.conductas && noticia.conductas.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Conductas Reportadas
              </h3>
              <Card className="p-5 bg-red-50 border-2 border-red-200">
                <div className="flex flex-wrap gap-2">
                  {noticia.conductas.map((conducta: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-2 bg-red-100 text-red-800 text-sm font-semibold rounded-lg border border-red-300"
                    >
                      {conducta}
                    </span>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Descripción */}
          {noticia.descripcion && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-5 h-5" style={{ color: '#003DA5' }} />
                Descripción de Hechos
              </h3>
              <Card className="p-5 border-2 border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-700 leading-relaxed">{noticia.hechos || noticia.descripcion}</p>
              </Card>
            </div>
          )}

          {/* Denunciantes */}
          {noticia.denunciante && noticia.denunciante.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Users className="w-5 h-5" style={{ color: '#003DA5' }} />
                Información de Denunciantes
              </h3>
              <div className="space-y-4">
                {noticia.denunciante.map((person: any, idx: number) => (
                  <Card key={idx} className="p-5 border-2 border-blue-200 bg-blue-50">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-blue-600 font-semibold mb-1">NOMBRE COMPLETO</p>
                        <p className="text-sm font-semibold text-gray-900">{person.nombre}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-600 font-semibold mb-1">IDENTIFICACIÓN</p>
                        <p className="text-sm font-semibold text-gray-900">{person.cedula || 'N/A'}</p>
                      </div>
                      {person.cargo && (
                        <div>
                          <p className="text-xs text-blue-600 font-semibold mb-1">CARGO</p>
                          <p className="text-sm font-semibold text-gray-900">{person.cargo}</p>
                        </div>
                      )}
                      {person.dependencia && (
                        <div>
                          <p className="text-xs text-blue-600 font-semibold mb-1">DEPENDENCIA</p>
                          <p className="text-sm font-semibold text-gray-900">{person.dependencia}</p>
                        </div>
                      )}
                      {person.email && (
                        <div>
                          <p className="text-xs text-blue-600 font-semibold mb-1">CORREO ELECTRÓNICO</p>
                          <p className="text-sm font-semibold text-gray-900">{person.email}</p>
                        </div>
                      )}
                      {person.telefono && (
                        <div>
                          <p className="text-xs text-blue-600 font-semibold mb-1">TELÉFONO</p>
                          <p className="text-sm font-semibold text-gray-900">{person.telefono}</p>
                        </div>
                      )}
                      {person.direccion && (
                        <div className="md:col-span-2">
                          <p className="text-xs text-blue-600 font-semibold mb-1">DIRECCIÓN</p>
                          <p className="text-sm font-semibold text-gray-900">{person.direccion}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Archivos Adjuntos */}
          {noticia.adjuntos && noticia.adjuntos.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Paperclip className="w-5 h-5" style={{ color: '#003DA5' }} />
                Archivos Adjuntos ({noticia.adjuntos.length})
              </h3>
              <Card className="p-5 border-2 border-gray-200">
                <div className="space-y-2">
                  {noticia.adjuntos.map((archivo: string, idx: number) => {
                    const nombreArchivo = archivo.split('/').pop() || `Archivo ${idx + 1}`;

                    const handleDescargar = async () => {
                      try {
                        const descargaUrl = disciplinaryService.getFileUrl(archivo);
                        const response = await fetch(descargaUrl);
                        if (!response.ok) throw new Error('No se pudo descargar el archivo');
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = nombreArchivo;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                      } catch (error) {
                        console.error('Error descargando archivo:', error);
                        alert('Error al descargar el archivo. Por favor intente de nuevo.');
                      }
                    };

                    return (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <Paperclip className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900">{nombreArchivo}</span>
                        </div>
                        <button
                          onClick={handleDescargar}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Descargar
                        </button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* Proceso Asociado */}
          {noticia.procesoAsociado && (
            <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: '#D1FAE5' }}>
              <CheckCircle className="w-5 h-5" style={{ color: '#059669' }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: '#065F46' }}>
                  PROCESO ASOCIADO
                </p>
                <p className="text-sm font-bold" style={{ color: '#059669' }}>
                  {noticia.procesoAsociado}
                </p>
              </div>
            </div>
          )}

          {/* Historial de Auditoría */}
          {noticia.historialAuditoria && noticia.historialAuditoria.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5" style={{ color: '#003DA5' }} />
                <h3 className="text-lg font-bold" style={{ color: '#1F2937' }}>
                  Historial de Auditoría
                </h3>
              </div>
              <div className="space-y-2">
                {noticia.historialAuditoria.map((evento, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl border-l-4"
                    style={{ background: '#F8FAFC', borderColor: '#003DA5' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                          {evento.accion}
                        </p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>
                          {evento.usuario}
                        </p>
                      </div>
                      <span className="text-xs" style={{ color: '#9CA3AF' }}>
                        {evento.fecha}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Etapa Actual */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5" style={{ color: '#003DA5' }} />
              Etapa Actual
            </h3>
            <Card className="p-5 border-2 border-blue-200 bg-blue-50">
              <p className="text-base font-semibold text-gray-900">{noticia.etapa || getEstadoLabel(noticia.estado) || 'Etapa no definida'}</p>
              <p className="text-sm text-gray-600 mt-1">
                Hace {noticia.diasTranscurridos} días
              </p>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ background: '#003DA5' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
