/**
 * 📊 DASHBOARD EJECUTIVO - SISTEMA SIGL
 * 
 * Panel de control para tomadores de decisiones
 * - KPIs de cumplimiento de plazos legales
 * - Procesos en riesgo crítico
 * - Ranking de responsables por performance
 * - Módulos que requieren intervención
 * - Impacto financiero y riesgos
 * - Acciones recomendadas
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle, TrendingUp, TrendingDown, DollarSign, Users,
  Target, CheckCircle, XCircle, Clock, Calendar, Award,
  Activity, FileText, Download, Filter, Zap, ArrowRight,
  AlertOctagon, ThumbsUp, ThumbsDown, BarChart3, PieChart,
  TrendingUp as Trending, Flame, Shield, Eye, ArrowUp
} from 'lucide-react';
import {
  BarChart as RechartsBarChart, Bar, LineChart, Line, PieChart as RechartsPieChart,
  Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Area, AreaChart
} from 'recharts';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card } from '../../ui/card';
import { toast } from 'sonner@2.0.3';

type RangoDias = 'HOY' | '7_DIAS' | '30_DIAS' | '90_DIAS';

// Datos realistas orientados a resultados de negocio
const DATOS_CUMPLIMIENTO_MODULOS = [
  { modulo: 'Defensa Judicial', enPlazo: 42, vencidos: 8, criticos: 12, total: 62, tasaCumplimiento: 68, impactoFinanciero: 450000000 },
  { modulo: 'Órganos de Control', enPlazo: 28, vencidos: 2, criticos: 5, total: 35, tasaCumplimiento: 80, impactoFinanciero: 180000000 },
  { modulo: 'Juzgamiento Disciplinario', enPlazo: 38, vencidos: 1, criticos: 3, total: 42, tasaCumplimiento: 90, impactoFinanciero: 75000000 },
  { modulo: 'Asesoría Jurídica', enPlazo: 31, vencidos: 0, criticos: 4, total: 35, tasaCumplimiento: 89, impactoFinanciero: 0 },
  { modulo: 'Procesos Coactivos', enPlazo: 18, vencidos: 6, criticos: 8, total: 32, tasaCumplimiento: 56, impactoFinanciero: 320000000 },
  { modulo: 'Buzón Notificaciones', enPlazo: 22, vencidos: 3, criticos: 2, total: 27, tasaCumplimiento: 81, impactoFinanciero: 95000000 },
  { modulo: 'Plan de Acción', enPlazo: 25, vencidos: 0, criticos: 1, total: 26, tasaCumplimiento: 96, impactoFinanciero: 0 },
  { modulo: 'Riesgos', enPlazo: 19, vencidos: 1, criticos: 2, total: 22, tasaCumplimiento: 86, impactoFinanciero: 45000000 },
];

const DATOS_RESPONSABLES = [
  { nombre: 'María López Sánchez', procesosActivos: 15, enPlazo: 12, vencidos: 2, criticos: 1, tasaCumplimiento: 80, promedioDias: 3.2, tendencia: 'up' },
  { nombre: 'Juan Pérez García', procesosActivos: 22, enPlazo: 14, vencidos: 5, criticos: 3, tasaCumplimiento: 64, promedioDias: 5.8, tendencia: 'down' },
  { nombre: 'Ana Martínez Ruiz', procesosActivos: 18, enPlazo: 17, vencidos: 0, criticos: 1, tasaCumplimiento: 94, promedioDias: 2.1, tendencia: 'up' },
  { nombre: 'Carlos Rodríguez', procesosActivos: 12, enPlazo: 8, vencidos: 3, criticos: 1, tasaCumplimiento: 67, promedioDias: 6.3, tendencia: 'down' },
  { nombre: 'Sofía Ramírez Torres', procesosActivos: 20, enPlazo: 18, vencidos: 1, criticos: 1, tasaCumplimiento: 90, promedioDias: 2.5, tendencia: 'up' },
  { nombre: 'Pedro Gómez Díaz', procesosActivos: 16, enPlazo: 14, vencidos: 1, criticos: 1, tasaCumplimiento: 88, promedioDias: 2.8, tendencia: 'stable' },
  { nombre: 'Laura Fernández Castro', procesosActivos: 14, enPlazo: 10, vencidos: 3, criticos: 1, tasaCumplimiento: 71, promedioDias: 5.1, tendencia: 'down' },
  { nombre: 'Roberto Silva Moreno', procesosActivos: 19, enPlazo: 16, vencidos: 2, criticos: 1, tasaCumplimiento: 84, promedioDias: 3.5, tendencia: 'up' },
];

const DATOS_PROCESOS_CRITICOS = [
  { id: 'DJ-2024-001234', modulo: 'Defensa Judicial', expediente: '2024-001234', responsable: 'Juan Pérez García', diasRestantes: 1, fechaVencimiento: '2024-12-21', impacto: 85000000, prioridad: 'CRITICA' },
  { id: 'PC-2024-00789', modulo: 'Procesos Coactivos', expediente: '2024-PC-789', responsable: 'Carlos Rodríguez', diasRestantes: -2, fechaVencimiento: '2024-12-18', impacto: 120000000, prioridad: 'VENCIDO' },
  { id: 'DJ-2024-001567', modulo: 'Defensa Judicial', expediente: '2024-001567', responsable: 'Juan Pérez García', diasRestantes: 2, fechaVencimiento: '2024-12-22', impacto: 95000000, prioridad: 'CRITICA' },
  { id: 'OC-2024-00456', modulo: 'Órganos de Control', expediente: '2024-OC-456', responsable: 'María López Sánchez', diasRestantes: 3, fechaVencimiento: '2024-12-23', impacto: 65000000, prioridad: 'CRITICA' },
  { id: 'BN-2024-00111', modulo: 'Buzón Notificaciones', expediente: '2024-BN-111', responsable: 'Sofía Ramírez Torres', diasRestantes: -1, fechaVencimiento: '2024-12-19', impacto: 35000000, prioridad: 'VENCIDO' },
  { id: 'PC-2024-00892', modulo: 'Procesos Coactivos', expediente: '2024-PC-892', responsable: 'Laura Fernández Castro', diasRestantes: 2, fechaVencimiento: '2024-12-22', impacto: 78000000, prioridad: 'CRITICA' },
];

const DATOS_TENDENCIA_CUMPLIMIENTO = [
  { mes: 'Jul', cumplimiento: 72, vencidos: 18, criticos: 10 },
  { mes: 'Ago', cumplimiento: 75, vencidos: 15, criticos: 10 },
  { mes: 'Sep', cumplimiento: 78, vencidos: 13, criticos: 9 },
  { mes: 'Oct', cumplimiento: 76, vencidos: 14, criticos: 10 },
  { mes: 'Nov', cumplimiento: 81, vencidos: 11, criticos: 8 },
  { mes: 'Dic', cumplimiento: 79, vencidos: 12, criticos: 9 },
];

const DATOS_PROYECCION_7_DIAS = [
  { dia: 'Hoy', venceran: 2 },
  { dia: 'Mañana', venceran: 3 },
  { dia: 'Día 3', venceran: 5 },
  { dia: 'Día 4', venceran: 4 },
  { dia: 'Día 5', venceran: 7 },
  { dia: 'Día 6', venceran: 3 },
  { dia: 'Día 7', venceran: 4 },
];

const DATOS_IMPACTO_POR_TIPO = [
  { tipo: 'Vencidos', cantidad: 21, impacto: 595000000, color: '#EF4444' },
  { tipo: 'Críticos (1-3 días)', cantidad: 28, impacto: 570000000, color: '#F59E0B' },
  { tipo: 'En Plazo', cantidad: 213, impacto: 0, color: '#10B981' },
];

const formatearPesos = (valor: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
};

export function EstadisticasAlertas() {
  const [rangoDias, setRangoDias] = useState<RangoDias>('30_DIAS');
  const [moduloFiltro, setModuloFiltro] = useState<string>('TODOS');

  // Cálculo de KPIs ejecutivos
  const kpis = useMemo(() => {
    const totalProcesos = DATOS_CUMPLIMIENTO_MODULOS.reduce((acc, m) => acc + m.total, 0);
    const totalVencidos = DATOS_CUMPLIMIENTO_MODULOS.reduce((acc, m) => acc + m.vencidos, 0);
    const totalCriticos = DATOS_CUMPLIMIENTO_MODULOS.reduce((acc, m) => acc + m.criticos, 0);
    const totalEnPlazo = DATOS_CUMPLIMIENTO_MODULOS.reduce((acc, m) => acc + m.enPlazo, 0);
    const impactoFinancieroTotal = DATOS_CUMPLIMIENTO_MODULOS.reduce((acc, m) => acc + m.impactoFinanciero, 0);
    
    const tasaCumplimientoGlobal = ((totalEnPlazo / totalProcesos) * 100).toFixed(1);
    const promedioRespuesta = DATOS_RESPONSABLES.reduce((acc, r) => acc + r.promedioDias, 0) / DATOS_RESPONSABLES.length;
    
    return {
      totalProcesos,
      totalVencidos,
      totalCriticos,
      totalEnPlazo,
      tasaCumplimientoGlobal: parseFloat(tasaCumplimientoGlobal),
      impactoFinancieroTotal,
      promedioRespuesta: promedioRespuesta.toFixed(1),
      procesosEnRiesgo: totalVencidos + totalCriticos,
    };
  }, []);

  const modulosEnRiesgo = DATOS_CUMPLIMIENTO_MODULOS
    .filter(m => m.tasaCumplimiento < 75)
    .sort((a, b) => a.tasaCumplimiento - b.tasaCumplimiento);

  const topResponsables = [...DATOS_RESPONSABLES]
    .sort((a, b) => b.tasaCumplimiento - a.tasaCumplimiento)
    .slice(0, 3);

  const responsablesEnRiesgo = [...DATOS_RESPONSABLES]
    .filter(r => r.tasaCumplimiento < 75)
    .sort((a, b) => a.tasaCumplimiento - b.tasaCumplimiento);

  const handleExportarReporte = () => {
    const fecha = new Date().toLocaleDateString('es-CO');
    const reporte = `
╔═══════════════════════════════════════════════════════════════════════╗
║         REPORTE EJECUTIVO - CUMPLIMIENTO DE PLAZOS LEGALES          ║
║                    SISTEMA SIGL - ESAP                               ║
╚═══════════════════════════════════════════════════════════════════════╝

Fecha de generación: ${new Date().toLocaleString('es-CO')}
Período analizado: ${rangoDias === '7_DIAS' ? 'Últimos 7 días' : rangoDias === '30_DIAS' ? 'Últimos 30 días' : 'Últimos 90 días'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RESUMEN EJECUTIVO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total de Procesos Activos:        ${kpis.totalProcesos}
Tasa de Cumplimiento Global:      ${kpis.tasaCumplimientoGlobal}%

✅ Procesos en Plazo:              ${kpis.totalEnPlazo} (${((kpis.totalEnPlazo/kpis.totalProcesos)*100).toFixed(1)}%)
🔴 Procesos Vencidos:              ${kpis.totalVencidos} (${((kpis.totalVencidos/kpis.totalProcesos)*100).toFixed(1)}%)
⚠️  Procesos Críticos (1-3 días):  ${kpis.totalCriticos} (${((kpis.totalCriticos/kpis.totalProcesos)*100).toFixed(1)}%)

💰 Impacto Financiero por Riesgo: ${formatearPesos(kpis.impactoFinancieroTotal)}
⏱️  Tiempo Promedio de Respuesta:  ${kpis.promedioRespuesta} días

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 MÓDULOS QUE REQUIEREN INTERVENCIÓN INMEDIATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${modulosEnRiesgo.map((m, i) => `${i+1}. ${m.modulo.padEnd(30)} 
   Cumplimiento: ${m.tasaCumplimiento}%
   Vencidos: ${m.vencidos} | Críticos: ${m.criticos}
   Impacto: ${formatearPesos(m.impactoFinanciero)}
`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 RESPONSABLES CON BAJO DESEMPEÑO (< 75%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${responsablesEnRiesgo.map((r, i) => `${i+1}. ${r.nombre}
   Cumplimiento: ${r.tasaCumplimiento}% | Procesos vencidos: ${r.vencidos}
   Tiempo promedio: ${r.promedioDias} días
`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ PROCESOS QUE REQUIEREN ACCIÓN INMEDIATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${DATOS_PROCESOS_CRITICOS.slice(0, 10).map((p, i) => `${i+1}. ${p.expediente} - ${p.modulo}
   Responsable: ${p.responsable}
   Estado: ${p.diasRestantes < 0 ? 'VENCIDO hace ' + Math.abs(p.diasRestantes) + ' días' : 'Vence en ' + p.diasRestantes + ' días'}
   Impacto: ${formatearPesos(p.impacto)}
`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 RECOMENDACIONES ESTRATÉGICAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. CRÍTICO: Reasignar carga de ${responsablesEnRiesgo[0]?.nombre || 'N/A'} (${responsablesEnRiesgo[0]?.vencidos || 0} vencidos)
2. Reforzar equipo de ${modulosEnRiesgo[0]?.modulo || 'N/A'} (${modulosEnRiesgo[0]?.tasaCumplimiento || 0}% cumplimiento)
3. Escalar procesos con más de 5 días de atraso a supervisión
4. Implementar sesiones de capacitación en módulos críticos
5. Revisar redistribución de cargas entre responsables

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Este reporte fue generado automáticamente por SIGL
Sistema Integrado de Gestión Legal - ESAP
`;

    const blob = new Blob([reporte], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-ejecutivo-sigl-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('📊 Reporte Ejecutivo Descargado', {
      description: 'Análisis completo de cumplimiento de plazos'
    });
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 custom-scrollbar">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-orange-600" />
              Dashboard Ejecutivo
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Panel de control para la toma de decisiones estratégicas
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportarReporte}
              className="hover:bg-green-50 hover:border-green-300"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Reporte Ejecutivo
            </Button>
          </div>
        </div>

        {/* Alerta Crítica si hay procesos vencidos */}
        {kpis.totalVencidos > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border-red-300 border-2">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-500 rounded-lg">
                  <AlertOctagon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-red-900 flex items-center gap-2">
                    ⚠️ ALERTA CRÍTICA: {kpis.totalVencidos} Procesos Vencidos
                  </h3>
                  <p className="text-sm text-red-800 mt-1">
                    Requieren atención inmediata. Impacto financiero estimado: <span className="font-bold">{formatearPesos(DATOS_IMPACTO_POR_TIPO.find(d => d.tipo === 'Vencidos')?.impacto || 0)}</span>
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Ver Procesos Vencidos
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
                      Generar Plan de Acción
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* KPIs Ejecutivos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Cumplimiento Global */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
            <Card className={`p-5 ${kpis.tasaCumplimientoGlobal >= 80 ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' : kpis.tasaCumplimientoGlobal >= 60 ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200' : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'} hover:shadow-lg transition-shadow`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`p-3 ${kpis.tasaCumplimientoGlobal >= 80 ? 'bg-green-500' : kpis.tasaCumplimientoGlobal >= 60 ? 'bg-yellow-500' : 'bg-red-500'} rounded-lg shadow-md`}>
                  <Target className="w-6 h-6 text-white" />
                </div>
                <Badge className={kpis.tasaCumplimientoGlobal >= 80 ? 'bg-green-600 text-white' : kpis.tasaCumplimientoGlobal >= 60 ? 'bg-yellow-600 text-white' : 'bg-red-600 text-white'}>
                  {kpis.tasaCumplimientoGlobal >= 75 ? 'ACEPTABLE' : 'CRÍTICO'}
                </Badge>
              </div>
              <h3 className={`text-sm ${kpis.tasaCumplimientoGlobal >= 80 ? 'text-green-700' : kpis.tasaCumplimientoGlobal >= 60 ? 'text-yellow-700' : 'text-red-700'} font-semibold mb-1`}>Cumplimiento Global</h3>
              <p className={`text-3xl font-extrabold ${kpis.tasaCumplimientoGlobal >= 80 ? 'text-green-900' : kpis.tasaCumplimientoGlobal >= 60 ? 'text-yellow-900' : 'text-red-900'}`}>{kpis.tasaCumplimientoGlobal}%</p>
              <p className="text-xs text-gray-600 mt-1">{kpis.totalEnPlazo} de {kpis.totalProcesos} en plazo</p>
            </Card>
          </motion.div>

          {/* Procesos en Riesgo */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-5 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-orange-500 rounded-lg shadow-md">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <Badge className="bg-orange-600 text-white">
                  URGENTE
                </Badge>
              </div>
              <h3 className="text-sm text-orange-700 font-semibold mb-1">Procesos en Riesgo</h3>
              <p className="text-3xl font-extrabold text-orange-900">{kpis.procesosEnRiesgo}</p>
              <p className="text-xs text-orange-600 mt-1">{kpis.totalVencidos} vencidos + {kpis.totalCriticos} críticos</p>
            </Card>
          </motion.div>

          {/* Impacto Financiero */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-5 bg-gradient-to-br from-red-50 to-red-100 border-red-200 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-red-500 rounded-lg shadow-md">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <Badge className="bg-red-600 text-white">
                  RIESGO $
                </Badge>
              </div>
              <h3 className="text-sm text-red-700 font-semibold mb-1">Impacto Financiero</h3>
              <p className="text-xl font-extrabold text-red-900">{formatearPesos(kpis.impactoFinancieroTotal).replace('$', '$').substring(0, 8)}M</p>
              <p className="text-xs text-red-600 mt-1">Exposición por incumplimiento</p>
            </Card>
          </motion.div>

          {/* Tiempo de Respuesta */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-blue-500 rounded-lg shadow-md">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <Badge className="bg-blue-600 text-white">
                  Promedio
                </Badge>
              </div>
              <h3 className="text-sm text-blue-700 font-semibold mb-1">Tiempo de Respuesta</h3>
              <p className="text-3xl font-extrabold text-blue-900">{kpis.promedioRespuesta}</p>
              <p className="text-xs text-blue-600 mt-1">Días desde alerta hasta acción</p>
            </Card>
          </motion.div>
        </div>

        {/* Procesos Críticos - Tabla Accionable */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="p-6 bg-white shadow-lg border-2 border-red-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Procesos que Requieren Acción Inmediata
              </h3>
              <Badge className="bg-red-600 text-white">
                {DATOS_PROCESOS_CRITICOS.length} procesos
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="text-left p-3 font-bold text-gray-900">Estado</th>
                    <th className="text-left p-3 font-bold text-gray-900">Expediente</th>
                    <th className="text-left p-3 font-bold text-gray-900">Módulo</th>
                    <th className="text-left p-3 font-bold text-gray-900">Responsable</th>
                    <th className="text-left p-3 font-bold text-gray-900">Días</th>
                    <th className="text-left p-3 font-bold text-gray-900">Impacto</th>
                    <th className="text-center p-3 font-bold text-gray-900">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {DATOS_PROCESOS_CRITICOS.map((proceso, idx) => (
                    <tr key={proceso.id} className={`border-b border-gray-200 hover:bg-gray-50 ${proceso.prioridad === 'VENCIDO' ? 'bg-red-50' : ''}`}>
                      <td className="p-3">
                        {proceso.diasRestantes < 0 ? (
                          <Badge className="bg-red-600 text-white flex items-center gap-1 w-fit">
                            <XCircle className="w-3 h-3" />
                            VENCIDO
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-500 text-white flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" />
                            CRÍTICO
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-gray-900">{proceso.expediente}</td>
                      <td className="p-3 text-gray-700">{proceso.modulo}</td>
                      <td className="p-3 text-gray-700">{proceso.responsable}</td>
                      <td className="p-3">
                        <span className={`font-bold ${proceso.diasRestantes < 0 ? 'text-red-700' : 'text-orange-700'}`}>
                          {proceso.diasRestantes < 0 ? `${Math.abs(proceso.diasRestantes)} días vencido` : `${proceso.diasRestantes} días`}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-red-700">{formatearPesos(proceso.impacto).substring(0, 10)}</td>
                      <td className="p-3 text-center">
                        <Button size="sm" variant="outline" className="text-xs hover:bg-orange-50">
                          <ArrowRight className="w-3 h-3 mr-1" />
                          Escalar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

        {/* Análisis por Módulo y Responsables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Módulos en Riesgo */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
            <Card className="p-6 bg-white shadow-lg">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-600" />
                Salud Operacional por Módulo
              </h3>

              <div className="space-y-3">
                {DATOS_CUMPLIMIENTO_MODULOS.map((modulo, idx) => (
                  <div key={modulo.modulo} className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-900">{modulo.modulo}</span>
                      <div className="flex items-center gap-2">
                        {modulo.vencidos > 0 && (
                          <Badge className="bg-red-100 text-red-800 text-xs">
                            {modulo.vencidos} vencidos
                          </Badge>
                        )}
                        <Badge className={`text-xs ${modulo.tasaCumplimiento >= 80 ? 'bg-green-100 text-green-800' : modulo.tasaCumplimiento >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {modulo.tasaCumplimiento}%
                        </Badge>
                      </div>
                    </div>
                    <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full flex">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(modulo.enPlazo / modulo.total) * 100}%` }}
                          transition={{ duration: 1, delay: idx * 0.1 }}
                          className="bg-green-500"
                          title={`En plazo: ${modulo.enPlazo}`}
                        />
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(modulo.criticos / modulo.total) * 100}%` }}
                          transition={{ duration: 1, delay: idx * 0.1 }}
                          className="bg-orange-500"
                          title={`Críticos: ${modulo.criticos}`}
                        />
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(modulo.vencidos / modulo.total) * 100}%` }}
                          transition={{ duration: 1, delay: idx * 0.1 }}
                          className="bg-red-500"
                          title={`Vencidos: ${modulo.vencidos}`}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-xs text-gray-600">
                      <span>{modulo.total} procesos activos</span>
                      {modulo.impactoFinanciero > 0 && (
                        <span className="text-red-600 font-semibold">
                          Riesgo: {formatearPesos(modulo.impactoFinanciero).substring(0, 8)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-xs text-orange-800">
                  <strong>⚠️ Módulos que requieren intervención:</strong> {modulosEnRiesgo.map(m => m.modulo).join(', ')}
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Ranking de Responsables */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
            <Card className="p-6 bg-white shadow-lg">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-600" />
                Performance de Responsables
              </h3>

              <div className="space-y-2 mb-4">
                <h4 className="text-xs font-bold text-green-700 flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  TOP 3 - MEJOR DESEMPEÑO
                </h4>
                {topResponsables.map((resp, idx) => (
                  <div key={resp.nombre} className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                    <Badge className={idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-300 text-gray-900' : 'bg-orange-400 text-orange-900'}>
                      #{idx + 1}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{resp.nombre}</p>
                      <p className="text-xs text-gray-600">{resp.procesosActivos} procesos · {resp.promedioDias} días promedio</p>
                    </div>
                    <Badge className="bg-green-600 text-white flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      {resp.tasaCumplimiento}%
                    </Badge>
                  </div>
                ))}
              </div>

              {responsablesEnRiesgo.length > 0 && (
                <>
                  <div className="border-t border-gray-200 my-3" />
                  
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-red-700 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      REQUIEREN ATENCIÓN (Cumplimiento &lt; 75%)
                    </h4>
                    {responsablesEnRiesgo.map((resp, idx) => (
                      <div key={resp.nombre} className="flex items-center gap-2 p-2 bg-red-50 rounded border border-red-200">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{resp.nombre}</p>
                          <p className="text-xs text-gray-600">
                            {resp.vencidos} vencidos · {resp.criticos} críticos · {resp.promedioDias} días promedio
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-red-600 text-white flex items-center gap-1 mb-1">
                            <ThumbsDown className="w-3 h-3" />
                            {resp.tasaCumplimiento}%
                          </Badge>
                          <Button size="sm" variant="outline" className="text-xs">
                            Reasignar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs text-red-800">
                      <strong>🚨 Acción requerida:</strong> Redistribuir carga de trabajo y ofrecer soporte adicional
                    </p>
                  </div>
                </>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Tendencias y Proyecciones */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tendencia de Cumplimiento */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <Card className="p-6 bg-white shadow-lg">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Trending className="w-5 h-5 text-orange-600" />
                Tendencia de Cumplimiento (6 meses)
              </h3>

              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={DATOS_TENDENCIA_CUMPLIMIENTO}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="mes" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px' }} />
                  <Legend />
                  <Area type="monotone" dataKey="cumplimiento" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} name="% Cumplimiento" />
                  <Area type="monotone" dataKey="vencidos" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} name="Vencidos" />
                </AreaChart>
              </ResponsiveContainer>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-800">
                  <strong>📊 Análisis:</strong> Mejora del 7% en cumplimiento desde julio. 
                  Mantener tendencia positiva para alcanzar meta del 85%.
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Proyección 7 Días */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            <Card className="p-6 bg-white shadow-lg">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                Procesos que Vencerán en los Próximos 7 Días
              </h3>

              <ResponsiveContainer width="100%" height={250}>
                <RechartsBarChart data={DATOS_PROYECCION_7_DIAS}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="dia" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px' }} />
                  <Bar dataKey="venceran" fill="#F59E0B" radius={[8, 8, 0, 0]} name="Procesos" />
                </RechartsBarChart>
              </ResponsiveContainer>

              <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-xs text-yellow-800">
                  <strong>📅 Planificación:</strong> Se proyectan 28 vencimientos en los próximos 7 días. 
                  Día 5 tendrá mayor carga (7 procesos).
                </p>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Resumen Ejecutivo con Recomendaciones */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
          <Card className="p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border-blue-200 shadow-lg">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Resumen Ejecutivo y Acciones Recomendadas
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Situación Actual */}
              <div className="p-4 bg-white rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-sm text-gray-900">Situación Actual</h4>
                </div>
                <ul className="space-y-2 text-xs text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span><strong>79% de cumplimiento global</strong> - cerca de la meta del 85%</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span><strong>33 procesos en riesgo</strong> (21 vencidos + 12 críticos)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <DollarSign className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <span><strong>{formatearPesos(kpis.impactoFinancieroTotal)}</strong> en exposición financiera</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span><strong>3 responsables</strong> con desempeño bajo (&lt;75%)</span>
                  </li>
                </ul>
              </div>

              {/* Acciones Inmediatas */}
              <div className="p-4 bg-white rounded-lg border border-red-200">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-red-600" />
                  <h4 className="font-bold text-sm text-gray-900">Acciones Inmediatas (24-48h)</h4>
                </div>
                <ol className="space-y-2 text-xs text-gray-700 list-decimal list-inside">
                  <li><strong>CRÍTICO:</strong> Reasignar 5 procesos vencidos de Juan Pérez (64% cumplimiento)</li>
                  <li><strong>Escalar</strong> procesos con más de 3 días de atraso a supervisores</li>
                  <li><strong>Reforzar</strong> equipo de Defensa Judicial (68% cumplimiento, $450M en riesgo)</li>
                  <li><strong>Reunión urgente</strong> con responsables en riesgo para plan de recuperación</li>
                  <li><strong>Activar</strong> protocolo de crisis para Procesos Coactivos (56% cumplimiento)</li>
                </ol>
              </div>

              {/* Estrategias Mediano Plazo */}
              <div className="p-4 bg-white rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-green-600" />
                  <h4 className="font-bold text-sm text-gray-900">Estrategias (1-3 meses)</h4>
                </div>
                <ul className="space-y-2 text-xs text-gray-700">
                  <li className="flex items-start gap-2">
                    <ArrowUp className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Redistribuir cargas:</strong> balancear entre Ana Martínez (94%) y Juan Pérez (64%)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Capacitación:</strong> reforzar prácticas en módulos críticos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Prevención:</strong> aumentar frecuencia de alertas en procesos de alto impacto</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Activity className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Monitoreo:</strong> revisión semanal de KPIs con jefes de área</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-4 p-4 bg-white rounded-lg border-2 border-orange-300">
              <p className="text-sm text-gray-900">
                <strong className="text-orange-700">💡 Recomendación del Sistema:</strong> 
                Priorizar intervención en <strong>Defensa Judicial</strong> ($450M en riesgo) y 
                <strong> Procesos Coactivos</strong> (56% cumplimiento). Reasignar inmediatamente 
                procesos vencidos de responsables con bajo desempeño. Meta: alcanzar 85% de cumplimiento en 60 días.
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
