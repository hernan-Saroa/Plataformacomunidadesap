/**
 * Formulario Completo de Nuevo Proyecto AE
 * Formulario multi-paso con validaciones para crear proyectos MRAE
 */

import React, { useState } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Target,
  Database,
  Server,
  Laptop,
  UserCheck,
  Calendar,
  DollarSign,
  Users,
  FileText,
  Upload,
  AlertCircle,
  Trash2,
  Plus,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useForm } from 'react-hook-form@7.55.0';
import { toast } from 'sonner@2.0.3';

interface FormularioNuevoProyectoProps {
  onClose: () => void;
  onSubmit: (data: ProyectoFormData) => void;
}

interface ProyectoFormData {
  // Paso 1: Información General
  nombre: string;
  codigo: string;
  dominio: string;
  descripcion: string;
  objetivo: string;
  
  // Paso 2: Alcance y Recursos
  fechaInicio: string;
  fechaFin: string;
  presupuesto: string;
  sponsor: string;
  prioridad: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  
  // Paso 3: Equipo
  liderProyecto: string;
  equipoSeleccionado: string[];
  tamanioEquipo: number;
  
  // Paso 4: Artefactos y Documentación
  artefactosObjetivo: string[];
  documentosIniciales: File[];
}

const DOMINIOS_MRAE = [
  {
    id: 'estrategia-ti',
    nombre: 'Estrategia TI',
    icon: Target,
    color: 'from-blue-500 to-blue-600',
    descripcion: 'Alineación estratégica con objetivos institucionales'
  },
  {
    id: 'informacion',
    nombre: 'Información',
    icon: Database,
    color: 'from-purple-500 to-purple-600',
    descripcion: 'Gestión y gobierno de datos e información'
  },
  {
    id: 'sistemas-informacion',
    nombre: 'Sistemas de Información',
    icon: Server,
    color: 'from-green-500 to-green-600',
    descripcion: 'Aplicaciones y soluciones tecnológicas'
  },
  {
    id: 'servicios-tecnologicos',
    nombre: 'Servicios Tecnológicos',
    icon: Laptop,
    color: 'from-orange-500 to-orange-600',
    descripcion: 'Infraestructura y servicios de soporte'
  },
  {
    id: 'uso-apropiacion',
    nombre: 'Uso y Apropiación',
    icon: UserCheck,
    color: 'from-pink-500 to-pink-600',
    descripcion: 'Capacitación y adopción tecnológica'
  }
];

const ROLES_EQUIPO = [
  'Arquitecto TI',
  'Líder de Proyecto',
  'Analista de Procesos',
  'Consultor AE',
  'Arquitecto de Datos',
  'Arquitecto de Soluciones',
  'Desarrollador',
  'Analista de Negocio',
  'Scrum Master',
  'Product Owner',
  'Diseñador UX/UI',
  'Especialista en Seguridad',
  'DBA',
  'DevOps Engineer',
  'QA Tester'
];

const ARTEFACTOS_MRAE = [
  'PETI - Plan Estratégico de TI',
  'Mapa de Ruta Tecnológico',
  'Catálogo de Servicios TI',
  'Modelo de Arquitectura de Negocio',
  'Arquitectura de Información',
  'Arquitectura de Sistemas',
  'Arquitectura Tecnológica',
  'Matriz de Aplicaciones vs Procesos',
  'Inventario de Componentes',
  'Políticas de Gobierno TI',
  'Marco de Integración',
  'Plan de Continuidad TI',
  'Mapa de Capacidades',
  'Diccionario de Datos Corporativo'
];

export function FormularioNuevoProyecto({ onClose, onSubmit }: FormularioNuevoProyectoProps) {
  const [pasoActual, setPasoActual] = useState(1);
  const [documentosSubidos, setDocumentosSubidos] = useState<File[]>([]);
  const [artefactosSeleccionados, setArtefactosSeleccionados] = useState<string[]>([]);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<string[]>([]);
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    trigger
  } = useForm<ProyectoFormData>();

  const dominioSeleccionado = watch('dominio');
  const fechaInicio = watch('fechaInicio');
  const fechaFin = watch('fechaFin');

  const pasos = [
    { numero: 1, titulo: 'Información General', icon: FileText },
    { numero: 2, titulo: 'Alcance y Recursos', icon: Calendar },
    { numero: 3, titulo: 'Equipo de Trabajo', icon: Users },
    { numero: 4, titulo: 'Artefactos y Docs', icon: Upload }
  ];

  const handleSiguiente = async () => {
    let camposValidar: (keyof ProyectoFormData)[] = [];
    
    if (pasoActual === 1) {
      camposValidar = ['nombre', 'codigo', 'dominio', 'descripcion', 'objetivo'];
    } else if (pasoActual === 2) {
      camposValidar = ['fechaInicio', 'fechaFin', 'presupuesto', 'sponsor', 'prioridad'];
    } else if (pasoActual === 3) {
      camposValidar = ['liderProyecto'];
    }

    const isValid = await trigger(camposValidar);
    
    if (isValid) {
      if (pasoActual === 3 && equipoSeleccionado.length === 0) {
        toast.error('Debes seleccionar al menos un miembro del equipo');
        return;
      }
      setPasoActual(pasoActual + 1);
    } else {
      toast.error('Por favor completa todos los campos requeridos');
    }
  };

  const handleAnterior = () => {
    setPasoActual(pasoActual - 1);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const nuevosArchivos = Array.from(files);
      setDocumentosSubidos([...documentosSubidos, ...nuevosArchivos]);
      toast.success(`${nuevosArchivos.length} archivo(s) agregado(s)`);
    }
  };

  const handleRemoveFile = (index: number) => {
    setDocumentosSubidos(documentosSubidos.filter((_, i) => i !== index));
    toast.info('Archivo eliminado');
  };

  const toggleArtefacto = (artefacto: string) => {
    if (artefactosSeleccionados.includes(artefacto)) {
      setArtefactosSeleccionados(artefactosSeleccionados.filter(a => a !== artefacto));
    } else {
      setArtefactosSeleccionados([...artefactosSeleccionados, artefacto]);
    }
  };

  const toggleMiembroEquipo = (rol: string) => {
    if (equipoSeleccionado.includes(rol)) {
      setEquipoSeleccionado(equipoSeleccionado.filter(r => r !== rol));
    } else {
      setEquipoSeleccionado([...equipoSeleccionado, rol]);
    }
  };

  const onFormSubmit = (data: ProyectoFormData) => {
    const proyectoCompleto = {
      ...data,
      equipoSeleccionado,
      artefactosObjetivo: artefactosSeleccionados,
      documentosIniciales: documentosSubidos,
      tamanioEquipo: equipoSeleccionado.length
    };

    onSubmit(proyectoCompleto);
    onClose();
  };

  const calcularDuracion = () => {
    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      const diferencia = fin.getTime() - inicio.getTime();
      const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));
      const meses = Math.floor(dias / 30);
      return `${meses} meses (${dias} días)`;
    }
    return '-';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-black mb-2">Nuevo Proyecto AE</h2>
              <p className="text-blue-100">Crear proyecto de Arquitectura Empresarial - Marco MRAE MinTIC</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {pasos.map((paso, index) => {
              const Icon = paso.icon;
              const isCompleted = pasoActual > paso.numero;
              const isActive = pasoActual === paso.numero;
              
              return (
                <React.Fragment key={paso.numero}>
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                      isCompleted 
                        ? 'bg-green-500 text-white' 
                        : isActive 
                        ? 'bg-white text-[#003DA5]' 
                        : 'bg-white/20 text-white/60'
                    }`}>
                      {isCompleted ? (
                        <Check className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <span className={`text-xs font-semibold ${
                      isActive ? 'text-white' : 'text-white/60'
                    }`}>
                      {paso.titulo}
                    </span>
                  </div>
                  {index < pasos.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 mb-6 rounded-full ${
                      isCompleted ? 'bg-green-500' : 'bg-white/20'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit(onFormSubmit)} className="flex-1 overflow-y-auto">
          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* Paso 1: Información General */}
              {pasoActual === 1 && (
                <motion.div
                  key="paso1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-6 h-6 text-[#003DA5]" />
                      Información General del Proyecto
                    </h3>
                  </div>

                  {/* Código y Nombre */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Código del Proyecto *
                      </label>
                      <input
                        type="text"
                        {...register('codigo', { 
                          required: 'El código es requerido',
                          pattern: {
                            value: /^AE-\d{3}$/,
                            message: 'Formato: AE-001'
                          }
                        })}
                        placeholder="AE-005"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
                      />
                      {errors.codigo && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.codigo.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nombre del Proyecto *
                      </label>
                      <input
                        type="text"
                        {...register('nombre', { 
                          required: 'El nombre es requerido',
                          minLength: {
                            value: 10,
                            message: 'Mínimo 10 caracteres'
                          }
                        })}
                        placeholder="Ej: Actualización PETI 2025-2028"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
                      />
                      {errors.nombre && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.nombre.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Dominio MRAE */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Dominio MRAE MinTIC *
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {DOMINIOS_MRAE.map(dominio => {
                        const Icon = dominio.icon;
                        return (
                          <label
                            key={dominio.id}
                            className={`relative flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                              dominioSeleccionado === dominio.id
                                ? 'border-[#003DA5] bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              value={dominio.id}
                              {...register('dominio', { required: 'Debes seleccionar un dominio' })}
                              className="sr-only"
                            />
                            <div className={`p-2 rounded-lg mr-3 bg-gradient-to-br ${dominio.color}`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-gray-900 text-sm">{dominio.nombre}</div>
                              <div className="text-xs text-gray-600 mt-1">{dominio.descripcion}</div>
                            </div>
                            {dominioSeleccionado === dominio.id && (
                              <div className="absolute top-2 right-2">
                                <div className="w-6 h-6 bg-[#003DA5] rounded-full flex items-center justify-center">
                                  <Check className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            )}
                          </label>
                        );
                      })}
                    </div>
                    {errors.dominio && (
                      <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.dominio.message}
                      </p>
                    )}
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Descripción del Proyecto *
                    </label>
                    <textarea
                      {...register('descripcion', { 
                        required: 'La descripción es requerida',
                        minLength: {
                          value: 50,
                          message: 'Mínimo 50 caracteres'
                        }
                      })}
                      rows={4}
                      placeholder="Describe el alcance, contexto y justificación del proyecto..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent resize-none"
                    />
                    {errors.descripcion && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.descripcion.message}
                      </p>
                    )}
                  </div>

                  {/* Objetivo */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Objetivo Principal *
                    </label>
                    <textarea
                      {...register('objetivo', { 
                        required: 'El objetivo es requerido',
                        minLength: {
                          value: 30,
                          message: 'Mínimo 30 caracteres'
                        }
                      })}
                      rows={3}
                      placeholder="Define el objetivo principal y los resultados esperados..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent resize-none"
                    />
                    {errors.objetivo && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.objetivo.message}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Paso 2: Alcance y Recursos */}
              {pasoActual === 2 && (
                <motion.div
                  key="paso2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                      <Calendar className="w-6 h-6 text-[#003DA5]" />
                      Alcance y Recursos
                    </h3>
                  </div>

                  {/* Fechas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Fecha de Inicio *
                      </label>
                      <input
                        type="date"
                        {...register('fechaInicio', { required: 'La fecha de inicio es requerida' })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
                      />
                      {errors.fechaInicio && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.fechaInicio.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Fecha de Finalización *
                      </label>
                      <input
                        type="date"
                        {...register('fechaFin', { 
                          required: 'La fecha de fin es requerida',
                          validate: value => {
                            if (fechaInicio && value <= fechaInicio) {
                              return 'Debe ser posterior a la fecha de inicio';
                            }
                            return true;
                          }
                        })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
                      />
                      {errors.fechaFin && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.fechaFin.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Duración calculada */}
                  {fechaInicio && fechaFin && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-700">
                        <Sparkles className="w-5 h-5" />
                        <span className="font-semibold">Duración calculada: {calcularDuracion()}</span>
                      </div>
                    </div>
                  )}

                  {/* Presupuesto y Sponsor */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Presupuesto Estimado *
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          {...register('presupuesto', { required: 'El presupuesto es requerido' })}
                          placeholder="Ej: $350M COP"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
                        />
                      </div>
                      {errors.presupuesto && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.presupuesto.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Sponsor del Proyecto *
                      </label>
                      <input
                        type="text"
                        {...register('sponsor', { required: 'El sponsor es requerido' })}
                        placeholder="Ej: CIO / Director TI"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
                      />
                      {errors.sponsor && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.sponsor.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Prioridad */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Prioridad del Proyecto *
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {['Baja', 'Media', 'Alta', 'Crítica'].map(nivel => (
                        <label
                          key={nivel}
                          className="relative flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-gray-300"
                        >
                          <input
                            type="radio"
                            value={nivel}
                            {...register('prioridad', { required: 'La prioridad es requerida' })}
                            className="sr-only"
                          />
                          <span className={`text-center font-bold ${
                            nivel === 'Baja' ? 'text-blue-600' :
                            nivel === 'Media' ? 'text-yellow-600' :
                            nivel === 'Alta' ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            {nivel}
                          </span>
                        </label>
                      ))}
                    </div>
                    {errors.prioridad && (
                      <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.prioridad.message}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Paso 3: Equipo */}
              {pasoActual === 3 && (
                <motion.div
                  key="paso3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-6 h-6 text-[#003DA5]" />
                      Equipo de Trabajo
                    </h3>
                  </div>

                  {/* Líder del Proyecto */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Líder del Proyecto *
                    </label>
                    <input
                      type="text"
                      {...register('liderProyecto', { required: 'El líder es requerido' })}
                      placeholder="Nombre completo del líder"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
                    />
                    {errors.liderProyecto && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.liderProyecto.message}
                      </p>
                    )}
                  </div>

                  {/* Selección de Equipo */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Roles del Equipo (Selecciona los roles necesarios)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1">
                      {ROLES_EQUIPO.map(rol => (
                        <label
                          key={rol}
                          className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                            equipoSeleccionado.includes(rol)
                              ? 'border-[#003DA5] bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={equipoSeleccionado.includes(rol)}
                            onChange={() => toggleMiembroEquipo(rol)}
                            className="sr-only"
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              equipoSeleccionado.includes(rol)
                                ? 'border-[#003DA5] bg-[#003DA5]'
                                : 'border-gray-300'
                            }`}>
                              {equipoSeleccionado.includes(rol) && (
                                <Check className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <span className="text-sm font-medium text-gray-900">{rol}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Resumen de Equipo */}
                  {equipoSeleccionado.length > 0 && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700 mb-2">
                        <Users className="w-5 h-5" />
                        <span className="font-semibold">Equipo seleccionado: {equipoSeleccionado.length} roles</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {equipoSeleccionado.map(rol => (
                          <span key={rol} className="px-2 py-1 bg-white text-green-700 rounded text-xs font-semibold">
                            {rol}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Paso 4: Artefactos y Documentos */}
              {pasoActual === 4 && (
                <motion.div
                  key="paso4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                      <Upload className="w-6 h-6 text-[#003DA5]" />
                      Artefactos MRAE y Documentación
                    </h3>
                  </div>

                  {/* Artefactos Objetivo */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Artefactos MRAE a Generar
                    </label>
                    <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto p-1">
                      {ARTEFACTOS_MRAE.map(artefacto => (
                        <label
                          key={artefacto}
                          className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                            artefactosSeleccionados.includes(artefacto)
                              ? 'border-[#003DA5] bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={artefactosSeleccionados.includes(artefacto)}
                            onChange={() => toggleArtefacto(artefacto)}
                            className="sr-only"
                          />
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              artefactosSeleccionados.includes(artefacto)
                                ? 'border-[#003DA5] bg-[#003DA5]'
                                : 'border-gray-300'
                            }`}>
                              {artefactosSeleccionados.includes(artefacto) && (
                                <Check className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <span className="text-sm font-medium text-gray-900">{artefacto}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Documentos Iniciales */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Documentos Iniciales (Opcional)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#003DA5] transition-colors">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm font-semibold text-gray-700 mb-1">
                          Haz clic para cargar archivos
                        </p>
                        <p className="text-xs text-gray-500">
                          PDF, DOCX, XLSX, PPT (máx. 10MB c/u)
                        </p>
                      </label>
                    </div>

                    {/* Lista de Archivos */}
                    {documentosSubidos.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-semibold text-gray-700">
                          Archivos cargados ({documentosSubidos.length})
                        </p>
                        {documentosSubidos.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-blue-600" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {(file.size / 1024).toFixed(2)} KB
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(index)}
                              className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Resumen */}
                  {artefactosSeleccionados.length > 0 && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center gap-2 text-purple-700 mb-2">
                        <Target className="w-5 h-5" />
                        <span className="font-semibold">
                          {artefactosSeleccionados.length} artefactos MRAE seleccionados
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer con Botones */}
          <div className="border-t border-gray-200 p-6 bg-gray-50 flex items-center justify-between">
            <button
              type="button"
              onClick={handleAnterior}
              disabled={pasoActual === 1}
              className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                pasoActual === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              Anterior
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">
                Paso {pasoActual} de {pasos.length}
              </span>
            </div>

            {pasoActual < pasos.length ? (
              <button
                type="button"
                onClick={handleSiguiente}
                className="px-6 py-3 bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
              >
                Siguiente
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="submit"
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-bold hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                Crear Proyecto
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}