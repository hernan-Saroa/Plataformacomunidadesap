import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Save,
  User,
  Calendar,
  Clock,
  FileText,
  BookOpen,
  Target,
  AlertCircle,
  Lightbulb
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { toast } from 'sonner@2.0.3';
import { territorialesMock } from '../../mock-data/territoriales-mock';
import { docentesMock } from '../../mock-data/docentes-mock';

interface PTAFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
  pta?: any;
  modo?: 'crear' | 'editar';
}

type TabType = 'general' | 'distribucion' | 'asignaturas' | 'objetivos';

interface Componente {
  horas: number;
  porcentaje: number;
  actividades: string[];
}

interface Asignatura {
  nombre: string;
  grupo: string;
  estudiantes: number;
  horas_semana: number;
}

export function PTAFormModal({
  isOpen,
  onClose,
  onSuccess,
  pta,
  modo = 'crear'
}: PTAFormModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado del formulario
  const [formData, setFormData] = useState({
    // Tab 1: Información General
    codigo: '',
    docente_id: '',
    docente_nombre: '',
    territorial: '',
    departamento: '',
    periodo_nombre: '2025-I',
    periodo_inicio: '',
    periodo_fin: '',
    dedicacion: 'Tiempo Completo',
    horas_semanales: 40,
    
    // Tab 2: Distribución de Tiempo
    componente_ensenanza: {
      horas: 20,
      porcentaje: 50,
      actividades: [] as string[]
    },
    componente_investigacion: {
      horas: 8,
      porcentaje: 20,
      actividades: [] as string[]
    },
    componente_extension: {
      horas: 6,
      porcentaje: 15,
      actividades: [] as string[]
    },
    componente_apoyo_institucional: {
      horas: 6,
      porcentaje: 15,
      actividades: [] as string[]
    },
    
    // Tab 3: Asignaturas
    asignaturas: [] as Asignatura[],
    
    // Tab 4: Objetivos y Estrategias
    objetivos_periodo: '',
    estrategias_pedagogicas: '',
    recursos_requeridos: '',
    indicadores_logro: '',
    
    // Estado
    estado: 'borrador'
  });

  // Inputs temporales para actividades
  const [nuevaActividadEnsenanza, setNuevaActividadEnsenanza] = useState('');
  const [nuevaActividadInvestigacion, setNuevaActividadInvestigacion] = useState('');
  const [nuevaActividadExtension, setNuevaActividadExtension] = useState('');
  const [nuevaActividadApoyo, setNuevaActividadApoyo] = useState('');

  // Nueva asignatura
  const [nuevaAsignatura, setNuevaAsignatura] = useState<Asignatura>({
    nombre: '',
    grupo: '',
    estudiantes: 0,
    horas_semana: 0
  });

  // Pre-llenar formulario en modo edición
  useEffect(() => {
    if (modo === 'editar' && pta) {
      setFormData({
        ...formData,
        ...pta
      });
    }
  }, [pta, modo]);

  // Reset al cerrar
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('general');
    }
  }, [isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleComponenteChange = (componente: 'ensenanza' | 'investigacion' | 'extension' | 'apoyo_institucional', field: 'horas', value: number) => {
    const componenteKey = `componente_${componente}` as keyof typeof formData;
    const currentComponente = formData[componenteKey] as Componente;
    
    // Calcular porcentaje
    const porcentaje = Math.round((value / formData.horas_semanales) * 100);
    
    setFormData(prev => ({
      ...prev,
      [componenteKey]: {
        ...currentComponente,
        horas: value,
        porcentaje
      }
    }));
  };

  const handleAgregarActividad = (componente: 'ensenanza' | 'investigacion' | 'extension' | 'apoyo_institucional', actividad: string, setter: (val: string) => void) => {
    if (actividad.trim()) {
      const componenteKey = `componente_${componente}` as keyof typeof formData;
      const currentComponente = formData[componenteKey] as Componente;
      
      setFormData(prev => ({
        ...prev,
        [componenteKey]: {
          ...currentComponente,
          actividades: [...currentComponente.actividades, actividad.trim()]
        }
      }));
      setter('');
    }
  };

  const handleRemoverActividad = (componente: 'ensenanza' | 'investigacion' | 'extension' | 'apoyo_institucional', index: number) => {
    const componenteKey = `componente_${componente}` as keyof typeof formData;
    const currentComponente = formData[componenteKey] as Componente;
    
    setFormData(prev => ({
      ...prev,
      [componenteKey]: {
        ...currentComponente,
        actividades: currentComponente.actividades.filter((_, i) => i !== index)
      }
    }));
  };

  const handleAgregarAsignatura = () => {
    if (nuevaAsignatura.nombre.trim() && nuevaAsignatura.horas_semana > 0) {
      setFormData(prev => ({
        ...prev,
        asignaturas: [...prev.asignaturas, nuevaAsignatura]
      }));
      setNuevaAsignatura({
        nombre: '',
        grupo: '',
        estudiantes: 0,
        horas_semana: 0
      });
    }
  };

  const handleRemoverAsignatura = (index: number) => {
    setFormData(prev => ({
      ...prev,
      asignaturas: prev.asignaturas.filter((_, i) => i !== index)
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
        departamento: docente.departamento_area || ''
      }));
    }
  };

  const calcularTotalHoras = (): number => {
    return formData.componente_ensenanza.horas +
           formData.componente_investigacion.horas +
           formData.componente_extension.horas +
           formData.componente_apoyo_institucional.horas;
  };

  const calcularTotalPorcentaje = (): number => {
    return formData.componente_ensenanza.porcentaje +
           formData.componente_investigacion.porcentaje +
           formData.componente_extension.porcentaje +
           formData.componente_apoyo_institucional.porcentaje;
  };

  const validateForm = (): boolean => {
    // Validar Tab 1
    if (!formData.docente_id || !formData.periodo_inicio || !formData.periodo_fin) {
      toast.error('Por favor completa la información general');
      setActiveTab('general');
      return false;
    }

    // Validar fechas
    const inicio = new Date(formData.periodo_inicio);
    const fin = new Date(formData.periodo_fin);
    if (inicio >= fin) {
      toast.error('La fecha de fin debe ser posterior a la fecha de inicio');
      setActiveTab('general');
      return false;
    }

    // Validar Tab 2 - Distribución
    const totalHoras = calcularTotalHoras();
    if (totalHoras !== formData.horas_semanales) {
      toast.error(`La suma de horas debe ser ${formData.horas_semanales}h (actual: ${totalHoras}h)`);
      setActiveTab('distribucion');
      return false;
    }

    const totalPorcentaje = calcularTotalPorcentaje();
    if (totalPorcentaje !== 100) {
      toast.error(`La distribución debe sumar 100% (actual: ${totalPorcentaje}%)`);
      setActiveTab('distribucion');
      return false;
    }

    // Validar Tab 3 - Asignaturas
    if (formData.asignaturas.length === 0) {
      toast.error('Debes agregar al menos una asignatura');
      setActiveTab('asignaturas');
      return false;
    }

    // Validar Tab 4 - Objetivos
    if (!formData.objetivos_periodo.trim()) {
      toast.error('Por favor escribe los objetivos del periodo');
      setActiveTab('objetivos');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const ptaData = {
        ...formData,
        id: pta?.id || `PTA-${Date.now()}`,
        codigo: `PTA-${formData.periodo_nombre}-${Date.now().toString().slice(-4)}`,
        created_at: pta?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      onSuccess(ptaData);
      toast.success(
        modo === 'crear' 
          ? '¡PTA creado exitosamente!' 
          : '¡PTA actualizado exitosamente!'
      );
      onClose();
    } catch (error) {
      toast.error('Hubo un error al guardar el PTA');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'general' as TabType, label: 'General', icon: FileText },
    { id: 'distribucion' as TabType, label: 'Distribución', icon: Clock },
    { id: 'asignaturas' as TabType, label: 'Asignaturas', icon: BookOpen },
    { id: 'objetivos' as TabType, label: 'Objetivos', icon: Target }
  ];

  if (!isOpen) return null;

  const totalHoras = calcularTotalHoras();
  const totalPorcentaje = calcularTotalPorcentaje();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {modo === 'crear' ? 'Nuevo Plan de Trabajo Académico' : 'Editar PTA'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {modo === 'crear' 
                ? 'Completa la información para crear un nuevo PTA' 
                : 'Modifica la información del PTA'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex overflow-x-auto scrollbar-hide -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                    transition-colors border-b-2
                    ${isActive 
                      ? 'text-[#1e5da8] border-[#1e5da8]' 
                      : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* TAB 1: INFORMACIÓN GENERAL */}
              {activeTab === 'general' && (
                <div className="space-y-4">
                  {/* Docente */}
                  <div>
                    <Label htmlFor="docente" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                      <User className="w-4 h-4" />
                      Docente <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="docente"
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
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Territorial:</span> {formData.territorial}
                      </p>
                      {formData.departamento && (
                        <p className="text-sm text-gray-700 mt-1">
                          <span className="font-medium">Departamento:</span> {formData.departamento}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Periodo */}
                    <div>
                      <Label htmlFor="periodo" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Periodo Académico
                      </Label>
                      <select
                        id="periodo"
                        value={formData.periodo_nombre}
                        onChange={(e) => handleInputChange('periodo_nombre', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="2025-I">2025-I</option>
                        <option value="2025-II">2025-II</option>
                        <option value="2026-I">2026-I</option>
                      </select>
                    </div>

                    {/* Dedicación */}
                    <div>
                      <Label htmlFor="dedicacion" className="text-sm font-medium text-gray-700 mb-1.5">
                        Dedicación
                      </Label>
                      <select
                        id="dedicacion"
                        value={formData.dedicacion}
                        onChange={(e) => {
                          const dedicacion = e.target.value;
                          handleInputChange('dedicacion', dedicacion);
                          handleInputChange('horas_semanales', dedicacion === 'Tiempo Completo' ? 40 : dedicacion === 'Medio Tiempo' ? 20 : 10);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="Tiempo Completo">Tiempo Completo (40h)</option>
                        <option value="Medio Tiempo">Medio Tiempo (20h)</option>
                        <option value="Cátedra">Cátedra (10h)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Fecha Inicio */}
                    <div>
                      <Label htmlFor="periodo_inicio" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                        Fecha de Inicio <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="periodo_inicio"
                        type="date"
                        value={formData.periodo_inicio}
                        onChange={(e) => handleInputChange('periodo_inicio', e.target.value)}
                        className="w-full"
                      />
                    </div>

                    {/* Fecha Fin */}
                    <div>
                      <Label htmlFor="periodo_fin" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                        Fecha de Fin <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="periodo_fin"
                        type="date"
                        value={formData.periodo_fin}
                        onChange={(e) => handleInputChange('periodo_fin', e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DISTRIBUCIÓN DE TIEMPO */}
              {activeTab === 'distribucion' && (
                <div className="space-y-6">
                  {/* Resumen */}
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-700 mb-1">Horas Semanales Totales</p>
                        <p className={`text-3xl font-bold ${totalHoras === formData.horas_semanales ? 'text-green-600' : 'text-red-600'}`}>
                          {totalHoras}h / {formData.horas_semanales}h
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-700 mb-1">Porcentaje Total</p>
                        <p className={`text-3xl font-bold ${totalPorcentaje === 100 ? 'text-green-600' : 'text-red-600'}`}>
                          {totalPorcentaje}%
                        </p>
                      </div>
                    </div>
                    <Progress value={totalPorcentaje} className="h-3" />
                  </div>

                  {/* Componente de Enseñanza */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">Componente de Enseñanza</h3>
                      <Badge className="bg-blue-100 text-blue-700">
                        {formData.componente_ensenanza.horas}h ({formData.componente_ensenanza.porcentaje}%)
                      </Badge>
                    </div>
                    
                    <div className="mb-3">
                      <Label className="text-xs font-medium text-gray-700 mb-2">Horas semanales</Label>
                      <input
                        type="range"
                        min="0"
                        max={formData.horas_semanales}
                        value={formData.componente_ensenanza.horas}
                        onChange={(e) => handleComponenteChange('ensenanza', 'horas', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1e5da8]"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0h</span>
                        <span>{formData.horas_semanales}h</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-medium text-gray-700 mb-1">Actividades</Label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Ej: Dictado de clases presenciales"
                          value={nuevaActividadEnsenanza}
                          onChange={(e) => setNuevaActividadEnsenanza(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAgregarActividad('ensenanza', nuevaActividadEnsenanza, setNuevaActividadEnsenanza);
                            }
                          }}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          onClick={() => handleAgregarActividad('ensenanza', nuevaActividadEnsenanza, setNuevaActividadEnsenanza)}
                          size="sm"
                          className="bg-[#1e5da8] hover:bg-[#1a4d8f]"
                        >
                          Agregar
                        </Button>
                      </div>
                      {formData.componente_ensenanza.actividades.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {formData.componente_ensenanza.actividades.map((act, idx) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-center justify-between bg-blue-50 px-3 py-1 rounded">
                              <span>• {act}</span>
                              <button
                                onClick={() => handleRemoverActividad('ensenanza', idx)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Componente de Investigación */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">Componente de Investigación</h3>
                      <Badge className="bg-purple-100 text-purple-700">
                        {formData.componente_investigacion.horas}h ({formData.componente_investigacion.porcentaje}%)
                      </Badge>
                    </div>
                    
                    <div className="mb-3">
                      <Label className="text-xs font-medium text-gray-700 mb-2">Horas semanales</Label>
                      <input
                        type="range"
                        min="0"
                        max={formData.horas_semanales}
                        value={formData.componente_investigacion.horas}
                        onChange={(e) => handleComponenteChange('investigacion', 'horas', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1e5da8]"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0h</span>
                        <span>{formData.horas_semanales}h</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-medium text-gray-700 mb-1">Actividades</Label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Ej: Proyecto de investigación"
                          value={nuevaActividadInvestigacion}
                          onChange={(e) => setNuevaActividadInvestigacion(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAgregarActividad('investigacion', nuevaActividadInvestigacion, setNuevaActividadInvestigacion);
                            }
                          }}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          onClick={() => handleAgregarActividad('investigacion', nuevaActividadInvestigacion, setNuevaActividadInvestigacion)}
                          size="sm"
                          className="bg-[#1e5da8] hover:bg-[#1a4d8f]"
                        >
                          Agregar
                        </Button>
                      </div>
                      {formData.componente_investigacion.actividades.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {formData.componente_investigacion.actividades.map((act, idx) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-center justify-between bg-purple-50 px-3 py-1 rounded">
                              <span>• {act}</span>
                              <button
                                onClick={() => handleRemoverActividad('investigacion', idx)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Componente de Extensión */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">Componente de Extensión</h3>
                      <Badge className="bg-green-100 text-green-700">
                        {formData.componente_extension.horas}h ({formData.componente_extension.porcentaje}%)
                      </Badge>
                    </div>
                    
                    <div className="mb-3">
                      <Label className="text-xs font-medium text-gray-700 mb-2">Horas semanales</Label>
                      <input
                        type="range"
                        min="0"
                        max={formData.horas_semanales}
                        value={formData.componente_extension.horas}
                        onChange={(e) => handleComponenteChange('extension', 'horas', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1e5da8]"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0h</span>
                        <span>{formData.horas_semanales}h</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-medium text-gray-700 mb-1">Actividades</Label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Ej: Proyectos con comunidad"
                          value={nuevaActividadExtension}
                          onChange={(e) => setNuevaActividadExtension(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAgregarActividad('extension', nuevaActividadExtension, setNuevaActividadExtension);
                            }
                          }}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          onClick={() => handleAgregarActividad('extension', nuevaActividadExtension, setNuevaActividadExtension)}
                          size="sm"
                          className="bg-[#1e5da8] hover:bg-[#1a4d8f]"
                        >
                          Agregar
                        </Button>
                      </div>
                      {formData.componente_extension.actividades.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {formData.componente_extension.actividades.map((act, idx) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-center justify-between bg-green-50 px-3 py-1 rounded">
                              <span>• {act}</span>
                              <button
                                onClick={() => handleRemoverActividad('extension', idx)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Componente de Apoyo Institucional */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">Componente de Apoyo Institucional</h3>
                      <Badge className="bg-amber-100 text-amber-700">
                        {formData.componente_apoyo_institucional.horas}h ({formData.componente_apoyo_institucional.porcentaje}%)
                      </Badge>
                    </div>
                    
                    <div className="mb-3">
                      <Label className="text-xs font-medium text-gray-700 mb-2">Horas semanales</Label>
                      <input
                        type="range"
                        min="0"
                        max={formData.horas_semanales}
                        value={formData.componente_apoyo_institucional.horas}
                        onChange={(e) => handleComponenteChange('apoyo_institucional', 'horas', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1e5da8]"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0h</span>
                        <span>{formData.horas_semanales}h</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-medium text-gray-700 mb-1">Actividades</Label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Ej: Comités institucionales"
                          value={nuevaActividadApoyo}
                          onChange={(e) => setNuevaActividadApoyo(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAgregarActividad('apoyo_institucional', nuevaActividadApoyo, setNuevaActividadApoyo);
                            }
                          }}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          onClick={() => handleAgregarActividad('apoyo_institucional', nuevaActividadApoyo, setNuevaActividadApoyo)}
                          size="sm"
                          className="bg-[#1e5da8] hover:bg-[#1a4d8f]"
                        >
                          Agregar
                        </Button>
                      </div>
                      {formData.componente_apoyo_institucional.actividades.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {formData.componente_apoyo_institucional.actividades.map((act, idx) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-center justify-between bg-amber-50 px-3 py-1 rounded">
                              <span>• {act}</span>
                              <button
                                onClick={() => handleRemoverActividad('apoyo_institucional', idx)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ASIGNATURAS */}
              {activeTab === 'asignaturas' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      Agrega las asignaturas que dictarás durante el periodo
                    </p>
                  </div>

                  {/* Formulario para nueva asignatura */}
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h3 className="font-medium text-gray-900 mb-3">Nueva Asignatura</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div className="md:col-span-2">
                        <Label className="text-xs font-medium text-gray-700 mb-1">Nombre de la Asignatura</Label>
                        <Input
                          type="text"
                          placeholder="Ej: Administración Pública I"
                          value={nuevaAsignatura.nombre}
                          onChange={(e) => setNuevaAsignatura({...nuevaAsignatura, nombre: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-gray-700 mb-1">Grupo</Label>
                        <Input
                          type="text"
                          placeholder="Ej: A, B, 01"
                          value={nuevaAsignatura.grupo}
                          onChange={(e) => setNuevaAsignatura({...nuevaAsignatura, grupo: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-gray-700 mb-1">Estudiantes</Label>
                        <Input
                          type="number"
                          min="0"
                          value={nuevaAsignatura.estudiantes}
                          onChange={(e) => setNuevaAsignatura({...nuevaAsignatura, estudiantes: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-gray-700 mb-1">Horas/Semana</Label>
                        <Input
                          type="number"
                          min="0"
                          value={nuevaAsignatura.horas_semana}
                          onChange={(e) => setNuevaAsignatura({...nuevaAsignatura, horas_semana: parseInt(e.target.value) || 0})}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleAgregarAsignatura}
                      size="sm"
                      className="bg-[#1e5da8] hover:bg-[#1a4d8f] w-full"
                    >
                      + Agregar Asignatura
                    </Button>
                  </div>

                  {/* Lista de asignaturas */}
                  {formData.asignaturas.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-medium text-gray-900">Asignaturas Asignadas ({formData.asignaturas.length})</h3>
                      {formData.asignaturas.map((asignatura, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{asignatura.nombre}</p>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              <span>Grupo: {asignatura.grupo}</span>
                              <span>•</span>
                              <span>{asignatura.estudiantes} estudiantes</span>
                              <span>•</span>
                              <span>{asignatura.horas_semana}h/semana</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoverAsignatura(idx)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: OBJETIVOS Y ESTRATEGIAS */}
              {activeTab === 'objetivos' && (
                <div className="space-y-4">
                  {/* Objetivos */}
                  <div>
                    <Label className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Objetivos del Periodo *
                    </Label>
                    <textarea
                      rows={4}
                      value={formData.objetivos_periodo}
                      onChange={(e) => handleInputChange('objetivos_periodo', e.target.value)}
                      placeholder="Describe los objetivos principales que esperas alcanzar durante este periodo..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                    />
                  </div>

                  {/* Estrategias Pedagógicas */}
                  <div>
                    <Label className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Estrategias Pedagógicas
                    </Label>
                    <textarea
                      rows={4}
                      value={formData.estrategias_pedagogicas}
                      onChange={(e) => handleInputChange('estrategias_pedagogicas', e.target.value)}
                      placeholder="Describe las metodologías y estrategias que utilizarás..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                    />
                  </div>

                  {/* Recursos Requeridos */}
                  <div>
                    <Label className="text-sm font-medium text-gray-900 mb-2">
                      Recursos Requeridos
                    </Label>
                    <textarea
                      rows={3}
                      value={formData.recursos_requeridos}
                      onChange={(e) => handleInputChange('recursos_requeridos', e.target.value)}
                      placeholder="Lista los recursos que necesitarás (materiales, tecnológicos, etc.)..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                    />
                  </div>

                  {/* Indicadores de Logro */}
                  <div>
                    <Label className="text-sm font-medium text-gray-900 mb-2">
                      Indicadores de Logro
                    </Label>
                    <textarea
                      rows={3}
                      value={formData.indicadores_logro}
                      onChange={(e) => handleInputChange('indicadores_logro', e.target.value)}
                      placeholder="Define cómo medirás el cumplimiento de los objetivos..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
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

          <div className="flex items-center gap-2">
            {activeTab !== 'general' && (
              <Button
                variant="outline"
                onClick={() => {
                  const currentIndex = tabs.findIndex(t => t.id === activeTab);
                  if (currentIndex > 0) {
                    setActiveTab(tabs[currentIndex - 1].id);
                  }
                }}
                disabled={isSubmitting}
              >
                Anterior
              </Button>
            )}

            {activeTab !== 'objetivos' ? (
              <Button
                onClick={() => {
                  const currentIndex = tabs.findIndex(t => t.id === activeTab);
                  if (currentIndex < tabs.length - 1) {
                    setActiveTab(tabs[currentIndex + 1].id);
                  }
                }}
                className="bg-[#1e5da8] hover:bg-[#1a4d8f]"
                disabled={isSubmitting}
              >
                Siguiente
              </Button>
            ) : (
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
                    {modo === 'crear' ? 'Crear PTA' : 'Guardar Cambios'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}