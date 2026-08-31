import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, FileSignature, Plus, Undo2, X } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { TipologiaConfigurable } from '../../types';

const VACIA = {
  codigo: '',
  nombre: '',
  descripcion: '',
  exigeGarantias: true,
};

const campo =
  'w-full px-2.5 py-1.5 text-[12.5px] rounded-md border border-gray-300 bg-white focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20';

/**
 * Tipologías de contrato (EFDS-1161).
 *
 * La historia habla de 16 tipologías sin enumerarlas, y los documentos fuente
 * tampoco las listan: lo sembrado es un punto de partida, así que Contratación
 * completa la suya desde aquí en vez de pedir una migración cada vez.
 *
 * Vive dentro de la configuración de etapas y no en una sección propia del menú
 * porque es un parámetro del flujo, igual que los umbrales o los plazos: se
 * ajusta una vez y gobierna todos los procesos que vengan después.
 */
export function TipologiasContrato() {
  const [tipologias, setTipologias] = useState<TipologiaConfigurable[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [creando, setCreando] = useState(false);
  const [nueva, setNueva] = useState(VACIA);

  const leer = () =>
    contratacionService
      .tipologias()
      .then((lista) => {
        setTipologias(lista);
        setError(null);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));

  useEffect(() => {
    leer();
  }, []);

  const limpiar = () => {
    setNueva(VACIA);
    setCreando(false);
  };

  const crear = async () => {
    const codigo = nueva.codigo.trim().toUpperCase().replace(/\s+/g, '_');
    if (!codigo || !nueva.nombre.trim()) return;

    setGuardando(true);
    try {
      await contratacionService.guardarTipologia({
        codigo,
        nombre: nueva.nombre.trim(),
        descripcion: nueva.descripcion.trim() || undefined,
        exigeGarantias: nueva.exigeGarantias,
        orden: (tipologias.at(-1)?.orden ?? 0) + 10,
      });
      await leer();
      limpiar();
      toast.success('Tipología disponible para los contratos nuevos');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  /** Cambia si la tipología exige garantías; lo consume la legalización. */
  const alternarGarantias = async (t: TipologiaConfigurable) => {
    setGuardando(true);
    try {
      await contratacionService.guardarTipologia({
        codigo: t.codigo,
        nombre: t.nombre,
        descripcion: t.descripcion ?? undefined,
        exigeGarantias: !t.exigeGarantias,
      });
      await leer();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const alternarActiva = async (t: TipologiaConfigurable) => {
    setGuardando(true);
    try {
      if (t.activo) {
        await contratacionService.retirarTipologia(t.codigo);
        toast.success('Retirada; los contratos que ya la usaron la conservan');
      } else {
        await contratacionService.guardarTipologia({
          codigo: t.codigo,
          nombre: t.nombre,
          descripcion: t.descripcion ?? undefined,
          activo: true,
        });
        toast.success('Vuelve a ofrecerse');
      }
      await leer();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return <p className="text-[11.5px] text-slate-400 m-0">Cargando las tipologías…</p>;
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2"
      >
        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-red-800 m-0">{error}</p>
      </div>
    );
  }

  const activas = tipologias.filter((t) => t.activo).length;

  // Los mismos botones en la tabla y en las tarjetas: definirlos una vez evita
  // que las dos vistas se desactualicen entre sí.
  const botonGarantias = (t: TipologiaConfigurable) => (
    <button
      type="button"
      disabled={guardando}
      onClick={() => alternarGarantias(t)}
      aria-label={`${t.exigeGarantias ? 'Dejar de exigir' : 'Exigir'} garantías en ${t.nombre}`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold transition-colors disabled:opacity-50 ${
        t.exigeGarantias
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
          : 'border-gray-200 bg-white text-slate-500 hover:bg-slate-50'
      }`}
    >
      {t.exigeGarantias ? 'Sí las exige' : 'No las exige'}
    </button>
  );

  const botonEstado = (t: TipologiaConfigurable) => (
    <button
      type="button"
      disabled={guardando}
      onClick={() => alternarActiva(t)}
      aria-label={`${t.activo ? 'Retirar' : 'Volver a ofrecer'} ${t.nombre}`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors disabled:opacity-50 ${
        t.activo
          ? 'text-slate-500 hover:text-red-600 hover:bg-red-50'
          : 'text-[#003DA5] hover:bg-blue-50'
      }`}
    >
      {t.activo ? (
        <>
          <X className="w-3 h-3" />
          Retirar
        </>
      ) : (
        <>
          <Check className="w-3 h-3" strokeWidth={3} />
          Ofrecer
        </>
      )}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Tipologías de contrato</p>
          <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">
            Con cuál de estas se elabora el contrato en la actividad 8.1. La tipología decide qué
            formato del SIG se ofrece y si el contrato exige garantías.
          </p>
        </div>
        {!creando ? (
          <button
            type="button"
            onClick={() => setCreando(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11.5px] font-extrabold rounded-md text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar tipología
          </button>
        ) : null}
      </div>

      {creando ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Nueva tipología</p>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="tip-codigo" className="block text-xs font-bold text-gray-600 mb-1.5">
                Código <span className="text-red-600">*</span>
              </label>
              <input
                id="tip-codigo"
                type="text"
                value={nueva.codigo}
                onChange={(e) => setNueva((p) => ({ ...p, codigo: e.target.value }))}
                placeholder="CONVENIO_SOLIDARIO"
                className={campo}
              />
              {/* Se dice aquí porque después no se puede cambiar. */}
              <p className="text-[11px] text-slate-500 m-0 mt-1 leading-relaxed">
                Identifica la tipología y no se cambia después: los contratos firmados la
                referencian.
              </p>
            </div>
            <div>
              <label htmlFor="tip-nombre" className="block text-xs font-bold text-gray-600 mb-1.5">
                Nombre <span className="text-red-600">*</span>
              </label>
              <input
                id="tip-nombre"
                type="text"
                value={nueva.nombre}
                onChange={(e) => setNueva((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="Convenio solidario"
                className={campo}
              />
            </div>
          </div>

          <div>
            <label htmlFor="tip-desc" className="block text-xs font-bold text-gray-600 mb-1.5">
              Qué se contrata con ella
            </label>
            <textarea
              id="tip-desc"
              rows={2}
              value={nueva.descripcion}
              onChange={(e) => setNueva((p) => ({ ...p, descripcion: e.target.value }))}
              className={campo}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={nueva.exigeGarantias}
              onChange={(e) => setNueva((p) => ({ ...p, exigeGarantias: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-[#003DA5] focus:ring-[#003DA5]"
            />
            <span className="text-[11.5px] text-slate-700">
              Los contratos de esta tipología exigen garantías
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={guardando || !nueva.codigo.trim() || !nueva.nombre.trim()}
              onClick={crear}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11.5px] font-extrabold rounded-md text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm active:scale-95 disabled:opacity-50 transition-all"
            >
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
              Guardar
            </button>
            <button
              type="button"
              disabled={guardando}
              onClick={limpiar}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold rounded-md border border-amber-300 bg-white text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-all"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {/* La HU habla de 16 y lo sembrado es menos: decirlo evita que se dé por
          completa una lista que Contratación todavía tiene que revisar. */}
      {activas < 16 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-900" />
          <div className="min-w-0">
            <p className="text-[12.5px] font-bold text-amber-900 m-0">
              Hay {activas} tipologías en circulación
            </p>
            <p className="text-[11.5px] text-amber-900 m-0 mt-0.5 leading-relaxed">
              La historia menciona 16 sin enumerarlas y los documentos fuente tampoco las listan.
              Lo cargado es un punto de partida: completa la lista con las que use la entidad.
            </p>
          </div>
        </div>
      ) : null}

      {/* Tabla en escritorio y tarjetas en móvil, como auditoría y control
          interno: el scroll horizontal dejaba el código y los botones
          escondidos fuera de la pantalla del teléfono. */}
      <ul className="lg:hidden m-0 p-0 list-none rounded-lg border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
        {tipologias.map((t) => (
          <li key={t.codigo} className={`px-3.5 py-3 ${t.activo ? '' : 'bg-slate-50'}`}>
            <p
              className={`text-[12.5px] font-bold m-0 break-words ${
                t.activo ? 'text-slate-800' : 'text-slate-400 line-through'
              }`}
            >
              {t.nombre}
            </p>
            <code className="inline-block mt-1 text-[10.5px] font-mono text-slate-600 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 break-all">
              {t.codigo}
            </code>
            {t.descripcion ? (
              <p className="text-[11px] text-slate-500 m-0 mt-1 leading-relaxed break-words">
                {t.descripcion}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
              {botonGarantias(t)}
              {botonEstado(t)}
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden lg:block rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {/* Anchos fijos: sin ellos, una descripción larga ensancha su columna
              y las demás bailan de fila en fila. */}
          <table className="w-full text-left table-fixed min-w-[640px]">
            <colgroup>
              <col />
              <col className="w-[180px]" />
              <col className="w-[120px]" />
              <col className="w-[100px]" />
            </colgroup>
            <thead className="bg-slate-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-500">
                  Tipología
                </th>
                <th className="px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-500">
                  Código
                </th>
                <th className="px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-500">
                  Garantías
                </th>
                <th className="px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-500">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {tipologias.map((t) => (
                <tr
                  key={t.codigo}
                  className={`border-b border-gray-100 last:border-0 ${
                    t.activo ? '' : 'bg-slate-50'
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <FileSignature
                        className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                          t.activo ? 'text-slate-500' : 'text-slate-300'
                        }`}
                      />
                      <div className="min-w-0">
                        <p
                          className={`text-[12.5px] font-bold m-0 break-words ${
                            t.activo ? 'text-slate-800' : 'text-slate-400 line-through'
                          }`}
                        >
                          {t.nombre}
                        </p>
                        {t.descripcion ? (
                          <p className="text-[11px] text-slate-500 m-0 mt-0.5 leading-relaxed break-words">
                            {t.descripcion}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <code className="inline-block text-[10.5px] font-mono text-slate-600 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 break-all">
                      {t.codigo}
                    </code>
                  </td>
                  <td className="px-3 py-2.5">{botonGarantias(t)}</td>
                  <td className="px-3 py-2.5">{botonEstado(t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
