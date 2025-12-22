/**
 * MÓDULO PLAN DE ACCIÓN - MOD-08
 * Seguimiento a planes de acción institucionales
 */

import { useState, useMemo } from 'react';
import { Target, Plus, Search, Eye, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { ButtonSIGL, InputSIGL, BadgeSIGL, CardSIGL, useToast } from './design-system';

interface PlanAccion {
  id: string;
  nombre: string;
  responsable: string;
  fechaInicio: Date;
  fechaFin: Date;
  avance: number;
  estado: 'EN_CURSO' | 'COMPLETADO' | 'ATRASADO';
}

const PLANES_MOCK: PlanAccion[] = [
  { id: 'PA-2025-001', nombre: 'Plan de Mejoramiento Gestión Legal 2025', responsable: 'Dra. Patricia González', fechaInicio: new Date('2025-01-01'), fechaFin: new Date('2025-12-31'), avance: 15, estado: 'EN_CURSO' },
  { id: 'PA-2024-012', nombre: 'Actualización Manual de Contratación', responsable: 'Dr. Carlos Mendoza', fechaInicio: new Date('2024-06-01'), fechaFin: new Date('2024-12-31'), avance: 85, estado: 'EN_CURSO' },
];

export function ModuloPlanAccion() {
  const { addToast } = useToast();
  const [planes] = useState<PlanAccion[]>(PLANES_MOCK);
  const [busqueda, setBusqueda] = useState('');

  const estadisticas = useMemo(() => ({
    total: planes.length,
    enCurso: planes.filter(p => p.estado === 'EN_CURSO').length,
    completados: planes.filter(p => p.estado === 'COMPLETADO').length,
    promedioAvance: Math.round(planes.reduce((sum, p) => sum + p.avance, 0) / planes.length),
  }), [planes]);

  const planesFiltrados = planes.filter(p => 
    busqueda === '' || 
    p.id.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-teal-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Plan de Acción</h1>
              <p className="text-gray-600">Seguimiento a planes de acción institucionales</p>
            </div>
          </div>
          <ButtonSIGL variant="primary" onClick={() => addToast({ type: 'info', title: 'Próximamente', message: 'Funcionalidad en desarrollo' })}>
            <Plus className="w-4 h-4" />
            Nuevo Plan
          </ButtonSIGL>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Planes</p>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.total}</p>
              </div>
            </div>
          </CardSIGL>
          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">En Curso</p>
                <p className="text-2xl font-bold text-yellow-600">{estadisticas.enCurso}</p>
              </div>
            </div>
          </CardSIGL>
          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Completados</p>
                <p className="text-2xl font-bold text-green-600">{estadisticas.completados}</p>
              </div>
            </div>
          </CardSIGL>
          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Avance Promedio</p>
                <p className="text-2xl font-bold text-purple-600">{estadisticas.promedioAvance}%</p>
              </div>
            </div>
          </CardSIGL>
        </div>

        <CardSIGL className="p-4 mb-6">
          <InputSIGL
            placeholder="Buscar por ID o nombre del plan..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </CardSIGL>

        <div className="space-y-4">
          {planesFiltrados.map((plan) => (
            <CardSIGL key={plan.id}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{plan.nombre}</h3>
                      <BadgeSIGL variant={plan.estado === 'COMPLETADO' ? 'success' : plan.estado === 'ATRASADO' ? 'danger' : 'warning'}>
                        {plan.estado}
                      </BadgeSIGL>
                    </div>
                    <p className="text-sm text-gray-600">ID: {plan.id} | Responsable: {plan.responsable}</p>
                  </div>
                  <ButtonSIGL variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </ButtonSIGL>
                </div>
                
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Avance: {plan.avance}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${plan.avance >= 75 ? 'bg-green-500' : plan.avance >= 50 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                      style={{ width: `${plan.avance}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardSIGL>
          ))}
        </div>
      </div>
    </div>
  );
}
