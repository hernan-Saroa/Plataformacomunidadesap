/**
 * MÓDULO TÉRMINOS PARA INFORMES - MOD-11
 * Control de términos y fechas límite para informes
 */

import { useState, useMemo } from 'react';
import { Calendar, Plus, Search, Eye, FileText, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { ButtonSIGL, InputSIGL, SelectSIGL, BadgeSIGL, CardSIGL, useToast } from './design-system';

type ColorAlerta = 'VERDE' | 'AMARILLO' | 'ROJO' | 'VENCIDO';

interface Informe {
  id: string;
  nombreInforme: string;
  entidadDestino: string;
  periodicidad: 'MENSUAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
  fechaVencimiento: Date;
  diasRestantes: number;
  colorAlerta: ColorAlerta;
  responsable: string;
  estado: 'PENDIENTE' | 'EN_ELABORACION' | 'ENVIADO' | 'VENCIDO';
}

const INFORMES_MOCK: Informe[] = [
  { id: 'TI-2025-001', nombreInforme: 'Informe Gestión Legal Trimestral', entidadDestino: 'Ministerio de Educación', periodicidad: 'TRIMESTRAL', fechaVencimiento: new Date('2025-01-31'), diasRestantes: 44, responsable: 'Dra. Patricia González', colorAlerta: 'VERDE', estado: 'PENDIENTE' },
  { id: 'TI-2025-002', nombreInforme: 'Reporte Procesos Judiciales', entidadDestino: 'Contraloría General', periodicidad: 'MENSUAL', fechaVencimiento: new Date('2025-01-10'), diasRestantes: 23, responsable: 'Dr. Carlos Mendoza', colorAlerta: 'VERDE', estado: 'EN_ELABORACION' },
  { id: 'TI-2024-089', nombreInforme: 'Balance Gestión Contractual', entidadDestino: 'Procuraduría General', periodicidad: 'SEMESTRAL', fechaVencimiento: new Date('2024-12-20'), diasRestantes: 3, responsable: 'Dr. Luis Ramírez', colorAlerta: 'ROJO', estado: 'EN_ELABORACION' },
  { id: 'TI-2024-078', nombreInforme: 'Informe Disciplinario Anual', entidadDestino: 'Presidencia de la República', periodicidad: 'ANUAL', fechaVencimiento: new Date('2024-11-30'), diasRestantes: -17, responsable: 'Dra. Ana Torres', colorAlerta: 'VENCIDO', estado: 'VENCIDO' },
];

export function ModuloTerminos() {
  const { addToast } = useToast();
  const [informes] = useState<Informe[]>(INFORMES_MOCK);
  const [busqueda, setBusqueda] = useState('');
  const [filtroPeriodicidad, setFiltroPeriodicidad] = useState<string>('TODAS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');

  const estadisticas = useMemo(() => ({
    total: informes.length,
    pendientes: informes.filter(i => i.estado === 'PENDIENTE').length,
    enElaboracion: informes.filter(i => i.estado === 'EN_ELABORACION').length,
    vencidos: informes.filter(i => i.estado === 'VENCIDO').length,
    criticos: informes.filter(i => i.colorAlerta === 'ROJO').length,
  }), [informes]);

  const informesFiltrados = useMemo(() => {
    return informes.filter(inf => {
      const matchBusqueda = busqueda === '' || 
        inf.id.toLowerCase().includes(busqueda.toLowerCase()) ||
        inf.nombreInforme.toLowerCase().includes(busqueda.toLowerCase()) ||
        inf.entidadDestino.toLowerCase().includes(busqueda.toLowerCase());
      const matchPeriodicidad = filtroPeriodicidad === 'TODAS' || inf.periodicidad === filtroPeriodicidad;
      const matchEstado = filtroEstado === 'TODOS' || inf.estado === filtroEstado;
      return matchBusqueda && matchPeriodicidad && matchEstado;
    });
  }, [informes, busqueda, filtroPeriodicidad, filtroEstado]);

  const getColorAlerta = (color: ColorAlerta) => {
    switch (color) {
      case 'VERDE': return { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle };
      case 'AMARILLO': return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock };
      case 'ROJO': return { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle };
      case 'VENCIDO': return { bg: 'bg-red-900', text: 'text-white', icon: XCircle };
      default: return { bg: 'bg-gray-100', text: 'text-gray-800', icon: AlertCircle };
    }
  };

  const formatDate = (date: Date) => {
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${date.getDate()} ${meses[date.getMonth()]} ${date.getFullYear()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-100 rounded-lg">
              <Calendar className="w-6 h-6 text-cyan-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Términos para Informes</h1>
              <p className="text-gray-600">Control de fechas límite y términos para presentación de informes</p>
            </div>
          </div>
          <ButtonSIGL variant="primary" onClick={() => addToast({ type: 'info', title: 'Próximamente', message: 'Funcionalidad en desarrollo' })}>
            <Plus className="w-4 h-4" />
            Registrar Informe
          </ButtonSIGL>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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
              <div className="p-2 bg-gray-100 rounded-lg">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Pendientes</p>
                <p className="text-2xl font-bold text-gray-600">{estadisticas.pendientes}</p>
              </div>
            </div>
          </CardSIGL>

          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <FileText className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">En Elaboración</p>
                <p className="text-2xl font-bold text-yellow-600">{estadisticas.enElaboracion}</p>
              </div>
            </div>
          </CardSIGL>

          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Críticos</p>
                <p className="text-2xl font-bold text-red-600">{estadisticas.criticos}</p>
              </div>
            </div>
          </CardSIGL>

          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-900 rounded-lg">
                <XCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Vencidos</p>
                <p className="text-2xl font-bold text-red-900">{estadisticas.vencidos}</p>
              </div>
            </div>
          </CardSIGL>
        </div>

        <CardSIGL className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <InputSIGL
                placeholder="Buscar por ID, nombre o entidad destino..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <SelectSIGL
              value={filtroPeriodicidad}
              onChange={(e) => setFiltroPeriodicidad(e.target.value)}
              options={[
                { value: 'TODAS', label: 'Todas las periodicidades' },
                { value: 'MENSUAL', label: 'Mensual' },
                { value: 'TRIMESTRAL', label: 'Trimestral' },
                { value: 'SEMESTRAL', label: 'Semestral' },
                { value: 'ANUAL', label: 'Anual' },
              ]}
            />
            <SelectSIGL
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              options={[
                { value: 'TODOS', label: 'Todos los estados' },
                { value: 'PENDIENTE', label: 'Pendiente' },
                { value: 'EN_ELABORACION', label: 'En Elaboración' },
                { value: 'ENVIADO', label: 'Enviado' },
                { value: 'VENCIDO', label: 'Vencido' },
              ]}
            />
          </div>
        </CardSIGL>

        <CardSIGL>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alerta</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre Informe</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entidad Destino</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Periodicidad</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {informesFiltrados.map((informe) => {
                  const alertaColor = getColorAlerta(informe.colorAlerta);
                  const AlertIcon = alertaColor.icon;
                  
                  return (
                    <tr key={informe.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className={`p-2 rounded-lg ${alertaColor.bg} inline-flex`}>
                          <AlertIcon className={`w-5 h-5 ${alertaColor.text}`} />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">{informe.id}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-900 max-w-xs truncate">{informe.nombreInforme}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-700">{informe.entidadDestino}</p>
                      </td>
                      <td className="px-4 py-4">
                        <BadgeSIGL variant="info">{informe.periodicidad}</BadgeSIGL>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-700">{formatDate(informe.fechaVencimiento)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className={`font-bold text-lg ${
                          informe.diasRestantes < 0 ? 'text-red-600' :
                          informe.diasRestantes < 7 ? 'text-red-600' :
                          informe.diasRestantes < 15 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {informe.diasRestantes < 0 ? 
                            `${Math.abs(informe.diasRestantes)} (venc.)` :
                            informe.diasRestantes
                          }
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <BadgeSIGL
                          variant={informe.estado === 'VENCIDO' ? 'danger' : 
                                  informe.estado === 'ENVIADO' ? 'success' : 'warning'}
                        >
                          {informe.estado}
                        </BadgeSIGL>
                      </td>
                      <td className="px-4 py-4">
                        <ButtonSIGL variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </ButtonSIGL>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {informesFiltrados.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No se encontraron informes</p>
            </div>
          )}
        </CardSIGL>
      </div>
    </div>
  );
}
