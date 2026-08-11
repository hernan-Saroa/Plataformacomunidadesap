import React, { useEffect, useMemo, useState } from 'react';
import { Settings, Check, Minus, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { ActividadAplicable, GuardarRegla, Modalidad, ReglaActividad } from '../../types';
import { ModuleHeader } from '../shared/ModuleHeader';
import { Modal } from '../shared/Modal';
import { EditorRegla } from './EditorRegla';

const ETIQUETA_REGLA: Record<string, string> = {
  CAMPO_OBLIGATORIO: 'Campo obligatorio',
  DOCUMENTO_REQUERIDO: 'Documento requerido',
  RANGO_VALOR: 'Rango de valor',
  PLAZO_MINIMO: 'Plazo mínimo',
  BLOQUEA_AVANCE: 'Bloquea el avance',
  REGLA_DERIVADA: 'Depende de otro dato',
};

/** El módulo arranca en la etapa 3: es donde empieza el trabajo en el sistema. */
const ETAPA_INICIAL = 3;

const NOMBRE_ETAPA: Record<number, string> = {
  1: 'Identificación y planeación',
  2: 'Plan Anual de Adquisiciones',
  3: 'Estudios previos',
  4: 'CDP',
  5: 'Elaboración y publicación',
  6: 'Evaluación',
  7: 'Adjudicación',
  8: 'Suscripción',
  9: 'Ejecución',
  10: 'Liquidación',
};

/**
 * Configuración de etapas.
 *
 * Dos paneles: a la izquierda las actividades de la modalidad elegida, a la
 * derecha el detalle de la seleccionada con sus reglas. Antes era una lista
 * de solo lectura, así que corregir el nombre de una actividad o ajustar un
 * plazo obligaba a entrar a la base de datos.
 */
export function VistaConfiguracion() {
  const [modalidades, setModalidades] = useState<Modalidad[]>([]);
  const [modalidad, setModalidad] = useState('');
  const [actividades, setActividades] = useState<ActividadAplicable[]>([]);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [reglas, setReglas] = useState<ReglaActividad[]>([]);
  const [cargando, setCargando] = useState(false);
  const [cargandoReglas, setCargandoReglas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editandoTexto, setEditandoTexto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [editandoRegla, setEditandoRegla] = useState<ReglaActividad | null | undefined>(undefined);

  const actividad = useMemo(
    () => actividades.find((a) => a.numeral === seleccion) ?? null,
    [actividades, seleccion],
  );

  useEffect(() => {
    contratacionService
      .modalidades()
      .then((lista) => {
        setModalidades(lista);
        if (lista.length > 0) setModalidad(lista[0].codigo);
      })
      .catch((err: any) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!modalidad) return;
    setCargando(true);
    setError(null);
    contratacionService
      .actividadesDeModalidad(modalidad)
      .then((lista) => {
        setActividades(lista);
        // Se conserva la selección al cambiar de modalidad: comparar la misma
        // actividad entre modalidades es justo el caso de uso.
        setSeleccion((actual) =>
          actual && lista.some((a) => a.numeral === actual)
            ? actual
            : (lista.find((a) => a.etapa === ETAPA_INICIAL) ?? lista[0])?.numeral ?? null,
        );
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));
  }, [modalidad]);

  useEffect(() => {
    if (!seleccion) return;
    setCargandoReglas(true);
    contratacionService
      .reglasDe(seleccion, modalidad)
      .then(setReglas)
      .catch(() => setReglas([]))
      .finally(() => setCargandoReglas(false));
  }, [seleccion, modalidad]);

  const recargarReglas = async () => {
    if (!seleccion) return;
    setReglas(await contratacionService.reglasDe(seleccion, modalidad));
  };

  const abrirEdicionTexto = () => {
    if (!actividad) return;
    setNombre(actividad.nombre);
    setDescripcion(actividad.descripcion ?? '');
    setEditandoTexto(true);
  };

  const guardarTexto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actividad) return;
    try {
      await contratacionService.actualizarActividad(actividad.numeral, {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
      });
      setActividades((lista) =>
        lista.map((a) =>
          a.numeral === actividad.numeral
            ? { ...a, nombre: nombre.trim(), descripcion: descripcion.trim() || null }
            : a,
        ),
      );
      setEditandoTexto(false);
      toast.success('Actividad actualizada');
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo guardar');
    }
  };

  const alternarAplica = async () => {
    if (!actividad) return;
    const aplica = !actividad.aplica;
    const motivo = aplica
      ? undefined
      : window.prompt('¿Por qué no aplica a esta modalidad? (queda en el expediente)') ?? undefined;
    if (!aplica && motivo === undefined) return;

    try {
      await contratacionService.cambiarAplicabilidad(actividad.numeral, {
        modalidad,
        aplica,
        motivo,
      });
      setActividades((lista) =>
        lista.map((a) =>
          a.numeral === actividad.numeral ? { ...a, aplica, motivo: motivo ?? null } : a,
        ),
      );
      toast.success(aplica ? 'La actividad ahora aplica' : 'Actividad marcada como no aplica');
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo cambiar');
    }
  };

  const guardarRegla = async (datos: GuardarRegla) => {
    if (!seleccion) return;
    try {
      if (editandoRegla) await contratacionService.reemplazarRegla(editandoRegla.id, datos);
      else await contratacionService.crearRegla(seleccion, datos);
      await recargarReglas();
      setEditandoRegla(undefined);
      toast.success(editandoRegla ? 'Regla actualizada' : 'Regla creada');
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo guardar la regla');
    }
  };

  const derogar = async (regla: ReglaActividad) => {
    if (!window.confirm('La regla deja de aplicarse a los procesos nuevos. ¿Continuar?')) return;
    try {
      await contratacionService.derogarRegla(regla.id);
      await recargarReglas();
      toast.success('Regla derogada');
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo derogar');
    }
  };

  const porEtapa = useMemo(() => {
    const mapa = new Map<number, ActividadAplicable[]>();
    for (const a of actividades) {
      if (!mapa.has(a.etapa)) mapa.set(a.etapa, []);
      mapa.get(a.etapa)!.push(a);
    }
    return [...mapa.entries()].sort(([a], [b]) => a - b);
  }, [actividades]);

  return (
    <div className="space-y-5">
      <ModuleHeader
        icon={<Settings className="w-6 h-6" />}
        title="Configuración de etapas"
        subtitle="Qué actividades recorre cada modalidad y qué debe cumplirse en cada una"
        color="#64748B"
      />

      <div className="flex items-center gap-3">
        <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">
          Modalidad
        </label>
        <select
          value={modalidad}
          onChange={(e) => setModalidad(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[280px] focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
        >
          {modalidades.map((m) => (
            <option key={m.codigo} value={m.codigo}>
              {m.nombre}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2"
        >
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-800 m-0">{error}</p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] items-start">
        {/* Actividades de la modalidad */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide m-0">
              Actividades
            </h3>
          </div>
          {cargando ? (
            <div className="p-4 space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-9 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              {porEtapa.map(([etapa, lista]) => (
                <div key={etapa}>
                  <div className="sticky top-0 bg-white/95 backdrop-blur px-4 py-1.5 border-b border-gray-100">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Etapa {etapa} · {NOMBRE_ETAPA[etapa] ?? ''}
                    </span>
                  </div>
                  {lista.map((a) => (
                    <button
                      key={a.numeral}
                      type="button"
                      onClick={() => setSeleccion(a.numeral)}
                      className={`w-full flex items-start gap-2.5 px-4 py-2.5 text-left border-b border-gray-100 transition-colors ${
                        seleccion === a.numeral ? 'bg-[#E0EDFF]' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded flex items-center justify-center ${
                          a.aplica ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'
                        }`}
                        title={a.aplica ? 'Aplica' : 'No aplica'}
                      >
                        {a.aplica ? <Check className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-bold text-gray-500">{a.numeral}</span>
                        <span
                          className={`block text-sm leading-snug ${
                            a.aplica ? 'text-gray-800' : 'text-gray-400 line-through'
                          }`}
                        >
                          {a.nombre}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detalle de la actividad seleccionada */}
        {actividad ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-gray-500">
                    Numeral {actividad.numeral}
                  </span>
                  <h2 className="text-lg font-bold text-gray-900 mt-0.5 mb-1 leading-snug">
                    {actividad.nombre}
                  </h2>
                  {actividad.descripcion && (
                    <p className="text-sm text-gray-600 m-0 leading-relaxed">
                      {actividad.descripcion}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={abrirEdicionTexto}
                  className="flex-shrink-0 flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-700 m-0">
                    {actividad.aplica
                      ? 'Aplica a esta modalidad'
                      : 'No aplica a esta modalidad'}
                  </p>
                  {!actividad.aplica && actividad.motivo && (
                    <p className="text-[11px] text-gray-500 mt-0.5 mb-0">{actividad.motivo}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={alternarAplica}
                  className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors ${
                    actividad.aplica
                      ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                >
                  {actividad.aplica ? 'Marcar que no aplica' : 'Marcar que aplica'}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide m-0">
                  Reglas vigentes
                </h3>
                <button
                  type="button"
                  onClick={() => setEditandoRegla(null)}
                  className="flex items-center gap-1.5 rounded-lg bg-[#003DA5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#00307f]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar
                </button>
              </div>

              {cargandoReglas ? (
                <div className="p-4 space-y-2">
                  {[0, 1].map((i) => (
                    <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />
                  ))}
                </div>
              ) : reglas.length === 0 ? (
                <p className="text-sm text-gray-500 px-4 py-8 text-center m-0">
                  Sin reglas: la actividad se puede dar por terminada sin validaciones.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 m-0 p-0 list-none">
                  {reglas.map((r) => (
                    <li key={r.id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="rounded bg-[#E0EDFF] px-2 py-0.5 text-[10px] font-bold text-[#003DA5] uppercase tracking-wide">
                            {ETIQUETA_REGLA[r.tipo] ?? r.tipo}
                          </span>
                          {r.modalidad ? (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                              Solo esta modalidad
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-500">Todas las modalidades</span>
                          )}
                        </div>
                        {r.mensaje && (
                          <p className="text-sm text-gray-700 mt-1 mb-0 leading-snug">{r.mensaje}</p>
                        )}
                        <p className="text-[11px] text-gray-500 mt-1 mb-0 font-mono">
                          {Object.entries(r.config)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' · ') || '—'}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditandoRegla(r)}
                          title="Editar"
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => derogar(r)}
                          title="Derogar"
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
            <p className="text-sm text-gray-500 m-0">Elige una actividad para ver su detalle.</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={editandoTexto}
        onClose={() => setEditandoTexto(false)}
        title="Editar actividad"
        description={`Numeral ${actividad?.numeral ?? ''}`}
        size="medium"
        icon={<Pencil className="w-5 h-5" />}
      >
        <form onSubmit={guardarTexto} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Nombre
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              maxLength={200}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditandoTexto(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#003DA5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00307f]"
            >
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={editandoRegla !== undefined}
        onClose={() => setEditandoRegla(undefined)}
        title={editandoRegla ? 'Editar regla' : 'Nueva regla'}
        description={`Numeral ${actividad?.numeral ?? ''}`}
        size="large"
        icon={<Settings className="w-5 h-5" />}
      >
        {editandoRegla !== undefined && seleccion && (
          <EditorRegla
            numeral={seleccion}
            modalidadActual={modalidad}
            modalidades={modalidades}
            regla={editandoRegla}
            onGuardar={guardarRegla}
            onCancelar={() => setEditandoRegla(undefined)}
          />
        )}
      </Modal>
    </div>
  );
}
