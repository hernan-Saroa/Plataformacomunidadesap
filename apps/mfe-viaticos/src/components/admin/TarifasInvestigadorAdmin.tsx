import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import viaticosService from '../../services/api/viaticosService';
import { TarifaInvestigador } from '../../types/parametrizacion';
import { formatearMoneda, soloNumeros } from '../../utils/viaticosUtils';

export default function TarifasInvestigadorAdmin() {
  const [tarifas, setTarifas] = useState<TarifaInvestigador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<TarifaInvestigador | null>(null);
  const [form, setForm] = useState({ categoriaInvestigador: '', tarifaDiaria: 0 });

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await viaticosService.obtenerTarifasInvestigadores();
      setTarifas(data);
    } catch (e) {
      setError('Error cargando tarifas');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ categoriaInvestigador: '', tarifaDiaria: 0 });
    setModalAbierto(true);
  };

  const abrirEditar = (tarifa: TarifaInvestigador) => {
    setEditando(tarifa);
    setForm({ categoriaInvestigador: tarifa.categoriaInvestigador, tarifaDiaria: tarifa.tarifaDiaria });
    setModalAbierto(true);
  };

  const guardar = async () => {
    try {
      if (editando) {
        await viaticosService.actualizarTarifaInvestigador(editando.id, form);
      } else {
        await viaticosService.crearTarifaInvestigador(form);
      }
      setModalAbierto(false);
      cargar();
    } catch (e) {
      setError('Error guardando tarifa');
    }
  };

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar esta tarifa?')) return;
    try {
      await viaticosService.eliminarTarifaInvestigador(id);
      cargar();
    } catch (e) {
      setError('Error eliminando tarifa');
    }
  };

  const inputMoneda = (valor: number) => formatearMoneda(valor);

  const onChangeMoneda = (valor: string) => {
    const limpio = soloNumeros(valor);
    const num = Number(limpio) || 0;
    setForm((prev) => ({ ...prev, tarifaDiaria: num }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-slate-500">Gestiona las tarifas diarias por categoría de investigador.</p>
        <button
          type="button"
          onClick={abrirNuevo}
          className="inline-flex items-center gap-2 px-3 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-lg text-xs font-bold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva Tarifa
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
                <th className="text-left px-3 py-2">Categoría</th>
                <th className="text-right px-3 py-2">Tarifa Diaria</th>
                <th className="text-center px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tarifas.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-medium">{t.categoriaInvestigador}</td>
                  <td className="px-3 py-2 text-right font-bold">{formatearMoneda(t.tarifaDiaria)}</td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => abrirEditar(t)} className="text-slate-500 hover:text-[#003DA5]">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => eliminar(t.id)} className="text-slate-500 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {tarifas.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-slate-400">
                    No hay tarifas configuradas
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
              {editando ? 'Editar Tarifa' : 'Nueva Tarifa'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Categoría</label>
                <input
                  type="text"
                  value={form.categoriaInvestigador}
                  onChange={(e) => setForm({ ...form, categoriaInvestigador: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tarifa Diaria</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={inputMoneda(form.tarifaDiaria)}
                    onChange={(e) => onChangeMoneda(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-right font-bold"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">{formatearMoneda(form.tarifaDiaria)}</p>
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
