import { useEffect, useState, type FormEvent } from 'react';
import { CalendarDays, Loader2, Gauge, Search } from 'lucide-react';

import {
  getOfertas, getConsumoPorOferta, crearPeriodo, activarPeriodo,
  getEstadoPublicacion, publicarProgramacion, retirarProgramacion, cerrarProgramacion,
  type Oferta, type AcumuladoDocente, type EstadoPublicacion,
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

  // NUEVA-5a — Crear y activar. Requieren el permiso de administración; si
  // falta, el backend responde 403 y el mensaje se muestra tal cual, sin
  // traducirlo a un genérico.
  const [nuevo, setNuevo] = useState({
    codigo: '', nombre: '', tipo: 'periodo_regular', fechaInicio: '', fechaFin: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [avisoAdmin, setAvisoAdmin] = useState('');

  // NUEVA-1 (EFDS-1937) — Publicación de la programación por periodo. El estado
  // por periodo se consulta y se refresca tras publicar/retirar.
  const [pubs, setPubs] = useState<Record<string, EstadoPublicacion>>({});
  const [pubOcupado, setPubOcupado] = useState<string | null>(null);
  const [avisoPub, setAvisoPub] = useState('');

  const cargarPubs = (lista: Oferta[]) =>
    Promise.all(lista.map((o) =>
      getEstadoPublicacion(o.idPeriodo).then((e) => [o.idPeriodo, e] as const).catch(() => null),
    )).then((pares) => {
      const map: Record<string, EstadoPublicacion> = {};
      for (const p of pares) if (p) map[p[0]] = p[1];
      setPubs(map);
    });

  const recargar = () => getOfertas().then((l) => { setOfertas(l); return cargarPubs(l); }).catch(() => {});

  const publicar = async (id: string) => {
    setAvisoPub('');
    setPubOcupado(id);
    try {
      const e = await publicarProgramacion(id);
      setPubs((prev) => ({ ...prev, [id]: e }));
    } catch (err: any) {
      setAvisoPub(err?.message || 'No se pudo publicar la programación.');
    } finally {
      setPubOcupado(null);
    }
  };

  const retirar = async (id: string) => {
    setAvisoPub('');
    setPubOcupado(id);
    try {
      const e = await retirarProgramacion(id);
      setPubs((prev) => ({ ...prev, [id]: e }));
    } catch (err: any) {
      setAvisoPub(err?.message || 'No se pudo retirar la publicación.');
    } finally {
      setPubOcupado(null);
    }
  };

  // NUEVA-5b (EFDS-1941) — Cerrar el periodo. Al cerrarse queda inmutable, así
  // que se recarga para que la tarjeta muestre el estado 'cerrado'.
  const cerrar = async (id: string) => {
    setAvisoPub('');
    setPubOcupado(id);
    try {
      await cerrarProgramacion(id);
      await recargar();
    } catch (err: any) {
      setAvisoPub(err?.message || 'No se pudo cerrar el periodo.');
    } finally {
      setPubOcupado(null);
    }
  };

  const crear = async (e: FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setAvisoAdmin('');
    try {
      await crearPeriodo({ ...nuevo, tipo: nuevo.tipo || null });
      setNuevo({ codigo: '', nombre: '', tipo: 'periodo_regular', fechaInicio: '', fechaFin: '' });
      await recargar();
    } catch (err: any) {
      setAvisoAdmin(err?.message || 'No se pudo crear el periodo.');
    } finally {
      setGuardando(false);
    }
  };

  const activar = async (id: string) => {
    setAvisoAdmin('');
    try {
      await activarPeriodo(id);
      await recargar();
    } catch (err: any) {
      setAvisoAdmin(err?.message || 'No se pudo activar el periodo.');
    }
  };

  useEffect(() => {
    getOfertas()
      .then((l) => { setOfertas(l); return cargarPubs(l); })
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
          Las fechas de las cinco ofertas sembradas son de referencia hasta que llegue el
          calendario oficial (C-5).
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>}

      {/* Aviso de publicar/retirar: el mensaje del backend, verbatim (403 para
          quien no administra; conflicto si ya hay franjas tomadas). */}
      {avisoPub && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">{avisoPub}</div>
      )}

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
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${o.estado === 'activo' ? 'bg-emerald-50 text-emerald-700' : o.estado === 'cerrado' ? 'bg-slate-200 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>
                  {o.estado === 'activo' ? 'Activo' : o.estado === 'cerrado' ? 'Cerrado' : 'En planeación'}
                </span>
                {/* Cerrado es inmutable: no se ofrece reactivar lo que el
                    backend rechazaría por inmutable. */}
                {o.estado === 'planeacion' && (
                  <button
                    type="button"
                    onClick={() => activar(o.idPeriodo)}
                    className="px-2.5 py-1 rounded-lg bg-[#003DA5] text-white text-[11px] font-bold hover:bg-blue-800 active:scale-95 transition-all"
                  >
                    Activar
                  </button>
                )}
              </div>

              {/* NUEVA-1 — Publicación de la programación del periodo. Publicar
                  valida sin cruces; retirar solo si nadie tomó franjas. */}
              {(() => {
                const p = pubs[o.idPeriodo];
                if (!p) return null;
                const ocupado = pubOcupado === o.idPeriodo;
                const publicado = p.publicada > 0 || p.tomada > 0;
                return (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                      <span className="font-semibold text-slate-600">Programación:</span>
                      <span>{p.programado} programadas</span>
                      <span className="text-emerald-600">{p.publicada} publicadas</span>
                      <span className="text-[#003DA5]">{p.tomada} tomadas</span>
                      <span className="text-emerald-700 font-semibold">{p.aprobada} aprobadas</span>
                    </div>
                    {o.estado !== 'cerrado' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {!publicado ? (
                        <button type="button" disabled={ocupado || p.total === 0}
                          onClick={() => publicar(o.idPeriodo)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 disabled:opacity-40 active:scale-95 transition-all">
                          {ocupado ? 'Publicando…' : 'Publicar programación'}
                        </button>
                      ) : (
                        <>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">Publicada</span>
                          {/* Retirar se ofrece; el backend lo rechaza verbatim si ya hay franjas tomadas. */}
                          <button type="button" disabled={ocupado}
                            onClick={() => retirar(o.idPeriodo)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-slate-50 disabled:opacity-40 active:scale-95 transition-all">
                            {ocupado ? 'Retirando…' : 'Retirar'}
                          </button>
                        </>
                      )}
                      {/* Cerrar: el backend exige todo aprobado o en excepción y lo
                          rechaza verbatim si algo queda pendiente. */}
                      <button type="button" disabled={ocupado}
                        onClick={() => cerrar(o.idPeriodo)}
                        title={p.pendientesCierre > 0 ? `${p.pendientesCierre} franja(s) sin aprobar` : 'Cerrar el periodo'}
                        className="px-2.5 py-1 rounded-lg bg-slate-700 text-white text-[11px] font-bold hover:bg-slate-800 disabled:opacity-40 active:scale-95 transition-all">
                        {ocupado ? 'Cerrando…' : 'Cerrar periodo'}
                      </button>
                    </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {/* NUEVA-5a — Crear periodo. Nace en planeación; activar es aparte. */}
      <form onSubmit={crear} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <h4 className="font-bold text-slate-800 text-sm">Crear periodo</h4>
        <p className="text-xs text-slate-500">
          Nace <strong>en planeación</strong>. Activarlo es un acto aparte, y varios periodos
          pueden estar activos a la vez.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Código</span>
            <input required value={nuevo.codigo} placeholder="2027-1" maxLength={20}
              onChange={(e) => setNuevo({ ...nuevo, codigo: e.target.value })}
              className="border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Nombre</span>
            <input required value={nuevo.nombre} placeholder="Periodo Regular 2027-1"
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
              className="border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Tipo</span>
            <select value={nuevo.tipo}
              onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })}
              className="border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="periodo_regular">Periodo regular</option>
              <option value="creditos_virtual">Créditos virtual</option>
              <option value="interperiodo">Interperiodo</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Inicio</span>
            <input required type="date" value={nuevo.fechaInicio}
              onChange={(e) => setNuevo({ ...nuevo, fechaInicio: e.target.value })}
              className="border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Fin</span>
            <input required type="date" value={nuevo.fechaFin}
              onChange={(e) => setNuevo({ ...nuevo, fechaFin: e.target.value })}
              className="border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
          </label>
          </div>
        </div>
        {avisoAdmin && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            {avisoAdmin}
          </div>
        )}
        <button type="submit" disabled={guardando}
          className="px-4 py-2 rounded-lg bg-[#003DA5] text-white text-xs font-bold disabled:opacity-50 active:scale-95 transition-all">
          {guardando ? 'Creando…' : 'Crear periodo'}
        </button>
      </form>

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
