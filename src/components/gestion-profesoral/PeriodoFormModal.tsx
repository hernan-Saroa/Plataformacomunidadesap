import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Save,
  Calendar,
  AlertCircle,
  Clock,
  FileText
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { toast } from 'sonner@2.0.3';

interface PeriodoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
  periodo?: any;
  modo?: 'crear' | 'editar';
}

export function PeriodoFormModal({
  isOpen,
  onClose,
  onSuccess,
  periodo,
  modo = 'crear'
}: PeriodoFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'Académico' as 'Académico' | 'Vacaciones' | 'Intersemestral',
    fecha_inicio: '',
    fecha_fin: '',
    descripcion: '',
    estado: 'Planificado' as 'Planificado' | 'Activo' | 'Finalizado'
  });

  useEffect(() => {
    if (modo === 'editar' && periodo) {
      setFormData({
        nombre: periodo.nombre || '',
        tipo: periodo.tipo || 'Académico',
        fecha_inicio: periodo.fecha_inicio || '',
        fecha_fin: periodo.fecha_fin || '',
        descripcion: periodo.descripcion || '',
        estado: periodo.estado || 'Planificado'
      });
    } else {
      // Reset al crear nuevo
      setFormData({
        nombre: '',
        tipo: 'Académico',
        fecha_inicio: '',
        fecha_fin: '',
        descripcion: '',
        estado: 'Planificado'
      });
    }
  }, [periodo, modo, isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calcularDuracion = (): number => {
    if (!formData.fecha_inicio || !formData.fecha_fin) return 0;
    const inicio = new Date(formData.fecha_inicio);
    const fin = new Date(formData.fecha_fin);
    const diffTime = fin.getTime() - inicio.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const validateForm = (): boolean => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre del periodo es obligatorio');
      return false;
    }

    if (!formData.fecha_inicio || !formData.fecha_fin) {
      toast.error('Las fechas de inicio y fin son obligatorias');
      return false;
    }

    const inicio = new Date(formData.fecha_inicio);
    const fin = new Date(formData.fecha_fin);

    if (inicio >= fin) {
      toast.error('La fecha de fin debe ser posterior a la fecha de inicio');
      return false;
    }

    const duracion = calcularDuracion();
    if (duracion < 7) {
      toast.error('El periodo debe tener al menos 7 días de duración');
      return false;
    }

    if (formData.tipo === 'Académico' && duracion < 30) {
      toast.error('Un periodo académico debe tener al menos 30 días');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const periodoData = {
        ...formData,
        id: periodo?.id || `periodo-${Date.now()}`,
        eventos: periodo?.eventos || [],
        created_at: periodo?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        duracion_dias: calcularDuracion()
      };

      onSuccess(periodoData);
      toast.success(
        modo === 'crear'
          ? '¡Periodo creado exitosamente!'
          : '¡Periodo actualizado exitosamente!'
      );
      onClose();
    } catch (error) {
      toast.error('Hubo un error al guardar el periodo');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const duracion = calcularDuracion();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {modo === 'crear' ? 'Nuevo Periodo Académico' : 'Editar Periodo'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {modo === 'crear'
                ? 'Completa la información del periodo'
                : 'Modifica la información del periodo'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Nombre */}
          <div>
            <Label htmlFor="nombre" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
              Nombre del Periodo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nombre"
              type="text"
              placeholder="Ej: 2025-I, Vacaciones Mitad de Año, etc."
              value={formData.nombre}
              onChange={(e) => handleInputChange('nombre', e.target.value)}
              className="w-full"
            />
          </div>

          {/* Tipo y Estado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tipo" className="text-sm font-medium text-gray-700 mb-1.5">
                Tipo de Periodo <span className="text-red-500">*</span>
              </Label>
              <select
                id="tipo"
                value={formData.tipo}
                onChange={(e) => handleInputChange('tipo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="Académico">Académico</option>
                <option value="Vacaciones">Vacaciones</option>
                <option value="Intersemestral">Intersemestral</option>
              </select>
            </div>

            <div>
              <Label htmlFor="estado" className="text-sm font-medium text-gray-700 mb-1.5">
                Estado
              </Label>
              <select
                id="estado"
                value={formData.estado}
                onChange={(e) => handleInputChange('estado', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="Planificado">Planificado</option>
                <option value="Activo">Activo</option>
                <option value="Finalizado">Finalizado</option>
              </select>
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fecha_inicio" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Fecha de Inicio <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fecha_inicio"
                type="date"
                value={formData.fecha_inicio}
                onChange={(e) => handleInputChange('fecha_inicio', e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <Label htmlFor="fecha_fin" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Fecha de Fin <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fecha_fin"
                type="date"
                value={formData.fecha_fin}
                onChange={(e) => handleInputChange('fecha_fin', e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Duración calculada */}
          {duracion > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Duración: {duracion} días
                  </p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Aproximadamente {Math.ceil(duracion / 7)} semanas
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Descripción */}
          <div>
            <Label htmlFor="descripcion" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
              <FileText className="w-4 h-4" />
              Descripción (opcional)
            </Label>
            <textarea
              id="descripcion"
              rows={3}
              placeholder="Descripción o notas sobre el periodo..."
              value={formData.descripcion}
              onChange={(e) => handleInputChange('descripcion', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
            />
          </div>

          {/* Info sobre tipo de periodo */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Requisitos según tipo:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>
                    <strong>Académico:</strong> Mínimo 30 días, requiere eventos de inscripciones, clases y evaluaciones
                  </li>
                  <li>
                    <strong>Vacaciones:</strong> Mínimo 7 días, no requiere eventos obligatorios
                  </li>
                  <li>
                    <strong>Intersemestral:</strong> Mínimo 7 días, puede incluir cursos cortos
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#1e5da8] hover:bg-[#1a4d8f]"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {modo === 'crear' ? 'Crear Periodo' : 'Guardar Cambios'}
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
