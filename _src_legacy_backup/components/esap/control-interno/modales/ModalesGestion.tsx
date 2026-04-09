/**
 * ═════════════════════════════════════════════════════════════════════════
 * MODALES GESTIÓN - WORLD CLASS VERSION
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * Modales premium para gestión operativa de auditorías OCI:
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

import React, { useState, useRef } from 'react';
import { X, Check, Users, MessageSquare, FileText, Send, AlertCircle, Workflow, Info, Upload } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { type EstadoKanban } from '../utils/esapThemeOCI';
import { ModalBaseWorldClass } from '../ModalBaseWorldClass';
import { motion } from 'motion/react';

// ═════════════════════════════════════════════════════════════════════════
// 1. MODAL ASIGNAR AUDITOR - WORLD CLASS
// ═════════════════════════════════════════════════════════════════════════

// Tipo para auditores (compatible con backend)
interface AuditorDisponible {
  id: string;
  nombre: string;
  cargo: string;
  email: string;
  experiencia?: string;
  disponibilidad?: string;
  auditorias?: number;
}

// Lista de auditores por defecto (fallback si no se provee desde backend)
const AUDITORES_DEFAULT: AuditorDisponible[] = [
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

interface ModalAsignarAuditorProps {
  isOpen: boolean;
  onClose: () => void;
  auditoriaId: string;
  onAsignar: (auditorId: string) => void;
  auditoresDisponibles?: AuditorDisponible[]; // ✅ NUEVO: Lista de auditores del backend
  auditorActualId?: string | number | null; // ✅ NUEVO: ID del auditor actualmente asignado
}

export function ModalAsignarAuditor({ 
  isOpen, 
  onClose, 
  auditoriaId, 
  onAsignar,
  auditoresDisponibles,
  auditorActualId 
}: ModalAsignarAuditorProps) {
  // Normalizar el ID del auditor actual a string para comparación
  const auditorActualIdStr = auditorActualId != null ? String(auditorActualId) : '';
  const [selectedAuditor, setSelectedAuditor] = useState(auditorActualIdStr);

  // Usar auditores del backend si están disponibles, sino usar fallback
  const auditores = (auditoresDisponibles && auditoresDisponibles.length > 0)
    ? auditoresDisponibles.map(a => ({
        ...a,
        experiencia: a.experiencia || 'N/A',
        disponibilidad: a.disponibilidad || 'Disponible',
        auditorias: a.auditorias || 0
      }))
    : AUDITORES_DEFAULT;

  // Sincronizar cuando cambia el auditor actual o se abre el modal
  React.useEffect(() => {
    const idStr = auditorActualId != null ? String(auditorActualId) : '';
    console.log('📌 Modal Asignar Auditor - ID actual:', auditorActualId, '-> String:', idStr);
    console.log('📌 Auditores disponibles:', auditores.map(a => ({ id: a.id, nombre: a.nombre })));
    setSelectedAuditor(idStr);
  }, [auditorActualId, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAuditor) {
      toast.error('Debe seleccionar un auditor');
      return;
    }
    
    // ✅ Comparar como strings
    const auditor = auditores.find(a => String(a.id) === selectedAuditor);
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
        {auditores.map((auditor, index) => {
          // ✅ Normalizar ID a string para comparaciones consistentes
          const auditorIdStr = String(auditor.id);
          const esAuditorActual = auditorActualIdStr && auditorIdStr === auditorActualIdStr;
          const estaSeleccionado = selectedAuditor === auditorIdStr;
          return (
          <motion.label
            key={auditor.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-start gap-4 p-5 border-2 rounded-xl cursor-pointer transition-all ${
              estaSeleccionado
                ? 'border-[#003DA5] bg-[#E0EDFF] shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            } ${auditor.disponibilidad === 'Ocupado' ? 'opacity-60' : ''}`}
          >
            <input
              type="radio"
              name="auditor"
              value={auditorIdStr}
              checked={estaSeleccionado}
              onChange={(e) => setSelectedAuditor(e.target.value)}
              className="mt-1 w-5 h-5 text-[#003DA5] focus:ring-[#003DA5] cursor-pointer"
              disabled={auditor.disponibilidad === 'Ocupado'}
            />
            
            <div className="flex-1">
              {/* Header con nombre y badges */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-semibold text-gray-900">{auditor.nombre}</h4>
                  {esAuditorActual && (
                    <span className="px-2 py-0.5 bg-[#003DA5] text-white rounded-full text-xs font-semibold">
                      Actual
                    </span>
                  )}
                </div>
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
          );
        })}

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
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // VALIDACIÓN: Comentario obligatorio
    if (!comentario || comentario.trim().length === 0) {
      setError('El comentario es obligatorio para aceptar el hallazgo');
      toast.error('Comentario requerido', {
        description: 'Debe ingresar un comentario explicando la aceptación del hallazgo'
      });
      return;
    }
    
    if (comentario.trim().length < 10) {
      setError('El comentario debe tener al menos 10 caracteres');
      toast.error('Comentario muy corto', {
        description: 'El comentario debe ser claro y descriptivo (mínimo 10 caracteres)'
      });
      return;
    }
    
    setError('');
    onAprobar(comentario);
    toast.success('Hallazgo Aceptado', {
      description: 'La unidad auditada acepta el hallazgo. Se puede proceder con el plan de mejoramiento'
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
        disabled={!comentario || comentario.trim().length < 10}
        className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-lg transition-all text-base font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Check className="w-4 h-4" />
        Aceptar Hallazgo
      </button>
    </div>
  );

  return (
    <ModalBaseWorldClass
      isOpen={isOpen}
      onClose={onClose}
      title="Aceptar Hallazgo de Auditoría"
      subtitle="La unidad auditada debe aceptar o no aceptar el hallazgo identificado"
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
                ¿Qué significa "Aceptar el Hallazgo"?
              </h4>
              <ul className="text-sm text-gray-700 space-y-1.5 list-disc list-inside">
                <li>La <strong>unidad auditada</strong> reconoce la situación identificada por el equipo auditor</li>
                <li>Se compromete a implementar las <strong>acciones correctivas</strong> correspondientes</li>
                <li>Al aceptar, se procede con la <strong>formulación del plan de mejoramiento</strong></li>
                <li><strong>Importante:</strong> El comentario es obligatorio para justificar la aceptación</li>
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
                ¿Confirma la aceptación del hallazgo?
              </h4>
              <p className="text-sm text-gray-700">
                Al aceptar, se reconoce el hallazgo identificado y se iniciará el proceso de
                <span className="font-semibold text-blue-600"> formulación del Plan de Mejoramiento</span> con las acciones correctivas necesarias.
              </p>
            </div>
          </div>
        </div>

        {/* Campo de comentarios */}
        <div>
          <label className="block text-base font-semibold text-gray-900 mb-2">
            Comentarios de Aceptación
            <span className="text-sm text-red-600 font-bold ml-2">(*Obligatorio)</span>
          </label>
          <p className="text-sm text-gray-600 mb-3">
            Explique por qué la unidad auditada acepta el hallazgo y qué acciones implementará (mínimo 10 caracteres)
          </p>
          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <textarea
            value={comentario}
            onChange={(e) => {
              setComentario(e.target.value);
              if (error) setError('');
            }}
            rows={5}
            className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 transition-all text-base resize-none ${
              error 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
            }`}
            placeholder="Ej: La Unidad acepta el hallazgo identificado. Se reconoce la debilidad en los controles financieros y se compromete a implementar las medidas correctivas sugeridas en un plazo de 30 días."
            required
          />
          <div className="flex justify-between items-center mt-2">
            <span className={`text-sm ${
              comentario.length < 10 ? 'text-red-600 font-semibold' : 'text-gray-500'
            }`}>
              {comentario.length} / 10 caracteres mínimo {comentario.length >= 10 ? '✓' : ''}
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

// Helper para normalizar estado del backend al formato del modal
const normalizarEstado = (estado: string | undefined): EstadoKanban => {
  if (!estado) return 'planeacion';
  const estadoLower = estado.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (estadoLower.includes('backlog') || estadoLower.includes('pendiente') || estadoLower.includes('plan anual') || estadoLower.includes('plan-anual')) return 'backlog';
  if (estadoLower.includes('planeacion') || estadoLower.includes('planificacion')) return 'planeacion';
  if (estadoLower.includes('ejecucion')) return 'ejecucion';
  if (estadoLower.includes('comunicacion') || estadoLower.includes('informe')) return 'comunicacion';
  if (estadoLower.includes('cerrado') || estadoLower.includes('finalizada') || estadoLower.includes('seguimiento')) return 'cerrado';
  return 'planeacion';
};

interface ModalCambiarEstadoProps {
  isOpen: boolean;
  onClose: () => void;
  auditoriaId: string;
  estadoActual: EstadoKanban | string;
  onCambiar: (nuevoEstado: EstadoKanban) => void;
}

export function ModalCambiarEstado({ isOpen, onClose, auditoriaId, estadoActual, onCambiar }: ModalCambiarEstadoProps) {
  // Normalizar el estado actual
  const estadoNormalizado = normalizarEstado(estadoActual as string);
  const [nuevoEstado, setNuevoEstado] = useState<EstadoKanban>(estadoNormalizado);

  // Actualizar cuando cambia el estado actual
  React.useEffect(() => {
    setNuevoEstado(normalizarEstado(estadoActual as string));
  }, [estadoActual]);

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
      value: 'finalizada', 
      label: 'Finalizada', 
      color: '#D5DBDB',
      descripcion: 'Auditoría finalizada (requiere documento de cierre)'
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
        disabled={nuevoEstado === estadoNormalizado}
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
            } ${estadoNormalizado === estado.value ? 'bg-gray-50' : 'bg-white'}`}
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
                {estadoNormalizado === estado.value && (
                  <span className="px-2 py-0.5 bg-[#003DA5] text-white rounded-full text-xs font-semibold">
                    Actual
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{estado.descripcion}</p>
            </div>
          </motion.label>
        ))}
        
        {/* Mensaje informativo sobre finalización */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-blue-900 mb-1">Finalización de auditoría</p>
              <p className="text-blue-700">
                Al seleccionar <strong>"Finalizada"</strong>, se abrirá un modal donde deberá 
                adjuntar obligatoriamente el documento o matriz de cierre de la auditoría.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ModalBaseWorldClass>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// 4. MODAL NOTAS - WORLD CLASS - ✅ CON LISTADO DE NOTAS
// ═════════════════════════════════════════════════════════════════════════

interface NotaExistente {
  id: string;
  contenido: string;
  categoria: string;
  fecha: string;
  hora?: string;
  autorNombre?: string;
  autorCargo?: string;
  importante?: boolean;
}

interface ModalNotasProps {
  isOpen: boolean;
  onClose: () => void;
  auditoriaId: string;
  onGuardar: (nota: string) => void;
  onLoadNotas?: (auditoriaId: string) => Promise<any[]>;
}

export function ModalNotas({ isOpen, onClose, auditoriaId, onGuardar, onLoadNotas }: ModalNotasProps) {
  const [nota, setNota] = useState('');
  const [notas, setNotas] = useState<NotaExistente[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar notas cuando se abre el modal
  React.useEffect(() => {
    const cargarNotas = async () => {
      if (!isOpen || !auditoriaId || !onLoadNotas) return;
      
      setLoading(true);
      try {
        const notasBackend = await onLoadNotas(auditoriaId);
        if (Array.isArray(notasBackend)) {
          setNotas(notasBackend.map(n => ({
            id: n.id,
            contenido: n.contenido,
            categoria: n.categoria || 'General',
            fecha: n.fecha || n.createdAt,
            hora: n.hora,
            autorNombre: n.autorNombre || 'Usuario',
            autorCargo: n.autorCargo || '',
            importante: n.importante || n.esImportante
          })));
        }
      } catch (error) {
        console.error('Error al cargar notas:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarNotas();
  }, [isOpen, auditoriaId, onLoadNotas]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nota.trim()) {
      toast.error('La nota no puede estar vacía');
      return;
    }
    onGuardar(nota);
    setNota('');
    // Recargar notas después de guardar
    if (onLoadNotas) {
      onLoadNotas(auditoriaId).then(notasBackend => {
        if (Array.isArray(notasBackend)) {
          setNotas(notasBackend.map(n => ({
            id: n.id,
            contenido: n.contenido,
            categoria: n.categoria || 'General',
            fecha: n.fecha || n.createdAt,
            hora: n.hora,
            autorNombre: n.autorNombre || 'Usuario',
            autorCargo: n.autorCargo || '',
            importante: n.importante || n.esImportante
          })));
        }
      });
    }
  };

  const formatearFecha = (fecha: string, hora?: string) => {
    if (!fecha) return '';
    try {
      const date = new Date(fecha);
      const dia = date.getDate().toString().padStart(2, '0');
      const mes = (date.getMonth() + 1).toString().padStart(2, '0');
      const año = date.getFullYear();
      return hora ? `${dia}/${mes}/${año} ${hora}` : `${dia}/${mes}/${año}`;
    } catch {
      return fecha;
    }
  };

  const headerIcon = <MessageSquare className="w-5 h-5 text-[#003DA5]" />;

  const footerActions = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onClose}
        className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-base font-medium"
      >
        Cerrar
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
      title="Notas de Auditoría"
      subtitle="Registre y consulte observaciones sobre la auditoría"
      size="lg"
      headerIcon={headerIcon}
      footerActions={footerActions}
    >
      <div className="space-y-4">
        {/* Listado de notas existentes */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#003DA5]"></div>
            <span className="ml-2 text-gray-600">Cargando notas...</span>
          </div>
        ) : notas.length > 0 ? (
          <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Notas registradas ({notas.length})
            </h4>
            {notas.map((n, index) => (
              <motion.div
                key={n.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 rounded-lg border-2 ${
                  n.importante 
                    ? 'border-amber-300 bg-amber-50' 
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[#E0EDFF] text-[#003DA5]">
                      {n.categoria}
                    </span>
                    {n.importante && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
                        ⭐ Importante
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatearFecha(n.fecha, n.hora)}
                  </span>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.contenido}</p>
                {n.autorNombre && (
                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#003DA5] flex items-center justify-center">
                      <span className="text-[10px] text-white font-bold">
                        {n.autorNombre.split(' ').map(p => p[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-600">
                      {n.autorNombre} {n.autorCargo && `• ${n.autorCargo}`}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay notas registradas</p>
          </div>
        )}

        {/* Separador */}
        <div className="border-t-2 border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Agregar nueva nota
          </h4>
          
          {/* Editor de nota */}
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5] transition-all text-base resize-none"
            placeholder="Escriba su nota aquí..."
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
// 5. MODAL FINALIZAR AUDITORÍA - WORLD CLASS
// ═════════════════════════════════════════════════════════════════════════

interface ModalFinalizarAuditoriaProps {
  isOpen: boolean;
  onClose: () => void;
  auditoriaId: string;
  auditoriaTitulo: string;
  onFinalizar: (archivo: File, comentarios: string) => Promise<void>;
}

export function ModalFinalizarAuditoria({ 
  isOpen, 
  onClose, 
  auditoriaId, 
  auditoriaTitulo, 
  onFinalizar 
}: ModalFinalizarAuditoriaProps) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [comentarios, setComentarios] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamaño (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('El archivo no debe superar 10 MB');
        setArchivo(null);
        return;
      }
      // Validar tipo
      const tiposPermitidos = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      if (!tiposPermitidos.includes(file.type)) {
        setError('Solo se permiten archivos PDF, Word o Excel');
        setArchivo(null);
        return;
      }
      setError('');
      setArchivo(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar archivo obligatorio
    if (!archivo) {
      setError('Debe cargar el documento de cierre obligatorio');
      return;
    }

    setCargando(true);
    try {
      await onFinalizar(archivo, comentarios);
      toast.success('Auditoría Finalizada', {
        description: 'El documento de cierre ha sido adjuntado correctamente'
      });
      onClose();
      // Limpiar estado
      setArchivo(null);
      setComentarios('');
      setError('');
    } catch (err) {
      toast.error('Error al finalizar', {
        description: 'No se pudo procesar el documento de cierre'
      });
    } finally {
      setCargando(false);
    }
  };

  const headerIcon = <Check className="w-5 h-5 text-[#003DA5]" />;

  const footerActions = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onClose}
        disabled={cargando}
        className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-base font-medium disabled:opacity-50"
      >
        Cancelar
      </button>
      <button
        type="submit"
        onClick={handleSubmit}
        disabled={!archivo || cargando}
        className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-lg transition-all text-base font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Check className="w-4 h-4" />
        {cargando ? 'Finalizando...' : 'Finalizar Auditoría'}
      </button>
    </div>
  );

  return (
    <ModalBaseWorldClass
      isOpen={isOpen}
      onClose={onClose}
      title="Finalizar Auditoría"
      subtitle={`Adjuntar documento de cierre para: ${auditoriaTitulo}`}
      size="md"
      headerIcon={headerIcon}
      footerActions={footerActions}
    >
      <div className="space-y-4">
        {/* Alerta informativa */}
        <div className="p-4 bg-blue-50 border-l-4 border-blue-600 rounded-r-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-blue-900 mb-1">Documento de Cierre Obligatorio</p>
              <p className="text-blue-700">
                Debe adjuntar la matriz o formato de cierre de auditoría. Este documento quedará 
                vinculado permanentemente al expediente.
              </p>
            </div>
          </div>
        </div>

        {/* Carga de archivo - Estilo mejorado */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-900">
            Documento de Cierre (*Obligatorio)
          </label>
          
          {/* Input oculto */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleArchivoChange}
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            className="hidden"
            disabled={cargando}
          />
          
          {/* Área de selección clickeable */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              if (fileInputRef.current && !cargando) {
                fileInputRef.current.click();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (fileInputRef.current && !cargando) {
                  fileInputRef.current.click();
                }
              }
            }}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
              archivo
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
            } ${cargando ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {archivo ? (
              <div className="space-y-2">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <FileText className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">{archivo.name}</p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(archivo.size)}
                </p>
                {!cargando && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setArchivo(null);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Cambiar archivo
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-700 font-medium">
                  Haz clic para seleccionar o arrastra el archivo aquí
                </p>
                <p className="text-xs text-gray-500">
                  PDF, Word, Excel (Máx. 10 MB)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Error de validación */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Comentarios opcionales */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-900">
            Comentarios de Cierre (Opcional)
          </label>
          <textarea
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            rows={4}
            disabled={cargando}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5] transition-all text-base resize-none disabled:opacity-50"
            placeholder="Observaciones finales, conclusiones o comentarios adicionales sobre el cierre de la auditoría..."
          />
          <p className="text-xs text-gray-500">
            {comentarios.length} caracteres
          </p>
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
  Finalizar: ModalFinalizarAuditoria,
};
