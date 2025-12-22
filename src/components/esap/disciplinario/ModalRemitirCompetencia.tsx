/**
 * MODAL: REMITIR POR COMPETENCIA
 * Permite remitir una noticia disciplinaria a otra área/entidad
 * Genera un nuevo número RC (Remisión por Competencia)
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Send, AlertCircle, Info } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';

interface ModalRemitirCompetenciaProps {
  noticia: {
    id: string;
    numeroRadicado: string;
    disciplinable: {
      nombre: string;
    }[];
  };
  onClose: () => void;
  onConfirm: (data: { areaDestino: string; justificacion: string; numeroRC: string }) => void;
}

const AREAS_DESTINO = [
  { value: '', label: 'Seleccionar área...' },
  { value: 'procuraduria', label: 'Procuraduría General de la Nación' },
  { value: 'contraloria', label: 'Contraloría General de la República' },
  { value: 'fiscalia', label: 'Fiscalía General de la Nación' },
  { value: 'defensoria', label: 'Defensoría del Pueblo' },
  { value: 'personeria', label: 'Personería Municipal' },
  { value: 'otra-entidad', label: 'Otra Entidad Competente' }
];

export function ModalRemitirCompetencia({ noticia, onClose, onConfirm }: ModalRemitirCompetenciaProps) {
  const [areaDestino, setAreaDestino] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!areaDestino || !justificacion.trim()) {
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
        numeroRC
      });
      setIsSubmitting(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
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
                </p>
              </div>
            </div>
          </div>

          {/* Formulario */}
          <div className="space-y-4">
            {/* Área de Destino */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Área/Entidad de Destino <span className="text-red-500">*</span>
              </label>
              <select
                value={areaDestino}
                onChange={(e) => setAreaDestino(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {AREAS_DESTINO.map(area => (
                  <option key={area.value} value={area.value}>
                    {area.label}
                  </option>
                ))}
              </select>
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
                placeholder="Explica por qué esta noticia no corresponde a Control Interno Disciplinario y debe ser remitida..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
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
            disabled={!areaDestino || !justificacion.trim() || isSubmitting}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Remitiendo...' : 'Remitir'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
