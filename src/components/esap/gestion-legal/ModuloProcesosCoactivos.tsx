/**
 * MÓDULO PROCESOS COACTIVOS - MOD-05
 * Gestión de cobro coactivo
 */

import { useState, useMemo } from 'react';
import { DollarSign, Plus, Search, Eye, FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { ButtonSIGL, InputSIGL, SelectSIGL, BadgeSIGL, CardSIGL, useToast } from './design-system';

interface ProcesoCoactivo {
  id: string;
  deudor: string;
  concepto: string;
  valorAdeudado: number;
  estado: 'MANDAMIENTO' | 'EMBARGO' | 'REMATE' | 'TERMINADO';
  diasRestantes: number;
}

const PROCESOS_MOCK: ProcesoCoactivo[] = [
  { id: 'PC-2025-00001', deudor: 'Constructora XYZ S.A.S.', concepto: 'Incumplimiento Contrato 2024-015', valorAdeudado: 45000000, estado: 'MANDAMIENTO', diasRestantes: 30 },
  { id: 'PC-2024-00089', deudor: 'Juan Pérez González', concepto: 'Cobro matrícula', valorAdeudado: 2500000, estado: 'EMBARGO', diasRestantes: 15 },
];

export function ModuloProcesosCoactivos() {
  const { addToast } = useToast();
  const [procesos] = useState<ProcesoCoactivo[]>(PROCESOS_MOCK);
  const [busqueda, setBusqueda] = useState('');

  const estadisticas = useMemo(() => ({
    total: procesos.length,
    mandamiento: procesos.filter(p => p.estado === 'MANDAMIENTO').length,
    embargo: procesos.filter(p => p.estado === 'EMBARGO').length,
    valorTotal: procesos.reduce((sum, p) => sum + p.valorAdeudado, 0),
  }), [procesos]);

  const procesosFiltrados = procesos.filter(p => 
    busqueda === '' || 
    p.id.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.deudor.toLowerCase().includes(busqueda.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    const valorStr = value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `$ ${valorStr}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Procesos Coactivos</h1>
              <p className="text-gray-600">Gestión de cobro coactivo</p>
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
                <p className="text-xs text-gray-500">Total Procesos</p>
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
                <p className="text-xs text-gray-500">Mandamiento</p>
                <p className="text-2xl font-bold text-yellow-600">{estadisticas.mandamiento}</p>
              </div>
            </div>
          </CardSIGL>
          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Embargo</p>
                <p className="text-2xl font-bold text-orange-600">{estadisticas.embargo}</p>
              </div>
            </div>
          </CardSIGL>
          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Valor Total</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(estadisticas.valorTotal)}</p>
              </div>
            </div>
          </CardSIGL>
        </div>

        <CardSIGL className="p-4 mb-6">
          <InputSIGL
            placeholder="Buscar por ID o deudor..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </CardSIGL>

        <CardSIGL>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deudor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor Adeudado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
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
                      <p className="text-sm text-gray-900">{proceso.deudor}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900 max-w-xs truncate">{proceso.concepto}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-amber-600">{formatCurrency(proceso.valorAdeudado)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <BadgeSIGL variant={proceso.estado === 'TERMINADO' ? 'success' : 'warning'}>
                        {proceso.estado}
                      </BadgeSIGL>
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
