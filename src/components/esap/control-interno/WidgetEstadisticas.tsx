/**
 * WIDGET DE ESTADÍSTICAS - CONTROL INTERNO
 * Resumen compacto que enlaza al Dashboard Ejecutivo
 */

'use client';

import React from 'react';
import { BarChart3, TrendingUp, ArrowRight, Activity, AlertTriangle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';

interface WidgetEstadisticasProps {
  onVerDashboard?: () => void;
}

export function WidgetEstadisticas({ onVerDashboard }: WidgetEstadisticasProps) {
  // Métricas resumidas
  const metricas = {
    cumplimientoGeneral: 67,
    actividadesCompletadas: 28,
    totalActividades: 45,
    auditoriasEnCurso: 8,
    hallazgosCriticos: 8,
  };

  return (
    <div className="bg-white rounded-xl border p-4 sm:p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ backgroundColor: '#E0EFFF' }}>
            <BarChart3 className="w-5 h-5" style={{ color: '#003DA5' }} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Estadísticas</h3>
            <p className="text-xs text-gray-500">Resumen ejecutivo</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onVerDashboard}
          className="text-xs"
        >
          <span>Ver Dashboard</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Métrica Principal - Cumplimiento General */}
      <div
        className="rounded-lg p-4 mb-4"
        style={{ backgroundColor: '#003DA5' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/80">Cumplimiento General</span>
          <TrendingUp className="w-4 h-4 text-white/80" />
        </div>
        <div className="flex items-end gap-2">
          <p className="text-4xl font-bold text-white">{metricas.cumplimientoGeneral}%</p>
          <Badge className="bg-green-500/20 text-green-100 border-green-500/30 mb-1">
            +5% vs mes anterior
          </Badge>
        </div>
        <div className="mt-3 bg-white/20 rounded-full h-2 overflow-hidden">
          <div
            className="bg-white h-full transition-all duration-500"
            style={{ width: `${metricas.cumplimientoGeneral}%` }}
          />
        </div>
      </div>

      {/* Métricas Secundarias */}
      <div className="grid grid-cols-2 gap-3">
        {/* Actividades */}
        <div className="border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-600">Actividades</span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {metricas.actividadesCompletadas}
            <span className="text-sm font-normal text-gray-500">
              /{metricas.totalActividades}
            </span>
          </p>
          <div className="mt-2 bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-green-500 h-full"
              style={{
                width: `${(metricas.actividadesCompletadas / metricas.totalActividades) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Auditorías en Curso */}
        <div className="border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4" style={{ color: '#003DA5' }} />
            <span className="text-xs text-gray-600">Auditorías</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{metricas.auditoriasEnCurso}</p>
          <p className="text-xs text-gray-500 mt-1">En curso</p>
        </div>

        {/* Hallazgos Críticos */}
        <div className="border rounded-lg p-3 col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-xs text-gray-600">Hallazgos Críticos</span>
            </div>
            <Badge className="bg-red-100 text-red-800 border-red-200">
              {metricas.hallazgosCriticos} activos
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Requieren atención inmediata
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-4 pt-4 border-t">
        <Button
          onClick={onVerDashboard}
          className="w-full"
          style={{ backgroundColor: '#003DA5' }}
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Ver Dashboard Completo
        </Button>
      </div>
    </div>
  );
}
