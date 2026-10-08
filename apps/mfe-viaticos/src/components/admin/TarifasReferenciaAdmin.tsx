import React, { useEffect, useState, useMemo } from 'react';
import {
  PlaneTakeoff,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Coins,
  X,
  Save,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Info,
} from 'lucide-react';
import viaticosService from '../../services/api/viaticosService';
import { TarifaReferenciaTiquete, SincronizarTarifasResult } from '../../types/viaticos';
import { formatearMoneda, soloNumeros } from '../../utils/viaticosUtils';

const CATALOGO_IATAS: Record<string, string> = {
  BOGOTA: 'BOG',
  MEDELLIN: 'MDE',
  RIONEGRO: 'MDE',
  CALI: 'CLO',
  PALMIRA: 'CLO',
  BARRANQUILLA: 'BAQ',
  CARTAGENA: 'CTG',
  BUCARAMANGA: 'BGA',
  PEREIRA: 'PEI',
  CUCUTA: 'CUC',
  'SANTA MARTA': 'SMR',
  MONTERIA: 'MTR',
  PASTO: 'PSO',
  VALLEDUPAR: 'VUP',
  NEIVA: 'NVA',
  VILLAVICENCIO: 'VVC',
  ARMENIA: 'AXM',
  POPAYAN: 'PPN',
  RIOHACHA: 'RCH',
  FLORENCIA: 'FLA',
  QUIBDO: 'UIB',
  YOPAL: 'EYP',
  LETICIA: 'LET',
  'SAN ANDRES': 'ADZ',
  IBAGUE: 'IBE',
  MANIZALES: 'MZL',
  'PUERTO ASIS': 'PUU',
  ARAUCA: 'AUC',
  APARTADO: 'APO',
  SINCELEJO: 'CZU',
  COROZAL: 'CZU',
  BARRANCABERMEJA: 'EJA',
  TUMACO: 'TCO',
};

function autocompletarIata(ciudad: string): string {
  if (!ciudad) return '';
  const norm = ciudad
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  for (const [k, iata] of Object.entries(CATALOGO_IATAS)) {
    if (norm.includes(k) || k.includes(norm)) return iata;
  }
  return '';
}

export default function TarifasReferenciaAdmin() {
  const [tarifas, setTarifas] = useState<TarifaReferenciaTiquete[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeSync, setMensajeSync] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODAS' | 'ACTIVAS' | 'INACTIVAS'>('TODAS');

  // Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tarifaEditando, setTarifaEditando] = useState<TarifaReferenciaTiquete | null>(null);
  const [form, setForm] = useState({
    origenCiudad: '',
    origenIata: '',
    destinoCiudad: '',
    destinoIata: '',
    tarifaEstimada: 0,
    tarifaMinima: 0,
    tarifaMaxima: 0,
    fuente: 'MANUAL',
    notas: '',
    activo: true,
  });

  const cargarTarifas = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await viaticosService.obtenerTarifasReferencia();
      setTarifas(data);
    } catch (err: any) {
      console.error('Error cargando tarifas de referencia:', err);
      setError('No fue posible cargar las tarifas de referencia.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargarTarifas();
  }, []);

  // Sincronización batch con API / Estimador
  const sincronizar = async () => {
    setSincronizando(true);
    setError(null);
    setMensajeExito(null);
    setMensajeSync(null);
    try {
      const resultado: SincronizarTarifasResult =
        await viaticosService.sincronizarTarifasBatch();
      setMensajeSync(
        `${resultado.mensaje} (Fuente: ${resultado.fuente}, Actualizadas: ${resultado.actualizadas}/${resultado.totalRutas})`,
      );
      await cargarTarifas();
    } catch (err: any) {
      console.error('Error en sincronización batch:', err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Error al sincronizar tarifas con la API.',
      );
    } finally {
      setSincronizando(false);
    }
  };

  const abrirCrear = () => {
    setTarifaEditando(null);
    setForm({
      origenCiudad: '',
      origenIata: '',
      destinoCiudad: '',
      destinoIata: '',
      tarifaEstimada: 0,
      tarifaMinima: 0,
      tarifaMaxima: 0,
      fuente: 'MANUAL',
      notas: '',
      activo: true,
    });
    setModalAbierto(true);
  };

  const abrirEditar = (item: TarifaReferenciaTiquete) => {
    setTarifaEditando(item);
    setForm({
      origenCiudad: item.origenCiudad,
      origenIata: item.origenIata || '',
      destinoCiudad: item.destinoCiudad,
      destinoIata: item.destinoIata || '',
      tarifaEstimada: Number(item.tarifaEstimada) || 0,
      tarifaMinima: Number(item.tarifaMinima) || 0,
      tarifaMaxima: Number(item.tarifaMaxima) || 0,
      fuente: item.fuente || 'MANUAL',
      notas: item.notas || '',
      activo: item.activo,
    });
    setModalAbierto(true);
  };

  const handleCambioOrigen = (valor: string) => {
    const iataAuto = autocompletarIata(valor);
    setForm((prev) => ({
      ...prev,
      origenCiudad: valor,
      origenIata: iataAuto || prev.origenIata,
    }));
  };

  const handleCambioDestino = (valor: string) => {
    const iataAuto = autocompletarIata(valor);
    setForm((prev) => ({
      ...prev,
      destinoCiudad: valor,
      destinoIata: iataAuto || prev.destinoIata,
    }));
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.origenCiudad.trim() || !form.destinoCiudad.trim()) {
      setError('Ciudad de origen y destino son obligatorias.');
      return;
    }
    const tarifaEstimadaNum = Number(soloNumeros(String(form.tarifaEstimada))) || 0;
    const tarifaMinimaNum = Number(soloNumeros(String(form.tarifaMinima))) || 0;
    const tarifaMaximaNum = Number(soloNumeros(String(form.tarifaMaxima))) || 0;

    if (tarifaEstimadaNum <= 0) {
      setError('La tarifa estimada debe ser un monto mayor a cero.');
      return;
    }

    const payload = {
      ...form,
      tarifaEstimada: tarifaEstimadaNum,
      tarifaMinima: tarifaMinimaNum,
      tarifaMaxima: tarifaMaximaNum,
    };

    setGuardando(true);
    setError(null);
    setMensajeExito(null);
    try {
      if (tarifaEditando) {
        await viaticosService.actualizarTarifaReferencia(tarifaEditando.id, payload);
        setMensajeExito('Ruta y tarifa actualizada correctamente.');
      } else {
        await viaticosService.crearTarifaReferencia(payload);
        setMensajeExito('Nueva ruta y tarifa de referencia creada.');
      }
      setModalAbierto(false);
      await cargarTarifas();
    } catch (err: any) {
      console.error('Error guardando tarifa:', err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'No fue posible guardar la tarifa de referencia.',
      );
    } finally {
      setGuardando(false);
    }
  };

  const toggleEstado = async (item: TarifaReferenciaTiquete) => {
    const nuevoEstado = !item.activo;
    setError(null);
    setMensajeExito(null);
    try {
      await viaticosService.actualizarTarifaReferencia(item.id, {
        activo: nuevoEstado,
      });
      setMensajeExito(
        `Ruta ${item.origenCiudad} - ${item.destinoCiudad} ${nuevoEstado ? 'activada' : 'desactivada'}.`,
      );
      await cargarTarifas();
    } catch (err: any) {
      console.error('Error actualizando estado:', err);
      setError('No fue posible actualizar el estado de la ruta.');
    }
  };

  const eliminar = async (item: TarifaReferenciaTiquete) => {
    if (
      !window.confirm(
        `¿Está seguro de desactivar la ruta ${item.origenCiudad} ⇄ ${item.destinoCiudad}?`,
      )
    ) {
      return;
    }
    setError(null);
    setMensajeExito(null);
    try {
      await viaticosService.eliminarTarifaReferencia(item.id);
      setMensajeExito(
        `Ruta ${item.origenCiudad} ⇄ ${item.destinoCiudad} desactivada del catálogo.`,
      );
      await cargarTarifas();
    } catch (err: any) {
      console.error('Error eliminando tarifa:', err);
      setError('No fue posible desactivar la ruta.');
    }
  };

  // Filtrado
  const tarifasFiltradas = useMemo(() => {
    return tarifas.filter((t) => {
      if (filtroEstado === 'ACTIVAS' && !t.activo) return false;
      if (filtroEstado === 'INACTIVAS' && t.activo) return false;

      if (!busqueda.trim()) return true;
      const q = busqueda.toLowerCase().trim();
      const origen = (t.origenCiudad || '').toLowerCase();
      const destino = (t.destinoCiudad || '').toLowerCase();
      const origenIata = (t.origenIata || '').toLowerCase();
      const destinoIata = (t.destinoIata || '').toLowerCase();
      const fuente = (t.fuente || '').toLowerCase();

      return (
        origen.includes(q) ||
        destino.includes(q) ||
        origenIata.includes(q) ||
        destinoIata.includes(q) ||
        fuente.includes(q)
      );
    });
  }, [tarifas, busqueda, filtroEstado]);

  const totalActivas = useMemo(
    () => tarifas.filter((t) => t.activo).length,
    [tarifas],
  );

  const ultimaActualizacionGlobal = useMemo(() => {
    if (tarifas.length === 0) return null;
    const fechas = tarifas
      .map((t) => (t.ultimaActualizacion ? new Date(t.ultimaActualizacion).getTime() : 0))
      .filter((n) => n > 0);
    if (fechas.length === 0) return null;
    return new Date(Math.max(...fechas));
  }, [tarifas]);

  return (
    <div className="space-y-6">
      {/* Encabezado y Acciones Principales */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-[#003DA5] border border-blue-100">
                <PlaneTakeoff className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-tight">
                  Tarifas de Referencia de Tiquetes Aéreos
                </h3>
                <p className="text-xs text-slate-500">
                  Matriz paramétrica de rutas aéreas institucionales. Actualice valores unitarios o sincronice en lote con el estimador y APIs de aerolíneas.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start lg:self-auto">
            <button
              type="button"
              onClick={sincronizar}
              disabled={sincronizando || cargando}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs disabled:opacity-50 cursor-pointer"
              title="Sincronizar tarifas en lote con la API externa o motor paramétrico"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${sincronizando ? 'animate-spin' : ''}`}
              />
              <span>{sincronizando ? 'Sincronizando…' : 'Sincronizar con API'}</span>
            </button>

            <button
              type="button"
              onClick={abrirCrear}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#003DA5] hover:bg-[#002b75] active:bg-blue-900 text-white rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Ruta / Tarifa</span>
            </button>
          </div>
        </div>

        {/* Banner de Sincronización Informativo */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100">
            <Coins className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <span className="font-semibold text-slate-700">Rutas activas:</span>{' '}
              <span className="font-black text-[#003DA5]">{totalActivas}</span> de {tarifas.length} catalogadas
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-600 bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100">
            <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-semibold text-slate-700">Última sincronización:</span>{' '}
              <span className="text-slate-800 font-medium">
                {ultimaActualizacionGlobal
                  ? ultimaActualizacionGlobal.toLocaleString('es-CO', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })
                  : 'Sin registro'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-600 bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100">
            <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
            <div>
              <span className="font-semibold text-slate-700">Cron semanal:</span>{' '}
              <span className="text-slate-800 font-medium">Activo (domingos 02:00)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas y Mensajes */}
      {mensajeSync && (
        <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{mensajeSync}</div>
          <button
            type="button"
            onClick={() => setMensajeSync(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {mensajeExito && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium flex-1">{mensajeExito}</span>
          <button
            type="button"
            onClick={() => setMensajeExito(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-medium flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-700 hover:text-rose-900"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por ciudad (Bogotá, Medellín...), IATA (BOG, MDE...) o fuente..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30 focus:border-[#003DA5]"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
            {(['TODAS', 'ACTIVAS', 'INACTIVAS'] as const).map((estado) => (
              <button
                key={estado}
                type="button"
                onClick={() => setFiltroEstado(estado)}
                className={`px-3 py-1.5 rounded-lg transition-all text-[11px] ${
                  filtroEstado === estado
                    ? 'bg-white text-[#003DA5] shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {estado === 'TODAS'
                  ? 'Todas'
                  : estado === 'ACTIVAS'
                    ? 'Activas'
                    : 'Inactivas'}
              </button>
            ))}
          </div>

          <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">
            {tarifasFiltradas.length} {tarifasFiltradas.length === 1 ? 'ruta' : 'rutas'}
          </span>
        </div>
      </div>

      {/* Tabla de Rutas y Tarifas */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        {cargando ? (
          <div className="py-16 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#003DA5]" />
            Cargando tarifas de referencia...
          </div>
        ) : tarifas.length === 0 ? (
          <div className="text-center py-14 px-4">
            <Coins className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">No hay tarifas de referencia registradas</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Haga clic en &quot;Sincronizar con API&quot; para cargar automáticamente el catálogo nacional de 42 rutas de referencia de la ESAP.
            </p>
            <button
              type="button"
              onClick={sincronizar}
              disabled={sincronizando}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#003DA5] text-white rounded-xl text-xs font-bold hover:bg-[#002b75]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sincronizar catálogo ahora
            </button>
          </div>
        ) : tarifasFiltradas.length === 0 ? (
          <div className="text-center py-12 px-4 text-xs text-slate-500">
            No se encontraron rutas con el criterio &quot;{busqueda}&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase font-bold text-slate-500 tracking-wider bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4">Ruta Aérea</th>
                  <th className="text-center py-3 px-3">Códigos IATA</th>
                  <th className="text-right py-3 px-4">Tarifa Estimada</th>
                  <th className="text-right py-3 px-4">Rango (Mín – Máx)</th>
                  <th className="text-center py-3 px-3">Fuente</th>
                  <th className="text-center py-3 px-3">Última Actualización</th>
                  <th className="text-center py-3 px-3">Estado</th>
                  <th className="text-center py-3 px-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tarifasFiltradas.map((t) => (
                  <tr
                    key={t.id}
                    className={`hover:bg-blue-50/30 transition-colors ${
                      !t.activo ? 'opacity-60 bg-slate-50/50' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <span>{t.origenCiudad}</span>
                        <span className="text-slate-400 font-normal">⇄</span>
                        <span>{t.destinoCiudad}</span>
                      </div>
                      {t.notas && (
                        <p className="text-[10px] text-slate-400 font-normal mt-0.5 truncate max-w-xs">
                          {t.notas}
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                        {t.origenIata || '—'} ⇄ {t.destinoIata || '—'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="font-black text-[#003DA5] text-sm">
                        {formatearMoneda(Number(t.tarifaEstimada))}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right text-[11px] text-slate-600">
                      {t.tarifaMinima && t.tarifaMaxima ? (
                        <span>
                          {formatearMoneda(Number(t.tarifaMinima))} – {formatearMoneda(Number(t.tarifaMaxima))}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.fuente === 'API_AMADEUS'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : t.fuente === 'ESTIMADOR_REFERENCIA_ESAP'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : t.fuente === 'BENCHMARK_CCE'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {t.fuente || 'MANUAL'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center text-[10px] text-slate-500 whitespace-nowrap">
                      {t.ultimaActualizacion
                        ? new Date(t.ultimaActualizacion).toLocaleDateString('es-CO', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleEstado(t)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                          t.activo
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                        title="Clic para cambiar estado"
                      >
                        {t.activo ? 'Activa' : 'Inactiva'}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => abrirEditar(t)}
                          className="p-1.5 text-slate-500 hover:text-[#003DA5] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar ruta y tarifa"
                          aria-label="Editar tarifa"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminar(t)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Desactivar ruta"
                          aria-label="Desactivar ruta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para Crear o Actualizar Ruta / Tarifa */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <PlaneTakeoff className="w-4 h-4 text-[#003DA5]" />
                <h4 className="text-sm font-black text-slate-800">
                  {tarifaEditando ? 'Actualizar Ruta / Tarifa' : 'Nueva Ruta de Referencia'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={guardar} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Origen */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Ciudad Origen *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.origenCiudad}
                    onChange={(e) => handleCambioOrigen(e.target.value)}
                    placeholder="Ej. Bogotá, D.C."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Código IATA Origen
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    value={form.origenIata}
                    onChange={(e) =>
                      setForm({ ...form, origenIata: e.target.value.toUpperCase() })
                    }
                    placeholder="BOG"
                    className="w-full px-3 py-2 text-xs font-mono font-bold uppercase border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Destino */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Ciudad Destino *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.destinoCiudad}
                    onChange={(e) => handleCambioDestino(e.target.value)}
                    placeholder="Ej. Medellín"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Código IATA Destino
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    value={form.destinoIata}
                    onChange={(e) =>
                      setForm({ ...form, destinoIata: e.target.value.toUpperCase() })
                    }
                    placeholder="MDE"
                    className="w-full px-3 py-2 text-xs font-mono font-bold uppercase border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Tarifas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Tarifa Estimada ($ COP) *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.tarifaEstimada ? form.tarifaEstimada.toLocaleString('es-CO') : ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tarifaEstimada: soloNumeros(e.target.value),
                      })
                    }
                    placeholder="380000"
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Tarifa Mínima
                  </label>
                  <input
                    type="text"
                    value={form.tarifaMinima ? form.tarifaMinima.toLocaleString('es-CO') : ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tarifaMinima: soloNumeros(e.target.value),
                      })
                    }
                    placeholder="290000"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Tarifa Máxima
                  </label>
                  <input
                    type="text"
                    value={form.tarifaMaxima ? form.tarifaMaxima.toLocaleString('es-CO') : ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tarifaMaxima: soloNumeros(e.target.value),
                      })
                    }
                    placeholder="510000"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Fuente y Notas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Fuente de Cotización
                  </label>
                  <select
                    value={form.fuente}
                    onChange={(e) => setForm({ ...form, fuente: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MANUAL">MANUAL (Administrador)</option>
                    <option value="API_AMADEUS">API_AMADEUS (Aerolíneas)</option>
                    <option value="ESTIMADOR_REFERENCIA_ESAP">ESTIMADOR_REFERENCIA_ESAP</option>
                    <option value="BENCHMARK_CCE">BENCHMARK_CCE (Colombia Compra)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Estado
                  </label>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, activo: !form.activo })}
                      className="cursor-pointer"
                    >
                      {form.activo ? (
                        <ToggleRight className="w-7 h-7 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-slate-400" />
                      )}
                    </button>
                    <span className="text-xs font-semibold text-slate-700">
                      {form.activo ? 'Ruta activa' : 'Ruta inactiva'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                  Notas / Justificación
                </label>
                <input
                  type="text"
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  placeholder="Ej. Tarifa promedio baja temporada con equipaje de mano"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {guardando ? 'Guardando…' : 'Guardar Ruta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
