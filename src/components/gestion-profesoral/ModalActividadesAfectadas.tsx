/**
 * Modal de Actividades Afectadas por Ajustes
 * Muestra las actividades que deben ajustarse según el feedback del revisor
 */

import { X, AlertTriangle, Clock, BookOpen, Microscope, Users, Briefcase, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'motion/react';
import { ButtonSIGL } from '../esap/gestion-legal/design-system/ButtonSIGL';

interface Actividad {
  id: string;
  codigo: string;
  nombre: string;
  componente: string;
  horasActuales: number;
  horasRequeridas: number;
  ajusteNecesario: number;
  tipoAjuste: 'aumentar' | 'reducir' | 'sin_cambio';
  observacion: string;
  estado: 'pendiente' | 'en_proceso' | 'completado';
}

interface ModalActividadesAfectadasProps {
  isOpen: boolean;
  onClose: () => void;
  onEditarActividad: (actividadId: string) => void;
}

export function ModalActividadesAfectadas({ isOpen, onClose, onEditarActividad }: ModalActividadesAfectadasProps) {
  if (!isOpen) return null;

  // Datos de ejemplo - en producción vendrían del sistema
  const actividadesAfectadas: Actividad[] = [
    {
      id: '1',
      codigo: 'DOC-002',
      nombre: 'Derecho Administrativo Avanzado',
      componente: 'Docencia',
      horasActuales: 90,
      horasRequeridas: 60,
      ajusteNecesario: -30,
      tipoAjuste: 'reducir',
      observacion: 'Reducir horas según plan de estudios actualizado',
      estado: 'pendiente'
    },
    {
      id: '2',
      codigo: 'INV-001',
      nombre: 'Proyecto MinCiencias',
      componente: 'Investigación',
      horasActuales: 70,
      horasRequeridas: 140,
      ajusteNecesario: 70,
      tipoAjuste: 'aumentar',
      observacion: 'Aumentar horas según cronograma proyecto',
      estado: 'pendiente'
    },
    {
      id: '3',
      codigo: 'EXT-001',
      nombre: 'Convenio Gobernación',
      componente: 'Extensión',
      horasActuales: 88,
      horasRequeridas: 100,
      ajusteNecesario: 12,
      tipoAjuste: 'aumentar',
      observacion: 'Ajustar según convenio (Cláusula 5.2)',
      estado: 'pendiente'
    },
    {
      id: '4',
      codigo: 'ADM-003',
      nombre: 'Proceso Acreditación',
      componente: 'Complementarias',
      horasActuales: 48,
      horasRequeridas: 40,
      ajusteNecesario: -8,
      tipoAjuste: 'reducir',
      observacion: 'Evaluar en fase sem subcontenido',
      estado: 'pendiente'
    }
  ];

  const getIconoComponente = (componente: string) => {
    switch (componente) {
      case 'Docencia':
        return <BookOpen className="w-4 h-4 text-blue-600" />;
      case 'Investigación':
        return <Microscope className="w-4 h-4 text-indigo-600" />;
      case 'Extensión':
        return <Users className="w-4 h-4 text-green-600" />;
      case 'Complementarias':
        return <Briefcase className="w-4 h-4 text-orange-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getColorComponente = (componente: string) => {
    switch (componente) {
      case 'Docencia':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Investigación':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'Extensión':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Complementarias':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const totalAjusteHoras = actividadesAfectadas.reduce((acc, act) => acc + Math.abs(act.ajusteNecesario), 0);
  const actividadesPendientes = actividadesAfectadas.filter(a => a.estado === 'pendiente').length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8 flex flex-col"
        style={{ maxHeight: 'calc(100vh - 4rem)' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003DA5] to-[#1e5da8] px-6 py-5 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Actividades Afectadas</h2>
              <p className="text-sm text-white/90 mt-1">Actividades que requieren ajustes según observaciones</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Resumen */}
        <div className="px-6 py-4 bg-amber-50 border-b border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-amber-900">
                {actividadesPendientes} actividades requieren ajustes
              </p>
              <p className="text-sm text-amber-800 mt-1">
                Total de horas a ajustar: <span className="font-bold">{totalAjusteHoras}h</span>
              </p>
            </div>
          </div>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {actividadesAfectadas.map((actividad, index) => (
              <div
                key={actividad.id}
                className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow bg-white"
              >
                {/* Header de la actividad */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-mono rounded">
                        {actividad.codigo}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${getColorComponente(actividad.componente)}`}>
                        {getIconoComponente(actividad.componente)}
                        <span className="ml-1">{actividad.componente}</span>
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">{actividad.nombre}</h3>
                    <p className="text-sm text-gray-600">{actividad.observacion}</p>
                  </div>
                </div>

                {/* Detalles del ajuste */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Horas Actuales</p>
                    <p className="text-xl font-bold text-gray-900">{actividad.horasActuales}h</p>
                  </div>

                  <div className={`rounded-lg p-3 border-2 ${
                    actividad.tipoAjuste === 'aumentar' 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-red-50 border-red-300'
                  }`}>
                    <p className="text-xs text-gray-600 mb-1">Ajuste Requerido</p>
                    <div className="flex items-center gap-2">
                      {actividad.tipoAjuste === 'aumentar' ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      )}
                      <p className={`text-xl font-bold ${
                        actividad.tipoAjuste === 'aumentar' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {actividad.ajusteNecesario > 0 ? '+' : ''}{actividad.ajusteNecesario}h
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-gray-600 mb-1">Horas Requeridas</p>
                    <p className="text-xl font-bold text-blue-600">{actividad.horasRequeridas}h</p>
                  </div>
                </div>

                {/* Acción */}
                <div className="flex justify-end">
                  <ButtonSIGL
                    variant="outline"
                    size="sm"
                    onClick={() => onEditarActividad(actividad.id)}
                    className="text-[#003DA5] border-[#003DA5] hover:bg-[#003DA5] hover:text-white"
                  >
                    Editar Actividad
                  </ButtonSIGL>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center flex-shrink-0">
          <p className="text-sm text-gray-600">
            {actividadesPendientes} de {actividadesAfectadas.length} actividades pendientes de ajustar
          </p>
          <ButtonSIGL variant="primary" onClick={onClose}>
            Cerrar
          </ButtonSIGL>
        </div>
      </motion.div>
    </div>
  );
}
