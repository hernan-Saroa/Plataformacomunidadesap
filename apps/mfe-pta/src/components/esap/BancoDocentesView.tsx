/**
 * BANCO DE DOCENTES ESAP
 * Fuente única de verdad para los 263 docentes TC/MT
 * Los datos se almacenan en el módulo Personas (fuente única de verdad)
 * Se visualiza tanto desde Personas como desde PTA
 * Incluye: gestión, carga masiva, estadísticas, filtros
 */

import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { apiClient } from '../../../../shell/src/services/api';
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

  // ─── Periodo Académico ───
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string>('');
  const [showPeriodoDropdown, setShowPeriodoDropdown] = useState(false);

  useEffect(() => {
    const cargarPeriodos = async () => {
      try {
        const res = await apiClient.get<any[]>('/pta/api/v1/periodos-academicos');
        const data = Array.isArray(res) ? res : [];
        setPeriodos(data);
        const activo = data.find((p: any) => p.estado === 'en_curso');
        if (activo) setPeriodoSeleccionado(activo.codigo || `${activo.anio}-${activo.semestre}`);
      } catch { setPeriodoSeleccionado('2025-2'); }
    };
    cargarPeriodos();
  }, []);

  const periodoActivo = periodos.find((p: any) => p.estado === 'en_curso');
  const periodoActivoCodigo = periodoActivo?.codigo || periodoActivo?.periodo || '2025-2';
  const esPeriodoActivo = !periodoSeleccionado || periodoSeleccionado === periodoActivoCodigo;
  const [expandedDocenteId, setExpandedDocenteId] = useState<string | null>(null);

  // Mapear los datos reales para the table view y buscar / filtrar
  // Carga masiva state
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [previewData, setPreviewData] = useState<BancoDocentePreviewRow[] | null>(null);
  const [filtroEstadoCarga, setFiltroEstadoCarga] = useState('');
  const [hasAppliedPreview, setHasAppliedPreview] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };
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
        periodo: cleanBancoDocenteText(perfilDocente.periodoCarga || bancoDocente.periodo_carga || bancoDocente.periodoCarga || u.periodo_carga || u.periodoCarga),
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
      const matchPeriodo = !periodoSeleccionado || d.periodo === periodoSeleccionado;
      return matchSearch && matchTer && matchDed && matchEsc && matchPeriodo;
    });
  }, [docentes, searchQuery, filterTerritorial, filterDedicacion, filterEscalafon, periodoSeleccionado]);

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

  const descargarPlantilla = () => {
    downloadBancoDocentesTemplate();
    toast.success('Plantilla del Banco de Docentes descargada');
  };

  const toggleExpandedDocente = (docenteId: string | null) => {
    if (!docenteId) return;
    setExpandedDocenteId((currentId) => currentId === docenteId ? null : docenteId);
  };

  return (
    <div className="space-y-6">
      {/* Header - World Class Design */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm px-6 md:px-8 py-4 md:py-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          {!hideBackBtn && (
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#EBF0FA' }}>
            <Users className="w-5 h-5 md:w-6 md:h-6 text-[#003DA5]" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">
              Banco de Docentes ESAP
            </h2>
            {/* Selector de Periodo Académico */}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">PERIODO:</span>
              <div className="relative">
                <button
                  onClick={() => setShowPeriodoDropdown(!showPeriodoDropdown)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border-2 border-[#003DA5]/20 bg-[#EBF0FA] text-[#003DA5] text-sm font-bold hover:border-[#003DA5]/40 transition-all"
                >
                  {periodoSeleccionado || '2025-2'}
                  {esPeriodoActivo && (
                    <span className="text-[9px] font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Actual</span>
                  )}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {showPeriodoDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowPeriodoDropdown(false)} />
                    <div className="absolute left-0 top-full mt-1 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 py-1 z-20">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Periodos Académicos</p>
                      </div>
                      {periodos.length > 0 ? periodos.map((p: any, idx: number) => {
                        const codigo = p.codigo || `${p.anio}-${p.semestre}`;
                        const esActivo = p.estado === 'en_curso';
                        return (
                          <button
                            key={idx}
                            onClick={() => { setPeriodoSeleccionado(codigo); setShowPeriodoDropdown(false); }}
                            className={`w-full px-3 py-2.5 text-left text-sm flex items-center justify-between transition-colors ${
                              codigo === periodoSeleccionado ? 'bg-[#EBF0FA] text-[#003DA5] font-bold' : 'hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <span>{codigo}{esActivo ? ' (Actual)' : ''}</span>
                            {esActivo ? <span className="w-2 h-2 rounded-full bg-green-500" /> : <span className="text-[10px] text-gray-400">Historial</span>}
                          </button>
                        );
                      }) : (
                        <div className="px-3 py-3 text-sm text-gray-500">2025-2 (Actual)</div>
                      )}
                    </div>
                  </>
                )}
              </div>
              {!esPeriodoActivo && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Solo lectura
                </span>
              )}
            </div>
            <p className="text-[11px] md:text-xs text-gray-400 mt-0.5">
              {docentes.length} docentes oficiales sincronizados desde el listado maestro y almacenados en Personas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Botones de acción eliminados según solicitud */}
        </div>
      </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex gap-1 mt-4 border-t border-gray-100 pt-4">
        {[
          { key: 'listado' as SubView, label: 'Banco de Docentes', icon: Users },
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
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col min-h-[calc(100vh-280px)] overflow-hidden">
          {/* Stepper Header */}
          <div className="px-6 py-4 bg-gray-50 flex items-center justify-center border-b border-gray-100">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${!previewData && !isApplying ? 'bg-[#003DA5] text-white shadow-md shadow-[#003DA5]/20' : 'bg-emerald-500 text-white'}`}>
                {!previewData && !isApplying ? '1' : <CheckCircle className="w-4 h-4" />}
              </div>
              <span className={`ml-3 text-xs font-bold uppercase tracking-wider ${!previewData && !isApplying ? 'text-[#003DA5]' : 'text-emerald-600'}`}>Subir archivo</span>
              
              <div className={`w-12 h-px mx-4 ${previewData || isApplying ? 'bg-emerald-400' : 'bg-gray-200'}`} />
              
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${previewData && !isApplying ? 'bg-[#003DA5] text-white shadow-md shadow-[#003DA5]/20' : (hasAppliedPreview || isApplying ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400')}`}>
                {hasAppliedPreview || isApplying ? <CheckCircle className="w-4 h-4" /> : '2'}
              </div>
              <span className={`ml-3 text-xs font-bold uppercase tracking-wider ${previewData && !isApplying ? 'text-[#003DA5]' : (hasAppliedPreview || isApplying ? 'text-emerald-600' : 'text-gray-400')}`}>Validar datos</span>
              
              <div className={`w-12 h-px mx-4 ${isApplying || hasAppliedPreview ? 'bg-emerald-400' : 'bg-gray-200'}`} />
              
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${(isApplying || hasAppliedPreview) ? 'bg-[#003DA5] text-white shadow-md shadow-[#003DA5]/20' : 'bg-gray-200 text-gray-400'}`}>
                3
              </div>
              <span className={`ml-3 text-xs font-bold uppercase tracking-wider ${(isApplying || hasAppliedPreview) ? 'text-[#003DA5]' : 'text-gray-400'}`}>Importar</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col relative">
            {/* ── PASO 3: IMPORTANDO ── */}
            {isApplying ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-4 border-gray-100"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-[#003DA5] border-t-transparent animate-spin"></div>
                </div>
                <h3 className="mt-6 text-base font-bold text-gray-900">Aplicando cambios...</h3>
                <p className="mt-2 text-xs text-gray-500 font-medium">Por favor espere, sincronizando docentes oficiales con la base de datos.</p>
              </div>
            ) : previewData && previewStats ? (
              /* ── PASO 2: VALIDACION Y RESULTADOS ── */
              <div className="flex flex-col flex-1">
                {/* Banner */}
                <div className={`px-6 py-4 border-b flex items-center justify-between ${hasAppliedPreview ? 'bg-emerald-50/30 border-emerald-100' : (previewStats.invalidos > 0 ? 'bg-red-50/30 border-red-100' : 'bg-emerald-50/30 border-emerald-100')}`}>
                  <div className="flex items-center gap-3">
                    {hasAppliedPreview ? <CheckCircle className="w-6 h-6 text-emerald-600" /> : (previewStats.invalidos > 0 ? <AlertCircle className="w-6 h-6 text-red-600" /> : <CheckCircle className="w-6 h-6 text-emerald-600" />)}
                    <div>
                      <h3 className={`text-sm font-bold ${hasAppliedPreview ? 'text-emerald-800' : (previewStats.invalidos > 0 ? 'text-red-800' : 'text-emerald-800')}`}>
                        {hasAppliedPreview ? 'Importación finalizada con éxito' : (previewStats.invalidos > 0 ? 'Existen errores de validación en algunas filas' : 'Validación exitosa')}
                      </h3>
                      <p className={`text-xs mt-0.5 font-medium ${hasAppliedPreview ? 'text-emerald-600' : (previewStats.invalidos > 0 ? 'text-red-600' : 'text-emerald-600')}`}>
                        {hasAppliedPreview ? `Se han procesado correctamente los docentes. Revisa la tabla inferior.` : (previewStats.invalidos > 0 ? `Corrige los errores en tu archivo y vuelve a subirlo, o importa solo las filas válidas.` : `${previewStats.validos} registros listos para ser importados.`)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={resetCargaMasiva} className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-bold transition-all shadow-sm">
                      {hasAppliedPreview ? 'Cargar otro archivo' : 'Cambiar archivo'}
                    </button>
                    {!hasAppliedPreview && previewStats.procesables > 0 && (
                      <button onClick={aplicarCambios} className="px-4 py-2 bg-[#003DA5] hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-2">
                        <Send className="w-4 h-4" /> Importar {previewStats.procesables} {previewStats.procesables !== previewStats.total ? 'válidos' : 'ahora'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-4 gap-6 px-6 py-5 border-b border-gray-100">
                  {[
                    { label: 'TOTAL FILAS', value: previewStats.total, color: 'bg-blue-50 text-[#003DA5]', icon: Database },
                    { label: 'VÁLIDAS', value: previewStats.validos, color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle },
                    { label: 'CON ERRORES', value: previewStats.invalidos, color: 'bg-red-50 text-red-600', icon: XCircle },
                    { label: 'ADVERTENCIAS', value: previewStats.advertencias, color: 'bg-amber-50 text-amber-600', icon: AlertTriangle },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                        <s.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-2xl font-black text-gray-900">{s.value}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Master-Detail */}
                <div className="flex flex-1 min-h-[360px] max-h-[500px]">
                  <div className="w-[260px] border-r border-gray-100 flex flex-col bg-gray-50/50">
                    <div className="p-4 border-b border-gray-100">
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Filtros de Estado</h4>
                      <div className="space-y-1.5">
                        {[
                          { id: '', label: 'Todos los registros', count: previewStats.total },
                          { id: 'valido', label: 'Válidos', count: previewStats.validos },
                          { id: 'invalido', label: 'Con Errores', count: previewStats.invalidos },
                          { id: 'advertencia', label: 'Advertencias', count: previewStats.advertencias },
                        ].map((f, i) => (
                          <button
                            key={i}
                            onClick={() => setFiltroEstadoCarga(f.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all ${filtroEstadoCarga === f.id ? 'bg-[#003DA5] text-white shadow-md shadow-[#003DA5]/20' : 'hover:bg-gray-100 text-gray-600'}`}
                          >
                            <span>{f.label}</span>
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filtroEstadoCarga === f.id ? 'bg-white/20 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}>
                              {f.count}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col bg-white">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">Vista Detallada</h4>
                        <p className="text-xs text-gray-400 mt-0.5 font-medium">Mostrando {filteredPreview?.length || 0} registros</p>
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-white text-[10px] text-gray-400 font-bold uppercase tracking-widest sticky top-0 border-b border-gray-100 z-10 shadow-sm shadow-gray-100">
                          <tr>
                            <th className="px-5 py-3">Validación / Carga</th>
                            <th className="px-5 py-3">Acción</th>
                            <th className="px-5 py-3">Documento</th>
                            <th className="px-5 py-3">Nombre</th>
                            <th className="px-5 py-3">Observaciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {(filteredPreview || []).map(row => (
                            <tr key={row.id} className={`hover:bg-blue-50/30 transition-colors ${row.resultadoAplicacion === 'fallido' || row.estado === 'invalido' ? 'bg-red-50/10' : ''}`}>
                              <td className="px-5 py-3">
                                <div className="flex flex-col gap-1.5">
                                  {row.estado === 'valido' && <span className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md text-[10px] font-bold w-max border border-emerald-200/50"><CheckCircle className="w-3 h-3" /> Válido</span>}
                                  {row.estado === 'advertencia' && <span className="inline-flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md text-[10px] font-bold w-max border border-amber-200/50"><AlertTriangle className="w-3 h-3" /> Advertencia</span>}
                                  {row.estado === 'invalido' && <span className="inline-flex items-center gap-1.5 text-red-600 bg-red-50 px-2 py-0.5 rounded-md text-[10px] font-bold w-max border border-red-200/50"><AlertCircle className="w-3 h-3" /> Error</span>}
                                  
                                  {row.resultadoAplicacion === 'pendiente' && <span className="inline-flex items-center gap-1.5 text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md text-[10px] font-bold w-max border border-gray-200/50">Pendiente</span>}
                                  {row.resultadoAplicacion === 'procesado' && <span className="inline-flex items-center gap-1.5 text-[#003DA5] bg-blue-50 px-2 py-0.5 rounded-md text-[10px] font-bold w-max border border-blue-200/50"><CheckCircle className="w-3 h-3" /> Aplicado</span>}
                                  {row.resultadoAplicacion === 'fallido' && <span className="inline-flex items-center gap-1.5 text-red-600 bg-red-50 px-2 py-0.5 rounded-md text-[10px] font-bold w-max border border-red-200/50"><XCircle className="w-3 h-3" /> Falló</span>}
                                  {row.resultadoAplicacion === 'omitido' && <span className="inline-flex items-center gap-1.5 text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md text-[10px] font-bold w-max border border-slate-200/50">Omitido</span>}
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                {row.accion === 'insert' && <span className="text-emerald-600 font-bold text-[10px]">CREAR</span>}
                                {row.accion === 'update' && <span className="text-blue-600 font-bold text-[10px]">ACTUALIZAR</span>}
                                {row.accion === 'no_change' && <span className="text-gray-400 font-bold text-[10px]">SIN CAMBIOS</span>}
                              </td>
                              <td className="px-5 py-3 font-mono text-xs text-gray-600">{row.identificador}</td>
                              <td className="px-5 py-3 font-medium text-gray-900 truncate max-w-[200px]">{row.nombre}</td>
                              <td className="px-5 py-3 text-xs whitespace-normal max-w-[320px]">
                                <div className="space-y-1">
                                  {row.errores.map((m, i) => <div key={`e-${i}`} className="text-red-600 font-medium">{m}</div>)}
                                  {row.advertencias.map((m, i) => <div key={`w-${i}`} className="text-amber-600 font-medium">{m}</div>)}
                                  {row.mensajeAplicacion && <div className={row.resultadoAplicacion === 'procesado' ? 'text-[#003DA5] font-medium' : 'text-red-600 font-medium'}>{row.mensajeAplicacion}</div>}
                                  {row.errores.length === 0 && row.advertencias.length === 0 && !row.mensajeAplicacion && <span className="text-gray-400 italic">Listo para aplicar</span>}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ── PASO 1: UPLOAD & INSTRUCCIONES ── */
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 p-8 gap-10">
                {/* Izquierda: Drop Zone */}
                <div
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                  onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); handleDrop(e); }}
                  onClick={triggerFileSelect}
                  className={`border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-10 text-center cursor-pointer transition-all min-h-[380px] ${
                    isDragging ? 'border-[#003DA5] bg-blue-50/50 scale-[0.98]' : file ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-200 hover:border-[#003DA5]/40 hover:bg-gray-50/50'
                  }`}
                >
                  <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.csv" onChange={handleFileChange} />
                  
                  {file ? (
                    <>
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6 shadow-sm border border-emerald-200">
                        <FileSpreadsheet className="w-8 h-8" />
                      </div>
                      <p className="font-extrabold text-gray-900 text-base mb-1.5">{file.name}</p>
                      <p className="text-xs text-gray-500 mb-8 font-medium">{(file.size / 1024).toFixed(1)} KB — Listo para procesar</p>
                      
                      <div className="flex gap-3 w-full max-w-[280px]">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="flex-1 px-4 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold transition-all shadow-sm">
                          Remover
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); simularProcesamiento(); }} disabled={isProcessing} className="flex-[2] px-4 py-3 bg-[#003DA5] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2">
                          {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando</> : 'Validar Archivo'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-blue-50 text-[#003DA5] rounded-xl flex items-center justify-center mb-6 border border-blue-100 shadow-sm">
                        <Upload className="w-8 h-8" />
                      </div>
                      <h3 className="font-bold text-gray-900 text-base mb-2">Sube tu archivo de docentes</h3>
                      <p className="text-xs text-gray-500 max-w-[240px] font-medium leading-relaxed mb-6">
                        Arrastra tu Excel (.xlsx) o haz clic para explorar en tus carpetas.
                      </p>
                      <span className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-[11px] font-bold shadow-sm">
                        Seleccionar archivo
                      </span>
                    </>
                  )}
                </div>

                {/* Derecha: Instrucciones */}
                <div className="flex flex-col h-full">
                  <div className="bg-blue-50/50 rounded-2xl p-8 border border-blue-100 flex-1 flex flex-col">
                    <h3 className="text-sm font-bold text-[#003DA5] uppercase tracking-wider mb-6 flex items-center gap-2">
                      <Info className="w-4 h-4" /> Instrucciones de Carga
                    </h3>
                    
                    <div className="space-y-6 flex-1">
                      {[
                        { title: 'Descargue la plantilla', desc: 'Obtenga el formato oficial con las columnas requeridas.' },
                        { title: 'Complete los datos', desc: 'Llene la información sin modificar las cabeceras ni el formato original.' },
                        { title: 'Suba el archivo', desc: 'Sube el archivo para iniciar la validación automática de datos.' },
                        { title: 'Valide y Confirme', desc: 'Revisa los errores, corrige si es necesario e importa los válidos.' },
                      ].map((step, i) => (
                        <div key={i} className="flex gap-4">
                          <div className="w-6 h-6 rounded-lg bg-[#003DA5]/10 text-[#003DA5] flex items-center justify-center text-[11px] font-bold shrink-0">
                            {i + 1}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-800 mb-1">{step.title}</div>
                            <div className="text-[11px] text-gray-500 leading-relaxed font-medium">{step.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button onClick={descargarPlantilla} className="w-full mt-6 px-5 py-3.5 bg-white border border-blue-200 text-[#003DA5] hover:bg-blue-50 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm">
                      <FileDown className="w-4 h-4" /> Descargar Plantilla Excel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
