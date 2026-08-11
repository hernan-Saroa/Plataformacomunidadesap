import React from 'react';
import { Plus, X } from 'lucide-react';

import { Accion, CampoConfigurable, Condicion, Modalidad, Operador, TipoAccion } from '../../types';

const OPERADORES: { valor: Operador; texto: string; sinValor?: boolean }[] = [
  { valor: 'ES', texto: 'es' },
  { valor: 'NO_ES', texto: 'no es' },
  { valor: 'MAYOR_QUE', texto: 'es mayor que' },
  { valor: 'MENOR_QUE', texto: 'es menor que' },
  { valor: 'TIENE_VALOR', texto: 'tiene valor', sinValor: true },
  { valor: 'ESTA_VACIO', texto: 'está vacío', sinValor: true },
];

const ACCIONES: { valor: TipoAccion; texto: string }[] = [
  { valor: 'EXIGIR_CAMPO', texto: 'Hacer obligatorio' },
  { valor: 'MOSTRAR_CAMPO', texto: 'Mostrar campo' },
  { valor: 'OCULTAR_CAMPO', texto: 'Ocultar campo' },
  { valor: 'EXIGIR_DOCUMENTO', texto: 'Exigir documento' },
  { valor: 'BLOQUEAR_AVANCE', texto: 'Bloquear el avance' },
];

interface Props {
  condiciones: Condicion[];
  acciones: Accion[];
  conector: 'AND' | 'OR';
  campos: CampoConfigurable[];
  modalidades: Modalidad[];
  onCambiarCondiciones: (c: Condicion[]) => void;
  onCambiarAcciones: (a: Accion[]) => void;
  onCambiarConector: (c: 'AND' | 'OR') => void;
}

/**
 * Constructor de reglas por bloques: CUANDO … ENTONCES …
 *
 * Sin condiciones una regla solo puede exigir algo de forma fija, que es lo
 * que impedía expresar "si el valor supera el umbral, pide este documento".
 * Los bloques evitan además que haya que escribir el JSON a mano, donde una
 * clave mal puesta dejaba la regla sin efecto y sin aviso.
 */
export function ConstructorCondiciones({
  condiciones,
  acciones,
  conector,
  campos,
  modalidades,
  onCambiarCondiciones,
  onCambiarAcciones,
  onCambiarConector,
}: Props) {
  const cambiarCondicion = (i: number, parcial: Partial<Condicion>) =>
    onCambiarCondiciones(condiciones.map((c, n) => (n === i ? { ...c, ...parcial } : c)));

  const cambiarAccion = (i: number, parcial: Partial<Accion>) =>
    onCambiarAcciones(acciones.map((a, n) => (n === i ? { ...a, ...parcial } : a)));

  return (
    <div className="space-y-4">
      <section>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[11px] font-bold text-gray-700 uppercase tracking-wide m-0">
            Cuando
          </h4>
          {condiciones.length > 1 && (
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {(['AND', 'OR'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onCambiarConector(c)}
                  className={`px-2.5 py-1 text-[11px] font-bold ${
                    conector === c ? 'bg-[#003DA5] text-white' : 'bg-white text-gray-600'
                  }`}
                >
                  {c === 'AND' ? 'Y' : 'O'}
                </button>
              ))}
            </div>
          )}
        </div>

        {condiciones.length === 0 ? (
          <p className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 m-0 leading-relaxed">
            Sin condiciones la regla se aplica siempre.
          </p>
        ) : (
          <div className="space-y-2">
            {condiciones.map((c, i) => {
              const operador = OPERADORES.find((o) => o.valor === c.operador);
              return (
                <div key={i} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <span className="w-7 flex-shrink-0 text-[10px] font-bold text-gray-500 text-center">
                      {conector === 'AND' ? 'Y' : 'O'}
                    </span>
                  )}
                  <div
                    className={`flex-1 flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-gray-50 p-2 ${
                      i > 0 ? '' : 'ml-[34px]'
                    }`}
                  >
                    <select
                      value={c.campo}
                      onChange={(e) => cambiarCondicion(i, { campo: e.target.value })}
                      className="rounded border border-gray-300 px-2 py-1 text-xs bg-white min-w-[140px]"
                    >
                      <option value="modalidad">la modalidad</option>
                      {campos.map((campo) => (
                        <option key={campo.codigo} value={campo.codigo}>
                          {campo.etiqueta}
                        </option>
                      ))}
                    </select>

                    <select
                      value={c.operador}
                      onChange={(e) =>
                        cambiarCondicion(i, { operador: e.target.value as Operador })
                      }
                      className="rounded border border-gray-300 px-2 py-1 text-xs bg-white"
                    >
                      {OPERADORES.map((o) => (
                        <option key={o.valor} value={o.valor}>
                          {o.texto}
                        </option>
                      ))}
                    </select>

                    {!operador?.sinValor &&
                      (c.campo === 'modalidad' ? (
                        <select
                          value={c.valor ?? ''}
                          onChange={(e) => cambiarCondicion(i, { valor: e.target.value })}
                          className="rounded border border-gray-300 px-2 py-1 text-xs bg-white min-w-[160px]"
                        >
                          <option value="">Elegir…</option>
                          {modalidades.map((m) => (
                            <option key={m.codigo} value={m.codigo}>
                              {m.nombre}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={c.valor ?? ''}
                          onChange={(e) => cambiarCondicion(i, { valor: e.target.value })}
                          placeholder="valor"
                          className="rounded border border-gray-300 px-2 py-1 text-xs bg-white w-32"
                        />
                      ))}

                    <button
                      type="button"
                      onClick={() => onCambiarCondiciones(condiciones.filter((_, n) => n !== i))}
                      title="Quitar condición"
                      className="ml-auto rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() =>
            onCambiarCondiciones([
              ...condiciones,
              { campo: 'modalidad', operador: 'ES', valor: '' },
            ])
          }
          className="mt-2 flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:border-[#003DA5] hover:text-[#003DA5]"
        >
          <Plus className="w-3 h-3" /> Condición
        </button>
      </section>

      <section>
        <h4 className="text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-2">
          Entonces
        </h4>

        {acciones.length === 0 ? (
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 m-0">
            Agrega al menos una acción: sin ella la regla no hace nada.
          </p>
        ) : (
          <div className="space-y-2">
            {acciones.map((a, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-gray-50 p-2"
              >
                <select
                  value={a.accion}
                  onChange={(e) => cambiarAccion(i, { accion: e.target.value as TipoAccion })}
                  className="rounded border border-gray-300 px-2 py-1 text-xs bg-white min-w-[150px]"
                >
                  {ACCIONES.map((o) => (
                    <option key={o.valor} value={o.valor}>
                      {o.texto}
                    </option>
                  ))}
                </select>

                {a.accion === 'EXIGIR_DOCUMENTO' || a.accion === 'BLOQUEAR_AVANCE' ? (
                  <input
                    value={a.objetivo}
                    onChange={(e) => cambiarAccion(i, { objetivo: e.target.value })}
                    placeholder={a.accion === 'BLOQUEAR_AVANCE' ? 'numeral, p. ej. 4.3' : 'tipo'}
                    className="rounded border border-gray-300 px-2 py-1 text-xs bg-white w-40"
                  />
                ) : (
                  <select
                    value={a.objetivo}
                    onChange={(e) => cambiarAccion(i, { objetivo: e.target.value })}
                    className="rounded border border-gray-300 px-2 py-1 text-xs bg-white min-w-[180px]"
                  >
                    <option value="">Elegir campo…</option>
                    {campos.map((campo) => (
                      <option key={campo.codigo} value={campo.codigo}>
                        {campo.etiqueta}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => onCambiarAcciones(acciones.filter((_, n) => n !== i))}
                  title="Quitar acción"
                  className="ml-auto rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() =>
            onCambiarAcciones([...acciones, { accion: 'EXIGIR_CAMPO', objetivo: '' }])
          }
          className="mt-2 flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:border-[#003DA5] hover:text-[#003DA5]"
        >
          <Plus className="w-3 h-3" /> Acción
        </button>
      </section>
    </div>
  );
}
