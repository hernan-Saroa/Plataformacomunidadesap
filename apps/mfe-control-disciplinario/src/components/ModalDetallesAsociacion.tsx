import { X, Link2, Calendar, User, FileText, Clock, AlertCircle, Info, ExternalLink } from 'lucide-react';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { motion, AnimatePresence } from 'motion/react';

interface Proceso {
  id: string;
  numeroProceso: string;
  denunciante: { nombre: string; tipoIdentificacion: string; numeroIdentificacion: string } | string;
  denunciado: { nombre: string; tipoIdentificacion: string; numeroIdentificacion: string } | string;
  etapaActual: string;
  profesionalAsignado: { nombre: string } | string;
  semaforo: 'verde' | 'amarillo' | 'rojo';
}

interface ModalDetallesAsociacionProps {
  isOpen: boolean;
  onClose: () => void;
  procesoOrigen: Proceso;
  procesoDestino?: Proceso;
  tipoAsociacion: 'conexo' | 'similar' | 'consolidado';
  fechaAsociacion?: string;
  justificacion?: string;
  onVerProceso?: (procesoId: string) => void;
}

export function ModalDetallesAsociacion({
  isOpen,
  onClose,
  procesoOrigen,
  procesoDestino,
  tipoAsociacion,
  fechaAsociacion,
  justificacion,
  onVerProceso
}: ModalDetallesAsociacionProps) {
  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'conexo': return 'Conexo';
      case 'similar': return 'Similar';
      case 'consolidado': return 'Consolidado';
      default: return 'Asociado';
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'conexo': return '#9333EA';
      case 'similar': return '#3B82F6';
      case 'consolidado': return '#059669';
      default: return '#6B7280';
    }
  };

  const getSemaforoColor = (semaforo?: string) => {
    switch (semaforo) {
      case 'verde': return { bg: '#D1FAE5', color: '#059669', text: 'En término' };
      case 'amarillo': return { bg: '#FEF3C7', color: '#D97706', text: 'Próximo a vencer' };
      case 'rojo': return { bg: '#FEE2E2', color: '#DC2626', text: 'Vencido' };
      default: return { bg: '#F3F4F6', color: '#6B7280', text: 'N/A' };
    }
  };

  const semaforoOrigen = getSemaforoColor(procesoOrigen.semaforo);
  const semaforoDestino = procesoDestino ? getSemaforoColor(procesoDestino.semaforo) : null;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div 
            className="px-6 py-4 border-b border-gray-100 flex items-center justify-between"
            style={{ background: `linear-gradient(135deg, ${getTipoColor(tipoAsociacion)}15 0%, ${getTipoColor(tipoAsociacion)}05 100%)` }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${getTipoColor(tipoAsociacion)}20` }}
              >
                <Link2 className="w-5 h-5" style={{ color: getTipoColor(tipoAsociacion) }} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Detalles de Asociación</h2>
                <p className="text-sm text-gray-500">Información completa de la asociación entre procesos</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Tipo de Asociación */}
            <div className="flex items-center gap-3">
              <Badge
                className="text-sm font-bold px-3 py-1.5 rounded-full"
                style={{ background: `${getTipoColor(tipoAsociacion)}20`, color: getTipoColor(tipoAsociacion) }}
              >
                {getTipoLabel(tipoAsociacion)}
              </Badge>
              {fechaAsociacion && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>Asociado el: {new Date(fechaAsociacion).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                </div>
              )}
            </div>

            {/* Proceso Origen */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Proceso Origen</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 uppercase font-bold">Número</p>
                    <p className="font-bold text-blue-900">{procesoOrigen.numeroProceso}</p>
                  </div>
                  <div 
                    className="px-3 py-1.5 rounded-lg flex items-center gap-2"
                    style={{ background: semaforoOrigen.bg }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ background: semaforoOrigen.color }} />
                    <span className="text-xs font-semibold" style={{ color: semaforoOrigen.color }}>
                      {semaforoOrigen.text}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-blue-600 uppercase font-bold">Etapa</p>
                    <p className="font-medium text-blue-800">{procesoOrigen.etapaActual}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 uppercase font-bold">Denunciado</p>
                    <p className="font-medium text-blue-800 truncate">
                      {typeof procesoOrigen.denunciado === 'string' 
                        ? procesoOrigen.denunciado 
                        : procesoOrigen.denunciado?.nombre || 'Sin información'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-blue-600 uppercase font-bold">Profesional</p>
                  <p className="font-medium text-blue-800">
                    {typeof procesoOrigen.profesionalAsignado === 'string' 
                      ? procesoOrigen.profesionalAsignado 
                      : procesoOrigen.profesionalAsignado?.nombre || 'Sin asignar'}
                  </p>
                </div>
              </div>
            </div>

            {/* Proceso Destino */}
            {procesoDestino && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-green-600" />
                  <h3 className="font-semibold text-green-900">Proceso Destino (Asociado)</h3>
                  {onVerProceso && (
                    <button
                      onClick={() => onVerProceso(procesoDestino.id)}
                      className="ml-auto p-1.5 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-1 text-xs font-medium text-green-700"
                      title="Ver detalles del proceso"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ver proceso
                    </button>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-green-600 uppercase font-bold">Número</p>
                      <p className="font-bold text-green-900">{procesoDestino.numeroProceso}</p>
                    </div>
                    {semaforoDestino && (
                      <div 
                        className="px-3 py-1.5 rounded-lg flex items-center gap-2"
                        style={{ background: semaforoDestino.bg }}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ background: semaforoDestino.color }} />
                        <span className="text-xs font-semibold" style={{ color: semaforoDestino.color }}>
                          {semaforoDestino.text}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-green-600 uppercase font-bold">Etapa</p>
                      <p className="font-medium text-green-800">{procesoDestino.etapaActual}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-600 uppercase font-bold">Denunciado</p>
                      <p className="font-medium text-green-800 truncate">
                        {typeof procesoDestino.denunciado === 'string' 
                          ? procesoDestino.denunciado 
                          : procesoDestino.denunciado?.nombre || 'Sin información'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-green-600 uppercase font-bold">Profesional</p>
                    <p className="font-medium text-green-800">
                      {typeof procesoDestino.profesionalAsignado === 'string' 
                        ? procesoDestino.profesionalAsignado 
                        : procesoDestino.profesionalAsignado?.nombre || 'Sin asignar'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Justificación */}
            {justificacion && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Justificación de la Asociación</h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{justificacion}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Cerrar
            </Button>
            {onVerProceso && procesoDestino && (
              <Button
                onClick={() => onVerProceso(procesoDestino.id)}
                className="bg-[#003DA5] hover:bg-[#003DA5]/90 text-white"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver Proceso Asociado
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
