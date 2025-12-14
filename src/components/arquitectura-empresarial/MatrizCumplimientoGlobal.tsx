/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * MATRIZ DE CUMPLIMIENTO GLOBAL MRAE v3.0
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Vista consolidada de los 106 lineamientos oficiales del MRAE MinTIC
 * Incluye filtros, búsqueda, ordenamiento y exportación
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  Filter,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  Calendar,
  UserCheck,
  FileText,
  TrendingUp,
  Award,
  BarChart3
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner@2.0.3';
import {
  getAllLineamientosConsolidados,
  getEstadisticasGlobales,
  type LineamientoConsolidado
} from '../../lib/data/consolidado-lineamientos';

export function MatrizCumplimientoGlobal() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroModelo, setFiltroModelo] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('todos');
  const [filtroObligatorio, setFiltroObligatorio] = useState<string>('todos');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('codigo');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const stats = useMemo(() => getEstadisticasGlobales(), []);
  const todosLineamientos = useMemo(() => getAllLineamientosConsolidados(), []);

  // Filtrar y ordenar lineamientos
  const lineamientosFiltrados = useMemo(() => {
    let resultado = todosLineamientos;

    // Búsqueda
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      resultado = resultado.filter(l =>
        l.codigo.toLowerCase().includes(q) ||
        l.nombre.toLowerCase().includes(q) ||
        l.descripcion.toLowerCase().includes(q) ||
        l.responsable.toLowerCase().includes(q) ||
        l.dominioNombre.toLowerCase().includes(q)
      );
    }

    // Filtros
    if (filtroModelo !== 'todos') {
      resultado = resultado.filter(l => l.modelo === filtroModelo);
    }
    if (filtroEstado !== 'todos') {
      resultado = resultado.filter(l => l.estado === filtroEstado);
    }
    if (filtroPrioridad !== 'todos') {
      resultado = resultado.filter(l => l.prioridad === filtroPrioridad);
    }
    if (filtroObligatorio === 'si') {
      resultado = resultado.filter(l => l.obligatorio);
    } else if (filtroObligatorio === 'no') {
      resultado = resultado.filter(l => !l.obligatorio);
    }

    // Ordenamiento
    resultado.sort((a, b) => {
      let valorA: any = a[sortField as keyof LineamientoConsolidado];
      let valorB: any = b[sortField as keyof LineamientoConsolidado];

      if (sortField === 'progreso') {
        valorA = Number(valorA);
        valorB = Number(valorB);
      }

      if (valorA < valorB) return sortDirection === 'asc' ? -1 : 1;
      if (valorA > valorB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return resultado;
  }, [todosLineamientos, searchQuery, filtroModelo, filtroEstado, filtroPrioridad, filtroObligatorio, sortField, sortDirection]);

  // Paginación
  const totalPages = Math.ceil(lineamientosFiltrados.length / itemsPerPage);
  const lineamientosPaginados = lineamientosFiltrados.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleExportar = () => {
    toast.success('Exportando Matriz de Cumplimiento Global a Excel...');
  };

  const getEstadoBadge = (estado: string) => {
    const config: Record<string, { bg: string; text: string; icon: any }> = {
      'Completo': { bg: '#D1FAE5', text: '#065F46', icon: CheckCircle },
      'En Progreso': { bg: '#DBEAFE', text: '#1E40AF', icon: Clock },
      'Pendiente': { bg: '#FEF3C7', text: '#92400E', icon: AlertCircle },
      'No Aplica': { bg: '#F3F4F6', text: '#6B7280', icon: X }
    };
    const style = config[estado] || config['Pendiente'];
    const Icon = style.icon;
    return (
      <Badge className="border-0 text-xs" style={{ background: style.bg, color: style.text, fontWeight: 600 }}>
        <Icon className="w-3 h-3 mr-1" />
        {estado}
      </Badge>
    );
  };

  const getPrioridadBadge = (prioridad: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      'Crítica': { bg: '#FEE2E2', text: '#991B1B' },
      'Alta': { bg: '#FEF3C7', text: '#92400E' },
      'Media': { bg: '#DBEAFE', text: '#1E40AF' },
      'Baja': { bg: '#F3F4F6', text: '#6B7280' }
    };
    const style = config[prioridad] || config.Media;
    return (
      <Badge className="border-0 text-xs" style={{ background: style.bg, color: style.text, fontWeight: 600 }}>
        {prioridad}
      </Badge>
    );
  };

  const getModeloBadge = (modelo: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      'MAE': { bg: '#EFF6FF', text: '#1E40AF' },
      'MGGTI': { bg: '#F3E8FF', text: '#6B21A8' },
      'MGPTI': { bg: '#D1FAE5', text: '#065F46' }
    };
    const style = config[modelo] || config.MAE;
    return (
      <Badge className="border-0 text-xs font-bold" style={{ background: style.bg, color: style.text }}>
        {modelo}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-bold text-2xl text-gray-900 mb-2">
          Matriz de Cumplimiento Global MRAE v3.0
        </h2>
        <p className="text-gray-600">
          Vista consolidada de los {stats.total} lineamientos oficiales MinTIC
        </p>
      </div>

      {/* Estadísticas Globales */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <p className="text-xs text-gray-600">Total</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </Card>

        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <p className="text-xs text-gray-600">Completos</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.porEstado.completo}</p>
        </Card>

        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <p className="text-xs text-gray-600">En Progreso</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.porEstado.enProgreso}</p>
        </Card>

        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-orange-600" />
            <p className="text-xs text-gray-600">Pendientes</p>
          </div>
          <p className="text-2xl font-bold text-orange-600">{stats.porEstado.pendiente}</p>
        </Card>

        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-purple-600" />
            <p className="text-xs text-gray-600">Compliance</p>
          </div>
          <p className="text-2xl font-bold text-purple-600">{stats.complianceObligatorios}%</p>
        </Card>

        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <p className="text-xs text-gray-600">Progreso</p>
          </div>
          <p className="text-2xl font-bold text-indigo-600">{stats.progresoPromedio}%</p>
        </Card>
      </div>

      {/* Distribución por Modelo */}
      <Card className="p-5 border border-gray-200">
        <h3 className="font-semibold text-sm text-gray-900 mb-4">Distribución por Modelo MRAE</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-600 mb-1">MAE</p>
              <p className="text-xl font-bold text-blue-900">{stats.porModelo.MAE}</p>
              <p className="text-xs text-blue-600 mt-1">{stats.progresoMAE}% progreso</p>
            </div>
            {getModeloBadge('MAE')}
          </div>
          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-600 mb-1">MGGTI</p>
              <p className="text-xl font-bold text-purple-900">{stats.porModelo.MGGTI}</p>
              <p className="text-xs text-purple-600 mt-1">{stats.progresoMGGTI}% progreso</p>
            </div>
            {getModeloBadge('MGGTI')}
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-600 mb-1">MGPTI</p>
              <p className="text-xl font-bold text-green-900">{stats.porModelo.MGPTI}</p>
              <p className="text-xs text-green-600 mt-1">{stats.progresoMGPTI}% progreso</p>
            </div>
            {getModeloBadge('MGPTI')}
          </div>
        </div>
      </Card>

      {/* Filtros y Búsqueda */}
      <Card className="p-5 border border-gray-200">
        <div className="space-y-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por código, nombre, descripción o responsable..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Modelo</label>
              <select
                value={filtroModelo}
                onChange={(e) => setFiltroModelo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="todos">Todos ({stats.total})</option>
                <option value="MAE">MAE ({stats.porModelo.MAE})</option>
                <option value="MGGTI">MGGTI ({stats.porModelo.MGGTI})</option>
                <option value="MGPTI">MGPTI ({stats.porModelo.MGPTI})</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Estado</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="todos">Todos</option>
                <option value="Completo">Completo ({stats.porEstado.completo})</option>
                <option value="En Progreso">En Progreso ({stats.porEstado.enProgreso})</option>
                <option value="Pendiente">Pendiente ({stats.porEstado.pendiente})</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Prioridad</label>
              <select
                value={filtroPrioridad}
                onChange={(e) => setFiltroPrioridad(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="todos">Todas</option>
                <option value="Crítica">Crítica ({stats.porPrioridad.critica})</option>
                <option value="Alta">Alta ({stats.porPrioridad.alta})</option>
                <option value="Media">Media ({stats.porPrioridad.media})</option>
                <option value="Baja">Baja ({stats.porPrioridad.baja})</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Obligatorio</label>
              <select
                value={filtroObligatorio}
                onChange={(e) => setFiltroObligatorio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="todos">Todos</option>
                <option value="si">Sí ({stats.obligatorios})</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Mostrando <strong>{lineamientosFiltrados.length}</strong> de <strong>{stats.total}</strong> lineamientos
            </p>
            <Button
              onClick={handleExportar}
              className="gap-2"
              style={{ background: '#003DA5', color: 'white' }}
            >
              <Download className="w-4 h-4" />
              Exportar Excel
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabla de Lineamientos */}
      <Card className="border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th 
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('codigo')}
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    Código
                    {sortField === 'codigo' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Modelo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Lineamiento</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Estado</th>
                <th 
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('progreso')}
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    Progreso
                    {sortField === 'progreso' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Prioridad</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Responsable</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Ver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lineamientosPaginados.map((lineamiento) => (
                <React.Fragment key={lineamiento.codigo}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                        {lineamiento.codigo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {getModeloBadge(lineamiento.modelo)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-md">
                        <p className="font-medium text-sm text-gray-900 mb-1">{lineamiento.nombre}</p>
                        <p className="text-xs text-gray-600">{lineamiento.dominioNombre}</p>
                        {lineamiento.obligatorio && (
                          <Badge className="text-xs border-0 mt-1" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                            Obligatorio
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getEstadoBadge(lineamiento.estado)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${lineamiento.progreso}%`,
                              background: lineamiento.estado === 'Completo' ? '#10B981' : '#3B82F6'
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-900">{lineamiento.progreso}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getPrioridadBadge(lineamiento.prioridad)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <UserCheck className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">{lineamiento.responsable}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedRow(expandedRow === lineamiento.codigo ? null : lineamiento.codigo)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                  
                  {/* Fila Expandida */}
                  {expandedRow === lineamiento.codigo && (
                    <tr>
                      <td colSpan={8} className="px-4 py-4 bg-gray-50">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-1">Descripción:</p>
                            <p className="text-sm text-gray-900">{lineamiento.descripcion}</p>
                          </div>
                          
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-2">Evidencias requeridas:</p>
                            <ul className="space-y-1">
                              {lineamiento.evidencias.map((evidencia, idx) => (
                                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                                  <span className="text-blue-600 mt-1">•</span>
                                  <span>{evidencia}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="flex items-center gap-6 pt-2 border-t border-gray-200">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span>Actualizado: {lineamiento.fechaActualizacion}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <UserCheck className="w-4 h-4" />
                              <span>Responsable: {lineamiento.responsable}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, lineamientosFiltrados.length)} de {lineamientosFiltrados.length}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <span className="px-3 py-1 text-sm text-gray-700">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
