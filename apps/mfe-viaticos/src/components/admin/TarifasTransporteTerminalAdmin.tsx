import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, AlertCircle, Plane, MapPin } from 'lucide-react';
import viaticosService from '../../services/api/viaticosService';
import { TarifaTransporteTerminal } from '../../types/parametrizacion';
import { Geopolitica } from '../../types/viaticos';
import { formatearMoneda, soloNumeros } from '../../utils/viaticosUtils';

export default function TarifasTransporteTerminalAdmin() {
  const [tarifas, setTarifas] = useState<TarifaTransporteTerminal[]>([]);
  const [departamentos, setDepartamentos] = useState<Geopolitica[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<TarifaTransporteTerminal | null>(null);
  const [form, setForm] = useState({
    departamento: '',
    departamentoId: null as number | null,
    ciudad: '',
    ciudadAeropuerto: '',
    valorMaximoTrayecto: 0,
    activo: true,
  });

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const [data, deptos] = await Promise.all([
        viaticosService.obtenerTarifasTransporteTerminal(),
        viaticosService.obtenerDepartamentos(),
      ]);
      setTarifas(data);
      setDepartamentos(deptos);
    } catch {
      setError('Error cargando tarifas de transporte terminal');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrirNuevo = () => {
    setEditando(null);
    setForm({
      departamento: '',
      departamentoId: null,
      ciudad: '',
      ciudadAeropuerto: '',
      valorMaximoTrayecto: 0,
      activo: true,
    });
    setModalAbierto(true);
  };

  const abrirEditar = (tarifa: TarifaTransporteTerminal) => {
    setEditando(tarifa);
    const deptoNombre = tarifa.departamento || tarifa.ciudad || '';
    setForm({
      departamento: deptoNombre,
      departamentoId: tarifa.departamentoId ?? null,
      ciudad: tarifa.ciudad || deptoNombre,
      ciudadAeropuerto: tarifa.ciudadAeropuerto,
      valorMaximoTrayecto: Number(tarifa.valorMaximoTrayecto),
      activo: tarifa.activo ?? true,
    });
    setModalAbierto(true);
  };

  const onSelectDepartamento = (nombreDepto: string) => {
    if (!nombreDepto) {
      setForm((prev) => ({
        ...prev,
        departamento: '',
        departamentoId: null,
        ciudad: '',
      }));
      return;
    }

    if (nombreDepto === 'Otros') {
      setForm((prev) => ({
        ...prev,
        departamento: 'Otros',
        departamentoId: null,
        ciudad: 'Otros',
        ciudadAeropuerto: prev.ciudadAeropuerto || 'Otros',
      }));
      return;
    }

    const deptoEncontrado = departamentos.find(
      (d) =>
        d.nomDivGeopolitica.trim().toLowerCase() ===
        nombreDepto.trim().toLowerCase(),
    );

    const idDepto = deptoEncontrado
      ? Number(deptoEncontrado.codDepartamento ?? deptoEncontrado.codGeopolitica ?? deptoEncontrado.idGeopolitica) || null
      : null;

    setForm((prev) => ({
      ...prev,
      departamento: nombreDepto,
      departamentoId: idDepto,
      ciudad: nombreDepto,
    }));
  };

  const guardar = async () => {
    try {
      if (!form.departamento.trim()) {
        setError('El departamento de geopolítica es obligatorio');
        return;
      }
      if (!form.ciudadAeropuerto.trim()) {
        setError('La ciudad del aeropuerto es obligatoria');
        return;
      }
      if (form.valorMaximoTrayecto <= 0) {
        setError('El valor máximo a reconocer debe ser mayor a cero');
        return;
      }

      const payload = {
        departamento: form.departamento.trim(),
        departamentoId: form.departamentoId,
        ciudad: form.ciudad || form.departamento,
        ciudadAeropuerto: form.ciudadAeropuerto.trim(),
        valorMaximo: form.valorMaximoTrayecto,
        activo: form.activo,
      };

      if (editando && editando.id) {
        await viaticosService.actualizarTarifaTransporteTerminal(
          editando.id,
          payload as any,
        );
      } else {
        await viaticosService.crearTarifaTransporteTerminal(payload as any);
      }
      setModalAbierto(false);
      cargar();
    } catch {
      setError('Error guardando la tarifa');
    }
  };

  const eliminar = async (id?: number) => {
    if (!id) return;
    if (!confirm('¿Eliminar esta tarifa de transporte a terminal aérea?')) return;
    try {
      await viaticosService.eliminarTarifaTransporteTerminal(id);
      cargar();
    } catch {
      setError('Error eliminando tarifa');
    }
  };

  const onChangeMoneda = (valor: string) => {
    const limpio = soloNumeros(valor);
    const num = Number(limpio) || 0;
    setForm((prev) => ({ ...prev, valorMaximoTrayecto: num }));
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Plane className="w-4 h-4 text-[#003DA5]" />
            Tarifas de Transporte a Terminales Aéreas (Resolución)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tarifas máximas por trayecto para desplazamientos aéreos, alineadas con los departamentos de Geopolítica (GF-FO-023).
          </p>
        </div>
        <button
          type="button"
          onClick={abrirNuevo}
          className="inline-flex items-center gap-2 px-3 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-lg text-xs font-bold transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva Tarifa Terminal
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}

      {cargando ? (
        <div className="text-center py-8 text-xs text-slate-400">Cargando tarifas y geopolítica...</div>
      ) : tarifas.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-400">No hay tarifas registradas.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Departamento (Geopolítica)</th>
                <th className="px-4 py-3">Ciudad / Aeropuerto</th>
                <th className="px-4 py-3 text-right">Valor Máximo por Trayecto</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tarifas.map((t) => {
                const nombreDepto = t.departamento || t.ciudad;
                return (
                  <tr key={t.id || nombreDepto} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{nombreDepto}</span>
                        {t.departamentoId && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                            ID: {t.departamentoId}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{t.ciudadAeropuerto}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                      {formatearMoneda(Number(t.valorMaximoTrayecto))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          t.activo !== false
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {t.activo !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => abrirEditar(t)}
                          className="p-1.5 text-slate-600 hover:text-[#003DA5] hover:bg-slate-100 rounded-md transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminar(t.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Crear / Editar */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Plane className="w-4 h-4 text-[#003DA5]" />
              {editando ? 'Editar Tarifa Terminal' : 'Nueva Tarifa Terminal'}
            </h4>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Departamento (Geopolítica) <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.departamento}
                  onChange={(e) => onSelectDepartamento(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#003DA5] focus:outline-none bg-white"
                >
                  <option value="">-- Seleccionar Departamento --</option>
                  <option value="Otros">Otros (Resto del País / Contingente)</option>
                  {departamentos
                    .filter((d) => d.tipDivision === 'DEPTO' || !d.tipDivision)
                    .sort((a, b) =>
                      a.nomDivGeopolitica.localeCompare(b.nomDivGeopolitica, 'es'),
                    )
                    .map((depto) => (
                      <option key={depto.idGeopolitica} value={depto.nomDivGeopolitica}>
                        {depto.nomDivGeopolitica} (DANE/ID: {depto.codDepartamento || depto.idGeopolitica})
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Alineado directamente con la estructura de geopolítica institucional.
                </p>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Ciudad / Aeropuerto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.ciudadAeropuerto}
                  onChange={(e) => setForm({ ...form, ciudadAeropuerto: e.target.value })}
                  placeholder="Ej: ANTIOQUIA (Rionegro), Otros"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#003DA5] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Valor Máximo por Trayecto (COP) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
                  <input
                    type="text"
                    value={
                      form.valorMaximoTrayecto
                        ? form.valorMaximoTrayecto.toLocaleString('es-CO')
                        : ''
                    }
                    onChange={(e) => onChangeMoneda(e.target.value)}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-[#003DA5] focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Valor reconocido por cada trayecto terrestre entre la ciudad y la terminal aérea con incremento de ley.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="tarifaTerminalActiva"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="w-4 h-4 text-[#003DA5] rounded border-slate-300 focus:ring-[#003DA5]"
                />
                <label htmlFor="tarifaTerminalActiva" className="text-slate-700 select-none">
                  Tarifa activa y disponible para autoliquidador
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardar}
                className="px-4 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
              >
                {editando ? 'Guardar Cambios' : 'Crear Tarifa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
