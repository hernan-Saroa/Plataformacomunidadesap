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

  const handleViewDetail = async (p: any) => {
    setSelectedPeriodo(p);
    setDetailData(null);
    setShowDetailModal(true);
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
    <Container4K className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-xl transition-all mr-2 flex items-center justify-center border border-gray-200 bg-white"
        >
          <ArrowLeft className="w-4 h-4 text-gray-700" />
        </button>
        <ResponsiveHeader
          title="Gestión de Periodos Académicos"
          description="Administre el ciclo de vida, fases del proceso de concertación de PTAs y vigencia de periodos semestrales."
          icon={Calendar}
          primaryAction={{
            label: "Crear Periodo",
            icon: Plus,
            onClick: () => setShowCreateModal(true),
            variant: "primary"
          }}
        />
      </div>

      {/* Grid de Periodos */}
      {loading && periodos.length === 0 ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-2xl border">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#003DA5] mb-2" />
            <p className="text-sm text-gray-500 font-semibold">Cargando periodos académicos...</p>
          </div>
        </div>
      ) : periodos.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-3 border-gray-300">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-base font-black text-gray-900 uppercase">Sin periodos registrados</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            Aún no se han configurado periodos académicos. Cree uno nuevo para habilitar la concertación de PTAs.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 bg-[#003DA5] hover:bg-[#002d7a] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            Configurar Primer Periodo
          </button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {periodos.map((p) => {
            const stateInfo = getEstadoDetails(p.estado);
            const StateIcon = stateInfo.icon;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="p-6 h-full flex flex-col justify-between hover:shadow-md border border-gray-200 transition-all group bg-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/30 rounded-bl-full -z-10 group-hover:bg-blue-50/50 transition-colors" />
                  
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-blue-50 text-[#003DA5] border border-blue-100 shadow-sm shrink-0">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-gray-900 leading-tight">Periodo {p.codigo}</h4>
                          <p className="text-xs text-gray-500">Semestre {p.semestre} — Año {p.anio}</p>
                        </div>
                      </div>
                      <Badge className={`${stateInfo.className} font-bold px-2 py-0.5 border text-xs`}>
                        <StateIcon className="w-3.5 h-3.5 mr-1" />
                        {stateInfo.label}
                      </Badge>
                    </div>

                    <p className="text-xs text-gray-600 mb-3 leading-relaxed min-h-[32px]">
                      {stateInfo.desc}
                    </p>

                    {/* Catálogo Cargado Stats */}
                    {periodStats[p.codigo] ? (
                      <div className="grid grid-cols-3 gap-2 bg-blue-50/20 p-2.5 rounded-2xl border border-blue-100/50 text-center my-3">
                        <div>
                          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Programas</p>
                          <p className="text-sm font-black text-gray-900 mt-0.5">{periodStats[p.codigo].programas || 0}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Asignaturas</p>
                          <p className="text-sm font-black text-[#003DA5] mt-0.5">{periodStats[p.codigo].asignaturas || 0}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">CETAPs Act.</p>
                          <p className="text-sm font-black text-emerald-700 mt-0.5">{periodStats[p.codigo].ofertas_cetap_programa || 0}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="h-12 flex items-center justify-center text-xs text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed my-3">
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5 text-gray-400" />
                        Cargando estadísticas...
                      </div>
                    )}

                    <div className="space-y-2 border-t pt-4 border-gray-100 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Inicio de Vigencia:
                        </span>
                        <span className="font-bold text-gray-800">
                          {p.fechaInicio ? new Date(p.fechaInicio).toLocaleDateString('es-CO', { timeZone: 'UTC' }) : 'No definida'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Fin de Vigencia:
                        </span>
                        <span className="font-bold text-gray-800">
                          {p.fechaFin ? new Date(p.fechaFin).toLocaleDateString('es-CO', { timeZone: 'UTC' }) : 'No definida'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-between items-center gap-2 border-t pt-4 border-gray-100">
                    <button
                      onClick={() => onNavigateToImport(p.codigo)}
                      className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[#003DA5] rounded-xl text-xs font-bold border border-blue-150 transition-all flex items-center gap-1.5 shadow-sm"
                      title="Importar catálogo de programas, asignaturas y oferta CETAP para este periodo"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Importar
                    </button>
                    <button
                      onClick={() => handleViewDetail(p)}
                      className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold border border-gray-200 transition-all flex items-center gap-1.5 shadow-sm"
                      title="Ver programas y CETAPs activos en este periodo"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Detalles
                    </button>
                    <button
                      onClick={() => handleEditOpen(p)}
                      className="px-3.5 py-2 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold border border-gray-200 bg-white transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      Administrar
                    </button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

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

      {/* Modal para Editar / Administrar Periodo */}
      <AnimatePresence>
        {showEditModal && selectedPeriodo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md border border-gray-100"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-[#003DA5]">
                  <Settings2 className="w-5 h-5" />
                  <h3 className="text-lg font-black uppercase tracking-wider">Administrar Periodo {selectedPeriodo.codigo}</h3>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                    Fase / Estado del Periodo
                  </label>
                  <select
                    value={editEstado}
                    onChange={(e) => setEditEstado(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white font-bold text-sm cursor-pointer"
                    required
                  >
                    <option value="planeacion">Planeación (Carga de Catálogo)</option>
                    <option value="concertacion">Concertación (Apertura PTAs)</option>
                    <option value="en_curso">En Curso (Periodo Activo)</option>
                    <option value="cerrado">Cerrado (Solo Lectura / Histórico)</option>
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                    Cambiar el estado altera las capacidades de concertación de los docentes en la plataforma.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                      Fecha de Inicio
                    </label>
                    <input
                      type="date"
                      value={editFechaInicio}
                      onChange={(e) => setEditFechaInicio(e.target.value)}
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
                      value={editFechaFin}
                      onChange={(e) => setEditFechaFin(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] font-bold text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2.5 text-gray-600 hover:bg-gray-50 border rounded-xl text-xs font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-5 py-2.5 bg-[#003DA5] hover:bg-[#002d7a] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal para Detalles del Periodo */}
      <AnimatePresence>
        {showDetailModal && selectedPeriodo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-2xl border border-gray-100 h-[85vh] flex flex-col justify-between"
            >
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2 text-[#003DA5]">
                    <Eye className="w-5 h-5" />
                    <h3 className="text-lg font-black uppercase tracking-wider">Detalle del Catálogo — Periodo {selectedPeriodo.codigo}</h3>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="p-1.5 hover:bg-gray-100 rounded-xl transition-all"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                {/* Info del Periodo */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 border rounded-2xl mb-6 text-xs text-gray-600">
                  <div>
                    <span className="font-semibold text-gray-400 uppercase tracking-wider block">Estado</span>
                    <span className="font-black text-gray-800 uppercase block mt-0.5">{selectedPeriodo.estado}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-400 uppercase tracking-wider block">Año / Semestre</span>
                    <span className="font-black text-gray-800 block mt-0.5">{selectedPeriodo.anio} - Semestre {selectedPeriodo.semestre}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-400 uppercase tracking-wider block">Inicio</span>
                    <span className="font-black text-gray-800 block mt-0.5">
                      {selectedPeriodo.fechaInicio ? new Date(selectedPeriodo.fechaInicio).toLocaleDateString('es-CO', { timeZone: 'UTC' }) : 'No definida'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-400 uppercase tracking-wider block">Fin</span>
                    <span className="font-black text-gray-800 block mt-0.5">
                      {selectedPeriodo.fechaFin ? new Date(selectedPeriodo.fechaFin).toLocaleDateString('es-CO', { timeZone: 'UTC' }) : 'No definida'}
                    </span>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-4 border">
                  <button
                    type="button"
                    onClick={() => setActiveDetailTab('programas')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                      activeDetailTab === 'programas' ? 'bg-white text-[#003DA5] shadow-sm border' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    Programas Activos
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDetailTab('cetaps')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                      activeDetailTab === 'cetaps' ? 'bg-white text-[#003DA5] shadow-sm border' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" />
                    CETAPs Oferta
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="flex-1 overflow-y-auto min-h-0 border rounded-2xl bg-white mb-6 shadow-inner">
                {loadingDetail ? (
                  <div className="flex flex-col items-center justify-center h-full py-10">
                    <Loader2 className="w-8 h-8 animate-spin text-[#003DA5] mb-2" />
                    <p className="text-xs text-gray-500 font-bold">Consultando base de datos...</p>
                  </div>
                ) : !detailData ? (
                  <div className="flex flex-col items-center justify-center h-full py-10 text-gray-400">
                    <AlertTriangle className="w-8 h-8 mb-2" />
                    <p className="text-xs">No se pudieron cargar los datos.</p>
                  </div>
                ) : activeDetailTab === 'programas' ? (
                  detailData.programs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-10 text-gray-400">
                      <GraduationCap className="w-10 h-10 mb-2 stroke-[1.5]" />
                      <p className="text-xs">Sin programas académicos activos para este periodo.</p>
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
                    <div className="flex flex-col items-center justify-center h-full py-10 text-gray-400">
                      <Building className="w-10 h-10 mb-2 stroke-[1.5]" />
                      <p className="text-xs">Sin oferta de CETAPs activa para este periodo.</p>
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

              {/* Actions Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailModal(false);
                    onNavigateToImport(selectedPeriodo.codigo);
                  }}
                  className="px-5 py-2.5 bg-[#003DA5] hover:bg-[#002d7a] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Actualizar Catálogo (Excel)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Container4K>
  );
}
