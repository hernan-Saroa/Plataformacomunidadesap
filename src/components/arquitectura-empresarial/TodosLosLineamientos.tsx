/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * VISTA COMPLETA: TODOS LOS LINEAMIENTOS MRAE v3.0
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Tabla consolidada de 106 lineamientos oficiales MinTIC
 * MAE (29) + MGGTI (63) + MGPTI (14) = 106 TOTAL
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Filter,
  Download,
  Upload,
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
  Award,
  TrendingUp,
  BarChart3,
  Tag,
  Layers,
  Grid,
  List,
  SlidersHorizontal,
  FileCheck,
  ArrowUpDown,
  ExternalLink,
  Zap,
  Target
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

type VistaMode = 'tabla' | 'tarjetas';
type AgruparPor = 'ninguno' | 'modelo' | 'dominio' | 'estado' | 'prioridad';

export function TodosLosLineamientos() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroModelo, setFiltroModelo] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('todos');
  const [filtroObligatorio, setFiltroObligatorio] = useState<string>('todos');
  const [filtroDominio, setFiltroDominio] = useState<string>('todos');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('codigo');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [vistaMode, setVistaMode] = useState<VistaMode>('tabla');
  const [agruparPor, setAgruparPor] = useState<AgruparPor>('ninguno');
  const [showFilters, setShowFilters] = useState(true);
  const itemsPerPage = 25;

  const stats = useMemo(() => getEstadisticasGlobales(), []);
  const todosLineamientos = useMemo(() => getAllLineamientosConsolidados(), []);

  // Obtener dominios únicos para el filtro
  const dominiosUnicos = useMemo(() => {
    const dominios = new Set(todosLineamientos.map(l => l.dominioNombre));
    return Array.from(dominios).sort();
  }, [todosLineamientos]);

  // Filtrar lineamientos
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
    if (filtroDominio !== 'todos') {
      resultado = resultado.filter(l => l.dominioNombre === filtroDominio);
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
  }, [todosLineamientos, searchQuery, filtroModelo, filtroEstado, filtroPrioridad, filtroObligatorio, filtroDominio, sortField, sortDirection]);

  // Agrupar lineamientos
  const lineamientosAgrupados = useMemo(() => {
    if (agruparPor === 'ninguno') {
      return { 'Todos los lineamientos': lineamientosFiltrados };
    }

    const grupos: Record<string, LineamientoConsolidado[]> = {};
    
    lineamientosFiltrados.forEach(lineamiento => {
      let key = '';
      switch (agruparPor) {
        case 'modelo':
          key = lineamiento.modelo;
          break;
        case 'dominio':
          key = lineamiento.dominioNombre;
          break;
        case 'estado':
          key = lineamiento.estado;
          break;
        case 'prioridad':
          key = lineamiento.prioridad;
          break;
      }
      
      if (!grupos[key]) {
        grupos[key] = [];
      }
      grupos[key].push(lineamiento);
    });

    return grupos;
  }, [lineamientosFiltrados, agruparPor]);

  // Paginación
  const totalPages = Math.ceil(lineamientosFiltrados.length / itemsPerPage);
  const lineamientosPaginados = agruparPor === 'ninguno' 
    ? lineamientosFiltrados.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : lineamientosFiltrados;

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleExportarExcel = () => {
    toast.success('Exportando todos los lineamientos a Excel...');
  };

  const handleExportarPDF = () => {
    toast.success('Generando PDF con todos los lineamientos...');
  };

  const limpiarFiltros = () => {
    setSearchQuery('');
    setFiltroModelo('todos');
    setFiltroEstado('todos');
    setFiltroPrioridad('todos');
    setFiltroObligatorio('todos');
    setFiltroDominio('todos');
    setAgruparPor('ninguno');
    setCurrentPage(1);
    toast.info('Filtros limpiados');
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

  // Componente: Vista de Tarjetas
  const VistaTarjetas = ({ lineamientos }: { lineamientos: LineamientoConsolidado[] }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {lineamientos.map((lineamiento) => (
        <Card key={lineamiento.codigo} className="p-4 border border-gray-200 hover:shadow-lg transition-all">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {lineamiento.codigo}
                </span>
                {getModeloBadge(lineamiento.modelo)}
              </div>
              <h4 className="font-semibold text-sm text-gray-900 mb-1">
                {lineamiento.nombre}
              </h4>
              <p className="text-xs text-gray-600 mb-2">
                {lineamiento.dominioNombre}
              </p>
            </div>
            {getEstadoBadge(lineamiento.estado)}
          </div>

          <p className="text-xs text-gray-700 mb-3 line-clamp-2">
            {lineamiento.descripcion}
          </p>

          {/* Barra de progreso */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-600">Progreso</span>
              <span className="font-semibold text-gray-900">{lineamiento.progreso}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${lineamiento.progreso}%`,
                  background: lineamiento.estado === 'Completo' ? '#10B981' : '#3B82F6'
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2">
              {getPrioridadBadge(lineamiento.prioridad)}
              {lineamiento.obligatorio && (
                <Badge className="text-xs border-0" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                  Obligatorio
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedRow(expandedRow === lineamiento.codigo ? null : lineamiento.codigo)}
            >
              <Eye className="w-3 h-3" />
            </Button>
          </div>

          {/* Detalles expandidos */}
          <AnimatePresence>
            {expandedRow === lineamiento.codigo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 pt-3 border-t border-gray-200"
              >
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1">Descripción completa:</p>
                    <p className="text-xs text-gray-600">{lineamiento.descripcion}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1">Evidencias:</p>
                    <ul className="space-y-1">
                      {lineamiento.evidencias.map((ev, idx) => (
                        <li key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                          <span className="text-blue-600">•</span>
                          <span>{ev}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600 pt-2">
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      {lineamiento.responsable}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {lineamiento.fechaActualizacion}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl text-gray-900 mb-2">
            Todos los Lineamientos MRAE v3.0
          </h2>
          <p className="text-gray-600">
            Vista consolidada de los {stats.total} lineamientos oficiales MinTIC
          </p>
        </div>

        {/* Botones de vista */}
        <div className="flex items-center gap-2">
          <Button
            variant={vistaMode === 'tabla' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setVistaMode('tabla')}
            className="gap-2"
          >
            <List className="w-4 h-4" />
            Tabla
          </Button>
          <Button
            variant={vistaMode === 'tarjetas' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setVistaMode('tarjetas')}
            className="gap-2"
          >
            <Grid className="w-4 h-4" />
            Tarjetas
          </Button>
        </div>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-3 h-3 text-blue-600" />
            <p className="text-xs text-gray-600">Total</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{stats.total}</p>
        </Card>

        <Card className="p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-3 h-3 text-green-600" />
            <p className="text-xs text-gray-600">Completos</p>
          </div>
          <p className="text-xl font-bold text-green-600">{stats.porEstado.completo}</p>
        </Card>

        <Card className="p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3 h-3 text-blue-600" />
            <p className="text-xs text-gray-600">En Progreso</p>
          </div>
          <p className="text-xl font-bold text-blue-600">{stats.porEstado.enProgreso}</p>
        </Card>

        <Card className="p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-3 h-3 text-orange-600" />
            <p className="text-xs text-gray-600">Pendientes</p>
          </div>
          <p className="text-xl font-bold text-orange-600">{stats.porEstado.pendiente}</p>
        </Card>

        <Card className="p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3 h-3 text-purple-600" />
            <p className="text-xs text-gray-600">Progreso</p>
          </div>
          <p className="text-xl font-bold text-purple-600">{stats.progresoPromedio}%</p>
        </Card>
      </div>

      {/* Panel de Filtros */}
      <Card className="border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-gray-600" />
            <h3 className="font-semibold text-sm text-gray-900">Filtros y Búsqueda</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-4"
            >
              <div className="space-y-4">
                {/* Búsqueda */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por código, nombre, descripción, responsable o dominio..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Grid de filtros */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {/* Modelo */}
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

                  {/* Estado */}
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

                  {/* Prioridad */}
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

                  {/* Obligatorio */}
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

                  {/* Dominio */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Dominio</label>
                    <select
                      value={filtroDominio}
                      onChange={(e) => setFiltroDominio(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="todos">Todos</option>
                      {dominiosUnicos.map(dominio => (
                        <option key={dominio} value={dominio}>{dominio}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Agrupar por */}
                <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                  <label className="text-xs font-medium text-gray-700">Agrupar por:</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'ninguno', label: 'Ninguno', icon: List },
                      { value: 'modelo', label: 'Modelo', icon: Layers },
                      { value: 'dominio', label: 'Dominio', icon: Target },
                      { value: 'estado', label: 'Estado', icon: CheckCircle },
                      { value: 'prioridad', label: 'Prioridad', icon: Zap }
                    ].map((opcion) => {
                      const Icon = opcion.icon;
                      return (
                        <Button
                          key={opcion.value}
                          variant={agruparPor === opcion.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setAgruparPor(opcion.value as AgruparPor)}
                          className="gap-1"
                        >
                          <Icon className="w-3 h-3" />
                          {opcion.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-600">
                      Mostrando <strong>{lineamientosFiltrados.length}</strong> de <strong>{stats.total}</strong> lineamientos
                    </p>
                    {lineamientosFiltrados.length !== stats.total && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={limpiarFiltros}
                        className="gap-1 text-xs"
                      >
                        <X className="w-3 h-3" />
                        Limpiar filtros
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleExportarExcel}
                      size="sm"
                      className="gap-2"
                      style={{ background: '#059669', color: 'white' }}
                    >
                      <Download className="w-4 h-4" />
                      Excel
                    </Button>
                    <Button
                      onClick={handleExportarPDF}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      PDF
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Contenido Principal */}
      {agruparPor === 'ninguno' ? (
        <>
          {vistaMode === 'tabla' ? (
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
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Modelo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Dominio</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Lineamiento</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Estado</th>
                      <th 
                        className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('progreso')}
                      >
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                          Progreso
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Prioridad</th>
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
                            <span className="text-xs text-gray-700">{lineamiento.dominioNombre}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="max-w-md">
                              <p className="font-medium text-sm text-gray-900 mb-0.5">{lineamiento.nombre}</p>
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
          ) : (
            <VistaTarjetas lineamientos={lineamientosPaginados} />
          )}
        </>
      ) : (
        /* Vista Agrupada */
        <div className="space-y-4">
          {Object.entries(lineamientosAgrupados).map(([grupo, lineamientos]) => (
            <Card key={grupo} className="border border-gray-200">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-bold text-lg text-gray-900">
                  {grupo} <span className="text-sm text-gray-600 font-normal">({lineamientos.length} lineamientos)</span>
                </h3>
              </div>
              <div className="p-4">
                {vistaMode === 'tabla' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Código</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Lineamiento</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Estado</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Progreso</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Ver</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {lineamientos.map((lineamiento) => (
                          <tr key={lineamiento.codigo} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{lineamiento.codigo}</span>
                            </td>
                            <td className="px-3 py-2">
                              <p className="text-sm font-medium text-gray-900">{lineamiento.nombre}</p>
                            </td>
                            <td className="px-3 py-2">{getEstadoBadge(lineamiento.estado)}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className="h-1.5 rounded-full"
                                    style={{
                                      width: `${lineamiento.progreso}%`,
                                      background: lineamiento.estado === 'Completo' ? '#10B981' : '#3B82F6'
                                    }}
                                  />
                                </div>
                                <span className="text-xs font-semibold">{lineamiento.progreso}%</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedRow(expandedRow === lineamiento.codigo ? null : lineamiento.codigo)}
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <VistaTarjetas lineamientos={lineamientos} />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
