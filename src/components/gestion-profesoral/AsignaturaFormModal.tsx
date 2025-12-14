import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Save,
  BookOpen,
  User,
  Clock,
  MapPin,
  Users,
  Plus,
  Trash2,
  AlertCircle,
  Calendar,
  Building2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { toast } from 'sonner@2.0.3';
import { docentesMock } from '../../mock-data/docentes-mock';
import { territorialesMock } from '../../mock-data/territoriales-mock';

interface AsignaturaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
  asignatura?: any;
  modo?: 'crear' | 'editar';
}

interface Horario {
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  aula?: string;
  edificio?: string;
}

const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const edificios = ['A', 'B', 'C', 'D', 'Auditorio', 'Virtual', 'N/A'];

export function AsignaturaFormModal({
  isOpen,
  onClose,
  onSuccess,
  asignatura,
  modo = 'crear'
}: AsignaturaFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado del formulario
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    grupo: '',
    docente_id: '',
    docente_nombre: '',
    territorial: '',
    programa: '',
    nivel: 'Pregrado' as 'Pregrado' | 'Especialización' | 'Maestría' | 'Doctorado',
    creditos: 3,
    capacidad_maxima: 40,
    estudiantes_inscritos: 0,
    modalidad: 'Presencial' as 'Presencial' | 'Virtual' | 'Híbrida',
    horarios: [] as Horario[],
    periodo: '2025-I',
    estado: 'programada' as 'programada' | 'en_curso' | 'finalizada' | 'cancelada'
  });

  // Nuevo horario temporal
  const [nuevoHorario, setNuevoHorario] = useState<Horario>({
    dia: 'Lunes',
    hora_inicio: '08:00',
    hora_fin: '10:00',
    aula: '',
    edificio: 'A'
  });

  // Pre-llenar formulario en modo edición
  useEffect(() => {
    if (modo === 'editar' && asignatura) {
      setFormData({
        ...formData,
        ...asignatura
      });
    }
  }, [asignatura, modo]);

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
        territorial: docente.territorial
      }));
    }
  };

  const handleAgregarHorario = () => {
    if (!nuevoHorario.dia || !nuevoHorario.hora_inicio || !nuevoHorario.hora_fin) {
      toast.error('Por favor completa todos los campos del horario');
      return;
    }

    // Validar que hora_fin sea mayor que hora_inicio
    if (nuevoHorario.hora_inicio >= nuevoHorario.hora_fin) {
      toast.error('La hora de fin debe ser posterior a la hora de inicio');
      return;
    }

    // Validar que no se duplique el mismo día y hora
    const duplicado = formData.horarios.some(h =>
      h.dia === nuevoHorario.dia &&
      h.hora_inicio === nuevoHorario.hora_inicio &&
      h.hora_fin === nuevoHorario.hora_fin
    );

    if (duplicado) {
      toast.error('Ya existe un horario en este día y hora');
      return;
    }

    setFormData(prev => ({
      ...prev,
      horarios: [...prev.horarios, { ...nuevoHorario }]
    }));

    // Reset
    setNuevoHorario({
      dia: 'Lunes',
      hora_inicio: '08:00',
      hora_fin: '10:00',
      aula: '',
      edificio: 'A'
    });

    toast.success('Horario agregado');
  };

  const handleRemoverHorario = (index: number) => {
    setFormData(prev => ({
      ...prev,
      horarios: prev.horarios.filter((_, i) => i !== index)
    }));
    toast.success('Horario eliminado');
  };

  const validateForm = (): boolean => {
    // Validar campos obligatorios
    if (!formData.codigo.trim()) {
      toast.error('El código es obligatorio');
      return false;
    }

    if (!formData.nombre.trim()) {
      toast.error('El nombre de la asignatura es obligatorio');
      return false;
    }

    if (!formData.grupo.trim()) {
      toast.error('El grupo es obligatorio');
      return false;
    }

    if (!formData.docente_id) {
      toast.error('Debes seleccionar un docente');
      return false;
    }

    if (!formData.programa.trim()) {
      toast.error('El programa es obligatorio');
      return false;
    }

    if (formData.creditos < 1 || formData.creditos > 10) {
      toast.error('Los créditos deben estar entre 1 y 10');
      return false;
    }

    if (formData.capacidad_maxima < 1) {
      toast.error('La capacidad máxima debe ser mayor a 0');
      return false;
    }

    if (formData.estudiantes_inscritos > formData.capacidad_maxima) {
      toast.error('Los estudiantes inscritos no pueden superar la capacidad máxima');
      return false;
    }

    if (formData.horarios.length === 0) {
      toast.error('Debes agregar al menos un horario');
      return false;
    }

    // Para modalidad presencial o híbrida, validar que tengan aula
    const requiereAula = formData.modalidad === 'Presencial' || formData.modalidad === 'Híbrida';
    if (requiereAula) {
      const sinAula = formData.horarios.some(h => h.aula === 'Virtual' || !h.aula);
      if (sinAula && formData.modalidad === 'Presencial') {
        toast.error('Todas las sesiones presenciales deben tener aula asignada');
        return false;
      }
    }

    return true;
  };

  const detectarConflictos = (data: any) => {
    const conflictos: string[] = [];

    // Conflicto de capacidad
    if (data.estudiantes_inscritos > data.capacidad_maxima) {
      conflictos.push(`Aula sobrecargada: ${data.estudiantes_inscritos}/${data.capacidad_maxima} estudiantes`);
    }

    // Aquí podrían agregarse más validaciones de conflictos
    // Por ejemplo, verificar contra otras asignaturas del mismo docente

    return {
      tiene_conflictos: conflictos.length > 0,
      conflictos
    };
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const conflictosData = detectarConflictos(formData);

      const asignaturaData = {
        ...formData,
        id: asignatura?.id || `asig-${Date.now()}`,
        ...conflictosData,
        created_at: asignatura?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      onSuccess(asignaturaData);
      
      if (conflictosData.tiene_conflictos) {
        toast.warning('Asignatura guardada con conflictos detectados');
      } else {
        toast.success(
          modo === 'crear'
            ? '¡Asignatura creada exitosamente!'
            : '¡Asignatura actualizada exitosamente!'
        );
      }
      
      onClose();
    } catch (error) {
      toast.error('Hubo un error al guardar la asignatura');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {modo === 'crear' ? 'Nueva Asignatura' : 'Editar Asignatura'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {modo === 'crear'
                ? 'Completa la información para programar una nueva asignatura'
                : 'Modifica la información de la asignatura'}
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Información Básica */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Información Básica
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                  Código <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Ej: ADM-101"
                  value={formData.codigo}
                  onChange={(e) => handleInputChange('codigo', e.target.value.toUpperCase())}
                  className="w-full"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                  Grupo <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Ej: A, B, 01"
                  value={formData.grupo}
                  onChange={(e) => handleInputChange('grupo', e.target.value.toUpperCase())}
                  className="w-full"
                />
              </div>

              <div className="md:col-span-2">
                <Label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                  Nombre de la Asignatura <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Ej: Administración Pública I"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                  Programa <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Ej: Administración Pública"
                  value={formData.programa}
                  onChange={(e) => handleInputChange('programa', e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5">
                  Nivel Académico
                </Label>
                <select
                  value={formData.nivel}
                  onChange={(e) => handleInputChange('nivel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="Pregrado">Pregrado</option>
                  <option value="Especialización">Especialización</option>
                  <option value="Maestría">Maestría</option>
                  <option value="Doctorado">Doctorado</option>
                </select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5">
                  Créditos
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.creditos}
                  onChange={(e) => handleInputChange('creditos', parseInt(e.target.value) || 0)}
                  className="w-full"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5">
                  Modalidad
                </Label>
                <select
                  value={formData.modalidad}
                  onChange={(e) => handleInputChange('modalidad', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="Presencial">Presencial</option>
                  <option value="Virtual">Virtual</option>
                  <option value="Híbrida">Híbrida</option>
                </select>
              </div>
            </div>
          </div>

          {/* Docente y Ubicación */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Docente y Ubicación
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                  Docente <span className="text-red-500">*</span>
                </Label>
                <select
                  value={formData.docente_id}
                  onChange={(e) => handleDocenteChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Selecciona un docente</option>
                  {docentesMock.filter(d => d.estado === 'Activo').map((docente) => (
                    <option key={docente.id} value={docente.id}>
                      {docente.nombres} {docente.apellidos} - {docente.territorial}
                    </option>
                  ))}
                </select>
              </div>

              {formData.docente_id && (
                <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Territorial:</span> {formData.territorial}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Capacidad */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Capacidad
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5">
                  Capacidad Máxima
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.capacidad_maxima}
                  onChange={(e) => handleInputChange('capacidad_maxima', parseInt(e.target.value) || 0)}
                  className="w-full"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5">
                  Estudiantes Inscritos
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.estudiantes_inscritos}
                  onChange={(e) => handleInputChange('estudiantes_inscritos', parseInt(e.target.value) || 0)}
                  className="w-full"
                />
              </div>

              {formData.estudiantes_inscritos > formData.capacidad_maxima && (
                <div className="md:col-span-2 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">
                    ¡Alerta! La capacidad máxima está sobrepasada. Se generará un conflicto.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Horarios */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Horarios <span className="text-red-500 text-sm">*</span>
            </h3>

            {/* Formulario para nuevo horario */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Agregar Horario</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1">Día</Label>
                  <select
                    value={nuevoHorario.dia}
                    onChange={(e) => setNuevoHorario({ ...nuevoHorario, dia: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {diasSemana.map(dia => (
                      <option key={dia} value={dia}>{dia}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1">Hora Inicio</Label>
                  <Input
                    type="time"
                    value={nuevoHorario.hora_inicio}
                    onChange={(e) => setNuevoHorario({ ...nuevoHorario, hora_inicio: e.target.value })}
                    className="w-full"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1">Hora Fin</Label>
                  <Input
                    type="time"
                    value={nuevoHorario.hora_fin}
                    onChange={(e) => setNuevoHorario({ ...nuevoHorario, hora_fin: e.target.value })}
                    className="w-full"
                  />
                </div>

                {formData.modalidad !== 'Virtual' && (
                  <>
                    <div>
                      <Label className="text-xs font-medium text-gray-700 mb-1">Aula</Label>
                      <Input
                        type="text"
                        placeholder="Ej: 201, Auditorio"
                        value={nuevoHorario.aula}
                        onChange={(e) => setNuevoHorario({ ...nuevoHorario, aula: e.target.value })}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-medium text-gray-700 mb-1">Edificio</Label>
                      <select
                        value={nuevoHorario.edificio}
                        onChange={(e) => setNuevoHorario({ ...nuevoHorario, edificio: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        {edificios.map(edificio => (
                          <option key={edificio} value={edificio}>{edificio}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              <Button
                onClick={handleAgregarHorario}
                size="sm"
                className="mt-3 bg-[#1e5da8] hover:bg-[#1a4d8f] w-full md:w-auto"
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar Horario
              </Button>
            </div>

            {/* Lista de horarios */}
            {formData.horarios.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Horarios programados ({formData.horarios.length})
                </p>
                {formData.horarios.map((horario, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-3 flex items-center justify-between bg-white"
                  >
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">{horario.dia}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span>{horario.hora_inicio} - {horario.hora_fin}</span>
                      </div>
                      {horario.aula && horario.aula !== 'Virtual' && (
                        <>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <span>Aula {horario.aula}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-500" />
                            <span>Edificio {horario.edificio}</span>
                          </div>
                        </>
                      )}
                      {horario.aula === 'Virtual' && (
                        <div className="flex items-center gap-2">
                          <span className="text-purple-600">💻 Virtual</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoverHorario(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No hay horarios programados</p>
                <p className="text-xs text-gray-500 mt-1">Agrega al menos un horario para continuar</p>
              </div>
            )}
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
                {modo === 'crear' ? 'Crear Asignatura' : 'Guardar Cambios'}
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
