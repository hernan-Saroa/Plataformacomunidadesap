import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Clock,
  Plus,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  X,
  Settings2,
  ChevronRight,
  ShieldCheck,
  CalendarDays,
  FileCheck,
  Archive,
  Eye,
  BookOpen,
  GraduationCap,
  Building
} from 'lucide-react';
import { Card, Badge, Container4K, ResponsiveHeader } from '@esap-mfe/shared-ui';
import { toast } from 'sonner';
import { useImportAsignaturas } from '../hooks/useImportAsignaturas';

interface GestionPeriodosProps {
  onBack: () => void;
  onNavigateToImport: (periodoCodigo: string) => void;
}

export function GestionPeriodos({ onBack, onNavigateToImport }: GestionPeriodosProps) {
  const { getPeriodos, createPeriodo, updatePeriodo, getLastImport, getPeriodoDetalle, loading } = useImportAsignaturas();
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [periodStats, setPeriodStats] = useState<Record<string, any>>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPeriodo, setSelectedPeriodo] = useState<any | null>(null);

  // Detail Data States
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailData, setDetailData] = useState<{ programs: any[]; cetaps: any[] } | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'programas' | 'cetaps'>('programas');
  const [expandedPeriodoId, setExpandedPeriodoId] = useState<string | null>(null);
  const [periodoToActivate, setPeriodoToActivate] = useState<any | null>(null);
  const [activating, setActivating] = useState(false);

  // Create Form State
  const [newAnio, setNewAnio] = useState(new Date().getFullYear());
  const [newSemestre, setNewSemestre] = useState(1);
  const [newFechaInicio, setNewFechaInicio] = useState('');
  const [newFechaFin, setNewFechaFin] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit Form State
  const [editFechaInicio, setEditFechaInicio] = useState('');
  const [editFechaFin, setEditFechaFin] = useState('');
  const [editEstado, setEditEstado] = useState('planeacion');
  const [updating, setUpdating] = useState(false);

  const loadData = async () => {
    try {
      const data = await getPeriodos();
      if (data && Array.isArray(data)) {
        setPeriodos(data);
        // Load stats for each period
        data.forEach(async (p: any) => {
          try {
            const stats = await getLastImport(p.codigo);
            if (stats?.success) {
              setPeriodStats(prev => ({
                ...prev,
                [p.codigo]: stats.counts
              }));
            }
          } catch (err) {
            console.error(`Error loading stats for ${p.codigo}:`, err);
          }
        });
      }
    } catch (e) {
      console.error(e);
      toast.error('Error al obtener la lista de periodos académicos');
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnio || !newSemestre || !newFechaInicio || !newFechaFin) {
      toast.error('Todos los campos son obligatorios.');
      return;
    }
    try {
      setCreating(true);
      const res = await createPeriodo({
        anio: newAnio,
        semestre: newSemestre,
        fechaInicio: newFechaInicio,
        fechaFin: newFechaFin
      });
      if (res) {
        toast.success(`Periodo académico ${res.codigo} creado exitosamente.`);
        setShowCreateModal(false);
        setRefreshTrigger(prev => prev + 1);
        // Reset form
        setNewAnio(new Date().getFullYear());
        setNewSemestre(1);
        setNewFechaInicio('');
        setNewFechaFin('');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al crear el periodo académico');
    } finally {
      setCreating(false);
    }
  };

  const handleEditOpen = (p: any) => {
    setSelectedPeriodo(p);
    // Format dates to YYYY-MM-DD
    const start = p.fechaInicio ? new Date(p.fechaInicio).toISOString().split('T')[0] : '';
    const end = p.fechaFin ? new Date(p.fechaFin).toISOString().split('T')[0] : '';
    setEditFechaInicio(start);
    setEditFechaFin(end);
    setEditEstado(p.estado);
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeriodo) return;
    try {
      setUpdating(true);
      const res = await updatePeriodo(selectedPeriodo.id, {
        fechaInicio: editFechaInicio,
        fechaFin: editFechaFin,
        estado: editEstado
      });
      if (res) {
        toast.success(`Periodo académico ${res.codigo} actualizado exitosamente.`);
        setShowEditModal(false);
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar el periodo académico');
    } finally {
      setUpdating(false);
    }
  };

  // ─── Activar / Cerrar Periodo ───
  const periodoActivo = periodos.find(p => p.estado === 'en_curso');

  const handleActivarPeriodo = async (p: any) => {
    try {
      setActivating(true);
      // El backend debe desactivar el anterior automáticamente
      const res = await updatePeriodo(p.id, { estado: 'en_curso' });
      if (res) {
        toast.success(`✅ Periodo ${p.codigo} activado como "En Curso"`);
        setPeriodoToActivate(null);
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al activar el periodo');
    } finally {
      setActivating(false);
    }
  };

  const handleCerrarPeriodo = async (p: any) => {
    try {
      setActivating(true);
      const res = await updatePeriodo(p.id, { estado: 'cerrado' });
      if (res) {
        toast.success(`Periodo ${p.codigo} cerrado (Solo lectura)`);
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al cerrar el periodo');
    } finally {
      setActivating(false);
    }
  };

  const handleViewDetail = async (p: any) => {
    // Toggle: if already expanded, collapse
    if (expandedPeriodoId === p.id) {
      setExpandedPeriodoId(null);
      setDetailData(null);
      return;
    }
    setExpandedPeriodoId(p.id);
    setSelectedPeriodo(p);
    setDetailData(null);
    setActiveDetailTab('programas');
    try {
      setLoadingDetail(true);
      const res = await getPeriodoDetalle(p.id);
      if (res && res.success) {
        setDetailData({
          programs: res.programs || [],
          cetaps: res.cetaps || []
        });
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Error al cargar los detalles del periodo académico');
    } finally {
      setLoadingDetail(false);
    }
  };

  const getEstadoDetails = (estado: string) => {
    switch (estado) {
      case 'planeacion':
        return {
          label: 'Planeación',
          className: 'bg-blue-50 text-blue-700 border-blue-200',
          desc: 'Carga de catálogo y programas en planeación.',
          icon: CalendarDays
        };
      case 'concertacion':
        return {
          label: 'Concertación',
          className: 'bg-purple-50 text-purple-700 border-purple-200',
          desc: 'Apertura de concertación de Planes de Trabajo Académico (PTA).',
          icon: FileCheck
        };
      case 'en_curso':
        return {
          label: 'En Curso',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          desc: 'Periodo académico activo. Registro de actividades en curso.',
          icon: ShieldCheck
        };
      case 'cerrado':
        return {
          label: 'Cerrado',
          className: 'bg-gray-50 text-gray-700 border-gray-200',
          desc: 'Periodo cerrado. Acceso de solo lectura histórico.',
          icon: Archive
        };
      default:
        return {
          label: estado,
          className: 'bg-gray-50 text-gray-700 border-gray-200',
          desc: '',
          icon: Clock
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Unified Card: Header + List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header Section */}
        <div className="px-8 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2.5 hover:bg-gray-100 rounded-xl transition-all flex items-center justify-center border border-gray-200 bg-white"
              >
                <ArrowLeft className="w-4 h-4 text-gray-700" />
              </button>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#EBF0FA' }}>
                <Calendar className="w-6 h-6 text-[#003DA5]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Gestión de Periodos Académicos</h1>
                <p className="text-xs text-gray-400 mt-0.5">Administre el ciclo de vida y vigencia de periodos semestrales</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#003DA5] text-white text-xs font-bold rounded-xl hover:bg-[#002d7a] transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Crear Periodo
            </button>
          </div>
        </div>

        {/* Table info bar */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
          <p className="text-xs text-gray-400">
            Mostrando <span className="font-semibold text-gray-600">{periodos.length}</span> periodos académicos
          </p>
        </div>

        {loading && periodos.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#003DA5] mb-2" />
              <p className="text-sm text-gray-500 font-semibold">Cargando periodos académicos...</p>
            </div>
          </div>
        ) : periodos.length === 0 ? (
          <div className="py-20 px-4 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-[#003DA5]/40" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">Sin periodos registrados</h3>
            <p className="text-xs text-gray-400 mb-5 max-w-xs mx-auto">
              Aún no se han configurado periodos académicos. Cree uno nuevo para comenzar.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2 bg-[#003DA5] text-white text-xs font-bold rounded-lg hover:bg-[#002d7a] transition-all shadow-sm flex items-center gap-1.5 mx-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Crear Periodo
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/80 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Periodo</th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Catálogo</th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Vigencia</th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  <AnimatePresence>
                    {periodos.map((p, index) => {
                      const stateInfo = getEstadoDetails(p.estado);
                      const StateIcon = stateInfo.icon;
                      const stats = periodStats[p.codigo];
                      return (
                        <React.Fragment key={p.id}>
                        <motion.tr
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                          className={`hover:bg-blue-50/20 transition-colors group cursor-pointer ${expandedPeriodoId === p.id ? 'bg-blue-50/30' : ''}`}
                          onClick={() => handleViewDetail(p)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-blue-50 text-[#003DA5] border border-blue-100 shrink-0">
                                <Calendar className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 text-sm group-hover:text-[#003DA5] transition-colors">
                                  Periodo {p.codigo}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Semestre {p.semestre} — Año {p.anio}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <Badge className={`${stateInfo.className} font-bold px-2 py-0.5 border text-xs`}>
                              <StateIcon className="w-3 h-3 mr-1" />
                              {stateInfo.label}
                            </Badge>
                            <p className="text-[10px] text-gray-400 mt-1 max-w-[180px] leading-tight">{stateInfo.desc}</p>
                          </td>

                          <td className="px-5 py-4">
                            {stats ? (
                              <div className="flex items-center gap-4">
                                <div className="text-center">
                                  <p className="text-sm font-bold text-gray-900">{stats.programas || 0}</p>
                                  <p className="text-[9px] text-gray-400 font-semibold uppercase">Prog.</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-sm font-bold text-[#003DA5]">{stats.asignaturas || 0}</p>
                                  <p className="text-[9px] text-gray-400 font-semibold uppercase">Asig.</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-sm font-bold text-emerald-600">{stats.ofertas_cetap_programa || 0}</p>
                                  <p className="text-[9px] text-gray-400 font-semibold uppercase">CETAPs</p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs text-gray-300">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Cargando...
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-gray-300" />
                                <span className="text-gray-500">Inicio:</span>
                                <span className="font-semibold text-gray-700">
                                  {p.fechaInicio ? new Date(p.fechaInicio).toLocaleDateString('es-CO', { timeZone: 'UTC' }) : '—'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-gray-300" />
                                <span className="text-gray-500">Fin:</span>
                                <span className="font-semibold text-gray-700">
                                  {p.fechaFin ? new Date(p.fechaFin).toLocaleDateString('es-CO', { timeZone: 'UTC' }) : '—'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {/* Botón Activar / Cerrar */}
                              {p.estado === 'en_curso' ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCerrarPeriodo(p); }}
                                  disabled={activating}
                                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[11px] font-bold border border-amber-200 transition-all flex items-center gap-1"
                                >
                                  <ShieldCheck className="w-3 h-3" />
                                  Cerrar
                                </button>
                              ) : p.estado !== 'cerrado' ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setPeriodoToActivate(p); }}
                                  className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-[11px] font-bold border border-green-200 transition-all flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  Activar
                                </button>
                              ) : null}
                              <button
                                onClick={(e) => { e.stopPropagation(); onNavigateToImport(p.codigo); }}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#003DA5] rounded-lg text-[11px] font-bold border border-blue-100 transition-all flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                Importar
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleViewDetail(p); }}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1 ${
                                  expandedPeriodoId === p.id
                                    ? 'bg-[#003DA5] text-white border-[#003DA5]'
                                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
                                }`}
                              >
                                <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${expandedPeriodoId === p.id ? 'rotate-90' : ''}`} />
                                {expandedPeriodoId === p.id ? 'Cerrar' : 'Ver más'}
                              </button>
                            </div>
                          </td>
                        </motion.tr>

                        {/* ─── Expanded Detail Row ─── */}
                        <AnimatePresence>
                          {expandedPeriodoId === p.id && (
                            <motion.tr
                              key={`detail-${p.id}`}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25, ease: 'easeInOut' }}
                            >
                              <td colSpan={5} className="p-0">
                                <div className="bg-gradient-to-b from-blue-50/40 to-white border-t-2 border-[#003DA5]/10">
                                  {/* Detail Header */}
                                  <div className="px-6 pt-4 pb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="grid grid-cols-4 gap-4 text-xs">
                                        <div>
                                          <span className="font-semibold text-gray-400 uppercase tracking-wider block text-[9px]">Estado</span>
                                          <span className="font-black text-gray-800 uppercase block mt-0.5">{p.estado?.replace('_', ' ')}</span>
                                        </div>
                                        <div>
                                          <span className="font-semibold text-gray-400 uppercase tracking-wider block text-[9px]">Año / Semestre</span>
                                          <span className="font-black text-gray-800 block mt-0.5">{p.anio} - Sem. {p.semestre}</span>
                                        </div>
                                        <div>
                                          <span className="font-semibold text-gray-400 uppercase tracking-wider block text-[9px]">Inicio</span>
                                          <span className="font-black text-gray-800 block mt-0.5">
                                            {p.fechaInicio ? new Date(p.fechaInicio).toLocaleDateString('es-CO', { timeZone: 'UTC' }) : '—'}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="font-semibold text-gray-400 uppercase tracking-wider block text-[9px]">Fin</span>
                                          <span className="font-black text-gray-800 block mt-0.5">
                                            {p.fechaFin ? new Date(p.fechaFin).toLocaleDateString('es-CO', { timeZone: 'UTC' }) : '—'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    {/* Tabs */}
                                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border">
                                      <button
                                        type="button"
                                        onClick={() => setActiveDetailTab('programas')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                                          activeDetailTab === 'programas' ? 'bg-[#003DA5] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                        }`}
                                      >
                                        <GraduationCap className="w-3 h-3" />
                                        Programas
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setActiveDetailTab('cetaps')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                                          activeDetailTab === 'cetaps' ? 'bg-[#003DA5] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                        }`}
                                      >
                                        <Building className="w-3 h-3" />
                                        CETAPs
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => { setActiveDetailTab('admin' as any); handleEditOpen(p); }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                                          activeDetailTab === ('admin' as any) ? 'bg-[#003DA5] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                        }`}
                                      >
                                        <Settings2 className="w-3 h-3" />
                                        Administrar
                                      </button>
                                    </div>
                                  </div>

                                  {/* Detail Content */}
                                  <div className="px-6 pb-4">
                                    <div className="border rounded-xl bg-white overflow-hidden shadow-sm" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                                      {loadingDetail ? (
                                        <div className="flex flex-col items-center justify-center py-10">
                                          <Loader2 className="w-6 h-6 animate-spin text-[#003DA5] mb-2" />
                                          <p className="text-[11px] text-gray-500 font-bold">Consultando base de datos...</p>
                                        </div>
                                      ) : !detailData ? (
                                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                          <AlertTriangle className="w-6 h-6 mb-2" />
                                          <p className="text-[11px]">No se pudieron cargar los datos.</p>
                                        </div>
                                      ) : activeDetailTab === 'programas' ? (
                                        detailData.programs.length === 0 ? (
                                          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                            <GraduationCap className="w-8 h-8 mb-2 stroke-[1.5]" />
                                            <p className="text-[11px]">Sin programas académicos activos.</p>
                                          </div>
                                        ) : (
                                          <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-50 border-b font-bold text-gray-700 sticky top-0 z-10">
                                              <tr>
                                                <th className="p-3">Código</th>
                                                <th className="p-3">Programa Académico</th>
                                                <th className="p-3 text-center">Asignaturas</th>
                                                <th className="p-3 text-center">CETAPs Activos</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y text-gray-700">
                                              {detailData.programs.map((prog: any) => (
                                                <tr key={prog.id} className="hover:bg-gray-50">
                                                  <td className="p-3 font-mono text-gray-500">{prog.codigo}</td>
                                                  <td className="p-3 font-bold text-gray-900">{prog.nombre}</td>
                                                  <td className="p-3 text-center font-bold text-[#003DA5]">{prog.subjectsCount || 0}</td>
                                                  <td className="p-3 text-center">
                                                    <Badge className="bg-blue-50 text-blue-800 border font-bold">
                                                      {prog.activeCetaps || 0} CETAPs
                                                    </Badge>
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        )
                                      ) : (
                                        detailData.cetaps.length === 0 ? (
                                          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                            <Building className="w-8 h-8 mb-2 stroke-[1.5]" />
                                            <p className="text-[11px]">Sin oferta de CETAPs activa.</p>
                                          </div>
                                        ) : (
                                          <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-50 border-b font-bold text-gray-700 sticky top-0 z-10">
                                              <tr>
                                                <th className="p-3">CETAP</th>
                                                <th className="p-3">Dirección Territorial</th>
                                                <th className="p-3 text-center font-bold">Programas Ofertados</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y text-gray-700">
                                              {detailData.cetaps.map((cetap: any) => (
                                                <tr key={cetap.id} className="hover:bg-gray-50">
                                                  <td className="p-3 font-bold text-gray-900">{cetap.nombre}</td>
                                                  <td className="p-3 font-medium text-gray-500">{cetap.dtNombre?.replace(/_/g, ' ')}</td>
                                                  <td className="p-3 text-center">
                                                    <Badge className="bg-emerald-50 text-emerald-800 border font-bold">
                                                      {cetap.activePrograms || 0} progr.
                                                    </Badge>
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        )
                                      )}
                                    </div>

                                    {/* Admin Tab Content */}
                                    {activeDetailTab === ('admin' as any) && (
                                      <div className="border rounded-xl bg-white overflow-hidden shadow-sm p-5 mt-3">
                                        <form onSubmit={handleUpdate} className="space-y-4">
                                          <div className="grid grid-cols-3 gap-4">
                                            <div>
                                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">
                                                Fase / Estado
                                              </label>
                                              <select
                                                value={editEstado}
                                                onChange={(e) => setEditEstado(e.target.value)}
                                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white font-bold text-xs cursor-pointer"
                                                required
                                              >
                                                <option value="planeacion">Planeación</option>
                                                <option value="concertacion">Concertación</option>
                                                <option value="en_curso">En Curso</option>
                                                <option value="cerrado">Cerrado</option>
                                              </select>
                                            </div>
                                            <div>
                                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">
                                                Fecha Inicio
                                              </label>
                                              <input
                                                type="date"
                                                value={editFechaInicio}
                                                onChange={(e) => setEditFechaInicio(e.target.value)}
                                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] font-bold text-xs"
                                                required
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">
                                                Fecha Fin
                                              </label>
                                              <input
                                                type="date"
                                                value={editFechaFin}
                                                onChange={(e) => setEditFechaFin(e.target.value)}
                                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] font-bold text-xs"
                                                required
                                              />
                                            </div>
                                          </div>
                                          <p className="text-[10px] text-gray-400 leading-relaxed">
                                            Cambiar el estado altera las capacidades de concertación de los docentes en la plataforma.
                                          </p>
                                          <div className="flex justify-end">
                                            <button
                                              type="submit"
                                              disabled={updating}
                                              className="px-5 py-2 bg-[#003DA5] hover:bg-[#002d7a] text-white rounded-xl text-[11px] font-bold shadow-sm transition-all flex items-center gap-1.5"
                                            >
                                              {updating ? (
                                                <>
                                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                  Guardando...
                                                </>
                                              ) : (
                                                'Guardar Cambios'
                                              )}
                                            </button>
                                          </div>
                                        </form>
                                      </div>
                                    )}

                                    {/* Actions Footer */}
                                    <div className="flex justify-end gap-2 mt-3">
                                      <button
                                        type="button"
                                        onClick={() => { setExpandedPeriodoId(null); setDetailData(null); }}
                                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-bold transition-all"
                                      >
                                        Cerrar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onNavigateToImport(p.codigo)}
                                        className="px-4 py-2 bg-[#003DA5] hover:bg-[#002d7a] text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        Actualizar Catálogo (Excel)
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                        </React.Fragment>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="lg:hidden divide-y divide-gray-100">
              <AnimatePresence>
                {periodos.map((p, index) => {
                  const stateInfo = getEstadoDetails(p.estado);
                  const StateIcon = stateInfo.icon;
                  const stats = periodStats[p.codigo];
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-blue-50 text-[#003DA5] border border-blue-100 shrink-0">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-sm">Periodo {p.codigo}</h3>
                            <p className="text-xs text-gray-500">Semestre {p.semestre} — Año {p.anio}</p>
                          </div>
                        </div>
                        <Badge className={`${stateInfo.className} font-bold px-2 py-0.5 border text-xs`}>
                          <StateIcon className="w-3 h-3 mr-1" />
                          {stateInfo.label}
                        </Badge>
                      </div>

                      {stats && (
                        <div className="grid grid-cols-3 gap-2 bg-blue-50/20 p-2 rounded-xl border border-blue-100/50 text-center mb-3">
                          <div>
                            <p className="text-[9px] text-gray-500 font-bold uppercase">Prog.</p>
                            <p className="text-sm font-black text-gray-900">{stats.programas || 0}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-gray-500 font-bold uppercase">Asig.</p>
                            <p className="text-sm font-black text-[#003DA5]">{stats.asignaturas || 0}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-gray-500 font-bold uppercase">CETAPs</p>
                            <p className="text-sm font-black text-emerald-600">{stats.ofertas_cetap_programa || 0}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 mt-3">
                        <button onClick={() => onNavigateToImport(p.codigo)} className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-50 hover:bg-blue-100 text-[#003DA5] rounded-xl text-xs font-bold border border-blue-100 transition-all">
                          <Plus className="w-3 h-3" /> Importar
                        </button>
                        <button onClick={() => handleViewDetail(p)} className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-xs font-bold border border-gray-200 transition-all">
                          <Eye className="w-3 h-3" /> Detalles
                        </button>
                        <button onClick={() => handleEditOpen(p)} className="flex-1 flex items-center justify-center gap-1 py-2 hover:bg-gray-100 text-gray-600 rounded-xl text-xs font-bold border border-gray-200 bg-white transition-all">
                          <Settings2 className="w-3 h-3" /> Admin
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* Modal para Crear Periodo */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md border border-gray-100"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-[#003DA5]">
                  <Calendar className="w-5 h-5" />
                  <h3 className="text-lg font-black uppercase tracking-wider">Crear Periodo Académico</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                    Año
                  </label>
                  <input
                    type="number"
                    min="2020"
                    max="2050"
                    value={newAnio}
                    onChange={(e) => setNewAnio(parseInt(e.target.value, 10))}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] font-bold text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                    Semestre Académico
                  </label>
                  <select
                    value={newSemestre}
                    onChange={(e) => setNewSemestre(parseInt(e.target.value, 10))}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white font-bold text-sm cursor-pointer"
                    required
                  >
                    <option value={1}>Semestre 1 (Periodo XX-1)</option>
                    <option value={2}>Semestre 2 (Periodo XX-2)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                      Fecha de Inicio
                    </label>
                    <input
                      type="date"
                      value={newFechaInicio}
                      onChange={(e) => setNewFechaInicio(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] font-bold text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                      Fecha de Fin
                    </label>
                    <input
                      type="date"
                      value={newFechaFin}
                      onChange={(e) => setNewFechaFin(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] font-bold text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 text-gray-600 hover:bg-gray-50 border rounded-xl text-xs font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-5 py-2.5 bg-[#003DA5] hover:bg-[#002d7a] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      'Crear Periodo'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmación para Activar Periodo */}
      <AnimatePresence>
        {periodoToActivate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-sm border border-gray-100"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Activar Periodo {periodoToActivate.codigo}</h3>
                  <p className="text-[11px] text-gray-500">Este periodo se marcará como "En Curso"</p>
                </div>
              </div>

              {periodoActivo && periodoActivo.id !== periodoToActivate.id && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                  <p className="text-[11px] text-amber-800 font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    El periodo <strong>{periodoActivo.codigo}</strong> se cerrará automáticamente
                  </p>
                  <p className="text-[10px] text-amber-600 mt-1">Solo puede haber un periodo activo a la vez.</p>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setPeriodoToActivate(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-50 border rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleActivarPeriodo(periodoToActivate)}
                  disabled={activating}
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                >
                  {activating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Activando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Confirmar Activación
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
