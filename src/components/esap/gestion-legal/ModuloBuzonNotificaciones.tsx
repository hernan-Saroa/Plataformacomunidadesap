/**
 * MÓDULO BUZÓN DE NOTIFICACIONES - MOD-06
 * Control de términos de notificaciones judiciales
 */

import { useState, useMemo } from 'react';
import { Mail, Plus, Search, Eye, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { ButtonSIGL, InputSIGL, SelectSIGL, BadgeSIGL, CardSIGL, useToast } from './design-system';

interface Notificacion {
  id: string;
  expediente: string;
  tipoNotificacion: string;
  fechaRecepcion: Date;
  fechaVencimiento: Date;
  diasRestantes: number;
  estado: 'PENDIENTE' | 'LEIDA' | 'RESPONDIDA' | 'VENCIDA';
}

const NOTIFICACIONES_MOCK: Notificacion[] = [
  { id: 'BN-2025-00001', expediente: 'PJ-2025-00001', tipoNotificacion: 'Auto admisorio demanda', fechaRecepcion: new Date('2024-12-15'), fechaVencimiento: new Date('2024-12-25'), diasRestantes: 8, estado: 'PENDIENTE' },
  { id: 'BN-2025-00002', expediente: 'PJ-2025-00004', tipoNotificacion: 'Solicitud de pruebas', fechaRecepcion: new Date('2024-12-10'), fechaVencimiento: new Date('2024-12-30'), diasRestantes: 13, estado: 'LEIDA' },
  { id: 'BN-2024-00189', expediente: 'PJ-2024-00156', tipoNotificacion: 'Sentencia de primera instancia', fechaRecepcion: new Date('2024-11-20'), fechaVencimiento: new Date('2024-12-05'), diasRestantes: -12, estado: 'VENCIDA' },
];

export function ModuloBuzonNotificaciones() {
  const { addToast } = useToast();
  const [notificaciones] = useState<Notificacion[]>(NOTIFICACIONES_MOCK);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');

  const estadisticas = useMemo(() => ({
    total: notificaciones.length,
    pendientes: notificaciones.filter(n => n.estado === 'PENDIENTE').length,
    leidas: notificaciones.filter(n => n.estado === 'LEIDA').length,
    vencidas: notificaciones.filter(n => n.estado === 'VENCIDA').length,
  }), [notificaciones]);

  const notificacionesFiltradas = useMemo(() => {
    return notificaciones.filter(n => {
      const matchBusqueda = busqueda === '' || 
        n.id.toLowerCase().includes(busqueda.toLowerCase()) ||
        n.expediente.toLowerCase().includes(busqueda.toLowerCase());
      const matchEstado = filtroEstado === 'TODOS' || n.estado === filtroEstado;
      return matchBusqueda && matchEstado;
    });
  }, [notificaciones, busqueda, filtroEstado]);

  const formatDate = (date: Date) => {
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${date.getDate()} ${meses[date.getMonth()]} ${date.getFullYear()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Mail className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Buzón de Notificaciones</h1>
              <p className="text-gray-600">Control de términos de notificaciones judiciales</p>
            </div>
          </div>
          <ButtonSIGL variant="primary" onClick={() => addToast({ type: 'info', title: 'Próximamente', message: 'Funcionalidad en desarrollo' })}>
            <Plus className="w-4 h-4" />
            Registrar Notificación
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
                <p className="text-xs text-gray-500">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{estadisticas.pendientes}</p>
              </div>
            </div>
          </CardSIGL>
          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Leídas</p>
                <p className="text-2xl font-bold text-blue-600">{estadisticas.leidas}</p>
              </div>
            </div>
          </CardSIGL>
          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Vencidas</p>
                <p className="text-2xl font-bold text-red-600">{estadisticas.vencidas}</p>
              </div>
            </div>
          </CardSIGL>
        </div>

        <CardSIGL className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <InputSIGL
                placeholder="Buscar por ID o expediente..."
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
                { value: 'PENDIENTE', label: 'Pendiente' },
                { value: 'LEIDA', label: 'Leída' },
                { value: 'RESPONDIDA', label: 'Respondida' },
                { value: 'VENCIDA', label: 'Vencida' },
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expediente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recepción</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {notificacionesFiltradas.map((notif) => (
                  <tr key={notif.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900">{notif.id}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900">{notif.expediente}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-700">{notif.tipoNotificacion}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-700">{formatDate(notif.fechaRecepcion)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-red-600">{formatDate(notif.fechaVencimiento)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className={`font-bold text-lg ${notif.diasRestantes < 0 ? 'text-red-600' : notif.diasRestantes < 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {notif.diasRestantes < 0 ? `${Math.abs(notif.diasRestantes)} (venc.)` : notif.diasRestantes}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <BadgeSIGL variant={notif.estado === 'VENCIDA' ? 'danger' : notif.estado === 'RESPONDIDA' ? 'success' : 'warning'}>
                        {notif.estado}
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
