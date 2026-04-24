/**
 * IntegracionRUND_PTA — Panel de integracion RUND (Carpeta Digital) ↔ PTA
 *
 * Circular 003/2025, Obs. #5 (§13.5):
 *   "Comunicacion con procesos de seleccion y RUND"
 *
 * Este componente permite:
 *  1. Ver resumen nacional: cuantos docentes TC/MT tienen carpeta, cuantos tienen PTA
 *  2. Buscar un docente y ver su perfil RUND + estado PTA unificado
 *  3. Detectar gaps: docentes sin carpeta digital o sin PTA
 *  4. Navegar directamente a la carpeta digital del docente
 *
 * @version 1.0.0
 * @date 2026-03-14
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderOpen, Users, Search, RefreshCw, AlertTriangle, CheckCircle2,
  XCircle, Clock, FileText, User, Calendar, Hash, Building2,
  TrendingUp, Shield, ArrowRight, ExternalLink, Briefcase,
  ChevronDown, ChevronRight, Eye, Zap, BarChart3, MapPin,
  BookOpen, Microscope, GraduationCap, AlertCircle, Info,
} from 'lucide-react';
import { getRUNDDocente, getRUNDResumen } from '../../services/api/ptaApi';
import { toast } from 'sonner';

interface ResumenRUND {
  periodo: string;
  total_docentes: number;
  docentes_tc_mt: number;
  con_carpeta_digital: number;
  sin_carpeta_digital: number;
  con_pta_periodo: number;
  sin_pta_periodo: number;
  cobertura_pta: number;
  cobertura_rund: number;
  gaps: {
    docentes_sin_carpeta: { id: string; nombre: string; territorial: string }[];
    docentes_sin_pta: { id: string; nombre: string; territorial: string; tiene_carpeta: boolean }[];
  };
}

interface DocenteRUND {
  persona: {
    id: string; nombre: string; email: string; cedula: string;
    cargo: string; dependencia: string; sede_territorial: string;
    dedicacion: string; tipo_vinculacion: string; categoria_escalafon: string;
    estado: string;
  };
  carpeta_digital: {
    id: string; total_documentos: number; documentos_validados: number;
    documentos_pendientes: number; documentos_rechazados: number;
    completitud: number; ultima_actualizacion: string;
  } | null;
  pta_actual: {
    id: string; estado: string; periodo: string; horas_programadas: number;
    horas_disponibles: number; porcentaje: number; num_asignaturas: number;
  } | null;
  historial_ptas: { id: string; periodo: string; estado: string; horas: number }[];
  validaciones_rund: {
    tiene_carpeta: boolean; tiene_identificacion: boolean;
    tiene_contrato_vinculacion: boolean; es_tc_o_mt: boolean;
    completitud_documental: number; puede_crear_pta: boolean;
    alertas: string[];
  };
}

type TabView = 'resumen' | 'buscar' | 'gaps';

export default function IntegracionRUND_PTA() {
  const [activeTab, setActiveTab] = useState<TabView>('resumen');
  const [resumen, setResumen] = useState<ResumenRUND | null>(null);
  const [docente, setDocente] = useState<DocenteRUND | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDocente, setLoadingDocente] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [docenteIdBuscar, setDocenteIdBuscar] = useState('');
  const [expandedGap, setExpandedGap] = useState<string | null>(null);

  const cargarResumen = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getRUNDResumen('2026-1');
      if (result.success) setResumen(result.data);
    } catch (e) {
      console.error('Error loading RUND resumen:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarResumen(); }, [cargarResumen]);

  const buscarDocente = async (id: string) => {
    if (!id) return;
    setLoadingDocente(true);
    setDocente(null);
    try {
      const result = await getRUNDDocente(id, '2026-1');
      if (result.success) {
        setDocente(result.data);
        setActiveTab('buscar');
      } else {
        toast.error(result.error || 'Docente no encontrado');
      }
    } catch (e) {
      console.error('Error searching docente:', e);
      toast.error('Error de conexion al buscar docente');
    } finally {
      setLoadingDocente(false);
    }
  };

  const TABS: { key: TabView; label: string; icon: any }[] = [
    { key: 'resumen', label: 'Resumen Nacional', icon: BarChart3 },
    { key: 'buscar', label: 'Consultar Docente', icon: Search },
    { key: 'gaps', label: 'Brechas y Gaps', icon: AlertTriangle },
  ];

  return (
    <div className="p-6 font-['Inter',-apple-system,sans-serif]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-[#003DA5]" />
            Integracion RUND ↔ PTA
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Circular 003/2025, Obs. #5 — Comunicacion con Carpeta Digital y procesos de seleccion
          </p>
        </div>
        <button
          onClick={cargarResumen}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b-2 border-gray-100">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all -mb-[2px] ${
                isActive
                  ? 'border-[#003DA5] text-[#003DA5]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ═══ TAB: Resumen Nacional ═══ */}
      {activeTab === 'resumen' && (
        <div>
          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
              <p className="text-sm">Cargando resumen RUND...</p>
            </div>
          ) : resumen ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Docentes TC/MT', value: resumen.docentes_tc_mt, sub: `de ${resumen.total_docentes} totales`, color: '#003DA5', bg: '#EFF6FF', icon: Users },
                  { label: 'Con Carpeta Digital', value: resumen.con_carpeta_digital, sub: `${resumen.cobertura_rund}% cobertura`, color: '#059669', bg: '#ECFDF5', icon: FolderOpen },
                  { label: 'Con PTA 2026-1', value: resumen.con_pta_periodo, sub: `${resumen.cobertura_pta}% cobertura`, color: '#7C3AED', bg: '#F5F3FF', icon: FileText },
                  { label: 'Sin PTA / Sin Carpeta', value: resumen.sin_pta_periodo + resumen.sin_carpeta_digital, sub: 'requieren atencion', color: '#DC2626', bg: '#FEF2F2', icon: AlertTriangle },
                ].map((kpi, i) => {
                  const Icon = kpi.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="rounded-xl p-4 border"
                      style={{ background: kpi.bg, borderColor: `${kpi.color}20` }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: kpi.color }}>{kpi.label}</span>
                      </div>
                      <div className="text-2xl font-extrabold" style={{ color: kpi.color }}>{kpi.value}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: `${kpi.color}99` }}>{kpi.sub}</div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Coverage bars */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <CoverageBar label="Cobertura Carpeta Digital (RUND)" value={resumen.cobertura_rund} color="#059669" />
                <CoverageBar label="Cobertura PTA Periodo 2026-1" value={resumen.cobertura_pta} color="#7C3AED" />
              </div>

              {/* Info box */}
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold text-blue-900">Integracion bidireccional activa</div>
                  <div className="text-xs text-blue-700 mt-1 leading-relaxed">
                    El modulo PTA consulta la Carpeta Digital para validar elegibilidad del docente (TC/MT), verificar documentos
                    de vinculacion, y enriquecer el perfil con datos del RUND. A su vez, la Carpeta Digital muestra el estado
                    del PTA activo de cada docente. Endpoints: <code className="bg-blue-100 px-1 rounded text-[10px]">/pta/rund/docente/:id</code> y <code className="bg-blue-100 px-1 rounded text-[10px]">/pta/rund/resumen</code>.
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <EmptyState message="No se pudo cargar el resumen RUND" />
          )}
        </div>
      )}

      {/* ═══ TAB: Consultar Docente ═══ */}
      {activeTab === 'buscar' && (
        <div>
          {/* Search bar */}
          <div className="flex gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={docenteIdBuscar}
                onChange={e => setDocenteIdBuscar(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscarDocente(docenteIdBuscar)}
                placeholder="ID del docente (ej: persona:abc123...) o doc-1234567890"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5]/20"
              />
            </div>
            <button
              onClick={() => buscarDocente(docenteIdBuscar)}
              disabled={loadingDocente || !docenteIdBuscar}
              className="px-5 py-2.5 rounded-lg bg-[#003DA5] text-white text-sm font-bold hover:bg-[#002d7a] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loadingDocente ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Consultar
            </button>
          </div>

          {/* Docente result */}
          {docente ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {/* Persona header */}
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mb-4">
                <div className="p-5 flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-[#003DA5]/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-7 h-7 text-[#003DA5]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-extrabold text-gray-900">{docente.persona.nombre}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> CC {docente.persona.cedula}</span>
                      <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {docente.persona.dedicacion}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {docente.persona.sede_territorial}</span>
                      {docente.persona.tipo_vinculacion && (
                        <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {docente.persona.tipo_vinculacion}</span>
                      )}
                      {docente.persona.categoria_escalafon && (
                        <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" /> {docente.persona.categoria_escalafon}</span>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                    docente.persona.estado === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {docente.persona.estado}
                  </span>
                </div>
              </div>

              {/* Two-column: Carpeta Digital + PTA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Carpeta Digital */}
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <FolderOpen className="w-4 h-4 text-[#003DA5]" />
                    <h4 className="text-sm font-bold text-gray-900">Carpeta Digital (RUND)</h4>
                  </div>
                  {docente.carpeta_digital ? (
                    <div>
                      <div className="mb-3">
                        <CoverageBar label="Completitud documental" value={docente.carpeta_digital.completitud} color="#003DA5" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <MiniStat label="Validados" value={docente.carpeta_digital.documentos_validados} color="#059669" />
                        <MiniStat label="Pendientes" value={docente.carpeta_digital.documentos_pendientes} color="#D97706" />
                        <MiniStat label="Rechazados" value={docente.carpeta_digital.documentos_rechazados} color="#DC2626" />
                        <MiniStat label="Total" value={docente.carpeta_digital.total_documentos} color="#6B7280" />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-xs font-semibold">Sin Carpeta Digital</p>
                      <p className="text-[10px] mt-1">Debe sincronizar desde el modulo Personas</p>
                    </div>
                  )}
                </div>

                {/* PTA */}
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-[#7C3AED]" />
                    <h4 className="text-sm font-bold text-gray-900">PTA Periodo Actual</h4>
                  </div>
                  {docente.pta_actual ? (
                    <div>
                      <div className="mb-3">
                        <CoverageBar label="Carga programada" value={docente.pta_actual.porcentaje} color="#7C3AED" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <MiniStat label="Horas prog." value={docente.pta_actual.horas_programadas} color="#7C3AED" />
                        <MiniStat label="Disponibles" value={docente.pta_actual.horas_disponibles} color="#6B7280" />
                        <MiniStat label="Asignaturas" value={docente.pta_actual.num_asignaturas} color="#0891B2" />
                        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-gray-50">
                          <span className="text-[10px] font-bold text-gray-500">Estado:</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            docente.pta_actual.estado === 'Aprobado' ? 'bg-green-100 text-green-700' :
                            docente.pta_actual.estado.includes('Pendiente') ? 'bg-amber-100 text-amber-700' :
                            docente.pta_actual.estado === 'Rechazado' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {docente.pta_actual.estado}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400">
                      <FileText className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-xs font-semibold">Sin PTA en periodo actual</p>
                      <p className="text-[10px] mt-1">
                        {docente.validaciones_rund.puede_crear_pta
                          ? 'Puede crear un PTA desde el portal'
                          : 'No elegible para PTA (no es TC/MT)'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Validaciones RUND */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
                <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#003DA5]" />
                  Validaciones RUND para PTA
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Carpeta Digital', ok: docente.validaciones_rund.tiene_carpeta },
                    { label: 'Identificacion validada', ok: docente.validaciones_rund.tiene_identificacion },
                    { label: 'Contrato/Vinculacion', ok: docente.validaciones_rund.tiene_contrato_vinculacion },
                    { label: 'TC o MT (elegible PTA)', ok: docente.validaciones_rund.es_tc_o_mt },
                  ].map((v, i) => (
                    <div key={i} className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                      v.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}>
                      {v.ok
                        ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                        : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      }
                      <span className={`text-[11px] font-semibold ${v.ok ? 'text-green-800' : 'text-red-700'}`}>
                        {v.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Alertas */}
                {docente.validaciones_rund.alertas.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {docente.validaciones_rund.alertas.map((alerta, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        {alerta}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Historial PTAs */}
              {docente.historial_ptas.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    Historial de PTAs
                  </h4>
                  <div className="space-y-2">
                    {docente.historial_ptas.map((h, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-gray-700">{h.periodo}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            h.estado === 'Aprobado' ? 'bg-green-100 text-green-700' :
                            h.estado === 'Rechazado' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>{h.estado}</span>
                        </div>
                        <span className="text-xs text-gray-500">{h.horas}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : !loadingDocente ? (
            <EmptyState message="Ingrese el ID de un docente para consultar su perfil RUND + PTA unificado" />
          ) : (
            <div className="text-center py-12 text-gray-400">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
              <p className="text-sm">Consultando RUND...</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: Gaps ═══ */}
      {activeTab === 'gaps' && (
        <div>
          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
              <p className="text-sm">Cargando brechas...</p>
            </div>
          ) : resumen ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Gap cards */}
              <div className="space-y-4">
                {/* Sin Carpeta Digital */}
                <GapSection
                  title="Docentes TC/MT sin Carpeta Digital"
                  count={resumen.sin_carpeta_digital}
                  color="#DC2626"
                  icon={FolderOpen}
                  description="Estos docentes no tienen Carpeta Digital creada. Deben sincronizarse desde el modulo Personas antes de poder crear un PTA."
                  items={resumen.gaps.docentes_sin_carpeta}
                  expanded={expandedGap === 'sin_carpeta'}
                  onToggle={() => setExpandedGap(expandedGap === 'sin_carpeta' ? null : 'sin_carpeta')}
                  onClickDocente={(id) => { setDocenteIdBuscar(id); buscarDocente(id); }}
                />

                {/* Sin PTA */}
                <GapSection
                  title="Docentes TC/MT sin PTA en 2026-1"
                  count={resumen.sin_pta_periodo}
                  color="#D97706"
                  icon={FileText}
                  description="Estos docentes son elegibles para PTA pero no tienen uno creado para el periodo actual."
                  items={resumen.gaps.docentes_sin_pta.map(d => ({
                    ...d,
                    extra: d.tiene_carpeta ? 'Con carpeta' : 'Sin carpeta',
                    extraColor: d.tiene_carpeta ? '#059669' : '#DC2626',
                  }))}
                  expanded={expandedGap === 'sin_pta'}
                  onToggle={() => setExpandedGap(expandedGap === 'sin_pta' ? null : 'sin_pta')}
                  onClickDocente={(id) => { setDocenteIdBuscar(id); buscarDocente(id); }}
                />
              </div>

              {resumen.sin_carpeta_digital === 0 && resumen.sin_pta_periodo === 0 && (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-500" />
                  <p className="text-sm font-bold text-green-700">Sin brechas detectadas</p>
                  <p className="text-xs text-green-600 mt-1">Todos los docentes TC/MT tienen Carpeta Digital y PTA activo.</p>
                </div>
              )}
            </motion.div>
          ) : (
            <EmptyState message="No se pudo cargar la informacion de brechas" />
          )}
        </div>
      )}

      {/* Footer normativo */}
      <div className="mt-6 rounded-xl bg-gray-50 border border-gray-200 p-4 text-[11px] text-gray-500 leading-relaxed">
        <strong className="text-gray-700">Referencia normativa:</strong>{' '}
        Circular Dispositiva No. 003/2025, Observacion #5 (§13.5): "Comunicacion con procesos de seleccion y RUND".
        La Carpeta Digital funciona como RUND interno del Backoffice ESAP, centralizando documentos de identidad,
        titulos academicos, actos de vinculacion y demas soportes requeridos. El PTA consulta estos datos para
        validar elegibilidad (TC/MT unicamente) y enriquecer el perfil del docente.
      </div>
    </div>
  );
}

// ═══ Sub-components ═══════════════════════════════════════════════════

function CoverageBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-700">{label}</span>
        <span className="text-sm font-extrabold" style={{ color }}>{value}%</span>
      </div>
      <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(value, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
      <span className="text-[10px] font-bold text-gray-500">{label}</span>
      <span className="text-sm font-extrabold" style={{ color }}>{value}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-14 rounded-2xl border-2 border-dashed border-gray-200">
      <FolderOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
      <p className="text-sm text-gray-400 font-medium max-w-md mx-auto">{message}</p>
    </div>
  );
}

function GapSection({ title, count, color, icon: Icon, description, items, expanded, onToggle, onClickDocente }: {
  title: string; count: number; color: string; icon: any; description: string;
  items: any[]; expanded: boolean; onToggle: () => void; onClickDocente: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${color}30` }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}10` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-gray-900">{title}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">{description}</div>
        </div>
        <span className="text-xl font-extrabold mr-2" style={{ color }}>{count}</span>
        {expanded
          ? <ChevronDown className="w-4 h-4 text-gray-400" />
          : <ChevronRight className="w-4 h-4 text-gray-400" />
        }
      </button>

      <AnimatePresence>
        {expanded && items.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 p-3 space-y-1.5 max-h-64 overflow-y-auto">
              {items.map((item: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group"
                  onClick={() => onClickDocente(item.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-xs font-semibold text-gray-700 truncate">{item.nombre || item.id}</span>
                    {item.territorial && (
                      <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" /> {item.territorial}
                      </span>
                    )}
                    {item.extra && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: item.extraColor, background: `${item.extraColor}15` }}>
                        {item.extra}
                      </span>
                    )}
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#003DA5] transition-colors" />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
