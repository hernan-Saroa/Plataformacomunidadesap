import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Pencil,
  Plane,
  Plus,
  Save,
  Sliders,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import viaticosService from '../../services/api/viaticosService';
import { Geopolitica, RutaRestringida, SaldoTiquete } from '../../types/viaticos';
import { formatearMoneda, soloNumeros } from '../../utils/viaticosUtils';
import SearchableSelect, {
  SearchableSelectOption,
} from '../SearchableSelect';

/**
 * Panel administrativo de parametrización del módulo de tiquetes
 * (RF-LIQ-003 / RF-LIQ-004).
 *
 * Funcionalidades:
 *  - Configurar el porcentaje de holgura global que se aplica a la reserva
 *    presupuestal de tiquetes (default 15%, configurable 0-100).
 *  - CRUD de rutas restringidas: alta, edición y desactivación de pares
 *     origen-destino.
 *  - CRUD de saldos por dependencia (cupo, holgura, activo).
 *  - Listar los saldos con semáforo visual.
 */
export default function TicketsAdminPanel() {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [holguraTexto, setHolguraTexto] = useState('15');
  const [descripcionHolgura, setDescripcionHolgura] = useState<string>('');

  const [rutas, setRutas] = useState<RutaRestringida[]>([]);
  const [rutasModalAbierto, setRutasModalAbierto] = useState(false);
  const [rutaEditando, setRutaEditando] = useState<RutaRestringida | null>(null);
  const [formRuta, setFormRuta] = useState<{
    origenCiudad: string;
    destinoCiudad: string;
    descripcionRestriccion: string;
    activo: boolean;
  }>({
    origenCiudad: '',
    destinoCiudad: '',
    descripcionRestriccion: '',
    activo: true,
  });

  const [saldos, setSaldos] = useState<SaldoTiquete[]>([]);
  const [saldosModalAbierto, setSaldosModalAbierto] = useState(false);
  const [saldoEditando, setSaldoEditando] = useState<SaldoTiquete | null>(null);
  const [formSaldo, setFormSaldo] = useState<{
    dependenciaId: string;
    nombreDependencia: string;
    presupuestoInicial: number;
    holguraPorcentaje: number;
    activo: boolean;
  }>({
    dependenciaId: '',
    nombreDependencia: '',
    presupuestoInicial: 0,
    holguraPorcentaje: 15,
    activo: true,
  });

  const [ciudades, setCiudades] = useState<Geopolitica[]>([]);
  const [cargandoCiudades, setCargandoCiudades] = useState(false);
  const cargarCiudades = async () => {
    setCargandoCiudades(true);
    try {
      const lista = await viaticosService.obtenerTodasCiudades();
      setCiudades(lista);
    } catch (e) {
      console.error('Error cargando ciudades:', e);
      setCiudades([]);
    } finally {
      setCargandoCiudades(false);
    }
  };

  const opcionesCiudades: SearchableSelectOption[] = ciudades.map((c) => ({
    value: (c.nomDivGeopolitica || '').toUpperCase(),
    label: c.nomDivGeopolitica,
  }));

  useEffect(() => {
    void cargarTodo();
  }, []);

  useEffect(() => {
    if (rutasModalAbierto) {
      void cargarCiudades();
    }
  }, [rutasModalAbierto]);

  const cargarTodo = async () => {
    setCargando(true);
    setError(null);
    try {
      const [param, listaRutas, listaSaldos] = await Promise.all([
        viaticosService.obtenerHolguraGlobal(),
        viaticosService.obtenerRutasRestringidas(),
        viaticosService.obtenerSaldosTiquetes(),
      ]);
      if (param) {
        setHolguraTexto(param.valor);
        setDescripcionHolgura(param.descripcion ?? '');
      }
      setRutas(listaRutas || []);
      setSaldos(listaSaldos || []);
    } catch (e) {
      console.error('Error cargando parámetros de tiquetes:', e);
      setError('No fue posible cargar la parametrización de tiquetes.');
    } finally {
      setCargando(false);
    }
  };

  const guardarHolgura = async () => {
    setError(null);
    setMensajeExito(null);
    const valor = Number(soloNumeros(holguraTexto));
    if (!Number.isFinite(valor) || valor < 0 || valor > 100) {
      setError('La holgura debe ser un número entre 0 y 100.');
      return;
    }
    setGuardando(true);
    try {
      const actualizado = await viaticosService.actualizarHolguraGlobal(valor);
      if (actualizado) {
        setHolguraTexto(actualizado.valor);
        setDescripcionHolgura(actualizado.descripcion ?? '');
      }
      setMensajeExito(
        `Holgura actualizada a ${valor}%. Las nuevas reservas aplicarán este margen automáticamente.`,
      );
    } catch (e) {
      console.error('Error guardando holgura:', e);
      setError('No fue posible guardar la holgura. Intente nuevamente.');
    } finally {
      setGuardando(false);
    }
  };

  // ============= CRUD de rutas restringidas =============

  const abrirNuevaRuta = () => {
    setRutaEditando(null);
    setFormRuta({
      origenCiudad: '',
      destinoCiudad: '',
      descripcionRestriccion: '',
      activo: true,
    });
    setRutasModalAbierto(true);
  };

  const abrirEditarRuta = (ruta: RutaRestringida) => {
    setRutaEditando(ruta);
    setFormRuta({
      origenCiudad: ruta.origenCiudad,
      destinoCiudad: ruta.destinoCiudad,
      descripcionRestriccion: ruta.descripcionRestriccion || '',
      activo: ruta.activo,
    });
    setRutasModalAbierto(true);
  };

  const guardarRuta = async () => {
    setError(null);
    setMensajeExito(null);
    if (!formRuta.origenCiudad.trim() || !formRuta.destinoCiudad.trim()) {
      setError('Origen y destino son obligatorios.');
      return;
    }
    setGuardando(true);
    try {
      // Si el usuario deja la descripción vacía, enviamos el texto por
      // defecto del requerimiento (alineado con el backend, que también
      // lo aplica como fallback). Esto evita errores 400 del ValidationPipe
      // y mantiene la trazabilidad documental exigida por la HU.
      const payload = {
        ...formRuta,
        descripcionRestriccion:
          formRuta.descripcionRestriccion.trim().length > 0
            ? formRuta.descripcionRestriccion.trim()
            : 'Ruta corta restringida. Requiere autorización del Director Nacional o Sindicato.',
      };
      if (rutaEditando) {
        await viaticosService.actualizarRutaRestringida(rutaEditando.id, payload);
        setMensajeExito('Ruta restringida actualizada.');
      } else {
        await viaticosService.crearRutaRestringida(payload);
        setMensajeExito('Ruta restringida creada. La validación la aplicará inmediatamente.');
      }
      setRutasModalAbierto(false);
      await cargarTodo();
    } catch (e: any) {
      console.error('Error guardando ruta restringida:', e);
      const mensaje =
        e?.response?.data?.message ||
        e?.message ||
        'No fue posible guardar la ruta restringida.';
      setError(Array.isArray(mensaje) ? mensaje.join(' ') : mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const eliminarRuta = async (ruta: RutaRestringida) => {
    if (!confirm(`¿Eliminar la ruta restringida ${ruta.origenCiudad} - ${ruta.destinoCiudad}?`)) {
      return;
    }
    setError(null);
    try {
      await viaticosService.eliminarRutaRestringida(ruta.id);
      setMensajeExito('Ruta restringida desactivada.');
      await cargarTodo();
    } catch (e) {
      console.error('Error eliminando ruta restringida:', e);
      setError('No fue posible eliminar la ruta restringida.');
    }
  };

  // ============= CRUD de saldos por dependencia =============

  const abrirNuevoSaldo = () => {
    setSaldoEditando(null);
    setFormSaldo({
      dependenciaId: '',
      nombreDependencia: '',
      presupuestoInicial: 0,
      holguraPorcentaje: Number(soloNumeros(holguraTexto)) || 15,
      activo: true,
    });
    setSaldosModalAbierto(true);
  };

  const abrirEditarSaldo = (saldo: SaldoTiquete) => {
    setSaldoEditando(saldo);
    setFormSaldo({
      dependenciaId: saldo.dependenciaId,
      nombreDependencia: saldo.nombreDependencia,
      presupuestoInicial: Number(saldo.presupuestoInicial) || 0,
      holguraPorcentaje: Number(saldo.holguraPorcentaje) || 0,
      activo: saldo.activo,
    });
    setSaldosModalAbierto(true);
  };

  const guardarSaldo = async () => {
    setError(null);
    setMensajeExito(null);
    if (!formSaldo.dependenciaId.trim() || !formSaldo.nombreDependencia.trim()) {
      setError('ID y nombre de la dependencia son obligatorios.');
      return;
    }
    if (formSaldo.presupuestoInicial <= 0) {
      setError('El cupo inicial debe ser mayor a cero.');
      return;
    }
    if (
      !Number.isFinite(formSaldo.holguraPorcentaje) ||
      formSaldo.holguraPorcentaje < 0 ||
      formSaldo.holguraPorcentaje > 100
    ) {
      setError('La holgura debe estar entre 0 y 100.');
      return;
    }
    setGuardando(true);
    try {
      if (saldoEditando) {
        await viaticosService.actualizarSaldoTiquete(saldoEditando.id, formSaldo);
        setMensajeExito('Saldo actualizado correctamente.');
      } else {
        await viaticosService.crearSaldoTiquete(formSaldo);
        setMensajeExito('Saldo creado correctamente.');
      }
      setSaldosModalAbierto(false);
      await cargarTodo();
    } catch (e: any) {
      console.error('Error guardando saldo:', e);
      const mensaje =
        e?.response?.data?.message ||
        e?.message ||
        'No fue posible guardar el saldo.';
      setError(Array.isArray(mensaje) ? mensaje.join(' ') : mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const eliminarSaldo = async (saldo: SaldoTiquete) => {
    if (
      !confirm(
        `¿Eliminar el saldo de la dependencia ${saldo.nombreDependencia}? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    setError(null);
    try {
      await viaticosService.eliminarSaldoTiquete(saldo.id);
      setMensajeExito('Saldo desactivado correctamente.');
      await cargarTodo();
    } catch (e) {
      console.error('Error eliminando saldo:', e);
      setError('No fue posible eliminar el saldo.');
    }
  };

  if (cargando) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Cargando parametrización de tiquetes…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2">
        <div className="p-2 bg-blue-50 text-[#003DA5] rounded-xl">
          <Sliders className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-900">
            Parametrización de Tiquetes
          </h3>
          <p className="text-xs text-slate-500">
            Gestión de rutas restringidas, holgura de mercado y saldos por dependencia
          </p>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {mensajeExito && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {mensajeExito}
        </div>
      )}

      {/* HOLGURA GLOBAL */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#003DA5]" />
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Holgura de mercado
          </h4>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Margen porcentual que se aplica al monto estimado del tiquete al
          momento de reservar el saldo presupuestal. Absorbe la fluctuación
          del precio entre la radicación de la solicitud y la emisión del
          pasaje.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="sm:col-span-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Porcentaje de holgura (%)
            </label>
            <div className="flex items-stretch overflow-hidden rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 bg-white">
              <input
                type="text"
                inputMode="numeric"
                value={holguraTexto}
                onChange={(e) => setHolguraTexto(soloNumeros(e.target.value))}
                placeholder="15"
                className="flex-1 min-w-0 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none text-right font-black"
              />
              <span className="flex items-center justify-center px-3 bg-slate-100 text-slate-600 font-bold text-sm border-l border-slate-200 select-none">
                %
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Rango permitido: 0 – 100. Se aplica a la reserva de cada tiquete.
            </p>
          </div>
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={() => void guardarHolgura()}
              disabled={guardando}
              className="px-4 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {guardando ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {guardando ? 'Guardando…' : 'Guardar holgura'}
            </button>
          </div>
        </div>

        {descripcionHolgura && (
          <p className="text-[11px] text-slate-500 italic">{descripcionHolgura}</p>
        )}
      </section>

      {/* RUTAS RESTRINGIDAS - CRUD */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-amber-600" />
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Rutas restringidas
            </h4>
          </div>
          <button
            type="button"
            onClick={abrirNuevaRuta}
            className="inline-flex items-center gap-2 px-3 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-lg text-xs font-bold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva ruta restringida
          </button>
        </div>

        {rutas.length === 0 ? (
          <p className="text-xs text-slate-500 italic">
            No hay rutas restringidas configuradas. Cree una para comenzar a
            bloquear viajes aéreos en trayectos cortos.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-slate-500 tracking-wider border-b border-slate-200">
                <tr>
                  <th className="text-left py-2 pr-2">Origen</th>
                  <th className="text-left py-2 pr-2">Destino</th>
                  <th className="text-left py-2 pr-2">Descripción</th>
                  <th className="text-center py-2 pr-2">Activo</th>
                  <th className="text-center py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rutas.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-2 font-semibold text-slate-700">
                      {r.origenCiudad}
                    </td>
                    <td className="py-2 pr-2 font-semibold text-slate-700">
                      {r.destinoCiudad}
                    </td>
                    <td className="py-2 pr-2 text-slate-600">
                      {r.descripcionRestriccion || '—'}
                    </td>
                    <td className="py-2 pr-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.activo
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {r.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEditarRuta(r)}
                          className="text-slate-500 hover:text-[#003DA5]"
                          title="Editar ruta"
                          aria-label="Editar ruta restringida"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void eliminarRuta(r)}
                          className="text-slate-500 hover:text-red-600"
                          title="Eliminar ruta"
                          aria-label="Eliminar ruta restringida"
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
      </section>

      {/* SALDOS POR DEPENDENCIA */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Saldos por dependencia
            </h4>
          </div>
          <button
            type="button"
            onClick={abrirNuevoSaldo}
            className="inline-flex items-center gap-2 px-3 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-lg text-xs font-bold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo saldo
          </button>
        </div>
        {saldos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4 text-center">
            <p className="text-xs text-slate-500 italic">
              No hay saldos de tiquetes configurados para ninguna dependencia.
            </p>
            <button
              type="button"
              onClick={abrirNuevoSaldo}
              className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-lg text-[11px] font-bold transition-colors"
            >
              <Plus className="w-3 h-3" />
              Crear el primer saldo
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-slate-500 tracking-wider border-b border-slate-200">
                <tr>
                  <th className="text-left py-2 pr-2">Dependencia</th>
                  <th className="text-right py-2 pr-2">Cupo</th>
                  <th className="text-right py-2 pr-2">Reservado</th>
                  <th className="text-right py-2 pr-2">Disponible</th>
                  <th className="text-right py-2 pr-2">Holgura</th>
                  <th className="text-center py-2 pr-2">Activo</th>
                  <th className="text-center py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {saldos.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-2">
                      <p className="font-semibold text-slate-700">
                        {s.nombreDependencia}
                      </p>
                      <p className="text-[10px] text-slate-400">{s.dependenciaId}</p>
                    </td>
                    <td className="py-2 pr-2 text-right font-semibold">
                      {formatearMoneda(Number(s.presupuestoInicial))}
                    </td>
                    <td className="py-2 pr-2 text-right text-amber-700 font-semibold">
                      {formatearMoneda(Number(s.presupuestoReservado))}
                    </td>
                    <td
                      className={`py-2 pr-2 text-right font-black ${
                        Number(s.presupuestoDisponible) <= 0
                          ? 'text-red-600'
                          : Number(s.presupuestoDisponible) <
                              Number(s.presupuestoInicial) * 0.3
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                      }`}
                    >
                      {formatearMoneda(Number(s.presupuestoDisponible))}
                    </td>
                    <td className="py-2 pr-2 text-right text-slate-700 font-bold">
                      {Number(s.holguraPorcentaje)}%
                    </td>
                    <td className="py-2 pr-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.activo
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {s.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEditarSaldo(s)}
                          className="text-slate-500 hover:text-[#003DA5]"
                          title="Editar saldo"
                          aria-label="Editar saldo"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void eliminarSaldo(s)}
                          className="text-slate-500 hover:text-red-600"
                          title="Eliminar saldo"
                          aria-label="Eliminar saldo"
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
      </section>

      {/* MODAL CRUD de rutas restringidas */}
      {rutasModalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800">
                {rutaEditando
                  ? 'Editar ruta restringida'
                  : 'Nueva ruta restringida'}
              </h3>
              <button
                type="button"
                onClick={() => setRutasModalAbierto(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Ciudad de origen *
                </label>
                <SearchableSelect
                  id="ruta-origen"
                  options={opcionesCiudades}
                  value={formRuta.origenCiudad}
                  onChange={(valor) =>
                    setFormRuta({
                      ...formRuta,
                      origenCiudad: valor.toUpperCase(),
                    })
                  }
                  placeholder={
                    cargandoCiudades
                      ? 'Cargando ciudades…'
                      : 'Buscar y seleccionar ciudad…'
                  }
                  loading={cargandoCiudades}
                  emptyText="No hay ciudades disponibles"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Ciudad de destino *
                </label>
                <SearchableSelect
                  id="ruta-destino"
                  options={opcionesCiudades}
                  value={formRuta.destinoCiudad}
                  onChange={(valor) =>
                    setFormRuta({
                      ...formRuta,
                      destinoCiudad: valor.toUpperCase(),
                    })
                  }
                  placeholder={
                    cargandoCiudades
                      ? 'Cargando ciudades…'
                      : 'Buscar y seleccionar ciudad…'
                  }
                  loading={cargandoCiudades}
                  emptyText="No hay ciudades disponibles"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Descripción / motivo de la restricción
                </label>
                <textarea
                  rows={2}
                  value={formRuta.descripcionRestriccion}
                  onChange={(e) =>
                    setFormRuta({
                      ...formRuta,
                      descripcionRestriccion: e.target.value,
                    })
                  }
                  placeholder="Ruta corta restringida. Requiere autorización del Director Nacional o Sindicato."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={formRuta.activo}
                  onChange={(e) =>
                    setFormRuta({ ...formRuta, activo: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-slate-300 text-[#003DA5] focus:ring-[#003DA5]"
                />
                Activo (la ruta restringe viajes aéreos)
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setRutasModalAbierto(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void guardarRuta()}
                disabled={guardando}
                className="px-4 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50"
              >
                {guardando ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRUD de saldos por dependencia */}
      {saldosModalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800">
                {saldoEditando ? 'Editar saldo' : 'Nuevo saldo por dependencia'}
              </h3>
              <button
                type="button"
                onClick={() => setSaldosModalAbierto(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  ID de la dependencia *
                </label>
                <input
                  type="text"
                  value={formSaldo.dependenciaId}
                  disabled={!!saldoEditando}
                  onChange={(e) =>
                    setFormSaldo({
                      ...formSaldo,
                      dependenciaId: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="DEP-PLAN-01"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs disabled:bg-slate-50 disabled:text-slate-500"
                />
                {saldoEditando && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    El ID no se puede modificar una vez creado.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nombre de la dependencia *
                </label>
                <input
                  type="text"
                  value={formSaldo.nombreDependencia}
                  onChange={(e) =>
                    setFormSaldo({
                      ...formSaldo,
                      nombreDependencia: e.target.value,
                    })
                  }
                  placeholder="Subdirección Académica"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Cupo inicial (COP) *
                </label>
                <div className="flex items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-blue-500">
                  <span className="flex items-center justify-center px-3 bg-slate-100 text-slate-600 font-bold text-sm border-r border-slate-200 select-none">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={
                      formSaldo.presupuestoInicial
                        ? formatearMoneda(formSaldo.presupuestoInicial)
                        : ''
                    }
                    onChange={(e) =>
                      setFormSaldo({
                        ...formSaldo,
                        presupuestoInicial: Number(soloNumeros(e.target.value)) || 0,
                      })
                    }
                    placeholder="15.000.000"
                    className="flex-1 min-w-0 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none text-right font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Holgura específica de la dependencia (%)
                </label>
                <div className="flex items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-blue-500">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formSaldo.holguraPorcentaje}
                    onChange={(e) =>
                      setFormSaldo({
                        ...formSaldo,
                        holguraPorcentaje: Number(soloNumeros(e.target.value)) || 0,
                      })
                    }
                    className="flex-1 min-w-0 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none text-right font-bold"
                  />
                  <span className="flex items-center justify-center px-3 bg-slate-100 text-slate-600 font-bold text-sm border-l border-slate-200 select-none">
                    %
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Si la dependencia no requiere holgura propia, se usará la
                  holgura global configurada arriba.
                </p>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={formSaldo.activo}
                  onChange={(e) =>
                    setFormSaldo({ ...formSaldo, activo: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-slate-300 text-[#003DA5] focus:ring-[#003DA5]"
                />
                Activo (la dependencia puede reservar saldo)
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setSaldosModalAbierto(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void guardarSaldo()}
                disabled={guardando}
                className="px-4 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50"
              >
                {guardando ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}