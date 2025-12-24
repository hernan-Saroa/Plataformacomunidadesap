/**
 * FORMULARIO DE DOCENCIA
 * 
 * Componente para registrar actividades de docencia con:
 * - Selector de asignaturas del catálogo
 * - Cálculo automático de horas según Criterio 1+2
 * - Validación de créditos mínimos
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  BookOpen,
  Search,
  Calendar,
  Users,
  MapPin,
  GraduationCap,
  Info,
  Edit2
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

// Importar catálogos
import {
  CATALOGO_ASIGNATURAS,
  PROGRAMAS_ACADEMICOS,
  SEDES_TERRITORIALES,
  NUCLEOS_TEMATICOS
} from '../../data/catalogosPTA';

// Importar función de cálculo
import { calcularHorasPTAAsignatura } from '../../types/pta.types';

interface FormularioDocenciaProps {
  actividades: any[];
  horasProgramables: number;
  horasRestantes: number;
  onChange: (actividades: any[], totalHoras: number) => void;
}

export function FormularioDocencia({
  actividades,
  horasProgramables,
  horasRestantes,
  onChange
}: FormularioDocenciaProps) {
  
  const [modalAbierto, setModalAbierto] = useState(false);
  const [actividadEdicion, setActividadEdicion] = useState<any>(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    territorial: '', // Iniciar vacío para forzar selección
    cetap: '',
    programaAcademico: 'AP' as 'AP' | 'EP' | 'APT' | 'ESP' | 'MAE' | 'DOC',
    codigoAsignatura: '',
    nombreAsignatura: '',
    nucleoTematico: '',
    ubicacionSemestral: 1,
    modalidad: 'Presencial' as 'Presencial' | 'Virtual' | 'Híbrida',
    totalEstudiantes: 30,
    numeroCreditos: 3,
    esSeminario: false,
    fechaInicio: '',
    fechaTerminacion: '',
    observaciones: ''
  });
  
  // Búsqueda de asignaturas
  const [busquedaAsignatura, setBusquedaAsignatura] = useState('');
  const [asignaturasDisponibles, setAsignaturasDisponibles] = useState(CATALOGO_ASIGNATURAS);
  
  // Calcular horas automáticamente
  const horasBase = formData.programaAcademico === 'AP' || formData.programaAcademico === 'EP'
    ? (formData.esSeminario ? 128 : 64)
    : formData.numeroCreditos * PROGRAMAS_ACADEMICOS.find(p => p.codigo === formData.programaAcademico)!.horasBasePorCredito;
  
  const horasPTA = horasBase * 3; // Criterio 1+2
  const porcentajePTA = (horasPTA / horasProgramables) * 100;
  
  // Handler para seleccionar asignatura del catálogo
  const handleSeleccionarAsignatura = (asignatura: typeof CATALOGO_ASIGNATURAS[0]) => {
    setFormData(prev => ({
      ...prev,
      codigoAsignatura: asignatura.codigo,
      nombreAsignatura: asignatura.nombre,
      nucleoTematico: asignatura.nucleoTematico,
      numeroCreditos: asignatura.numeroCreditos,
      ubicacionSemestral: asignatura.ubicacionSemestral,
      programaAcademico: asignatura.programa,
      modalidad: asignatura.modalidad,
      esSeminario: asignatura.esSeminario || false
    }));
    setBusquedaAsignatura('');
  };
  
  // Handler para agregar actividad
  const handleAgregarActividad = () => {
    if (!formData.nombreAsignatura) {
      toast.error('Debe seleccionar o ingresar una asignatura');
      return;
    }
    
    if (!formData.fechaInicio || !formData.fechaTerminacion) {
      toast.error('Debe especificar las fechas de inicio y terminación');
      return;
    }
    
    const nuevaActividad = {
      id: modoEdicion ? actividadEdicion.id : `doc-${Date.now()}`,
      ...formData,
      horasBase,
      horasPTA,
      porcentajePTA,
      aprobadoPorProgramacion: false,
      aprobadoPorDirector: false,
      aprobadoPorDocente: false
    };
    
    let nuevasActividades;
    if (modoEdicion) {
      nuevasActividades = actividades.map(act => 
        act.id === actividadEdicion.id ? nuevaActividad : act
      );
      toast.success('Actividad de docencia actualizada');
    } else {
      nuevasActividades = [...actividades, nuevaActividad];
      toast.success('Actividad de docencia agregada');
    }
    
    const totalHoras = nuevasActividades.reduce((sum, act) => sum + act.horasPTA, 0);
    onChange(nuevasActividades, totalHoras);
    
    // Resetear formulario
    setModalAbierto(false);
    setModoEdicion(false);
    setActividadEdicion(null);
    setFormData({
      territorial: '',
      cetap: '',
      programaAcademico: 'AP',
      codigoAsignatura: '',
      nombreAsignatura: '',
      nucleoTematico: '',
      ubicacionSemestral: 1,
      modalidad: 'Presencial',
      totalEstudiantes: 30,
      numeroCreditos: 3,
      esSeminario: false,
      fechaInicio: '',
      fechaTerminacion: '',
      observaciones: ''
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
    if (confirm('¿Está seguro de eliminar esta actividad de docencia?')) {
      const nuevasActividades = actividades.filter(act => act.id !== id);
      const totalHoras = nuevasActividades.reduce((sum, act) => sum + act.horasPTA, 0);
      onChange(nuevasActividades, totalHoras);
      toast.success('Actividad eliminada');
    }
  };
  
  // Filtrar asignaturas por búsqueda
  const asignaturasFiltradas = CATALOGO_ASIGNATURAS.filter(asig =>
    asig.nombre.toLowerCase().includes(busquedaAsignatura.toLowerCase()) ||
    asig.codigo.toLowerCase().includes(busquedaAsignatura.toLowerCase())
  ).filter(asig => asig.programa === formData.programaAcademico).slice(0, 5);
  
  const totalHoras = actividades.reduce((sum, act) => sum + act.horasPTA, 0);
  const porcentajeTotal = (totalHoras / horasProgramables) * 100;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Componente de Docencia</h3>
            <p className="text-gray-600">
              Registre las asignaturas que impartirá durante el período académico
            </p>
          </div>
          <Button
            size="sm"
            className="bg-[#1e5da8] hover:bg-[#1a4d8f]"
            onClick={() => {
              setModoEdicion(false);
              setActividadEdicion(null);
              setModalAbierto(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Asignatura
          </Button>
        </div>
        
        {/* Resumen */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Horas Docencia</p>
            <p className="text-2xl font-bold text-blue-600">{totalHoras}h</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Porcentaje del PTA</p>
            <p className="text-2xl font-bold text-blue-600">{porcentajeTotal.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Asignaturas</p>
            <p className="text-2xl font-bold text-blue-600">{actividades.length}</p>
          </div>
        </div>
        
        {/* Info Criterio 1+2 */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-900 mb-1">Criterio 1+2 - Cálculo Automático</p>
            <p className="text-sm text-blue-700">
              Por cada hora de clase se incluyen 2 horas adicionales: 1 hora de preparación previa y 1 hora de acompañamiento posterior. 
              <strong> Total = Horas Base × 3</strong>
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
              <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay asignaturas registradas
              </h3>
              <p className="text-gray-600 mb-4">
                Agregue las asignaturas que impartirá en el período académico
              </p>
              <Button
                size="sm"
                className="bg-[#1e5da8] hover:bg-[#1a4d8f]"
                onClick={() => setModalAbierto(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Primera Asignatura
              </Button>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {actividades.map((actividad, index) => (
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
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-6 h-6 text-blue-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-gray-900">{actividad.nombreAsignatura}</h4>
                            <Badge variant="outline" className="text-xs">
                              {actividad.codigoAsignatura}
                            </Badge>
                            {actividad.esSeminario && (
                              <Badge className="bg-purple-100 text-purple-700 text-xs">
                                Seminario
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <GraduationCap className="w-4 h-4" />
                              <span>{PROGRAMAS_ACADEMICOS.find(p => p.codigo === actividad.programaAcademico)?.nombre}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{actividad.territorial}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{actividad.totalEstudiantes} estudiantes</span>
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
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Créditos</p>
                          <p className="text-sm font-bold text-gray-900">{actividad.numeroCreditos}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Horas Base</p>
                          <p className="text-sm font-bold text-gray-900">{actividad.horasBase}h</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Horas PTA (×3)</p>
                          <p className="text-sm font-bold text-blue-600">{actividad.horasPTA}h</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">% del PTA</p>
                          <p className="text-sm font-bold text-blue-600">{actividad.porcentajePTA.toFixed(1)}%</p>
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
            ))}
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
                {modoEdicion ? 'Editar' : 'Agregar'} Asignatura
              </h3>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Selector de programa */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Programa Académico *
                  </label>
                  <select
                    value={formData.programaAcademico}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      programaAcademico: e.target.value as any,
                      codigoAsignatura: '',
                      nombreAsignatura: ''
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {PROGRAMAS_ACADEMICOS.map(prog => (
                      <option key={prog.codigo} value={prog.codigo}>
                        {prog.nombre} ({prog.nivel})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Territorial *
                  </label>
                  <select
                    value={formData.territorial}
                    onChange={(e) => setFormData(prev => ({ ...prev, territorial: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Seleccione una territorial...</option>
                    {SEDES_TERRITORIALES.map(sede => (
                      <option key={sede.codigo} value={sede.nombre}>
                        {sede.nombreCorto} - {sede.ciudad}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    ✅ Integrado con Estructura Organizacional ({SEDES_TERRITORIALES.length} territoriales)
                  </p>
                </div>
              </div>
              
              {/* Búsqueda de asignatura */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buscar Asignatura del Catálogo
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={busquedaAsignatura}
                    onChange={(e) => setBusquedaAsignatura(e.target.value)}
                    placeholder="Buscar por código o nombre..."
                    className="pl-10"
                  />
                </div>
                
                {busquedaAsignatura && asignaturasFiltradas.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    {asignaturasFiltradas.map(asig => (
                      <button
                        key={asig.codigo}
                        onClick={() => handleSeleccionarAsignatura(asig)}
                        className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{asig.nombre}</p>
                            <p className="text-sm text-gray-600">{asig.codigo} - {asig.numeroCreditos} créditos</p>
                          </div>
                          <Badge variant="outline">{asig.horasPTA}h</Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Información de la asignatura */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código Asignatura
                  </label>
                  <Input
                    value={formData.codigoAsignatura}
                    onChange={(e) => setFormData(prev => ({ ...prev, codigoAsignatura: e.target.value }))}
                    placeholder="Ej: AP-101"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre Asignatura *
                  </label>
                  <Input
                    value={formData.nombreAsignatura}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombreAsignatura: e.target.value }))}
                    placeholder="Nombre de la asignatura"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Créditos *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="4"
                    value={formData.numeroCreditos}
                    onChange={(e) => setFormData(prev => ({ ...prev, numeroCreditos: parseInt(e.target.value) }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estudiantes
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.totalEstudiantes}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalEstudiantes: parseInt(e.target.value) }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modalidad
                  </label>
                  <select
                    value={formData.modalidad}
                    onChange={(e) => setFormData(prev => ({ ...prev, modalidad: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="Presencial">Presencial</option>
                    <option value="Virtual">Virtual</option>
                    <option value="Híbrida">Híbrida</option>
                  </select>
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
              
              {/* Resumen de cálculo */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-3">Cálculo Automático de Horas</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-blue-700 mb-1">Horas Base</p>
                    <p className="text-xl font-bold text-blue-900">{horasBase}h</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700 mb-1">Horas PTA (×3)</p>
                    <p className="text-xl font-bold text-blue-900">{horasPTA}h</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700 mb-1">% del PTA</p>
                    <p className="text-xl font-bold text-blue-900">{porcentajePTA.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t flex items-center justify-end gap-3 sticky bottom-0 bg-white">
              <Button variant="outline" onClick={() => {
                setModalAbierto(false);
                setModoEdicion(false);
                setActividadEdicion(null);
              }}>
                Cancelar
              </Button>
              <Button
                onClick={handleAgregarActividad}
                className="bg-[#1e5da8] hover:bg-[#1a4d8f]"
              >
                {modoEdicion ? 'Actualizar' : 'Agregar'} Asignatura
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}