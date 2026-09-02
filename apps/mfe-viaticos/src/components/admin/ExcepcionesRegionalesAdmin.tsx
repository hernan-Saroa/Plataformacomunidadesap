import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import viaticosService from '../../services/api/viaticosService';
import { TarifaRegionalExcepcion } from '../../types/parametrizacion';

export default function ExcepcionesRegionalesAdmin() {
  const [excepciones, setExcepciones] = useState<TarifaRegionalExcepcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<TarifaRegionalExcepcion | null>(null);
  const [form, setForm] = useState({
    departamento: '',
    esNuevoDepartamento: true,
    tarifaDiaria: 0,
    decretoReferencia: '',
    activo: true,
  });

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await viaticosService.obtenerExcepcionesRegionales();
      setExcepciones(data);
    } catch (e) {
      setError('Error cargando excepciones');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ departamento: '', esNuevoDepartamento: true, tarifaDiaria: 0, decretoReferencia: '', activo: true });
    setModalAbierto(true);
  };

  const abrirEditar = (excepcion: TarifaRegionalExcepcion) => {
    setEditando(excepcion);
    setForm({
      departamento: excepcion.departamento,
      esNuevoDepartamento: excepcion.esNuevoDepartamento,
      tarifaDiaria: excepcion.tarifaDiaria,
      decretoReferencia: excepcion.decretoReferencia || '',
      activo: excepcion.activo,
    });
    setModalAbierto(true);
  };

  const guardar = async () => {
    try {
      if (editando) {
        await viaticosService.actualizarExcepcionRegional(editando.id, form);
      } else {
        await viaticosService.crearExcepcionRegional(form);
      }
      setModalAbierto(false);
      cargar();
    } catch (e) {
      setError('Error guardando excepción');
    }
  };

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar esta excepción regional?')) return;
    try {
      await viaticosService.eliminarExcepcionRegional(id);
      cargar();
    } catch (e) {
      setError('Error eliminando excepción');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-slate-500">Gestiona las excepciones regionales (Art. 5 Decreto 314 de 2026).</p>
        <button
          type="button"
          onClick={abrirNuevo}
          className="inline-flex items-center gap-2 px-3 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-lg text-xs font-bold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva Excepción
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
                <th className="text-left px-3 py-2">Departamento</th>
                <th className="text-center px-3 py-2">Nuevo Depto</th>
                <th className="text-right px-3 py-2">Tarifa Diaria</th>
                <th className="text-left px-3 py-2">Decreto Ref.</th>
                <th className="text-center px-3 py-2">Activo</th>
                <th className="text-center px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {excepciones.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-medium">{e.departamento}</td>
                  <td className="px-3 py-2 text-center">{e.esNuevoDepartamento ? 'Sí' : 'No'}</td>
                  <td className="px-3 py-2 text-right font-bold">${e.tarifaDiaria.toLocaleString('es-CO')}</td>
                  <td className="px-3 py-2">{e.decretoReferencia || '-'}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${e.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {e.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
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
              {excepciones.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                    No hay excepciones regionales configuradas
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
              {editando ? 'Editar Excepción Regional' : 'Nueva Excepción Regional'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Departamento</label>
                <input
                  type="text"
                  value={form.departamento}
                  onChange={(e) => setForm({ ...form, departamento: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.esNuevoDepartamento}
                  onChange={(e) => setForm({ ...form, esNuevoDepartamento: e.target.checked })}
                />
                <label className="text-xs font-bold text-slate-700">Es nuevo departamento</label>
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
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Decreto Referencia</label>
                <input
                  type="text"
                  value={form.decretoReferencia}
                  onChange={(e) => setForm({ ...form, decretoReferencia: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                />
                <label className="text-xs font-bold text-slate-700">Activo</label>
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
