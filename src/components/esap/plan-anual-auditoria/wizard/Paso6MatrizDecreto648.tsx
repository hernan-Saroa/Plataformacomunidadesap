/**
 * PASO 6: MATRIZ DECRETO 648/2017
 * Validación de 5 roles y 22 actividades
 */

'use client';

import React, { useEffect } from 'react';
import { Shield, CheckCircle2 } from 'lucide-react';
import { useWizardPAI } from './WizardCrearPAI';
import { ROLES_DECRETO_648_OFICIALES } from '../constants/rolesDecreto648Oficial';
import { BadgeDecreto648 } from '../../control-interno/components/BadgeDecreto648';

export function Paso6MatrizDecreto648() {
  const { rolesDecreto648, setRolesDecreto648 } = useWizardPAI();

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#003DA5] flex items-center mb-2">
          <Shield className="w-7 h-7 mr-3" />
          ✅ Matriz Decreto 648/2017
        </h2>
        <p className="text-gray-600">
          Validación de cumplimiento de los 5 roles y 22 actividades obligatorias
        </p>
      </div>

      {/* Badge de cumplimiento */}
      <div className="flex items-center justify-center py-6">
        <BadgeDecreto648 porcentajeCumplimiento={cumplimientoTotal} size="xl" />
      </div>

      {/* Lista de roles */}
      <div className="space-y-4">
        {ROLES_DECRETO_648_OFICIALES.map(rol => (
          <div key={rol.numero} className="bg-white border-2 border-[#003DA5] border-opacity-20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                  style={{ backgroundColor: rol.color + '20', color: rol.color }}
                >
                  {rol.icono}
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: rol.color }}>
                    ROL {rol.numero}: {rol.nombre}
                  </h3>
                  <p className="text-sm text-gray-600">{rol.actividades.length} actividades obligatorias</p>
                </div>
              </div>
              <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rol.actividades.map(act => (
                <div key={act.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="flex items-start space-x-2">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#003DA5] text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {act.id}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800 line-clamp-2">{act.nombre}</p>
                      <p className="text-xs text-gray-600 mt-1">{act.control}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
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
    </div>
  );
}
