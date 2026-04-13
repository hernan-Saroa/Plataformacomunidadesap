import React, { useState, useMemo } from 'react';
import { ResponsiveModal } from '@esap-mfe/shared-ui/ResponsiveModal';
import { ModalButtonPrimary, ModalButtonCancel, ModalButtonGroup } from '@esap-mfe/shared-ui/ModalButtons';
import { Search, FileText, Scale, AlertCircle, CheckCircle2, Link2 } from 'lucide-react';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { toast } from 'sonner';
import { disciplinaryService } from '../../../services/api/disciplinary.service';

/**
 * ═══════════════════════════════════════════════════════════════
 * MODAL ASOCIAR NOTICIA A PROCESO EXISTENTE
 * ═══════════════════════════════════════════════════════════════
 * 
 * Permite asociar una noticia a un proceso disciplinario existente.
 * Usado cuando una nueva noticia está relacionada con un proceso ya iniciado.
 * 
 * @features
 * - Búsqueda de procesos existentes
 * - Visualización de datos del proceso
 * - Campo de justificación obligatoria
 * - Validación antes de asociar
 * - Responsive Mobile First
 */

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

interface Persona {
  nombre: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA' | 'NIT';
  numeroIdentificacion: string;
}

interface Noticia {
  id: string;
  numero: string;
  fechaRecepcion: string;
  origen: string;
  denunciante: Persona;
  denunciado: Persona;
  hechos: string;
  estado: 'pendiente' | 'en-valoracion' | 'asignada' | 'archivada';
  prioridad: 'alta' | 'media' | 'baja';
  diasPendientes: number;
  tipo: 'noticia';
}

interface Proceso {
  id: string;
  numeroProceso: string;
  noticiaOrigen: string;
  denunciante: Persona;
  denunciado: Persona;
  etapaActual: 'Recepción' | 'Valoración' | 'Indagación' | 'Investigación' | 'Juzgamiento' | 'Fallo';
  estadoActual: string;
  profesionalAsignado: Persona;
  semaforo: 'verde' | 'amarillo' | 'rojo';
  diasRestantes: number;
  fechaCreacion: string;
  tipo: 'proceso';
  hechos?: string;
}

interface ModalAsociarNoticiaProcesoProps {
  isOpen: boolean;
  onClose: () => void;
  noticia: Noticia | null;
  procesosDisponibles: Proceso[];
  onAsociar: (noticiaId: string, procesoId: string, justificacion: string) => void;
}

// ════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════

export function ModalAsociarNoticiaProceso({
  isOpen,
  onClose,
  noticia,
  procesosDisponibles,
  onAsociar
}: ModalAsociarNoticiaProcesoProps) {
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<string | null>(null);
  const [justificacion, setJustificacion] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ════════════════════════════════════════════════════════════════
  // FILTRADO DE PROCESOS
  // ════════════════════════════════════════════════════════════════

  const procesosFiltrados = useMemo(() => {
    if (!searchTerm) return procesosDisponibles;

    const term = searchTerm.toLowerCase();
    return procesosDisponibles.filter(proceso => 
      proceso.numeroProceso.toLowerCase().includes(term) ||
      proceso.denunciado?.nombre?.toLowerCase().includes(term) ||
      proceso.denunciado?.numeroIdentificacion?.includes(term) ||
      proceso.profesionalAsignado?.nombre?.toLowerCase().includes(term) ||
      proceso.etapaActual?.toLowerCase().includes(term)
    );
  }, [procesosDisponibles, searchTerm]);

  // ════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════

  const handleReset = () => {
    setProcesoSeleccionado(null);
    setJustificacion('');
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

    if (justificacion.trim().length < 20) {
      toast.error('La justificación debe tener al menos 20 caracteres');
      return;
    }

    if (!noticia) return;

    setIsSubmitting(true);

    try {
      // Llamar al servicio API
      await disciplinaryService.asociarNoticiaAProceso(noticia.id, procesoSeleccionado, justificacion.trim());

      // Success feedback
      const proceso = procesosDisponibles.find(p => p.id === procesoSeleccionado);
      toast.success(
        `Noticia ${noticia.numero} asociada al proceso ${proceso?.numeroProceso}`,
        {
          description: 'La asociación se ha registrado correctamente',
          duration: 4000,
        }
      );

      // Cerrar modal
      handleClose();
    } catch (error) {
      toast.error('Error al asociar la noticia');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════

  if (!noticia) return null;

  const procesoSeleccionadoData = procesoSeleccionado
    ? procesosDisponibles.find(p => p.id === procesoSeleccionado)
    : null;

  const semaforoColors = {
    verde: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
    amarillo: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700' },
    rojo: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' },
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Asociar Noticia a Proceso Existente"
      size="lg"
      zIndex={200}
      disableBackdropClick={isSubmitting}
      disableEscapeKey={isSubmitting}
      footer={
        <ModalButtonGroup>
          <ModalButtonCancel onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </ModalButtonCancel>
          <ModalButtonPrimary 
            onClick={handleAsociar} 
            isLoading={isSubmitting}
            disabled={!procesoSeleccionado || !justificacion.trim()}
          >
            <Link2 className="w-4 h-4 mr-2" />
            Asociar Noticia
          </ModalButtonPrimary>
        </ModalButtonGroup>
      }
    >
      <div className="space-y-6">
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* INFORMACIÓN DE LA NOTICIA */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-gray-900 mb-1">
                Noticia: {noticia.numero}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
                <div>
                  <span className="font-semibold">Denunciado:</span> {noticia.denunciado.nombre}
                </div>
                <div>
                  <span className="font-semibold">Origen:</span> {noticia.origen}
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                {noticia.hechos}
              </p>
            </div>
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* BUSCADOR DE PROCESOS */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Buscar Proceso Existente
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
            Seleccionar Proceso ({procesosFiltrados.length})
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
                          <Badge 
                            className={`
                              text-xs px-2 py-0.5 font-semibold
                              ${semaforoColor.bg} ${semaforoColor.border} ${semaforoColor.text}
                            `}
                          >
                            {proceso.semaforo === 'verde' && '🟢'}
                            {proceso.semaforo === 'amarillo' && '🟡'}
                            {proceso.semaforo === 'rojo' && '🔴'}
                            {proceso.diasRestantes} días
                          </Badge>
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
                              {proceso.denunciado?.nombre || 'No disponible'} ({proceso.denunciado?.tipoIdentificacion || 'N/A'} {proceso.denunciado?.numeroIdentificacion || 'N/A'})
                            </span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-gray-500">Profesional:</span>{' '}
                            <span className="font-semibold text-gray-900">{proceso.profesionalAsignado?.nombre || 'No disponible'}</span>
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
            placeholder="Explique por qué esta noticia debe asociarse al proceso seleccionado. Mínimo 20 caracteres."
            className="
              w-full px-3 py-2.5
              border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              text-sm
              resize-none
              min-h-[100px]
            "
            maxLength={500}
          />

          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-500">
              {justificacion.length < 20 && justificacion.length > 0 && (
                <span className="text-amber-600">
                  Faltan {20 - justificacion.length} caracteres
                </span>
              )}
              {justificacion.length >= 20 && (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Justificación válida
                </span>
              )}
            </p>
            <p className="text-xs text-gray-400">
              {justificacion.length}/500
            </p>
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* RESUMEN DE ASOCIACIÓN */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

        {procesoSeleccionadoData && justificacion.length >= 20 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-green-700" />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-green-900 mb-2">
                  Resumen de Asociación
                </h4>
                <div className="text-xs text-green-800 space-y-1">
                  <p>
                    <strong>Noticia:</strong> {noticia.numero} → <strong>Proceso:</strong> {procesoSeleccionadoData.numeroProceso}
                  </p>
                  <p>
                    <strong>Denunciado:</strong> {noticia.denunciado.nombre} ({noticia.denunciado.tipoIdentificacion} {noticia.denunciado.numeroIdentificacion})
                  </p>
                  <p className="pt-1 border-t border-green-200">
                    Esta asociación quedará registrada en el historial del proceso. La noticia dejará de mostrarse de forma independiente y no se puede deshacer.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
}

export default ModalAsociarNoticiaProceso;
