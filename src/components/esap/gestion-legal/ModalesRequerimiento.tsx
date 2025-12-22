/**
 * ================================================================================
 * MODALES ADICIONALES PARA REQUERIMIENTOS - ÓRGANOS DE CONTROL
 * ================================================================================
 * 
 * Modales independientes para:
 * - ModalNotas: Sistema de comentarios/notas
 * - ModalHistorial: Timeline de cambios
 * - ModalNuevoRequerimiento: Formulario completo de creación
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  MessageSquare,
  History,
  Send,
  User,
  Clock,
  Plus,
  Shield,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';
import { FormularioRequerimientoOrganoControl } from './defensa-judicial/FormularioRequerimientoOrganoControl';

// ==================== TIPOS ====================

interface Nota {
  id: string;
  autor: string;
  fecha: Date;
  contenido: string;
}

interface HistorialItem {
  id: string;
  fecha: Date;
  accion: string;
  usuario: string;
  detalles?: string;
}

// ==================== MODAL NOTAS ====================

export function ModalNotas({
  isOpen,
  onClose,
  requerimientoId,
  notas = [],
  onAgregarNota,
}: {
  isOpen: boolean;
  onClose: () => void;
  requerimientoId: string;
  notas?: Nota[];
  onAgregarNota: (contenido: string) => void;
}) {
  const [nuevaNota, setNuevaNota] = useState('');

  const handleAgregar = () => {
    if (!nuevaNota.trim()) {
      toast.error('Escribe un comentario antes de enviar');
      return;
    }
    onAgregarNota(nuevaNota);
    setNuevaNota('');
    toast.success('Nota agregada exitosamente');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Notas y Comentarios</h2>
                <p className="text-sm text-blue-100">{requerimientoId}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto p-6">
            {notas.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No hay notas registradas</p>
                <p className="text-sm mt-2">Sé el primero en agregar un comentario</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notas.map((nota) => (
                  <Card key={nota.id} className="p-4 border-l-4 border-l-blue-500">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-bold text-gray-900">{nota.autor}</p>
                          <p className="text-xs text-gray-500">{formatDate(nota.fecha)}</p>
                        </div>
                        <p className="text-gray-700 leading-relaxed">{nota.contenido}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Footer - Nueva Nota */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="space-y-3">
              <textarea
                value={nuevaNota}
                onChange={(e) => setNuevaNota(e.target.value)}
                placeholder="Escribe tu comentario..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cerrar
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAgregar}>
                  <Send className="w-4 h-4 mr-2" />
                  Agregar Nota
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ==================== MODAL HISTORIAL ====================

export function ModalHistorial({
  isOpen,
  onClose,
  requerimientoId,
  historial = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  requerimientoId: string;
  historial?: HistorialItem[];
}) {
  const formatDate = (date: Date) => {
    return date.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getIconForAccion = (accion: string) => {
    if (accion.includes('Creado')) return <Plus className="w-5 h-5 text-blue-600" />;
    if (accion.includes('Movido') || accion.includes('Actualizado'))
      return <ArrowRight className="w-5 h-5 text-purple-600" />;
    if (accion.includes('Aprobado') || accion.includes('Completado'))
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    return <Clock className="w-5 h-5 text-gray-600" />;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <History className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Historial de Cambios</h2>
                <p className="text-sm text-purple-100">{requerimientoId}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Contenido - Timeline */}
          <div className="flex-1 overflow-y-auto p-6">
            {historial.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No hay historial registrado</p>
              </div>
            ) : (
              <div className="relative">
                {/* Línea vertical del timeline */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-300" />

                <div className="space-y-6">
                  {historial.map((item, index) => (
                    <div key={item.id} className="relative flex gap-4">
                      {/* Ícono */}
                      <div className="relative z-10 flex-shrink-0">
                        <div className="w-12 h-12 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center">
                          {getIconForAccion(item.accion)}
                        </div>
                      </div>

                      {/* Contenido */}
                      <Card className="flex-1 p-4 border-2 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-bold text-gray-900">{item.accion}</h4>
                          <Badge className="bg-gray-100 text-gray-700">{formatDate(item.fecha)}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <User className="w-3 h-3 inline mr-1" />
                          {item.usuario}
                        </p>
                        {item.detalles && (
                          <p className="text-sm text-gray-700 mt-2 p-2 bg-gray-50 rounded">
                            {item.detalles}
                          </p>
                        )}
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ==================== MODAL NUEVO REQUERIMIENTO ====================

export function ModalNuevoRequerimiento({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const handleSubmit = (data: any) => {
    onSubmit(data);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-start justify-center z-[110] p-4 pt-20 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[calc(100vh-6rem)] overflow-hidden flex flex-col my-4"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Nuevo Requerimiento</h2>
                <p className="text-sm text-red-100">Órganos de Control</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Formulario */}
          <div className="flex-1 overflow-y-auto p-6">
            <FormularioRequerimientoOrganoControl
              onGuardar={handleSubmit}
              onCancelar={onClose}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}