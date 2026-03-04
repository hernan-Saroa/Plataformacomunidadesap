/**
 * MODAL: REMITIR POR COMPETENCIA
 * Permite remitir una noticia disciplinaria a otra área/entidad
 * Genera un nuevo número RC (Remisión por Competencia)
 * Usa las entidades de remisión configuradas en la base de datos
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Send, AlertCircle, Info, Loader2, Mail } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { entidadesRemisionService, EntidadRemision } from '../../../services/api/entidadesRemisionService';
import { toast } from 'sonner';

interface ModalRemitirCompetenciaProps {
  noticia: {
    id: string;
    numeroRadicado: string;
    disciplinable: {
      nombre: string;
    }[];
  };
  onClose: () => void;
  onConfirm: (data: { 
    areaDestino: string; 
    justificacion: string; 
    numeroRC: string;
    entidadId: string;
    emailDestinatario: string;
  }) => void;
}

export function ModalRemitirCompetencia({ noticia, onClose, onConfirm }: ModalRemitirCompetenciaProps) {
  const [entidades, setEntidades] = useState<EntidadRemision[]>([]);
  const [loadingEntidades, setLoadingEntidades] = useState(true);
  const [entidadSeleccionada, setEntidadSeleccionada] = useState<EntidadRemision | null>(null);
  const [areaDestino, setAreaDestino] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar entidades de remisión desde el backend
  useEffect(() => {
    const cargarEntidades = async () => {
      try {
        setLoadingEntidades(true);
        const entidadesData = await entidadesRemisionService.getActivas();
        setEntidades(entidadesData);
        
        // Si hay entidades disponibles, seleccionar la primera por defecto
        if (entidadesData.length > 0) {
          setEntidadSeleccionada(entidadesData[0]);
          setAreaDestino(entidadesData[0].nombre);
        }
      } catch (error) {
        console.error('Error al cargar entidades de remisión:', error);
        toast.error('Error al cargar las entidades de remisión. Usando datos locales.');
        // Fallback: datos quemados en caso de error
        setEntidades([]);
      } finally {
        setLoadingEntidades(false);
      }
    };

    cargarEntidades();
  }, []);

  const handleEntidadChange = (entidadId: string) => {
    const entidad = entidades.find(e => e.id === entidadId);
    if (entidad) {
      setEntidadSeleccionada(entidad);
      setAreaDestino(entidad.nombre);
    }
  };

  const handleRecargarEntidades = async () => {
    try {
      setLoadingEntidades(true);
      const entidadesData = await entidadesRemisionService.getActivas();
      setEntidades(entidadesData);
      
      if (entidadesData.length > 0) {
        setEntidadSeleccionada(entidadesData[0]);
        setAreaDestino(entidadesData[0].nombre);
      }
    } catch (error) {
      console.error('Error al recargar entidades:', error);
      toast.error('Error al recargar las entidades de remisión');
    } finally {
      setLoadingEntidades(false);
    }
  };

  const handleSubmit = () => {
    if (!areaDestino || !justificacion.trim() || !entidadSeleccionada) {
      return;
    }

    setIsSubmitting(true);

    // Generar número RC
    const year = new Date().getFullYear();
    const numeroSecuencial = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const numeroRC = `RC-${year}-${numeroSecuencial}`;

    setTimeout(() => {
      onConfirm({
        areaDestino,
        justificacion: justificacion.trim(),
        numeroRC,
        entidadId: entidadSeleccionada.id,
        emailDestinatario: entidadSeleccionada.correo
      });
      setIsSubmitting(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[111] flex items-start justify-center pt-16 sm:pt-20 p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Send className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Remitir por Competencia
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {/* Información de la Noticia */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-purple-900 mb-1">
                  {noticia.numeroRadicado}
                </p>
                <p className="text-sm text-purple-700">
                  {noticia.disciplinable[0]?.nombre || 'Sin nombre'}
                </p>
              </div>
            </div>
          </div>

          {/* Explicación */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-blue-900 mb-1">
                  Remisión por Competencia
                </p>
                <p className="text-sm text-blue-700 leading-relaxed">
                  Esta noticia no es competencia del área de Control Interno Disciplinario. Se generará
                  un nuevo número <strong>RC (Remisión por Competencia)</strong> y se remitirá al área correspondiente.
                  Se enviará un correo electrónico con la información de la noticia a la entidad destino.
                </p>
              </div>
            </div>
          </div>

          {/* Formulario */}
          <div className="space-y-4">
            {/* Área de Destino - Ahora con entidades de la BD */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Área/Entidad de Destino <span className="text-red-500">*</span>
              </label>
              
              {loadingEntidades ? (
                <div className="flex items-center gap-2 text-gray-500 p-4 border border-gray-200 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Cargando entidades...</span>
                </div>
              ) : entidades.length > 0 ? (
                <div className="space-y-3">
                  <select
                    value={entidadSeleccionada?.id || ''}
                    onChange={(e) => handleEntidadChange(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {entidades.map(entidad => (
                      <option key={entidad.id} value={entidad.id}>
                        {entidad.nombre}
                      </option>
                    ))}
                  </select>
                  
                  {/* Mostrar correo de la entidad seleccionada */}
                  {entidadSeleccionada && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">Correo destino:</span>
                      <span className="text-purple-700 font-semibold">{entidadSeleccionada.correo}</span>
                    </div>
                  )}
                </div>
              ) : (
                // Fallback si no hay entidades en la BD - mostrar SOLO mensaje de error sin opciones alternativas
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900 mb-1">
                        No hay entidades de remisión configuradas
                      </p>
                      <p className="text-sm text-red-700 mb-3">
                        Para remitir por competencia, primero debe configurar las entidades de remisión en la sección de configuración del sistema.
                      </p>
                      <button
                        type="button"
                        onClick={handleRecargarEntidades}
                        className="text-sm text-blue-600 hover:text-blue-700 underline"
                      >
                        Reintentar carga de entidades
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Justificación */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Justificación de la Remisión <span className="text-red-500">*</span>
              </label>
              <textarea
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                rows={4}
                disabled={entidades.length === 0}
                placeholder={entidades.length === 0 ? "Configure entidades de remisión primero..." : "Explica por qué esta noticia no corresponde a Control Interno Disciplinario y debe ser remitida..."}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                {justificacion.length} caracteres
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 rounded-b-xl">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!areaDestino || !justificacion.trim() || isSubmitting || entidades.length === 0}
            className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Remitiendo...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Remitir
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
