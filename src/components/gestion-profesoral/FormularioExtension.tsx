/**
 * FORMULARIO DE EXTENSIÓN ACADÉMICA
 * 
 * Componente para registrar actividades de extensión por subdirección:
 * - Capacitación y Formación Continua
 * - Procesos de Selección y Concursos
 * - DFAGE (Desarrollo y Fortalecimiento de la Gestión Empresarial)
 * - Alto Gobierno
 * - Asesorías y Consultorías
 * - Proyección Social
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  Users,
  Award,
  Briefcase,
  GraduationCap,
  Info,
  Edit2,
  Calendar,
  MapPin,
  Building2
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface FormularioExtensionProps {
  actividades: any[];
  horasProgramables: number;
  horasRestantes: number;
  onChange: (actividades: any[], totalHoras: number) => void;
}

// Tipos de actividades de extensión
const TIPOS_EXTENSION = [
  {
    value: 'capacitacion',
    label: 'Capacitación y Formación Continua',
    icon: GraduationCap,
    color: 'bg-green-100 text-green-700',
    ejemplos: ['Diplomados', 'Cursos', 'Talleres', 'Seminarios']
  },
  {
    value: 'procesos_seleccion',
    label: 'Procesos de Selección y Concursos',
    icon: Award,
    color: 'bg-blue-100 text-blue-700',
    ejemplos: ['Concursos de Méritos', 'Evaluación de Candidatos', 'Diseño de Pruebas']
  },
  {
    value: 'dfage',
    label: 'DFAGE - Desarrollo y Fortalecimiento',
    icon: Briefcase,
    color: 'bg-purple-100 text-purple-700',
    ejemplos: ['Asesorías Empresariales', 'Consultoría', 'Acompañamiento']
  },
  {
    value: 'alto_gobierno',
    label: 'Alto Gobierno',
    icon: Building2,
    color: 'bg-yellow-100 text-yellow-700',
    ejemplos: ['Formación Directivos', 'Asesoría Política Pública', 'Consultoría Estratégica']
  },
  {
    value: 'asesoria',
    label: 'Asesorías y Consultorías',
    icon: Users,
    color: 'bg-indigo-100 text-indigo-700',
    ejemplos: ['Asesoría Técnica', 'Consultoría Territorial', 'Acompañamiento Institucional']
  },
  {
    value: 'proyeccion_social',
    label: 'Proyección Social',
    icon: Users,
    color: 'bg-pink-100 text-pink-700',
    ejemplos: ['Responsabilidad Social', 'Proyectos Comunitarios', 'Vinculación Territorial']
  }
];

// Modalidades de extensión
const MODALIDADES = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'hibrida', label: 'Híbrida' },
];

// Niveles de complejidad
const NIVELES_COMPLEJIDAD = [
  { value: 'basico', label: 'Básico', horasBase: 40 },
  { value: 'intermedio', label: 'Intermedio', horasBase: 80 },
  { value: 'avanzado', label: 'Avanzado', horasBase: 120 },
];

export function FormularioExtension({
  actividades,
  horasProgramables,
  horasRestantes,
  onChange
}: FormularioExtensionProps) {
  
  const [modalAbierto, setModalAbierto] = useState(false);
  const [actividadEdicion, setActividadEdicion] = useState<any>(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    tipoExtension: 'capacitacion',
    nombreActividad: '',
    descripcion: '',
    entidadBeneficiaria: '',
    ubicacionTerritorial: '',
    modalidad: 'presencial',
    nivelComplejidad: 'intermedio',
    numeroParticipantes: 0,
    horasAsignadas: 80,
    fechaInicio: '',
    fechaTerminacion: '',
    objetivos: '',
    resultadosEsperados: '',
    esCertificado: false,
    esRemunerado: false
  });
  
  // Calcular horas según nivel de complejidad
  const nivelComplejidad = NIVELES_COMPLEJIDAD.find(n => n.value === formData.nivelComplejidad);
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
    
    const tipoExtension = TIPOS_EXTENSION.find(t => t.value === formData.tipoExtension);
    
    const nuevaActividad = {
      id: modoEdicion ? actividadEdicion.id : `ext-${Date.now()}`,
      ...formData,
      porcentajePTA,
      tipoExtensionLabel: tipoExtension?.label,
      tipoExtensionColor: tipoExtension?.color
    };
    
    let nuevasActividades;
    if (modoEdicion) {
      nuevasActividades = actividades.map(act => 
        act.id === actividadEdicion.id ? nuevaActividad : act
      );
      toast.success('Actividad de extensión actualizada');
    } else {
      nuevasActividades = [...actividades, nuevaActividad];
      toast.success('Actividad de extensión agregada');
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
      tipoExtension: 'capacitacion',
      nombreActividad: '',
      descripcion: '',
      entidadBeneficiaria: '',
      ubicacionTerritorial: '',
      modalidad: 'presencial',
      nivelComplejidad: 'intermedio',
      numeroParticipantes: 0,
      horasAsignadas: 80,
      fechaInicio: '',
      fechaTerminacion: '',
      objetivos: '',
      resultadosEsperados: '',
      esCertificado: false,
      esRemunerado: false
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
    if (confirm('¿Está seguro de eliminar esta actividad de extensión?')) {
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
            <h3 className="text-xl font-bold text-gray-900 mb-2">Componente de Extensión Académica</h3>
            <p className="text-gray-600">
              Registre actividades de extensión y proyección social (máximo 25% del PTA)
            </p>
          </div>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => {
              setModoEdicion(false);
              setActividadEdicion(null);
              setModalAbierto(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Extensión
          </Button>
        </div>
        
        {/* Resumen */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-green-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Horas Extensión</p>
            <p className="text-2xl font-bold text-green-600">{totalHoras}h</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Porcentaje del PTA</p>
            <p className="text-2xl font-bold text-green-600">{porcentajeTotal.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Actividades</p>
            <p className="text-2xl font-bold text-green-600">{actividades.length}</p>
          </div>
        </div>
        
        {/* Info límite */}
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <Info className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-900 mb-1">Límite de Extensión Académica</p>
            <p className="text-sm text-green-700">
              Las actividades de extensión pueden representar hasta el <strong>25% del PTA total</strong>. 
              Incluye capacitación, asesorías, consultorías y proyección social.
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
              <div className="w-16 h-16 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay actividades de extensión
              </h3>
              <p className="text-gray-600 mb-4">
                Agregue actividades de Capacitación, Procesos de Selección, DFAGE o Alto Gobierno
              </p>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
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
              const Icon = TIPOS_EXTENSION.find(t => t.value === actividad.tipoExtension)?.icon || Users;
              
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
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-green-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-gray-900">{actividad.nombreActividad}</h4>
                              <Badge className={actividad.tipoExtensionColor}>
                                {actividad.tipoExtensionLabel}
                              </Badge>
                              {actividad.esCertificado && (
                                <Badge variant="outline" className="text-xs">
                                  Certificado
                                </Badge>
                              )}
                              {actividad.esRemunerado && (
                                <Badge variant="outline" className="text-xs bg-yellow-50">
                                  Remunerado
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                              {actividad.entidadBeneficiaria && (
                                <div className="flex items-center gap-1">
                                  <Building2 className="w-4 h-4" />
                                  <span>{actividad.entidadBeneficiaria}</span>
                                </div>
                              )}
                              {actividad.ubicacionTerritorial && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  <span>{actividad.ubicacionTerritorial}</span>
                                </div>
                              )}
                              {actividad.numeroParticipantes > 0 && (
                                <div className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  <span>{actividad.numeroParticipantes} participantes</span>
                                </div>
                              )}
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
                            <p className="text-sm font-bold text-green-600">{actividad.horasAsignadas}h</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">% del PTA</p>
                            <p className="text-sm font-bold text-green-600">{actividad.porcentajePTA.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Fecha Inicio</p>
                            <p className="text-sm font-medium text-gray-900">{new Date(actividad.fechaInicio).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Modalidad</p>
                            <Badge variant="outline" className="text-xs">{actividad.modalidad}</Badge>
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
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-900">
                {modoEdicion ? 'Editar' : 'Agregar'} Actividad de Extensión
              </h3>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Tipo de extensión */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tipo de Actividad de Extensión *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {TIPOS_EXTENSION.map(tipo => {
                    const Icon = tipo.icon;
                    return (
                      <button
                        key={tipo.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, tipoExtension: tipo.value }))}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          formData.tipoExtension === tipo.value
                            ? 'border-green-600 bg-green-50'
                            : 'border-gray-200 hover:border-green-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-lg ${tipo.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <p className="font-medium text-gray-900">{tipo.label}</p>
                        </div>
                        <p className="text-xs text-gray-600">
                          {tipo.ejemplos.join(', ')}
                        </p>
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
                  placeholder="Ej: Diplomado en Gestión Pública Territorial"
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
                  placeholder="Descripción breve de la actividad de extensión..."
                />
              </div>
              
              {/* Beneficiarios */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entidad Beneficiaria
                  </label>
                  <Input
                    value={formData.entidadBeneficiaria}
                    onChange={(e) => setFormData(prev => ({ ...prev, entidadBeneficiaria: e.target.value }))}
                    placeholder="Ej: Gobernación de Antioquia"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ubicación Territorial
                  </label>
                  <Input
                    value={formData.ubicacionTerritorial}
                    onChange={(e) => setFormData(prev => ({ ...prev, ubicacionTerritorial: e.target.value }))}
                    placeholder="Ej: Medellín, Antioquia"
                  />
                </div>
              </div>
              
              {/* Modalidad y nivel */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modalidad *
                  </label>
                  <select
                    value={formData.modalidad}
                    onChange={(e) => setFormData(prev => ({ ...prev, modalidad: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {MODALIDADES.map(mod => (
                      <option key={mod.value} value={mod.value}>
                        {mod.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nivel de Complejidad
                  </label>
                  <select
                    value={formData.nivelComplejidad}
                    onChange={(e) => {
                      const nivel = NIVELES_COMPLEJIDAD.find(n => n.value === e.target.value);
                      setFormData(prev => ({ 
                        ...prev, 
                        nivelComplejidad: e.target.value,
                        horasAsignadas: nivel?.horasBase || 80
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {NIVELES_COMPLEJIDAD.map(nivel => (
                      <option key={nivel.value} value={nivel.value}>
                        {nivel.label} ({nivel.horasBase}h)
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    N° Participantes
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.numeroParticipantes}
                    onChange={(e) => setFormData(prev => ({ ...prev, numeroParticipantes: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
              
              {/* Horas y fechas */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horas Asignadas *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.horasAsignadas}
                    onChange={(e) => setFormData(prev => ({ ...prev, horasAsignadas: parseInt(e.target.value) }))}
                  />
                </div>
                
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
                    checked={formData.esCertificado}
                    onChange={(e) => setFormData(prev => ({ ...prev, esCertificado: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Otorga certificado</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.esRemunerado}
                    onChange={(e) => setFormData(prev => ({ ...prev, esRemunerado: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Actividad remunerada</span>
                </label>
              </div>
              
              {/* Resumen de cálculo */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-900 mb-3">Resumen de Asignación</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-green-700 mb-1">Horas Asignadas</p>
                    <p className="text-xl font-bold text-green-900">{formData.horasAsignadas}h</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-700 mb-1">% del PTA</p>
                    <p className="text-xl font-bold text-green-900">{porcentajePTA.toFixed(1)}%</p>
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
                className="bg-green-600 hover:bg-green-700"
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
