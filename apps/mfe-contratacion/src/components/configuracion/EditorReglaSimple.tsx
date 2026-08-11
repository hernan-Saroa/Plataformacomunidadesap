import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

import { Accion, CampoConfigurable, Condicion, GuardarRegla, Modalidad } from '../../types';

/**
 * Lo que un funcionario de Contratación necesita configurar, en sus términos.
 *
 * El constructor completo pide elegir entre EXIGIR_CAMPO, MOSTRAR_CAMPO y
 * OCULTAR_CAMPO, que son conceptos de programador. Aquí las tres opciones se
 * expresan como lo que significan para el trámite, y la condición se reduce a
 * la única que aparece en la matriz: que dependa de la modalidad.
 *
 * Lo que no cabe en esta forma —varias condiciones, umbrales, OR— se configura
 * en el modo avanzado.
 */
type Exigencia = 'siempre' | 'solo_si_modalidad';

interface Props {
  modalidadActual: string;
  modalidades: Modalidad[];
  campos: CampoConfigurable[];
  alcanceInicial: 'global' | 'excepcion';
  onGuardar: (datos: GuardarRegla) => Promise<void>;
  onCancelar: () => void;
  onAvanzado: () => void;
}

export function EditorReglaSimple({
  modalidadActual,
  modalidades,
  campos,
  alcanceInicial,
  onGuardar,
  onCancelar,
  onAvanzado,
}: Props) {
  const [campo, setCampo] = useState('');
  const [exigencia, setExigencia] = useState<Exigencia>(
    alcanceInicial === 'excepcion' ? 'solo_si_modalidad' : 'siempre',
  );
  const [modalidadCondicion, setModalidadCondicion] = useState(modalidadActual);
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);

  const etiqueta = campos.find((c) => c.codigo === campo)?.etiqueta ?? '…';
  const nombreModalidad =
    modalidades.find((m) => m.codigo === modalidadCondicion)?.nombre ?? modalidadCondicion;

  const frase =
    exigencia === 'siempre'
      ? `«${etiqueta}» será obligatorio en todas las modalidades.`
      : `«${etiqueta}» será obligatorio solo en ${nombreModalidad}.`;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campo) return;
    setGuardando(true);
    try {
      const condiciones: Condicion[] =
        exigencia === 'solo_si_modalidad'
          ? [{ campo: 'modalidad', operador: 'ES', valor: modalidadCondicion }]
          : [];
      const acciones: Accion[] = [{ accion: 'EXIGIR_CAMPO', objetivo: campo }];

      await onGuardar({
        // La condición ya restringe la modalidad, así que la regla se guarda
        // como global: duplicar el filtro la haría depender de dos sitios.
        modalidad: null,
        tipo: 'CAMPO_OBLIGATORIO',
        config: {},
        condiciones,
        acciones,
        conector: 'AND',
        mensaje: mensaje.trim() || undefined,
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
          ¿Qué campo quieres exigir?
        </label>
        <select
          value={campo}
          onChange={(e) => setCampo(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
        >
          <option value="">Elegir campo del formulario…</option>
          {campos.map((c) => (
            <option key={c.codigo} value={c.codigo}>
              {c.etiqueta}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-gray-800 mb-1.5">
          ¿Cuándo debe exigirse?
        </legend>

        <label
          className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
            exigencia === 'siempre'
              ? 'border-[#003DA5] bg-[#E0EDFF]/50'
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          <input
            type="radio"
            checked={exigencia === 'siempre'}
            onChange={() => setExigencia('siempre')}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-semibold text-gray-900">Siempre</span>
            <span className="block text-xs text-gray-600 mt-0.5">
              En las {modalidades.length} modalidades, sin excepción.
            </span>
          </span>
        </label>

        <label
          className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
            exigencia === 'solo_si_modalidad'
              ? 'border-[#003DA5] bg-[#E0EDFF]/50'
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          <input
            type="radio"
            checked={exigencia === 'solo_si_modalidad'}
            onChange={() => setExigencia('solo_si_modalidad')}
            className="mt-0.5"
          />
          <span className="flex-1">
            <span className="block text-sm font-semibold text-gray-900">
              Solo en una modalidad
            </span>
            {exigencia === 'solo_si_modalidad' && (
              <select
                value={modalidadCondicion}
                onChange={(e) => setModalidadCondicion(e.target.value)}
                onClick={(e) => e.preventDefault()}
                className="mt-1.5 w-full rounded border border-gray-300 px-2 py-1 text-xs bg-white"
              >
                {modalidades.map((m) => (
                  <option key={m.codigo} value={m.codigo}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            )}
          </span>
        </label>
      </fieldset>

      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
          ¿Qué mensaje ve quien diligencia?
          <span className="font-normal text-gray-500 text-xs ml-1">(opcional)</span>
        </label>
        <input
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder="Debe diligenciar el objeto del contrato"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
        />
      </div>

      <div className="rounded-lg border border-[#003DA5]/20 bg-[#E0EDFF]/40 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[10px] font-bold text-[#003DA5] uppercase tracking-wide m-0 mb-1">
          <Sparkles className="w-3 h-3" />
          Quedará así
        </p>
        <p className="text-sm text-slate-800 m-0 leading-relaxed">{frase}</p>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={onAvanzado}
          className="text-xs font-semibold text-[#003DA5] hover:underline"
        >
          Necesito algo más complejo
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando || !campo}
            className="rounded-lg bg-[#003DA5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00307f] disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : 'Crear regla'}
          </button>
        </div>
      </div>
    </form>
  );
}
