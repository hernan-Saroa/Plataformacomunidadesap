/**
 * MODAL AGREGAR HALLAZGO RÁPIDO
 * Modal simplificado para agregar hallazgos durante la fase de ejecución de una auditoría
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, Save, Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';

interface ModalAgregarHallazgoRapidoProps {
  isOpen: boolean;
  onClose: () => void;
  auditoriaId: string;
  codigoAuditoria: string;
  onHallazgoCreado?: () => void;
}

interface HallazgoFormData {
  titulo: string;
  descripcion: string;
  categoria: 'critico' | 'controversia' | 'borrador';
  area: string;
  criterioIncumplido: string;
  causa: string;
  efecto: string;
  recomendaciones: string;
}

const CATEGORIAS = [
  { value: 'borrador', label: 'Borrador', color: 'gray' },
  { value: 'controversia', label: 'En Controversia', color: 'yellow' },
  { value: 'critico', label: 'Crítico', color: 'red' },
];

const AREAS = [
  'Gestión Administrativa',
  'Gestión Financiera',
  'Gestión Tecnológica',
  'Gestión Académica',
  'Gestión Humana',
  'Gestión Jurídica',
  'Gestión Documental',
  'Infraestructura',
  'Otra',
];

export function ModalAgregarHallazgoRapido({
  isOpen,
  onClose,
  auditoriaId,
  codigoAuditoria,
  onHallazgoCreado,
}: ModalAgregarHallazgoRapidoProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<HallazgoFormData>({
    titulo: '',
    descripcion: '',
    categoria: 'borrador',
    area: '',
    criterioIncumplido: '',
    causa: '',
    efecto: '',
    recomendaciones: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones básicas
    if (!formData.titulo.trim()) {
      toast.error('El título es requerido');
      return;
    }
    if (!formData.descripcion.trim()) {
      toast.error('La descripción es requerida');
      return;
    }
    if (!formData.area) {
      toast.error('El área es requerida');
      return;
    }

    setLoading(true);

    try {
      const { hallazgosApi } = await import('./services/api');

      // Crear objeto completo del hallazgo
      const descripcionCompleta = `${formData.descripcion}\n\nCAUSA:\n${formData.causa}\n\nEFECTO:\n${formData.efecto}`;

      const hallazgoData = {
        titulo: formData.titulo,
        descripcion: descripcionCompleta,
        categoria: formData.categoria,
        estado: 'borrador',
        area: formData.area,
        auditoria: codigoAuditoria,
        auditoriaId: auditoriaId,
        criterioIncumplido: formData.criterioIncumplido,
        observacionesControversia: `CAUSA: ${formData.causa}\n\nEFECTO: ${formData.efecto}`,
        recomendaciones: formData.recomendaciones ? [formData.recomendaciones] : [],
        fechaDeteccion: new Date().toISOString().split('T')[0],
        evidencias: [],
        normativaRelacionada: [],
      };

      const response = await hallazgosApi.create(hallazgoData);

      if (response.success) {
        toast.success('Hallazgo registrado exitosamente', {
          description: `Código: ${response.data.codigo || 'Generado'}`,
        });
        
        // Limpiar formulario
        setFormData({
          titulo: '',
          descripcion: '',
          categoria: 'borrador',
          area: '',
          criterioIncumplido: '',
          causa: '',
          efecto: '',
          recomendaciones: '',
        });

        // Callback
        if (onHallazgoCreado) {
          onHallazgoCreado();
        }

        onClose();
      } else {
        throw new Error(response.message || 'Error al crear el hallazgo');
      }
    } catch (error: any) {
      console.error('Error al crear hallazgo:', error);
      toast.error('Error al registrar hallazgo', {
        description: error.message || 'Ocurrió un error inesperado',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof HallazgoFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-amber-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Registrar Hallazgo</h2>
                <p className="text-xs text-gray-600">Auditoría: {codigoAuditoria}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="px-6 py-4 space-y-4">
              {/* Título */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título del Hallazgo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => handleChange('titulo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Ej: Incumplimiento en procedimiento de..."
                  required
                />
              </div>

              {/* Categoría y Área */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => handleChange('categoria', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  >
                    {CATEGORIAS.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Área Afectada <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.area}
                    onChange={(e) => handleChange('area', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {AREAS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => handleChange('descripcion', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                  placeholder="Describe detalladamente el hallazgo encontrado..."
                  required
                />
              </div>

              {/* Criterio Incumplido */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Criterio o Norma Incumplida
                </label>
                <input
                  type="text"
                  value={formData.criterioIncumplido}
                  onChange={(e) => handleChange('criterioIncumplido', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Ej: NTC ISO 9001:2015 - Cláusula 8.5.1"
                />
              </div>

              {/* Causa y Efecto */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Causa Raíz
                  </label>
                  <textarea
                    value={formData.causa}
                    onChange={(e) => handleChange('causa', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                    placeholder="¿Qué originó el hallazgo?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Efecto o Impacto
                  </label>
                  <textarea
                    value={formData.efecto}
                    onChange={(e) => handleChange('efecto', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                    placeholder="¿Cuál es el impacto del hallazgo?"
                  />
                </div>
              </div>

              {/* Recomendaciones */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recomendaciones
                </label>
                <textarea
                  value={formData.recomendaciones}
                  onChange={(e) => handleChange('recomendaciones', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                  placeholder="Sugerencias para corregir el hallazgo..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Registrar Hallazgo
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
