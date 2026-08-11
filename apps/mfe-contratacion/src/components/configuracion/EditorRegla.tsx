import React, { useState } from 'react';

import { GuardarRegla, Modalidad, ReglaActividad, TipoRegla } from '../../types';

/**
 * Cada tipo de regla necesita datos distintos, y esa forma es la que define
 * `config`. Declararla aquí evita que el usuario tenga que escribir JSON a
 * mano y que un campo mal nombrado deje la regla sin efecto.
 */
const FORMA: Record<
  TipoRegla,
  { etiqueta: string; ayuda: string; campos: { clave: string; label: string; tipo: 'texto' | 'numero'; ayuda?: string }[] }
> = {
  CAMPO_OBLIGATORIO: {
    etiqueta: 'Campo obligatorio',
    ayuda: 'El estudio previo no se puede enviar mientras ese campo esté vacío.',
    campos: [
      { clave: 'codigo', label: 'Código del campo', tipo: 'texto', ayuda: 'Como aparece en el formulario, p. ej. objeto_contratar' },
    ],
  },
  DOCUMENTO_REQUERIDO: {
    etiqueta: 'Documento requerido',
    ayuda: 'Exige que el expediente tenga al menos un documento de ese tipo.',
    campos: [
      { clave: 'tipo', label: 'Tipo de documento', tipo: 'texto', ayuda: 'p. ej. ADJUNTO, CDP. Vacío acepta cualquiera' },
      { clave: 'minimo', label: 'Cantidad mínima', tipo: 'numero' },
    ],
  },
  RANGO_VALOR: {
    etiqueta: 'Rango de valor',
    ayuda: 'El valor del campo debe caer dentro del rango. Dejar un extremo vacío lo deja abierto.',
    campos: [
      { clave: 'codigo', label: 'Código del campo', tipo: 'texto' },
      { clave: 'min', label: 'Mínimo', tipo: 'numero' },
      { clave: 'max', label: 'Máximo', tipo: 'numero' },
    ],
  },
  PLAZO_MINIMO: {
    etiqueta: 'Plazo mínimo',
    ayuda: 'Días que deben transcurrir desde que la actividad inició.',
    campos: [{ clave: 'dias', label: 'Días hábiles', tipo: 'numero' }],
  },
  BLOQUEA_AVANCE: {
    etiqueta: 'Bloquea el avance',
    ayuda: 'Impide pasar a la siguiente actividad hasta que se cumpla.',
    campos: [
      { clave: 'numeral', label: 'Actividad previa', tipo: 'texto', ayuda: 'La que debe completarse antes, p. ej. 4.3' },
    ],
  },
  REGLA_DERIVADA: {
    etiqueta: 'Depende de otro dato',
    ayuda: 'Solo se exige cuando otro campo tiene cierto valor.',
    campos: [
      { clave: 'si_campo', label: 'Campo del que depende', tipo: 'texto' },
      { clave: 'si_valor', label: 'Valor que lo activa', tipo: 'texto' },
      { clave: 'entonces_campo', label: 'Campo que se vuelve obligatorio', tipo: 'texto' },
    ],
  },
};

interface Props {
  numeral: string;
  modalidadActual: string;
  modalidades: Modalidad[];
  regla?: ReglaActividad | null;
  onGuardar: (datos: GuardarRegla) => Promise<void>;
  onCancelar: () => void;
}

export function EditorRegla({
  numeral,
  modalidadActual,
  modalidades,
  regla,
  onGuardar,
  onCancelar,
}: Props) {
  const [tipo, setTipo] = useState<TipoRegla>(regla?.tipo ?? 'CAMPO_OBLIGATORIO');
  const [alcance, setAlcance] = useState<'todas' | 'esta'>(
    regla ? (regla.modalidad ? 'esta' : 'todas') : 'todas',
  );
  const [config, setConfig] = useState<Record<string, any>>(regla?.config ?? {});
  const [mensaje, setMensaje] = useState(regla?.mensaje ?? '');
  const [guardando, setGuardando] = useState(false);

  const forma = FORMA[tipo];

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await onGuardar({
        modalidad: alcance === 'esta' ? modalidadActual : null,
        tipo,
        // Los vacíos se descartan: una clave con cadena vacía haría que el
        // evaluador la tomara por configurada.
        config: Object.fromEntries(
          Object.entries(config).filter(([, v]) => v !== '' && v !== null && v !== undefined),
        ),
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
          Tipo de regla
        </label>
        <select
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value as TipoRegla);
            // La forma cambia por completo: conservar los valores anteriores
            // dejaría claves que el nuevo tipo no entiende.
            setConfig({});
          }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
        >
          {(Object.keys(FORMA) as TipoRegla[]).map((t) => (
            <option key={t} value={t}>
              {FORMA[t].etiqueta}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-gray-500 mt-1.5 mb-0 leading-relaxed">{forma.ayuda}</p>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1.5">
          Aplica a
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAlcance('todas')}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
              alcance === 'todas'
                ? 'border-[#003DA5] bg-[#E0EDFF] text-[#003DA5]'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Todas las modalidades
          </button>
          <button
            type="button"
            onClick={() => setAlcance('esta')}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
              alcance === 'esta'
                ? 'border-[#003DA5] bg-[#E0EDFF] text-[#003DA5]'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Solo {modalidades.find((m) => m.codigo === modalidadActual)?.nombre ?? modalidadActual}
          </button>
        </div>
      </div>

      <div className="space-y-3 rounded-lg bg-gray-50 border border-gray-200 p-3">
        {forma.campos.map((campo) => (
          <div key={campo.clave}>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              {campo.label}
            </label>
            <input
              type={campo.tipo === 'numero' ? 'number' : 'text'}
              value={config[campo.clave] ?? ''}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  [campo.clave]:
                    campo.tipo === 'numero'
                      ? e.target.value === ''
                        ? ''
                        : Number(e.target.value)
                      : e.target.value,
                }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
            />
            {campo.ayuda && (
              <p className="text-[10px] text-gray-500 mt-1 mb-0">{campo.ayuda}</p>
            )}
          </div>
        ))}
      </div>

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
          disabled={guardando}
          className="rounded-lg bg-[#003DA5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00307f] disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : regla ? 'Guardar nueva versión' : 'Crear regla'}
        </button>
      </div>
    </form>
  );
}
