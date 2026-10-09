import React, { useEffect, useState } from 'react';
import { AlertTriangle, MapPin, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { RegionPaa } from '../../types';
import { Permitido } from '../shared/Permitido';
import { Modal } from '../shared/Modal';

const VACIA = { codigo: '', nombre: '', prefijoLinea: '', unidadContratacion: '' };

const CLASE_CAMPO =
  'w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20';

/**
 * Las regiones que contratan con su propio bloque del PAA.
 *
 * El prefijo es lo que identifica sus líneas en la descripción («LINEA 12»,
 * «CHOCO 3») y la unidad de contratación es la comprobación: una línea cuyo
 * prefijo y unidad no casan es un error del archivo. Por eso el prefijo no se
 * cambia cuando ya hay líneas cargadas con él.
 */
export function RegionesPaa() {
  const [regiones, setRegiones] = useState<RegionPaa[] | null>(null);
  /** La región que se edita, `'nueva'` al crear, o nada. */
  const [editando, setEditando] = useState<RegionPaa | 'nueva' | null>(null);
  const [form, setForm] = useState(VACIA);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leer = () =>
    contratacionService.paa
      .regiones()
      .then((r) => {
        setRegiones(r);
        setError(null);
      })
      .catch((err: any) => setError(err.message));

  useEffect(() => {
    leer();
  }, []);

  const abrir = (r: RegionPaa | 'nueva') => {
    setForm(
      r === 'nueva'
        ? VACIA
        : { codigo: r.codigo, nombre: r.nombre, prefijoLinea: r.prefijoLinea, unidadContratacion: r.unidadContratacion },
    );
    setEditando(r);
  };

  const guardar = async () => {
    if (!editando) return;
    setGuardando(true);
    const datos = {
      nombre: form.nombre.trim(),
      prefijoLinea: form.prefijoLinea.trim().toUpperCase(),
      unidadContratacion: form.unidadContratacion.trim(),
    };
    try {
      if (editando === 'nueva') {
        await contratacionService.paa.crearRegion({ ...datos, codigo: form.codigo.trim().toUpperCase() });
        toast.success('Región creada');
      } else {
        await contratacionService.paa.actualizarRegion(editando.id, datos);
        toast.success('Región actualizada');
      }
      setEditando(null);
      await leer();
    } catch (err: any) {
      toast.error('No se guardó la región', { description: err.message });
    } finally {
      setGuardando(false);
    }
  };

  const alternar = async (r: RegionPaa) => {
    try {
      await contratacionService.paa.actualizarRegion(r.id, { activa: !r.activa });
      toast.success(r.activa ? 'Región desactivada: sus líneas ya no se ofrecen' : 'Región activa');
      await leer();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (error) {
    return (
      <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-red-800 m-0">{error}</p>
      </div>
    );
  }
  if (!regiones) return <p className="text-xs text-gray-400 m-0">Cargando las regiones…</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-xs text-gray-600">
          Un mismo archivo del PAA puede traer varias regiones: cada línea se reparte por su prefijo.
        </p>
        <Permitido accion="editar" punto="PAA">
          <button
            type="button"
            onClick={() => abrir('nueva')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-gray-300 bg-white text-slate-700 hover:border-[#003DA5] hover:text-[#003DA5]"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Nueva región
          </button>
        </Permitido>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-left text-gray-500">
            <tr>
              <th className="px-3 py-2 font-bold">Región</th>
              <th className="px-3 py-2 font-bold">Prefijo</th>
              <th className="px-3 py-2 font-bold">Unidad de contratación</th>
              <th className="px-3 py-2 font-bold">Estado</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {regiones.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
                    <MapPin className="w-3.5 h-3.5 text-[#003DA5]" aria-hidden="true" />
                    {r.nombre}
                  </span>
                  <span className="block font-mono text-gray-400">{r.codigo}</span>
                </td>
                <td className="px-3 py-2 font-mono">{r.prefijoLinea}</td>
                <td className="px-3 py-2">{r.unidadContratacion}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 font-bold ${r.activa ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                    {r.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Permitido accion="editar" punto="PAA">
                    <button
                      type="button"
                      onClick={() => abrir(r)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-[#003DA5] hover:underline"
                    >
                      <Pencil className="w-3 h-3" aria-hidden="true" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => alternar(r)}
                      className="px-2 py-1 text-xs font-bold text-slate-600 hover:underline"
                    >
                      {r.activa ? 'Desactivar' : 'Activar'}
                    </button>
                  </Permitido>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={editando !== null}
        onClose={() => setEditando(null)}
        title={editando === 'nueva' ? 'Nueva región' : `Editar ${editando?.nombre ?? ''}`}
        description="El prefijo identifica sus líneas; la unidad, comprueba que estén donde deben"
        size="small"
        icon={<MapPin className="w-5 h-5" />}
        footer={
          <>
            <button
              type="button"
              onClick={guardar}
              disabled={guardando || !form.nombre.trim() || !form.prefijoLinea.trim() || !form.unidadContratacion.trim() || (editando === 'nueva' && !form.codigo.trim())}
              className="px-3.5 py-2 text-xs font-extrabold rounded-lg text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => setEditando(null)}
              className="px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-700"
            >
              Cancelar
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {editando === 'nueva' && (
            <Campo id="region-codigo" etiqueta="Código interno" ayuda="En mayúsculas, sin espacios: META, SANTANDER.">
              <input id="region-codigo" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className={CLASE_CAMPO} />
            </Campo>
          )}
          <Campo id="region-nombre" etiqueta="Nombre">
            <input id="region-nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={CLASE_CAMPO} />
          </Campo>
          <Campo id="region-prefijo" etiqueta="Prefijo de sus líneas" ayuda="Lo que va antes del número en la descripción: «META 4 - …». No cambia si ya hay líneas cargadas.">
            <input id="region-prefijo" value={form.prefijoLinea} onChange={(e) => setForm({ ...form, prefijoLinea: e.target.value })} className={CLASE_CAMPO} />
          </Campo>
          <Campo id="region-unidad" etiqueta="Unidad de contratación, como la escribe el PAA">
            <input id="region-unidad" value={form.unidadContratacion} onChange={(e) => setForm({ ...form, unidadContratacion: e.target.value })} className={CLASE_CAMPO} />
          </Campo>
        </div>
      </Modal>
    </div>
  );
}

function Campo({ id, etiqueta, ayuda, children }: { id: string; etiqueta: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-gray-600 mb-1">
        {etiqueta}
      </label>
      {children}
      {ayuda && <p className="m-0 mt-1 text-xs text-gray-500">{ayuda}</p>}
    </div>
  );
}
