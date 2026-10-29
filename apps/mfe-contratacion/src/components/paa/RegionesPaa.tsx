import React, { useEffect, useState } from 'react';
import { AlertTriangle, MapPin, Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { DocumentoPaa, RegionPaa } from '../../types';
import { Permitido } from '../shared/Permitido';
import { Modal } from '../shared/Modal';


const CLASE_CAMPO =
  'w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20';

/**
 * Las regiones que contratan con su propio bloque del PAA.
 *
 * No se crean a mano: salen de los archivos que se cargan. El prefijo de cada
 * línea («LINEA 12», «CHOCO 3») es la región, y su unidad de contratación la
 * comprueba. El documento es el Excel en que llegaron por primera vez —el
 * suyo, o el de otro territorio, como Chocó en el de la Sede Central— y no
 * cambia, porque sus versiones y sus procesos ya quedaron ligados a él.
 *
 * Aquí solo se renombra, se corrige la unidad cuando Planeación la cambia de
 * nombre, o se desactiva.
 */
export function RegionesPaa() {
  const [regiones, setRegiones] = useState<RegionPaa[] | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoPaa[]>([]);
  const [editando, setEditando] = useState<RegionPaa | null>(null);
  const [form, setForm] = useState({ nombre: '', unidadContratacion: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leer = () =>
    Promise.all([contratacionService.paa.regiones(), contratacionService.paa.documentos()])
      .then(([r, d]) => {
        setRegiones(r);
        setDocumentos(d);
        setError(null);
      })
      .catch((err: any) => setError(err.message));

  useEffect(() => {
    leer();
  }, []);

  const abrir = (r: RegionPaa) => {
    setForm({ nombre: r.nombre, unidadContratacion: r.unidadContratacion });
    setEditando(r);
  };

  const guardar = async () => {
    if (!editando) return;
    setGuardando(true);
    try {
      await contratacionService.paa.actualizarRegion(editando.id, {
        nombre: form.nombre.trim(),
        unidadContratacion: form.unidadContratacion.trim(),
      });
      toast.success('Región actualizada');
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

  const nombreDocumento = (id: string) => documentos.find((d) => d.id === id)?.nombre ?? '—';

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
      <p className="m-0 text-xs text-gray-600">
        Las regiones salen de los archivos: cada prefijo nuevo que trae un PAA cargado en Documentos y versiones es una región, con la unidad de contratación de sus líneas.
      </p>

      {regiones.length === 0 && (
        <p className="m-0 rounded-lg border border-dashed border-gray-300 px-3 py-6 text-center text-xs text-gray-500">
          Todavía no hay regiones: aparecen al cargar el primer PAA.
        </p>
      )}

      {regiones.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-left text-gray-500">
              <tr>
                <th className="px-3 py-2 font-bold">Región</th>
                <th className="px-3 py-2 font-bold">Prefijo</th>
                <th className="px-3 py-2 font-bold">Sus líneas vienen en</th>
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
                  <td className="px-3 py-2">{nombreDocumento(r.documentoId)}</td>
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
      )}

      <Modal
        isOpen={editando !== null}
        onClose={() => setEditando(null)}
        title={`Editar ${editando?.nombre ?? ''}`}
        description="El prefijo y el documento salen del archivo; la unidad comprueba que sus líneas estén donde deben"
        size="small"
        icon={<MapPin className="w-5 h-5" />}
        footer={
          <>
            <button
              type="button"
              onClick={guardar}
              disabled={guardando || !form.nombre.trim() || !form.unidadContratacion.trim()}
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
          <Campo id="region-nombre" etiqueta="Nombre">
            <input id="region-nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={CLASE_CAMPO} />
          </Campo>
          <Campo
            id="region-unidad"
            etiqueta="Unidad de contratación, como la escribe el PAA"
            ayuda="Cámbiala solo si Planeación la renombró en el archivo: una carga cuya unidad no casa con la de la región queda inválida."
          >
            <input id="region-unidad" value={form.unidadContratacion} onChange={(e) => setForm({ ...form, unidadContratacion: e.target.value })} className={CLASE_CAMPO} />
          </Campo>
          {editando && (
            <p className="m-0 text-xs text-gray-500">
              Prefijo <span className="font-mono font-bold text-slate-700">{editando.prefijoLinea}</span>; sus líneas vienen en el PAA de{' '}
              <span className="font-bold text-slate-700">{nombreDocumento(editando.documentoId)}</span>.
            </p>
          )}
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
