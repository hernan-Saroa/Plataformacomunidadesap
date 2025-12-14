/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * VISTA DETALLADA DEL MGPTI
 * Modelo de Gestión de Proyectos de TI - MRAE v3.0
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 4 Dominios | 14 Lineamientos Oficiales MinTIC
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderKanban,
  Target,
  Calendar,
  Play,
  CheckCircle2,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  UserCheck,
  FileCheck
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { getAllLineamientosMGPTI, getEstadisticasMGPTI } from '../../lib/data/lineamientos-mgpti';

export function VistaDetalladaMGPTI() {
  const [expandedDominio, setExpandedDominio] = useState<string | null>(null);
  
  const stats = getEstadisticasMGPTI();
  const todosLineamientos = getAllLineamientosMGPTI();

  // Agrupar lineamientos por dominio
  const lineamientosPorDominio = todosLineamientos.reduce((acc, lineamiento) => {
    const dominio = lineamiento.dominio || 'otros';
    if (!acc[dominio]) {
      acc[dominio] = [];
    }
    acc[dominio].push(lineamiento);
    return acc;
  }, {} as Record<string, typeof todosLineamientos>);

  const dominios = [
    {
      id: 'contexto-estrategico',
      nombre: 'Contexto Estratégico',
      icon: Target,
      descripcion: 'Alineación de proyectos con estrategia institucional',
      color: '#3B82F6',
      lineamientos: lineamientosPorDominio['contexto-estrategico'] || []
    },
    {
      id: 'planeacion',
      nombre: 'Planeación',
      icon: Calendar,
      descripcion: 'Definición de alcance, cronograma y recursos',
      color: '#9333EA',
      lineamientos: lineamientosPorDominio['planeacion'] || []
    },
    {
      id: 'ejecucion-control',
      nombre: 'Ejecución y Control',
      icon: Play,
      descripcion: 'Implementación y seguimiento del proyecto',
      color: '#059669',
      lineamientos: lineamientosPorDominio['ejecucion-control'] || []
    },
    {
      id: 'cierre',
      nombre: 'Cierre',
      icon: CheckCircle2,
      descripcion: 'Finalización y transferencia de conocimiento',
      color: '#F59E0B',
      lineamientos: lineamientosPorDominio['cierre'] || []
    }
  ];

  const getEstadoBadge = (estado: string) => {
    const config: Record<string, { bg: string; text: string; icon: any }> = {
      'Completo': { bg: '#D1FAE5', text: '#065F46', icon: CheckCircle },
      'En Progreso': { bg: '#DBEAFE', text: '#1E40AF', icon: Clock },
      'Pendiente': { bg: '#FEF3C7', text: '#92400E', icon: AlertCircle }
    };
    const style = config[estado] || config['Pendiente'];
    const Icon = style.icon;
    return (
      <Badge className="border-0 text-xs" style={{ background: style.bg, color: style.text, fontWeight: 600 }}>
        <Icon className="w-3 h-3 mr-1" />
        {estado}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-bold text-2xl text-gray-900 mb-2">
          MGPTI - Modelo de Gestión de Proyectos de TI
        </h2>
        <p className="text-gray-600">
          {stats.totalLineamientos} lineamientos distribuidos en {dominios.length} dominios oficiales MinTIC
        </p>
      </div>

      {/* Estadísticas Globales MGPTI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-green-600" />
            <p className="text-xs text-gray-600">Total</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalLineamientos}</p>
        </Card>

        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <p className="text-xs text-gray-600">Completos</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.completos}</p>
        </Card>

        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <p className="text-xs text-gray-600">En Progreso</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.enProgreso}</p>
        </Card>

        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <FolderKanban className="w-4 h-4 text-green-600" />
            <p className="text-xs text-gray-600">Progreso</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.progresoPromedio}%</p>
        </Card>
      </div>

      {/* Grid de Dominios MGPTI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dominios.map((dominio) => {
          const Icon = dominio.icon;
          const lineamientos = dominio.lineamientos;
          const lineamientosCompletos = lineamientos.filter(l => l.estado === 'Completo').length;
          const progreso = lineamientos.length > 0 ? (lineamientosCompletos / lineamientos.length) * 100 : 0;
          const isExpanded = expandedDominio === dominio.id;

          return (
            <Card key={dominio.id} className="border border-gray-200 hover:shadow-lg transition-all overflow-hidden">
              {/* Header del dominio */}
              <div 
                className="p-4 cursor-pointer"
                style={{ background: `${dominio.color}15` }}
                onClick={() => setExpandedDominio(isExpanded ? null : dominio.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2.5 rounded-lg"
                      style={{ background: 'white' }}
                    >
                      <Icon className="w-5 h-5" style={{ color: dominio.color }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm text-gray-900">
                        {dominio.nombre}
                      </h3>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {lineamientos.length} lineamientos
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedDominio(isExpanded ? null : dominio.id);
                    }}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>

                <p className="text-xs text-gray-700 mb-3">
                  {dominio.descripcion}
                </p>

                {/* Barra de progreso */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Progreso</span>
                    <span className="font-semibold text-gray-900">{Math.round(progreso)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${progreso}%`,
                        background: dominio.color
                      }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                  <span>{lineamientosCompletos}/{lineamientos.length} completos</span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {lineamientos.length}
                  </span>
                </div>
              </div>

              {/* Lista expandida de lineamientos */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-200"
                  >
                    <div className="p-4 bg-gray-50">
                      <h4 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-2">
                        <FileCheck className="w-4 h-4" />
                        Lineamientos ({lineamientos.length})
                      </h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {lineamientos.map((lineamiento) => (
                          <div
                            key={lineamiento.codigo}
                            className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-sm transition-shadow"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                    {lineamiento.codigo}
                                  </span>
                                  {lineamiento.obligatorio && (
                                    <Badge className="text-xs border-0" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                                      Obligatorio
                                    </Badge>
                                  )}
                                </div>
                                <h5 className="font-medium text-xs text-gray-900 mb-1">
                                  {lineamiento.nombre}
                                </h5>
                                <p className="text-xs text-gray-600 mb-2">
                                  {lineamiento.descripcion}
                                </p>
                              </div>
                              {getEstadoBadge(lineamiento.estado)}
                            </div>

                            {/* Barra de progreso del lineamiento */}
                            <div className="mb-2">
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="h-1.5 rounded-full"
                                  style={{
                                    width: `${lineamiento.progreso}%`,
                                    background: dominio.color
                                  }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <UserCheck className="w-3 h-3" />
                                {lineamiento.responsable}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {lineamiento.fechaActualizacion}
                              </span>
                            </div>

                            {/* Evidencias */}
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <p className="text-xs font-medium text-gray-700 mb-1">
                                Evidencias requeridas:
                              </p>
                              <ul className="text-xs text-gray-600 space-y-0.5">
                                {lineamiento.evidencias.slice(0, 2).map((evidencia, idx) => (
                                  <li key={idx} className="flex items-start gap-1">
                                    <span className="text-gray-400">•</span>
                                    <span>{evidencia}</span>
                                  </li>
                                ))}
                                {lineamiento.evidencias.length > 2 && (
                                  <li className="text-gray-500 italic">
                                    +{lineamiento.evidencias.length - 2} más...
                                  </li>
                                )}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
