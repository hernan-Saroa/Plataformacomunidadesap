/**
 * VA01 — Programación Académica Institucional
 * 
 * Permite a Coordinadores y Directores:
 * - Buscar docentes disponibles
 * - Asignar asignaturas (docencia) desde catálogo
 * - Pre-cargar investigación y extensión
 * - Generar PTA pre-cargado con estado PROPUESTO_POR_DIRECCION
 * - Notificar masivamente a docentes
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Search, UserPlus, BookOpen, FlaskConical, Globe, Plus, Trash2,
  Send, Save, ChevronDown, ChevronRight, Users, CheckCircle2,
  AlertTriangle, ArrowRight, X, Calculator, Bell
} from 'lucide-react';
import {
  getCatalogoProgramas, getCatalogoAsignaturas, getCatalogoTerritoriales,
  getCatalogoRolesInvestigacion, getDocentesDisponibles,
  crearPTAPreCarga, notificarDocentePTA, getPTAsConcertacion,
} from '../../services/api/ptaApi';
import { toast } from 'sonner';

const ESTADO_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'PROPUESTO_POR_DIRECCION': { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' },
  'NOTIFICADO_DOCENTE': { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  'EN_CONCERTACION': { bg: '#F3E8FF', text: '#6B21A8', border: '#DDD6FE' },
  'CONCERTADO': { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
  'ESCALADO_SNA': { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
};

export function ProgramacionAcademica() {
  const [programas, setProgramas] = useState<any[]>([]);
  const [asignaturasCat, setAsignaturasCat] = useState<any[]>([]);
  const [territoriales, setTerritoriales] = useState<any[]>([]);
  const [rolesInv, setRolesInv] = useState<any[]>([]);
  const [docentesDisp, setDocentesDisp] = useState<any[]>([]);
  const [ptasConcertacion, setPtasConcertacion] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<'lista' | 'asignacion'>('lista');
  const [selectedDocente, setSelectedDocente] = useState<any | null>(null);
  const [busqueda, setBusqueda] = useState('');

  // Assignment form state
  const [asignaturas, setAsignaturas] = useState<any[]>([]);
  const [invProyecto, setInvProyecto] = useState({ nombre: '', rol: '', horas_solicitadas: 0, codigo: '' });
  const [extActividades, setExtActividades] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [progFilter, setProgFilter] = useState('');
  const [asigSearch, setAsigSearch] = useState('');

  // Load catalogs
  useEffect(() => {
    setLoading(true);
    Promise.all([
      getCatalogoProgramas(),
      getCatalogoAsignaturas(),
      getCatalogoTerritoriales(),
      getCatalogoRolesInvestigacion(),
      getDocentesDisponibles('2025-2'),
      getPTAsConcertacion(),
    ]).then(([progs, asigs, terrs, roles, docs, conc]) => {
      if (progs.success) setProgramas(progs.data);
      if (asigs.success) setAsignaturasCat(asigs.data);
      if (terrs.success) setTerritoriales(terrs.data);
      if (roles.success) setRolesInv(roles.data);
      if (docs.success) setDocentesDisp(docs.data);
      if (conc.success) setPtasConcertacion(conc.data);
      setLoading(false);
    });
  }, []);

  const filteredDocentes = useMemo(() => {
    if (!busqueda.trim()) return docentesDisp;
    const q = busqueda.toLowerCase();
    return docentesDisp.filter(d =>
      d.nombre?.toLowerCase().includes(q) || d.cedula?.includes(q)
    );
  }, [docentesDisp, busqueda]);

  // Calculate totals
  const totalDoc = asignaturas.reduce((t, a) => t + (a.total_horas || 0), 0);
  const totalInv = invProyecto.horas_solicitadas || 0;
  const totalExt = extActividades.reduce((t, e) => t + (e.horas || 0), 0);
  const horasProgramables = selectedDocente?.dedicacion === 'Medio Tiempo' ? 400 : 800;
  const totalPrecargado = totalDoc + totalInv + totalExt;
  const pendienteDocente = horasProgramables - totalPrecargado;

  // Handlers
  const handleSelectDocente = (docente: any) => {
    setSelectedDocente(docente);
    setAsignaturas([]);
    setInvProyecto({ nombre: '', rol: '', horas_solicitadas: 0, codigo: '' });
    setExtActividades([]);
    setView('asignacion');
  };

  const handleAddAsignatura = (asigCat: any) => {
    if (asignaturas.length >= 10) { toast.error('Máximo 10 asignaturas'); return; }
    if (asignaturas.some(a => a.asignatura_id === asigCat.id)) { toast.error('Asignatura ya asignada'); return; }
    const prog = programas.find(p => p.id === asigCat.programa_id);
    const tipo = prog?.tipo || 'APT';
    // Excel K15 formula
    let hBase = asigCat.creditos * 16;
    if (asigCat.nombre?.includes('Seminario De Énfasis')) hBase = 128;
    else if (tipo === 'AP') hBase = 64;
    else if (tipo === 'Maestría') hBase = asigCat.creditos * 12;
    // Excel L15 formula
    let hTotal = hBase * 3;
    if (asigCat.nombre === 'Opciones De Grado AP') hTotal = 20;
    if (asigCat.nombre === 'Seminario De Opciones De Grado APT') hTotal = 144;

    setAsignaturas(prev => [...prev, {
      id: Date.now(), asignatura_id: asigCat.id, asignatura_nombre: asigCat.nombre,
      nombre: asigCat.nombre, programa_id: asigCat.programa_id,
      nucleo_tematico: asigCat.nucleo, creditos: asigCat.creditos, semestre: asigCat.semestre,
      horas_base: hBase, total_horas: hTotal,
      programa_nombre: prog?.nombre || '',
    }]);
  };

  const handleSavePreCarga = async (notificar = false) => {
    if (!selectedDocente) return;
    if (asignaturas.length === 0) { toast.error('Debe asignar al menos una asignatura'); return; }
    setSaving(true);

    const payload = {
      docente_id: selectedDocente.id,
      docente_nombre: selectedDocente.nombre,
      dedicacion: selectedDocente.dedicacion || 'Tiempo Completo',
      territorial_id: selectedDocente.territorial_id,
      periodo: '2025-2',
      asignaturas,
      investigacion_proyecto: invProyecto.nombre ? invProyecto : undefined,
      extension_actividades: extActividades,
      creado_por: 'Director Territorial',
      creado_por_id: 'admin-backoffice',
    };

    const res = await crearPTAPreCarga(payload);

    if (res.success) {
      if (notificar && res.data?.id) {
        await notificarDocentePTA(res.data.id, {
          mensaje: `Se le ha asignado carga académica para el periodo 2026-1. Revise la propuesta institucional.`,
          notificado_por: 'Director Territorial',
        });
        toast.success('PTA creado y docente notificado');
      } else {
        toast.success('PTA pre-cargado guardado');
      }
      setView('lista');
      // Refresh lists
      const [docs, conc] = await Promise.all([getDocentesDisponibles('2025-2'), getPTAsConcertacion()]);
      if (docs.success) setDocentesDisp(docs.data);
      if (conc.success) setPtasConcertacion(conc.data);
    } else {
      toast.error('Error al crear PTA pre-cargado');
    }
    setSaving(false);
  };

  const asigsFiltradas = useMemo(() => {
    if (view !== 'asignacion') return [];
    let items = asignaturasCat;
    if (progFilter) items = items.filter(a => a.programa_id === progFilter);
    if (asigSearch) {
      const q = asigSearch.toLowerCase();
      items = items.filter(a => a.nombre.toLowerCase().includes(q));
    }
    const asignados = new Set(asignaturas.map(a => a.asignatura_id));
    return items.filter(a => !asignados.has(a.id));
  }, [asignaturasCat, progFilter, asigSearch, asignaturas, view]);

  // ─── ASIGNACIÓN VIEW ─────────────────────────────────────────────
  if (view === 'asignacion' && selectedDocente) {
    return (
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-5">
          <div>
            <button onClick={() => setView('lista')} className="flex items-center gap-1 text-sm text-gray-500 font-medium mb-1 bg-transparent border-none cursor-pointer p-0 hover:text-gray-700">
              ← Volver a lista
            </button>
            <h2 className="text-xl font-extrabold text-gray-900 m-0">Asignación de Carga Docente</h2>
            <p className="text-sm text-gray-500 mt-0.5">Periodo 2026-1</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={() => handleSavePreCarga(false)} disabled={saving}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 cursor-pointer">
              <Save className="w-4 h-4" /> Guardar Borrador
            </button>
            <button onClick={() => handleSavePreCarga(true)} disabled={saving || asignaturas.length === 0}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border-none text-white text-sm font-semibold shadow-md disabled:opacity-50 cursor-pointer"
              style={{ background: '#003DA5' }}>
              <Bell className="w-4 h-4" /> Generar PTA y Notificar
            </button>
          </div>
        </div>

        {/* Docente info bar */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 flex flex-wrap items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#003DA5] text-white flex items-center justify-center font-bold text-sm">
            {selectedDocente.nombre?.charAt(0) || 'D'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-900 text-sm">{selectedDocente.nombre}</div>
            <div className="text-xs text-gray-500">CC {selectedDocente.cedula} • {selectedDocente.dedicacion} • {horasProgramables}h programables</div>
          </div>
          <div className="flex gap-3 text-xs">
            <div className="text-center">
              <div className="font-bold text-[#003DA5] text-lg">{totalPrecargado}h</div>
              <div className="text-gray-500">Pre-cargado</div>
            </div>
            <div className="text-center">
              <div className={`font-bold text-lg ${pendienteDocente < 0 ? 'text-red-600' : 'text-amber-600'}`}>{pendienteDocente}h</div>
              <div className="text-gray-500">Pend. Docente</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
          <div className="space-y-4">
            {/* DOCENCIA */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[#003DA5]" /> Asignar Docencia
                  </h3>
                  <p className="text-xs text-gray-500">{totalDoc}h asignadas en {asignaturas.length} asignaturas</p>
                </div>
              </div>

              {/* Search and filter */}
              <div className="p-3 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row gap-2">
                <select value={progFilter} onChange={e => setProgFilter(e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-gray-300 text-xs bg-white sm:w-48">
                  <option value="">Todos los programas</option>
                  {programas.map(p => <option key={p.id} value={p.id}>{p.codigo}</option>)}
                </select>
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input type="text" value={asigSearch} onChange={e => setAsigSearch(e.target.value)}
                    placeholder="Buscar asignatura..." className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 text-xs outline-none" />
                </div>
              </div>

              {/* Available subjects */}
              <div className="max-h-48 overflow-y-auto border-b border-gray-100">
                {asigsFiltradas.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-6">No hay asignaturas disponibles</p>
                ) : asigsFiltradas.slice(0, 20).map(asig => (
                  <button key={asig.id} onClick={() => handleAddAsignatura(asig)}
                    className="w-full flex justify-between items-center px-4 py-2.5 border-b border-gray-50 hover:bg-blue-50 cursor-pointer bg-white text-left transition-colors">
                    <div>
                      <div className="text-xs font-semibold text-gray-900">{asig.nombre}</div>
                      <div className="text-[0.65rem] text-gray-500">{asig.nucleo} • {asig.creditos} créd • Sem {asig.semestre}</div>
                    </div>
                    <Plus className="w-4 h-4 text-[#003DA5] shrink-0" />
                  </button>
                ))}
              </div>

              {/* Assigned subjects */}
              <div className="p-3">
                {asignaturas.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-4">Seleccione asignaturas del catálogo arriba</p>
                ) : (
                  <div className="space-y-1.5">
                    <div className="text-[0.65rem] font-bold text-gray-500 uppercase tracking-wider mb-1">Asignaturas Asignadas</div>
                    {asignaturas.map(a => (
                      <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-blue-50 border border-blue-100">
                        <div>
                          <div className="text-xs font-semibold text-gray-900">{a.asignatura_nombre}</div>
                          <div className="text-[0.65rem] text-gray-500">{a.programa_nombre} • {a.creditos} créd • {a.total_horas}h</div>
                        </div>
                        <button onClick={() => setAsignaturas(prev => prev.filter(x => x.id !== a.id))}
                          className="w-6 h-6 rounded border border-gray-200 bg-white text-gray-400 hover:text-red-500 flex items-center justify-center cursor-pointer">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* INVESTIGACIÓN */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-purple-600" /> Pre-cargar Investigación (opcional)
                </h3>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.68rem] font-semibold text-gray-500 mb-0.5">Proyecto SNI</label>
                  <input type="text" value={invProyecto.nombre} onChange={e => setInvProyecto(p => ({ ...p, nombre: e.target.value }))}
                    placeholder="Nombre del proyecto..." className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs outline-none" />
                </div>
                <div>
                  <label className="block text-[0.68rem] font-semibold text-gray-500 mb-0.5">Rol</label>
                  <select value={invProyecto.rol} onChange={e => {
                    const rol = rolesInv.find(r => r.nombre === e.target.value);
                    setInvProyecto(p => ({ ...p, rol: e.target.value, horas_solicitadas: rol?.horas_max || 0 }));
                  }} className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs bg-white">
                    <option value="">Seleccionar rol...</option>
                    {rolesInv.map(r => <option key={r.id} value={r.nombre}>{r.nombre} (máx {r.horas_max}h)</option>)}
                  </select>
                </div>
                {invProyecto.rol && (
                  <div>
                    <label className="block text-[0.68rem] font-semibold text-gray-500 mb-0.5">Horas</label>
                    <input type="number" value={invProyecto.horas_solicitadas} onChange={e => setInvProyecto(p => ({ ...p, horas_solicitadas: Number(e.target.value) }))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs outline-none" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Summary */}
          <div className="xl:sticky xl:top-20">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-[#003DA5]" /> Resumen Pre-carga
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <SummaryRow label="Docencia" value={totalDoc} max={horasProgramables} color="#003DA5" />
                <SummaryRow label="Investigación" value={totalInv} max={horasProgramables * 0.5} color="#7C3AED" />
                <SummaryRow label="Extensión" value={totalExt} max={horasProgramables * 0.25} color="#059669" />
                <div className="border-t border-gray-200 pt-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span>Total Pre-cargado</span>
                    <span className="text-[#003DA5]">{totalPrecargado}h</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Pendiente para docente</span>
                    <span className="font-semibold text-amber-600">{pendienteDocente}h ({((pendienteDocente / horasProgramables) * 100).toFixed(0)}%)</span>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  El docente deberá completar las {pendienteDocente}h restantes con Actividades Complementarias.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── LISTA VIEW ───────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 m-0">Programación Académica Institucional</h2>
          <p className="text-sm text-gray-500 mt-0.5">VA01 — Pre-carga y asignación de carga docente • Periodo 2026-1</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard icon={Users} label="Docentes sin PTA" value={docentesDisp.length} color="#003DA5" />
        <StatCard icon={BookOpen} label="PTAs Pre-cargados" value={ptasConcertacion.filter(p => p.estado === 'PROPUESTO_POR_DIRECCION').length} color="#7C3AED" />
        <StatCard icon={Bell} label="Notificados" value={ptasConcertacion.filter(p => p.estado === 'NOTIFICADO_DOCENTE').length} color="#D97706" />
        <StatCard icon={CheckCircle2} label="En Concertación" value={ptasConcertacion.filter(p => p.estado === 'EN_CONCERTACION').length} color="#059669" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-4">
        <TabBtn active={view === 'lista'} label={`Docentes Disponibles (${docentesDisp.length})`} onClick={() => setView('lista')} />
      </div>

      {/* PTAs en proceso bidireccional */}
      {ptasConcertacion.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-4">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">PTAs en Flujo Bidireccional ({ptasConcertacion.length})</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {ptasConcertacion.map(pta => {
              const sc = ESTADO_COLORS[pta.estado] || { bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' };
              return (
                <div key={pta.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{pta.docente_nombre}</div>
                    <div className="text-xs text-gray-500">{pta.dedicacion} • {pta.total_horas_programadas || 0}h programadas</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[0.65rem] font-bold" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                    {pta.estado?.replace(/_/g, ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Docentes list */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">Docentes sin PTA Asignado</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar docente..." className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 text-xs outline-none" />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-400 text-sm">Cargando...</div>
        ) : filteredDocentes.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No hay docentes disponibles</p>
            <p className="text-xs mt-1">Todos los docentes ya tienen PTA asignado para este periodo.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredDocentes.map(doc => (
              <button key={doc.id} onClick={() => handleSelectDocente(doc)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 cursor-pointer bg-white text-left transition-colors border-none">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                    {doc.nombre?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{doc.nombre}</div>
                    <div className="text-xs text-gray-500">CC {doc.cedula} • {doc.dedicacion || 'TC'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#003DA5] font-semibold">Asignar carga</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper components
function SummaryRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-gray-600">{label}</span>
        <span className="font-bold" style={{ color }}>{value}h <span className="text-gray-400 font-normal">/ {max}h</span></span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-extrabold" style={{ color }}>{value}</div>
    </div>
  );
}

function TabBtn({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors border-none cursor-pointer flex-1 ${active ? 'bg-[#003DA5] text-white' : 'text-gray-500 hover:bg-gray-50 bg-transparent'}`}>
      {label}
    </button>
  );
}
