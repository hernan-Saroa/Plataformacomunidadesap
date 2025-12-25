/**
 * FORMULARIO DE ACTIVIDADES ADMINISTRATIVAS
 * 
 * Componente para registrar actividades administrativas asignadas:
 * - Cargos administrativos con descarga académica
 * - Jefaturas y direcciones temporales
 * - Comisiones administrativas
 * - Representaciones institucionales
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  Briefcase,
  Building2,
  Award,
  FileText,
  Info,
  Edit2,
  Calendar
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface FormularioAdministrativasProps {
  actividades: any[];
  horasProgramables: number;
  horasRestantes: number;
  onChange: (actividades: any[], totalHoras: number) => void;
}

// Tipos de actividades administrativas
const TIPOS_ADMINISTRATIVAS = [
  {
    value: 'decanatura',
    label: 'Decanatura/Dirección Académica',
    icon: Building2,
    color: 'bg-red-100 text-red-700',
    descargaBase: 320
  },
  {
    value: 'jefatura',
    label: 'Jefatura de Departamento/Área',
    icon: Award,
    color: 'bg-blue-100 text-blue-700',
    descargaBase: 240
  },
  {
    value: 'coordinacion',
    label: 'Coordinación Académica',
    icon: Briefcase,
    color: 'bg-purple-100 text-purple-700',
    descargaBase: 160
  },
  {
    value: 'secretaria',
    label: 'Secretaría Académica',
    icon: FileText,
    color: 'bg-green-100 text-green-700',
    descargaBase: 200
  },
  {
    value: 'comision',
    label: 'Comisión Administrativa',
    icon: Briefcase,
    color: 'bg-yellow-100 text-yellow-700',
    descargaBase: 80
  },
  {
    value: 'representacion',
    label: 'Representación Institucional',
    icon: Award,
    color: 'bg-indigo-100 text-indigo-700',
    descargaBase: 60
  }
];

// Niveles de dedicación
const NIVELES_DEDICACION = [
  { value: 'completa', label: 'Dedicación Completa', porcentaje: 100 },
  { value: 'alta', label: 'Dedicación Alta (75%)', porcentaje: 75 },
  { value: 'media', label: 'Dedicación Media (50%)', porcentaje: 50 },
  { value: 'baja', label: 'Dedicación Baja (25%)', porcentaje: 25 },
];

export function FormularioAdministrativas({
  actividades,
  horasProgramables,
  horasRestantes,
  onChange
}: FormularioAdministrativasProps) {
  
  const [modalAbierto, setModalAbierto] = useState(false);
  const [actividadEdicion, setActividadEdicion] = useState<any>(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    tipoActividad: 'coordinacion',
    nombreCargo: '',
    descripcion: '',
    dependenciaAsignada: '',
    nivelDedicacion: 'media',
    horasDescarga: 160,
    fechaInicio: '',
    fechaTerminacion: '',
    resolucionNombramiento: '',
    esRemunerado: false,
    tieneDescargaCompleta: false
  });
  
  // Calcular descarga según tipo y nivel de dedicación
  const tipoActividad = TIPOS_ADMINISTRATIVAS.find(t => t.value === formData.tipoActividad);
  const nivelDedicacion = NIVELES_DEDICACION.find(n => n.value === formData.nivelDedicacion);
  const descargaCalculada = Math.round((tipoActividad?.descargaBase || 0) * ((nivelDedicacion?.porcentaje || 0) / 100));
  const porcentajePTA = (formData.horasDescarga / horasProgramables) * 100;
  
  // Handler para agregar actividad
  const handleAgregarActividad = () => {
    if (!formData.nombreCargo) {
      toast.error('Debe ingresar el nombre del cargo');
      return;
    }
    
    if (!formData.fechaInicio || !formData.fechaTerminacion) {
      toast.error('Debe especificar las fechas del nombramiento');
      return;
    }
    
    const nuevaActividad = {
      id: modoEdicion ? actividadEdicion.id : `adm-${Date.now()}`,
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
      toast.success('Actividad administrativa actualizada');
    } else {
      nuevasActividades = [...actividades, nuevaActividad];
      toast.success('Actividad administrativa agregada');
    }
    
    const totalHoras = nuevasActividades.reduce((sum, act) => sum + act.horasDescarga, 0);
    onChange(nuevasActividades, totalHoras);
    
    // Resetear formulario
    resetFormulario();
  };
  
  const resetFormulario = () => {
    setModalAbierto(false);
    setModoEdicion(false);
    setActividadEdicion(null);
    setFormData({
      tipoActividad: 'coordinacion',
      nombreCargo: '',
      descripcion: '',
      dependenciaAsignada: '',
      nivelDedicacion: 'media',
      horasDescarga: 160,
      fechaInicio: '',
      fechaTerminacion: '',
      resolucionNombramiento: '',
      esRemunerado: false,
      tieneDescargaCompleta: false
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
    if (confirm('¿Está seguro de eliminar esta actividad administrativa?')) {
      const nuevasActividades = actividades.filter(act => act.id !== id);
      const totalHoras = nuevasActividades.reduce((sum, act) => sum + act.horasDescarga, 0);
      onChange(nuevasActividades, totalHoras);
      toast.success('Actividad eliminada');
    }
  };
  
  const totalHoras = actividades.reduce((sum, act) => sum + act.horasDescarga, 0);
  const porcentajeTotal = (totalHoras / horasProgramables) * 100;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Actividades Administrativas</h3>
            <p className="text-gray-600">
              Registre cargos administrativos con descarga académica asignada
            </p>
          </div>
          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-700"
            onClick={() => {
              setModoEdicion(false);
              setActividadEdicion(null);
              setModalAbierto(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Cargo
          </Button>
        </div>
        
        {/* Resumen */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-red-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Descarga Administrativa</p>
            <p className="text-2xl font-bold text-red-600">{totalHoras}h</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Porcentaje del PTA</p>
            <p className="text-2xl font-bold text-red-600">{porcentajeTotal.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Cargos Activos</p>
            <p className="text-2xl font-bold text-red-600">{actividades.length}</p>
          </div>
        </div>
        
        {/* Info */}
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <Info className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-900 mb-1">Descarga por Funciones Administrativas</p>
            <p className="text-sm text-red-700">
              Los docentes con cargos administrativos reciben descarga académica proporcional. 
              La descarga varía según el tipo de cargo y nivel de dedicación.
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
              <div className="w-16 h-16 rounded-full bg-red-100 mx-auto mb-4 flex items-center justify-center">
                <Briefcase className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay actividades administrativas
              </h3>
              <p className="text-gray-600 mb-4">
                Agregue cargos administrativos con descarga académica
              </p>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                onClick={() => setModalAbierto(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Primer Cargo
              </Button>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {actividades.map((actividad, index) => {
              const Icon = TIPOS_ADMINISTRATIVAS.find(t => t.value === actividad.tipoActividad)?.icon || Briefcase;
              
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
                      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-red-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-gray-900">{actividad.nombreCargo}</h4>
                              <Badge className={actividad.tipoActividadColor}>
                                {actividad.tipoActividadLabel}
                              </Badge>
                              {actividad.resolucionNombramiento && (
                                <Badge variant="outline" className="text-xs">
                                  Res. {actividad.resolucionNombramiento}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                              {actividad.dependenciaAsignada && (
                                <div className="flex items-center gap-1">
                                  <Building2 className="w-4 h-4" />
                                  <span>{actividad.dependenciaAsignada}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Award className="w-4 h-4" />
                                <span>{NIVELES_DEDICACION.find(n => n.value === actividad.nivelDedicacion)?.label}</span>
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
                            <p className="text-xs text-gray-600 mb-1">Descarga Horaria</p>
                            <p className="text-sm font-bold text-red-600">{actividad.horasDescarga}h</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">% del PTA</p>
                            <p className="text-sm font-bold text-red-600">{actividad.porcentajePTA.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Fecha Inicio</p>
                            <p className="text-sm font-medium text-gray-900">{new Date(actividad.fechaInicio).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Fecha Fin</p>
                            <p className="text-sm font-medium text-gray-900">{new Date(actividad.fechaTerminacion).toLocaleDateString()}</p>
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
                {modoEdicion ? 'Editar' : 'Agregar'} Cargo Administrativo
              </h3>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Tipo de cargo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tipo de Cargo Administrativo *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {TIPOS_ADMINISTRATIVAS.map(tipo => {
                    const Icon = tipo.icon;
                    return (
                      <button
                        key={tipo.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          tipoActividad: tipo.value,
                          horasDescarga: tipo.descargaBase
                        }))}
                        className={`p-3 border-2 rounded-lg text-left transition-all ${
                          formData.tipoActividad === tipo.value
                            ? 'border-red-600 bg-red-50'
                            : 'border-gray-200 hover:border-red-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`p-2 rounded-lg ${tipo.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <p className="text-sm font-medium text-gray-900">{tipo.label}</p>
                        </div>
                        <p className="text-xs text-gray-600">Descarga base: {tipo.descargaBase}h</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Información del cargo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Cargo *
                </label>
                <Input
                  value={formData.nombreCargo}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombreCargo: e.target.value }))}
                  placeholder="Ej: Coordinador Académico Territorial Antioquia"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dependencia Asignada
                </label>
                <Input
                  value={formData.dependenciaAsignada}
                  onChange={(e) => setFormData(prev => ({ ...prev, dependenciaAsignada: e.target.value }))}
                  placeholder="Ej: Territorial Antioquia"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción de Funciones
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Descripción de las funciones administrativas..."
                />
              </div>
              
              {/* Nivel de dedicación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nivel de Dedicación *
                </label>
                <select
                  value={formData.nivelDedicacion}
                  onChange={(e) => {
                    const nivel = NIVELES_DEDICACION.find(n => n.value === e.target.value);
                    const descarga = Math.round((tipoActividad?.descargaBase || 0) * ((nivel?.porcentaje || 0) / 100));
                    setFormData(prev => ({ 
                      ...prev, 
                      nivelDedicacion: e.target.value,
                      horasDescarga: descarga
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {NIVELES_DEDICACION.map(nivel => (
                    <option key={nivel.value} value={nivel.value}>
                      {nivel.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Descarga calculada: {descargaCalculada}h ({((descargaCalculada / horasProgramables) * 100).toFixed(1)}% del PTA)
                </p>
              </div>
              
              {/* Horas y fechas */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horas Descarga *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.horasDescarga}
                    onChange={(e) => setFormData(prev => ({ ...prev, horasDescarga: parseInt(e.target.value) }))}
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
              
              {/* Resolución */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolución de Nombramiento
                </label>
                <Input
                  value={formData.resolucionNombramiento}
                  onChange={(e) => setFormData(prev => ({ ...prev, resolucionNombramiento: e.target.value }))}
                  placeholder="Ej: Res. 123 de 2025"
                />
              </div>
              
              {/* Opciones adicionales */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.tieneDescargaCompleta}
                    onChange={(e) => setFormData(prev => ({ ...prev, tieneDescargaCompleta: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Descarga académica completa</span>
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
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm font-medium text-red-900 mb-3">Resumen de Descarga</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-red-700 mb-1">Horas de Descarga</p>
                    <p className="text-xl font-bold text-red-900">{formData.horasDescarga}h</p>
                  </div>
                  <div>
                    <p className="text-xs text-red-700 mb-1">% del PTA</p>
                    <p className="text-xl font-bold text-red-900">{porcentajePTA.toFixed(1)}%</p>
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
                className="bg-red-600 hover:bg-red-700"
              >
                {modoEdicion ? 'Actualizar' : 'Agregar'} Cargo
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
