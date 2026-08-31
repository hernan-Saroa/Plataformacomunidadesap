/**
 * Macro Docente — REQ-RUND-F020 / F022
 *
 * Historial nacional consolidado de asignaturas dictadas por docente
 * (>72.990 registros históricos), filtrable por período, territorial,
 * CETAP, programa y núcleo temático. Cubre también F022 (consultas
 * puntuales de entes de control: "¿qué dictó el docente X en el período
 * Y?") reutilizando el mismo listado — basta con fijar docente + período.
 *
 * El acceso de entes externos es temporal y controlado: solo GGP/Dirección
 * puede otorgarlo (con vigencia y motivo), y cada consulta queda auditada
 * en el backend (RundMacroDocenteConsultaLog).
 */
import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  BookOpen, Filter, RefreshCw, FileSpreadsheet, FileText,
  Search, X, ShieldCheck, Trash2, Clock, Copy, Link2, CheckCircle2,
} from 'lucide-react';
import { Card, Badge } from '@esap-mfe/shared-ui';
import { toast } from 'sonner';
import { apiClient } from '../services/api/apiClient';
import { getApiGatewayBaseUrl } from '../../config/environment';
import { exportToCSV, exportToExcel } from '../utils/reportExport';
import { PaginationPremium } from '../shared/PaginationPremium';
import { EmptyStatePremium } from './EmptyStatesPremium';

const MD_BASE = '/pta/api/v1/pta/macro-docente';
const BD_BASE = '/pta/api/v1/pta/banco-docentes';

/**
 * El acceso externo se consume vía GET /macro-docente/externo/:token (público,
 * validado por vigencia). GGP necesita este link completo para enviárselo al
 * ente externo — antes de este fix, el token se generaba pero no se mostraba
 * en ningún lado de la UI, dejando el acceso creado pero inutilizable.
 */
function buildEnlaceExterno(token: string): string {
  const base = getApiGatewayBaseUrl().replace(/\/$/, '');
  const path = `${MD_BASE}/externo/${token}`;
  return base.startsWith('http') ? `${base}${path}` : `${window.location.origin}${base}${path}`;
}

async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

interface FiltrosMacroDocente {
  docenteId: string;
  docenteLabel: string;
  periodo: string;
  territorial: string;
  cetap: string;
  programa: string;
  nucleoTematico: string;
}

const FILTROS_VACIOS: FiltrosMacroDocente = {
  docenteId: '', docenteLabel: '', periodo: '', territorial: '', cetap: '', programa: '', nucleoTematico: '',
};

interface HistorialRow {
  docente_id: string;
  docente_nombre: string | null;
  documento_identidad: string | null;
  periodo: string;
  territorial: string | null;
  cetap: string | null;
  programa: string | null;
  nucleo_tematico: string | null;
  asignatura_codigo: string | null;
  asignatura_nombre: string | null;
  horas: number | null;
}

interface DocenteOpcion {
  docente_id: string;
  nombre_completo: string;
  documento_identidad?: string;
}

async function buscarDocentes(search: string): Promise<DocenteOpcion[]> {
  if (search.trim().length < 3) return [];
  const raw = await apiClient.get<any>(BD_BASE, { search, limit: 8 });
  const items = Array.isArray(raw?.items) ? raw.items : [];
  return items.map((it: any) => ({
    docente_id: it.docente_id || it.docenteId || it.id,
    nombre_completo: it.nombre_completo || 'Sin nombre',
    documento_identidad: it.documento_identidad,
  }));
}

async function fetchHistorial(filters: FiltrosMacroDocente, page: number, limit: number) {
  const params: Record<string, any> = {
    docenteId: filters.docenteId || undefined,
    periodo: filters.periodo || undefined,
    territorial: filters.territorial || undefined,
    cetap: filters.cetap || undefined,
    programa: filters.programa || undefined,
    nucleoTematico: filters.nucleoTematico || undefined,
    page,
    limit,
  };
  Object.keys(params).forEach((key) => params[key] === undefined && delete params[key]);
  const raw = await apiClient.get<any>(MD_BASE, params);
  return {
    items: Array.isArray(raw?.items) ? raw.items : [],
    total: raw?.total ?? 0,
    pages: raw?.pages ?? 1,
  };
}

function DocenteSearchInput({
  value,
  onSelect,
  required = false,
  idSuffix = '',
}: {
  value: string;
  onSelect: (docente: DocenteOpcion | null) => void;
  required?: boolean;
  idSuffix?: string;
}) {
  const [query, setQuery] = useState('');
  const [opciones, setOpciones] = useState<DocenteOpcion[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const inputId = `md-docente-search${idSuffix}`;

  const onChange = async (v: string) => {
    setQuery(v);
    setAbierto(true);
    if (v.trim().length < 3) { setOpciones([]); return; }
    setBuscando(true);
    try {
      setOpciones(await buscarDocentes(v));
    } catch {
      setOpciones([]);
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className="relative">
      <label htmlFor={inputId} className="text-xs font-medium text-gray-600 mb-1 block">
        Docente (nombre o documento){required && <span className="text-red-500"> *</span>}
      </label>
      {value ? (
        <div className="flex items-center justify-between px-3 py-2 border-2 border-[#003DA5] rounded-lg text-sm bg-blue-50">
          <span className="truncate">{value}</span>
          <button onClick={() => onSelect(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id={inputId}
            type="text"
            placeholder="Escriba al menos 3 letras…"
            value={query}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setAbierto(true)}
            onBlur={() => setTimeout(() => setAbierto(false), 150)}
            className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#003DA5]"
          />
          {abierto && (buscando || opciones.length > 0) && (
            <div className="absolute z-10 mt-1 w-full bg-white border-2 border-gray-100 rounded-lg shadow-lg max-h-56 overflow-y-auto">
              {buscando ? (
                <p className="px-3 py-2 text-xs text-gray-400">Buscando…</p>
              ) : (
                opciones.map((opt) => (
                  <button
                    key={opt.docente_id}
                    onMouseDown={() => onSelect(opt)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0"
                  >
                    <div className="font-medium text-gray-800">{opt.nombre_completo}</div>
                    {opt.documento_identidad && (
                      <div className="text-xs text-gray-400">{opt.documento_identidad}</div>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AccesosExternosPanel() {
  const [accesos, setAccesos] = useState<any[]>([]);
  const [bitacora, setBitacora] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creando, setCreando] = useState(false);
  const [docenteAlcance, setDocenteAlcance] = useState<DocenteOpcion | null>(null);
  const [form, setForm] = useState({ enteNombre: '', enteContacto: '', motivo: '', fechaInicio: '', fechaFin: '' });
  const [accesoRecienCreado, setAccesoRecienCreado] = useState<{ enteNombre: string; enlace: string } | null>(null);
  const [enlaceCopiado, setEnlaceCopiado] = useState<string | null>(null);

  const copiarEnlace = async (token: string) => {
    const enlace = buildEnlaceExterno(token);
    const ok = await copiarAlPortapapeles(enlace);
    if (ok) {
      toast.success('Enlace copiado al portapapeles');
      setEnlaceCopiado(token);
      setTimeout(() => setEnlaceCopiado((actual) => (actual === token ? null : actual)), 2000);
    } else {
      toast.error('No se pudo copiar automáticamente. Copie el enlace manualmente.', { description: enlace });
    }
  };

  const cargar = async () => {
    setLoading(true);
    try {
      const raw = await apiClient.get<any>(`${MD_BASE}/accesos-externos`);
      const data = raw?.data ?? raw ?? {};
      setAccesos(Array.isArray(data.accesos) ? data.accesos : []);
      setBitacora(Array.isArray(data.bitacora) ? data.bitacora : []);
      setLoaded(true);
    } catch (error: any) {
      toast.error('No se pudieron cargar los accesos externos', { description: error?.message });
    } finally {
      setLoading(false);
    }
  };

  const crear = async () => {
    if (!form.enteNombre.trim() || !form.fechaInicio || !form.fechaFin) {
      toast.error('Ente, fecha de inicio y fecha de fin son obligatorios.');
      return;
    }
    if (!docenteAlcance) {
      toast.error('Seleccione el docente al que aplica este acceso. Si el ente necesita ver varios docentes, otórguele un acceso por cada uno.');
      return;
    }
    setCreando(true);
    try {
      const raw = await apiClient.post<any>(`${MD_BASE}/accesos-externos`, {
        enteNombre: form.enteNombre,
        enteContacto: form.enteContacto || undefined,
        motivo: form.motivo || undefined,
        docenteId: docenteAlcance.docente_id,
        fechaInicio: new Date(form.fechaInicio).toISOString(),
        fechaFin: new Date(form.fechaFin).toISOString(),
      });
      const acceso = raw?.data ?? raw;
      if (acceso?.token) {
        setAccesoRecienCreado({ enteNombre: acceso.enteNombre, enlace: buildEnlaceExterno(acceso.token) });
      }
      toast.success('Acceso externo creado');
      setForm({ enteNombre: '', enteContacto: '', motivo: '', fechaInicio: '', fechaFin: '' });
      setDocenteAlcance(null);
      await cargar();
    } catch (error: any) {
      toast.error('No se pudo crear el acceso externo', { description: error?.message });
    } finally {
      setCreando(false);
    }
  };

  const revocar = async (id: string) => {
    try {
      await apiClient.delete(`${MD_BASE}/accesos-externos/${id}`);
      toast.success('Acceso revocado');
      await cargar();
    } catch (error: any) {
      toast.error('No se pudo revocar el acceso', { description: error?.message });
    }
  };

  const vigencia = (acceso: any) => {
    if (!acceso.activo) return { label: 'Revocado', variant: 'destructive' as const };
    const now = Date.now();
    if (now < new Date(acceso.fechaInicio).getTime()) return { label: 'Aún no inicia', variant: 'outline' as const };
    if (now > new Date(acceso.fechaFin).getTime()) return { label: 'Vencido', variant: 'outline' as const };
    return { label: 'Vigente', variant: 'default' as const };
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#003DA5]" />
          <span className="text-sm font-semibold text-gray-700">Acceso externo temporal (GGP/Dirección)</span>
        </div>
        {!loaded && (
          <button
            onClick={cargar}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg border-2 border-gray-200 hover:bg-gray-50 disabled:opacity-60"
          >
            {loading ? 'Cargando…' : 'Ver accesos y bitácora'}
          </button>
        )}
      </div>

      {loaded && (
        <div className="space-y-5">
          {accesoRecienCreado && (
            <div className="flex flex-col gap-2 p-4 rounded-lg border-2 border-green-200 bg-green-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-green-800">
                  <CheckCircle2 className="w-4 h-4" />
                  Acceso creado para {accesoRecienCreado.enteNombre}. Copie el enlace y envíeselo por el canal que corresponda:
                </div>
                <button onClick={() => setAccesoRecienCreado(null)} className="text-green-700 hover:text-green-900">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={accesoRecienCreado.enlace}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 px-3 py-2 border-2 border-green-300 rounded-lg text-xs font-mono bg-white text-gray-700"
                />
                <button
                  onClick={() => copiarAlPortapapeles(accesoRecienCreado.enlace).then((ok) => ok
                    ? toast.success('Enlace copiado al portapapeles')
                    : toast.error('No se pudo copiar automáticamente'))}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 flex-shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" /> Copiar
                </button>
              </div>
              <p className="text-xs text-green-700">
                Este enlace es de un solo uso compartido: cualquiera que lo tenga puede consultar mientras esté vigente. No lo publique en canales abiertos.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input
              placeholder="Ente externo (ej. MEN, Procuraduría)"
              value={form.enteNombre}
              onChange={(e) => setForm((f) => ({ ...f, enteNombre: e.target.value }))}
              className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#003DA5]"
            />
            <input
              placeholder="Correo de contacto (para envío automático del enlace)"
              type="email"
              value={form.enteContacto}
              onChange={(e) => setForm((f) => ({ ...f, enteContacto: e.target.value }))}
              className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#003DA5]"
            />
            <DocenteSearchInput
              value={docenteAlcance ? docenteAlcance.nombre_completo : ''}
              onSelect={setDocenteAlcance}
              required
              idSuffix="-acceso-externo"
            />
            <div>
              <label htmlFor="md-acceso-inicio" className="text-xs font-medium text-gray-600 mb-1 block">Vigente desde</label>
              <input
                id="md-acceso-inicio"
                type="date"
                value={form.fechaInicio}
                onChange={(e) => setForm((f) => ({ ...f, fechaInicio: e.target.value }))}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#003DA5]"
              />
            </div>
            <div>
              <label htmlFor="md-acceso-fin" className="text-xs font-medium text-gray-600 mb-1 block">Vigente hasta</label>
              <input
                id="md-acceso-fin"
                type="date"
                value={form.fechaFin}
                onChange={(e) => setForm((f) => ({ ...f, fechaFin: e.target.value }))}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#003DA5]"
              />
            </div>
            <input
              placeholder="Motivo / requerimiento (opcional)"
              value={form.motivo}
              onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))}
              className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#003DA5] lg:col-span-2"
            />
          </div>
          <p className="text-xs text-gray-400">
            El acceso siempre se limita a un solo docente. Si el ente necesita consultar varios, otórguele un acceso por cada uno.
            Si el correo de contacto es válido, el enlace se envía automáticamente por correo (además de poder copiarlo aquí).
          </p>
          <button
            onClick={crear}
            disabled={creando}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#003DA5] text-white text-sm font-semibold hover:bg-[#00337f] transition-colors disabled:opacity-60"
          >
            <ShieldCheck className="w-4 h-4" /> Otorgar acceso
          </button>

          <div>
            <h4 className="font-semibold text-gray-900 text-sm mb-2">Accesos otorgados ({accesos.length})</h4>
            {accesos.length === 0 ? (
              <p className="text-xs text-gray-400">Aún no se han otorgado accesos externos.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                      <th className="py-2 pr-3">Ente</th>
                      <th className="py-2 pr-3">Alcance</th>
                      <th className="py-2 pr-3">Vigencia</th>
                      <th className="py-2 pr-3">Estado</th>
                      <th className="py-2 pr-3">Otorgado por</th>
                      <th className="py-2 pr-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {accesos.map((acceso) => {
                      const estado = vigencia(acceso);
                      return (
                        <tr key={acceso.id} className="border-b border-gray-50">
                          <td className="py-2 pr-3">{acceso.enteNombre}</td>
                          <td className="py-2 pr-3">Docente {String(acceso.docenteId || '').slice(0, 8)}…</td>
                          <td className="py-2 pr-3 text-xs text-gray-500">
                            {new Date(acceso.fechaInicio).toLocaleDateString('es-CO')} — {new Date(acceso.fechaFin).toLocaleDateString('es-CO')}
                          </td>
                          <td className="py-2 pr-3"><Badge variant={estado.variant}>{estado.label}</Badge></td>
                          <td className="py-2 pr-3 text-xs text-gray-500">{acceso.otorgadoPor}</td>
                          <td className="py-2 pr-3">
                            <div className="flex items-center gap-2">
                              {acceso.activo && acceso.token && (
                                <button
                                  onClick={() => copiarEnlace(acceso.token)}
                                  className="flex items-center gap-1 text-xs text-[#003DA5] hover:text-[#00337f]"
                                  title="Copiar enlace de acceso"
                                >
                                  {enlaceCopiado === acceso.token ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Link2 className="w-4 h-4" />
                                  )}
                                  Enlace
                                </button>
                              )}
                              {acceso.activo && (
                                <button onClick={() => revocar(acceso.id)} className="text-red-500 hover:text-red-700" title="Revocar acceso">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" /> Bitácora de consultas recientes
            </h4>
            {bitacora.length === 0 ? (
              <p className="text-xs text-gray-400">Sin consultas registradas todavía.</p>
            ) : (
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="py-1.5 pr-3">Fecha</th>
                      <th className="py-1.5 pr-3">Tipo</th>
                      <th className="py-1.5 pr-3">Actor</th>
                      <th className="py-1.5 pr-3">Período</th>
                      <th className="py-1.5 pr-3">Resultados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bitacora.map((entry) => (
                      <tr key={entry.id} className="border-b border-gray-50">
                        <td className="py-1.5 pr-3 text-gray-500">{new Date(entry.createdAt).toLocaleString('es-CO')}</td>
                        <td className="py-1.5 pr-3">{entry.tipoConsulta}</td>
                        <td className="py-1.5 pr-3">{entry.actorId}</td>
                        <td className="py-1.5 pr-3">{entry.periodo || '—'}</td>
                        <td className="py-1.5 pr-3">{entry.totalResultados ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export function MacroDocenteReportView({ onClose }: { onClose?: () => void }) {
  const [filtros, setFiltros] = useState<FiltrosMacroDocente>(FILTROS_VACIOS);
  const [appliedFiltros, setAppliedFiltros] = useState<FiltrosMacroDocente | null>(null);
  const [detalle, setDetalle] = useState<{ items: HistorialRow[]; total: number; pages: number }>({ items: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const limit = 25;

  const puedeConsultar = Boolean(filtros.docenteId || filtros.periodo);

  const generarReporte = async () => {
    if (!puedeConsultar) {
      toast.error('Indique al menos un docente o un período académico para consultar el Macro Docente.');
      return;
    }
    setAppliedFiltros(filtros);
    setPage(1);
    setLoading(true);
    try {
      const data = await fetchHistorial(filtros, 1, limit);
      setDetalle(data);
    } catch (error: any) {
      toast.error('Error al generar el Macro Docente', { description: error?.message });
    } finally {
      setLoading(false);
    }
  };

  const cambiarPagina = async (nuevaPagina: number) => {
    if (!appliedFiltros) return;
    setPage(nuevaPagina);
    setLoading(true);
    try {
      setDetalle(await fetchHistorial(appliedFiltros, nuevaPagina, limit));
    } catch (error: any) {
      toast.error('Error al cargar la página del historial', { description: error?.message });
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setFiltros(FILTROS_VACIOS);
    setAppliedFiltros(null);
    setDetalle({ items: [], total: 0, pages: 1 });
  };

  const esConsultaPuntual = Boolean(appliedFiltros?.docenteId && appliedFiltros?.periodo);

  const exportar = (formato: 'csv' | 'excel') => {
    if (!detalle.items.length) {
      toast.info('No hay datos para exportar con el filtro actual');
      return;
    }
    const nombre = esConsultaPuntual ? 'macro-docente-consulta-puntual' : 'macro-docente-historial';
    if (formato === 'csv') exportToCSV(detalle.items, nombre);
    else exportToExcel(detalle.items, nombre);
    toast.success('Historial exportado (página actual)');
  };

  const filtrosActivos = useMemo(
    () => appliedFiltros
      ? Object.entries(appliedFiltros).filter(([k, v]) => k !== 'docenteLabel' && Boolean(v)).length
      : 0,
    [appliedFiltros],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#003DA5]" />
            Macro Docente — Historial nacional de asignaturas
          </h2>
          <p className="text-sm text-gray-500">
            Consulte el historial completo de asignaturas dictadas por un docente a nivel nacional, o filtre
            por período, territorial, CETAP, programa y núcleo temático. Para una consulta puntual de control
            (F022), fije docente y período.
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Filtros</span>
          <span className="text-xs text-gray-400">(debe indicar al menos docente o período)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <DocenteSearchInput
            value={filtros.docenteLabel}
            onSelect={(opt) => setFiltros((f) => ({
              ...f,
              docenteId: opt?.docente_id || '',
              docenteLabel: opt?.nombre_completo || '',
            }))}
          />
          <div>
            <label htmlFor="md-periodo" className="text-xs font-medium text-gray-600 mb-1 block">Período académico</label>
            <input
              id="md-periodo"
              type="text"
              placeholder="ej. 2025-2"
              value={filtros.periodo}
              onChange={(e) => setFiltros((f) => ({ ...f, periodo: e.target.value }))}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#003DA5]"
            />
          </div>
          <div>
            <label htmlFor="md-territorial" className="text-xs font-medium text-gray-600 mb-1 block">Territorial</label>
            <input
              id="md-territorial"
              type="text"
              value={filtros.territorial}
              onChange={(e) => setFiltros((f) => ({ ...f, territorial: e.target.value }))}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#003DA5]"
            />
          </div>
          <div>
            <label htmlFor="md-cetap" className="text-xs font-medium text-gray-600 mb-1 block">CETAP</label>
            <input
              id="md-cetap"
              type="text"
              value={filtros.cetap}
              onChange={(e) => setFiltros((f) => ({ ...f, cetap: e.target.value }))}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#003DA5]"
            />
          </div>
          <div>
            <label htmlFor="md-programa" className="text-xs font-medium text-gray-600 mb-1 block">Programa</label>
            <input
              id="md-programa"
              type="text"
              value={filtros.programa}
              onChange={(e) => setFiltros((f) => ({ ...f, programa: e.target.value }))}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#003DA5]"
            />
          </div>
          <div>
            <label htmlFor="md-nucleo" className="text-xs font-medium text-gray-600 mb-1 block">Núcleo temático</label>
            <input
              id="md-nucleo"
              type="text"
              value={filtros.nucleoTematico}
              onChange={(e) => setFiltros((f) => ({ ...f, nucleoTematico: e.target.value }))}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#003DA5]"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={generarReporte}
            disabled={loading || !puedeConsultar}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#003DA5] text-white text-sm font-semibold hover:bg-[#00337f] transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Consultar Macro Docente
          </button>
          <button
            onClick={limpiarFiltros}
            className="px-4 py-2 rounded-lg border-2 border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      </Card>

      {appliedFiltros && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900 text-sm">
                {esConsultaPuntual ? 'Consulta puntual' : 'Historial'} ({detalle.total} asignatura{detalle.total !== 1 ? 's' : ''} · {filtrosActivos} filtro(s))
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={() => exportar('excel')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-gray-200 text-xs hover:bg-gray-50"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" /> Excel
                </button>
                <button
                  onClick={() => exportar('csv')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-gray-200 text-xs hover:bg-gray-50"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" /> CSV
                </button>
              </div>
            </div>

            {loading ? (
              <p className="text-sm text-gray-400 py-6 text-center">Cargando…</p>
            ) : detalle.items.length === 0 ? (
              <EmptyStatePremium type="no-results" title="Sin resultados" description="No hay asignaturas registradas para el filtro aplicado." />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                        <th className="py-2 pr-3">Docente</th>
                        <th className="py-2 pr-3">Período</th>
                        <th className="py-2 pr-3">Territorial</th>
                        <th className="py-2 pr-3">CETAP</th>
                        <th className="py-2 pr-3">Programa</th>
                        <th className="py-2 pr-3">Núcleo temático</th>
                        <th className="py-2 pr-3">Asignatura</th>
                        <th className="py-2 pr-3">Horas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.items.map((row, idx) => (
                        <tr key={`${row.docente_id}-${row.periodo}-${row.asignatura_codigo}-${idx}`} className="border-b border-gray-50">
                          <td className="py-2 pr-3">{row.docente_nombre || '—'}</td>
                          <td className="py-2 pr-3">{row.periodo}</td>
                          <td className="py-2 pr-3">{row.territorial || '—'}</td>
                          <td className="py-2 pr-3">{row.cetap || '—'}</td>
                          <td className="py-2 pr-3">{row.programa || '—'}</td>
                          <td className="py-2 pr-3">{row.nucleo_tematico || '—'}</td>
                          <td className="py-2 pr-3">{row.asignatura_nombre || row.asignatura_codigo || '—'}</td>
                          <td className="py-2 pr-3">{row.horas ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!esConsultaPuntual && (
                  <div className="mt-4">
                    <PaginationPremium
                      currentPage={page}
                      totalPages={detalle.pages}
                      onPageChange={cambiarPagina}
                      itemsPerPage={limit}
                      totalItems={detalle.total}
                    />
                  </div>
                )}
              </>
            )}
          </Card>
        </motion.div>
      )}

      <AccesosExternosPanel />
    </div>
  );
}
