/**
 * FORMULARIO DE ACTIVIDADES COMPLEMENTARIAS
 * 
 * Componente para registrar actividades complementarias institucionales:
 * - Comités y Consejos Académicos
 * - Coordinaciones y Direcciones de Programa
 * - Tutoría y Acompañamiento Estudiantil
 * - Desarrollo Curricular
 * - Acreditación y Autoevaluación
 * - Otras actividades institucionales
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  ClipboardList,
  Users,
  Award,
  BookOpen,
  Info,
  Edit2,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface FormularioComplementariasProps {
  actividades: any[];
  horasProgramables: number;
  horasRestantes: number;
  onChange: (actividades: any[], totalHoras: number) => void;
}

// Tipos de actividades complementarias
const TIPOS_COMPLEMENTARIAS = [
  {
    value: 'comite_academico',
    label: 'Comité o Consejo Académico',
    icon: Users,
    color: 'bg-orange-100 text-orange-700',
    horasBase: 40
  },
  {
    value: 'coordinacion',
    label: 'Coordinación/Dirección de Programa',
    icon: Award,
    color: 'bg-blue-100 text-blue-700',
    horasBase: 160
  },
  {
    value: 'tutoria',
    label: 'Tutoría y Acompañamiento Estudiantil',
    icon: Users,
    color: 'bg-green-100 text-green-700',
    horasBase: 60
  },
  {
    value: 'desarrollo_curricular',
    label: 'Desarrollo Curricular',
    icon: BookOpen,
    color: 'bg-purple-100 text-purple-700',
    horasBase: 80
  },
  {
    value: 'acreditacion',
    label: 'Acreditación y Autoevaluación',
    icon: CheckCircle,
    color: 'bg-indigo-100 text-indigo-700',
    horasBase: 100
  },
  {
    value: 'representacion',
    label: 'Representación Institucional',
    icon: Award,
    color: 'bg-yellow-100 text-yellow-700',
    horasBase: 50
  },
  {
    value: 'otra',
    label: 'Otra Actividad Institucional',
    icon: ClipboardList,
    color: 'bg-gray-100 text-gray-700',
    horasBase: 40
  }
];

// Periodicidad
const PERIODICIDADES = [
  { value: 'semanal', label: 'Semanal', multiplicador: 16 },
  { value: 'quincenal', label: 'Quincenal', multiplicador: 8 },
  { value: 'mensual', label: 'Mensual', multiplicador: 4 },
  { value: 'bimestral', label: 'Bimestral', multiplicador: 2 },
  { value: 'semestral', label: 'Semestral', multiplicador: 1 },
];

export function FormularioComplementarias({
  actividades,
  horasProgramables,
  horasRestantes,
  onChange
}: FormularioComplementariasProps) {
  
  const [modalAbierto, setModalAbierto] = useState(false);
  const [actividadEdicion, setActividadEdicion] = useState<any>(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    tipoActividad: 'comite_academico',
    nombreActividad: '',
    descripcion: '',
    cargoFuncion: '',
    periodicidad: 'mensual',
    horasPorSesion: 2,
    numeroSesiones: 0,
    horasAsignadas: 40,
    fechaInicio: '',
    fechaTerminacion: '',
    esRemunerado: false,
    tieneActaCompromiso: false
  });
  
  // Calcular horas automáticamente según periodicidad
  const periodicidad = PERIODICIDADES.find(p => p.value === formData.periodicidad);
  const horasCalculadas = formData.horasPorSesion * (periodicidad?.multiplicador || 1);
  const porcentajePTA = (formData.horasAsignadas / horasProgramables) * 100;
  
  // Handler para agregar actividad
  const handleAgregarActividad = () => {
    if (!formData.nombreActividad) {
      toast.error('Debe ingresar el nombre de la actividad');
      return;
    }
    
    if (!formData.fechaInicio || !formData.fechaTerminacion) {
      toast.error('Debe especificar las fechas de la actividad');
      return;
    }
    
    const tipoActividad = TIPOS_COMPLEMENTARIAS.find(t => t.value === formData.tipoActividad);
    
    const nuevaActividad = {
      id: modoEdicion ? actividadEdicion.id : `comp-${Date.now()}`,
      ...formData,
      porcentajePTA,
      tipoActividadLabel: tipoActividad?.label,
      tipoActividadColor: tipoActividad?.color
    };
    
    let nuevasActividades;
    if (modoEdicion) {
      nuevasActividades = actividades.map(act => 
        act.id === actividadEdicion.id ? nuevaActividad : act
      );
      toast.success('Actividad complementaria actualizada');
    } else {
      nuevasActividades = [...actividades, nuevaActividad];
      toast.success('Actividad complementaria agregada');
    }
    
    const totalHoras = nuevasActividades.reduce((sum, act) => sum + act.horasAsignadas, 0);
    onChange(nuevasActividades, totalHoras);
    
    // Resetear formulario
    resetFormulario();
  };
  
  const resetFormulario = () => {
    setModalAbierto(false);
    setModoEdicion(false);
    setActividadEdicion(null);
    setFormData({
      tipoActividad: 'comite_academico',
      nombreActividad: '',
      descripcion: '',
      cargoFuncion: '',
      periodicidad: 'mensual',
      horasPorSesion: 2,
      numeroSesiones: 0,
      horasAsignadas: 40,
      fechaInicio: '',
      fechaTerminacion: '',
      esRemunerado: false,
      tieneActaCompromiso: false
    });
  };
  
  // Handler para editar actividad
  const handleEditarActividad = (actividad: any) => {
    setActividadEdicion(actividad);
    setFormData(actividad);
    setModoEdicion(true);
    setModalAbierto(true);
  };
  
  // Handler para eliminar actividad
  const handleEliminarActividad = (id: string) => {
    if (confirm('¿Está seguro de eliminar esta actividad complementaria?')) {
      const nuevasActividades = actividades.filter(act => act.id !== id);
      const totalHoras = nuevasActividades.reduce((sum, act) => sum + act.horasAsignadas, 0);
      onChange(nuevasActividades, totalHoras);
      toast.success('Actividad eliminada');
    }
  };
  
  const totalHoras = actividades.reduce((sum, act) => sum + act.horasAsignadas, 0);
  const porcentajeTotal = (totalHoras / horasProgramables) * 100;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Actividades Complementarias Institucionales</h3>
            <p className="text-gray-600">
              Registre comités, coordinaciones, tutorías y otras actividades institucionales
            </p>
          </div>
          <Button
            size="sm"
            className="bg-orange-600 hover:bg-orange-700"
            onClick={() => {
              setModoEdicion(false);
              setActividadEdicion(null);
              setModalAbierto(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Actividad
          </Button>
        </div>
        
        {/* Resumen */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-orange-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Horas Complementarias</p>
            <p className="text-2xl font-bold text-orange-600">{totalHoras}h</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Porcentaje del PTA</p>
            <p className="text-2xl font-bold text-orange-600">{porcentajeTotal.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Actividades</p>
            <p className="text-2xl font-bold text-orange-600">{actividades.length}</p>
          </div>
        </div>
        
        {/* Info */}
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
          <Info className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-900 mb-1">Actividades Complementarias</p>
            <p className="text-sm text-orange-700">
              Incluye participación en comités académicos, coordinaciones, tutorías, desarrollo curricular 
              y otras funciones institucionales asignadas.
            </p>
          </div>
        </div>
      </Card>
      
      {/* Lista de actividades */}
      <AnimatePresence mode="popLayout">
        {actividades.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-orange-100 mx-auto mb-4 flex items-center justify-center">
                <ClipboardList className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay actividades complementarias
              </h3>
              <p className="text-gray-600 mb-4">
                Agregue comités, coordinaciones, tutorías u otras actividades institucionales
              </p>
              <Button
                size="sm"
                className="bg-orange-600 hover:bg-orange-700"
                onClick={() => setModalAbierto(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Primera Actividad
              </Button>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {actividades.map((actividad, index) => {
              const Icon = TIPOS_COMPLEMENTARIAS.find(t => t.value === actividad.tipoActividad)?.icon || ClipboardList;
              
              return (
                <motion.div
                  key={actividad.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  <Card className="p-5 hover:shadow-md transition-shadow group">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-orange-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-gray-900">{actividad.nombreActividad}</h4>
                              <Badge className={actividad.tipoActividadColor}>
                                {actividad.tipoActividadLabel}
                              </Badge>
                              {actividad.tieneActaCompromiso && (
                                <Badge variant="outline" className="text-xs">
                                  Con Acta
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                              {actividad.cargoFuncion && (
                                <div className="flex items-center gap-1">
                                  <Award className="w-4 h-4" />
                                  <span>{actividad.cargoFuncion}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>Periodicidad: {PERIODICIDADES.find(p => p.value === actividad.periodicidad)?.label}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditarActividad(actividad)}
                              className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                              <Edit2 className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => handleEliminarActividad(actividad.id)}
                              className="p-2 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Horas Asignadas</p>
                            <p className="text-sm font-bold text-orange-600">{actividad.horasAsignadas}h</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">% del PTA</p>
                            <p className="text-sm font-bold text-orange-600">{actividad.porcentajePTA.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Horas/Sesión</p>
                            <p className="text-sm font-medium text-gray-900">{actividad.horasPorSesion}h</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Fecha Inicio</p>
                            <p className="text-sm font-medium text-gray-900">{new Date(actividad.fechaInicio).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
      
      {/* Modal para agregar/editar actividad */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-900">
                {modoEdicion ? 'Editar' : 'Agregar'} Actividad Complementaria
              </h3>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Tipo de actividad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tipo de Actividad *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {TIPOS_COMPLEMENTARIAS.map(tipo => {
                    const Icon = tipo.icon;
                    return (
                      <button
                        key={tipo.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          tipoActividad: tipo.value,
                          horasAsignadas: tipo.horasBase 
                        }))}
                        className={`p-3 border-2 rounded-lg text-left transition-all ${
                          formData.tipoActividad === tipo.value
                            ? 'border-orange-600 bg-orange-50'
                            : 'border-gray-200 hover:border-orange-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${tipo.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <p className="text-sm font-medium text-gray-900">{tipo.label}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Información básica */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la Actividad *
                </label>
                <Input
                  value={formData.nombreActividad}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombreActividad: e.target.value }))}
                  placeholder="Ej: Comité Curricular de Administración Pública"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cargo o Función
                </label>
                <Input
                  value={formData.cargoFuncion}
                  onChange={(e) => setFormData(prev => ({ ...prev, cargoFuncion: e.target.value }))}
                  placeholder="Ej: Miembro, Coordinador, Secretario Técnico"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Descripción de la actividad complementaria..."
                />
              </div>
              
              {/* Periodicidad y horas */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Periodicidad *
                  </label>
                  <select
                    value={formData.periodicidad}
                    onChange={(e) => setFormData(prev => ({ ...prev, periodicidad: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {PERIODICIDADES.map(per => (
                      <option key={per.value} value={per.value}>
                        {per.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horas por Sesión
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.horasPorSesion}
                    onChange={(e) => setFormData(prev => ({ ...prev, horasPorSesion: parseInt(e.target.value) }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horas Totales *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.horasAsignadas}
                    onChange={(e) => setFormData(prev => ({ ...prev, horasAsignadas: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
              
              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha Inicio *
                  </label>
                  <Input
                    type="date"
                    value={formData.fechaInicio}
                    onChange={(e) => setFormData(prev => ({ ...prev, fechaInicio: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha Terminación *
                  </label>
                  <Input
                    type="date"
                    value={formData.fechaTerminacion}
                    onChange={(e) => setFormData(prev => ({ ...prev, fechaTerminacion: e.target.value }))}
                  />
                </div>
              </div>
              
              {/* Opciones adicionales */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.tieneActaCompromiso}
                    onChange={(e) => setFormData(prev => ({ ...prev, tieneActaCompromiso: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Tiene acta de compromiso</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.esRemunerado}
                    onChange={(e) => setFormData(prev => ({ ...prev, esRemunerado: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Es remunerado</span>
                </label>
              </div>
              
              {/* Resumen */}
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm font-medium text-orange-900 mb-3">Resumen de Asignación</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-orange-700 mb-1">Horas Totales</p>
                    <p className="text-xl font-bold text-orange-900">{formData.horasAsignadas}h</p>
                  </div>
                  <div>
                    <p className="text-xs text-orange-700 mb-1">% del PTA</p>
                    <p className="text-xl font-bold text-orange-900">{porcentajePTA.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-orange-700 mb-1">Sesiones Estimadas</p>
                    <p className="text-xl font-bold text-orange-900">{periodicidad?.multiplicador || 0}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t flex items-center justify-end gap-3 sticky bottom-0 bg-white">
              <Button variant="outline" onClick={resetFormulario}>
                Cancelar
              </Button>
              <Button
                onClick={handleAgregarActividad}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {modoEdicion ? 'Actualizar' : 'Agregar'} Actividad
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
