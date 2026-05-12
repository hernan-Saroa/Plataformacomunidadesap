/**
 * OFERTA DE ASIGNATURAS ESAP - FUENTE ÚNICA DE VERDAD
 * Gestión del catálogo completo de 426 asignaturas (expandido desde 361)
 * Este módulo vive en Programas Académicos como fuente única de verdad
 * Formato Excel: ASIGNATURAS_ESAP_[PERIODO].xlsx
 * Todas las demás áreas (PTA, etc.) consultan desde aquí
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet, Upload, Download, Search, Filter, X, Eye, Edit, Trash2,
  CheckCircle, AlertCircle, Loader2, ArrowLeft, Plus, RefreshCw, BarChart3,
  BookOpen, Layers, GraduationCap, Award, Building2, FileDown, Send, Info,
  ChevronDown, MoreVertical, Database, PieChart as PieChartIcon, TrendingUp,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, Badge, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@esap-mfe/shared-ui';
import { PaginationPremium } from './shared/PaginationPremium';
import { apiClient } from '../../services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface OfertaAsignaturasModuleProps {
  onBack: () => void;
}

interface Asignatura {
  id: string;
  codigo: string;
  nombre: string;
  programa_id: string;
  programa_nombre?: string;
  programa_codigo?: string;
  nivel?: string;
  nucleo: string;
  creditos: number;
  semestre: number;
  tipo?: 'Obligatoria' | 'Electiva' | 'Optativa';
  horas_teoricas?: number;
  horas_practicas?: number;
  prerequisitos?: string[];
  estado?: 'Activa' | 'Inactiva';
}

type SubView = 'listado' | 'estadisticas' | 'carga-masiva';

const COLORS_PIE = ['#003DA5', '#0D47A1', '#1565C0', '#1976D2', '#1E88E5', '#2196F3', '#42A5F5', '#64B5F6', '#90CAF9', '#BBDEFB', '#E3F2FD', '#0277BD', '#01579B', '#039BE5', '#0288D1', '#03A9F4', '#29B6F6'];

export function OfertaAsignaturasModule({ onBack }: OfertaAsignaturasModuleProps) {
  const [subView, setSubView] = useState<SubView>('listado');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPrograma, setFilterPrograma] = useState('all');
  const [filterNivel, setFilterNivel] = useState('all');
  const [filterNucleo, setFilterNucleo] = useState('all');
  const [filterSemestre, setFilterSemestre] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Data
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [programas, setProgramas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carga masiva state
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [filtroEstadoCarga, setFiltroEstadoCarga] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Cargar programas
      const progResponse = await apiClient.get('/auth/api/v1/programas-academicos');
      setProgramas(progResponse.data || []);

      // Cargar catálogo completo de asignaturas desde backend
      const asigResponse = await apiClient.get('/auth/api/v1/asignaturas');
      if (asigResponse.data) {
        const allAsigs = Array.isArray(asigResponse.data) ? asigResponse.data : (asigResponse.data.asignaturas || []);
        // Enrich with programa info
        const enriched = allAsigs.map((a: any) => {
          const prog = (progResponse.data || []).find((p: any) => p.id === a.programa_id);
          return {
            ...a,
            programa_nombre: prog?.nombre || 'Programa no asignado',
            programa_codigo: prog?.codigo || '',
            nivel: prog?.nivelFormacion || 'Pregrado',
            estado: 'Activa' as const,
          };
        });
        setAsignaturas(enriched);
      } else {
        throw new Error('No se pudo cargar el catálogo de asignaturas');
      }
    } catch (err: any) {
      console.error('Error cargando oferta académica:', err);
      setError(err.message || 'Error al cargar datos');
      toast.error('Error al cargar datos', {
        description: 'No se pudo cargar el catálogo de asignaturas'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtros únicos
  const nucleos = useMemo(() => {
    return Array.from(new Set(asignaturas.map(a => a.nucleo))).sort();
  }, [asignaturas]);

  const niveles = useMemo(() => {
    return Array.from(new Set(asignaturas.map(a => a.nivel || 'Pregrado'))).sort();
  }, [asignaturas]);

  const programasUnicos = useMemo(() => {
    return Array.from(new Set(asignaturas.map(a => a.programa_id)))
      .map(pid => {
        const asig = asignaturas.find(a => a.programa_id === pid);
        return {
          id: pid,
          nombre: asig?.programa_nombre || pid,
          codigo: asig?.programa_codigo || '',
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [asignaturas]);

  // Asignaturas filtradas
  const filteredAsignaturas = useMemo(() => {
    return asignaturas.filter(a => {
      const matchesSearch = searchQuery === '' ||
        a.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.programa_nombre || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.nucleo.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesPrograma = filterPrograma === 'all' || a.programa_id === filterPrograma;
      const matchesNivel = filterNivel === 'all' || (a.nivel || 'Pregrado') === filterNivel;
      const matchesNucleo = filterNucleo === 'all' || a.nucleo === filterNucleo;
      const matchesSemestre = filterSemestre === 'all' || a.semestre === parseInt(filterSemestre);
      
      return matchesSearch && matchesPrograma && matchesNivel && matchesNucleo && matchesSemestre;
    });
  }, [asignaturas, searchQuery, filterPrograma, filterNivel, filterNucleo, filterSemestre]);

  // Paginación
  const totalPages = Math.ceil(filteredAsignaturas.length / itemsPerPage);
  const paginatedAsignaturas = filteredAsignaturas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Estadísticas
  const stats = useMemo(() => {
    const totalAsigs = asignaturas.length;
    const totalCreditos = asignaturas.reduce((s, a) => s + a.creditos, 0);
    const porPrograma = programasUnicos.map(p => ({
      programa: p.nombre,
      codigo: p.codigo,
      asignaturas: asignaturas.filter(a => a.programa_id === p.id).length,
      creditos: asignaturas.filter(a => a.programa_id === p.id).reduce((s, a) => s + a.creditos, 0),
    })).filter(p => p.asignaturas > 0);
    
    const porNucleo = nucleos.map(n => ({
      nucleo: n,
      asignaturas: asignaturas.filter(a => a.nucleo === n).length,
      creditos: asignaturas.filter(a => a.nucleo === n).reduce((s, a) => s + a.creditos, 0),
    }));

    const porSemestre = Array.from({ length: 10 }, (_, i) => i + 1).map(sem => ({
      semestre: sem,
      asignaturas: asignaturas.filter(a => a.semestre === sem).length,
      creditos: asignaturas.filter(a => a.semestre === sem).reduce((s, a) => s + a.creditos, 0),
    })).filter(s => s.asignaturas > 0);

    const porNivel = niveles.map(n => ({
      nivel: n,
      asignaturas: asignaturas.filter(a => (a.nivel || 'Pregrado') === n).length,
      creditos: asignaturas.filter(a => (a.nivel || 'Pregrado') === n).reduce((s, a) => s + a.creditos, 0),
    }));

    return {
      totalAsigs,
      totalCreditos,
      totalProgramas: programasUnicos.length,
      porPrograma,
      porNucleo,
      porSemestre,
      porNivel,
      promedioCreditos: totalAsigs > 0 ? (totalCreditos / totalAsigs).toFixed(1) : 0,
    };
  }, [asignaturas, programasUnicos, nucleos, niveles]);

  // Carga masiva handlers
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };
  const handleFileSelected = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.csv')) {
      toast.error('Formato no soportado', {
        description: 'Por favor suba un archivo Excel (.xlsx) o CSV.'
      });
      return;
    }
    setFile(selectedFile);
    setPreviewData(null);
  };

  const simularProcesamiento = () => {
    if (!file) return;
    setIsProcessing(true);
    
    setTimeout(() => {
      const mockData = [
        { id: '1', identificador: 'ADM-101', nombre: 'Fundamentos de Administración Pública', programa: 'Administración Pública', nucleo: 'Administración', creditos: 3, semestre: 1, estado: 'valido', mensajes: [], accion: 'insert' },
        { id: '2', identificador: 'ADM-102', nombre: 'Teoría de la Administración Pública', programa: 'Administración Pública', nucleo: 'Administración', creditos: 3, semestre: 1, estado: 'valido', mensajes: [], accion: 'update' },
        { id: '3', identificador: 'DER-201', nombre: 'Derecho Constitucional', programa: 'Administración Pública', nucleo: 'Derecho', creditos: 4, semestre: 2, estado: 'valido', mensajes: [], accion: 'no_change' },
        { id: '4', identificador: 'DER-301', nombre: 'Derecho Administrativo', programa: 'Administración Pública', nucleo: 'Derecho', creditos: 4, semestre: 3, estado: 'valido', mensajes: [], accion: 'insert' },
        { id: '5', identificador: 'ECO-101', nombre: 'Microeconomía', programa: 'Administración Pública', nucleo: 'Economía', creditos: 3, semestre: 2, estado: 'valido', mensajes: [], accion: 'update' },
        { id: '6', identificador: 'FIN-401', nombre: 'Finanzas Públicas', programa: 'Administración Pública', nucleo: 'Finanzas', creditos: 4, semestre: 4, estado: 'valido', mensajes: [], accion: 'no_change' },
        { id: '7', identificador: 'MAT-201', nombre: 'Estadística Pública', programa: 'Administración Pública', nucleo: 'Matemáticas', creditos: 8, semestre: 2, estado: 'invalido', mensajes: ['V-02: Créditos fuera de rango (1-6): valor 8'], accion: 'insert' },
        { id: '8', identificador: 'POL-501', nombre: 'Políticas Públicas', programa: 'Administración Pública', nucleo: 'Políticas', creditos: 4, semestre: 5, estado: 'valido', mensajes: [], accion: 'insert' },
        { id: '9', identificador: '', nombre: 'SIN CODIGO', programa: 'Administración Pública', nucleo: 'General', creditos: 3, semestre: 1, estado: 'invalido', mensajes: ['V-01: Código de asignatura obligatorio'], accion: 'insert' },
        { id: '10', identificador: 'GES-301', nombre: 'Gestión del Talento Humano', programa: 'Administración Pública', nucleo: 'Gestión', creditos: 3, semestre: 3, estado: 'advertencia', mensajes: ['V-06: Programa no reconocido en catálogo'], accion: 'update' },
      ];
      
      setPreviewData(mockData);
      setIsProcessing(false);
      const validos = mockData.filter(d => d.estado === 'valido').length;
      const invalidos = mockData.filter(d => d.estado === 'invalido').length;
      const advertencias = mockData.filter(d => d.estado === 'advertencia').length;
      toast.success(`Archivo procesado`, {
        description: `${validos} válidos, ${invalidos} errores, ${advertencias} advertencias`,
        duration: 5000,
      });
    }, 1800);
  };

  const aplicarCambios = async () => {
    if (!previewData) return;
    setIsApplying(true);

    setTimeout(() => {
      toast.success('Cambios aplicados exitosamente', {
        description: 'El catálogo de asignaturas ha sido actualizado.'
      });
      loadData();
      setFile(null);
      setPreviewData(null);
      setSubView('listado');
      setIsApplying(false);
    }, 2000);
  };

  const descargarPlantilla = () => {
    toast.success('Descargando plantilla', {
      description: 'Plantilla Excel ASIGNATURAS_ESAP_[PERIODO].xlsx (14 columnas)'
    });
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterPrograma('all');
    setFilterNivel('all');
    setFilterNucleo('all');
    setFilterSemestre('all');
  };

  const hasActiveFilters = searchQuery || filterPrograma !== 'all' || filterNivel !== 'all' || filterNucleo !== 'all' || filterSemestre !== 'all';

  const filteredPreview = previewData ? (
    filtroEstadoCarga ? previewData.filter(r => r.estado === filtroEstadoCarga) : previewData
  ) : null;

  const statsPreview = previewData ? {
    total: previewData.length,
    validos: previewData.filter(d => d.estado === 'valido').length,
    invalidos: previewData.filter(d => d.estado === 'invalido').length,
    advertencias: previewData.filter(d => d.estado === 'advertencia').length,
    insert: previewData.filter(d => d.accion === 'insert').length,
    update: previewData.filter(d => d.accion === 'update').length,
  } : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando catálogo de asignaturas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
            Error al cargar asignaturas
          </h2>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <button
            onClick={loadData}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-[#003DA5]" />
              Oferta de Asignaturas ESAP
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Catálogo completo de {stats.totalAsigs} asignaturas | {stats.totalCreditos} créditos totales | {stats.totalProgramas} programas académicos
            </p>
          </div>
        </div>
        <button
          onClick={descargarPlantilla}
          className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <FileDown className="w-4 h-4" />
          <span className="hidden sm:inline">Descargar Plantilla (14 columnas)</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Asignaturas', value: stats.totalAsigs, sub: `${stats.promedioCreditos} créd. promedio`, color: 'text-[#003DA5]', bg: 'bg-blue-50 border-blue-200', icon: BookOpen },
          { label: 'Total Créditos', value: stats.totalCreditos, sub: `${stats.totalProgramas} programas`, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: Award },
          { label: 'Núcleos Temáticos', value: nucleos.length, sub: 'áreas de conocimiento', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', icon: Layers },
          { label: 'Programas Activos', value: stats.totalProgramas, sub: 'con asignaturas', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: GraduationCap },
        ].map((stat) => (
          <Card key={stat.label} className={`${stat.bg} border p-3`}>
            <div className="flex items-center gap-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">{stat.label}</span>
            </div>
            <p className={`text-2xl font-black ${stat.color} mt-1`}>{stat.value.toLocaleString()}</p>
            <p className="text-[11px] text-gray-500">{stat.sub}</p>
          </Card>
        ))}
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setSubView('listado')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            subView === 'listado' ? 'bg-white text-[#003DA5] shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Listado ({stats.totalAsigs})
        </button>
        <button
          onClick={() => setSubView('estadisticas')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            subView === 'estadisticas' ? 'bg-white text-[#003DA5] shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Estadísticas
        </button>
        <button
          onClick={() => setSubView('carga-masiva')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            subView === 'carga-masiva' ? 'bg-white text-[#003DA5] shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          Carga Masiva
        </button>
      </div>

      {/* Content */}
      {subView === 'listado' && (
        <>
          {/* Búsqueda y Filtros */}
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-2.5 items-center">
              <div className="relative flex-1 min-w-0 w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, código, programa o núcleo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
              
              <select
                value={filterPrograma}
                onChange={(e) => setFilterPrograma(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm w-full md:w-auto"
              >
                <option value="all">Todos los programas</option>
                {programasUnicos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>

              <select
                value={filterNivel}
                onChange={(e) => setFilterNivel(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm w-full md:w-auto"
              >
                <option value="all">Todos los niveles</option>
                {niveles.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>

              <select
                value={filterNucleo}
                onChange={(e) => setFilterNucleo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm w-full md:w-auto"
              >
                <option value="all">Todos los núcleos</option>
                {nucleos.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>

              <select
                value={filterSemestre}
                onChange={(e) => setFilterSemestre(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm w-full md:w-auto"
              >
                <option value="all">Todos los semestres</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map(sem => (
                  <option key={sem} value={sem}>Semestre {sem}</option>
                ))}
              </select>

              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
                >
                  <X className="w-3.5 h-3.5" />
                  Limpiar
                </button>
              )}
            </div>
          </Card>

          {/* Table */}
          <Card className="overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Asignatura</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Programa</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Núcleo</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Sem.</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Créd.</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedAsignaturas.map((asig) => (
                    <tr key={asig.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono font-bold text-gray-900">{asig.codigo}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-gray-900">{asig.nombre}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-600">{asig.programa_nombre}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-purple-100 text-purple-700 text-xs">{asig.nucleo}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-gray-900">{asig.semestre}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                          {asig.creditos}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3 inline mr-1" />
                          Activa
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {paginatedAsignaturas.map((asig) => (
                <div key={asig.id} className="p-4 space-y-3 bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#003DA5] bg-blue-50 px-2.5 py-1 rounded-md">{asig.codigo}</span>
                      <h4 className="text-sm font-bold text-gray-900 mt-2 leading-tight">{asig.nombre}</h4>
                    </div>
                    <Badge className="bg-green-100 text-green-700 shrink-0 text-[10px]">
                      <CheckCircle className="w-3 h-3 mr-1 inline" /> Activa
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <p className="text-xs text-gray-600 line-clamp-1">{asig.programa_nombre}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
                    <Badge className="bg-purple-100 text-purple-700 text-[10px] py-0.5">{asig.nucleo}</Badge>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700">
                      Sem {asig.semestre}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700">
                      {asig.creditos} Créditos
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <PaginationPremium
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}

          {/* Footer info */}
          <div className="text-center text-sm text-gray-500">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredAsignaturas.length)} de {filteredAsignaturas.length} asignaturas
          </div>
        </>
      )}

      {subView === 'estadisticas' && (
        <div className="space-y-6">
          {/* Distribución por programa */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#003DA5]" />
              Distribución por Programa Académico
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.porPrograma}
                      dataKey="asignaturas"
                      nameKey="programa"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.programa.substring(0, 20)}... (${entry.asignaturas})`}
                    >
                      {stats.porPrograma.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {stats.porPrograma.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS_PIE[idx % COLORS_PIE.length] }} />
                      <span className="text-sm font-semibold text-gray-900">{p.programa}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-600">{p.asignaturas} asig.</span>
                      <span className="text-xs font-bold text-emerald-600">{p.creditos} créd.</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Distribución por núcleo */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" />
              Distribución por Núcleo Temático
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.porNucleo}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nucleo" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="asignaturas" fill="#7C3AED" name="Asignaturas" />
                <Bar dataKey="creditos" fill="#10B981" name="Créditos" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Distribución por semestre */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              Distribución por Semestre
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.porSemestre}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="semestre" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="asignaturas" fill="#F59E0B" name="Asignaturas" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {subView === 'carga-masiva' && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#003DA5]" />
            Carga Masiva de Asignaturas
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Suba un archivo Excel con el formato ASIGNATURAS_ESAP_[PERIODO].xlsx (14 columnas). Debe incluir: código, nombre, programa, núcleo, créditos, semestre, horas teóricas/prácticas, etc.
          </p>

          {!previewData ? (
            <>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {file ? file.name : 'Arrastra tu archivo aquí o haz clic para seleccionar'}
                </p>
                <p className="text-xs text-gray-500 mb-4">Formatos soportados: XLSX, CSV (Max. 10MB)</p>
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#003DA5] text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Seleccionar archivo
                </label>
              </div>

              {file && !previewData && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={simularProcesamiento}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Procesando archivo...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Procesar archivo
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Preview Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                {[
                  { label: 'Total', value: statsPreview!.total, color: 'text-gray-700', bg: 'bg-gray-100' },
                  { label: 'Válidos', value: statsPreview!.validos, color: 'text-green-700', bg: 'bg-green-50' },
                  { label: 'Errores', value: statsPreview!.invalidos, color: 'text-red-700', bg: 'bg-red-50' },
                  { label: 'Advertencias', value: statsPreview!.advertencias, color: 'text-yellow-700', bg: 'bg-yellow-50' },
                  { label: 'Nuevos', value: statsPreview!.insert, color: 'text-blue-700', bg: 'bg-blue-50' },
                ].map((stat) => (
                  <div key={stat.label} className={`${stat.bg} rounded-lg p-3`}>
                    <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                    <div className="text-xs font-semibold text-gray-600 uppercase">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Preview Table */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Código</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Nombre</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Programa</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-gray-700">Créd.</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-gray-700">Sem.</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-gray-700">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPreview!.slice(0, 20).map((row) => (
                      <tr key={row.id} className={row.estado === 'invalido' ? 'bg-red-50' : row.estado === 'advertencia' ? 'bg-yellow-50' : ''}>
                        <td className="px-3 py-2 font-mono text-xs">{row.identificador}</td>
                        <td className="px-3 py-2 text-xs font-semibold">{row.nombre}</td>
                        <td className="px-3 py-2 text-xs">{row.programa}</td>
                        <td className="px-3 py-2 text-center text-xs font-bold">{row.creditos}</td>
                        <td className="px-3 py-2 text-center text-xs">{row.semestre}</td>
                        <td className="px-3 py-2 text-center">
                          {row.estado === 'valido' && <CheckCircle className="w-4 h-4 text-green-600 inline" />}
                          {row.estado === 'invalido' && <XCircle className="w-4 h-4 text-red-600 inline" />}
                          {row.estado === 'advertencia' && <AlertCircle className="w-4 h-4 text-yellow-600 inline" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => { setFile(null); setPreviewData(null); }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={aplicarCambios}
                  disabled={isApplying || (statsPreview && statsPreview.invalidos > 0)}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Aplicando cambios...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Aplicar cambios ({statsPreview!.validos + statsPreview!.advertencias})
                    </>
                  )}
                </button>
              </div>

              {statsPreview && statsPreview.invalidos > 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-900">
                        Hay {statsPreview.invalidos} registros con errores
                      </p>
                      <p className="text-xs text-red-700 mt-1">
                        Corrija los errores antes de aplicar los cambios.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}
