/**
 * MODAL DETALLES DE NOTICIA DISCIPLINARIA
 * Vista completa de todos los detalles de una noticia
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
  Download
} from 'lucide-react';
import { Card } from '../../ui/card';
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: '#003DA5' }}>
                  Detalles de la Noticia
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
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {/* Info General */}
          <Card className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="grid grid-cols-2 gap-4">
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
          </Card>

          {/* Disciplinables (Antes Denunciado) */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-5 h-5" style={{ color: '#003DA5' }} />
              Información de los Disciplinables
            </h3>
            <div className="space-y-4">
              {disciplinables.length === 0 ? (
                <p className="text-gray-500 italic">No hay información de disciplinables.</p>
              ) : (
                disciplinables.map((person: any, idx: number) => (
                  <Card key={idx} className="p-5 border-2 border-gray-200">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Nombre Completo</p>
                        <p className="text-sm font-semibold text-gray-900">{person?.nombre || 'Sin Nombre'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Identificación</p>
                        <p className="text-sm font-semibold text-gray-900">{person?.identificacion || person?.cedula || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Cargo</p>
                        <p className="text-sm font-semibold text-gray-900">{person?.cargo || 'Sin Cargo'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Dependencia</p>
                        <p className="text-sm font-semibold text-gray-900">{person?.dependencia || 'N/A'}</p>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Información de Radicación */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" style={{ color: '#003DA5' }} />
              Información de Radicación
            </h3>
            <Card className="p-5 border-2 border-gray-200">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Fecha de Recepción</p>
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
                  <p className="text-xs text-gray-500 mb-1">Territorial</p>
                  <p className="text-sm font-semibold text-gray-900">{noticia.territorial}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Radicador</p>
                  <p className="text-sm font-semibold text-gray-900">{radicadorNombre}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Conductas Indisciplinarias */}
          {noticia.conductas && noticia.conductas.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Conductas Indisciplinarias
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
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
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

          {/* Asignación (si existe) */}
          {noticia.profesionalAsignado && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-green-600" />
                Asignación
              </h3>
              <Card className="p-5 bg-green-50 border-2 border-green-200">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-green-600 font-semibold mb-1">PROFESIONAL ASIGNADO</p>
                    <p className="text-sm font-bold text-gray-900">{noticia.profesionalAsignado}</p>
                  </div>
                  {noticia.procesoAsociado && (
                    <div>
                      <p className="text-xs text-green-600 font-semibold mb-1">PROCESO ASOCIADO</p>
                      <p className="text-sm font-bold text-gray-900">{noticia.procesoAsociado}</p>
                    </div>
                  )}
                </div>
              </Card>
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
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
