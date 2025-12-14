import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Save,
  Calendar,
  FileText,
  AlertCircle,
  Flag
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { toast } from 'sonner@2.0.3';

interface EventoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
  periodo: any;
  evento?: any;
  modo?: 'crear' | 'editar';
}

export function EventoFormModal({
  isOpen,
  onClose,
  onSuccess,
  periodo,
  evento,
  modo = 'crear'
}: EventoFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    fecha: '',
    tipo: 'Otro' as 'Inscripciones' | 'Clases' | 'Evaluaciones' | 'PTAs' | 'Convocatorias' | 'Otro',
    prioridad: 'media' as 'alta' | 'media' | 'baja'
  });

  useEffect(() => {
    if (modo === 'editar' && evento) {
      setFormData({
        titulo: evento.titulo || '',
        descripcion: evento.descripcion || '',
        fecha: evento.fecha || '',
        tipo: evento.tipo || 'Otro',
        prioridad: evento.prioridad || 'media'
      });
    } else {
      setFormData({
        titulo: '',
        descripcion: '',
        fecha: '',
        tipo: 'Otro',
        prioridad: 'media'
      });
    }
  }, [evento, modo, isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.titulo.trim()) {
      toast.error('El título del evento es obligatorio');
      return false;
    }

    if (!formData.fecha) {
      toast.error('La fecha del evento es obligatoria');
      return false;
    }

    // Validar que la fecha esté dentro del periodo
    const fechaEvento = new Date(formData.fecha);
    const inicioPeriodo = new Date(periodo.fecha_inicio);
    const finPeriodo = new Date(periodo.fecha_fin);

    if (fechaEvento < inicioPeriodo || fechaEvento > finPeriodo) {
      toast.error('La fecha del evento debe estar dentro del periodo seleccionado');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 600));

      const eventoData = {
        ...formData,
        id: evento?.id || `evento-${Date.now()}`,
        periodo_id: periodo.id,
        created_at: evento?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      onSuccess(eventoData);
      toast.success(
        modo === 'crear'
          ? '¡Evento creado exitosamente!'
          : '¡Evento actualizado exitosamente!'
      );
      onClose();
    } catch (error) {
      toast.error('Hubo un error al guardar el evento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'Inscripciones':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Clases':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Evaluaciones':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'PTAs':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Convocatorias':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPrioridadIcon = (prioridad: string) => {
    if (prioridad === 'alta') return '🔴';
    if (prioridad === 'media') return '🟡';
    return '🟢';
  };

  if (!isOpen || !periodo) return null;

  const formatDateRange = (inicio: string, fin: string) => {
    const inicioDate = new Date(inicio);
    const finDate = new Date(fin);
    return `${inicioDate.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })} - ${finDate.toLocaleDateString('es-CO', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd]">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {modo === 'crear' ? 'Nuevo Evento' : 'Editar Evento'}
            </h2>
            <p className="text-sm text-blue-100 mt-1">
              Periodo: {periodo.nombre} ({formatDateRange(periodo.fecha_inicio, periodo.fecha_fin)})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Título */}
          <div>
            <Label htmlFor="titulo" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
              Título del Evento <span className="text-red-500">*</span>
            </Label>
            <Input
              id="titulo"
              type="text"
              placeholder="Ej: Inicio de Inscripciones, Evaluación Parcial, etc."
              value={formData.titulo}
              onChange={(e) => handleInputChange('titulo', e.target.value)}
              className="w-full"
            />
          </div>

          {/* Tipo y Prioridad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tipo" className="text-sm font-medium text-gray-700 mb-1.5">
                Tipo de Evento <span className="text-red-500">*</span>
              </Label>
              <select
                id="tipo"
                value={formData.tipo}
                onChange={(e) => handleInputChange('tipo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="Inscripciones">Inscripciones</option>
                <option value="Clases">Clases</option>
                <option value="Evaluaciones">Evaluaciones</option>
                <option value="PTAs">PTAs</option>
                <option value="Convocatorias">Convocatorias</option>
                <option value="Otro">Otro</option>
              </select>
              <div className="mt-2">
                <Badge className={getTipoColor(formData.tipo)}>
                  {formData.tipo}
                </Badge>
              </div>
            </div>

            <div>
              <Label htmlFor="prioridad" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                <Flag className="w-4 h-4" />
                Prioridad
              </Label>
              <select
                id="prioridad"
                value={formData.prioridad}
                onChange={(e) => handleInputChange('prioridad', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="alta">🔴 Alta</option>
                <option value="media">🟡 Media</option>
                <option value="baja">🟢 Baja</option>
              </select>
              <p className="text-xs text-gray-600 mt-2">
                {getPrioridadIcon(formData.prioridad)} Prioridad {formData.prioridad}
              </p>
            </div>
          </div>

          {/* Fecha */}
          <div>
            <Label htmlFor="fecha" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Fecha del Evento <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fecha"
              type="date"
              value={formData.fecha}
              onChange={(e) => handleInputChange('fecha', e.target.value)}
              min={periodo.fecha_inicio}
              max={periodo.fecha_fin}
              className="w-full"
            />
            <p className="text-xs text-gray-600 mt-1">
              La fecha debe estar entre {new Date(periodo.fecha_inicio).toLocaleDateString('es-CO')} y {new Date(periodo.fecha_fin).toLocaleDateString('es-CO')}
            </p>
          </div>

          {/* Descripción */}
          <div>
            <Label htmlFor="descripcion" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
              <FileText className="w-4 h-4" />
              Descripción
            </Label>
            <textarea
              id="descripcion"
              rows={4}
              placeholder="Descripción detallada del evento, instrucciones, etc."
              value={formData.descripcion}
              onChange={(e) => handleInputChange('descripcion', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
            />
          </div>

          {/* Info de ayuda */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Tipos de eventos comunes:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><strong>Inscripciones:</strong> Apertura/cierre de matrículas</li>
                  <li><strong>Clases:</strong> Inicio/fin de clases, recesos</li>
                  <li><strong>Evaluaciones:</strong> Parciales, finales, recuperaciones</li>
                  <li><strong>PTAs:</strong> Fechas límite de entrega</li>
                  <li><strong>Convocatorias:</strong> Apertura/cierre de procesos</li>
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
                {modo === 'crear' ? 'Crear Evento' : 'Guardar Cambios'}
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
