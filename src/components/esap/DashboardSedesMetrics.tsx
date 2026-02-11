/**
 * DASHBOARD - MÉTRICAS POR TERRITORIAL Y CETAP
 * Visualización de estadísticas de usuarios agrupadas por estructura territorial de ESAP
 * Nacional > Territorial (17) > CETAP (307)
 */

import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  MapPin,
  Award,
  UserCheck,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Home
} from 'lucide-react';
import { Badge } from '../ui/badge';
import type { AsignacionSede } from '../../types';

interface DashboardSedesMetricsProps {
  usuarios: Array<{
    id: string;
    status: string;
    roles: Array<{ name: string }>;
    asignacionesSedes?: AsignacionSede[];
  }>;
}

interface TerritorialMetrics {
  territorialId: string;
  territorialNombre: string;
  territorialCodigo: string;
  departamento: string;
  totalUsuarios: number;
  usuariosActivos: number;
  usuariosPrincipales: number;
  cetaps: CetapMetrics[];
  porRol: Record<string, number>;
  crecimiento: number;
}

interface CetapMetrics {
  cetapId: string;
  cetapNombre: string;
  cetapCodigo: string;
  ciudad: string;
  totalUsuarios: number;
  usuariosActivos: number;
  porRol: Record<string, number>;
}

export function DashboardSedesMetrics({ usuarios }: DashboardSedesMetricsProps) {
  const [expandedTerritorial, setExpandedTerritorial] = useState<string | null>(null);

  // Calcular métricas por Territorial y CETAP
  const metricas = useMemo(() => {
    const territorialesMap = new Map<string, TerritorialMetrics>();

    usuarios.forEach(usuario => {
      if (!usuario.asignacionesSedes || usuario.asignacionesSedes.length === 0) return;

      usuario.asignacionesSedes.forEach(asignacion => {
        const nivel = asignacion.unidad?.nivel || 'local';
        
        // Agrupar por Territorial
        let territorialKey: string;
        let territorialNombre: string;
        let territorialCodigo: string;
        let departamento: string;

        if (nivel === 'nacional' || nivel === 'sede-central') {
          // Sede Nacional - Tratarla como un Territorial especial
          territorialKey = 'nacional';
          territorialNombre = 'Sede Nacional - Bogotá D.C.';
          territorialCodigo = 'ESAP-NAC';
          departamento = 'Cundinamarca';
        } else if (nivel === 'territorial') {
          // Es un Territorial
          territorialKey = asignacion.unidadId;
          territorialNombre = asignacion.unidad?.nombre || 'Sin nombre';
          territorialCodigo = asignacion.unidad?.codigo || '';
          departamento = asignacion.unidad?.departamento || '';
        } else {
          // Es un CETAP - extraer el Territorial del código
          const codigo = asignacion.unidad?.codigo || '';
          // Asumimos formato: ESAP-TER-XXX-CETAP-YYY
          const match = codigo.match(/ESAP-TER-(\w+)/);
          if (match) {
            territorialKey = `ter-${match[1].toLowerCase()}`;
            territorialNombre = `Territorial ${asignacion.unidad?.departamento || match[1]}`;
            territorialCodigo = `ESAP-TER-${match[1]}`;
            departamento = asignacion.unidad?.departamento || match[1];
          } else {
            // Fallback: usar departamento
            territorialKey = `ter-${asignacion.unidad?.departamento?.toLowerCase() || 'otros'}`;
            territorialNombre = `Territorial ${asignacion.unidad?.departamento || 'Otros'}`;
            territorialCodigo = `ESAP-TER-${asignacion.unidad?.departamento?.toUpperCase() || 'OTR'}`;
            departamento = asignacion.unidad?.departamento || 'Otros';
          }
        }

        // Inicializar Territorial si no existe
        if (!territorialesMap.has(territorialKey)) {
          territorialesMap.set(territorialKey, {
            territorialId: territorialKey,
            territorialNombre,
            territorialCodigo,
            departamento,
            totalUsuarios: 0,
            usuariosActivos: 0,
            usuariosPrincipales: 0,
            cetaps: [],
            porRol: {},
            crecimiento: Math.random() * 30 - 10 // Mock growth
          });
        }

        const territorial = territorialesMap.get(territorialKey)!;
        territorial.totalUsuarios++;
        
        if (usuario.status === 'active') {
          territorial.usuariosActivos++;
        }

        if (asignacion.esPrincipal) {
          territorial.usuariosPrincipales++;
        }

        // Contar por roles
        usuario.roles.forEach(rol => {
          territorial.porRol[rol.name] = (territorial.porRol[rol.name] || 0) + 1;
        });

        // Si es un CETAP, agregarlo a la lista
        if (nivel === 'local' || nivel === 'cetap') {
          let cetap = territorial.cetaps.find(c => c.cetapId === asignacion.unidadId);
          
          if (!cetap) {
            cetap = {
              cetapId: asignacion.unidadId,
              cetapNombre: asignacion.unidad?.nombre || 'Sin nombre',
              cetapCodigo: asignacion.unidad?.codigo || '',
              ciudad: asignacion.unidad?.ciudad || '',
              totalUsuarios: 0,
              usuariosActivos: 0,
              porRol: {}
            };
            territorial.cetaps.push(cetap);
          }

          cetap.totalUsuarios++;
          if (usuario.status === 'active') {
            cetap.usuariosActivos++;
          }

          usuario.roles.forEach(rol => {
            cetap.porRol[rol.name] = (cetap.porRol[rol.name] || 0) + 1;
          });
        }
      });
    });

    // Ordenar CETAPs dentro de cada Territorial
    territorialesMap.forEach(territorial => {
      territorial.cetaps.sort((a, b) => b.totalUsuarios - a.totalUsuarios);
    });

    return Array.from(territorialesMap.values()).sort((a, b) => b.totalUsuarios - a.totalUsuarios);
  }, [usuarios]);

  if (metricas.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No hay datos de sedes disponibles</p>
      </div>
    );
  }

  const totalUsuarios = metricas.reduce((sum, t) => sum + t.totalUsuarios, 0);
  const totalActivos = metricas.reduce((sum, t) => sum + t.usuariosActivos, 0);
  const totalCetaps = metricas.reduce((sum, t) => sum + t.cetaps.length, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[--esap-primary]" />
            Métricas por Territorial y CETAP
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Distribución de usuarios en la estructura organizacional de ESAP
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {metricas.length} Territoriales
          </Badge>
          <Badge variant="outline" className="text-sm bg-blue-50 text-blue-700 border-blue-300">
            {totalCetaps} CETAPs
          </Badge>
        </div>
      </div>

      {/* Resumen General */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-blue-600 font-medium mb-1">Total Territoriales</p>
            <p className="text-2xl font-bold text-blue-900">{metricas.length}</p>
          </div>
          <div>
            <p className="text-xs text-blue-600 font-medium mb-1">Total CETAPs</p>
            <p className="text-2xl font-bold text-blue-900">{totalCetaps}</p>
          </div>
          <div>
            <p className="text-xs text-blue-600 font-medium mb-1">Total Usuarios</p>
            <p className="text-2xl font-bold text-blue-900">{totalUsuarios}</p>
          </div>
          <div>
            <p className="text-xs text-blue-600 font-medium mb-1">Usuarios Activos</p>
            <p className="text-2xl font-bold text-blue-900">{totalActivos}</p>
          </div>
        </div>
      </div>

      {/* Lista de Territoriales */}
      <div className="space-y-3">
        {metricas.map((territorial, index) => {
          const isExpanded = expandedTerritorial === territorial.territorialId;
          const tasaActivacion = territorial.totalUsuarios > 0 
            ? ((territorial.usuariosActivos / territorial.totalUsuarios) * 100).toFixed(0)
            : '0';
          const isNacional = territorial.territorialId === 'nacional';

          return (
            <motion.div
              key={territorial.territorialId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* Header Territorial - Clickeable para expandir */}
              <button
                onClick={() => setExpandedTerritorial(isExpanded ? null : territorial.territorialId)}
                className="w-full p-5 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Icono de expansión */}
                    {territorial.cetaps.length > 0 && (
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    )}
                    
                    {/* Icono de nivel */}
                    <div className="flex-shrink-0">
                      {isNacional ? (
                        <Award className="w-5 h-5 text-purple-600" />
                      ) : (
                        <Building2 className="w-5 h-5 text-[--esap-primary]" />
                      )}
                    </div>

                    {/* Información del Territorial */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {territorial.territorialNombre}
                        </h4>
                        <Badge 
                          variant="outline" 
                          className={`text-xs px-2 py-0.5 ${
                            isNacional 
                              ? 'bg-purple-100 text-purple-700 border-purple-300' 
                              : 'bg-blue-100 text-blue-700 border-blue-300'
                          }`}
                        >
                          {isNacional ? 'Nacional' : 'Territorial'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {territorial.departamento}
                      </p>
                    </div>
                  </div>

                  {/* Métricas Rápidas */}
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Usuarios</p>
                      <p className="text-xl font-bold text-gray-900">{territorial.totalUsuarios}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Activos</p>
                      <p className="text-xl font-bold text-green-600">{territorial.usuariosActivos}</p>
                    </div>
                    {territorial.cetaps.length > 0 && (
                      <div className="text-center">
                        <p className="text-xs text-gray-500">CETAPs</p>
                        <p className="text-xl font-bold text-blue-600">{territorial.cetaps.length}</p>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Tasa</p>
                      <p className="text-xl font-bold text-gray-900">{tasaActivacion}%</p>
                    </div>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="mt-3">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all"
                      style={{ width: `${tasaActivacion}%` }}
                    />
                  </div>
                </div>
              </button>

              {/* CETAPs (expandible) */}
              {isExpanded && territorial.cetaps.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-gray-200 bg-gray-50 p-5"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <Home className="w-4 h-4 text-gray-600" />
                    <p className="text-sm font-semibold text-gray-700">
                      CETAPs ({territorial.cetaps.length})
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {territorial.cetaps.map((cetap) => {
                      const cetapTasa = cetap.totalUsuarios > 0
                        ? ((cetap.usuariosActivos / cetap.totalUsuarios) * 100).toFixed(0)
                        : '0';

                      return (
                        <div 
                          key={cetap.cetapId}
                          className="bg-white rounded-lg border border-gray-200 p-4"
                        >
                          <div className="mb-3">
                            <h5 className="font-medium text-gray-900 text-sm mb-1 truncate">
                              {cetap.cetapNombre}
                            </h5>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {cetap.ciudad}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="bg-blue-50 rounded p-2">
                              <p className="text-xs text-blue-600 mb-0.5">Total</p>
                              <p className="text-lg font-bold text-blue-900">{cetap.totalUsuarios}</p>
                            </div>
                            <div className="bg-green-50 rounded p-2">
                              <p className="text-xs text-green-600 mb-0.5">Activos</p>
                              <p className="text-lg font-bold text-green-900">{cetap.usuariosActivos}</p>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-600">Activación</span>
                              <span className="text-xs font-semibold text-gray-900">{cetapTasa}%</span>
                            </div>
                            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                                style={{ width: `${cetapTasa}%` }}
                              />
                            </div>
                          </div>

                          {/* Roles principales del CETAP */}
                          {Object.keys(cetap.porRol).length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-xs text-gray-600 mb-1">Roles:</p>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(cetap.porRol)
                                  .sort(([, a], [, b]) => b - a)
                                  .slice(0, 2)
                                  .map(([rol, count]) => (
                                    <Badge 
                                      key={rol} 
                                      variant="secondary" 
                                      className="text-xs px-2 py-0.5"
                                    >
                                      {rol}: {count}
                                    </Badge>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
