/**
 * ============================================
 * MÓDULO JUZGAMIENTO DISCIPLINARIO - MOD-04
 * ============================================
 * Gestión de procesos disciplinarios de primera instancia
 */

import { useState, useMemo } from 'react';
import { Gavel, Plus, Search, Download, Eye, Send, FileText, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { ButtonSIGL, InputSIGL, SelectSIGL, BadgeSIGL, CardSIGL, useToast } from './design-system';

type EstadoProceso = 'APERTURA' | 'DESCARGOS' | 'PRUEBAS' | 'DECISION' | 'CERRADO';

interface ProcesoDisciplinario {
  id: string;
  investigado: string;
  conducta: string;
  fechaApertura: Date;
  estado: EstadoProceso;
  abogado: string;
  diasRestantes: number;
}

const PROCESOS_MOCK: ProcesoDisciplinario[] = [
  {
    id: 'JD-2025-00001',
    investigado: 'Pedro González (CC 123456)',
    conducta: 'Presunto incumplimiento de deberes funcionales',
    fechaApertura: new Date('2024-11-15'),
    estado: 'DESCARGOS',
    abogado: 'Dr. Carlos Mendoza',
    diasRestantes: 45,
  },
  {
    id: 'JD-2025-00002',
    investigado: 'María Torres (CC 789012)',
    conducta: 'Presunta utilización indebida de recursos institucionales',
    fechaApertura: new Date('2024-12-01'),
    estado: 'APERTURA',
    abogado: 'Dra. Patricia González',
    diasRestantes: 60,
  },
];

export function ModuloJuzgamientoDisciplinario() {
  const { addToast } = useToast();
  const [procesos] = useState<ProcesoDisciplinario[]>(PROCESOS_MOCK);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');

  const estadisticas = useMemo(() => ({
    total: procesos.length,
    apertura: procesos.filter(p => p.estado === 'APERTURA').length,
    descargos: procesos.filter(p => p.estado === 'DESCARGOS').length,
    decision: procesos.filter(p => p.estado === 'DECISION').length,
  }), [procesos]);

  const procesosFiltrados = useMemo(() => {
    return procesos.filter(p => {
      const matchBusqueda = busqueda === '' || 
        p.id.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.investigado.toLowerCase().includes(busqueda.toLowerCase());
      const matchEstado = filtroEstado === 'TODOS' || p.estado === filtroEstado;
      return matchBusqueda && matchEstado;
    });
  }, [procesos, busqueda, filtroEstado]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Gavel className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Juzgamiento Disciplinario</h1>
              <p className="text-gray-600">Procesos disciplinarios de primera instancia</p>
            </div>
          </div>
          <ButtonSIGL variant="primary" onClick={() => addToast({ type: 'info', title: 'Próximamente', message: 'Funcionalidad en desarrollo' })}>
            <Plus className="w-4 h-4" />
            Nuevo Proceso
          </ButtonSIGL>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total</p>
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
                <p className="text-xs text-gray-500">Apertura</p>
                <p className="text-2xl font-bold text-yellow-600">{estadisticas.apertura}</p>
              </div>
            </div>
          </CardSIGL>
          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Descargos</p>
                <p className="text-2xl font-bold text-orange-600">{estadisticas.descargos}</p>
              </div>
            </div>
          </CardSIGL>
          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Decisión</p>
                <p className="text-2xl font-bold text-green-600">{estadisticas.decision}</p>
              </div>
            </div>
          </CardSIGL>
        </div>

        <CardSIGL className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <InputSIGL
                placeholder="Buscar por ID o investigado..."
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
                { value: 'APERTURA', label: 'Apertura' },
                { value: 'DESCARGOS', label: 'Descargos' },
                { value: 'PRUEBAS', label: 'Pruebas' },
                { value: 'DECISION', label: 'Decisión' },
                { value: 'CERRADO', label: 'Cerrado' },
              ]}
            />
          </div>
        </CardSIGL>

        <CardSIGL>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Investigado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conducta</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Abogado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {procesosFiltrados.map((proceso) => (
                  <tr key={proceso.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900">{proceso.id}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900">{proceso.investigado}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900 max-w-xs truncate">{proceso.conducta}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-700">{proceso.abogado}</p>
                    </td>
                    <td className="px-4 py-4">
                      <BadgeSIGL variant={proceso.estado === 'DECISION' ? 'success' : 'warning'}>
                        {proceso.estado}
                      </BadgeSIGL>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-lg text-green-600">{proceso.diasRestantes}</p>
                    </td>
                    <td className="px-4 py-4">
                      <ButtonSIGL variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </ButtonSIGL>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardSIGL>
      </div>
    </div>
  );
}
