import React, { useEffect, useState } from 'react';
import { AlertTriangle, CalendarRange, Check, ChevronDown, ChevronRight, Plus, Trash2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { CronogramaPredeterminado as Predeterminado, ResumenPredeterminado } from '../../types';
import { Boton, campo } from '../shared/PiezasPanel';
import { ETAPAS_DEL_CRONOGRAMA, NOMBRE_ETAPA } from '../cronograma/etapas';

/** Lo que se edita: qué etapas salen, qué actividades del flujo y las propias. */
interface Borrador {
  etapas: Set<number>;
  numerales: Set<string>;
  propias: { clave: number; nombre: string; etapa: number }[];
}

const deDatos = (d: Predeterminado): Borrador => ({
  etapas: new Set(d.etapas),
  numerales: new Set(d.actividades.filter((a) => a.incluida).map((a) => a.numeral)),
  propias: d.propias.map((p, i) => ({ clave: i, nombre: p.nombre, etapa: p.etapa })),
});

/**
 * Cronograma predeterminado por modalidad — Configuración (140; sin plazos
 * desde la 144, EFDS-1152).
 *
 * Aquí no se fijan fechas ni días: solo qué etapas y qué actividades salen de
 * entrada en el cronograma de la 5.2 de un proceso de la modalidad. Las fechas
 * y el aviso se ponen en la 5.2 de cada proceso, y allí se puede agregar lo que
 * no salió por defecto.
 */
export function CronogramaPredeterminado() {
  const [resumen, setResumen] = useState<ResumenPredeterminado[]>([]);
  const [modalidad, setModalidad] = useState('');
  const [datos, setDatos] = useState<Predeterminado | null>(null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [cambiado, setCambiado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [siguiente, setSiguiente] = useState(1000);

  useEffect(() => {
    contratacionService
      .resumenCronogramaPredeterminado()
      .then((r) => {
        setResumen(r);
        setModalidad((m) => m || r[0]?.modalidad || '');
      })
      .catch((err: any) => setError(err.message));
  }, []);

  const cargar = (d: Predeterminado) => {
    setDatos(d);
    setBorrador(deDatos(d));
    setCambiado(false);
  };

  useEffect(() => {
    if (!modalidad) return;
    setDatos(null);
    setAbierta(null);
    contratacionService
      .cronogramaPredeterminado(modalidad)
      .then(cargar)
      .catch((err: any) => setError(err.message));
  }, [modalidad]);

  const editar = (cambio: (b: Borrador) => Borrador) => {
    setBorrador((b) => (b ? cambio(b) : b));
    setCambiado(true);
  };

  /** Quitar una etapa quita también sus actividades: no saldrían en ningún lado. */
  const alternarEtapa = (etapa: number, sale: boolean) =>
    editar((b) => {
      const etapas = new Set(b.etapas);
      const numerales = new Set(b.numerales);
      if (sale) {
        etapas.add(etapa);
        // Al incluirla por primera vez salen todas sus actividades; se quitan las que no.
        if (![...numerales].some((n) => datos!.actividades.find((a) => a.numeral === n)?.etapa === etapa)) {
          datos!.actividades.filter((a) => a.etapa === etapa).forEach((a) => numerales.add(a.numeral));
        }
      } else {
        etapas.delete(etapa);
        datos!.actividades.filter((a) => a.etapa === etapa).forEach((a) => numerales.delete(a.numeral));
      }
      return {
        etapas,
        numerales,
        propias: sale ? b.propias : b.propias.filter((p) => p.etapa !== etapa),
      };
    });

  const alternarActividad = (numeral: string, sale: boolean) =>
    editar((b) => {
      const numerales = new Set(b.numerales);
      if (sale) numerales.add(numeral);
      else numerales.delete(numeral);
      return { ...b, numerales };
    });

  const todasDeLaEtapa = (etapa: number, sale: boolean) =>
    editar((b) => {
      const numerales = new Set(b.numerales);
      datos!.actividades
        .filter((a) => a.etapa === etapa)
        .forEach((a) => (sale ? numerales.add(a.numeral) : numerales.delete(a.numeral)));
      return { ...b, numerales };
    });

  const agregarPropia = (etapa: number) => {
    editar((b) => ({ ...b, propias: [...b.propias, { clave: siguiente, nombre: '', etapa }] }));
    setSiguiente((n) => n + 1);
  };

  if (error) {
    return (
      <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-red-800 m-0">{error}</p>
      </div>
    );
  }

  const problema = borrador
    ? (() => {
        if (borrador.propias.some((p) => !p.nombre.trim())) return 'Ponle nombre a la actividad propia';
        const vistas = new Set<string>();
        for (const p of borrador.propias) {
          const llave = `${p.etapa}:${p.nombre.trim().toLowerCase()}`;
          if (vistas.has(llave)) return `«${p.nombre.trim()}» aparece dos veces en la etapa ${p.etapa}`;
          vistas.add(llave);
        }
        return null;
      })()
    : null;

  const guardar = async () => {
    if (!borrador || problema || !modalidad) return;
    setGuardando(true);
    try {
      const d = await contratacionService.guardarCronogramaPredeterminado(modalidad, {
        etapas: [...borrador.etapas].sort((a, b) => a - b),
        numerales: [...borrador.numerales],
        propias: borrador.propias.map((p) => ({ nombre: p.nombre.trim(), etapa: p.etapa })),
      });
      cargar(d);
      setResumen((r) =>
        r.map((x) =>
          x.modalidad === modalidad
            ? { ...x, etapas: d.etapas.length, actividades: d.actividades.filter((a) => a.incluida).length + d.propias.length }
            : x,
        ),
      );
      toast.success(`Cronograma predeterminado de ${d.nombre} guardado`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-4 space-y-4">
      <div className="flex items-start gap-2.5">
        <CalendarRange className="w-5 h-5 mt-0.5 text-[#003DA5] flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 m-0">Cronograma predeterminado por modalidad</p>
          <p className="text-xs text-slate-600 m-0 mt-0.5 leading-relaxed">
            Qué etapas y qué actividades salen de entrada en el cronograma (5.2) de un proceso de cada
            modalidad. Aquí no se ponen fechas: las fechas y los avisos se fijan en la 5.2 de cada
            proceso, y allí se puede agregar lo que no salga por defecto.
          </p>
        </div>
      </div>

      <label className="block">
        <span className="block text-xs font-bold text-gray-600 mb-1.5">Modalidad</span>
        <select
          aria-label="Modalidad del cronograma predeterminado"
          value={modalidad}
          onChange={(e) => {
            if (cambiado) toast.message('Los cambios sin guardar de la otra modalidad se descartaron');
            setModalidad(e.target.value);
          }}
          className={campo}
          style={{ maxWidth: 420 }}
        >
          {resumen.map((r) => (
            <option key={r.modalidad} value={r.modalidad}>
              {r.nombre} ·{' '}
              {r.etapas === 0
                ? 'sin configurar'
                : `${r.etapas} ${r.etapas === 1 ? 'etapa' : 'etapas'}, ${r.actividades} ${r.actividades === 1 ? 'actividad' : 'actividades'}`}
            </option>
          ))}
        </select>
      </label>

      {!datos || !borrador ? (
        <p className="text-xs text-slate-400 m-0">Cargando…</p>
      ) : (
        <>
          <ul className="list-none m-0 p-0 space-y-1.5">
            {ETAPAS_DEL_CRONOGRAMA.map((etapa) => {
              const sale = borrador.etapas.has(etapa);
              const delFlujo = datos.actividades.filter((a) => a.etapa === etapa);
              const propias = borrador.propias.filter((p) => p.etapa === etapa);
              const marcadas = delFlujo.filter((a) => borrador.numerales.has(a.numeral)).length + propias.length;
              const expandida = abierta === etapa && sale;
              return (
                <li
                  key={etapa}
                  className={`rounded-lg border ${sale ? 'border-[#003DA5]/20 bg-white' : 'border-gray-200 bg-slate-50'}`}
                >
                  <div className="flex items-center gap-2 px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Incluir la etapa ${etapa}`}
                      checked={sale}
                      onChange={(e) => {
                        alternarEtapa(etapa, e.target.checked);
                        if (e.target.checked) setAbierta(etapa);
                      }}
                    />
                    <button
                      type="button"
                      disabled={!sale}
                      onClick={() => setAbierta(expandida ? null : etapa)}
                      aria-expanded={expandida}
                      className="flex-1 flex items-center gap-1.5 text-left disabled:cursor-default"
                    >
                      {sale ? (
                        expandida ? (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                        )
                      ) : null}
                      <span className={`text-xs font-bold ${sale ? 'text-slate-800' : 'text-slate-400'}`}>
                        Etapa {etapa} · {NOMBRE_ETAPA[etapa]}
                      </span>
                      <span className="ml-auto text-[11px] text-slate-500">
                        {sale
                          ? `${marcadas} ${marcadas === 1 ? 'actividad' : 'actividades'}`
                          : 'No sale'}
                      </span>
                    </button>
                  </div>

                  {expandida ? (
                    <div className="border-t border-gray-100 px-3 py-2 space-y-1.5">
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-slate-500">Actividades que salen:</span>
                        <button
                          type="button"
                          onClick={() => todasDeLaEtapa(etapa, true)}
                          className="font-bold text-[#003DA5] hover:underline"
                        >
                          Todas
                        </button>
                        <button
                          type="button"
                          onClick={() => todasDeLaEtapa(etapa, false)}
                          className="font-bold text-slate-500 hover:underline"
                        >
                          Ninguna
                        </button>
                      </div>
                      {delFlujo.map((a) => (
                        <label key={a.numeral} className="flex items-center gap-1.5 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            aria-label={`Incluir la ${a.numeral}`}
                            checked={borrador.numerales.has(a.numeral)}
                            onChange={(e) => alternarActividad(a.numeral, e.target.checked)}
                          />
                          <span className="font-bold">{a.numeral}</span> · {a.nombre}
                        </label>
                      ))}
                      {propias.map((p) => (
                        <div key={p.clave} className="flex items-center gap-2">
                          <input
                            type="text"
                            aria-label="Nombre de la actividad propia"
                            placeholder="Nombre de la actividad (visita técnica, mesa de trabajo…)"
                            value={p.nombre}
                            maxLength={200}
                            onChange={(e) =>
                              editar((b) => ({
                                ...b,
                                propias: b.propias.map((x) => (x.clave === p.clave ? { ...x, nombre: e.target.value } : x)),
                              }))
                            }
                            className={`${campo} flex-1`}
                          />
                          <button
                            type="button"
                            onClick={() => editar((b) => ({ ...b, propias: b.propias.filter((x) => x.clave !== p.clave) }))}
                            aria-label={`Quitar la actividad ${p.nombre || 'propia'}`}
                            className="text-xs font-bold text-red-700 hover:underline inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Quitar
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => agregarPropia(etapa)}
                        className="text-xs font-bold text-[#003DA5] hover:underline inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Agregar una actividad propia
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {problema ? <p className="text-xs text-red-700 m-0">{problema}</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            <Boton icono={<Check className="w-3.5 h-3.5" />} disabled={guardando || !!problema || !cambiado} onClick={guardar}>
              {guardando ? 'Guardando…' : `Guardar el cronograma de ${datos.nombre}`}
            </Boton>
            {cambiado ? (
              <button
                type="button"
                onClick={() => cargar(datos)}
                className="text-xs font-bold text-slate-500 hover:underline inline-flex items-center gap-1"
              >
                <Undo2 className="w-3.5 h-3.5" /> Descartar los cambios
              </button>
            ) : datos.actualizadoPor ? (
              <span className="text-xs text-slate-500">Lo configuró por última vez {datos.actualizadoPor}.</span>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
