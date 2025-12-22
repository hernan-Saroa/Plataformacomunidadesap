/**
 * ============================================
 * MÓDULO: PLAN ANUAL - DECRETO 648/2017
 * ============================================
 * 
 * RF001 - Crear Plan Anual con 5 Roles Obligatorios
 * 
 * ENFOQUE WORLD-CLASS:
 * - Usabilidad excepcional (flujo paso a paso)
 * - Diseño limpio y minimalista
 * - Sencillez en cada interacción
 * - Validaciones inteligentes en tiempo real
 * - Feedback visual inmediato
 * - Micro-animaciones elegantes
 * 
 * DECRETO 648/2017:
 * 1. Liderazgo Estratégico
 * 2. Enfoque Prevención
 * 3. Relación Entes Control
 * 4. Evaluación Gestión Riesgos
 * 5. Evaluación y Seguimiento
 * 
 * ÚLTIMA ACTUALIZACIÓN: 20 Diciembre 2025
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, CheckCircle, AlertCircle, ChevronRight, ChevronLeft,
  Plus, Trash2, User, Clock, Target, Shield, Eye, Edit, Save,
  Download, Send, X, Check, Info, HelpCircle, FileText, Users
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

interface Actividad {
  id: string;
  nombre: string;
  descripcion: string;
  responsableId: string;
  responsableNombre: string;
  fechaInicio: string;
  fechaFin: string;
  porcentaje: number;
  estado: 'Pendiente' | 'En Ejecución' | 'Completada' | 'Retrasada';
}

interface RolDecreto {
  id: number;
  nombre: string;
  descripcion: string;
  icono: string;
  color: string;
  actividades: Actividad[];
  obligatorio: boolean;
}

interface PlanAnual {
  id: string;
  año: number;
  estado: 'Borrador' | 'En Revisión' | 'Aprobado' | 'Vigente' | 'Cerrado';
  jefeOCI: {
    id: string;
    nombre: string;
    cargo: string;
  };
  roles: RolDecreto[];
  fechaCreacion: string;
  fechaAprobacion?: string;
  version: number;
}

interface Usuario {
  id: string;
  nombre: string;
  cargo: string;
  iniciales: string;
}

// ============ DATOS DECRETO 648/2017 ============

const ROLES_DECRETO_648: Omit<RolDecreto, 'actividades'>[] = [
  {
    id: 1,
    nombre: 'Liderazgo Estratégico',
    descripcion: 'Dirección y coordinación del sistema de control interno. Incluye la participación del Jefe OCI en comités y órganos de dirección.',
    icono: '👔',
    color: '#003DA5',
    obligatorio: true
  },
  {
    id: 2,
    nombre: 'Enfoque Prevención',
    descripcion: 'Diseño e implementación de controles preventivos. Identificación anticipada de riesgos y mejora continua de procesos.',
    icono: '🛡️',
    color: '#10B981',
    obligatorio: true
  },
  {
    id: 3,
    nombre: 'Relación Entes Control',
    descripcion: 'Coordinación con entes de control externos (CGR, Contraloría). Cumplimiento de requerimientos y colaboración institucional.',
    icono: '🤝',
    color: '#F59E0B',
    obligatorio: true
  },
  {
    id: 4,
    nombre: 'Evaluación Gestión Riesgos',
    descripcion: 'Evaluación del sistema de gestión de riesgos institucional. Análisis de mapas de riesgo y controles asociados.',
    icono: '⚠️',
    color: '#EF4444',
    obligatorio: true
  },
  {
    id: 5,
    nombre: 'Evaluación y Seguimiento',
    descripcion: 'Monitoreo de la efectividad del sistema de control interno. Seguimiento a planes de mejoramiento y hallazgos.',
    icono: '📊',
    color: '#8B5CF6',
    obligatorio: true
  }
];

// ============ USUARIOS MOCK ============

const USUARIOS_MOCK: Usuario[] = [
  { id: 'usr-001', nombre: 'Fernando Ávila García', cargo: 'Jefe OCI', iniciales: 'FA' },
  { id: 'usr-002', nombre: 'Catalina Rubio Silva', cargo: 'Auditor Líder', iniciales: 'CR' },
  { id: 'usr-003', nombre: 'Lucila Villamil Torres', cargo: 'Auditor Líder', iniciales: 'LV' },
  { id: 'usr-004', nombre: 'William Alonso Pérez', cargo: 'Auditor', iniciales: 'WA' },
  { id: 'usr-005', nombre: 'Alexandra Gómez López', cargo: 'Auditor', iniciales: 'AG' },
  { id: 'usr-006', nombre: 'Natalia Cañón Mora', cargo: 'Auditor', iniciales: 'NC' }
];

// ============ COMPONENTE PRINCIPAL ============

export function PlanAnualModule() {
  const [vistaActiva, setVistaActiva] = useState<'lista' | 'crear' | 'detalle' | 'editar'>('lista');
  const [planes, setPlanes] = useState<PlanAnual[]>([]);
  const [planActual, setPlanActual] = useState<PlanAnual | null>(null);
  const [mostrarModalAprobacion, setMostrarModalAprobacion] = useState(false);

  const handleCrearNuevo = () => {
    setVistaActiva('crear');
    setPlanActual(null);
  };

  const handleVerDetalle = (plan: PlanAnual) => {
    setPlanActual(plan);
    setVistaActiva('detalle');
  };

  const handleEditar = (plan: PlanAnual) => {
    setPlanActual(plan);
    setVistaActiva('editar');
  };

  const handleVolver = () => {
    setVistaActiva('lista');
    setPlanActual(null);
  };

  const handleGuardarPlan = (plan: PlanAnual) => {
    setPlanes(prev => [...prev, plan]);
    toast.success('Plan Anual creado exitosamente', {
      description: `Plan ${plan.año} guardado como borrador`
    });
    setVistaActiva('lista');
  };

  const handleActualizarPlan = (planActualizado: PlanAnual) => {
    setPlanes(prev => prev.map(p => p.id === planActualizado.id ? planActualizado : p));
    toast.success('Plan Anual actualizado', {
      description: `Los cambios se han guardado correctamente`
    });
    setVistaActiva('detalle');
    setPlanActual(planActualizado);
  };

  const handleAprobar = (plan: PlanAnual) => {
    setPlanActual(plan);
    setMostrarModalAprobacion(true);
  };

  const handleConfirmarAprobacion = () => {
    if (!planActual) return;

    const planAprobado: PlanAnual = {
      ...planActual,
      estado: 'Aprobado',
      fechaAprobacion: new Date().toLocaleDateString()
    };

    setPlanes(prev => prev.map(p => p.id === planAprobado.id ? planAprobado : p));
    setPlanActual(planAprobado);
    setMostrarModalAprobacion(false);

    toast.success('Plan Anual Aprobado', {
      description: `El Plan ${planAprobado.año} ha sido aprobado exitosamente`
    });
  };

  const handleExportarPDF = (plan: PlanAnual) => {
    toast.success('Generando PDF...', {
      description: 'El documento se descargará en unos segundos'
    });
    
    // Simular generación de PDF
    setTimeout(() => {
      toast.success('PDF generado correctamente', {
        description: `Plan_Anual_${plan.año}.pdf`
      });
    }, 2000);
  };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {vistaActiva === 'lista' && (
          <motion.div
            key="lista"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <ListaPlanesAnuales
              planes={planes}
              onCrearNuevo={handleCrearNuevo}
              onVerDetalle={handleVerDetalle}
              onEditar={handleEditar}
              onAprobar={handleAprobar}
              onExportarPDF={handleExportarPDF}
            />
          </motion.div>
        )}

        {vistaActiva === 'crear' && (
          <motion.div
            key="crear"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <CrearPlanAnual
              onVolver={handleVolver}
              onGuardar={handleGuardarPlan}
            />
          </motion.div>
        )}

        {vistaActiva === 'editar' && planActual && (
          <motion.div
            key="editar"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <CrearPlanAnual
              planExistente={planActual}
              onVolver={handleVolver}
              onGuardar={handleActualizarPlan}
            />
          </motion.div>
        )}

        {vistaActiva === 'detalle' && planActual && (
          <motion.div
            key="detalle"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <DetallePlanAnual
              plan={planActual}
              onVolver={handleVolver}
              onEditar={() => handleEditar(planActual)}
              onAprobar={() => handleAprobar(planActual)}
              onExportarPDF={() => handleExportarPDF(planActual)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE APROBACIÓN */}
      {mostrarModalAprobacion && planActual && (
        <ModalAprobacionPlan
          plan={planActual}
          onCerrar={() => setMostrarModalAprobacion(false)}
          onAprobar={handleConfirmarAprobacion}
        />
      )}
    </div>
  );
}

// ============ LISTA DE PLANES ANUALES ============

interface ListaPlanesAnualesProps {
  planes: PlanAnual[];
  onCrearNuevo: () => void;
  onVerDetalle: (plan: PlanAnual) => void;
  onEditar: (plan: PlanAnual) => void;
  onAprobar: (plan: PlanAnual) => void;
  onExportarPDF: (plan: PlanAnual) => void;
}

function ListaPlanesAnuales({ planes, onCrearNuevo, onVerDetalle, onEditar, onAprobar, onExportarPDF }: ListaPlanesAnualesProps) {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* ACCIÓN PRINCIPAL */}
      <div className="flex justify-end">
        <Button
          onClick={onCrearNuevo}
          className="gap-2 shadow-lg"
          style={{ background: '#003DA5' }}
          size="lg"
        >
          <Plus className="w-5 h-5" />
          Crear Plan Anual
        </Button>
      </div>

      {/* INFORMACIÓN DEL DECRETO */}
      <Card className="p-4 sm:p-5 md:p-6 border-l-4 border-l-blue-500 bg-blue-50/50">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 rounded-lg bg-blue-100 flex-shrink-0">
            <Info className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xs sm:text-sm text-gray-900 mb-2">
              📋 Decreto 648 de 2017 - Requisitos del Plan Anual
            </h3>
            <p className="text-xs sm:text-sm text-gray-700 mb-3">
              Todo Plan Anual de Control Interno debe contener <strong>exactamente 5 roles</strong> definidos 
              por el Decreto 648/2017. Cada rol debe tener al menos una actividad asignada con responsable y fechas.
            </p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {ROLES_DECRETO_648.map((rol) => (
                <Badge
                  key={rol.id}
                  className="text-[10px] sm:text-xs"
                  style={{ background: rol.color }}
                >
                  {rol.icono} {rol.nombre}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* LISTA DE PLANES */}
      {planes.length === 0 ? (
        <Card className="p-8 sm:p-10 md:p-12">
          <div className="text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
              No hay planes anuales creados
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6 max-w-md mx-auto">
              Crea tu primer Plan Anual de Control Interno cumpliendo con los requisitos del Decreto 648/2017
            </p>
            <Button
              onClick={onCrearNuevo}
              className="gap-2 w-full sm:w-auto"
              style={{ background: '#003DA5' }}
              size="lg"
            >
              <Plus className="w-5 h-5" />
              Crear Primer Plan Anual
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          {planes.map((plan) => (
            <Card
              key={plan.id}
              className="p-4 sm:p-5 md:p-6 hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-blue-300"
              onClick={() => onVerDetalle(plan)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-50">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-gray-900">
                      Plan {plan.año}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Versión {plan.version}
                    </p>
                  </div>
                </div>
                <Badge
                  className={`${
                    plan.estado === 'Aprobado'
                      ? 'bg-green-100 text-green-800'
                      : plan.estado === 'En Revisión'
                      ? 'bg-yellow-100 text-yellow-800'
                      : plan.estado === 'Vigente'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {plan.estado}
                </Badge>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">
                    {plan.jefeOCI.nombre}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">
                    {plan.roles.length} roles configurados
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">
                    {plan.roles.reduce((sum, rol) => sum + rol.actividades.length, 0)} actividades
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Creado: {plan.fechaCreacion}</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ CREAR PLAN ANUAL (WIZARD) ============

interface CrearPlanAnualProps {
  onVolver: () => void;
  onGuardar: (plan: PlanAnual) => void;
  planExistente?: PlanAnual;
}

function CrearPlanAnual({ onVolver, onGuardar, planExistente }: CrearPlanAnualProps) {
  const [paso, setPaso] = useState(1);
  const [año, setAño] = useState(planExistente ? planExistente.año : new Date().getFullYear() + 1);
  const [jefeOCI, setJefeOCI] = useState<Usuario | null>(planExistente ? planExistente.jefeOCI : null);
  const [roles, setRoles] = useState<RolDecreto[]>(
    ROLES_DECRETO_648.map(r => ({ ...r, actividades: planExistente ? planExistente.roles.find(p => p.id === r.id)?.actividades || [] : [] }))
  );
  const [rolActual, setRolActual] = useState(0);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const TOTAL_PASOS = 4;

  // Validaciones
  const validarPaso1 = () => {
    const nuevosErrores: Record<string, string> = {};
    
    if (!jefeOCI) {
      nuevosErrores.jefeOCI = 'Debes seleccionar el Jefe de OCI';
    }

    if (año < new Date().getFullYear()) {
      nuevosErrores.año = 'El año no puede ser menor al actual';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const validarPaso2 = () => {
    const rol = roles[rolActual];
    const nuevosErrores: Record<string, string> = {};

    if (rol.actividades.length === 0) {
      nuevosErrores.actividades = `El rol "${rol.nombre}" debe tener al menos 1 actividad`;
    }

    // Validar que todas las actividades tengan datos completos
    rol.actividades.forEach((act, idx) => {
      if (!act.nombre.trim()) {
        nuevosErrores[`actividad-${idx}-nombre`] = 'El nombre es obligatorio';
      }
      if (!act.responsableId) {
        nuevosErrores[`actividad-${idx}-responsable`] = 'Debes asignar un responsable';
      }
      if (!act.fechaInicio) {
        nuevosErrores[`actividad-${idx}-inicio`] = 'La fecha de inicio es obligatoria';
      }
      if (!act.fechaFin) {
        nuevosErrores[`actividad-${idx}-fin`] = 'La fecha de fin es obligatoria';
      }
      if (act.fechaInicio && act.fechaFin && act.fechaFin <= act.fechaInicio) {
        nuevosErrores[`actividad-${idx}-fechas`] = 'La fecha de fin debe ser posterior a la de inicio';
      }
    });

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSiguiente = () => {
    if (paso === 1) {
      if (!validarPaso1()) {
        toast.error('Datos incompletos', {
          description: 'Por favor completa todos los campos obligatorios'
        });
        return;
      }
      setPaso(2);
    } else if (paso === 2) {
      if (!validarPaso2()) {
        toast.error('Actividades incompletas', {
          description: 'Completa todos los datos de las actividades del rol actual'
        });
        return;
      }

      // Si es el último rol, ir al paso 3
      if (rolActual === roles.length - 1) {
        setPaso(3);
      } else {
        // Siguiente rol
        setRolActual(prev => prev + 1);
        setErrores({});
      }
    } else if (paso === 3) {
      setPaso(4);
    }
  };

  const handleAnterior = () => {
    if (paso === 2 && rolActual > 0) {
      setRolActual(prev => prev - 1);
      setErrores({});
    } else if (paso > 1) {
      setPaso(prev => prev - 1);
      if (paso === 3) {
        setRolActual(roles.length - 1);
      }
    }
  };

  const handleAgregarActividad = () => {
    const nuevaActividad: Actividad = {
      id: `act-${Date.now()}`,
      nombre: '',
      descripcion: '',
      responsableId: '',
      responsableNombre: '',
      fechaInicio: '',
      fechaFin: '',
      porcentaje: 0,
      estado: 'Pendiente'
    };

    setRoles(prev => {
      const nuevosRoles = [...prev];
      nuevosRoles[rolActual].actividades.push(nuevaActividad);
      return nuevosRoles;
    });
  };

  const handleEliminarActividad = (actividadId: string) => {
    setRoles(prev => {
      const nuevosRoles = [...prev];
      nuevosRoles[rolActual].actividades = nuevosRoles[rolActual].actividades.filter(
        a => a.id !== actividadId
      );
      return nuevosRoles;
    });
  };

  const handleActualizarActividad = (
    actividadId: string,
    campo: keyof Actividad,
    valor: any
  ) => {
    setRoles(prev => {
      const nuevosRoles = [...prev];
      const actividad = nuevosRoles[rolActual].actividades.find(a => a.id === actividadId);
      if (actividad) {
        (actividad as any)[campo] = valor;

        // Si se selecciona un responsable, actualizar también el nombre
        if (campo === 'responsableId') {
          const usuario = USUARIOS_MOCK.find(u => u.id === valor);
          if (usuario) {
            actividad.responsableNombre = usuario.nombre;
          }
        }
      }
      return nuevosRoles;
    });

    // Limpiar error de ese campo
    setErrores(prev => {
      const nuevosErrores = { ...prev };
      delete nuevosErrores[`actividad-${actividadId}-${campo}`];
      return nuevosErrores;
    });
  };

  const handleGuardarBorrador = () => {
    const nuevoPlan: PlanAnual = {
      id: `plan-${Date.now()}`,
      año,
      estado: 'Borrador',
      jefeOCI: {
        id: jefeOCI!.id,
        nombre: jefeOCI!.nombre,
        cargo: jefeOCI!.cargo
      },
      roles,
      fechaCreacion: new Date().toLocaleDateString(),
      version: 1
    };

    onGuardar(nuevoPlan);
  };

  const handleEnviarRevision = () => {
    const nuevoPlan: PlanAnual = {
      id: `plan-${Date.now()}`,
      año,
      estado: 'En Revisión',
      jefeOCI: {
        id: jefeOCI!.id,
        nombre: jefeOCI!.nombre,
        cargo: jefeOCI!.cargo
      },
      roles,
      fechaCreacion: new Date().toLocaleDateString(),
      version: 1
    };

    toast.success('Plan enviado a revisión', {
      description: 'El Jefe OCI recibirá una notificación para aprobar el plan'
    });

    onGuardar(nuevoPlan);
  };

  const progreso = (paso / TOTAL_PASOS) * 100;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* PROGRESO Y ACCIONES */}
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex-1">
            <p className="text-xs sm:text-sm font-bold text-gray-700">
              Paso {paso} de {TOTAL_PASOS} - {
                paso === 1 ? 'Información General' :
                paso === 2 ? `Configurar Rol ${rolActual + 1}/5` :
                paso === 3 ? 'Resumen y Validación' :
                'Confirmación'
              }
            </p>
          </div>

          <Button variant="outline" onClick={onVolver} className="gap-2" size="sm">
            <X className="w-4 h-4" />
            Cancelar
          </Button>
        </div>

        {/* Barra de progreso */}
        <div className="relative">
          <div className="h-1.5 sm:h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-600"
              initial={{ width: 0 }}
              animate={{ width: `${progreso}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {[1, 2, 3, 4].map((p) => (
              <div
                key={p}
                className={`text-[10px] sm:text-xs font-semibold ${
                  paso >= p ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <span className="hidden xs:inline">
                  {p === 1 && 'General'}
                  {p === 2 && '5 Roles'}
                  {p === 3 && 'Resumen'}
                  {p === 4 && 'Finalizar'}
                </span>
                <span className="xs:hidden">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* CONTENIDO DEL PASO */}
      <AnimatePresence mode="wait">
        {/* PASO 1: INFORMACIÓN GENERAL */}
        {paso === 1 && (
          <motion.div
            key="paso1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="p-6 sm:p-7 md:p-8">
              <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
                <div className="text-center mb-6 sm:mb-8">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-gray-900 mb-2">
                    Información General del Plan
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Define el año y el responsable del Plan Anual de Control Interno
                  </p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                    Año del Plan Anual *
                  </label>
                  <Input
                    type="number"
                    value={año}
                    onChange={(e) => {
                      setAño(parseInt(e.target.value));
                      setErrores(prev => {
                        const nuevos = { ...prev };
                        delete nuevos.año;
                        return nuevos;
                      });
                    }}
                    className={`text-base sm:text-lg font-bold ${errores.año ? 'border-red-500' : ''}`}
                    min={new Date().getFullYear()}
                  />
                  {errores.año && (
                    <p className="text-xs sm:text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errores.año}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                    Jefe de Oficina de Control Interno *
                  </label>
                  <select
                    value={jefeOCI?.id || ''}
                    onChange={(e) => {
                      const usuario = USUARIOS_MOCK.find(u => u.id === e.target.value);
                      setJefeOCI(usuario || null);
                      setErrores(prev => {
                        const nuevos = { ...prev };
                        delete nuevos.jefeOCI;
                        return nuevos;
                      });
                    }}
                    className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errores.jefeOCI ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Seleccionar Jefe OCI...</option>
                    {USUARIOS_MOCK.filter(u => u.cargo === 'Jefe OCI').map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre} - {u.cargo}
                      </option>
                    ))}
                  </select>
                  {errores.jefeOCI && (
                    <p className="text-xs sm:text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errores.jefeOCI}
                    </p>
                  )}
                </div>

                {jefeOCI && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback style={{ background: '#003DA5', color: 'white' }}>
                          {jefeOCI.iniciales}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs sm:text-sm text-gray-900">{jefeOCI.nombre}</p>
                        <p className="text-[10px] sm:text-xs text-gray-600">{jefeOCI.cargo}</p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    </div>
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* PASO 2: CONFIGURAR ROLES (5 ROLES) */}
        {paso === 2 && (
          <motion.div
            key="paso2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <PasoConfigurarRol
              rol={roles[rolActual]}
              numeroRol={rolActual + 1}
              totalRoles={roles.length}
              usuarios={USUARIOS_MOCK}
              errores={errores}
              onAgregarActividad={handleAgregarActividad}
              onEliminarActividad={handleEliminarActividad}
              onActualizarActividad={handleActualizarActividad}
            />
          </motion.div>
        )}

        {/* PASO 3: RESUMEN Y VALIDACIÓN */}
        {paso === 3 && (
          <motion.div
            key="paso3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ResumenPlan
              año={año}
              jefeOCI={jefeOCI!}
              roles={roles}
            />
          </motion.div>
        )}

        {/* PASO 4: CONFIRMACIÓN */}
        {paso === 4 && (
          <motion.div
            key="paso4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Card className="p-6 sm:p-8 md:p-10 lg:p-12">
              <div className="text-center max-w-2xl mx-auto">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-green-100 rounded-full flex items-center justify-center"
                >
                  <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" />
                </motion.div>

                <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-2 sm:mb-3">
                  ¡Plan Anual Listo!
                </h2>
                <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
                  Has completado exitosamente la configuración del Plan Anual {año} cumpliendo 
                  con todos los requisitos del Decreto 648/2017.
                </p>

                <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8">
                  <div className="p-3 sm:p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl sm:text-3xl font-black text-blue-600 mb-0.5 sm:mb-1">5</p>
                    <p className="text-[10px] sm:text-xs text-gray-600">Roles Configurados</p>
                  </div>
                  <div className="p-3 sm:p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl sm:text-3xl font-black text-green-600 mb-0.5 sm:mb-1">
                      {roles.reduce((sum, rol) => sum + rol.actividades.length, 0)}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-600">Actividades Totales</p>
                  </div>
                  <div className="p-3 sm:p-4 bg-purple-50 rounded-lg">
                    <p className="text-2xl sm:text-3xl font-black text-purple-600 mb-0.5 sm:mb-1">100%</p>
                    <p className="text-[10px] sm:text-xs text-gray-600">Cumplimiento</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                  <Button
                    variant="outline"
                    onClick={handleGuardarBorrador}
                    size="lg"
                    className="gap-2 w-full sm:w-auto"
                  >
                    <Save className="w-4 h-4" />
                    Guardar como Borrador
                  </Button>
                  <Button
                    onClick={handleEnviarRevision}
                    size="lg"
                    className="gap-2 w-full sm:w-auto"
                    style={{ background: '#003DA5' }}
                  >
                    <Send className="w-4 h-4" />
                    Enviar a Revisión
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NAVEGACIÓN */}
      {paso < 4 && (
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <Button
              variant="outline"
              onClick={handleAnterior}
              disabled={paso === 1 && rolActual === 0}
              className="gap-1 sm:gap-2"
              size="sm"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden xs:inline">Anterior</span>
            </Button>

            <div className="text-xs sm:text-sm text-gray-600 text-center">
              {paso === 2 && `Rol ${rolActual + 1} de ${roles.length}`}
            </div>

            <Button
              onClick={handleSiguiente}
              className="gap-1 sm:gap-2"
              style={{ background: '#003DA5' }}
              size="sm"
            >
              <span className="hidden xs:inline">{paso === 2 && rolActual < roles.length - 1 ? 'Siguiente Rol' : 'Continuar'}</span>
              <span className="xs:hidden">→</span>
              <ChevronRight className="w-4 h-4 hidden xs:inline" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============ PASO: CONFIGURAR ROL ============

interface PasoConfigurarRolProps {
  rol: RolDecreto;
  numeroRol: number;
  totalRoles: number;
  usuarios: Usuario[];
  errores: Record<string, string>;
  onAgregarActividad: () => void;
  onEliminarActividad: (id: string) => void;
  onActualizarActividad: (id: string, campo: keyof Actividad, valor: any) => void;
}

function PasoConfigurarRol({
  rol,
  numeroRol,
  totalRoles,
  usuarios,
  errores,
  onAgregarActividad,
  onEliminarActividad,
  onActualizarActividad
}: PasoConfigurarRolProps) {
  return (
    <Card className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4">
          <div
            className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg flex items-center justify-center text-2xl sm:text-3xl flex-shrink-0"
            style={{ background: `${rol.color}20` }}
          >
            {rol.icono}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
              <h2 className="text-base sm:text-lg md:text-xl font-black text-gray-900">
                {rol.nombre}
              </h2>
              <Badge style={{ background: rol.color }} className="text-[10px] sm:text-xs">
                Rol {numeroRol}/{totalRoles}
              </Badge>
              {rol.obligatorio && (
                <Badge className="bg-red-100 text-red-800 text-[10px] sm:text-xs">
                  Obligatorio
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-600">
              {rol.descripcion}
            </p>
          </div>
        </div>

        {errores.actividades && (
          <div className="p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-xs sm:text-sm text-red-700">{errores.actividades}</p>
          </div>
        )}
      </div>

      <div className="space-y-3 sm:space-y-4 mb-6">
        <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 xs:gap-3">
          <h3 className="font-bold text-xs sm:text-sm text-gray-900">
            Actividades del Rol ({rol.actividades.length})
          </h3>
          <Button
            onClick={onAgregarActividad}
            size="sm"
            variant="outline"
            className="gap-1.5 sm:gap-2 w-full xs:w-auto"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Agregar Actividad</span>
          </Button>
        </div>

        {rol.actividades.length === 0 ? (
          <div className="p-6 sm:p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
            <Target className="w-7 h-7 sm:w-8 sm:h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
              No hay actividades agregadas a este rol
            </p>
            <Button onClick={onAgregarActividad} size="sm" className="gap-2 w-full xs:w-auto">
              <Plus className="w-4 h-4" />
              Agregar Primera Actividad
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {rol.actividades.map((actividad, idx) => (
              <Card key={actividad.id} className="p-4 border-2 border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-4">
                    {/* Nombre */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Nombre de la Actividad *
                      </label>
                      <Input
                        value={actividad.nombre}
                        onChange={(e) => onActualizarActividad(actividad.id, 'nombre', e.target.value)}
                        placeholder="Ej: Participación en Comité de Coordinación del Control Interno"
                        className={errores[`actividad-${idx}-nombre`] ? 'border-red-500' : ''}
                      />
                      {errores[`actividad-${idx}-nombre`] && (
                        <p className="text-xs text-red-600 mt-1">{errores[`actividad-${idx}-nombre`]}</p>
                      )}
                    </div>

                    {/* Descripción */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Descripción (Opcional)
                      </label>
                      <textarea
                        value={actividad.descripcion}
                        onChange={(e) => onActualizarActividad(actividad.id, 'descripcion', e.target.value)}
                        placeholder="Describe brevemente el alcance de esta actividad..."
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {/* Responsable */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Responsable *
                        </label>
                        <select
                          value={actividad.responsableId}
                          onChange={(e) => onActualizarActividad(actividad.id, 'responsableId', e.target.value)}
                          className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            errores[`actividad-${idx}-responsable`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Seleccionar...</option>
                          {usuarios.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.nombre}
                            </option>
                          ))}
                        </select>
                        {errores[`actividad-${idx}-responsable`] && (
                          <p className="text-xs text-red-600 mt-1">{errores[`actividad-${idx}-responsable`]}</p>
                        )}
                      </div>

                      {/* Fecha Inicio */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Fecha Inicio *
                        </label>
                        <Input
                          type="date"
                          value={actividad.fechaInicio}
                          onChange={(e) => onActualizarActividad(actividad.id, 'fechaInicio', e.target.value)}
                          className={errores[`actividad-${idx}-inicio`] ? 'border-red-500' : ''}
                        />
                        {errores[`actividad-${idx}-inicio`] && (
                          <p className="text-xs text-red-600 mt-1">{errores[`actividad-${idx}-inicio`]}</p>
                        )}
                      </div>

                      {/* Fecha Fin */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Fecha Fin *
                        </label>
                        <Input
                          type="date"
                          value={actividad.fechaFin}
                          onChange={(e) => onActualizarActividad(actividad.id, 'fechaFin', e.target.value)}
                          className={errores[`actividad-${idx}-fin`] ? 'border-red-500' : ''}
                        />
                        {errores[`actividad-${idx}-fin`] && (
                          <p className="text-xs text-red-600 mt-1">{errores[`actividad-${idx}-fin`]}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEliminarActividad(actividad.id)}
                    className="flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// ============ RESUMEN DEL PLAN ============

interface ResumenPlanProps {
  año: number;
  jefeOCI: Usuario;
  roles: RolDecreto[];
}

function ResumenPlan({ año, jefeOCI, roles }: ResumenPlanProps) {
  const totalActividades = roles.reduce((sum, rol) => sum + rol.actividades.length, 0);
  const rolesCompletos = roles.filter(r => r.actividades.length > 0).length;

  return (
    <Card className="p-6 sm:p-7 md:p-8">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-2">
          Resumen del Plan Anual {año}
        </h2>
        <p className="text-xs sm:text-sm text-gray-600">
          Revisa toda la información antes de enviar a aprobación
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8">
        <Card className="p-3 sm:p-4 text-center border-2 border-blue-200">
          <p className="text-2xl sm:text-3xl font-black text-blue-600 mb-0.5 sm:mb-1">{rolesCompletos}/5</p>
          <p className="text-[10px] sm:text-xs text-gray-600">Roles Completos</p>
        </Card>
        <Card className="p-3 sm:p-4 text-center border-2 border-green-200">
          <p className="text-2xl sm:text-3xl font-black text-green-600 mb-0.5 sm:mb-1">{totalActividades}</p>
          <p className="text-[10px] sm:text-xs text-gray-600">Actividades Totales</p>
        </Card>
        <Card className="p-3 sm:p-4 text-center border-2 border-purple-200">
          <p className="text-2xl sm:text-3xl font-black text-purple-600 mb-0.5 sm:mb-1">
            {rolesCompletos === 5 ? '✅' : '⚠️'}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-600">
            {rolesCompletos === 5 ? 'Decreto 648 OK' : 'Incompleto'}
          </p>
        </Card>
      </div>

      {/* Información General */}
      <div className="mb-6">
        <h3 className="font-bold text-sm text-gray-900 mb-3">Información General</h3>
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Año del Plan</p>
              <p className="font-bold text-gray-900">{año}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Jefe OCI</p>
              <p className="font-bold text-gray-900">{jefeOCI.nombre}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Desglose por Rol */}
      <div>
        <h3 className="font-bold text-sm text-gray-900 mb-3">Desglose por Rol del Decreto 648</h3>
        <div className="space-y-3">
          {roles.map((rol) => (
            <Card
              key={rol.id}
              className="p-4 border-l-4"
              style={{ borderLeftColor: rol.color }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{rol.icono}</span>
                  <div>
                    <p className="font-bold text-sm text-gray-900">{rol.nombre}</p>
                    <p className="text-xs text-gray-600">{rol.actividades.length} actividades</p>
                  </div>
                </div>
                {rol.actividades.length > 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
              </div>

              {rol.actividades.length > 0 && (
                <div className="mt-3 space-y-2">
                  {rol.actividades.map((act) => (
                    <div key={act.id} className="text-xs bg-gray-50 p-2 rounded">
                      <p className="font-semibold text-gray-900">{act.nombre}</p>
                      <p className="text-gray-600 mt-1">
                        👤 {act.responsableNombre} • 📅 {act.fechaInicio} - {act.fechaFin}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ============ DETALLE DEL PLAN ============

interface DetallePlanAnualProps {
  plan: PlanAnual;
  onVolver: () => void;
  onEditar: () => void;
  onAprobar: () => void;
  onExportarPDF: () => void;
}

function DetallePlanAnual({ plan, onVolver, onEditar, onAprobar, onExportarPDF }: DetallePlanAnualProps) {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* ACCIONES */}
      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="outline" onClick={onVolver} className="gap-2" size="sm">
          <ChevronLeft className="w-4 h-4" />
          Volver
        </Button>
        <Button variant="outline" onClick={onExportarPDF} className="gap-2" size="sm">
          <Download className="w-4 h-4" />
          PDF
        </Button>
        <Button variant="outline" onClick={onEditar} className="gap-2" size="sm">
          <Edit className="w-4 h-4" />
          Editar
        </Button>
        <Button
          variant="outline"
          onClick={onAprobar}
          className="gap-2"
          size="sm"
          disabled={plan.estado !== 'En Revisión'}
        >
          <Check className="w-4 h-4" />
          Aprobar
        </Button>
      </div>

      {/* ESTADO Y JEFE OCI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-sm text-gray-900 mb-4">Estado del Plan</h3>
          <Badge
            className={`text-sm px-3 py-1 ${
              plan.estado === 'Aprobado'
                ? 'bg-green-100 text-green-800'
                : plan.estado === 'En Revisión'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {plan.estado}
          </Badge>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-sm text-gray-900 mb-4">Jefe OCI Responsable</h3>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback style={{ background: '#003DA5', color: 'white' }}>
                {plan.jefeOCI.nombre.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold text-sm text-gray-900">{plan.jefeOCI.nombre}</p>
              <p className="text-xs text-gray-600">{plan.jefeOCI.cargo}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ROLES Y ACTIVIDADES */}
      <Card className="p-6">
        <h3 className="font-bold text-lg text-gray-900 mb-6">
          Roles del Decreto 648/2017
        </h3>

        <div className="space-y-6">
          {plan.roles.map((rol) => (
            <div key={rol.id} className="border-l-4 pl-4" style={{ borderLeftColor: rol.color }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{rol.icono}</span>
                <div>
                  <h4 className="font-black text-sm text-gray-900">{rol.nombre}</h4>
                  <p className="text-xs text-gray-600">{rol.descripcion}</p>
                </div>
              </div>

              <div className="space-y-2">
                {rol.actividades.map((act) => (
                  <Card key={act.id} className="p-4 bg-gray-50">
                    <h5 className="font-bold text-sm text-gray-900 mb-2">{act.nombre}</h5>
                    {act.descripcion && (
                      <p className="text-xs text-gray-600 mb-3">{act.descripcion}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>👤 {act.responsableNombre}</span>
                      <span>📅 {act.fechaInicio} - {act.fechaFin}</span>
                      <Badge
                        className={`ml-auto ${
                          act.estado === 'Completada'
                            ? 'bg-green-100 text-green-800'
                            : act.estado === 'En Ejecución'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {act.estado}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============ MODAL DE APROBACIÓN ============

interface ModalAprobacionPlanProps {
  plan: PlanAnual;
  onCerrar: () => void;
  onAprobar: () => void;
}

function ModalAprobacionPlan({ plan, onCerrar, onAprobar }: ModalAprobacionPlanProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="p-6 sm:p-8 md:p-10 lg:p-12 max-w-2xl w-full">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-green-100 rounded-full flex items-center justify-center"
          >
            <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" />
          </motion.div>

          <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-2 sm:mb-3">
            Aprobar Plan Anual {plan.año}
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
            ¿Estás seguro de que deseas aprobar este Plan Anual? Una vez aprobado, no se podrán hacer cambios.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button
              variant="outline"
              onClick={onCerrar}
              size="lg"
              className="gap-2 w-full sm:w-auto"
            >
              <X className="w-4 h-4" />
              Cancelar
            </Button>
            <Button
              onClick={onAprobar}
              size="lg"
              className="gap-2 w-full sm:w-auto"
              style={{ background: '#003DA5' }}
            >
              <Check className="w-4 h-4" />
              Aprobar Plan
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}