/**
 * Secciones del Dashboard del Plan Anual de Auditoría
 * Este archivo contiene las 4 secciones principales del dashboard
 */

import { motion } from 'motion/react';
import { BookOpen, Users, CheckCircle2, AlertCircle } from 'lucide-react';

// Tipos importados
type PlanAnual = any; // Simplificado para este archivo
type Auditor = any;

// SECCIÓN 1: RESUMEN
export function SeccionResumen({ plan, totalActividades, actividadesAsignadas, actividadesCompletadas, avancePromedio }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Información general</h2>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Vigencia</p>
            <p className="text-2xl font-bold text-gray-900">{plan.vigencia}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Jefe responsable</p>
            <p className="font-semibold text-gray-900">{plan.jefeOCI.nombre}</p>
            <p className="text-sm text-gray-600">{plan.jefeOCI.cargo}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Fecha de creación</p>
            <p className="font-semibold text-gray-900">
              {new Date(plan.fechaCreacion).toLocaleDateString('es-CO', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Resumen por roles (Decreto 648/2017)</h2>
        <div className="grid grid-cols-5 gap-4">
          {plan.roles.map((rol: any) => {
            const asignadas = rol.actividades.filter((a: any) => a.responsable !== null).length;
            const completadas = rol.actividades.filter((a: any) => a.estado === 'COMPLETADA').length;
            const avance = Math.round(
              rol.actividades.reduce((sum: number, a: any) => sum + a.porcentajeAvance, 0) / rol.actividades.length
            );

            return (
              <div key={rol.numero} className="bg-white rounded-xl border-2 border-gray-200 p-5 hover:shadow-lg transition-shadow">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl mb-3 border-2"
                  style={{ backgroundColor: `${rol.color}20`, borderColor: rol.color }}
                >
                  {rol.icono}
                </div>
                <h3 className="font-bold text-gray-900 mb-1 text-sm">Rol {rol.numero}</h3>
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{rol.nombre}</p>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-bold">{rol.actividades.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Asignadas:</span>
                    <span className="font-bold text-blue-600">{asignadas}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completadas:</span>
                    <span className="font-bold text-green-600">{completadas}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex justify-between mb-1">
                      <span>Avance:</span>
                      <span className="font-bold text-indigo-600">{avance}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${avance}%`, backgroundColor: rol.color }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <BookOpen className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-blue-900 mb-2">Decreto 648 de 2017</h3>
            <p className="text-sm text-blue-800">
              Este plan cumple con los 5 roles obligatorios establecidos por el Decreto 648 de 2017 
              para las Oficinas de Control Interno de las entidades públicas.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// SECCIÓN 2: ASIGNAR RESPONSABLES
export function SeccionAsignar({ plan, onAsignarResponsable, AUDITORES }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Auditores disponibles
        </h2>
        <div className="grid grid-cols-5 gap-3">
          {AUDITORES.map((auditor: any) => {
            const asignadas = plan.roles.reduce((sum: number, rol: any) =>
              sum + rol.actividades.filter((a: any) => a.responsable?.id === auditor.id).length, 0
            );
            return (
              <div key={auditor.id} className="border-2 border-gray-200 rounded-lg p-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm mb-2 mx-auto">
                  {auditor.nombre.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <p className="font-semibold text-gray-900 text-center text-sm mb-1">{auditor.nombre}</p>
                <p className="text-xs text-gray-600 text-center mb-2">{auditor.cargo}</p>
                <div className="text-center">
                  <span className="text-xs font-bold text-blue-600">{asignadas}</span>
                  <span className="text-xs text-gray-500"> asignadas</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {plan.roles.map((rol: any) => {
        const sinAsignar = rol.actividades.filter((a: any) => a.responsable === null);
        
        return (
          <div key={rol.numero} className="bg-white rounded-xl border-2 border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl border-2"
                style={{ backgroundColor: `${rol.color}20`, borderColor: rol.color }}
              >
                {rol.icono}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">Rol {rol.numero}: {rol.nombre}</h3>
                <p className="text-sm text-gray-600">
                  {rol.actividades.length} actividades • {sinAsignar.length} sin asignar
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {rol.actividades.map((actividad: any) => (
                <div
                  key={actividad.id}
                  className={`border-2 rounded-lg p-4 ${
                    actividad.responsable
                      ? 'border-green-200 bg-green-50'
                      : 'border-orange-200 bg-orange-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-gray-500">#{actividad.id}</span>
                        <h4 className="font-semibold text-gray-900">{actividad.nombre}</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{actividad.descripcion}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>📅 {actividad.fechaInicio} / {actividad.fechaFin}</span>
                        <span>• Control: {actividad.control}</span>
                      </div>
                    </div>

                    <div className="w-64 flex-shrink-0">
                      {actividad.responsable ? (
                        <div className="p-3 bg-white border-2 border-green-300 rounded-lg">
                          <p className="text-xs text-green-600 font-semibold mb-1">Asignado a:</p>
                          <p className="font-semibold text-gray-900">{actividad.responsable.nombre}</p>
                          <p className="text-xs text-gray-600">{actividad.responsable.cargo}</p>
                        </div>
                      ) : (
                        <select
                          onChange={(e) => {
                            const auditor = AUDITORES.find((a: any) => a.id === e.target.value);
                            if (auditor) onAsignarResponsable(actividad.id, auditor);
                          }}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500"
                          defaultValue=""
                        >
                          <option value="" disabled>Asignar a...</option>
                          {AUDITORES.map((a: any) => (
                            <option key={a.id} value={a.id}>{a.nombre}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}

// SECCIÓN 3: SEGUIMIENTO
export function SeccionSeguimiento({ plan, onActualizarAvance }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {plan.roles.map((rol: any) => (
        <div key={rol.numero} className="bg-white rounded-xl border-2 border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl border-2"
              style={{ backgroundColor: `${rol.color}20`, borderColor: rol.color }}
            >
              {rol.icono}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Rol {rol.numero}: {rol.nombre}</h3>
              <p className="text-sm text-gray-600">{rol.actividades.length} actividades</p>
            </div>
          </div>

          <div className="space-y-3">
            {rol.actividades.map((actividad: any) => (
              <div key={actividad.id} className="border-2 border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-500">#{actividad.id}</span>
                      <h4 className="font-semibold text-gray-900">{actividad.nombre}</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Responsable: <span className="font-medium">
                        {actividad.responsable?.nombre || 'Sin asignar'}
                      </span>
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    actividad.estado === 'COMPLETADA' ? 'bg-green-100 text-green-700' :
                    actividad.estado === 'EN_EJECUCION' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {actividad.estado === 'COMPLETADA' ? 'Completada' :
                     actividad.estado === 'EN_EJECUCION' ? 'En ejecución' : 'Pendiente'}
                  </span>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Porcentaje de avance</span>
                    <span className="text-sm font-bold text-blue-600">{actividad.porcentajeAvance}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{ 
                        width: `${actividad.porcentajeAvance}%`,
                        backgroundColor: rol.color
                      }}
                    />
                  </div>
                </div>

                {plan.estado !== 'CERRADO' && (
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={actividad.porcentajeAvance}
                      onChange={(e) => onActualizarAvance(actividad.id, parseInt(e.target.value))}
                      className="flex-1"
                      style={{ accentColor: rol.color }}
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={actividad.porcentajeAvance}
                      onChange={(e) => onActualizarAvance(actividad.id, parseInt(e.target.value) || 0)}
                      className="w-20 px-3 py-2 border-2 border-gray-300 rounded-lg text-center font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
                  <p><strong>Seguimiento:</strong> {actividad.seguimiento}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

// SECCIÓN 4: APROBACIÓN
export function SeccionAprobacion({ plan, totalActividades, actividadesAsignadas }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Resumen del plan</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Jefe responsable</p>
            <p className="font-semibold text-gray-900">{plan.jefeOCI.nombre}</p>
            <p className="text-sm text-gray-600">{plan.jefeOCI.cargo}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Estado actual</p>
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
              plan.estado === 'VIGENTE' ? 'bg-green-100 text-green-700' :
              plan.estado === 'APROBADO' ? 'bg-blue-100 text-blue-700' :
              plan.estado === 'EN_REVISION' ? 'bg-orange-100 text-orange-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {plan.estado === 'BORRADOR' ? 'Borrador' :
               plan.estado === 'EN_REVISION' ? 'En revisión' :
               plan.estado === 'APROBADO' ? 'Aprobado' :
               plan.estado === 'VIGENTE' ? 'Vigente' : 'Cerrado'}
            </span>
          </div>
          {plan.actaCICC && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Acta CICC</p>
              <p className="font-semibold text-blue-600">{plan.actaCICC}</p>
            </div>
          )}
          {plan.fechaAprobacion && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Fecha de aprobación</p>
              <p className="font-semibold text-gray-900">
                {new Date(plan.fechaAprobacion).toLocaleDateString('es-CO', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Validaciones del Decreto 648/2017</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-green-50 border-2 border-green-200 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-900">5 roles obligatorios</p>
              <p className="text-sm text-green-700">Cumple con el Decreto 648 de 2017</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-green-50 border-2 border-green-200 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-900">22 actividades estructuradas</p>
              <p className="text-sm text-green-700">Distribuidas según el marco normativo</p>
            </div>
          </div>

          <div className={`flex items-center gap-3 p-3 rounded-lg ${
            actividadesAsignadas === totalActividades
              ? 'bg-green-50 border-2 border-green-200'
              : 'bg-orange-50 border-2 border-orange-200'
          }`}>
            {actividadesAsignadas === totalActividades ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
            )}
            <div>
              <p className="font-semibold">Responsables asignados</p>
              <p className="text-sm">{actividadesAsignadas} de {totalActividades} actividades asignadas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <BookOpen className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-blue-900 mb-2">Marco legal</h3>
            <p className="text-sm text-blue-800 mb-2">
              Este plan anual de auditoría interna se encuentra fundamentado en:
            </p>
            <ul className="space-y-1 text-sm text-blue-700">
              <li>• <strong>Decreto 648 de 2017:</strong> Por el cual se reglamenta el artículo 131 de la Ley 1753 de 2015</li>
              <li>• <strong>Formato EM-FO-001:</strong> Plan Anual de Auditoría Interna versión 6</li>
              <li>• <strong>Guía de auditoría:</strong> Departamento Administrativo de la Función Pública</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
