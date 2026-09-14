import { useEffect, useState } from 'react';
import { CalendarDays, Loader2, Gauge, Search } from 'lucide-react';

import {
  getOfertas, getConsumoPorOferta, type Oferta, type AcumuladoDocente,
} from '../services/api/catalogoApi';

/**
 * EFDS-1375 — Gestión de ofertas académicas.
 *
 * Cinco ofertas: dos periodos regulares, dos de créditos con estrategia virtual,
 * un interperiodo. Al programar el interperiodo, ver el CONSUMO PREVIO del
 * docente en los regulares es lo que evita pasarse del tope: ese consumo se
 * acumula por semestre ENTRE ofertas (dimensión de EFDS-1373, aquí solo se
 * muestra). Las fechas son de referencia hasta que llegue el calendario (C-5).
 *
 * Estética ESAP: azul institucional #003DA5.
 */
const ETIQUETA_TIPO: Record<string, string> = {
  periodo_regular: 'Periodo regular',
  creditos_virtual: 'Créditos · virtual',
  interperiodo: 'Interperiodo',
};

export function GestionOfertas() {
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [documento, setDocumento] = useState('');
  const [consumo, setConsumo] = useState<AcumuladoDocente | null>(null);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    getOfertas()
      .then(setOfertas)
      .catch((e) => setError(e?.message || 'No se pudieron cargar las ofertas.'))
      .finally(() => setCargando(false));
  }, []);

  const consultar = async () => {
    if (!documento.trim()) return;
    setBuscando(true);
    try {
      setConsumo(await getConsumoPorOferta(documento.trim()));
    } catch {
      setConsumo(null);
    } finally {
      setBuscando(false);
    }
  };

  const pct = consumo && consumo.tope > 0 ? Math.min(100, Math.round((consumo.totalAsignado / consumo.tope) * 100)) : 0;

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-[#003DA5]" /> Ofertas Académicas
        </h3>
        <p className="text-xs text-slate-500">
          Las cinco ofertas del año. El consumo de un docente se acumula por semestre entre todas ellas.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>}

      {cargando ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 p-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando ofertas…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ofertas.map((o) => (
            <div key={o.idPeriodo} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">{o.codigo}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-[#003DA5] font-bold">
                  {o.tipo ? ETIQUETA_TIPO[o.tipo] || o.tipo : '—'}
                </span>
              </div>
              <p className="text-xs text-slate-600">{o.nombre}</p>
              <p className="text-[11px] text-slate-400">
                {o.fechaInicio || '—'} a {o.fechaFin || '—'}
                <span className="ml-1 italic">(referencia)</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Consumo previo del docente frente al tope, entre ofertas */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Gauge className="w-4 h-4 text-[#003DA5]" /> Consumo del docente entre ofertas
        </h4>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Documento del docente</label>
            <input
              type="text"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && consultar()}
              placeholder="Cédula del docente"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5]"
            />
          </div>
          <button
            onClick={consultar}
            disabled={buscando || !documento.trim()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#003DA5] text-white hover:bg-blue-800 disabled:opacity-50 font-semibold text-xs rounded-xl shadow-md"
          >
            {buscando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Ver consumo</span>
          </button>
        </div>

        {consumo && (
          <div className="space-y-2 pt-2">
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div className={`h-full ${consumo.totalAsignado > consumo.tope ? 'bg-red-500' : 'bg-[#003DA5]'}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>{consumo.nombre} · {consumo.categoriaVinculacion}</span>
              <span><strong className="text-slate-800">{consumo.totalAsignado} h</strong> de {consumo.tope} h</span>
            </div>
            {consumo.porOferta.length > 0 ? (
              <div className="pt-1 space-y-1">
                {consumo.porOferta.map((o, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-slate-600">
                    <span>{o.periodo || 'Sin periodo definido'}</span>
                    <span className="font-semibold text-slate-800">{o.horas} h</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">Sin carga asignada en ninguna oferta.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
