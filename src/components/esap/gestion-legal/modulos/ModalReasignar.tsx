/**
 * ModalReasignar - Modal para reasignar un requerimiento a otro responsable
 * DISEÑO LIMPIO ESAP 2025
 */

import { useState } from 'react';
import { X, User, Search, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface ResponsableESAP {
  id: string;
  nombre: string;
  cargo: string;
  area: string;
  correo: string;
  foto?: string;
}

interface ModalReasignarProps {
  isOpen: boolean;
  onClose: () => void;
  requerimientoId: string;
  responsableActual: string;
  onReasignacion?: (nuevoResponsable: ResponsableESAP) => void;
}

export function ModalReasignar({
  isOpen,
  onClose,
  requerimientoId,
  responsableActual,
  onReasignacion
}: ModalReasignarProps) {
  const [busqueda, setBusqueda] = useState('');
  const [responsableSeleccionado, setResponsableSeleccionado] = useState<ResponsableESAP | null>(null);
  const [justificacion, setJustificacion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock de responsables disponibles
  const responsablesDisponibles: ResponsableESAP[] = [
    {
      id: '1',
      nombre: 'Dra. María Fernández',
      cargo: 'Jefe Oficina Jurídica',
      area: 'Área Jurídica',
      correo: 'maria.fernandez@esap.edu.co'
    },
    {
      id: '2',
      nombre: 'Dr. Carlos Pérez',
      cargo: 'Abogado Senior',
      area: 'Área Jurídica',
      correo: 'carlos.perez@esap.edu.co'
    },
    {
      id: '3',
      nombre: 'Dra. Ana Rodríguez',
      cargo: 'Abogada Contratación',
      area: 'Área de Contratación',
      correo: 'ana.rodriguez@esap.edu.co'
    },
    {
      id: '4',
      nombre: 'Dr. Luis Martínez',
      cargo: 'Abogado Disciplinario',
      area: 'Oficina de Control Interno Disciplinario',
      correo: 'luis.martinez@esap.edu.co'
    },
    {
      id: '5',
      nombre: 'Dra. Patricia Gómez',
      cargo: 'Coordinadora Legal',
      area: 'Área Jurídica',
      correo: 'patricia.gomez@esap.edu.co'
    },
    {
      id: '6',
      nombre: 'Dr. Jorge Ramírez',
      cargo: 'Abogado Junior',
      area: 'Área Jurídica',
      correo: 'jorge.ramirez@esap.edu.co'
    }
  ];

  const responsablesFiltrados = responsablesDisponibles.filter(
    r => r.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
         r.cargo.toLowerCase().includes(busqueda.toLowerCase()) ||
         r.area.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!responsableSeleccionado) {
      toast.error('Debe seleccionar un responsable');
      return;
    }

    if (!justificacion.trim()) {
      toast.error('Debe ingresar una justificación');
      return;
    }

    setIsSubmitting(true);

    // Simular llamada a API
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast.success(`✅ Requerimiento reasignado exitosamente a ${responsableSeleccionado.nombre}`);
    
    if (onReasignacion) {
      onReasignacion(responsableSeleccionado);
    }

    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[9998]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-white rounded-2xl shadow-2xl z-[9999] max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-gray-100 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-600 rounded-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Reasignar Requerimiento</h2>
                  <p className="text-sm text-gray-600">{requerimientoId}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Contenido */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              {/* Responsable Actual */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-600 font-bold mb-1">Responsable Actual</p>
                <p className="text-sm font-bold text-blue-900">
                  👤 {responsableActual}
                </p>
              </div>

              {/* Búsqueda */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Buscar Nuevo Responsable *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre, cargo o área..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Lista de Responsables */}
              <div>
                <p className="text-sm font-bold text-gray-900 mb-3">
                  Responsables Disponibles ({responsablesFiltrados.length})
                </p>
                <div className="space-y-2 max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {responsablesFiltrados.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No se encontraron responsables</p>
                    </div>
                  ) : (
                    responsablesFiltrados.map((responsable) => (
                      <button
                        key={responsable.id}
                        type="button"
                        onClick={() => setResponsableSeleccionado(responsable)}
                        className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                          responsableSeleccionado?.id === responsable.id
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {responsable.nombre.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-gray-900">{responsable.nombre}</p>
                              {responsableSeleccionado?.id === responsable.id && (
                                <CheckCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-600">{responsable.cargo}</p>
                            <p className="text-xs text-purple-600 mt-0.5">📧 {responsable.correo}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Justificación */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Justificación de la Reasignación *
                </label>
                <textarea
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value)}
                  placeholder="Ingrese la justificación para reasignar este requerimiento..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  required
                />
              </div>

              {/* Alerta informativa */}
              {responsableSeleccionado && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-900">Importante</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Se notificará automáticamente a <strong>{responsableSeleccionado.nombre}</strong> sobre la asignación de este requerimiento. 
                      El responsable actual ({responsableActual}) recibirá una notificación del cambio.
                    </p>
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !responsableSeleccionado || !justificacion.trim()}
                  className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Reasignando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Reasignar Requerimiento
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
