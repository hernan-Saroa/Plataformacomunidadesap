import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Save,
  User,
  BookOpen,
  Clock,
  MapPin,
  Users,
  AlertCircle,
  Building2,
  Calendar
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { toast } from 'sonner@2.0.3';
import { docentesMock } from '../../mock-data/docentes-mock';

interface AsignacionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
  asignacion?: any;
  modo?: 'crear' | 'editar';
}

export function AsignacionFormModal({
  isOpen,
  onClose,
  onSuccess,
  asignacion,
  modo = 'crear'
}: AsignacionFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    docente_id: '',
    docente_nombre: '',
    asignatura: '',
    codigo_asignatura: '',
    programa: '',
    horario: '',
    dia_semana: '',
    hora_inicio: '',
    hora_fin: '',
    aula: '',
    edificio: '',
    cupos: 30,
    tipo: 'Teoría' as 'Teoría' | 'Práctica' | 'Laboratorio',
    territorial: '',
    periodo: '2025-I',
    estado: 'Pendiente' as 'Asignado' | 'Pendiente' | 'Conflicto'
  });

  useEffect(() => {
    if (modo === 'editar' && asignacion) {
      // Parsear horario existente si existe
      const horarioParts = asignacion.horario?.split(' ') || [];
      const diasHorario = horarioParts[0] || '';
      const horasHorario = horarioParts[1] || '';
      const [hora_inicio, hora_fin] = horasHorario.split('-');

      setFormData({
        docente_id: asignacion.docente_id || '',
        docente_nombre: asignacion.docente_nombre || '',
        asignatura: asignacion.asignatura || '',
        codigo_asignatura: asignacion.codigo_asignatura || '',
        programa: asignacion.programa || '',
        horario: asignacion.horario || '',
        dia_semana: diasHorario || '',
        hora_inicio: hora_inicio || '',
        hora_fin: hora_fin || '',
        aula: asignacion.aula || '',
        edificio: asignacion.edificio || '',
        cupos: asignacion.cupos || 30,
        tipo: asignacion.tipo || 'Teoría',
        territorial: asignacion.territorial || '',
        periodo: asignacion.periodo || '2025-I',
        estado: asignacion.estado || 'Pendiente'
      });
    } else {
      setFormData({
        docente_id: '',
        docente_nombre: '',
        asignatura: '',
        codigo_asignatura: '',
        programa: '',
        horario: '',
        dia_semana: '',
        hora_inicio: '',
        hora_fin: '',
        aula: '',
        edificio: '',
        cupos: 30,
        tipo: 'Teoría',
        territorial: '',
        periodo: '2025-I',
        estado: 'Pendiente'
      });
    }
  }, [asignacion, modo, isOpen]);

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
        docente_nombre: `${docente.nombres} ${docente.apellidos}`,
        territorial: docente.territorial,
        estado: 'Asignado'
      }));
    }
  };

  const construirHorario = (): string => {
    if (!formData.dia_semana || !formData.hora_inicio || !formData.hora_fin) {
      return '';
    }
    return `${formData.dia_semana} ${formData.hora_inicio}-${formData.hora_fin}`;
  };

  const validateForm = (): boolean => {
    if (!formData.asignatura.trim()) {
      toast.error('El nombre de la asignatura es obligatorio');
      return false;
    }

    if (!formData.codigo_asignatura.trim()) {
      toast.error('El código de la asignatura es obligatorio');
      return false;
    }

    if (!formData.programa.trim()) {
      toast.error('El programa es obligatorio');
      return false;
    }

    if (!formData.dia_semana || !formData.hora_inicio || !formData.hora_fin) {
      toast.error('El horario completo es obligatorio');
      return false;
    }

    if (!formData.aula.trim()) {
      toast.error('El aula es obligatoria');
      return false;
    }

    if (formData.cupos < 1) {
      toast.error('Los cupos deben ser al menos 1');
      return false;
    }

    // Validar horas
    if (formData.hora_inicio >= formData.hora_fin) {
      toast.error('La hora de fin debe ser posterior a la hora de inicio');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const horarioCompleto = construirHorario();

      const asignacionData = {
        ...formData,
        id: asignacion?.id || `asignacion-${Date.now()}`,
        horario: horarioCompleto,
        inscritos: asignacion?.inscritos || 0,
        created_at: asignacion?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      onSuccess(asignacionData);
      toast.success(
        modo === 'crear'
          ? '¡Asignación creada exitosamente!'
          : '¡Asignación actualizada exitosamente!'
      );
      onClose();
    } catch (error) {
      toast.error('Hubo un error al guardar la asignación');
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

  if (!isOpen) return null;

  const docentesActivos = docentesMock.filter(d => d.estado === 'Activo');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {modo === 'crear' ? 'Nueva Asignación Docente' : 'Editar Asignación'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {modo === 'crear'
                ? 'Asigna un docente a una asignatura'
                : 'Modifica la asignación'}
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
          {/* Asignatura y Código */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="asignatura" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                Nombre de la Asignatura <span className="text-red-500">*</span>
              </Label>
              <Input
                id="asignatura"
                type="text"
                placeholder="Ej: Derecho Administrativo I"
                value={formData.asignatura}
                onChange={(e) => handleInputChange('asignatura', e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <Label htmlFor="codigo_asignatura" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                Código <span className="text-red-500">*</span>
              </Label>
              <Input
                id="codigo_asignatura"
                type="text"
                placeholder="Ej: DER-301"
                value={formData.codigo_asignatura}
                onChange={(e) => handleInputChange('codigo_asignatura', e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Programa y Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="programa" className="text-sm font-medium text-gray-700 mb-1.5">
                Programa Académico <span className="text-red-500">*</span>
              </Label>
              <Input
                id="programa"
                type="text"
                placeholder="Ej: Derecho Público"
                value={formData.programa}
                onChange={(e) => handleInputChange('programa', e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <Label htmlFor="tipo" className="text-sm font-medium text-gray-700 mb-1.5">
                Tipo de Curso
              </Label>
              <select
                id="tipo"
                value={formData.tipo}
                onChange={(e) => handleInputChange('tipo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="Teoría">Teoría</option>
                <option value="Práctica">Práctica</option>
                <option value="Laboratorio">Laboratorio</option>
              </select>
            </div>
          </div>

          {/* Docente */}
          <div>
            <Label htmlFor="docente" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
              <User className="w-4 h-4" />
              Docente Asignado
            </Label>
            <select
              id="docente"
              value={formData.docente_id}
              onChange={(e) => handleDocenteChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Sin asignar</option>
              {docentesActivos.map((docente) => (
                <option key={docente.id} value={docente.id}>
                  {docente.nombres} {docente.apellidos} - {docente.territorial}
                </option>
              ))}
            </select>
            {formData.docente_id && formData.docente_nombre && (
              <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-[#1e5da8] text-white text-sm">
                    {getInitials(formData.docente_nombre)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-gray-900">{formData.docente_nombre}</p>
                  <p className="text-xs text-gray-600">{formData.territorial}</p>
                </div>
              </div>
            )}
          </div>

          {/* Horario */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Horario <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="dia_semana" className="text-xs text-gray-600 mb-1">
                  Día(s)
                </Label>
                <select
                  id="dia_semana"
                  value={formData.dia_semana}
                  onChange={(e) => handleInputChange('dia_semana', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Selecciona...</option>
                  <option value="Lun">Lunes</option>
                  <option value="Mar">Martes</option>
                  <option value="Mie">Miércoles</option>
                  <option value="Jue">Jueves</option>
                  <option value="Vie">Viernes</option>
                  <option value="Sab">Sábado</option>
                  <option value="Lun-Mie">Lun-Mie</option>
                  <option value="Mar-Jue">Mar-Jue</option>
                  <option value="Lun-Mie-Vie">Lun-Mie-Vie</option>
                </select>
              </div>

              <div>
                <Label htmlFor="hora_inicio" className="text-xs text-gray-600 mb-1">
                  Hora Inicio
                </Label>
                <Input
                  id="hora_inicio"
                  type="time"
                  value={formData.hora_inicio}
                  onChange={(e) => handleInputChange('hora_inicio', e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="hora_fin" className="text-xs text-gray-600 mb-1">
                  Hora Fin
                </Label>
                <Input
                  id="hora_fin"
                  type="time"
                  value={formData.hora_fin}
                  onChange={(e) => handleInputChange('hora_fin', e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            {construirHorario() && (
              <div className="mt-2">
                <Badge className="bg-blue-100 text-blue-700">
                  {construirHorario()}
                </Badge>
              </div>
            )}
          </div>

          {/* Aula y Edificio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="aula" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                Aula <span className="text-red-500">*</span>
              </Label>
              <Input
                id="aula"
                type="text"
                placeholder="Ej: A-301"
                value={formData.aula}
                onChange={(e) => handleInputChange('aula', e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <Label htmlFor="edificio" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                Edificio
              </Label>
              <Input
                id="edificio"
                type="text"
                placeholder="Ej: Edificio Principal"
                value={formData.edificio}
                onChange={(e) => handleInputChange('edificio', e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Cupos y Periodo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cupos" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                <Users className="w-4 h-4" />
                Cupos Disponibles <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cupos"
                type="number"
                min="1"
                max="100"
                value={formData.cupos}
                onChange={(e) => handleInputChange('cupos', parseInt(e.target.value) || 0)}
                className="w-full"
              />
            </div>

            <div>
              <Label htmlFor="periodo" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Periodo
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

          {/* Info */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Importante:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>El sistema detectará automáticamente conflictos de horario</li>
                  <li>Verifica la disponibilidad del docente antes de asignar</li>
                  <li>Los cupos pueden ajustarse posteriormente según demanda</li>
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
                {modo === 'crear' ? 'Crear Asignación' : 'Guardar Cambios'}
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
