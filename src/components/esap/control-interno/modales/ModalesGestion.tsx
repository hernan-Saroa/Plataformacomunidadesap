/**
 * ═════════════════════════════════════════════════════════════════════════
 * MODALES GESTIÓN - WORLD CLASS VERSION
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * Modales premium para gestión operativa de auditorías OCIG:
 * - ModalAsignarAuditor (Asignar responsables con perfiles)
 * - ModalAprobarAuditoria (Flujo de aprobación mejorado)
 * - ModalCambiarEstado (Cambio de fase Kanban visual)
 * - ModalNotas (Notas rápidas con historial)
 * 
 * CARACTERÍSTICAS WORLD CLASS:
 * ✅ Posicionamiento centrado perfecto
 * ✅ Animaciones fluidas con motion/react
 * ✅ Diseño corporativo ESAP (#003DA5, #F57C00)
 * ✅ Cards interactivas con hover effects
 * ✅ Validaciones en tiempo real
 * ✅ UX mejorada con feedback visual
 * 
 * @version 3.0 - WORLD CLASS
 * @date 30 Enero 2025
 */

import React, { useState } from 'react';
import { X, Check, Users, MessageSquare, FileText, Send, AlertCircle, Workflow } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { type EstadoKanban } from '../utils/esapThemeOCIG';
import { ModalBaseWorldClass } from '../ModalBaseWorldClass';
import { motion } from 'motion/react';

// ═════════════════════════════════════════════════════════════════════════
// 1. MODAL ASIGNAR AUDITOR - WORLD CLASS
// ═════════════════════════════════════════════════════════════════════════

interface ModalAsignarAuditorProps {
  isOpen: boolean;
  onClose: () => void;
  auditoriaId: string;
  onAsignar: (auditorId: string) => void;
}

export function ModalAsignarAuditor({ isOpen, onClose, auditoriaId, onAsignar }: ModalAsignarAuditorProps) {
  const [selectedAuditor, setSelectedAuditor] = useState('');

  const auditores = [
    { 
      id: 'aud-1', 
      nombre: 'Fernando Ávila', 
      cargo: 'Auditor Líder', 
      email: 'favila@esap.edu.co',
      experiencia: '10 años',
      disponibilidad: 'Disponible',
      auditorias: 45
    },
    { 
      id: 'aud-2', 
      nombre: 'Catalina Rubio', 
      cargo: 'Auditor Senior', 
      email: 'crubio@esap.edu.co',
      experiencia: '7 años',
      disponibilidad: 'Disponible',
      auditorias: 32
    },
    { 
      id: 'aud-3', 
      nombre: 'Laura Villa', 
      cargo: 'Auditor', 
      email: 'lvilla@esap.edu.co',
      experiencia: '4 años',
      disponibilidad: 'Ocupado',
      auditorias: 18
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAuditor) {
      toast.error('Debe seleccionar un auditor');
      return;
    }
    
    const auditor = auditores.find(a => a.id === selectedAuditor);
    onAsignar(selectedAuditor);
    toast.success('Auditor asignado correctamente', {
      description: `${auditor?.nombre} ha sido asignado a esta auditoría`
    });
    onClose();
  };

  const headerIcon = <Users className="w-5 h-5 text-[#003DA5]" />;

  const footerActions = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onClose}
        className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-base font-medium"
      >
        Cancelar
      </button>
      <button
        type="submit"
        onClick={handleSubmit}
        disabled={!selectedAuditor}
        className="px-5 py-2.5 bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white rounded-lg hover:shadow-lg transition-all text-base font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Users className="w-4 h-4" />
        Asignar Auditor
      </button>
    </div>
  );

  return (
    <ModalBaseWorldClass
      isOpen={isOpen}
      onClose={onClose}
      title="Asignar Auditor"
      subtitle="Seleccione el auditor responsable de la auditoría"
      size="lg"
      headerIcon={headerIcon}
      footerActions={footerActions}
    >
      <div className="space-y-4">
        {auditores.map((auditor, index) => (
          <motion.label
            key={auditor.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-start gap-4 p-5 border-2 rounded-xl cursor-pointer transition-all ${
              selectedAuditor === auditor.id
                ? 'border-[#003DA5] bg-[#E0EDFF] shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            } ${auditor.disponibilidad === 'Ocupado' ? 'opacity-60' : ''}`}
          >
            <input
              type="radio"
              name="auditor"
              value={auditor.id}
              checked={selectedAuditor === auditor.id}
              onChange={(e) => setSelectedAuditor(e.target.value)}
              className="mt-1 w-5 h-5 text-[#003DA5] focus:ring-[#003DA5] cursor-pointer"
              disabled={auditor.disponibilidad === 'Ocupado'}
            />
            
            <div className="flex-1">
              {/* Header con nombre y badge */}
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-base font-semibold text-gray-900">{auditor.nombre}</h4>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  auditor.disponibilidad === 'Disponible'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {auditor.disponibilidad}
                </span>
              </div>

              {/* Info del auditor */}
              <p className="text-sm text-gray-600 mb-3">{auditor.cargo}</p>
              
              {/* Grid con métricas */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-lg p-2 border border-gray-200">
                  <p className="text-xs text-gray-600">Experiencia</p>
                  <p className="text-sm font-semibold text-gray-900">{auditor.experiencia}</p>
                </div>
                <div className="bg-white rounded-lg p-2 border border-gray-200">
                  <p className="text-xs text-gray-600">Auditorías</p>
                  <p className="text-sm font-semibold text-gray-900">{auditor.auditorias}</p>
                </div>
                <div className="bg-white rounded-lg p-2 border border-gray-200">
                  <p className="text-xs text-gray-600">Email</p>
                  <p className="text-xs font-medium text-gray-900 truncate">{auditor.email}</p>
                </div>
              </div>
            </div>
          </motion.label>
        ))}

        {/* Info adicional */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-[#003DA5] rounded-lg p-4 mt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#003DA5] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">
                Recomendación
              </p>
              <p className="text-sm text-gray-700">
                Seleccione un auditor con disponibilidad y experiencia adecuada para garantizar 
                la calidad de la auditoría.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ModalBaseWorldClass>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// 2. MODAL APROBAR AUDITORÍA - WORLD CLASS
// ═════════════════════════════════════════════════════════════════════════

interface ModalAprobarAuditoriaProps {
  isOpen: boolean;
  onClose: () => void;
  auditoriaId: string;
  onAprobar: (comentario: string) => void;
}

export function ModalAprobarAuditoria({ isOpen, onClose, auditoriaId, onAprobar }: ModalAprobarAuditoriaProps) {
  const [comentario, setComentario] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAprobar(comentario);
    toast.success('Plan de Auditoría Aprobado', {
      description: 'El plan ha sido aprobado y la auditoría puede iniciar su ejecución'
    });
    onClose();
    setComentario('');
  };

  const headerIcon = <Check className="w-5 h-5 text-green-600" />;

  const footerActions = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onClose}
        className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-base font-medium"
      >
        Cancelar
      </button>
      <button
        type="submit"
        onClick={handleSubmit}
        className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-lg transition-all text-base font-medium flex items-center gap-2"
      >
        <Check className="w-4 h-4" />
        Aprobar Plan de Auditoría
      </button>
    </div>
  );

  return (
    <ModalBaseWorldClass
      isOpen={isOpen}
      onClose={onClose}
      title="Aprobar Plan de Auditoría"
      subtitle="Autorizar el inicio de ejecución de la auditoría"
      size="md"
      headerIcon={headerIcon}
      footerActions={footerActions}
    >
      <div className="space-y-6">
        {/* Explicación del proceso */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-2">
                ¿Qué significa "Aprobar el Plan de Auditoría"?
              </h4>
              <ul className="text-sm text-gray-700 space-y-1.5 list-disc list-inside">
                <li>El <strong>plan preliminar de auditoría</strong> (alcance, objetivos, metodología) ha sido revisado</li>
                <li>Se autoriza formalmente el <strong>inicio de la fase de ejecución</strong></li>
                <li>El equipo auditor puede comenzar a <strong>realizar el trabajo de campo</strong></li>
                <li>Se activa el <strong>cronograma de ejecución</strong> y se notifica a los responsables</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Alert de confirmación */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Check className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-2">
                ¿Confirma la aprobación del plan?
              </h4>
              <p className="text-sm text-gray-700">
                Al aprobar, la auditoría pasará de <span className="font-semibold text-blue-600">"Planificación"</span> a <span className="font-semibold text-green-600">"Ejecución"</span>, 
                habilitando el trabajo de campo y notificando al equipo auditor y al proceso auditado.
              </p>
            </div>
          </div>
        </div>

        {/* Campo de comentarios */}
        <div>
          <label className="block text-base font-semibold text-gray-900 mb-2">
            Comentarios de Aprobación
            <span className="text-sm text-gray-500 font-normal ml-2">(Opcional)</span>
          </label>
          <p className="text-sm text-gray-600 mb-3">
            Agregue observaciones, recomendaciones o condiciones para la ejecución
          </p>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={5}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-base resize-none"
            placeholder="Ej: Se aprueba el plan de auditoría presentado. El equipo debe priorizar la revisión de controles financieros durante la primera semana de ejecución."
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-gray-500">
              {comentario.length} caracteres
            </span>
            {comentario.length > 0 && (
              <button
                type="button"
                onClick={() => setComentario('')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalBaseWorldClass>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// 3. MODAL CAMBIAR ESTADO - WORLD CLASS
// ═════════════════════════════════════════════════════════════════════════

interface ModalCambiarEstadoProps {
  isOpen: boolean;
  onClose: () => void;
  auditoriaId: string;
  estadoActual: EstadoKanban;
  onCambiar: (nuevoEstado: EstadoKanban) => void;
}

export function ModalCambiarEstado({ isOpen, onClose, auditoriaId, estadoActual, onCambiar }: ModalCambiarEstadoProps) {
  const [nuevoEstado, setNuevoEstado] = useState<EstadoKanban>(estadoActual);

  const estados: { value: EstadoKanban; label: string; color: string; descripcion: string }[] = [
    { 
      value: 'backlog', 
      label: 'Backlog', 
      color: '#E8F4F8',
      descripcion: 'Auditorías pendientes de planificar'
    },
    { 
      value: 'planeacion', 
      label: 'Planeación', 
      color: '#FEF9E7',
      descripcion: 'En fase de planeación y preparación'
    },
    { 
      value: 'ejecucion', 
      label: 'Ejecución', 
      color: '#D4EFDF',
      descripcion: 'En proceso de ejecución activa'
    },
    { 
      value: 'comunicacion', 
      label: 'Comunicación', 
      color: '#FADBD8',
      descripcion: 'Comunicación de resultados'
    },
    { 
      value: 'cerrado', 
      label: 'Cerrado', 
      color: '#D5D8DC',
      descripcion: 'Auditoría finalizada y cerrada'
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const estado = estados.find(e => e.value === nuevoEstado);
    onCambiar(nuevoEstado);
    toast.success(`Estado cambiado exitosamente`, {
      description: `La auditoría ahora está en: ${estado?.label}`
    });
    onClose();
  };

  const headerIcon = <Workflow className="w-5 h-5 text-[#003DA5]" />;

  const footerActions = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onClose}
        className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-base font-medium"
      >
        Cancelar
      </button>
      <button
        type="submit"
        onClick={handleSubmit}
        disabled={nuevoEstado === estadoActual}
        className="px-5 py-2.5 bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white rounded-lg hover:shadow-lg transition-all text-base font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Workflow className="w-4 h-4" />
        Cambiar Estado
      </button>
    </div>
  );

  return (
    <ModalBaseWorldClass
      isOpen={isOpen}
      onClose={onClose}
      title="Cambiar Estado de Auditoría"
      subtitle="Seleccione el nuevo estado en el flujo Kanban"
      size="md"
      headerIcon={headerIcon}
      footerActions={footerActions}
    >
      <div className="space-y-3">
        {estados.map((estado, index) => (
          <motion.label
            key={estado.value}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
              nuevoEstado === estado.value
                ? 'border-[#003DA5] shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            } ${estadoActual === estado.value ? 'bg-gray-50' : 'bg-white'}`}
            style={{ 
              backgroundColor: nuevoEstado === estado.value ? `${estado.color}40` : undefined 
            }}
          >
            <input
              type="radio"
              name="estado"
              value={estado.value}
              checked={nuevoEstado === estado.value}
              onChange={(e) => setNuevoEstado(e.target.value as EstadoKanban)}
              className="w-5 h-5 text-[#003DA5] focus:ring-[#003DA5] cursor-pointer"
            />
            
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: estado.color }}
            >
              <div className="w-4 h-4 rounded-full bg-white" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base font-semibold text-gray-900">{estado.label}</span>
                {estadoActual === estado.value && (
                  <span className="px-2 py-0.5 bg-[#003DA5] text-white rounded-full text-xs font-semibold">
                    Actual
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{estado.descripcion}</p>
            </div>
          </motion.label>
        ))}
      </div>
    </ModalBaseWorldClass>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// 4. MODAL NOTAS - WORLD CLASS
// ═════════════════════════════════════════════════════════════════════════

interface ModalNotasProps {
  isOpen: boolean;
  onClose: () => void;
  auditoriaId: string;
  onGuardar: (nota: string) => void;
}

export function ModalNotas({ isOpen, onClose, auditoriaId, onGuardar }: ModalNotasProps) {
  const [nota, setNota] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nota.trim()) {
      toast.error('La nota no puede estar vacía');
      return;
    }
    onGuardar(nota);
    toast.success('Nota guardada exitosamente', {
      description: 'La nota ha sido agregada al expediente'
    });
    setNota('');
    onClose();
  };

  const headerIcon = <MessageSquare className="w-5 h-5 text-[#003DA5]" />;

  const footerActions = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onClose}
        className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-base font-medium"
      >
        Cancelar
      </button>
      <button
        type="submit"
        onClick={handleSubmit}
        disabled={!nota.trim()}
        className="px-5 py-2.5 bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white rounded-lg hover:shadow-lg transition-all text-base font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FileText className="w-4 h-4" />
        Guardar Nota
      </button>
    </div>
  );

  return (
    <ModalBaseWorldClass
      isOpen={isOpen}
      onClose={onClose}
      title="Agregar Nota"
      subtitle="Registre observaciones o comentarios sobre la auditoría"
      size="md"
      headerIcon={headerIcon}
      footerActions={footerActions}
    >
      <div className="space-y-4">
        {/* Info Card */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-[#003DA5] rounded-lg p-4">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-[#003DA5] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">
                Notas Rápidas
              </p>
              <p className="text-sm text-gray-700">
                Las notas se guardarán en el expediente de la auditoría y serán visibles 
                para todos los miembros del equipo auditor.
              </p>
            </div>
          </div>
        </div>

        {/* Editor de nota */}
        <div>
          <label className="block text-base font-semibold text-gray-900 mb-2">
            Nota
          </label>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={8}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5] transition-all text-base resize-none"
            placeholder="Escriba su nota aquí...&#10;&#10;Puede incluir:&#10;• Observaciones importantes&#10;• Hallazgos preliminares&#10;• Recordatorios para el equipo&#10;• Cualquier información relevante"
            autoFocus
          />
          
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-gray-500">
              {nota.length} caracteres
            </span>
            {nota.length > 0 && (
              <button
                type="button"
                onClick={() => setNota('')}
                className="text-sm text-[#003DA5] hover:text-[#2962FF] font-medium"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalBaseWorldClass>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════════════════════

export default {
  AsignarAuditor: ModalAsignarAuditor,
  Aprobar: ModalAprobarAuditoria,
  CambiarEstado: ModalCambiarEstado,
  Notas: ModalNotas,
};