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
  Clock
} from 'lucide-react';
import { Card } from '../../ui/card';

interface NoticiaDisciplinaria {
  id: string;
  numeroRadicado: string;
  origen: string;
  fechaQueja: string;
  territorial: string;
  denunciado: {
    nombre: string;
    identificacion: string;
    cargo: string;
    dependencia: string;
  };
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

interface Props {
  noticia: NoticiaDisciplinaria;
  onClose: () => void;
}

export function ModalDetallesNoticia({ noticia, onClose }: Props) {
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
                  {noticia.numeroRadicado}
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
                <p className="text-lg font-bold text-gray-900">{noticia.numeroRadicado}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-600 mb-1">ORIGEN</p>
                <p className="text-sm font-semibold text-gray-900">{noticia.origen}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-600 mb-1">ESTADO</p>
                <p className="text-sm font-semibold text-gray-900">{noticia.estadoLabel}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-600 mb-1">DÍAS TRANSCURRIDOS</p>
                <p className="text-lg font-bold text-gray-900">{noticia.diasTranscurridos} días</p>
              </div>
            </div>
          </Card>

          {/* Denunciado */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-5 h-5" style={{ color: '#003DA5' }} />
              Información del Denunciado/Investigado
            </h3>
            <Card className="p-5 border-2 border-gray-200">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Nombre Completo</p>
                  <p className="text-sm font-semibold text-gray-900">{noticia.denunciado.nombre}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Identificación</p>
                  <p className="text-sm font-semibold text-gray-900">{noticia.denunciado.identificacion}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Cargo</p>
                  <p className="text-sm font-semibold text-gray-900">{noticia.denunciado.cargo}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Dependencia</p>
                  <p className="text-sm font-semibold text-gray-900">{noticia.denunciado.dependencia}</p>
                </div>
              </div>
            </Card>
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
                  <p className="text-xs text-gray-500 mb-1">Fecha de Queja</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(noticia.fechaQueja).toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Fecha de Registro</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(noticia.fechaRegistro).toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Territorial</p>
                  <p className="text-sm font-semibold text-gray-900">{noticia.territorial}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Radicador</p>
                  <p className="text-sm font-semibold text-gray-900">{noticia.radicador}</p>
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
                  {noticia.conductas.map((conducta, idx) => (
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
                <p className="text-sm text-gray-700 leading-relaxed">{noticia.descripcion}</p>
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
              <p className="text-base font-semibold text-gray-900">{noticia.etapa}</p>
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
