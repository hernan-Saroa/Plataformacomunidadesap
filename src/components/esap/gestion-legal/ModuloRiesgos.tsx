/**
 * MÓDULO RIESGOS - MOD-09
 * Gestión de riesgos jurídicos institucionales
 */

import { useState, useMemo } from 'react';
import { AlertTriangle, Plus, Search, Eye, FileText } from 'lucide-react';
import { ButtonSIGL, InputSIGL, SelectSIGL, BadgeSIGL, CardSIGL, useToast } from './design-system';

type NivelRiesgo = 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';

interface Riesgo {
  id: string;
  descripcion: string;
  categoria: string;
  nivel: NivelRiesgo;
  probabilidad: number;
  impacto: number;
  responsable: string;
  estado: 'IDENTIFICADO' | 'EN_TRATAMIENTO' | 'MITIGADO';
}

const RIESGOS_MOCK: Riesgo[] = [
  { id: 'R-2025-001', descripcion: 'Posible demanda colectiva por graduados', categoria: 'Legal', nivel: 'ALTO', probabilidad: 70, impacto: 85, responsable: 'Dr. Carlos Mendoza', estado: 'EN_TRATAMIENTO' },
  { id: 'R-2025-002', descripcion: 'Incumplimiento normativa contratación', categoria: 'Contractual', nivel: 'MEDIO', probabilidad: 50, impacto: 60, responsable: 'Dra. Patricia González', estado: 'IDENTIFICADO' },
];

export function ModuloRiesgos() {
  const { addToast } = useToast();
  const [riesgos] = useState<Riesgo[]>(RIESGOS_MOCK);
  const [busqueda, setBusqueda] = useState('');
  const [filtroNivel, setFiltroNivel] = useState<string>('TODOS');

  const estadisticas = useMemo(() => ({
    total: riesgos.length,
    criticos: riesgos.filter(r => r.nivel === 'CRITICO').length,
    altos: riesgos.filter(r => r.nivel === 'ALTO').length,
    medios: riesgos.filter(r => r.nivel === 'MEDIO').length,
  }), [riesgos]);

  const riesgosFiltrados = useMemo(() => {
    return riesgos.filter(r => {
      const matchBusqueda = busqueda === '' || 
        r.id.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.descripcion.toLowerCase().includes(busqueda.toLowerCase());
      const matchNivel = filtroNivel === 'TODOS' || r.nivel === filtroNivel;
      return matchBusqueda && matchNivel;
    });
  }, [riesgos, busqueda, filtroNivel]);

  const getColorNivel = (nivel: NivelRiesgo) => {
    switch (nivel) {
      case 'CRITICO': return 'bg-red-900 text-white';
      case 'ALTO': return 'bg-red-100 text-red-800';
      case 'MEDIO': return 'bg-yellow-100 text-yellow-800';
      case 'BAJO': return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestión de Riesgos</h1>
              <p className="text-gray-600">Identificación y tratamiento de riesgos jurídicos</p>
            </div>
          </div>
          <ButtonSIGL variant="primary" onClick={() => addToast({ type: 'info', title: 'Próximamente', message: 'Funcionalidad en desarrollo' })}>
            <Plus className="w-4 h-4" />
            Registrar Riesgo
          </ButtonSIGL>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Riesgos</p>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.total}</p>
              </div>
            </div>
          </CardSIGL>
          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-900 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Críticos</p>
                <p className="text-2xl font-bold text-red-900">{estadisticas.criticos}</p>
              </div>
            </div>
          </CardSIGL>
          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Altos</p>
                <p className="text-2xl font-bold text-red-600">{estadisticas.altos}</p>
              </div>
            </div>
          </CardSIGL>
          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Medios</p>
                <p className="text-2xl font-bold text-yellow-600">{estadisticas.medios}</p>
              </div>
            </div>
          </CardSIGL>
        </div>

        <CardSIGL className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <InputSIGL
                placeholder="Buscar por ID o descripción..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <SelectSIGL
              value={filtroNivel}
              onChange={(e) => setFiltroNivel(e.target.value)}
              options={[
                { value: 'TODOS', label: 'Todos los niveles' },
                { value: 'CRITICO', label: 'Crítico' },
                { value: 'ALTO', label: 'Alto' },
                { value: 'MEDIO', label: 'Medio' },
                { value: 'BAJO', label: 'Bajo' },
              ]}
            />
          </div>
        </CardSIGL>

        <div className="space-y-4">
          {riesgosFiltrados.map((riesgo) => (
            <CardSIGL key={riesgo.id}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{riesgo.descripcion}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getColorNivel(riesgo.nivel)}`}>
                        {riesgo.nivel}
                      </span>
                      <BadgeSIGL variant={riesgo.estado === 'MITIGADO' ? 'success' : 'warning'}>
                        {riesgo.estado}
                      </BadgeSIGL>
                    </div>
                    <p className="text-sm text-gray-600">ID: {riesgo.id} | Categoría: {riesgo.categoria} | Responsable: {riesgo.responsable}</p>
                  </div>
                  <ButtonSIGL variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </ButtonSIGL>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Probabilidad: {riesgo.probabilidad}%</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full ${riesgo.probabilidad >= 70 ? 'bg-red-500' : riesgo.probabilidad >= 40 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${riesgo.probabilidad}%` }} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Impacto: {riesgo.impacto}%</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full ${riesgo.impacto >= 70 ? 'bg-red-500' : riesgo.impacto >= 40 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${riesgo.impacto}%` }} />
                    </div>
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
