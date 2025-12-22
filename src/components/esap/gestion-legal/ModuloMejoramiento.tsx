/**
 * MÓDULO PLANES DE MEJORAMIENTO - MOD-10
 * Seguimiento a planes de mejoramiento por hallazgos
 */

import { useState, useMemo } from 'react';
import { TrendingUp, Plus, Search, Eye, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { ButtonSIGL, InputSIGL, SelectSIGL, BadgeSIGL, CardSIGL, useToast } from './design-system';

interface PlanMejoramiento {
  id: string;
  origen: string;
  hallazgo: string;
  responsable: string;
  fechaInicio: Date;
  fechaCumplimiento: Date;
  avance: number;
  estado: 'EN_EJECUCION' | 'COMPLETADO' | 'VENCIDO';
}

const PLANES_MOCK: PlanMejoramiento[] = [
  { id: 'PM-2025-001', origen: 'Contraloría General', hallazgo: 'Deficiencias en archivo de contratos', responsable: 'Subdirección Administrativa', fechaInicio: new Date('2025-01-15'), fechaCumplimiento: new Date('2025-06-30'), avance: 25, estado: 'EN_EJECUCION' },
  { id: 'PM-2024-045', origen: 'Auditoría Interna', hallazgo: 'Falta actualización manual de procesos', responsable: 'Oficina Jurídica', fechaInicio: new Date('2024-09-01'), fechaCumplimiento: new Date('2024-12-31'), avance: 90, estado: 'EN_EJECUCION' },
];

export function ModuloMejoramiento() {
  const { addToast } = useToast();
  const [planes] = useState<PlanMejoramiento[]>(PLANES_MOCK);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');

  const estadisticas = useMemo(() => ({
    total: planes.length,
    enEjecucion: planes.filter(p => p.estado === 'EN_EJECUCION').length,
    completados: planes.filter(p => p.estado === 'COMPLETADO').length,
    vencidos: planes.filter(p => p.estado === 'VENCIDO').length,
  }), [planes]);

  const planesFiltrados = useMemo(() => {
    return planes.filter(p => {
      const matchBusqueda = busqueda === '' || 
        p.id.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.hallazgo.toLowerCase().includes(busqueda.toLowerCase());
      const matchEstado = filtroEstado === 'TODOS' || p.estado === filtroEstado;
      return matchBusqueda && matchEstado;
    });
  }, [planes, busqueda, filtroEstado]);

  const formatDate = (date: Date) => {
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${date.getDate()} ${meses[date.getMonth()]} ${date.getFullYear()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Planes de Mejoramiento</h1>
              <p className="text-gray-600">Seguimiento a planes por hallazgos de órganos de control</p>
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
                <TrendingUp className="w-5 h-5 text-blue-600" />
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
                <p className="text-xs text-gray-500">En Ejecución</p>
                <p className="text-2xl font-bold text-yellow-600">{estadisticas.enEjecucion}</p>
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
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Vencidos</p>
                <p className="text-2xl font-bold text-red-600">{estadisticas.vencidos}</p>
              </div>
            </div>
          </CardSIGL>
        </div>

        <CardSIGL className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <InputSIGL
                placeholder="Buscar por ID o hallazgo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <SelectSIGL
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              options={[
                { value: 'TODOS', label: 'Todos los estados' },
                { value: 'EN_EJECUCION', label: 'En Ejecución' },
                { value: 'COMPLETADO', label: 'Completado' },
                { value: 'VENCIDO', label: 'Vencido' },
              ]}
            />
          </div>
        </CardSIGL>

        <div className="space-y-4">
          {planesFiltrados.map((plan) => (
            <CardSIGL key={plan.id}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{plan.hallazgo}</h3>
                      <BadgeSIGL variant={plan.estado === 'COMPLETADO' ? 'success' : plan.estado === 'VENCIDO' ? 'danger' : 'warning'}>
                        {plan.estado}
                      </BadgeSIGL>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>ID: {plan.id} | Origen: {plan.origen}</p>
                      <p>Responsable: {plan.responsable}</p>
                      <p>Fecha cumplimiento: {formatDate(plan.fechaCumplimiento)}</p>
                    </div>
                  </div>
                  <ButtonSIGL variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </ButtonSIGL>
                </div>
                
                <div>
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
