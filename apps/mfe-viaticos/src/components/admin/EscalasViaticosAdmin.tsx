import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import viaticosService from '../../services/api/viaticosService';
import { EscalaViatico } from '../../types/parametrizacion';

export default function EscalasViaticosAdmin() {
  const [escalas, setEscalas] = useState<EscalaViatico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<EscalaViatico | null>(null);
  const [form, setForm] = useState({
    decretoVigente: '',
    anoVigencia: 2026,
    rangoMinimo: 0,
    rangoMaximo: 0,
    tarifaDiaria: 0,
  });

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await viaticosService.obtenerEscalas();
      setEscalas(data);
    } catch (e) {
      setError('Error cargando escalas');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ decretoVigente: '', anoVigencia: 2026, rangoMinimo: 0, rangoMaximo: 0, tarifaDiaria: 0 });
    setModalAbierto(true);
  };

  const abrirEditar = (escala: EscalaViatico) => {
    setEditando(escala);
    setForm({
      decretoVigente: escala.decretoVigente,
      anoVigencia: escala.anoVigencia,
      rangoMinimo: escala.rangoMinimo,
      rangoMaximo: escala.rangoMaximo,
      tarifaDiaria: escala.tarifaDiaria,
    });
    setModalAbierto(true);
  };

  const guardar = async () => {
    try {
      if (editando) {
        await viaticosService.actualizarEscala(editando.id, form);
      } else {
        await viaticosService.crearEscala(form);
      }
      setModalAbierto(false);
      cargar();
    } catch (e) {
      setError('Error guardando escala');
    }
  };

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar esta escala?')) return;
    try {
      await viaticosService.eliminarEscala(id);
      cargar();
    } catch (e) {
      setError('Error eliminando escala');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-slate-500">Gestiona las escalas de viáticos por rango salarial.</p>
        <button
          type="button"
          onClick={abrirNuevo}
          className="inline-flex items-center gap-2 px-3 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-lg text-xs font-bold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva Escala
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}

      {cargando ? (
        <div className="py-10 text-center text-xs text-slate-500">Cargando...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="text-left px-3 py-2">Decreto</th>
                <th className="text-left px-3 py-2">Año</th>
                <th className="text-right px-3 py-2">Rango Mínimo</th>
                <th className="text-right px-3 py-2">Rango Máximo</th>
                <th className="text-right px-3 py-2">Tarifa Diaria</th>
                <th className="text-center px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {escalas.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-medium">{e.decretoVigente}</td>
                  <td className="px-3 py-2">{e.anoVigencia}</td>
                  <td className="px-3 py-2 text-right">${e.rangoMinimo.toLocaleString('es-CO')}</td>
                  <td className="px-3 py-2 text-right">${e.rangoMaximo.toLocaleString('es-CO')}</td>
                  <td className="px-3 py-2 text-right font-bold">${e.tarifaDiaria.toLocaleString('es-CO')}</td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => abrirEditar(e)} className="text-slate-500 hover:text-[#003DA5]">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => eliminar(e.id)} className="text-slate-500 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {escalas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                    No hay escalas configuradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4">
              {editando ? 'Editar Escala' : 'Nueva Escala'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Decreto Vigente</label>
                <input
                  type="text"
                  value={form.decretoVigente}
                  onChange={(e) => setForm({ ...form, decretoVigente: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Año Vigencia</label>
                <input
                  type="number"
                  value={form.anoVigencia}
                  onChange={(e) => setForm({ ...form, anoVigencia: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Rango Mínimo</label>
                  <input
                    type="number"
                    value={form.rangoMinimo}
                    onChange={(e) => setForm({ ...form, rangoMinimo: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Rango Máximo</label>
                  <input
                    type="number"
                    value={form.rangoMaximo}
                    onChange={(e) => setForm({ ...form, rangoMaximo: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tarifa Diaria</label>
                <input
                  type="number"
                  value={form.tarifaDiaria}
                  onChange={(e) => setForm({ ...form, tarifaDiaria: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardar}
                className="px-4 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-lg text-xs font-bold"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
