/**
 * FORMULARIO DE CONSTRUCCIÓN DEL PTA
 * 
 * Formulario completo para crear/editar PTAs con los 5 componentes:
 * 1. Docencia
 * 2. Investigación
 * 3. Extensión Académica
 * 4. Actividades Complementarias
 * 5. Actividades Académico-Administrativas
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  FlaskConical, 
  Users, 
  Award, 
  Briefcase,
  Save,
  Send,
  AlertCircle,
  CheckCircle,
  Info,
  ChevronRight,
  ChevronDown,
  X
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { toast } from 'sonner';

// Importar componentes de formulario por componente
import { FormularioDocencia } from './FormularioDocencia';
import { FormularioInvestigacion } from './FormularioInvestigacion';
import { FormularioExtension } from './FormularioExtension';
import { FormularioComplementarias } from './FormularioComplementarias';
import { FormularioAdministrativas } from './FormularioAdministrativas';
import { PTAAlertaProrrateo } from './PTAAlertaProrrateo';

// Importar tipos y validaciones
import { validarPTA, REGLAS_VALIDACION_PTA } from '../../data/ptaEstadosYFlujo';
import { calcularPorcentaje, validarDistribucionComponentes } from '../../types/pta.types';

// Importar prorrateo
import { useProrrateoAutomatico } from '../../hooks/useProrrateoAutomatico';

interface FormularioPTAProps {
  pta?: any;
  modo: 'crear' | 'editar';
  horasProgramables: number;
  onGuardar: (pta: any) => void;
  onCancelar: () => void;
}

type ComponentePTA = 'docencia' | 'investigacion' | 'extension' | 'complementarias' | 'administrativas';

export function FormularioPTA({ 
  pta, 
  modo, 
  horasProgramables,
  onGuardar,
  onCancelar 
}: FormularioPTAProps) {
  
  // Estado del PTA en construcción
  const [ptaData, setPtaData] = useState({
    componenteDocencia: { horas: 0, porcentaje: 0, actividades: [] },
    componenteInvestigacion: { horas: 0, porcentaje: 0, actividades: [] },
    componenteExtension: { horas: 0, porcentaje: 0, actividades: [] },
    componenteComplementarias: { horas: 0, porcentaje: 0, actividades: [] },
    componenteAdministrativas: { horas: 0, porcentaje: 0, actividades: [] }
  });
  
  // Componente activo en edición
  const [componenteActivo, setComponenteActivo] = useState<ComponentePTA>('docencia');
  
  // Estado de validación
  const [erroresValidacion, setErroresValidacion] = useState<string[]>([]);
  const [advertenciasValidacion, setAdvertenciasValidacion] = useState<string[]>([]);
  
  // Cálculos en tiempo real
  const totalHoras = 
    ptaData.componenteDocencia.horas +
    ptaData.componenteInvestigacion.horas +
    ptaData.componenteExtension.horas +
    ptaData.componenteComplementarias.horas +
    ptaData.componenteAdministrativas.horas;
  
  const horasRestantes = horasProgramables - totalHoras;
  const progreso = (totalHoras / horasProgramables) * 100;
  
  // Prorrateo automático
  const {
    resultado: resultadoProrrateo,
    componentesAjustados,
    seAplicoProrrateo
  } = useProrrateoAutomatico({
    horasBase: horasProgramables,
    componentes: {
      docencia: ptaData.componenteDocencia.horas,
      investigacion: ptaData.componenteInvestigacion.horas,
      extension: ptaData.componenteExtension.horas,
      complementarias: ptaData.componenteComplementarias.horas,
      administrativas: ptaData.componenteAdministrativas.horas
    },
    ptaId: pta?.id,
    docenteId: pta?.docente_id,
    autoAplicar: true,
    onProrrateoAplicado: (resultado) => {
      if (resultado.seAplicoProrrateo) {
        toast.warning(
          `PTA ajustado automáticamente. Reducción de ${resultado.exceso.toFixed(0)}h aplicada.`,
          { duration: 5000 }
        );
      }
    }
  });
  
  // Cargar datos si está en modo edición
  useEffect(() => {
    if (modo === 'editar' && pta) {
      setPtaData({
        componenteDocencia: pta.componenteDocencia || { horas: 0, porcentaje: 0, actividades: [] },
        componenteInvestigacion: pta.componenteInvestigacion || { horas: 0, porcentaje: 0, actividades: [] },
        componenteExtension: pta.componenteExtension || { horas: 0, porcentaje: 0, actividades: [] },
        componenteComplementarias: pta.componenteComplementarias || { horas: 0, porcentaje: 0, actividades: [] },
        componenteAdministrativas: pta.componenteAdministrativas || { horas: 0, porcentaje: 0, actividades: [] }
      });
    }
  }, [modo, pta]);
  
  // Actualizar porcentajes cuando cambian las horas
  useEffect(() => {
    const actualizarPorcentajes = () => {
      if (horasProgramables === 0) return;
      
      setPtaData(prev => ({
        ...prev,
        componenteDocencia: {
          ...prev.componenteDocencia,
          porcentaje: calcularPorcentaje(prev.componenteDocencia.horas, horasProgramables)
        },
        componenteInvestigacion: {
          ...prev.componenteInvestigacion,
          porcentaje: calcularPorcentaje(prev.componenteInvestigacion.horas, horasProgramables)
        },
        componenteExtension: {
          ...prev.componenteExtension,
          porcentaje: calcularPorcentaje(prev.componenteExtension.horas, horasProgramables)
        },
        componenteComplementarias: {
          ...prev.componenteComplementarias,
          porcentaje: calcularPorcentaje(prev.componenteComplementarias.horas, horasProgramables)
        },
        componenteAdministrativas: {
          ...prev.componenteAdministrativas,
          porcentaje: calcularPorcentaje(prev.componenteAdministrativas.horas, horasProgramables)
        }
      }));
    };
    
    actualizarPorcentajes();
  }, [totalHoras, horasProgramables]);
  
  // Validar PTA en tiempo real
  useEffect(() => {
    const ptaCompleto = {
      ...pta,
      ...ptaData,
      horas_programables: horasProgramables
    };
    
    const resultado = validarPTA(ptaCompleto);
    setErroresValidacion(resultado.errores);
    setAdvertenciasValidacion(resultado.advertencias);
  }, [ptaData, horasProgramables]);
  
  // Handlers para actualizar componentes
  const handleActualizarComponente = (componente: ComponentePTA, data: any) => {
    setPtaData(prev => ({
      ...prev,
      [`componente${componente.charAt(0).toUpperCase() + componente.slice(1)}`]: data
    }));
  };
  
  // Handler para guardar borrador
  const handleGuardarBorrador = () => {
    const ptaCompleto = {
      ...pta,
      ...ptaData,
      estado: 'CONSTRUCCION',
      fecha_ultima_modificacion: new Date().toISOString()
    };
    
    onGuardar(ptaCompleto);
    toast.success('PTA guardado como borrador');
  };
  
  // Handler para enviar a aprobación
  const handleEnviarAprobacion = () => {
    // Validar antes de enviar
    const ptaCompleto = {
      ...pta,
      ...ptaData,
      horas_programables: horasProgramables
    };
    
    const resultado = validarPTA(ptaCompleto);
    
    if (!resultado.valido) {
      toast.error('El PTA tiene errores que deben corregirse antes de enviar');
      return;
    }
    
    if (confirm('¿Está seguro de enviar este PTA a aprobación? No podrá editarlo hasta que sea devuelto o aprobado.')) {
      const ptaEnviar = {
        ...ptaCompleto,
        estado: 'EN_APROBACION',
        fecha_envio_aprobacion: new Date().toISOString()
      };
      
      onGuardar(ptaEnviar);
      toast.success('PTA enviado a aprobación exitosamente');
    }
  };
  
  // Configuración de componentes
  const componentes: Array<{
    id: ComponentePTA;
    nombre: string;
    nombreCorto: string;
    icon: any;
    color: string;
    bgColor: string;
    descripcion: string;
    limiteMaximo?: number;
  }> = [
    {
      id: 'docencia',
      nombre: 'Componente de Docencia',
      nombreCorto: 'Docencia',
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      descripcion: 'Asignaturas y actividades de enseñanza'
    },
    {
      id: 'investigacion',
      nombre: 'Componente de Investigación',
      nombreCorto: 'Investigación',
      icon: FlaskConical,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      descripcion: 'Proyectos de investigación y producción académica',
      limiteMaximo: 50
    },
    {
      id: 'extension',
      nombre: 'Componente de Extensión',
      nombreCorto: 'Extensión',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      descripcion: 'Capacitación, asesorías y proyección social',
      limiteMaximo: 25
    },
    {
      id: 'complementarias',
      nombre: 'Actividades Complementarias',
      nombreCorto: 'Complementarias',
      icon: Award,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      descripcion: 'Comités, tutorías y desarrollo curricular'
    },
    {
      id: 'administrativas',
      nombre: 'Actividades Administrativas',
      nombreCorto: 'Administrativas',
      icon: Briefcase,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      descripcion: 'Cargos con descarga académica'
    }
  ];
  
  // Navegación entre componentes
  const navegarSiguiente = () => {
    const indiceActual = componentes.findIndex(c => c.id === componenteActivo);
    if (indiceActual < componentes.length - 1) {
      setComponenteActivo(componentes[indiceActual + 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  const navegarAnterior = () => {
    const indiceActual = componentes.findIndex(c => c.id === componenteActivo);
    if (indiceActual > 0) {
      setComponenteActivo(componentes[indiceActual - 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header con resumen */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {modo === 'crear' ? 'Crear Nuevo PTA' : 'Editar PTA'}
            </h2>
            <p className="text-gray-600">
              Complete todos los componentes del Plan de Trabajo Académico
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancelar}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Resumen de horas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Horas Programables</p>
            <p className="text-2xl font-bold text-gray-900">{horasProgramables}h</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Horas Asignadas</p>
            <p className="text-2xl font-bold text-blue-600">{totalHoras}h</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Horas Restantes</p>
            <p className={`text-2xl font-bold ${horasRestantes >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {horasRestantes}h
            </p>
          </div>
        </div>
        
        {/* Barra de progreso */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Progreso de asignación</p>
            <p className="text-sm font-bold text-gray-900">{progreso.toFixed(1)}%</p>
          </div>
          <Progress 
            value={Math.min(progreso, 100)} 
            className={`h-3 ${progreso > 100 ? 'bg-red-100' : ''}`}
          />
        </div>
        
        {/* Distribución por componente */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {componentes.map(comp => {
            const componenteKey = `componente${comp.id.charAt(0).toUpperCase() + comp.id.slice(1)}` as keyof typeof ptaData;
            const datos = ptaData[componenteKey];
            const Icon = comp.icon;
            
            return (
              <div key={comp.id} className="text-center">
                <div className={`w-12 h-12 rounded-full ${comp.bgColor} mx-auto mb-2 flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${comp.color}`} />
                </div>
                <p className="text-xs text-gray-600 mb-1">{comp.nombre}</p>
                <p className="text-sm font-bold text-gray-900">{datos.horas}h</p>
                <p className="text-xs text-gray-600">({datos.porcentaje.toFixed(1)}%)</p>
              </div>
            );
          })}
        </div>
        
        {/* Errores y advertencias */}
        {(erroresValidacion.length > 0 || advertenciasValidacion.length > 0) && (
          <div className="mt-4 space-y-2">
            {erroresValidacion.map((error, index) => (
              <div key={`error-${index}`} className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            ))}
            {advertenciasValidacion.map((advertencia, index) => (
              <div key={`adv-${index}`} className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-700">{advertencia}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
      
      {/* Alerta de Prorrateo Automático */}
      {resultadoProrrateo && (
        <PTAAlertaProrrateo 
          resultado={resultadoProrrateo} 
          mostrarSiempre={totalHoras > 0}
        />
      )}
      
      {/* Navegación por componentes */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {componentes.map(comp => {
          const Icon = comp.icon;
          const activo = componenteActivo === comp.id;
          const componenteKey = `componente${comp.id.charAt(0).toUpperCase() + comp.id.slice(1)}` as keyof typeof ptaData;
          const datos = ptaData[componenteKey];
          const tieneActividades = datos.actividades.length > 0;
          
          return (
            <button
              key={comp.id}
              onClick={() => setComponenteActivo(comp.id)}
              className={`p-4 rounded-lg border-2 transition-all ${
                activo 
                  ? `border-[#1e5da8] bg-blue-50` 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-5 h-5 ${activo ? 'text-[#1e5da8]' : 'text-gray-600'}`} />
                {tieneActividades && (
                  <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                )}
              </div>
              <p className={`text-sm font-medium ${activo ? 'text-[#1e5da8]' : 'text-gray-700'}`}>
                {comp.nombre}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {datos.actividades.length} actividades
              </p>
            </button>
          );
        })}
      </div>
      
      {/* Formulario del componente activo */}
      <AnimatePresence mode="wait">
        <motion.div
          key={componenteActivo}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {componenteActivo === 'docencia' && (
            <FormularioDocencia
              actividades={ptaData.componenteDocencia.actividades}
              horasProgramables={horasProgramables}
              horasRestantes={horasRestantes}
              onChange={(actividades, horas) => 
                handleActualizarComponente('docencia', { 
                  horas, 
                  porcentaje: calcularPorcentaje(horas, horasProgramables),
                  actividades 
                })
              }
            />
          )}
          
          {componenteActivo === 'investigacion' && (
            <FormularioInvestigacion
              actividades={ptaData.componenteInvestigacion.actividades}
              horasProgramables={horasProgramables}
              horasRestantes={horasRestantes}
              onChange={(actividades, horas) => 
                handleActualizarComponente('investigacion', { 
                  horas, 
                  porcentaje: calcularPorcentaje(horas, horasProgramables),
                  actividades 
                })
              }
            />
          )}
          
          {componenteActivo === 'extension' && (
            <FormularioExtension
              actividades={ptaData.componenteExtension.actividades}
              horasProgramables={horasProgramables}
              horasRestantes={horasRestantes}
              onChange={(actividades, horas) => 
                handleActualizarComponente('extension', { 
                  horas, 
                  porcentaje: calcularPorcentaje(horas, horasProgramables),
                  actividades 
                })
              }
            />
          )}
          
          {componenteActivo === 'complementarias' && (
            <FormularioComplementarias
              actividades={ptaData.componenteComplementarias.actividades}
              horasProgramables={horasProgramables}
              horasRestantes={horasRestantes}
              onChange={(actividades, horas) => 
                handleActualizarComponente('complementarias', { 
                  horas, 
                  porcentaje: calcularPorcentaje(horas, horasProgramables),
                  actividades 
                })
              }
            />
          )}
          
          {componenteActivo === 'administrativas' && (
            <FormularioAdministrativas
              actividades={ptaData.componenteAdministrativas.actividades}
              horasProgramables={horasProgramables}
              horasRestantes={horasRestantes}
              onChange={(actividades, horas) => 
                handleActualizarComponente('administrativas', { 
                  horas, 
                  porcentaje: calcularPorcentaje(horas, horasProgramables),
                  actividades 
                })
              }
            />
          )}
        </motion.div>
      </AnimatePresence>
      
      {/* Navegación entre componentes */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={navegarAnterior}
            disabled={componentes.findIndex(c => c.id === componenteActivo) === 0}
          >
            <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
            Anterior
          </Button>
          
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Componente {componentes.findIndex(c => c.id === componenteActivo) + 1} de {componentes.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {componentes.find(c => c.id === componenteActivo)?.descripcion}
            </p>
          </div>
          
          <Button
            variant="outline"
            onClick={navegarSiguiente}
            disabled={componentes.findIndex(c => c.id === componenteActivo) === componentes.length - 1}
          >
            Siguiente
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Card>
      
      {/* Acciones finales */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              {erroresValidacion.length > 0 
                ? `${erroresValidacion.length} errores deben corregirse antes de enviar`
                : 'PTA listo para enviar a aprobación'
              }
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onCancelar}>
              Cancelar
            </Button>
            <Button 
              variant="outline" 
              onClick={handleGuardarBorrador}
              disabled={totalHoras === 0}
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar Borrador
            </Button>
            <Button 
              onClick={handleEnviarAprobacion}
              disabled={erroresValidacion.length > 0 || totalHoras === 0}
              className="bg-[#1e5da8] hover:bg-[#1a4d8f]"
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar a Aprobación
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}