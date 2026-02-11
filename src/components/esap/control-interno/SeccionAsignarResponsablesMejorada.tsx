/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SECCIÓN ASIGNAR RESPONSABLES - VERSIÓN MEJORADA
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Clarifica la diferencia entre:
 * - RESPONSABLE PRINCIPAL: Asignado en la creación del plan (no modificable)
 * - RESPONSABLES DE APOYO: Agregables desde esta sección
 * 
 * ✅ MEJORAS IMPLEMENTADAS:
 * - Distinción visual clara entre responsable principal y de apoyo
 * - Indica que el responsable principal fue asignado en la programación
 * - Permite agregar/quitar responsables de apoyo
 * - Diseño responsive y touch-friendly
 * - Validaciones mejoradas
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Shield, CheckCircle2, AlertCircle, Plus, X, 
  UserCheck, UserPlus, Info, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS (deben coincidir con el archivo principal)
// ════════════════════════════════════════════════════════════════════════════

interface Auditor {
  id: string;
  nombre: string;
  cargo: string;
  email: string;
}

interface Actividad {
  id: number;
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  responsable: Auditor | null; // RESPONSABLE PRINCIPAL - Asignado en programación
  responsablesApoyo?: Auditor[]; // Responsables adicionales de apoyo
  porcentajeAvance: number;
  estado: string;
  control: string;
  evaluacion: string;
  seguimiento: string;
}

interface Rol {
  numero: number;
  nombre: string;
  color: string;
  icono: string;
  descripcion: string;
  actividades: Actividad[];
}

interface PlanAnual {
  id: string;
  vigencia: number;
  version: number;
  estado: string;
  jefeOCI: Auditor;
  fechaCreacion: string;
  fechaAprobacion: string | null;
  actaCICC: string | null;
  roles: Rol[];
}

// Mock de auditores (debe coincidir con el principal)
const AUDITORES: Auditor[] = [
  { id: '1', nombre: 'Mario Oswaldo Bernal', cargo: 'Jefe de Control Interno', email: 'mario.bernal@esap.edu.co' },
  { id: '2', nombre: 'Ana María López', cargo: 'Auditora sénior', email: 'ana.lopez@esap.edu.co' },
  { id: '3', nombre: 'Carlos Mendoza', cargo: 'Auditor', email: 'carlos.mendoza@esap.edu.co' },
  { id: '4', nombre: 'Laura Rodríguez', cargo: 'Auditora', email: 'laura.rodriguez@esap.edu.co' },
  { id: '5', nombre: 'Juan Pablo García', cargo: 'Auditor júnior', email: 'juan.garcia@esap.edu.co' }
];

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

interface SeccionAsignarResponsablesMejoradaProps {
  plan: PlanAnual;
  onActualizar: (plan: PlanAnual) => void;
}

export function SeccionAsignarResponsablesMejorada({ 
  plan, 
  onActualizar 
}: SeccionAsignarResponsablesMejoradaProps) {
  const [rolExpandido, setRolExpandido] = useState<number | null>(null);
  const [actividadGestionando, setActividadGestionando] = useState<{
    rolNumero: number;
    actividadId: number;
  } | null>(null);

  // Calcular estadísticas generales
  const estadisticasGenerales = {
    totalActividades: plan.roles.reduce((sum, rol) => sum + rol.actividades.length, 0),
    conResponsablePrincipal: plan.roles.reduce((sum, rol) => 
      sum + rol.actividades.filter(a => a.responsable !== null).length, 0
    ),
    conApoyos: plan.roles.reduce((sum, rol) => 
      sum + rol.actividades.filter(a => (a.responsablesApoyo?.length || 0) > 0).length, 0
    ),
    totalApoyos: plan.roles.reduce((sum, rol) => 
      sum + rol.actividades.reduce((aSum, a) => aSum + (a.responsablesApoyo?.length || 0), 0), 0
    )
  };

  // Agregar responsable de apoyo
  const agregarResponsableApoyo = (
    rolNumero: number, 
    actividadId: number, 
    auditorId: string
  ) => {
    const auditor = AUDITORES.find(a => a.id === auditorId);
    if (!auditor) return;

    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                // Validaciones
                const esPrincipal = act.responsable?.id === auditor.id;
                const yaEsApoyo = (act.responsablesApoyo || []).some(r => r.id === auditor.id);

                if (esPrincipal) {
                  toast.error('Ya es responsable principal', {
                    description: `${auditor.nombre} ya está asignado como responsable principal de esta actividad`
                  });
                  return act;
                }

                if (yaEsApoyo) {
                  toast.error('Ya es responsable de apoyo', {
                    description: `${auditor.nombre} ya está en el equipo de apoyo de esta actividad`
                  });
                  return act;
                }

                // Agregar
                return {
                  ...act,
                  responsablesApoyo: [
                    ...(act.responsablesApoyo || []),
                    auditor
                  ]
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    toast.success('Responsable de apoyo agregado', {
      description: `${auditor.nombre} se agregó al equipo de apoyo`,
      icon: '🤝'
    });
  };

  // Eliminar responsable de apoyo
  const eliminarResponsableApoyo = (
    rolNumero: number,
    actividadId: number,
    auditorId: string
  ) => {
    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                return {
                  ...act,
                  responsablesApoyo: (act.responsablesApoyo || []).filter(r => r.id !== auditorId)
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    toast.success('Responsable de apoyo eliminado');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* ══════════════════════════════════════════════════════════════════════
          PANEL INFORMATIVO
          ══════════════════════════════════════════════════════════════════════ */}
      
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Info className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-lg mb-2">
              Gestión de Responsables
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <span>
                  <span className="font-semibold text-blue-700">Responsable Principal:</span> Fue asignado durante la creación del plan. Este responsable NO puede modificarse desde aquí, ya que forma parte de la programación inicial del plan anual.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <span>
                  <span className="font-semibold text-purple-700">Responsables de Apoyo:</span> Pueden agregarse en cualquier momento desde esta sección para conformar equipos de trabajo colaborativo.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ESTADÍSTICAS GENERALES
          ══════════════════════════════════════════════════════════════════════ */}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total actividades</span>
            <Shield className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{estadisticasGenerales.totalActividades}</p>
        </div>

        <div className="bg-white border-2 border-blue-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-blue-700">Con responsable principal</span>
            <UserCheck className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-700">{estadisticasGenerales.conResponsablePrincipal}</p>
          <p className="text-xs text-gray-600 mt-1">
            {Math.round((estadisticasGenerales.conResponsablePrincipal / estadisticasGenerales.totalActividades) * 100)}% del total
          </p>
        </div>

        <div className="bg-white border-2 border-purple-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-purple-700">Con equipos de apoyo</span>
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-purple-700">{estadisticasGenerales.conApoyos}</p>
          <p className="text-xs text-gray-600 mt-1">
            {estadisticasGenerales.totalApoyos} auditor{estadisticasGenerales.totalApoyos !== 1 ? 'es' : ''} en total
          </p>
        </div>

        <div className="bg-white border-2 border-green-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-green-700">Sin asignar</span>
            <AlertCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-700">
            {estadisticasGenerales.totalActividades - estadisticasGenerales.conResponsablePrincipal}
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ROLES Y ACTIVIDADES
          ══════════════════════════════════════════════════════════════════════ */}

      {plan.roles.map((rol) => {
        const isExpanded = rolExpandido === rol.numero;
        const actividadesConPrincipal = rol.actividades.filter(a => a.responsable !== null).length;
        const actividadesConApoyo = rol.actividades.filter(a => (a.responsablesApoyo?.length || 0) > 0).length;

        return (
          <div 
            key={rol.numero} 
            className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Header del rol */}
            <div
              className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setRolExpandido(isExpanded ? null : rol.numero)}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                  style={{ backgroundColor: rol.color + '20' }}
                >
                  {rol.icono}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">
                    Rol {rol.numero}: {rol.nombre}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-gray-600">
                      {rol.actividades.length} actividad{rol.actividades.length !== 1 ? 'es' : ''}
                    </span>
                    <span className="flex items-center gap-1 text-blue-700">
                      <UserCheck className="w-4 h-4" />
                      {actividadesConPrincipal} con principal
                    </span>
                    <span className="flex items-center gap-1 text-purple-700">
                      <Users className="w-4 h-4" />
                      {actividadesConApoyo} con apoyo
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div 
                    className="text-2xl font-bold mb-1"
                    style={{ color: rol.color }}
                  >
                    {Math.round((actividadesConPrincipal / rol.actividades.length) * 100)}%
                  </div>
                  <div className="text-xs text-gray-600">asignado</div>
                </div>
                
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-shrink-0"
                >
                  <ChevronDown className="w-6 h-6 text-gray-600" />
                </motion.div>
              </div>
            </div>

            {/* Lista de actividades */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 space-y-4 border-t-2 border-gray-200 bg-gray-50/50">
                    <div className="pt-4" /> {/* Espaciador */}
                    
                    {rol.actividades.map((actividad, index) => {
                      const estaGestionando = actividadGestionando?.rolNumero === rol.numero && 
                                             actividadGestionando?.actividadId === actividad.id;
                      const tieneApoyo = (actividad.responsablesApoyo?.length || 0) > 0;

                      return (
                        <motion.div
                          key={actividad.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
                        >
                          {/* Información de la actividad */}
                          <div className="flex items-start gap-3 mb-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 mb-1">{actividad.nombre}</h4>
                              <p className="text-sm text-gray-600 mb-2">{actividad.descripcion}</p>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                <span>📅 {new Date(actividad.fechaInicio).toLocaleDateString('es-CO')} - {new Date(actividad.fechaFin).toLocaleDateString('es-CO')}</span>
                              </div>
                            </div>
                          </div>

                          {/* Responsable Principal */}
                          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-3">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <UserCheck className="w-5 h-5 text-blue-600" />
                                <span className="font-semibold text-blue-900 text-sm">
                                  Responsable Principal
                                </span>
                                <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                                  Programación inicial
                                </span>
                              </div>
                            </div>
                            
                            {actividad.responsable ? (
                              <div className="flex items-center gap-3 bg-white border border-blue-300 rounded-lg p-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <span className="text-lg">👤</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900">{actividad.responsable.nombre}</p>
                                  <p className="text-xs text-gray-600">{actividad.responsable.cargo}</p>
                                </div>
                                <div className="flex-shrink-0">
                                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-3">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span>
                                  <span className="font-semibold">Sin asignar:</span> El responsable principal debe asignarse durante la creación del plan.
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Responsables de Apoyo */}
                          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-purple-600" />
                                <span className="font-semibold text-purple-900 text-sm">
                                  Responsables de Apoyo ({actividad.responsablesApoyo?.length || 0})
                                </span>
                              </div>
                              <button
                                onClick={() => setActividadGestionando(
                                  estaGestionando ? null : { rolNumero: rol.numero, actividadId: actividad.id }
                                )}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors min-h-[36px]"
                              >
                                <UserPlus className="w-4 h-4" />
                                {estaGestionando ? 'Cerrar' : 'Agregar'}
                              </button>
                            </div>

                            {/* Lista de responsables de apoyo */}
                            {tieneApoyo && (
                              <div className="space-y-2 mb-3">
                                {actividad.responsablesApoyo!.map((apoyo) => (
                                  <div
                                    key={apoyo.id}
                                    className="flex items-center gap-3 bg-white border border-purple-300 rounded-lg p-3"
                                  >
                                    <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                      <span className="text-base">🤝</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-gray-900 text-sm">{apoyo.nombre}</p>
                                      <p className="text-xs text-gray-600">{apoyo.cargo}</p>
                                    </div>
                                    <button
                                      onClick={() => eliminarResponsableApoyo(rol.numero, actividad.id, apoyo.id)}
                                      className="flex-shrink-0 p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                      title="Eliminar del equipo"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Selector para agregar */}
                            <AnimatePresence>
                              {estaGestionando && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="bg-purple-100 border border-purple-300 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-purple-900 mb-2">
                                      Selecciona un auditor para agregar al equipo:
                                    </p>
                                    <select
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          agregarResponsableApoyo(rol.numero, actividad.id, e.target.value);
                                          e.target.value = '';
                                        }
                                      }}
                                      className="w-full px-3 py-2 bg-white border-2 border-purple-300 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                                      defaultValue=""
                                    >
                                      <option value="" disabled>
                                        Seleccionar auditor...
                                      </option>
                                      {AUDITORES.map((auditor) => {
                                        const esPrincipal = actividad.responsable?.id === auditor.id;
                                        const yaEsApoyo = (actividad.responsablesApoyo || []).some(r => r.id === auditor.id);
                                        const deshabilitado = esPrincipal || yaEsApoyo;
                                        
                                        return (
                                          <option 
                                            key={auditor.id} 
                                            value={auditor.id}
                                            disabled={deshabilitado}
                                          >
                                            {auditor.nombre} - {auditor.cargo}
                                            {esPrincipal ? ' (Responsable Principal)' : ''}
                                            {yaEsApoyo ? ' (Ya en equipo)' : ''}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Mensaje cuando no hay apoyo */}
                            {!tieneApoyo && !estaGestionando && (
                              <div className="text-center py-3 text-sm text-purple-700">
                                No hay responsables de apoyo asignados
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Alerta si faltan asignaciones */}
      {estadisticasGenerales.conResponsablePrincipal < estadisticasGenerales.totalActividades && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-orange-50 border-2 border-orange-300 rounded-xl p-6"
        >
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-orange-900 mb-1 text-lg">
                Faltan asignaciones de responsables principales
              </p>
              <p className="text-sm text-orange-700 mb-3">
                Hay {estadisticasGenerales.totalActividades - estadisticasGenerales.conResponsablePrincipal} actividad
                {(estadisticasGenerales.totalActividades - estadisticasGenerales.conResponsablePrincipal) !== 1 ? 'es' : ''} sin responsable principal.
                Los responsables principales deben asignarse durante la creación del plan.
              </p>
              <p className="text-xs text-orange-600 font-medium">
                💡 Tip: Los responsables de apoyo son opcionales y pueden agregarse en cualquier momento desde esta sección.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
