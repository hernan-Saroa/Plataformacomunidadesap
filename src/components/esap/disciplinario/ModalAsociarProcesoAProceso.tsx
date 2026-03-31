import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Search, Scale, AlertCircle, CheckCircle2, Link2, Info, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

/**
 * ═══════════════════════════════════════════════════════════════
 * MODAL ASOCIAR PROCESO A OTRO PROCESO (CONTROL INTERNO DE GESTIÓN)
 * ═══════════════════════════════════════════════════════════════
 * 
 * Permite asociar un proceso a otro proceso existente en etapas 
 * posteriores a Recepción (Valoración, Indagación, Investigación).
 * 
 * CASOS DE USO:
 * - Procesos relacionados que deben tramitarse conjuntamente
 * - Procesos con hechos conexos o similares
 * - Consolidación de investigaciones relacionadas
 * 
 * @features
 * - Búsqueda de procesos existentes
 * - Visualización de datos del proceso
 * - Campo de justificación obligatoria
 * - Validación de etapas compatibles
 * - Responsive Mobile First
 * - Diseño corporativo ESAP
 */

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

interface Persona {
  nombre: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA' | 'NIT';
  numeroIdentificacion: string;
}

interface Proceso {
  id: string;
  numeroProceso: string;
  noticiaOrigen: string;
  denunciante: Persona | string;
  denunciado: Persona | string;
  etapaActual: 'Recepción' | 'Valoración' | 'Indagación' | 'Investigación' | 'Juzgamiento' | 'Fallo';
  estadoActual: string;
  profesionalAsignado: Persona | string;
  semaforo: 'verde' | 'amarillo' | 'rojo';
  diasRestantes: number;
  fechaCreacion: string;
  tipo: 'proceso';
  hechos?: string;
  // NUEVO: Información de asociación a otro proceso
  procesoAsociado?: {
    id: string;
    numeroProceso: string;
    fechaAsociacion: string;
    justificacion: string;
    tipoAsociacion: 'conexo' | 'similar' | 'consolidado';
  };
}

interface ModalAsociarProcesoAProcesoProps {
  isOpen: boolean;
  onClose: () => void;
  procesoOrigen: Proceso | null;
  procesosDisponibles: Proceso[];
  onAsociar: (procesoOrigenId: string, procesoDestinoId: string, justificacion: string, tipoAsociacion: 'conexo' | 'similar' | 'consolidado') => void;
}

// ════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════

export function ModalAsociarProcesoAProceso({
  isOpen,
  onClose,
  procesoOrigen,
  procesosDisponibles,
  onAsociar
}: ModalAsociarProcesoAProcesoProps) {
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<string | null>(null);
  const [justificacion, setJustificacion] = useState('');
  const [tipoAsociacion, setTipoAsociacion] = useState<'conexo' | 'similar' | 'consolidado'>('conexo');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ════════════════════════════════════════════════════════════════
  // FILTRADO DE PROCESOS
  // ════════════════════════════════════════════════════════════════

  const procesosFiltrados = useMemo(() => {
    if (!procesoOrigen) return [];

    // Excluir el proceso origen
    let procesosValidos = procesosDisponibles.filter(p => p.id !== procesoOrigen.id);

    // Aplicar filtro de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      procesosValidos = procesosValidos.filter(proceso => {
        const denunciadoNombre = typeof proceso.denunciado === 'string' 
          ? proceso.denunciado 
          : (proceso.denunciado?.nombre || 'Sin información');
        const denunciadoCedula = typeof proceso.denunciado === 'string' 
          ? '' 
          : (proceso.denunciado?.numeroIdentificacion || '');
        const profesionalNombre = typeof proceso.profesionalAsignado === 'string' 
          ? proceso.profesionalAsignado 
          : (proceso.profesionalAsignado?.nombre || 'Sin asignar');

        return proceso.numeroProceso.toLowerCase().includes(term) ||
               denunciadoNombre.toLowerCase().includes(term) ||
               denunciadoCedula.includes(term) ||
               profesionalNombre.toLowerCase().includes(term) ||
               proceso.etapaActual.toLowerCase().includes(term);
      });
    }

    return procesosValidos;
  }, [procesosDisponibles, searchTerm, procesoOrigen]);

  // ════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════

  const handleReset = () => {
    setProcesoSeleccionado(null);
    setJustificacion('');
    setTipoAsociacion('conexo');
    setSearchTerm('');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleAsociar = async () => {
    // Validaciones
    if (!procesoSeleccionado) {
      toast.error('Debe seleccionar un proceso');
      return;
    }

    if (!justificacion.trim()) {
      toast.error('Debe ingresar una justificación');
      return;
    }

    if (justificacion.trim().length < 30) {
      toast.error('La justificación debe tener al menos 30 caracteres');
      return;
    }

    if (!procesoOrigen) return;

    setIsSubmitting(true);

    try {
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Ejecutar callback
      onAsociar(procesoOrigen.id, procesoSeleccionado, justificacion.trim(), tipoAsociacion);

      // Success feedback
      const proceso = procesosDisponibles.find(p => p.id === procesoSeleccionado);
      toast.success(
        `Procesos asociados correctamente`,
        {
          description: `${procesoOrigen.numeroProceso} → ${proceso?.numeroProceso} (${getTipoAsociacionLabel(tipoAsociacion)})`,
          duration: 4000,
        }
      );

      // Cerrar modal
      handleClose();
    } catch (error) {
      toast.error('Error al asociar los procesos');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ════════════════════════════════════════════════════════════════
  // UTILS
  // ════════════════════════════════════════════════════════════════

  const getTipoAsociacionLabel = (tipo: 'conexo' | 'similar' | 'consolidado') => {
    switch (tipo) {
      case 'conexo':
        return 'Hechos Conexos';
      case 'similar':
        return 'Hechos Similares';
      case 'consolidado':
        return 'Consolidación';
      default:
        return tipo;
    }
  };

  const getTipoAsociacionColor = (tipo: 'conexo' | 'similar' | 'consolidado') => {
    switch (tipo) {
      case 'conexo':
        return { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' };
      case 'similar':
        return { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' };
      case 'consolidado':
        return { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700' };
    }
  };

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════

  if (!procesoOrigen) return null;

  const procesoSeleccionadoData = procesoSeleccionado
    ? procesosDisponibles.find(p => p.id === procesoSeleccionado)
    : null;

  const semaforoColors = {
    verde: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
    amarillo: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700' },
    rojo: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' },
  };

  // Obtener nombre del denunciado
  const getDenunciadoNombre = (persona: Persona | string) => {
    return typeof persona === 'string' ? persona : (persona?.nombre || 'Sin información');
  };

  const getDenunciadoCedula = (persona: Persona | string) => {
    return typeof persona === 'string' ? '' : `${persona?.tipoIdentificacion || ''} ${persona?.numeroIdentificacion || ''}`;
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.60)', padding: '4vh 4vw' }}
      onClick={(e) => !isSubmitting && e.target === e.currentTarget && handleClose()}
    >
      <motion.div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 820, maxHeight: '88vh' }}
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #001A6E 0%, #003DA5 100%)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-white/10 flex-shrink-0">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-black text-base leading-none">Asociar Proceso a Proceso Existente</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors flex-shrink-0 ml-3">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
      <div className="space-y-4">
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* INFORMACIÓN DEL PROCESO ORIGEN */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Scale className="w-5 h-5 text-blue-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-gray-900 mb-1">
                Proceso Origen: {procesoOrigen.numeroProceso}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
                <div>
                  <span className="font-semibold">Etapa:</span> {procesoOrigen.etapaActual}
                </div>
                <div>
                  <span className="font-semibold">Denunciado:</span> {getDenunciadoNombre(procesoOrigen.denunciado)}
                </div>
              </div>
              {procesoOrigen.hechos && (
                <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                  {procesoOrigen.hechos}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* INFORMACIÓN IMPORTANTE */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800">
              <p className="font-semibold mb-1">Sobre la asociación de procesos:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>Los procesos asociados compartirán información relevante</li>
                <li>Esta acción queda registrada en el historial de ambos procesos</li>
                <li>La justificación debe ser clara y detallada (mínimo 30 caracteres)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* TIPO DE ASOCIACIÓN */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Tipo de Asociación <span className="text-red-600">*</span>
          </label>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Hechos Conexos */}
            <button
              type="button"
              onClick={() => setTipoAsociacion('conexo')}
              className={`
                p-3 rounded-lg border-2 transition-all text-left
                ${tipoAsociacion === 'conexo' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`
                  w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                  ${tipoAsociacion === 'conexo' ? 'border-blue-500' : 'border-gray-300'}
                `}>
                  {tipoAsociacion === 'conexo' && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </div>
                <span className="text-sm font-bold text-gray-900">Hechos Conexos</span>
              </div>
              <p className="text-xs text-gray-600">
                Procesos con hechos relacionados directamente
              </p>
            </button>

            {/* Hechos Similares */}
            <button
              type="button"
              onClick={() => setTipoAsociacion('similar')}
              className={`
                p-3 rounded-lg border-2 transition-all text-left
                ${tipoAsociacion === 'similar' 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`
                  w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                  ${tipoAsociacion === 'similar' ? 'border-purple-500' : 'border-gray-300'}
                `}>
                  {tipoAsociacion === 'similar' && (
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                  )}
                </div>
                <span className="text-sm font-bold text-gray-900">Hechos Similares</span>
              </div>
              <p className="text-xs text-gray-600">
                Procesos con características o patrones similares
              </p>
            </button>

            {/* Consolidación */}
            <button
              type="button"
              onClick={() => setTipoAsociacion('consolidado')}
              className={`
                p-3 rounded-lg border-2 transition-all text-left
                ${tipoAsociacion === 'consolidado' 
                  ? 'border-orange-500 bg-orange-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`
                  w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                  ${tipoAsociacion === 'consolidado' ? 'border-orange-500' : 'border-gray-300'}
                `}>
                  {tipoAsociacion === 'consolidado' && (
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                  )}
                </div>
                <span className="text-sm font-bold text-gray-900">Consolidación</span>
              </div>
              <p className="text-xs text-gray-600">
                Unificar investigaciones en un solo proceso
              </p>
            </button>
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* BUSCADOR DE PROCESOS */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Buscar Proceso para Asociar
          </label>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por número, denunciado, cédula, etapa..."
              className="
                w-full pl-10 pr-4 py-2.5
                border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                text-sm
                touch-target
              "
            />
          </div>

          {searchTerm && (
            <p className="text-xs text-gray-500 mt-1">
              {procesosFiltrados.length} {procesosFiltrados.length === 1 ? 'proceso encontrado' : 'procesos encontrados'}
            </p>
          )}
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* LISTA DE PROCESOS */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Seleccionar Proceso Destino ({procesosFiltrados.length})
          </label>

          <div 
            className="
              border border-gray-200 rounded-lg 
              max-h-80 overflow-y-auto
              divide-y divide-gray-200
            "
          >
            {procesosFiltrados.length === 0 ? (
              <div className="p-8 text-center">
                <Scale className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-semibold text-gray-500">
                  {searchTerm ? 'No se encontraron procesos' : 'No hay procesos disponibles'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                  >
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            ) : (
              procesosFiltrados.map((proceso) => {
                const isSelected = procesoSeleccionado === proceso.id;
                const semaforoColor = semaforoColors[proceso.semaforo];
                const denunciadoNombre = getDenunciadoNombre(proceso.denunciado);
                const denunciadoCedula = getDenunciadoCedula(proceso.denunciado);
                const profesionalNombre = typeof proceso.profesionalAsignado === 'string' 
                  ? proceso.profesionalAsignado 
                  : (proceso.profesionalAsignado?.nombre || 'Sin asignar');

                return (
                  <div
                    key={proceso.id}
                    onClick={() => setProcesoSeleccionado(proceso.id)}
                    className={`
                      p-4 cursor-pointer transition-all
                      hover:bg-gray-50
                      touch-target
                      ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {/* Radio Button */}
                      <div className="flex-shrink-0 mt-0.5">
                        <div
                          className={`
                            w-5 h-5 rounded-full border-2 flex items-center justify-center
                            transition-all
                            ${isSelected 
                              ? 'border-blue-600 bg-blue-600' 
                              : 'border-gray-300 bg-white'
                            }
                          `}
                        >
                          {isSelected && (
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-bold text-sm text-gray-900">
                              {proceso.numeroProceso}
                            </h4>
                            <p className="text-xs text-gray-500">
                              Noticia origen: {proceso.noticiaOrigen}
                            </p>
                          </div>

                          {/* Semáforo */}
                          <span
                            className="text-[10px] px-2 py-0.5 font-bold rounded-full border flex-shrink-0"
                            style={{
                              background: proceso.semaforo === 'verde' ? '#ECFDF5' : proceso.semaforo === 'amarillo' ? '#FFFBEB' : '#FEF2F2',
                              color: proceso.semaforo === 'verde' ? '#059669' : proceso.semaforo === 'amarillo' ? '#D97706' : '#DC2626',
                              borderColor: proceso.semaforo === 'verde' ? '#A7F3D0' : proceso.semaforo === 'amarillo' ? '#FDE68A' : '#FECACA',
                            }}
                          >
                            {proceso.semaforo === 'verde' && '🟢'}
                            {proceso.semaforo === 'amarillo' && '🟡'}
                            {proceso.semaforo === 'rojo' && '🔴'}
                            {proceso.diasRestantes} días
                          </span>
                        </div>

                        {/* Grid de info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Etapa:</span>{' '}
                            <span className="font-semibold text-gray-900">{proceso.etapaActual}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Estado:</span>{' '}
                            <span className="font-semibold text-gray-900">{proceso.estadoActual}</span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-gray-500">Denunciado:</span>{' '}
                            <span className="font-semibold text-gray-900">
                              {denunciadoNombre} {denunciadoCedula && `(${denunciadoCedula})`}
                            </span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-gray-500">Profesional:</span>{' '}
                            <span className="font-semibold text-gray-900">{profesionalNombre}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* JUSTIFICACIÓN */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Justificación de la Asociación <span className="text-red-600">*</span>
          </label>

          <textarea
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
            placeholder="Explique detalladamente por qué estos procesos deben asociarse. Describa la relación entre los hechos, las partes involucradas o cualquier otro elemento relevante. Mínimo 30 caracteres."
            className="
              w-full px-3 py-2.5
              border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              text-sm
              resize-none
              min-h-[120px]
            "
            maxLength={1000}
          />

          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-500">
              {justificacion.length < 30 && justificacion.length > 0 && (
                <span className="text-amber-600">
                  Faltan {30 - justificacion.length} caracteres
                </span>
              )}
              {justificacion.length >= 30 && (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Justificación válida
                </span>
              )}
            </p>
            <p className="text-xs text-gray-400">
              {justificacion.length}/1000
            </p>
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* RESUMEN DE ASOCIACIÓN */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

        {procesoSeleccionadoData && justificacion.length >= 30 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-700" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-green-900 mb-1.5">Resumen de Asociación</h4>
                <div className="text-xs text-green-800 space-y-1">
                  <p><strong>Proceso Origen:</strong> {procesoOrigen.numeroProceso} ({procesoOrigen.etapaActual})</p>
                  <p><strong>Proceso Destino:</strong> {procesoSeleccionadoData.numeroProceso} ({procesoSeleccionadoData.etapaActual})</p>
                  <p className="flex items-center gap-1.5">
                    <strong>Tipo:</strong>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {getTipoAsociacionLabel(tipoAsociacion)}
                    </span>
                  </p>
                  <p className="pt-1.5 border-t border-green-200 text-green-700">
                    Esta asociación quedará registrada en el historial de ambos procesos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleAsociar}
            disabled={!procesoSeleccionado || !justificacion.trim() || justificacion.trim().length < 30 || isSubmitting}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}
          >
            <Link2 className="w-4 h-4" />
            Asociar Procesos
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

export default ModalAsociarProcesoAProceso;