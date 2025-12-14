import { useState } from 'react';
import { BarChart3, TrendingUp, Users, Award, Target, Calendar } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

interface AnalyticsModuleProps {
  className?: string;
}

export function AnalyticsModule({ className = '' }: AnalyticsModuleProps) {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('2025-I');

  const metricas = {
    total_docentes: 45,
    docentes_tiempo_completo: 32,
    docentes_ocasionales: 13,
    promedio_evaluacion: 4.3,
    ptas_aprobados: 42,
    ptas_pendientes: 3,
    convocatorias_activas: 2,
    candidatos_proceso: 18,
    horas_ensenanza_promedio: 24,
    horas_investigacion_promedio: 8
  };

  const tendencias = [
    { periodo: '2024-I', docentes: 40, evaluacion: 4.1 },
    { periodo: '2024-II', docentes: 43, evaluacion: 4.2 },
    { periodo: '2025-I', docentes: 45, evaluacion: 4.3 }
  ];

  const territoriales = [
    { nombre: 'Bogotá', docentes: 18, porcentaje: 40 },
    { nombre: 'Medellín', docentes: 12, porcentaje: 27 },
    { nombre: 'Cali', docentes: 10, porcentaje: 22 },
    { nombre: 'Barranquilla', docentes: 5, porcentaje: 11 }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Métricas y tendencias del módulo</p>
        </div>
        <select
          value={periodoSeleccionado}
          onChange={(e) => setPeriodoSeleccionado(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="2025-I">2025-I</option>
          <option value="2024-II">2024-II</option>
          <option value="2024-I">2024-I</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-blue-500" />
            <span className="text-3xl font-bold text-gray-900">{metricas.total_docentes}</span>
          </div>
          <p className="text-sm text-gray-600">Total Docentes</p>
          <div className="flex items-center gap-2 mt-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-xs text-green-600">+5 vs anterior</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-8 h-8 text-purple-500" />
            <span className="text-3xl font-bold text-purple-600">{metricas.promedio_evaluacion}</span>
          </div>
          <p className="text-sm text-gray-600">Evaluación Promedio</p>
          <p className="text-xs text-gray-500 mt-2">de 5.0</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-8 h-8 text-green-500" />
            <span className="text-3xl font-bold text-gray-900">{metricas.ptas_aprobados}</span>
          </div>
          <p className="text-sm text-gray-600">PTAs Aprobados</p>
          <p className="text-xs text-gray-500 mt-2">{metricas.ptas_pendientes} pendientes</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-8 h-8 text-amber-500" />
            <span className="text-3xl font-bold text-gray-900">{metricas.convocatorias_activas}</span>
          </div>
          <p className="text-sm text-gray-600">Convocatorias Activas</p>
          <p className="text-xs text-gray-500 mt-2">{metricas.candidatos_proceso} candidatos</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-gray-900 mb-4">Tendencia Histórica</h3>
          <div className="space-y-4">
            {tendencias.map((t) => (
              <div key={t.periodo}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{t.periodo}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">{t.docentes} docentes</span>
                    <Badge variant="secondary">{t.evaluacion} eval</Badge>
                  </div>
                </div>
                <Progress value={(t.docentes / 50) * 100} className="h-2" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-gray-900 mb-4">Distribución Territorial</h3>
          <div className="space-y-4">
            {territoriales.map((t) => (
              <div key={t.nombre}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{t.nombre}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{t.docentes}</span>
                    <span className="text-xs text-gray-500">({t.porcentaje}%)</span>
                  </div>
                </div>
                <Progress value={t.porcentaje} className="h-2 bg-[#1e5da8]" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-bold text-gray-900 mb-4">Distribución de Carga Horaria</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-2">Enseñanza (Promedio)</p>
            <div className="flex items-center gap-3">
              <Progress value={(metricas.horas_ensenanza_promedio / 40) * 100} className="flex-1 h-3 bg-blue-500" />
              <span className="text-lg font-bold text-blue-600">{metricas.horas_ensenanza_promedio}h</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Investigación (Promedio)</p>
            <div className="flex items-center gap-3">
              <Progress value={(metricas.horas_investigacion_promedio / 40) * 100} className="flex-1 h-3 bg-purple-500" />
              <span className="text-lg font-bold text-purple-600">{metricas.horas_investigacion_promedio}h</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
