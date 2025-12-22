/**
 * ============================================
 * BARRA DE ACCIONES POR LOTE
 * ============================================
 * 
 * Barra flotante que aparece cuando se seleccionan auditorías.
 * 
 * CARACTERÍSTICAS:
 * 1. Contador de elementos seleccionados
 * 2. Acciones rápidas (cambiar estado, asignar, eliminar)
 * 3. Animación de entrada/salida
 * 4. Diseño responsive
 * 5. Confirmaciones para acciones destructivas
 */

import { motion, AnimatePresence } from 'motion/react';
import {
  X, Trash2, UserPlus, FolderInput, Download, Copy,
  CheckSquare, Archive, Send, AlertTriangle
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { ConfirmationDialog } from '../../ui/confirmation-dialog';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

export interface BarraAccionesLoteProps {
  cantidadSeleccionados: number;
  onCancelarSeleccion: () => void;
  onCambiarEstado: (nuevoEstado: string) => void;
  onAsignarAuditor: () => void;
  onEliminar: () => void;
  onExportar: () => void;
  onArchivar: () => void;
  onEnviarAprobacion: () => void;
}

type AccionDestructiva = 'eliminar' | 'archivar' | null;

// ============ COMPONENTE PRINCIPAL ============

export function BarraAccionesLote({
  cantidadSeleccionados,
  onCancelarSeleccion,
  onCambiarEstado,
  onAsignarAuditor,
  onEliminar,
  onExportar,
  onArchivar,
  onEnviarAprobacion
}: BarraAccionesLoteProps) {
  const [mostrarMenuEstados, setMostrarMenuEstados] = useState(false);
  const [accionDestructiva, setAccionDestructiva] = useState<AccionDestructiva>(null);
  const [procesando, setProcesando] = useState(false);

  const estados = [
    { id: 'Planeación', label: 'Planeación', color: '#3b82f6' },
    { id: 'Ejecución', label: 'Ejecución', color: '#8b5cf6' },
    { id: 'Comunicación', label: 'Comunicación', color: '#f59e0b' },
    { id: 'Seguimiento', label: 'Seguimiento', color: '#06b6d4' },
    { id: 'Finalizada', label: 'Finalizada', color: '#10b981' }
  ];

  const handleEliminar = async () => {
    setProcesando(true);
    try {
      await onEliminar();
      setAccionDestructiva(null);
      toast.success(`${cantidadSeleccionados} auditoría(s) eliminada(s)`);
    } catch (error) {
      toast.error('Error al eliminar auditorías');
    } finally {
      setProcesando(false);
    }
  };

  const handleArchivar = async () => {
    setProcesando(true);
    try {
      await onArchivar();
      setAccionDestructiva(null);
      toast.success(`${cantidadSeleccionados} auditoría(s) archivada(s)`);
    } catch (error) {
      toast.error('Error al archivar auditorías');
    } finally {
      setProcesando(false);
    }
  };

  const handleCambiarEstado = (nuevoEstado: string) => {
    onCambiarEstado(nuevoEstado);
    setMostrarMenuEstados(false);
    toast.success(`${cantidadSeleccionados} auditoría(s) movida(s) a ${nuevoEstado}`);
  };

  return (
    <>
      <AnimatePresence>
        {cantidadSeleccionados > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl border-2 px-6 py-4 min-w-[700px] max-w-4xl"
              style={{ borderColor: '#003DA5' }}
            >
              <div className="flex items-center justify-between gap-6">
                {/* CONTADOR Y CANCELAR */}
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: '#E0EDFF' }}
                  >
                    <CheckSquare className="w-6 h-6" style={{ color: '#003DA5' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {cantidadSeleccionados} {cantidadSeleccionados === 1 ? 'auditoría seleccionada' : 'auditorías seleccionadas'}
                    </p>
                    <button
                      onClick={onCancelarSeleccion}
                      className="text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      Cancelar selección
                    </button>
                  </div>
                </div>

                {/* ACCIONES */}
                <div className="flex items-center gap-2">
                  {/* Cambiar Estado */}
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMostrarMenuEstados(!mostrarMenuEstados)}
                      className="gap-2"
                    >
                      <FolderInput className="w-4 h-4" />
                      Cambiar estado
                    </Button>

                    {/* Menú de Estados */}
                    <AnimatePresence>
                      {mostrarMenuEstados && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-xl border-2 border-gray-200 py-2 w-48 z-10"
                        >
                          {estados.map((estado) => (
                            <button
                              key={estado.id}
                              onClick={() => handleCambiarEstado(estado.id)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: estado.color }}
                              />
                              {estado.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Asignar Auditor */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onAsignarAuditor}
                    className="gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Asignar auditor
                  </Button>

                  {/* Enviar a Aprobación */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onEnviarAprobacion}
                    className="gap-2"
                    style={{ borderColor: '#10b981', color: '#10b981' }}
                  >
                    <Send className="w-4 h-4" />
                    Enviar a aprobación
                  </Button>

                  {/* Exportar */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onExportar}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Exportar
                  </Button>

                  {/* Archivar */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAccionDestructiva('archivar')}
                    className="gap-2"
                    style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
                  >
                    <Archive className="w-4 h-4" />
                    Archivar
                  </Button>

                  {/* Eliminar */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAccionDestructiva('eliminar')}
                    className="gap-2"
                    style={{ borderColor: '#DC2626', color: '#DC2626' }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </Button>

                  {/* Cerrar */}
                  <button
                    onClick={onCancelarSeleccion}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Advertencia para selecciones grandes */}
              {cantidadSeleccionados > 10 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-3 pt-3 border-t border-gray-200"
                >
                  <p className="text-xs text-yellow-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Has seleccionado {cantidadSeleccionados} auditorías. Las acciones pueden tardar unos momentos.
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONFIRMACIÓN DE ELIMINACIÓN */}
      <ConfirmationDialog
        open={accionDestructiva === 'eliminar'}
        onClose={() => setAccionDestructiva(null)}
        onConfirm={handleEliminar}
        title={`¿Eliminar ${cantidadSeleccionados} auditoría(s)?`}
        description={`Esta acción eliminará permanentemente ${cantidadSeleccionados} ${cantidadSeleccionados === 1 ? 'auditoría' : 'auditorías'} del sistema. Esta acción no se puede deshacer.`}
        confirmText="Sí, eliminar todas"
        cancelText="Cancelar"
        variant="danger"
        loading={procesando}
        requiresTyping={cantidadSeleccionados > 5}
        confirmationWord="ELIMINAR"
      />

      {/* CONFIRMACIÓN DE ARCHIVADO */}
      <ConfirmationDialog
        open={accionDestructiva === 'archivar'}
        onClose={() => setAccionDestructiva(null)}
        onConfirm={handleArchivar}
        title={`¿Archivar ${cantidadSeleccionados} auditoría(s)?`}
        description={`Las auditorías seleccionadas se moverán al archivo. Podrás restaurarlas posteriormente si es necesario.`}
        confirmText="Sí, archivar"
        cancelText="Cancelar"
        variant="warning"
        loading={procesando}
      />
    </>
  );
}
