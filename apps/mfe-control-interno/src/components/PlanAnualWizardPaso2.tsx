/**
 * Paso 2 del Wizard - Configuración avanzada de roles y actividades
 * Permite seleccionar actividades, agregar personalizadas y asignar múltiples responsables
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Shield } from 'lucide-react';
import { toast } from 'sonner';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

interface Auditor {
  id: string;
  nombre: string;
  cargo: string;
  email: string;
}

interface ActividadBase {
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  control: string;
  evaluacion: string;
  seguimiento: string;
}

interface RolBase {
  numero: number;
  nombre: string;
  color: string;
  icono: string;
  descripcion: string;
}

interface RolConfig extends RolBase {
  actividadesSeleccionadas: ActividadBase[];
  actividadesCustom: ActividadBase[];
  responsables: Auditor[];
}

// ════════════════════════════════════════════════════════════════════════════
// DATOS
// ════════════════════════════════════════════════════════════════════════════

const AUDITORES: Auditor[] = [
  { id: '1', nombre: 'Mario Oswaldo Bernal', cargo: 'Jefe de Control Interno', email: 'mario.bernal@esap.edu.co' },
  { id: '2', nombre: 'Ana María López', cargo: 'Auditora sénior', email: 'ana.lopez@esap.edu.co' },
  { id: '3', nombre: 'Carlos Mendoza', cargo: 'Auditor', email: 'carlos.mendoza@esap.edu.co' },
  { id: '4', nombre: 'Laura Rodríguez', cargo: 'Auditora', email: 'laura.rodriguez@esap.edu.co' },
  { id: '5', nombre: 'Juan Pablo García', cargo: 'Auditor júnior', email: 'juan.garcia@esap.edu.co' }
];

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL - PASO 2
// ════════════════════════════════════════════════════════════════════════════

interface Paso2Props {
  rolesConfig: RolConfig[];
  onRolesChange: (config: RolConfig[]) => void;
  actividadesPorRol: Record<number, ActividadBase[]>;
}

export function Paso2Avanzado({ rolesConfig, onRolesChange, actividadesPorRol }: Paso2Props) {
  const [rolExpandido, setRolExpandido] = useState<number | null>(1);
  const [mostrarFormActividad, setMostrarFormActividad] = useState<number | null>(null);
  const [nuevaActividad, setNuevaActividad] = useState<ActividadBase>({
    nombre: '',
    descripcion: '',
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0],
    control: 'Seguimiento trimestral',
    evaluacion: '0% avance',
    seguimiento: 'Por definir'
  });

  const toggleActividad = (numeroRol: number, nombreActividad: string) => {
    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero === numeroRol) {
        const yaSeleccionada = rol.actividadesSeleccionadas.some(a => a.nombre === nombreActividad);
        if (yaSeleccionada) {
          // Deseleccionar
          return {
            ...rol,
            actividadesSeleccionadas: rol.actividadesSeleccionadas.filter(a => a.nombre !== nombreActividad)
          };
        } else {
          // Seleccionar
          const actividadBase = actividadesPorRol[numeroRol]?.find(a => a.nombre === nombreActividad);
          if (actividadBase) {
            return {
              ...rol,
              actividadesSeleccionadas: [...rol.actividadesSeleccionadas, actividadBase]
            };
          }
        }
      }
      return rol;
    });
    onRolesChange(nuevaConfig);
  };

  const estaSeleccionada = (numeroRol: number, nombreActividad: string) => {
    const rol = rolesConfig.find(r => r.numero === numeroRol);
    return rol?.actividadesSeleccionadas.some(a => a.nombre === nombreActividad) || false;
  };

  const agregarActividadCustom = (numeroRol: number) => {
    if (!nuevaActividad.nombre.trim()) {
      toast.error('El nombre de la actividad es obligatorio');
      return;
    }

    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero === numeroRol) {
        return {
          ...rol,
          actividadesCustom: [...rol.actividadesCustom, { ...nuevaActividad }]
        };
      }
      return rol;
    });

    onRolesChange(nuevaConfig);
    toast.success('Actividad personalizada agregada');
    setNuevaActividad({
      nombre: '',
      descripcion: '',
      fechaInicio: new Date().toISOString().split('T')[0],
      fechaFin: new Date().toISOString().split('T')[0],
      control: 'Seguimiento trimestral',
      evaluacion: '0% avance',
      seguimiento: 'Por definir'
    });
    setMostrarFormActividad(null);
  };

  const eliminarActividadCustom = (numeroRol: number, index: number) => {
    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero === numeroRol) {
        return {
          ...rol,
          actividadesCustom: rol.actividadesCustom.filter((_, i) => i !== index)
        };
      }
      return rol;
    });
    onRolesChange(nuevaConfig);
    toast.success('Actividad eliminada');
  };

  const agregarResponsable = (numeroRol: number, auditor: Auditor) => {
    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero === numeroRol) {
        if (!rol.responsables.some(r => r.id === auditor.id)) {
          return { ...rol, responsables: [...rol.responsables, auditor] };
        }
      }
      return rol;
    });
    onRolesChange(nuevaConfig);
  };

  const eliminarResponsable = (numeroRol: number, auditorId: string) => {
    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero === numeroRol) {
        return { ...rol, responsables: rol.responsables.filter(r => r.id !== auditorId) };
      }
      return rol;
    });
    onRolesChange(nuevaConfig);
  };

  const totalActividades = rolesConfig.reduce((sum, rol) => 
    sum + rol.actividadesSeleccionadas.length + rol.actividadesCustom.length, 0
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Configuración de roles y actividades</h2>
        <p className="text-gray-600">Personaliza las actividades y asigna responsables para cada rol estratégico</p>
      </div>

      {/* Resumen */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-700 mb-1">Total de actividades configuradas</p>
            <p className="text-3xl font-bold text-blue-900">{totalActividades}</p>
          </div>
          <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      {/* Roles configurables */}
      <div className="space-y-4">
        {rolesConfig.map((rol) => {
          const isExpanded = rolExpandido === rol.numero;
          const actividadesBase = actividadesPorRol[rol.numero] || [];
          const totalRol = rol.actividadesSeleccionadas.length + rol.actividadesCustom.length;

          return (
            <div key={rol.numero} className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
              {/* Header */}
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setRolExpandido(isExpanded ? null : rol.numero)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style={{ backgroundColor: rol.color + '20' }}>
                    {rol.icono}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Rol {rol.numero}: {rol.nombre}</h3>
                    <p className="text-sm text-gray-600">
                      {totalRol} actividades • {rol.responsables.length} responsables
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Barra de progreso de asignación */}
                  <div className="flex items-center gap-2 mr-2">
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-gray-500 font-medium">Avance asignación</span>
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${actividadesBase.length > 0 ? Math.min(100, Math.round((totalRol / actividadesBase.length) * 100)) : 0}%`,
                            backgroundColor: rol.color 
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-gray-700">
                      {actividadesBase.length > 0 ? Math.min(100, Math.round((totalRol / actividadesBase.length) * 100)) : 0}%
                    </span>
                  </div>

                  <span className="px-3 py-1 rounded-lg text-sm font-semibold" style={{ 
                    backgroundColor: rol.color + '20', 
                    color: rol.color 
                  }}>
                    {totalRol}/{actividadesBase.length}
                  </span>
                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </motion.div>
                </div>
              </div>

              {/* Content expandible */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-4 border-t-2 border-gray-200">
                      {/* Responsables */}
                      <div className="pt-4">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Responsables del rol
                        </h4>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {rol.responsables.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No hay responsables asignados</p>
                          ) : (
                            rol.responsables.map(auditor => (
                              <div key={auditor.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-900 rounded-lg text-sm">
                                <span>👤 {auditor.nombre}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    eliminarResponsable(rol.numero, auditor.id);
                                  }}
                                  className="hover:text-red-600"
                                >
                                  ✕
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                        <select
                          onChange={(e) => {
                            const auditor = AUDITORES.find(a => a.id === e.target.value);
                            if (auditor) {
                              agregarResponsable(rol.numero, auditor);
                              e.target.value = '';
                            }
                          }}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                          onClick={(e) => e.stopPropagation()}
                          defaultValue=""
                        >
                          <option value="">➕ Agregar responsable...</option>
                          {AUDITORES.filter(a => !rol.responsables.some(r => r.id === a.id)).map(auditor => (
                            <option key={auditor.id} value={auditor.id}>
                              {auditor.nombre} - {auditor.cargo}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Actividades del Decreto 648 */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Actividades del Decreto 648/2017
                        </h4>
                        <div className="space-y-2">
                          {actividadesBase.map((actividad, index) => {
                            const seleccionada = estaSeleccionada(rol.numero, actividad.nombre);
                            return (
                              <label
                                key={index}
                                className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                                  seleccionada
                                    ? 'border-blue-400 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={seleccionada}
                                  onChange={() => toggleActividad(rol.numero, actividad.nombre)}
                                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900 text-sm">{actividad.nombre}</p>
                                  <p className="text-xs text-gray-600 mt-1">{actividad.descripcion}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Actividades personalizadas */}
                      {rol.actividadesCustom.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            ⭐ Actividades personalizadas
                          </h4>
                          <div className="space-y-2">
                            {rol.actividadesCustom.map((actividad, index) => (
                              <div
                                key={index}
                                className="flex items-start gap-3 p-3 border-2 border-green-200 bg-green-50 rounded-lg"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900 text-sm">{actividad.nombre}</p>
                                  <p className="text-xs text-gray-600 mt-1">{actividad.descripcion}</p>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('¿Eliminar esta actividad personalizada?')) {
                                      eliminarActividadCustom(rol.numero, index);
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-800 p-1"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Formulario nueva actividad */}
                      {mostrarFormActividad === rol.numero ? (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 border-2 border-blue-300 bg-blue-50 rounded-lg space-y-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-blue-900">Nueva actividad personalizada</h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMostrarFormActividad(null);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              ✕
                            </button>
                          </div>
                          <input
                            type="text"
                            value={nuevaActividad.nombre}
                            onChange={(e) => setNuevaActividad({ ...nuevaActividad, nombre: e.target.value })}
                            placeholder="Nombre de la actividad"
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <textarea
                            value={nuevaActividad.descripcion}
                            onChange={(e) => setNuevaActividad({ ...nuevaActividad, descripcion: e.target.value })}
                            placeholder="Descripción"
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                            rows={2}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                agregarActividadCustom(rol.numero);
                              }}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                            >
                              ✓ Agregar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMostrarFormActividad(null);
                              }}
                              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
                            >
                              Cancelar
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMostrarFormActividad(rol.numero);
                          }}
                          className="w-full px-4 py-3 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 rounded-lg text-gray-600 hover:text-blue-600 font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Agregar actividad personalizada
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default Paso2Avanzado;
