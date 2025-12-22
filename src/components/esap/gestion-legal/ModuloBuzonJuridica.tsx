/**
 * MÓDULO BUZÓN OFICINA JURÍDICA - MOD-07
 * Gestión de correspondencia y documentos entrantes
 */

import { useState, useMemo } from 'react';
import { MessageSquare, Plus, Search, Eye, FileText, Clock, CheckCircle } from 'lucide-react';
import { ButtonSIGL, InputSIGL, BadgeSIGL, CardSIGL, useToast } from './design-system';

interface Documento {
  id: string;
  remitente: string;
  asunto: string;
  fechaRecepcion: Date;
  tipo: 'OFICIO' | 'DERECHO_PETICION' | 'CONSULTA' | 'OTRO';
  estado: 'PENDIENTE' | 'ASIGNADO' | 'TRAMITADO';
}

const DOCUMENTOS_MOCK: Documento[] = [
  { id: 'BJ-2025-00001', remitente: 'Ministerio de Educación', asunto: 'Solicitud información programas académicos', fechaRecepcion: new Date('2024-12-18'), tipo: 'OFICIO', estado: 'PENDIENTE' },
  { id: 'BJ-2025-00002', remitente: 'Pedro González Ruiz', asunto: 'Derecho de petición - Solicitud certificado', fechaRecepcion: new Date('2024-12-15'), tipo: 'DERECHO_PETICION', estado: 'ASIGNADO' },
];

export function ModuloBuzonJuridica() {
  const { addToast } = useToast();
  const [documentos] = useState<Documento[]>(DOCUMENTOS_MOCK);
  const [busqueda, setBusqueda] = useState('');

  const estadisticas = useMemo(() => ({
    total: documentos.length,
    pendientes: documentos.filter(d => d.estado === 'PENDIENTE').length,
    asignados: documentos.filter(d => d.estado === 'ASIGNADO').length,
    tramitados: documentos.filter(d => d.estado === 'TRAMITADO').length,
  }), [documentos]);

  const documentosFiltrados = documentos.filter(d => 
    busqueda === '' || 
    d.id.toLowerCase().includes(busqueda.toLowerCase()) ||
    d.remitente.toLowerCase().includes(busqueda.toLowerCase()) ||
    d.asunto.toLowerCase().includes(busqueda.toLowerCase())
  );

  const formatDate = (date: Date) => {
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${date.getDate()} ${meses[date.getMonth()]} ${date.getFullYear()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <MessageSquare className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Buzón Oficina Jurídica</h1>
              <p className="text-gray-600">Gestión de correspondencia y documentos entrantes</p>
            </div>
          </div>
          <ButtonSIGL variant="primary" onClick={() => addToast({ type: 'info', title: 'Próximamente', message: 'Funcionalidad en desarrollo' })}>
            <Plus className="w-4 h-4" />
            Radicar Documento
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
                <p className="text-xs text-gray-500">Asignados</p>
                <p className="text-2xl font-bold text-blue-600">{estadisticas.asignados}</p>
              </div>
            </div>
          </CardSIGL>
          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Tramitados</p>
                <p className="text-2xl font-bold text-green-600">{estadisticas.tramitados}</p>
              </div>
            </div>
          </CardSIGL>
        </div>

        <CardSIGL className="p-4 mb-6">
          <InputSIGL
            placeholder="Buscar por ID, remitente o asunto..."
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remitente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asunto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Recepción</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documentosFiltrados.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900">{doc.id}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900">{doc.remitente}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900 max-w-xs truncate">{doc.asunto}</p>
                    </td>
                    <td className="px-4 py-4">
                      <BadgeSIGL variant="info">{doc.tipo}</BadgeSIGL>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-700">{formatDate(doc.fechaRecepcion)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <BadgeSIGL variant={doc.estado === 'TRAMITADO' ? 'success' : doc.estado === 'ASIGNADO' ? 'warning' : 'danger'}>
                        {doc.estado}
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
