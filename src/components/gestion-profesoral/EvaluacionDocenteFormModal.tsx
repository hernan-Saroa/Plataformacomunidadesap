import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Save,
  User,
  Calendar,
  Users,
  FileText,
  AlertCircle,
  CheckSquare
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { toast } from 'sonner@2.0.3';
import { docentesMock } from '../../mock-data/docentes-mock';

interface EvaluacionDocenteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
  evaluacion?: any;
  modo?: 'crear' | 'editar';
}

interface CriterioEvaluacion {
  id: string;
  nombre: string;
  descripcion: string;
  peso: number;
  activo: boolean;
}

export function EvaluacionDocenteFormModal({
  isOpen,
  onClose,
  onSuccess,
  evaluacion,
  modo = 'crear'
}: EvaluacionDocenteFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    docente_id: '',
    docente_nombre: '',
    periodo: '2025-I',
    tipo: 'Estudiantes' as 'Estudiantes' | 'Pares' | 'Auto-evaluación' | 'Administrativa',
    fecha_inicio: '',
    fecha_fin: '',
    participantes_esperados: 0,
    descripcion: '',
    criterios_seleccionados: [] as string[]
  });

  // Criterios de evaluación predefinidos
  const criteriosDisponibles: CriterioEvaluacion[] = [
    {
      id: 'c1',
      nombre: 'Dominio del Contenido',
      descripcion: 'Conocimiento y dominio de la materia',
      peso: 20,
      activo: true
    },
    {
      id: 'c2',
      nombre: 'Metodología de Enseñanza',
      descripcion: 'Técnicas y estrategias pedagógicas',
      peso: 15,
      activo: true
    },
    {
      id: 'c3',
      nombre: 'Comunicación',
      descripcion: 'Claridad y efectividad en la comunicación',
      peso: 15,
      activo: true
    },
    {
      id: 'c4',
      nombre: 'Evaluación Justa',
      descripcion: 'Criterios claros y evaluación equitativa',
      peso: 10,
      activo: true
    },
    {
      id: 'c5',
      nombre: 'Puntualidad',
      descripcion: 'Cumplimiento de horarios',
      peso: 10,
      activo: true
    },
    {
      id: 'c6',
      nombre: 'Disponibilidad',
      descripcion: 'Atención y disponibilidad para estudiantes',
      peso: 10,
      activo: true
    },
    {
      id: 'c7',
      nombre: 'Materiales Didácticos',
      descripcion: 'Calidad de recursos y materiales',
      peso: 10,
      activo: true
    },
    {
      id: 'c8',
      nombre: 'Motivación',
      descripcion: 'Capacidad de motivar e inspirar',
      peso: 10,
      activo: true
    }
  ];

  useEffect(() => {
    if (modo === 'editar' && evaluacion) {
      setFormData({
        docente_id: evaluacion.docente_id || '',
        docente_nombre: evaluacion.docente_nombre || '',
        periodo: evaluacion.periodo || '2025-I',
        tipo: evaluacion.tipo || 'Estudiantes',
        fecha_inicio: evaluacion.fecha_inicio || '',
        fecha_fin: evaluacion.fecha_fin || '',
        participantes_esperados: evaluacion.participantes_esperados || 0,
        descripcion: evaluacion.descripcion || '',
        criterios_seleccionados: evaluacion.criterios_seleccionados || criteriosDisponibles.map(c => c.id)
      });
    } else {
      setFormData({
        docente_id: '',
        docente_nombre: '',
        periodo: '2025-I',
        tipo: 'Estudiantes',
        fecha_inicio: '',
        fecha_fin: '',
        participantes_esperados: 0,
        descripcion: '',
        criterios_seleccionados: criteriosDisponibles.map(c => c.id)
      });
    }
  }, [evaluacion, modo, isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDocenteChange = (docenteId: string) => {
    const docente = docentesMock.find(d => d.id === docenteId);
    if (docente) {
      setFormData(prev => ({
        ...prev,
        docente_id: docenteId,
        docente_nombre: `${docente.nombres} ${docente.apellidos}`
      }));
    }
  };

  const handleTipoChange = (tipo: typeof formData.tipo) => {
    let participantesDefault = 0;
    
    switch (tipo) {
      case 'Estudiantes':
        participantesDefault = 50;
        break;
      case 'Pares':
        participantesDefault = 5;
        break;
      case 'Auto-evaluación':
        participantesDefault = 1;
        break;
      case 'Administrativa':
        participantesDefault = 3;
        break;
    }

    setFormData(prev => ({
      ...prev,
      tipo,
      participantes_esperados: participantesDefault
    }));
  };

  const toggleCriterio = (criterioId: string) => {
    setFormData(prev => ({
      ...prev,
      criterios_seleccionados: prev.criterios_seleccionados.includes(criterioId)
        ? prev.criterios_seleccionados.filter(id => id !== criterioId)
        : [...prev.criterios_seleccionados, criterioId]
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.docente_id) {
      toast.error('Debes seleccionar un docente');
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

    if (formData.participantes_esperados < 1) {
      toast.error('Debe haber al menos 1 participante esperado');
      return false;
    }

    if (formData.criterios_seleccionados.length < 3) {
      toast.error('Selecciona al menos 3 criterios de evaluación');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const evaluacionData = {
        ...formData,
        id: evaluacion?.id || `eval-${Date.now()}`,
        estado: evaluacion?.estado || 'Pendiente',
        participantes_completados: evaluacion?.participantes_completados || 0,
        aspectos_evaluados: formData.criterios_seleccionados.length,
        created_at: evaluacion?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      onSuccess(evaluacionData);
      toast.success(
        modo === 'crear'
          ? '¡Evaluación creada exitosamente!'
          : '¡Evaluación actualizada exitosamente!'
      );
      onClose();
    } catch (error) {
      toast.error('Hubo un error al guardar la evaluación');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (nombre: string) => {
    const parts = nombre.split(' ');
    return parts.length >= 2
      ? `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
      : nombre.slice(0, 2).toUpperCase();
  };

  const getTipoInfo = (tipo: typeof formData.tipo) => {
    switch (tipo) {
      case 'Estudiantes':
        return {
          descripcion: 'Los estudiantes evalúan el desempeño del docente',
          participantes: 'Estudiantes inscritos en las asignaturas',
          icon: '👥'
        };
      case 'Pares':
        return {
          descripcion: 'Evaluación por parte de otros docentes',
          participantes: 'Docentes del mismo departamento',
          icon: '👔'
        };
      case 'Auto-evaluación':
        return {
          descripcion: 'El docente evalúa su propio desempeño',
          participantes: 'El mismo docente',
          icon: '📝'
        };
      case 'Administrativa':
        return {
          descripcion: 'Evaluación por parte de coordinadores/directivos',
          participantes: 'Personal administrativo',
          icon: '📊'
        };
    }
  };

  if (!isOpen) return null;

  const docentesActivos = docentesMock.filter(d => d.estado === 'Activo');
  const tipoInfo = getTipoInfo(formData.tipo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {modo === 'crear' ? 'Nueva Evaluación Docente' : 'Editar Evaluación'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {modo === 'crear'
                ? 'Configura una nueva evaluación de desempeño'
                : 'Modifica la configuración de la evaluación'}
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
        <div className="p-6 space-y-6 max-h-[calc(100vh-16rem)] overflow-y-auto">
          {/* Docente */}
          <div>
            <Label htmlFor="docente" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
              <User className="w-4 h-4" />
              Docente a Evaluar <span className="text-red-500">*</span>
            </Label>
            <select
              id="docente"
              value={formData.docente_id}
              onChange={(e) => handleDocenteChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              disabled={modo === 'editar'}
            >
              <option value="">Selecciona un docente...</option>
              {docentesActivos.map((docente) => (
                <option key={docente.id} value={docente.id}>
                  {docente.nombres} {docente.apellidos} - {docente.territorial}
                </option>
              ))}
            </select>
            {formData.docente_id && formData.docente_nombre && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-[#1e5da8] text-white">
                    {getInitials(formData.docente_nombre)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-900">{formData.docente_nombre}</p>
                  <p className="text-sm text-gray-600">Periodo: {formData.periodo}</p>
                </div>
              </div>
            )}
          </div>

          {/* Tipo y Periodo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tipo" className="text-sm font-medium text-gray-700 mb-1.5">
                Tipo de Evaluación <span className="text-red-500">*</span>
              </Label>
              <select
                id="tipo"
                value={formData.tipo}
                onChange={(e) => handleTipoChange(e.target.value as typeof formData.tipo)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="Estudiantes">👥 Estudiantes</option>
                <option value="Pares">👔 Pares (Docentes)</option>
                <option value="Auto-evaluación">📝 Auto-evaluación</option>
                <option value="Administrativa">📊 Administrativa</option>
              </select>
            </div>

            <div>
              <Label htmlFor="periodo" className="text-sm font-medium text-gray-700 mb-1.5">
                Periodo Académico
              </Label>
              <select
                id="periodo"
                value={formData.periodo}
                onChange={(e) => handleInputChange('periodo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="2025-I">2025-I</option>
                <option value="2025-II">2025-II</option>
                <option value="2026-I">2026-I</option>
              </select>
            </div>
          </div>

          {/* Info sobre tipo */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-3xl">{tipoInfo.icon}</div>
              <div className="flex-1">
                <p className="font-medium text-purple-900 mb-1">{formData.tipo}</p>
                <p className="text-sm text-purple-800 mb-2">{tipoInfo.descripcion}</p>
                <p className="text-xs text-purple-700">
                  <strong>Evaluadores:</strong> {tipoInfo.participantes}
                </p>
              </div>
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

          {/* Participantes esperados */}
          <div>
            <Label htmlFor="participantes" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
              <Users className="w-4 h-4" />
              Participantes Esperados <span className="text-red-500">*</span>
            </Label>
            <Input
              id="participantes"
              type="number"
              min="1"
              value={formData.participantes_esperados}
              onChange={(e) => handleInputChange('participantes_esperados', parseInt(e.target.value) || 0)}
              className="w-full"
            />
            <p className="text-xs text-gray-600 mt-1">
              Número estimado de personas que completarán la evaluación
            </p>
          </div>

          {/* Criterios de Evaluación */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
              <CheckSquare className="w-4 h-4" />
              Criterios de Evaluación <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {criteriosDisponibles.map((criterio) => {
                const isSelected = formData.criterios_seleccionados.includes(criterio.id);
                return (
                  <div
                    key={criterio.id}
                    onClick={() => toggleCriterio(criterio.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#1e5da8] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-[#1e5da8] border-[#1e5da8]'
                            : 'border-gray-300'
                        }`}
                      >
                        {isSelected && (
                          <CheckSquare className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-gray-900 text-sm">{criterio.nombre}</p>
                          <Badge variant="secondary" className="text-xs">{criterio.peso}%</Badge>
                        </div>
                        <p className="text-xs text-gray-600">{criterio.descripcion}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-gray-600 mt-3">
              {formData.criterios_seleccionados.length} criterio{formData.criterios_seleccionados.length !== 1 ? 's' : ''} seleccionado{formData.criterios_seleccionados.length !== 1 ? 's' : ''}
              {' '}(mínimo 3)
            </p>
          </div>

          {/* Descripción */}
          <div>
            <Label htmlFor="descripcion" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
              <FileText className="w-4 h-4" />
              Descripción (opcional)
            </Label>
            <textarea
              id="descripcion"
              rows={3}
              placeholder="Notas adicionales sobre la evaluación..."
              value={formData.descripcion}
              onChange={(e) => handleInputChange('descripcion', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
            />
          </div>

          {/* Info */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Importante:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>La evaluación se activará automáticamente en la fecha de inicio</li>
                  <li>Los participantes recibirán notificaciones por correo</li>
                  <li>Los resultados se consolidarán al finalizar el periodo</li>
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
                {modo === 'crear' ? 'Crear Evaluación' : 'Guardar Cambios'}
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
