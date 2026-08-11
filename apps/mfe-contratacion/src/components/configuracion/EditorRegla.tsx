import React, { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';

import {
  Accion,
  CampoConfigurable,
  Condicion,
  GuardarRegla,
  Modalidad,
  ReglaActividad,
} from '../../types';
import { ConstructorCondiciones } from './ConstructorCondiciones';

interface Props {
  modalidadActual: string;
  modalidades: Modalidad[];
  campos: CampoConfigurable[];
  regla?: ReglaActividad | null;
  /** Con qué alcance nace una regla nueva. */
  alcanceInicial: 'global' | 'excepcion';
  onGuardar: (datos: GuardarRegla) => Promise<void>;
  onCancelar: () => void;
}

/**
 * Editor de una regla.
 *
 * La regla se arma con bloques CUANDO/ENTONCES y se traduce a una frase antes
 * de guardarla: el administrador tiene que poder leer lo que configuró sin
 * interpretar JSON, que es donde una clave mal escrita pasaba desapercibida.
 */
export function EditorRegla({
  modalidadActual,
  modalidades,
  campos,
  regla,
  alcanceInicial,
  onGuardar,
  onCancelar,
}: Props) {
  const [alcance, setAlcance] = useState<'global' | 'excepcion'>(
    regla ? (regla.modalidad ? 'excepcion' : 'global') : alcanceInicial,
  );
  const [condiciones, setCondiciones] = useState<Condicion[]>(regla?.condiciones ?? []);
  const [acciones, setAcciones] = useState<Accion[]>(regla?.acciones ?? []);
  const [conector, setConector] = useState<'AND' | 'OR'>(regla?.conector ?? 'AND');
  const [mensaje, setMensaje] = useState(regla?.mensaje ?? '');
  const [guardando, setGuardando] = useState(false);

  const nombreModalidad =
    modalidades.find((m) => m.codigo === modalidadActual)?.nombre ?? modalidadActual;

  const frase = useMemo(
    () => describir(condiciones, acciones, conector, campos, modalidades),
    [condiciones, acciones, conector, campos, modalidades],
  );

  const completa = acciones.length > 0 && acciones.every((a) => a.objetivo.trim() !== '');

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completa) return;
    setGuardando(true);
    try {
      await onGuardar({
        modalidad: alcance === 'excepcion' ? modalidadActual : null,
        // El tipo se conserva por compatibilidad con el evaluador anterior;
        // lo que manda ahora son las acciones.
        tipo: acciones[0]?.accion === 'EXIGIR_DOCUMENTO' ? 'DOCUMENTO_REQUERIDO' : 'CAMPO_OBLIGATORIO',
        config: {},
        condiciones,
        acciones,
        conector,
        mensaje: mensaje.trim() || undefined,
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-5">
      <div>
        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1.5">
          Alcance
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAlcance('global')}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
              alcance === 'global'
                ? 'border-[#003DA5] bg-[#E0EDFF] text-[#003DA5]'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Todas las modalidades
          </button>
          <button
            type="button"
            onClick={() => setAlcance('excepcion')}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
              alcance === 'excepcion'
                ? 'border-[#003DA5] bg-[#E0EDFF] text-[#003DA5]'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Solo {nombreModalidad}
          </button>
        </div>
      </div>

      <ConstructorCondiciones
        condiciones={condiciones}
        acciones={acciones}
        conector={conector}
        campos={campos}
        modalidades={modalidades}
        onCambiarCondiciones={setCondiciones}
        onCambiarAcciones={setAcciones}
        onCambiarConector={setConector}
      />

      <div>
        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1.5">
          Mensaje al gestor
        </label>
        <input
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder="Lo que verá cuando la regla no se cumpla"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
        />
      </div>

      {/* La frase es lo que convierte los bloques en algo revisable: si no se
          lee como se esperaba, la regla está mal antes de guardarla. */}
      <div className="rounded-lg border border-[#003DA5]/20 bg-[#E0EDFF]/40 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[10px] font-bold text-[#003DA5] uppercase tracking-wide m-0 mb-1">
          <Sparkles className="w-3 h-3" />
          Resultado
        </p>
        <p className="text-sm text-slate-800 m-0 leading-relaxed">{frase}</p>
        <p className="text-[11px] text-slate-600 m-0 mt-1">
          {alcance === 'global'
            ? `Afecta a las ${modalidades.length} modalidades.`
            : `Afecta solo a ${nombreModalidad}.`}
        </p>
      </div>

      {regla && (
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 m-0 leading-relaxed">
          Al guardar, la regla actual se cierra y se abre una nueva. Los procesos aprobados antes
          siguen auditándose con la versión con la que se evaluaron.
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando || !completa}
          title={completa ? undefined : 'Falta al menos una acción con su campo'}
          className="rounded-lg bg-[#003DA5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00307f] disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : regla ? 'Guardar nueva versión' : 'Crear regla'}
        </button>
      </div>
    </form>
  );
}

/** Traduce los bloques a español, con las etiquetas que el gestor ve. */
function describir(
  condiciones: Condicion[],
  acciones: Accion[],
  conector: 'AND' | 'OR',
  campos: CampoConfigurable[],
  modalidades: Modalidad[],
): string {
  if (acciones.length === 0) return 'Agrega una acción para ver qué hará la regla.';

  const etiqueta = (codigo: string) =>
    campos.find((c) => c.codigo === codigo)?.etiqueta ?? (codigo || '…');

  const verbos: Record<string, (o: string) => string> = {
    EXIGIR_CAMPO: (o) => `exige «${etiqueta(o)}»`,
    MOSTRAR_CAMPO: (o) => `muestra «${etiqueta(o)}»`,
    OCULTAR_CAMPO: (o) => `oculta «${etiqueta(o)}»`,
    EXIGIR_DOCUMENTO: (o) => `exige el documento ${o || '…'}`,
    BLOQUEAR_AVANCE: (o) => `bloquea el avance hasta ${o || '…'}`,
  };

  const queHace = acciones.map((a) => verbos[a.accion]?.(a.objetivo) ?? a.accion).join(' y ');

  if (condiciones.length === 0) {
    return `Siempre ${queHace}.`;
  }

  const nombreModalidad = (codigo: string) =>
    modalidades.find((m) => m.codigo === codigo)?.nombre ?? (codigo || '…');

  const cuando = condiciones
    .map((c) => {
      const sujeto = c.campo === 'modalidad' ? 'la modalidad' : `«${etiqueta(c.campo)}»`;
      const valor = c.campo === 'modalidad' ? nombreModalidad(c.valor) : (c.valor ?? '…');
      switch (c.operador) {
        case 'ES':
          return `${sujeto} es ${valor}`;
        case 'NO_ES':
          return `${sujeto} no es ${valor}`;
        case 'MAYOR_QUE':
          return `${sujeto} supera ${valor}`;
        case 'MENOR_QUE':
          return `${sujeto} es menor que ${valor}`;
        case 'ESTA_VACIO':
          return `${sujeto} está vacío`;
        case 'TIENE_VALOR':
          return `${sujeto} tiene valor`;
        default:
          return sujeto;
      }
    })
    .join(conector === 'OR' ? ' o ' : ' y ');

  return `Si ${cuando}, ${queHace}.`;
}
