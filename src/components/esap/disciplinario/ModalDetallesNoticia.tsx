/**
 * MODAL DETALLES DE NOTICIA DISCIPLINARIA
 * Diseño actualizado alineado con el estándar ESAP (SIGL v5.0)
 */

import { motion } from 'motion/react';
import {
  X, Eye, User, FileText, AlertCircle, MessageSquare,
  UserCheck, Clock, Calendar, MapPin, Tag, Flag, CheckCircle, Info
} from 'lucide-react';
import { Badge } from '../../ui/badge';

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
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  {noticia.numeroRadicado}
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
                <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                  RADICADO
                </p>
                <p className="text-sm font-bold" style={{ color: '#1F2937' }}>
                  {noticia.numeroRadicado}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                  ORIGEN
                </p>
                <p className="text-sm font-bold" style={{ color: '#1F2937' }}>
                  {noticia.origen}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                  TERRITORIAL
                </p>
                <p className="text-sm font-bold" style={{ color: '#1F2937' }}>
                  {noticia.territorial}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                  DÍAS TRANSCURRIDOS
                </p>
                <p className="text-sm font-bold" style={{ color: '#DC2626' }}>
                  {noticia.diasTranscurridos} días
                </p>
              </div>
            </div>
          </div>

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
                  <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                    Fecha de Queja
                  </p>
                  <p className="text-sm font-bold" style={{ color: '#1F2937' }}>
                    {noticia.fechaQueja}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                    Fecha de Registro
                  </p>
                  <p className="text-sm font-bold" style={{ color: '#1F2937' }}>
                    {noticia.fechaRegistro}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                    Radicado Por
                  </p>
                  <p className="text-sm font-bold" style={{ color: '#1F2937' }}>
                    {noticia.radicador}
                  </p>
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
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-5 h-5" style={{ color: '#003DA5' }} />
                <h3 className="text-lg font-bold" style={{ color: '#1F2937' }}>
                  Conductas Reportadas
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {noticia.conductas.map((conducta, index) => (
                  <Badge
                    key={index}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: '#FEF3C7', color: '#D97706' }}
                  >
                    {conducta}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Descripción */}
          {noticia.descripcion && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-5 h-5" style={{ color: '#003DA5' }} />
                <h3 className="text-lg font-bold" style={{ color: '#1F2937' }}>
                  Descripción de los Hechos
                </h3>
              </div>
              <div className="p-5 rounded-xl" style={{ background: '#F8FAFC' }}>
                <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
                  {noticia.descripcion}
                </p>
              </div>
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
