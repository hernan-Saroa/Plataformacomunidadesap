/**
 * BANCO DE DOCENTES ESAP
 * Fuente única de verdad para los 263 docentes TC/MT
 * Los datos se almacenan en el módulo Personas (fuente única de verdad)
 * Se visualiza tanto desde Personas como desde PTA
 * Incluye: gestión, carga masiva, estadísticas, filtros
 */

import React, { useState, useMemo, Fragment } from 'react';
import { useTableColumns, ColumnSelector, ColumnDefinition } from '../../hooks/useTableColumns';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Upload, Download, Search, Filter, X, Eye, Edit, Trash2,
  CheckCircle, AlertCircle, FileSpreadsheet, Database, ArrowLeft,
  MapPin, Briefcase, GraduationCap, Clock, Mail, Phone, Building2,
  UserPlus, RefreshCw, Loader2, FileDown, Send, Info, ChevronDown,
  MoreVertical, Award, BarChart3, PieChart as PieChartIcon, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { PaginationPremium } from '../shared/PaginationPremium';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { supabaseService } from '../../services/api/supabase.service';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { BancoDocenteExpandedView } from './BancoDocenteExpandedView';
import {
  downloadBancoDocentesExport,
  downloadBancoDocentesTemplate,
  parseBancoDocentesFile,
  type BancoDocentePreviewRow,
} from '../../utils/bancoDocentesExcel';
import {
  cleanBancoDocenteText,
  getBancoDocenteDedicacionLabel,
  getBancoDocenteDedicacionShort,
  resolveBancoDocenteHours,
} from '../../utils/bancoDocentesUi';

interface BancoDocentesViewProps {
  onBack: () => void;
  allUsers: any[];
  onReloadUsers: () => Promise<unknown> | unknown;
  onViewDetail?: (docente: any) => void;
  onEdit?: (docente: any) => void;
  onDeactivate?: (docente: any) => void;
  hideBackBtn?: boolean;
}

// Removed hardcoded DEMO_DOCENTES_BASE and generateFullBancoDocentes to enforce 100% database dependency

const COLORS_PIE = ['#003DA5', '#0D47A1', '#1565C0', '#1976D2', '#1E88E5', '#2196F3', '#42A5F5', '#64B5F6', '#90CAF9', '#BBDEFB', '#E3F2FD', '#0277BD', '#01579B', '#039BE5', '#0288D1', '#03A9F4', '#29B6F6'];

type SubView = 'listado' | 'estadisticas' | 'carga-masiva';

const DOCENTES_COLUMNS: ColumnDefinition[] = [
  { key: 'documento', label: 'Documento', default: true },
  { key: 'territorial', label: 'Territorial', default: true },
  { key: 'categoria', label: 'Categoría', default: true },
  { key: 'horas', label: 'Horas', default: true },
];

export function BancoDocentesView({ onBack, allUsers, onReloadUsers, onViewDetail, onEdit, onDeactivate, hideBackBtn }: BancoDocentesViewProps) {
  const [subView, setSubView] = useState<SubView>('listado');
  const { visibleCols, setVisibleCols } = useTableColumns('banco_docentes', DOCENTES_COLUMNS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTerritorial, setFilterTerritorial] = useState('all');
  const [filterDedicacion, setFilterDedicacion] = useState('all');
  const [filterEscalafon, setFilterEscalafon] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [expandedDocenteId, setExpandedDocenteId] = useState<string | null>(null);

  // Mapear los datos reales para the table view y buscar / filtrar
  // Carga masiva state
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previewData, setPreviewData] = useState<BancoDocentePreviewRow[] | null>(null);
  const [filtroEstadoCarga, setFiltroEstadoCarga] = useState('');
  const [hasAppliedPreview, setHasAppliedPreview] = useState(false);


  // Get docentes from users (those with Docente role)
  const docentesFromUsers = useMemo(() => {
    return allUsers.filter(u => 
      (u.roles || []).some((r: any) => 
        r.name === 'Docente' || r.name === 'Docente TC' || r.name === 'Docente MT' || r.nombre === 'Docente'
      ) && (
        u.banco_docente?.orden_listado != null ||
        u.docente?.banco_docente?.orden_listado != null
      )
    );
  }, [allUsers]);

  // 100% Reliant on Database Users
  const docentes = useMemo(() => {
    return docentesFromUsers.map((u, i) => {
      const perfilDocente = u.docente || {};
      const bancoDocente = u.banco_docente || perfilDocente.banco_docente || {};
      const dedicacionValue = (
        u.dedicacion_label ||
        perfilDocente.dedicacionLabel ||
        perfilDocente.dedicacion ||
        u.dedicacion ||
        bancoDocente.dedicacion ||
        bancoDocente.dedicacion_codigo ||
        'TC'
      );
      const dedicacionLabel = getBancoDocenteDedicacionLabel(dedicacionValue);
      const dedicacionShort = getBancoDocenteDedicacionShort(dedicacionValue);
      const horas = resolveBancoDocenteHours(
        dedicacionValue,
        perfilDocente.horasAsignables ?? u.horas_programables ?? bancoDocente.horas_programables,
      );
      
      return {
        documento: cleanBancoDocenteText(u.identificacion || u.documentNumber || u.document || bancoDocente.documento_identidad) || `Sin Doc-${i}`,
        nombre: cleanBancoDocenteText(u.nombre || u.nombre_completo || `${u.firstName || ''} ${u.lastName || ''}`.trim()) || `Docente ${i + 1}`,
        territorial: cleanBancoDocenteText(perfilDocente.territorial?.nombre || u.territorial?.nombre || bancoDocente.territorial || u.location) || 'SEDE CENTRAL',
        codTer: perfilDocente.territorial?.codigo || u.territorial?.codigo || '01',
        dedicacion: dedicacionLabel,
        dedicacionCode: dedicacionShort,
        escalafon: cleanBancoDocenteText(perfilDocente.escalafon || u.escalafon || u.categoria_escalafon || bancoDocente.categoria) || 'Asistente',
        correo: cleanBancoDocenteText(u.correo_institucional || bancoDocente.correo_institucional || u.email) || '',
        horas,
        id: u.id,
        status: u.status || 'active',
        rawUser: u
      };
    });
  }, [docentesFromUsers]);

  // Filtered docentes
  const filteredDocentes = useMemo(() => {
    return docentes.filter(d => {
      const matchSearch = !searchQuery ||
        d.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.documento.includes(searchQuery) ||
        d.correo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchTer = filterTerritorial === 'all' || d.territorial === filterTerritorial;
      const matchDed = filterDedicacion === 'all' || d.dedicacionCode === filterDedicacion;
      const matchEsc = filterEscalafon === 'all' || d.escalafon === filterEscalafon;
      return matchSearch && matchTer && matchDed && matchEsc;
    });
  }, [docentes, searchQuery, filterTerritorial, filterDedicacion, filterEscalafon]);

  const totalPages = Math.ceil(filteredDocentes.length / itemsPerPage);
  const paginatedDocentes = filteredDocentes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Stats
  const stats = useMemo(() => {
    const tc = docentes.filter(d => d.dedicacionCode === 'TC').length;
    const mt = docentes.filter(d => d.dedicacionCode === 'MT').length;
    const byTerritorial: Record<string, number> = {};
    const byEscalafon: Record<string, number> = {};
    docentes.forEach(d => {
      byTerritorial[d.territorial] = (byTerritorial[d.territorial] || 0) + 1;
      byEscalafon[d.escalafon] = (byEscalafon[d.escalafon] || 0) + 1;
    });
    return { total: docentes.length, tc, mt, byTerritorial, byEscalafon };
  }, [docentes]);

  const uniqueTerritoriales = useMemo(() => [...new Set(docentes.map(d => d.territorial))].sort(), [docentes]);
  const uniqueEscalafones = useMemo(() => [...new Set(docentes.map(d => d.escalafon))].sort(), [docentes]);
  const existingDocuments = useMemo(() => new Set(
    docentes
      .map((docente) => String(docente.documento || '').trim())
      .filter(Boolean),
  ), [docentes]);

  const existingInstitutionalEmails = useMemo(() => {
    const emails = new Map<string, string>();

    docentes.forEach((docente) => {
      const email = String(docente.correo || '').trim().toLowerCase();
      const documento = String(docente.documento || '').trim();
      if (email && documento) {
        emails.set(email, documento);
      }
    });

    return emails;
  }, [docentes]);

  const resetCargaMasiva = () => {
    setFile(null);
    setPreviewData(null);
    setFiltroEstadoCarga('');
    setHasAppliedPreview(false);
  };

  // Carga masiva handlers
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleFileSelected(e.dataTransfer.files[0]);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
  };
  const handleFileSelected = (f: File) => {
    const lowerName = f.name.toLowerCase();
    if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.csv')) {
      toast.error('Formato no soportado. Use Excel (.xlsx) o CSV.');
      return;
    }
    setFile(f);
    setPreviewData(null);
    setFiltroEstadoCarga('');
    setHasAppliedPreview(false);
  };

  const simularProcesamiento = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const parsedRows = await parseBancoDocentesFile(file, {
        existingDocuments,
        existingInstitutionalEmails,
      });
      setPreviewData(parsedRows);
      setHasAppliedPreview(false);
      const invalidCount = parsedRows.filter((row) => row.estado === 'invalido').length;
      if (invalidCount > 0) {
        toast.warning('Archivo procesado con observaciones', {
          description: `${invalidCount} filas requieren corrección antes de aplicar cambios.`,
        });
      } else {
        toast.success('Archivo validado correctamente');
      }
    } catch (error: any) {
      toast.error('No fue posible validar el archivo', {
        description: error?.message || 'Revisa la estructura del Excel e intenta nuevamente.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const aplicarCambios = async () => {
    if (!previewData || hasAppliedPreview) return;
    setIsApplying(true);
    try {
      const registrosValidos = previewData
        .filter((row) => row.estado !== 'invalido' && row.datos)
        .map((row) => row.datos);

      if (registrosValidos.length === 0) {
        toast.error('No hay filas procesables para aplicar');
        return;
      }

      const res = await supabaseService.personas.bulkCreateDocentes(registrosValidos);
      const resultados = Array.isArray(res.resultados) ? res.resultados : [];
      const resultadosPorPreviewId = new Map(
        resultados
          .filter((item: any) => item?.previewId)
          .map((item: any) => [item.previewId, item]),
      );
      const erroresPorDocumento = new Map(
        (Array.isArray(res.errores) ? res.errores : [])
          .filter((item: any) => item?.documento)
          .map((item: any) => [item.documento, item]),
      );

      setPreviewData((currentPreview) => currentPreview ? currentPreview.map((row) => {
        if (row.estado === 'invalido') {
          return {
            ...row,
            resultadoAplicacion: 'omitido',
            mensajeAplicacion: 'No se procesó porque la fila tiene errores de validación.',
          };
        }

        const resultado = resultadosPorPreviewId.get(row.id) || erroresPorDocumento.get(row.identificador);
        if (!resultado) {
          return {
            ...row,
            resultadoAplicacion: 'fallido',
            mensajeAplicacion: 'No se recibió respuesta detallada para esta fila.',
          };
        }

        return {
          ...row,
          accion: resultado.accion === 'insert' || resultado.accion === 'update' ? resultado.accion : row.accion,
          resultadoAplicacion: resultado.ok === false ? 'fallido' : 'procesado',
          mensajeAplicacion: resultado.mensaje || resultado.error || 'Registro procesado.',
        };
      }) : currentPreview);
      setHasAppliedPreview(true);

      const totalProcesados = (res.insertados || 0) + (res.actualizados || 0);
      if (totalProcesados > 0) {
        toast.success('Carga de docentes completada', {
          description: `${totalProcesados} docentes procesados en el Banco de Docentes`,
        });
      } else {
        toast.error('Ningún docente pudo procesarse', {
          description: 'Revisa el visor fila por fila para corregir los errores reportados.',
        });
      }
      if (Array.isArray(res.errores) && res.errores.length > 0) {
        toast.warning('Algunas filas no se pudieron sincronizar', {
          description: `${res.errores.length} registros tuvieron errores durante la carga.`,
        });
      }
      await Promise.resolve(onReloadUsers());
    } catch (err: any) {
      toast.error('Error al aplicar cambios', {
        description: err?.message || 'No se pudo sincronizar el archivo con la base de datos.',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const previewStats = previewData ? {
    total: previewData.length,
    validos: previewData.filter(d => d.estado === 'valido').length,
    invalidos: previewData.filter(d => d.estado === 'invalido').length,
    advertencias: previewData.filter(d => d.estado === 'advertencia').length,
    insert: previewData.filter(d => d.accion === 'insert').length,
    update: previewData.filter(d => d.accion === 'update').length,
    procesables: previewData.filter(d => d.estado !== 'invalido').length,
  } : null;

  const applyStats = previewData ? {
    procesados: previewData.filter(d => d.resultadoAplicacion === 'procesado').length,
    fallidos: previewData.filter(d => d.resultadoAplicacion === 'fallido').length,
    omitidos: previewData.filter(d => d.resultadoAplicacion === 'omitido').length,
    pendientes: previewData.filter(d => d.resultadoAplicacion === 'pendiente').length,
  } : null;

  const filteredPreview = previewData ? (filtroEstadoCarga ? previewData.filter(r => r.estado === filtroEstadoCarga) : previewData) : null;

  // Charts data
  const pieDataDedicacion = [
    { name: 'Tiempo Completo', value: stats.tc, color: '#003DA5' },
    { name: 'Medio Tiempo', value: stats.mt, color: '#42A5F5' },
  ];

  const pieDataEscalafon = Object.entries(stats.byEscalafon).map(([name, value], i) => ({
    name, value, color: ['#003DA5', '#1976D2', '#42A5F5', '#90CAF9'][i % 4],
  }));

  const barDataTerritorial = Object.entries(stats.byTerritorial)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name: name.length > 12 ? name.substring(0, 12) + '...' : name, fullName: name, value }));

  const exportarDocentesExcel = () => {
    const usersToExport = docentesFromUsers.filter(Boolean);

    if (usersToExport.length === 0) {
      toast.error('No hay docentes para exportar');
      return;
    }

    downloadBancoDocentesExport(usersToExport);
    toast.success('Exportacion completada', {
      description: `${usersToExport.length} docentes oficiales exportados a Excel desde el Banco de Docentes.`,
    });
  };

  const descargarPlantilla = () => {
    downloadBancoDocentesTemplate();
    toast.success('Plantilla del Banco de Docentes descargada');
  };

  const toggleExpandedDocente = (docenteId: string | null) => {
    if (!docenteId) return;
    setExpandedDocenteId((currentId) => currentId === docenteId ? null : docenteId);
  };

  const refrescarDocentes = async () => {
    setIsRefreshing(true);
    try {
      setExpandedDocenteId(null);
      await Promise.resolve(onReloadUsers());
      toast.success('Banco de Docentes actualizado', {
        description: 'La vista se recargo con los datos mas recientes del backend.',
      });
    } catch (error: any) {
      toast.error('No fue posible recargar docentes', {
        description: error?.message || 'Ocurrio un error al consultar nuevamente el Banco de Docentes.',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!hideBackBtn && (
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-[#003DA5]" />
              Banco de Docentes ESAP
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {docentes.length} docentes oficiales sincronizados desde el listado maestro y almacenados en Personas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportarDocentesExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm"
          >
            <FileDown className="w-4 h-4" />
            Exportar Excel
          </button>
          <button
            onClick={refrescarDocentes}
            disabled={isRefreshing}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            title="Recargar docentes"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <ColumnSelector columns={DOCENTES_COLUMNS} visibleCols={visibleCols} setVisibleCols={setVisibleCols} />
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex gap-1 mt-4 border-t border-gray-100 pt-4">
        {[
          { key: 'listado' as SubView, label: 'Listado de Docentes', icon: Users },
          { key: 'estadisticas' as SubView, label: 'Estadisticas', icon: BarChart3 },
          { key: 'carga-masiva' as SubView, label: 'Carga Masiva', icon: Upload },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubView(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              subView === tab.key
                ? 'bg-[#003DA5] text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═══ LISTADO VIEW ═══ */}
      {subView === 'listado' && (
        <>
          {/* Quick stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Docentes', value: stats.total, icon: Users, color: '#003DA5', bg: '#E3F2FD' },
              { label: 'Tiempo Completo', value: stats.tc, icon: Briefcase, color: '#1565C0', bg: '#BBDEFB' },
              { label: 'Medio Tiempo', value: stats.mt, icon: Clock, color: '#0277BD', bg: '#B3E5FC' },
              { label: 'Territoriales', value: uniqueTerritoriales.length, icon: MapPin, color: '#00695C', bg: '#E0F2F1' },
            ].map((s, i) => (
              <Card key={i} className="p-4 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.bg }}>
                    <s.icon className="w-4.5 h-4.5" style={{ color: s.color }} />
                  </div>
                  <span className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</span>
                </div>
                <p className="text-xs font-semibold text-gray-500">{s.label}</p>
              </Card>
            ))}
          </div>

          {/* Search & Filters */}
          <Card className="p-4 border border-gray-200">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, documento o correo..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-[#003DA5] focus:border-[#003DA5]"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={filterTerritorial}
                  onChange={e => { setFilterTerritorial(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-[#003DA5] focus:border-[#003DA5]"
                >
                  <option value="all">Todas las territoriales</option>
                  {uniqueTerritoriales.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select
                  value={filterDedicacion}
                  onChange={e => { setFilterDedicacion(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-[#003DA5] focus:border-[#003DA5]"
                >
                  <option value="all">Todas las dedicaciones</option>
                  <option value="TC">Tiempo Completo</option>
                  <option value="MT">Medio Tiempo</option>
                </select>
                <select
                  value={filterEscalafon}
                  onChange={e => { setFilterEscalafon(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-[#003DA5] focus:border-[#003DA5]"
                >
                  <option value="all">Todas las categorias</option>
                  {uniqueEscalafones.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>
            {(searchQuery || filterTerritorial !== 'all' || filterDedicacion !== 'all' || filterEscalafon !== 'all') && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-500">
                  {filteredDocentes.length} de {docentes.length} docentes
                </span>
                <button
                  onClick={() => { setSearchQuery(''); setFilterTerritorial('all'); setFilterDedicacion('all'); setFilterEscalafon('all'); }}
                  className="text-xs text-[#003DA5] font-medium hover:underline ml-auto"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </Card>

          {/* Table */}
          <Card className="border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Docente</th>
                    {visibleCols.has('documento') && <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider hidden md:table-cell">Documento</th>}
                    {visibleCols.has('territorial') && <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider hidden lg:table-cell">Territorial</th>}
                    <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Dedicacion</th>
                    {visibleCols.has('categoria') && <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider hidden sm:table-cell">Categoria</th>}
                    {visibleCols.has('horas') && <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider hidden xl:table-cell">Horas</th>}
                    <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedDocentes.map((docente, idx) => (
                    <Fragment key={docente.id || idx}>
                    <tr
                      className={`transition-colors cursor-pointer ${expandedDocenteId === docente.id ? 'bg-blue-50/40' : 'hover:bg-blue-50/30'}`}
                      onClick={() => toggleExpandedDocente(docente.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          toggleExpandedDocente(docente.id);
                        }
                      }}
                      tabIndex={0}
                      aria-expanded={expandedDocenteId === docente.id}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#003DA5] to-[#1976D2] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {docente.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate max-w-[200px]">{docente.nombre}</p>
                            <p className="text-xs text-gray-500 truncate">{docente.correo}</p>
                          </div>
                        </div>
                      </td>
                      {visibleCols.has('documento') && <td className="px-4 py-3 hidden md:table-cell">
                        <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded">{docente.documento}</span>
                      </td>}
                      {visibleCols.has('territorial') && <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs text-gray-600 truncate max-w-[120px]">{docente.territorial}</span>
                        </div>
                      </td>}
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${docente.dedicacionCode === 'TC' ? 'bg-blue-50 text-blue-700 border-blue-200' : docente.dedicacionCode === 'MT' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {docente.dedicacionCode}
                        </Badge>
                      </td>
                      {visibleCols.has('categoria') && <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-gray-600">{docente.escalafon}</span>
                      </td>}
                      {visibleCols.has('horas') && <td className="px-4 py-3 hidden xl:table-cell">
                        <span className="text-xs font-semibold text-gray-700">{docente.horas}h</span>
                      </td>}
                      <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <MoreVertical className="w-4 h-4 text-gray-500" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => toggleExpandedDocente(docente.id)}>
                              <Eye className="w-4 h-4 mr-2" /> Ver Detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit ? onEdit(docente.rawUser) : toast.info('Edicion de docente')}>
                              <Edit className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => onDeactivate ? onDeactivate(docente.rawUser) : toast.info('Desactivar docente')}>
                              <Trash2 className="w-4 h-4 mr-2" /> Desactivar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                    <AnimatePresence initial={false}>
                      {expandedDocenteId === docente.id && (
                        <motion.tr
                          className="bg-gray-50/50"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.18, ease: 'easeOut' }}
                        >
                          <td colSpan={7} className="p-0 border-b border-gray-200">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                              className="overflow-hidden"
                            >
                              <motion.div
                                initial={{ y: -8, scale: 0.995 }}
                                animate={{ y: 0, scale: 1 }}
                                exit={{ y: -6, scale: 0.995 }}
                                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                              >
                                <BancoDocenteExpandedView
                                  user={docente.rawUser}
                                  onClose={() => setExpandedDocenteId(null)}
                                />
                              </motion.div>
                            </motion.div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredDocentes.length > itemsPerPage && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50/50">
                <PaginationPremium
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredDocentes.length}
                />
              </div>
            )}
          </Card>
        </>
      )}

      {/* ═══ ESTADISTICAS VIEW ═══ */}
      {subView === 'estadisticas' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Dedicacion Pie */}
          <Card className="p-5 border border-gray-200">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-[#003DA5]" />
              Distribucion por Dedicacion
            </h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDataDedicacion}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieDataDedicacion.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              {pieDataDedicacion.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-gray-600">{d.name}: <strong>{d.value}</strong></span>
                </div>
              ))}
            </div>
          </Card>

          {/* Escalafon Pie */}
          <Card className="p-5 border border-gray-200">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#003DA5]" />
              Distribucion por Categoria
            </h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDataEscalafon}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieDataEscalafon.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2 flex-wrap">
              {pieDataEscalafon.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-gray-600">{d.name}: <strong>{d.value}</strong></span>
                </div>
              ))}
            </div>
          </Card>

          {/* Territorial Bar Chart */}
          <Card className="p-5 border border-gray-200 lg:col-span-2">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#003DA5]" />
              Docentes por Territorial
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barDataTerritorial} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" fontSize={11} tick={{ fill: '#6B7280' }} />
                  <YAxis fontSize={11} tick={{ fill: '#6B7280' }} />
                  <Tooltip
                    formatter={(value: any) => [`${value} docentes`, 'Cantidad']}
                    labelFormatter={(label: any) => {
                      const item = barDataTerritorial.find(d => d.name === label);
                      return item?.fullName || label;
                    }}
                  />
                  <Bar dataKey="value" fill="#003DA5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Summary cards */}
          <Card className="p-5 border border-gray-200 lg:col-span-2">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#003DA5]" />
              Resumen Ejecutivo del Banco de Docentes
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                <div className="text-3xl font-bold text-[#003DA5]">{stats.total}</div>
                <div className="text-xs text-blue-700 font-medium mt-1">Total Docentes</div>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
                <div className="text-3xl font-bold text-emerald-700">{(stats.tc * 800 + stats.mt * 400).toLocaleString()}</div>
                <div className="text-xs text-emerald-700 font-medium mt-1">Total Horas Programables</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-100">
                <div className="text-3xl font-bold text-purple-700">{uniqueTerritoriales.length}</div>
                <div className="text-xs text-purple-700 font-medium mt-1">Territoriales con Docentes</div>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
                <div className="text-3xl font-bold text-amber-700">{Math.round(stats.tc / stats.total * 100)}%</div>
                <div className="text-xs text-amber-700 font-medium mt-1">Dedicacion TC</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ═══ CARGA MASIVA VIEW ═══ */}
      {subView === 'carga-masiva' && (
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-[#003DA5] flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>Carga Masiva de Docentes — Especificacion PARTE XXVI, Sec. 26.1.1</strong>
              <p className="mt-1 text-blue-700">
                Carga flexible con las columnas del ListadoDocentes oficial. No todos los 31 campos son obligatorios:
                se exigen documento, nombre, territorial, vinculación y dedicación; categoría y núcleo temático quedan como recomendados.
                La plantilla incluye ejemplo, catálogos y el sistema muestra un visor final con filas aplicadas, fallidas y motivo detallado.
              </p>
            </div>
          </div>

          {/* Upload area */}
          {!previewData && (
            <Card className="p-5 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Subir Archivo de Docentes</h3>
                <button
                  className="text-xs flex items-center gap-1.5 text-[#003DA5] font-medium hover:underline"
                  onClick={descargarPlantilla}
                >
                  <FileDown className="w-4 h-4" />
                  Descargar Plantilla
                </button>
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  isDragging ? 'border-[#003DA5] bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                }`}
              >
                <input type="file" id="docente-file-upload" className="hidden" accept=".xlsx,.csv" onChange={handleFileChange} />
                <label htmlFor="docente-file-upload" className="cursor-pointer flex flex-col items-center">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                    <Upload className="w-6 h-6 text-[#003DA5]" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {file ? file.name : 'Haga clic para subir o arrastre el archivo aqui'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {file ? `${(file.size / 1024).toFixed(2)} KB` : 'XLSX, CSV (Max. 10MB) — Formato DOCENTES_ESAP_[PERIODO]'}
                  </p>
                </label>
              </div>

              {file && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={simularProcesamiento}
                    disabled={isProcessing}
                    className="bg-[#003DA5] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors disabled:opacity-70 flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Procesando validaciones V-01 a V-10...</>
                    ) : (
                      <><CheckCircle className="w-4 h-4" /> Validar y Conciliar Archivo</>
                    )}
                  </button>
                </div>
              )}
            </Card>
          )}

          {/* Preview results */}
          {previewData && previewStats && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <Card className="p-5 border border-gray-200">
                <div className="flex flex-col gap-2 mb-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    {hasAppliedPreview ? 'Resultado Final de la Carga' : 'Resultados de Validacion'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {hasAppliedPreview
                      ? 'La tabla conserva el resultado final por fila para revisar qué se aplicó, qué falló y el motivo.'
                      : 'Primero se validan las filas del archivo. Después puedes aplicar solo las filas procesables.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  {[
                    { label: 'Registros', value: previewStats.total, bg: 'bg-gray-50', border: 'border-gray-100', color: 'text-gray-900', filter: '' },
                    { label: 'Validos', value: previewStats.validos, bg: 'bg-emerald-50', border: 'border-emerald-100', color: 'text-emerald-700', filter: 'valido' },
                    { label: 'Errores', value: previewStats.invalidos, bg: 'bg-red-50', border: 'border-red-100', color: 'text-red-700', filter: 'invalido' },
                    { label: 'Advertencias', value: previewStats.advertencias, bg: 'bg-amber-50', border: 'border-amber-100', color: 'text-amber-700', filter: 'advertencia' },
                  ].map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setFiltroEstadoCarga(s.filter)}
                      className={`p-3 ${s.bg} rounded-xl border ${s.border} text-center transition-all hover:ring-2 hover:ring-blue-200 ${filtroEstadoCarga === s.filter ? 'ring-2 ring-[#003DA5]' : ''}`}
                    >
                      <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                      <div className={`text-xs uppercase tracking-wide mt-0.5 ${s.color}`}>{s.label}</div>
                    </button>
                  ))}
                </div>

                {hasAppliedPreview && applyStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    {[
                      { label: 'Aplicados', value: applyStats.procesados, bg: 'bg-emerald-50', border: 'border-emerald-100', color: 'text-emerald-700' },
                      { label: 'Fallidos', value: applyStats.fallidos, bg: 'bg-red-50', border: 'border-red-100', color: 'text-red-700' },
                      { label: 'Omitidos', value: applyStats.omitidos, bg: 'bg-slate-50', border: 'border-slate-200', color: 'text-slate-700' },
                      { label: 'Pendientes', value: applyStats.pendientes, bg: 'bg-blue-50', border: 'border-blue-100', color: 'text-blue-700' },
                    ].map((s, i) => (
                      <div key={i} className={`p-3 ${s.bg} rounded-xl border ${s.border} text-center`}>
                        <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                        <div className={`text-xs uppercase tracking-wide mt-0.5 ${s.color}`}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3">Validacion</th>
                          <th className="px-4 py-3">Carga</th>
                          <th className="px-4 py-3">Accion</th>
                          <th className="px-4 py-3">Documento</th>
                          <th className="px-4 py-3">Nombre</th>
                          <th className="px-4 py-3">Observaciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(filteredPreview || []).map(row => (
                          <tr
                            key={row.id}
                            className={
                              row.resultadoAplicacion === 'fallido'
                                ? 'bg-red-50/20'
                                : row.estado === 'invalido'
                                  ? 'bg-red-50/30'
                                  : row.resultadoAplicacion === 'procesado'
                                    ? 'bg-emerald-50/20'
                                    : ''
                            }
                          >
                            <td className="px-4 py-3">
                              {row.estado === 'valido' && <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded text-xs font-medium border border-emerald-200"><CheckCircle className="w-3.5 h-3.5" /> Valido</span>}
                              {row.estado === 'advertencia' && <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-1 rounded text-xs font-medium border border-amber-200"><AlertCircle className="w-3.5 h-3.5" /> Advertencia</span>}
                              {row.estado === 'invalido' && <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-1 rounded text-xs font-medium border border-red-200"><AlertCircle className="w-3.5 h-3.5" /> Error</span>}
                            </td>
                            <td className="px-4 py-3">
                              {row.resultadoAplicacion === 'pendiente' && <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-1 rounded text-xs font-medium border border-blue-200"><Loader2 className="w-3.5 h-3.5" /> Pendiente</span>}
                              {row.resultadoAplicacion === 'procesado' && <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded text-xs font-medium border border-emerald-200"><CheckCircle className="w-3.5 h-3.5" /> Aplicado</span>}
                              {row.resultadoAplicacion === 'fallido' && <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-1 rounded text-xs font-medium border border-red-200"><AlertCircle className="w-3.5 h-3.5" /> Fallo</span>}
                              {row.resultadoAplicacion === 'omitido' && <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-1 rounded text-xs font-medium border border-slate-200"><X className="w-3.5 h-3.5" /> Omitido</span>}
                            </td>
                            <td className="px-4 py-3">
                              {row.accion === 'insert' && <span className="text-blue-600 font-medium text-xs bg-blue-50 px-2 py-1 rounded">INSERTAR</span>}
                              {row.accion === 'update' && <span className="text-purple-600 font-medium text-xs bg-purple-50 px-2 py-1 rounded">ACTUALIZAR</span>}
                              {row.accion === 'no_change' && <span className="text-gray-400 font-medium text-xs">SIN CAMBIOS</span>}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">{row.identificador}</td>
                            <td className="px-4 py-3 text-gray-700 truncate max-w-[200px]">{row.nombre}</td>
                            <td className="px-4 py-3 text-xs whitespace-normal max-w-[320px]">
                              <div className="space-y-1">
                                {row.errores.map((mensaje, i) => (
                                  <div key={`error-${row.id}-${i}`} className="text-red-600">{mensaje}</div>
                                ))}
                                {row.advertencias.map((mensaje, i) => (
                                  <div key={`warning-${row.id}-${i}`} className="text-amber-600">{mensaje}</div>
                                ))}
                                {row.mensajeAplicacion && (
                                  <div
                                    className={
                                      row.resultadoAplicacion === 'procesado'
                                        ? 'text-emerald-700'
                                        : row.resultadoAplicacion === 'fallido'
                                          ? 'text-red-700'
                                          : row.resultadoAplicacion === 'omitido'
                                            ? 'text-slate-600'
                                            : 'text-blue-700'
                                    }
                                  >
                                    {row.mensajeAplicacion}
                                  </div>
                                )}
                                {row.errores.length === 0 && row.advertencias.length === 0 && !row.mensajeAplicacion && (
                                  <span className="text-emerald-600">Fila lista para aplicar.</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-5 flex justify-between items-center border-t border-gray-100 pt-4">
                  <button
                    onClick={resetCargaMasiva}
                    className="text-gray-500 hover:text-gray-700 font-medium text-sm px-4 py-2"
                  >
                    Cargar otro archivo
                  </button>
                  <button
                    onClick={aplicarCambios}
                    disabled={isApplying || hasAppliedPreview || previewStats.procesables === 0}
                    className="bg-[#003DA5] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isApplying ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Aplicando...</>
                    ) : hasAppliedPreview ? (
                      <><CheckCircle className="w-4 h-4" /> Carga aplicada</>
                    ) : (
                      <><Send className="w-4 h-4" /> Aplicar Cambios ({previewStats.procesables} procesables)</>
                    )}
                  </button>
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
