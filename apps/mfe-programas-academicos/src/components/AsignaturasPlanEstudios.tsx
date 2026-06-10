/**
 * AsignaturasPlanEstudios — Gestion del plan de estudios (asignaturas) de un programa
 * Se muestra dentro del panel expandido de ProgramasAcademicosModule.
 * Los datos se sincronizan automaticamente con el modulo PTA (Oferta Academica).
 * 
 * Features:
 * - Exportacion Excel (CSV) y PDF (print)
 * - Drag & drop en vista malla curricular
 * - Barra de progreso de creditos
 * - Nucleos dinamicos con colores
 * - Filtros y busqueda
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen, Plus, Save, Trash2, Edit3, X, Check, Loader2,
  Clock, GraduationCap, Layers, AlertTriangle, RefreshCw,
  ChevronDown, ArrowUpDown, Search, BarChart3, Grid3X3, List,
  TrendingUp, Hash, Filter, Download, FileSpreadsheet, Printer,
  GripVertical, Move,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../services/api';

interface Asignatura {
  id: string;
  nombre: string;
  codigo?: string;
  nucleoTematico?: string;
  semestre: number;
  creditos: number;
  horas: number;
  horasFijasPta?: number;
  modalidad: string;
  tipo?: string;
  prerequisitos?: string;
  programa_id: string;
  created_at?: string;
  updated_at?: string;
}

interface Props {
  programaId: string;
  programaNombre: string;
  totalCreditos?: number;
  totalSemestres?: number;
}

const MODALIDADES = ['Presencial', 'Virtual', 'Mixta', 'Distancia'];
const TIPOS = ['Teorica', 'Practica', 'Taller', 'Seminario', 'Laboratorio'];

const SEMESTRES_LABELS: string[] = [
  '',
  'Primer semestre',
  'Segundo semestre',
  'Tercer semestre',
  'Cuarto semestre',
  'Quinto semestre',
  'Sexto semestre',
  'Séptimo semestre',
  'Octavo semestre',
  'Noveno semestre',
  'Décimo semestre',
  'Onceavo semestre',
  'Doceavo semestre',
  'Semestre I',
  'Semestre II',
  'Semestre III',
  'Semestre IV'
];

const NUCLEO_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Administración Pública': { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  'Derecho': { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  'Economía': { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Finanzas': { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  'Gestión': { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  'Investigación': { bg: 'bg-pink-100', text: 'text-pink-700', dot: 'bg-pink-500' },
  'Estadística': { bg: 'bg-cyan-100', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  'Ciencias Sociales': { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  'Ética': { bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500' },
  'Electivas': { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  'Idiomas': { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
  'TIC': { bg: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-500' },
  'Humanidades': { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
  'Institucional': { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' },
};

const getNucleoColor = (nucleo?: string) => {
  if (!nucleo) return { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
  // Match partial keys
  for (const [key, val] of Object.entries(NUCLEO_COLORS)) {
    if (nucleo.includes(key) || key.includes(nucleo)) return val;
  }
  return NUCLEO_COLORS[nucleo] || { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
};

const EMPTY_ASIGNATURA: Omit<Asignatura, 'id' | 'programa_id'> = {
  nombre: '', codigo: '', nucleoTematico: 'General', semestre: 1,
  creditos: 3, horas: 144, modalidad: 'Presencial', tipo: 'Teorica', prerequisitos: '',
};

// ═══ Export Helpers ═══

function exportToCSV(asignaturas: Asignatura[], programaNombre: string) {
  const headers = ['#', 'Codigo', 'Nombre', 'Semestre', 'Creditos', 'Horas', 'Nucleo', 'Modalidad', 'Tipo'];
  const rows = asignaturas
    .sort((a, b) => (a.semestre || 1) - (b.semestre || 1) || a.nombre.localeCompare(b.nombre))
    .map((a, i) => [
      i + 1,
      a.codigo || '',
      `"${a.nombre.replace(/"/g, '""')}"`,
      a.semestre,
      a.horas,
      a.horasFijasPta || '',
      `"${a.nucleoTematico}"`,
      a.modalidad,
      a.tipo || 'Teorica',
    ]);

  const totalCreditos = asignaturas.reduce((s, a) => s + (a.creditos || 0), 0);
  const totalHoras = asignaturas.reduce((s, a) => s + (a.horas || 0), 0);
  rows.push([]);
  rows.push(['', '', 'TOTAL', '', totalCreditos, totalHoras, '', '', '']);

  const csv = [headers.join(','), ...rows.map(r => (r as any[]).join(','))].join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Plan_Estudios_${programaNombre.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportToPDF(asignaturas: Asignatura[], programaNombre: string, totalCreditos?: number, totalSemestres?: number) {
  const sortedAsigs = [...asignaturas].sort((a, b) => (a.semestre || 1) - (b.semestre || 1) || a.nombre.localeCompare(b.nombre));
  const totalCr = asignaturas.reduce((s, a) => s + (a.creditos || 0), 0);
  const totalH = asignaturas.reduce((s, a) => s + (a.horas || 0), 0);

  // Group by semester
  const bySem = new Map<number, Asignatura[]>();
  sortedAsigs.forEach(a => {
    const sem = a.semestre || 1;
    bySem.set(sem, [...(bySem.get(sem) || []), a]);
  });

  const win = window.open('', '_blank');
  if (!win) { toast.error('Popup bloqueado. Permite popups para exportar PDF.'); return; }

  win.document.write(`<!DOCTYPE html><html><head>
    <title>Plan de Estudios - ${programaNombre}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; color: #111; padding: 30px; }
      .header { text-align: center; margin-bottom: 24px; border-bottom: 3px solid #003DA5; padding-bottom: 16px; }
      .header h1 { font-size: 18px; color: #003DA5; margin-bottom: 4px; }
      .header p { font-size: 11px; color: #666; }
      .stats { display: flex; gap: 24px; justify-content: center; margin-bottom: 20px; }
      .stat { text-align: center; }
      .stat .value { font-size: 20px; font-weight: 800; color: #003DA5; }
      .stat .label { font-size: 9px; text-transform: uppercase; color: #999; letter-spacing: 1px; }
      .semester { margin-bottom: 16px; }
      .semester h3 { font-size: 12px; background: #003DA5; color: white; padding: 6px 12px; border-radius: 4px 4px 0 0; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      th { background: #F1F5F9; padding: 5px 8px; text-align: left; font-weight: 700; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; color: #555; }
      td { padding: 5px 8px; border-bottom: 1px solid #E5E7EB; }
      .nucleo { display: inline-block; padding: 1px 6px; border-radius: 10px; background: #EEF2FF; color: #4338CA; font-size: 8px; }
      .footer { margin-top: 24px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 10px; }
      .totals { font-weight: 800; background: #F1F5F9; }
      @media print { body { padding: 15px; } }
    </style>
  </head><body>
    <div class="header">
      <h1>ESAP — Plan de Estudios</h1>
      <p style="font-size:14px; font-weight:700; color:#333; margin-top:4px;">${programaNombre}</p>
      <p>Generado: ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
    </div>
    <div class="stats">
      <div class="stat"><div class="value">${asignaturas.length}</div><div class="label">Asignaturas</div></div>
      <div class="stat"><div class="value">${totalCr}/${totalCreditos}</div><div class="label">Creditos</div></div>
      <div class="stat"><div class="value">${totalH.toLocaleString()}</div><div class="label">Horas</div></div>
      <div class="stat"><div class="value">${bySem.size}</div><div class="label">Semestres</div></div>
    </div>
    ${Array.from(bySem.entries()).sort((a, b) => a[0] - b[0]).map(([sem, asigs]) => {
      const semCr = asigs.reduce((s, a) => s + (a.creditos || 0), 0);
      return `<div class="semester">
        <h3>Semestre ${sem} — ${asigs.length} asignaturas · ${semCr} creditos</h3>
        <table>
          <thead><tr><th>#</th><th>Codigo</th><th>Asignatura</th><th>Creditos</th><th>Horas</th><th>Horas PTA</th><th>Nucleo</th><th>Modalidad</th></tr></thead>
          <tbody>
            ${asigs.map((a, i) => `<tr>
              <td>${i + 1}</td><td>${a.codigo || '-'}</td><td><strong>${a.nombre}</strong></td>
              <td>${a.creditos}</td><td>${a.horas}</td><td>${a.horasFijasPta || '-'}</td>
              <td><span class="nucleo">${a.nucleoTematico}</span></td><td>${a.modalidad ? a.modalidad.charAt(0).toUpperCase() + a.modalidad.slice(1) : ''}</td>
            </tr>`).join('')}
            <tr class="totals"><td colspan="3">Subtotal Semestre ${sem}</td><td>${semCr}</td><td>${asigs.reduce((s, a) => s + (a.horas || 0), 0)}</td><td colspan="2"></td></tr>
          </tbody>
        </table>
      </div>`;
    }).join('')}
    <div style="margin-top:16px; padding:8px 12px; background:#003DA5; color:white; border-radius:4px; font-size:12px; font-weight:800; display:flex; justify-content:space-between;">
      <span>TOTAL PLAN DE ESTUDIOS</span>
      <span>${totalCr} creditos · ${totalH.toLocaleString()} horas · ${asignaturas.length} asignaturas</span>
    </div>
    <div class="footer">ESAP — Escuela Superior de Administracion Publica · Sistema de Gestion Academica</div>
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

// ═══ Drag & Drop State ═══

interface DragState {
  draggingId: string | null;
  overSemestre: number | null;
}

export function AsignaturasPlanEstudios({ programaId, programaNombre, totalCreditos, totalSemestres}: Props) {
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAsig, setNewAsig] = useState(EMPTY_ASIGNATURA);
  const [sortBy, setSortBy] = useState<'semestre' | 'nombre' | 'nucleo'>('semestre');
  const [filterSemestre, setFilterSemestre] = useState<number | 'all'>('all');
  const [filterNucleo, setFilterNucleo] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [hasChanges, setHasChanges] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [dragState, setDragState] = useState<DragState>({ draggingId: null, overSemestre: null });
  const exportRef = useRef<HTMLDivElement>(null);

  // Close export menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load
  const loadAsignaturas = useCallback(async () => {
    if (!programaId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient.get(`/auth/api/v1/programas-academicos/${programaId}/asignaturas?_cb=${Date.now()}`);
      const asignaturasData = (response || []).map(a => ({ ...a, nucleoTematico: a.nucleoTematico || a.nucleo || 'General' }));
      setAsignaturas(asignaturasData);
    } catch (err: any) {
      toast.error('Error al cargar asignaturas', { description: 'No se pudieron cargar las asignaturas del programa' });
    }
    setLoading(false);
  }, [programaId]);

  useEffect(() => { loadAsignaturas(); }, [loadAsignaturas]);

  // Save all
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const response = await apiClient.post(`/auth/api/v1/programas-academicos/${programaId}/asignaturas`, {
        asignaturas,
      });
      setAsignaturas(response || asignaturas);
      setHasChanges(false);
      toast.success('Plan de estudios guardado', {
        description: `${asignaturas.length} asignaturas sincronizadas con Oferta Academica (PTA)`,
      });
    } catch (err: any) {
      toast.error('Error al guardar plan de estudios', { description: err.message });
    }
    setSaving(false);
  };

  // Add
  const handleAdd = () => {
    if (!newAsig.nombre.trim()) {
      toast.error('El nombre de la asignatura es obligatorio');
      return;
    }
    const id = `asig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const asig: Asignatura = {
      ...newAsig,
      id,
      programa_id: programaId,
      horas: newAsig.horas || newAsig.creditos * 48,
    };
    setAsignaturas(prev => [...prev, asig]);
    setNewAsig(EMPTY_ASIGNATURA);
    setShowAddForm(false);
    setHasChanges(true);
    toast.success(`"${asig.nombre}" agregada al plan de estudios`);
  };

  // Delete
  const handleDelete = (id: string) => {
    const asig = asignaturas.find(a => a.id === id);
    if (!asig) return;

    const confirmed = window.confirm(
      `¿Estás seguro de eliminar la asignatura "${asig.nombre}"?\n\nEsta acción removerá la materia de la malla curricular temporalmente hasta que guardes los cambios.`
    );

    if (confirmed) {
      setAsignaturas(prev => prev.filter(a => a.id !== id));
      setHasChanges(true);
      toast.info(`"${asig.nombre}" eliminada`);
    }
  };

  // Update inline
  const handleUpdate = (id: string, field: string, value: any) => {
    setAsignaturas(prev => prev.map(a => {
      if (a.id !== id) return a;
      const updated = { ...a, [field]: value };
      if (field === 'creditos') {
        updated.horas = Number(value) * 48;
      }
      return updated;
    }));
    setHasChanges(true);
  };

  // ═══ Drag & Drop handlers (native HTML5 DnD) ═══
  const handleDragStart = (e: React.DragEvent, asigId: string) => {
    e.dataTransfer.setData('text/plain', asigId);
    e.dataTransfer.effectAllowed = 'move';
    setDragState({ draggingId: asigId, overSemestre: null });
  };

  const handleDragOver = (e: React.DragEvent, targetSem: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragState(prev => ({ ...prev, overSemestre: targetSem }));
  };

  const handleDragLeave = () => {
    setDragState(prev => ({ ...prev, overSemestre: null }));
  };

  const handleDrop = (e: React.DragEvent, targetSem: number) => {
    e.preventDefault();
    const asigId = e.dataTransfer.getData('text/plain');
    if (!asigId) return;

    const asig = asignaturas.find(a => a.id === asigId);
    if (asig && asig.semestre !== targetSem) {
      handleUpdate(asigId, 'semestre', targetSem);
      toast.success(`"${asig.nombre}" movida al Semestre ${targetSem}`);
    }
    setDragState({ draggingId: null, overSemestre: null });
  };

  const handleDragEnd = () => {
    setDragState({ draggingId: null, overSemestre: null });
  };

  // Dynamic stats
  const totalCreditosPlan = asignaturas.reduce((sum, a) => sum + (a.creditos || 0), 0);
  const totalHorasPlan = asignaturas.reduce((sum, a) => sum + (a.horas || 0), 0);
  const creditProgress = totalCreditos && totalCreditos > 0 ? Math.min((totalCreditosPlan / totalCreditos) * 100, 100) : 0;

  // Dynamic nucleos from data
  const nucleosUnicos = useMemo(() => {
    const set = new Set(asignaturas.map(a => a.nucleoTematico).filter(Boolean));
    return Array.from(set).sort();
  }, [asignaturas]);

  // Per-semester data
  const porSemestre = useMemo(() => {
    const map = new Map<number, Asignatura[]>();
    asignaturas.forEach(a => {
      const sem = a.semestre || 1;
      map.set(sem, [...(map.get(sem) || []), a]);
    });
    return map;
  }, [asignaturas]);

  // Per-nucleo stats
  const nucleoStats = useMemo(() => {
    const map = new Map<string, { count: number; creditos: number }>();
    asignaturas.forEach(a => {
      const n = a.nucleoTematico || 'Sin nucleo';
      const existing = map.get(n) || { count: 0, creditos: 0 };
      map.set(n, { count: existing.count + 1, creditos: existing.creditos + (a.creditos || 0) });
    });
    return map;
  }, [asignaturas]);

  // Sort & filter
  const sorted = useMemo(() => [...asignaturas]
    .filter(a => filterSemestre === 'all' || a.semestre === filterSemestre)
    .filter(a => filterNucleo === 'all' || a.nucleoTematico === filterNucleo)
    .filter(a => !searchTerm || a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || (a.codigo || '').toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'semestre') return (a.semestre || 1) - (b.semestre || 1) || a.nombre.localeCompare(b.nombre);
      if (sortBy === 'nombre') return a.nombre.localeCompare(b.nombre);
      return (a.nucleoTematico || '').localeCompare(b.nucleoTematico || '') || a.nombre.localeCompare(b.nombre);
    }), [asignaturas, filterSemestre, filterNucleo, searchTerm, sortBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Cargando plan de estudios...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-4 overflow-hidden">
      {/* Header with Progress */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-[#003DA5]/5 to-transparent">
        <div className="flex items-start sm:items-center justify-between mb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#003DA5]/10 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-[#003DA5]" />
            </div>
            <div>
              <h4 className="font-black text-gray-900 text-sm">Plan de Estudios</h4>
              <p className="text-[11px] text-gray-500">
                {asignaturas.length} asig. · {porSemestre.size} semestres · {nucleosUnicos.length} nucleos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {hasChanges && (
              <span className="text-[11px] text-amber-600 font-bold flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Sin guardar
              </span>
            )}

            {/* Export dropdown */}
            {asignaturas.length > 0 && (
              <div className="relative" ref={exportRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Exportar</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showExportMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-52 overflow-hidden"
                    >
                      <button
                        onClick={() => { exportToCSV(asignaturas, programaNombre); setShowExportMenu(false); toast.success('CSV exportado'); }}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <div className="text-left">
                          <p className="font-bold">Exportar a Excel (CSV)</p>
                          <p className="text-[10px] text-gray-400">Compatible con Excel, Google Sheets</p>
                        </div>
                      </button>
                      <div className="border-t border-gray-100" />
                      <button
                        onClick={() => { exportToPDF(asignaturas, programaNombre, totalCreditos, totalSemestres); setShowExportMenu(false); toast.success('PDF generado'); }}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Printer className="w-4 h-4 text-[#003DA5]" />
                        <div className="text-left">
                          <p className="font-bold">Exportar a PDF</p>
                          <p className="text-[10px] text-gray-400">Documento con formato institucional</p>
                        </div>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-bold text-[#003DA5] bg-[#003DA5]/10 rounded-lg hover:bg-[#003DA5]/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving || !hasChanges}
              className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-bold text-white bg-[#003DA5] rounded-lg hover:bg-[#003DA5]/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Guardar
            </button>
          </div>
        </div>

        {/* Credit Progress Bar */}
        {asignaturas.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-500">Progreso de creditos</span>
              <span className={`font-black ${
                creditProgress >= 100 ? 'text-emerald-600' : creditProgress >= 75 ? 'text-blue-600' : 'text-amber-600'
              }`}>
                {totalCreditosPlan} / {totalCreditos} creditos ({creditProgress.toFixed(0)}%)
              </span>
            </div>
            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${creditProgress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  creditProgress >= 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                  creditProgress >= 75 ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
                  creditProgress >= 50 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                  'bg-gradient-to-r from-red-500 to-red-400'
                }`}
              />
            </div>
            <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1">
              <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{asignaturas.length} asig.</span>
              <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{totalHorasPlan.toLocaleString()} horas</span>
              <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{nucleosUnicos.length} nucleos</span>
              <span className="flex items-center gap-1"><Grid3X3 className="w-3 h-3" />{porSemestre.size} semestres</span>
            </div>
          </div>
        )}
      </div>

      {/* Nucleo distribution bar */}
      {asignaturas.length > 0 && nucleoStats.size > 0 && (
        <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-1 h-3 rounded-full overflow-hidden bg-gray-200">
            {Array.from(nucleoStats.entries())
              .sort((a, b) => b[1].creditos - a[1].creditos)
              .map(([nucleo, stat]) => {
                const pct = totalCreditosPlan > 0 ? (stat.creditos / totalCreditosPlan) * 100 : 0;
                const color = getNucleoColor(nucleo);
                return (
                  <div
                    key={nucleo}
                    className={`h-full ${color.dot} transition-all`}
                    style={{ width: `${pct}%`, minWidth: pct > 0 ? '2px' : '0' }}
                    title={`${nucleo}: ${stat.count} asig. / ${stat.creditos} cr. (${pct.toFixed(0)}%)`}
                  />
                );
              })}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
            {Array.from(nucleoStats.entries())
              .sort((a, b) => b[1].creditos - a[1].creditos)
              .slice(0, 8)
              .map(([nucleo, stat]) => {
                const color = getNucleoColor(nucleo);
                return (
                  <button
                    key={nucleo}
                    onClick={() => setFilterNucleo(filterNucleo === nucleo ? 'all' : nucleo)}
                    className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-all ${
                      filterNucleo === nucleo ? `${color.bg} ${color.text} font-bold ring-1 ring-current` : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
                    {nucleo} ({stat.count})
                  </button>
                );
              })}
            {nucleoStats.size > 8 && (
              <span className="text-[10px] text-gray-400">+{nucleoStats.size - 8} mas</span>
            )}
          </div>
        </div>
      )}

      {/* Filters & Search bar */}
      {asignaturas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-white border-b border-gray-100 text-[11px]">
          <div className="flex items-center gap-1 flex-1 min-w-[180px] max-w-[280px] bg-gray-50 rounded-lg px-2 py-1 border border-gray-200">
            <Search className="w-3 h-3 text-gray-400" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar asignatura..."
              className="bg-transparent text-xs outline-none flex-1 min-w-0"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-gray-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <select
            value={filterSemestre === 'all' ? 'all' : String(filterSemestre)}
            onChange={e => setFilterSemestre(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-2 py-1 border border-gray-200 rounded-md text-xs bg-white"
          >
            <option value="all">Todos los semestres</option>
            {Array.from({ length: totalSemestres }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Sem {i + 1} ({porSemestre.get(i + 1)?.length || 0})
              </option>
            ))}
          </select>

          {filterNucleo !== 'all' && (
            <button
              onClick={() => setFilterNucleo('all')}
              className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium"
            >
              {filterNucleo} <X className="w-3 h-3" />
            </button>
          )}

          <div className="flex items-center gap-1 ml-auto">
            <span className="text-gray-400 mr-1">Ordenar:</span>
            {(['semestre', 'nombre', 'nucleo'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  sortBy === s ? 'bg-[#003DA5] text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {s === 'semestre' ? 'Sem' : s === 'nombre' ? 'A-Z' : 'Nucleo'}
              </button>
            ))}
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <button
              onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
              className={`p-1 rounded transition-colors ${viewMode === 'grid' ? 'bg-[#003DA5] text-white' : 'text-gray-400 hover:bg-gray-100'}`}
              title={viewMode === 'table' ? 'Vista malla curricular (con drag & drop)' : 'Vista tabla'}
            >
              {viewMode === 'table' ? <Grid3X3 className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-blue-50 border-b border-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <Plus className="w-4 h-4 text-[#003DA5]" />
                <span className="text-sm font-bold text-[#003DA5]">Nueva Asignatura</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Nombre *</label>
                  <input
                    value={newAsig.nombre}
                    onChange={e => setNewAsig({ ...newAsig, nombre: e.target.value })}
                    placeholder="Ej: Fundamentos de Administracion Publica"
                    className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#003DA5]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Codigo</label>
                  <input
                    value={newAsig.codigo}
                    onChange={e => setNewAsig({ ...newAsig, codigo: e.target.value })}
                    placeholder="AP-101"
                    className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#003DA5]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Semestre</label>
                  <select
                    value={newAsig.semestre}
                    onChange={e => setNewAsig({ ...newAsig, semestre: Number(e.target.value) })}
                    className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#003DA5]"
                  >
                    {Array.from({ length: totalSemestres }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Semestre {i + 1}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Creditos</label>
                  <input
                    type="number"
                    value={newAsig.creditos}
                    onChange={e => {
                      const c = Number(e.target.value);
                      setNewAsig({ ...newAsig, creditos: c, horas: c * 48 });
                    }}
                    min={0} max={10}
                    className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#003DA5]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Horas</label>
                  <input
                    type="number"
                    value={newAsig.horas}
                    onChange={e => setNewAsig({ ...newAsig, horas: Number(e.target.value) })}
                    className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#003DA5]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Nucleo</label>
                  <input
                    value={newAsig.nucleoTematico}
                    onChange={e => setNewAsig({ ...newAsig, nucleoTematico: e.target.value })}
                    placeholder="Ej: Fundamentación Cuantitativa"
                    className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#003DA5]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Modalidad</label>
                  <select
                    value={newAsig.modalidad}
                    onChange={e => setNewAsig({ ...newAsig, modalidad: e.target.value })}
                    className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#003DA5]"
                  >
                    {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Tipo</label>
                  <select
                    value={newAsig.tipo}
                    onChange={e => setNewAsig({ ...newAsig, tipo: e.target.value })}
                    className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#003DA5]"
                  >
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { setShowAddForm(false); setNewAsig(EMPTY_ASIGNATURA); }}
                  className="flex-1 sm:flex-none px-3 py-3 sm:py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAdd}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-3 sm:py-1.5 text-xs font-bold text-white bg-[#003DA5] rounded-lg hover:bg-[#003DA5]/90"
                >
                  <Check className="w-3.5 h-3.5" />
                  Agregar Asignatura
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {asignaturas.length === 0 ? (
        <div className="py-10 text-center">
          <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-500">No hay asignaturas registradas</p>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            Agrega asignaturas al plan de estudios o espera a que se sincronicen automaticamente desde el catalogo PTA.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-4 px-4 py-2 text-xs font-bold text-white bg-[#003DA5] rounded-lg hover:bg-[#003DA5]/90"
          >
            <Plus className="w-3.5 h-3.5 inline mr-1" />
            Agregar Primera Asignatura
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* ═══ GRID VIEW: Malla Curricular con Drag & Drop ═══ */
        <div className="p-4">
          {/* DnD hint */}
          <div className="flex items-center gap-2 mb-3 px-2 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
            <Move className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[10px] text-blue-700 font-medium">Arrastra asignaturas entre semestres para reorganizar la malla curricular</span>
          </div>
          <div className="overflow-x-auto">
            <div className="flex gap-3" style={{ minWidth: `${Math.max(porSemestre.size, 4) * 200}px` }}>
              {Array.from({ length: totalSemestres }, (_, i) => i + 1)
                .filter(sem => (porSemestre.get(sem)?.length || 0) > 0 || dragState.draggingId !== null)
                .map(sem => {
                  const semAsigs = porSemestre.get(sem) || [];
                  const semCreditos = semAsigs.reduce((s, a) => s + (a.creditos || 0), 0);
                  const isDropTarget = dragState.overSemestre === sem;
                  const hasDragging = dragState.draggingId !== null;
                  return (
                    <div
                      key={sem}
                      className="flex-shrink-0 w-[200px]"
                      onDragOver={e => handleDragOver(e, sem)}
                      onDragLeave={handleDragLeave}
                      onDrop={e => handleDrop(e, sem)}
                    >
                      <div className={`rounded-t-lg px-3 py-2 text-center border transition-colors ${
                        isDropTarget ? 'bg-[#003DA5] border-[#003DA5] text-white' : 'bg-[#003DA5]/10 border-[#003DA5]/20'
                      }`}>
                        <p className={`text-xs font-black ${isDropTarget ? 'text-white' : 'text-[#003DA5]'}`}>Semestre {sem}</p>
                        <p className={`text-[10px] ${isDropTarget ? 'text-blue-100' : 'text-gray-500'}`}>{semAsigs.length} asig. · {semCreditos} cr.</p>
                      </div>
                      <div className={`space-y-1.5 p-1.5 border-x border-b rounded-b-lg min-h-[80px] transition-all ${
                        isDropTarget ? 'border-[#003DA5] bg-blue-50/50 ring-2 ring-[#003DA5]/20' :
                        hasDragging ? 'border-gray-300 bg-gray-50/80 border-dashed' :
                        'border-gray-200 bg-gray-50/50'
                      }`}>
                        {isDropTarget && semAsigs.length === 0 && (
                          <div className="flex items-center justify-center h-16 border-2 border-dashed border-[#003DA5]/30 rounded-lg">
                            <span className="text-[10px] text-[#003DA5]/60 font-medium">Soltar aqui</span>
                          </div>
                        )}
                        {semAsigs
                          .filter(a => filterNucleo === 'all' || a.nucleoTematico === filterNucleo)
                          .filter(a => !searchTerm || a.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
                          .map(asig => {
                            const color = getNucleoColor(asig.nucleoTematico);
                            const isDragging = dragState.draggingId === asig.id;
                            return (
                              <div
                                key={asig.id}
                                draggable
                                onDragStart={e => handleDragStart(e, asig.id)}
                                onDragEnd={handleDragEnd}
                                className={`${color.bg} rounded-lg p-2 border border-transparent hover:border-current hover:shadow-sm transition-all group ${
                                  isDragging ? 'opacity-40 scale-95' : 'cursor-grab active:cursor-grabbing'
                                }`}
                              >
                                <div className="flex items-start gap-1">
                                  <GripVertical className="w-3 h-3 text-gray-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-[11px] font-semibold ${color.text} leading-tight`}>{asig.nombre}</p>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-[9px] text-gray-500 truncate">{asig.nucleoTematico}</span>
                                      <span className={`text-[9px] font-bold ${color.text} flex-shrink-0 ml-1`}>{asig.creditos} cr.</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="hidden group-hover:flex items-center gap-1 mt-1 pt-1 border-t border-gray-200/50">
                                  <button onClick={() => setEditingId(asig.id)} className="text-[9px] text-blue-600 hover:underline">Editar</button>
                                  <span className="text-gray-300">|</span>
                                  <button onClick={() => handleDelete(asig.id)} className="text-[9px] text-red-600 hover:underline">Eliminar</button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      ) : (
        /* ═══ TABLE VIEW ═══ */
        <>
          {/* Tabla Desktop: oculta en mobile */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                  <th className="px-3 py-2 text-left w-24">Código</th>
                  <th className="px-3 py-2 text-left">Asignatura</th>
                  <th className="px-3 py-2 text-center w-24">Semestre</th>
                  <th className="px-3 py-2 text-center w-14">Cred.</th>
                  <th className="px-3 py-2 text-center w-14">Horas</th>
                  <th className="px-3 py-2 text-center w-16">Hrs PTA</th>
                  <th className="px-3 py-2 text-left">Núcleo</th>
                  <th className="px-3 py-2 text-center w-20">Modalidad</th>
                  <th className="px-3 py-2 text-center w-16">Tipo</th>
                  <th className="px-3 py-2 text-center w-16">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {sorted.map((asig, idx) => {
                    const color = getNucleoColor(asig.nucleoTematico);
                    const isEditing = editingId === asig.id;
                    return (
                      <motion.tr
                        key={asig.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`border-t border-gray-100 transition-colors ${isEditing ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-3 py-1.5">
                          {isEditing ? (
                            <input
                              value={asig.codigo || ''}
                              onChange={e => handleUpdate(asig.id, 'codigo', e.target.value)}
                              className="w-full h-7 px-2 border border-[#003DA5] rounded text-[10px] outline-none bg-blue-50"
                            />
                          ) : (
                            <span className="font-semibold text-gray-700 text-[11px]">{asig.codigo || '-'}</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5">
                          {isEditing ? (
                            <input
                              value={asig.nombre}
                              onChange={e => handleUpdate(asig.id, 'nombre', e.target.value)}
                              className="w-full h-7 px-2 border border-[#003DA5] rounded text-xs outline-none bg-blue-50"
                              autoFocus
                            />
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color.dot}`} />
                              <span className="font-medium text-gray-900 text-xs">{asig.nombre}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {isEditing ? (
                            <select
                              value={asig.semestre}
                              onChange={e => handleUpdate(asig.id, 'semestre', Number(e.target.value))}
                              className="w-12 h-7 px-0.5 border border-[#003DA5] rounded text-[10px] outline-none bg-blue-50 text-center"
                            >
                              {Array.from({ length: totalSemestres }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{i + 1}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="font-medium text-gray-700 text-[11px] whitespace-nowrap">{SEMESTRES_LABELS[asig.semestre] || asig.semestre}</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {isEditing ? (
                            <input type="number" value={asig.creditos}
                              onChange={e => handleUpdate(asig.id, 'creditos', Number(e.target.value))}
                              min={0} max={10}
                              className="w-12 h-7 px-1 border border-[#003DA5] rounded text-[10px] outline-none bg-blue-50 text-center"
                            />
                          ) : (
                            <span className="font-bold text-gray-700 text-xs">{asig.creditos}</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {isEditing ? (
                            <input type="number" value={asig.horas}
                              onChange={e => handleUpdate(asig.id, 'horas', Number(e.target.value))}
                              min={0}
                              className="w-12 h-7 px-1 border border-[#003DA5] rounded text-[10px] outline-none bg-blue-50 text-center"
                            />
                          ) : (
                            <span className="text-[10px] font-semibold text-purple-700">{asig.horas}</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {isEditing ? (
                            <input type="number" value={asig.horasFijasPta || ''}
                              onChange={e => handleUpdate(asig.id, 'horasFijasPta', Number(e.target.value))}
                              min={0}
                              className="w-12 h-7 px-1 border border-[#003DA5] rounded text-[10px] outline-none bg-blue-50 text-center"
                            />
                          ) : (
                            <span className="text-[10px] font-bold text-orange-600">{asig.horasFijasPta || '-'}</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5">
                          {isEditing ? (
                            <input
                              value={asig.nucleoTematico || ''}
                              onChange={e => handleUpdate(asig.id, 'nucleoTematico', e.target.value)}
                              placeholder="Ej: Fundamentación Cuantitativa"
                              className="w-full h-7 px-2 border border-[#003DA5] rounded text-[10px] outline-none bg-blue-50"
                            />
                          ) : (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${color.bg} ${color.text} font-medium`}>{asig.nucleoTematico}</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {isEditing ? (
                            <select value={asig.modalidad} onChange={e => handleUpdate(asig.id, 'modalidad', e.target.value)}
                              className="w-full h-7 px-1 border border-[#003DA5] rounded text-[10px] outline-none bg-blue-50">
                              {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          ) : (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              asig.modalidad?.toLowerCase() === 'presencial' ? 'bg-green-100 text-green-700' :
                              asig.modalidad?.toLowerCase() === 'virtual' ? 'bg-blue-100 text-blue-700' :
                              asig.modalidad?.toLowerCase() === 'mixta' ? 'bg-amber-100 text-amber-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>{asig.modalidad ? asig.modalidad.charAt(0).toUpperCase() + asig.modalidad.slice(1) : ''}</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {isEditing ? (
                            <select value={asig.tipo || 'Teorica'} onChange={e => handleUpdate(asig.id, 'tipo', e.target.value)}
                              className="w-full h-7 px-1 border border-[#003DA5] rounded text-[10px] outline-none bg-blue-50">
                              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          ) : (
                            <span className="text-[10px] text-gray-500">{asig.tipo || 'Teorica'}</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            {isEditing ? (
                              <button onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-green-100 text-green-600" title="Listo">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button onClick={() => setEditingId(asig.id)} className="p-1 rounded hover:bg-blue-100 text-gray-400 hover:text-[#003DA5]" title="Editar">
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => handleDelete(asig.id)} className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600" title="Eliminar">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
            {sorted.length === 0 && asignaturas.length > 0 && (
              <div className="py-6 text-center">
                <Filter className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No hay asignaturas con los filtros actuales</p>
                <button onClick={() => { setFilterSemestre('all'); setFilterNucleo('all'); setSearchTerm(''); }}
                  className="mt-2 text-xs text-[#003DA5] hover:underline font-medium">Limpiar filtros</button>
              </div>
            )}
          </div>

          {/* ═══ TARJETAS MOBILE: solo visible en pantallas pequeñas ═══ */}
          <div className="sm:hidden divide-y divide-gray-100">
            <AnimatePresence>
              {sorted.map((asig, idx) => {
                const color = getNucleoColor(asig.nucleoTematico);
                const isEditing = editingId === asig.id;
                return (
                  <motion.div
                    key={asig.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, delay: idx * 0.03 }}
                    className={`p-4 transition-colors ${isEditing ? 'bg-blue-50/60' : 'hover:bg-gray-50'}`}
                  >
                    {/* Card Header */}
                    <div className="flex items-start gap-2.5">
                      <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${color.dot}`} />
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            value={asig.nombre}
                            onChange={e => handleUpdate(asig.id, 'nombre', e.target.value)}
                            className="w-full h-10 px-2 border border-[#003DA5] rounded-lg text-sm outline-none bg-blue-50 mb-2 font-medium"
                            autoFocus
                          />
                        ) : (
                          <p className="font-bold text-gray-900 text-sm leading-tight">{asig.nombre}</p>
                        )}
                        {asig.codigo && !isEditing && (
                          <p className="text-[10px] text-gray-400 mt-0.5">{asig.codigo}</p>
                        )}
                      </div>
                      {/* Acciones */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isEditing ? (
                          <button onClick={() => setEditingId(null)}
                            className="p-2 rounded-lg bg-green-100 text-green-700 active:scale-95 transition-all">
                            <Check className="w-4 h-4" />
                          </button>
                        ) : (
                          <button onClick={() => setEditingId(asig.id)}
                            className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-[#003DA5] active:scale-95 transition-all">
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(asig.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 active:scale-95 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Badges & Stats */}
                    <div className="mt-2.5 pl-4.5 flex flex-wrap items-center gap-2">
                      {/* Semestre */}
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-[#003DA5]/10 text-[#003DA5] font-bold">
                        Sem. {isEditing ? (
                          <select value={asig.semestre} onChange={e => handleUpdate(asig.id, 'semestre', Number(e.target.value))}
                            className="h-5 px-0.5 border-0 bg-transparent text-[#003DA5] font-bold outline-none">
                            {Array.from({ length: totalSemestres }, (_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                          </select>
                        ) : SEMESTRES_LABELS[asig.semestre] || asig.semestre}
                      </span>
                      {/* Créditos */}
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-600">
                        <GraduationCap className="w-3 h-3 text-gray-400" />
                        {isEditing ? (
                          <input type="number" value={asig.creditos} min={0} max={10}
                            onChange={e => handleUpdate(asig.id, 'creditos', Number(e.target.value))}
                            className="w-9 h-5 border border-gray-300 rounded text-center text-[11px] outline-none" />
                        ) : <strong>{asig.creditos}</strong>} cr.
                      </span>
                      {/* Horas */}
                      <span className="inline-flex items-center gap-1 text-[11px] text-purple-700">
                        <Clock className="w-3 h-3" />
                        {isEditing ? (
                          <input type="number" value={asig.horas} min={0}
                            onChange={e => handleUpdate(asig.id, 'horas', Number(e.target.value))}
                            className="w-12 h-5 border border-gray-300 rounded text-center text-[11px] outline-none" />
                        ) : <strong>{asig.horas}</strong>} h.
                      </span>
                      {/* Núcleo */}
                      {isEditing ? (
                        <input
                          value={asig.nucleoTematico || ''}
                          onChange={e => handleUpdate(asig.id, 'nucleoTematico', e.target.value)}
                          placeholder="Núcleo"
                          className={`h-6 px-1.5 rounded-full text-[10px] border border-gray-300 outline-none font-medium ${color.bg} ${color.text} bg-white`}
                        />
                      ) : (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${color.bg} ${color.text}`}>{asig.nucleoTematico}</span>
                      )}
                      {/* Modalidad */}
                      {isEditing ? (
                        <select value={asig.modalidad} onChange={e => handleUpdate(asig.id, 'modalidad', e.target.value)}
                          className="h-6 px-1.5 rounded-full text-[10px] border border-gray-200 outline-none bg-white">
                          {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      ) : (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          asig.modalidad === 'Presencial' ? 'bg-green-100 text-green-700' :
                          asig.modalidad === 'Virtual' ? 'bg-blue-100 text-blue-700' :
                          asig.modalidad === 'Mixta' ? 'bg-amber-100 text-amber-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>{asig.modalidad}</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {sorted.length === 0 && asignaturas.length > 0 && (
              <div className="py-8 text-center">
                <Filter className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No hay asignaturas con estos filtros</p>
                <button onClick={() => { setFilterSemestre('all'); setFilterNucleo('all'); setSearchTerm(''); }}
                  className="mt-2 text-xs text-[#003DA5] hover:underline font-medium">Limpiar filtros</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Footer summary */}
      {asignaturas.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
              <span className="text-gray-500">
                <strong className="text-gray-700">{sorted.length}</strong>
                {sorted.length !== asignaturas.length ? ` de ${asignaturas.length}` : ''} asig.
              </span>
              <span className="hidden sm:inline text-gray-400">·</span>
              <span className={`font-bold ${totalCreditosPlan > totalCreditos ? 'text-red-600' : totalCreditosPlan === totalCreditos ? 'text-emerald-600' : 'text-amber-600'}`}>
                {totalCreditosPlan}/{totalCreditos} cr.
              </span>
              <span className="hidden sm:inline text-gray-400">·</span>
              <span className="text-purple-700 font-bold">{totalHorasPlan.toLocaleString()} h.</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <RefreshCw className="w-3 h-3" />
              <span className="hidden sm:inline">Sincronizado con PTA</span>
              <span className="sm:hidden">PTA</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
