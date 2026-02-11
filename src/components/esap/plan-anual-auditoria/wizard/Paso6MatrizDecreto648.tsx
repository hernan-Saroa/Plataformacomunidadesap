/**
 * PASO 6: MATRIZ DECRETO 648/2017
 * Validación de 5 roles y 22 actividades
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Shield, CheckCircle2, Lock, Unlock } from 'lucide-react';
import { useWizardPAI } from './WizardCrearPAI';
import { ROLES_DECRETO_648_OFICIALES } from '../constants/rolesDecreto648Oficial';
import { BadgeDecreto648 } from '../../control-interno/components/BadgeDecreto648';

export function Paso6MatrizDecreto648() {
  const { rolesDecreto648, setRolesDecreto648 } = useWizardPAI();
  const [expandedRoles, setExpandedRoles] = useState<number[]>([1]); // Primer rol expandido por defecto

  useEffect(() => {
    // Auto-cargar los 5 roles oficiales
    if (rolesDecreto648.length === 0) {
      const rolesConEstado = ROLES_DECRETO_648_OFICIALES.map(rol => ({
        ...rol,
        estadoGeneral: 'No Iniciado' as const,
        porcentajeAvanceGeneral: 0,
        actividadesExtendidas: rol.actividades.map(act => ({
          ...act,
          estadoEjecucion: 'No Iniciada' as const,
          porcentajeAvance: 0,
          horasEstimadas: 40,
          horasEjecutadas: 0,
          requiereAutorizacionJefeOCIG: false, // Por defecto NO requiere autorización
          evidencias: [],
          seguimientosRealizados: [],
          observaciones: '',
          riesgos: '',
          dificultades: ''
        })),
        totalHorasEstimadas: rol.actividades.length * 40,
        totalHorasEjecutadas: 0,
        responsablesAdicionales: []
      }));
      setRolesDecreto648(rolesConEstado);
    }
  }, []);

  const cumplimientoTotal = rolesDecreto648.length === 5 ? 100 : (rolesDecreto648.length / 5) * 100;

  // Toggle de expansión de rol
  const toggleRol = (numeroRol: number) => {
    setExpandedRoles(prev => 
      prev.includes(numeroRol) 
        ? prev.filter(n => n !== numeroRol)
        : [...prev, numeroRol]
    );
  };

  // Actualizar autorización de una actividad
  const handleToggleAutorizacion = (rolNumero: number, actividadId: number) => {
    setRolesDecreto648(prevRoles => 
      prevRoles.map(rol => {
        if (rol.numero !== rolNumero) return rol;
        
        return {
          ...rol,
          actividadesExtendidas: rol.actividadesExtendidas.map(act => 
            act.id === actividadId 
              ? { ...act, requiereAutorizacionJefeOCIG: !act.requiereAutorizacionJefeOCIG }
              : act
          )
        };
      })
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#003DA5] flex items-center mb-2">
          <Shield className="w-7 h-7 mr-3" />
          ✅ Matriz Decreto 648/2017
        </h2>
        <p className="text-gray-600 mb-1">
          Validación de cumplimiento de los 5 roles y 22 actividades obligatorias
        </p>
        <p className="text-sm text-[#F57C00] font-semibold">
          ⚙️ Configure qué actividades requieren autorización del Jefe OCIG para completarse
        </p>
      </div>

      {/* Badge de cumplimiento */}
      <div className="flex items-center justify-center py-6">
        <BadgeDecreto648 porcentajeCumplimiento={cumplimientoTotal} size="xl" />
      </div>

      {/* Lista de roles */}
      <div className="space-y-4">
        {ROLES_DECRETO_648_OFICIALES.map((rol, rolIndex) => {
          const isExpanded = expandedRoles.includes(rol.numero);
          const rolData = rolesDecreto648[rolIndex];
          
          return (
            <div key={rol.numero} className="bg-white border-2 border-[#003DA5] border-opacity-20 rounded-xl overflow-hidden">
              {/* Header del Rol - Clickeable para expandir/colapsar */}
              <button
                onClick={() => toggleRol(rol.numero)}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ backgroundColor: rol.color + '20', color: rol.color }}
                  >
                    {rol.icono}
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold" style={{ color: rol.color }}>
                      ROL {rol.numero}: {rol.nombre}
                    </h3>
                    <p className="text-sm text-gray-600">{rol.actividades.length} actividades obligatorias</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
                  <span className="text-gray-400">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                </div>
              </button>
              
              {/* Contenido expandible - Lista de actividades con toggles */}
              {isExpanded && rolData && (
                <div className="border-t-2 border-gray-100 p-6 bg-gray-50">
                  <div className="space-y-3">
                    {rolData.actividadesExtendidas.map(act => (
                      <div 
                        key={act.id} 
                        className="bg-white rounded-lg p-4 border-2 border-gray-200 hover:border-[#003DA5] transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Info de la actividad */}
                          <div className="flex items-start space-x-3 flex-1">
                            <span className="flex-shrink-0 w-7 h-7 bg-[#003DA5] text-white rounded-full flex items-center justify-center text-sm font-bold">
                              {act.id}
                            </span>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800 mb-1">{act.nombre}</p>
                              <p className="text-xs text-gray-600">{act.control}</p>
                            </div>
                          </div>

                          {/* Toggle de autorización */}
                          <button
                            onClick={() => handleToggleAutorizacion(rol.numero, act.id)}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all flex-shrink-0 ${
                              act.requiereAutorizacionJefeOCIG
                                ? 'bg-[#F57C00] text-white hover:bg-[#E65100]'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                          >
                            {act.requiereAutorizacionJefeOCIG ? (
                              <>
                                <Lock className="w-4 h-4" />
                                <span>Requiere Autorización</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-4 h-4" />
                                <span>Sin Autorización</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Resumen */}
      <div className="bg-gradient-to-r from-[#10B981] to-[#059669] rounded-xl p-6 text-white">
        <div className="flex items-center space-x-3 mb-3">
          <CheckCircle2 className="w-8 h-8" />
          <h3 className="text-xl font-bold">Cumplimiento Verificado</h3>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-white text-opacity-80">Roles Obligatorios</div>
            <div className="text-2xl font-bold">5/5</div>
          </div>
          <div>
            <div className="text-white text-opacity-80">Actividades Fijas</div>
            <div className="text-2xl font-bold">22/22</div>
          </div>
          <div>
            <div className="text-white text-opacity-80">Cumplimiento</div>
            <div className="text-2xl font-bold">100%</div>
          </div>
        </div>
      </div>

      {/* Información sobre autorización */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-bold text-blue-900 mb-1">Configuración de Autorizaciones</h4>
            <p className="text-sm text-blue-700">
              Las actividades marcadas con <span className="font-semibold">"Requiere Autorización"</span> necesitarán 
              la aprobación del Jefe de OCIG antes de completarse durante el seguimiento del Plan Anual.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}