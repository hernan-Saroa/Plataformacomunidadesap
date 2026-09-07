import React, { useState } from 'react';
import {
  Calendar,
  CheckSquare,
  CircleDollarSign,
  FileUp,
  Hash,
  ListChecks,
  PenLine,
  Plus,
  Trash2,
  Type,
  UserCheck,
  X,
} from 'lucide-react';

import { CampoConfigurable } from '../../types';

import { ORDEN_PETICIONES, PETICIONES, Peticion, peticionDe } from './peticiones';

/** Un icono por petición, para reconocerla sin leer. */
const ICONO: Record<Peticion, typeof FileUp> = {
  ADJUNTAR_DOCUMENTO: FileUp,
  ESCRIBIR_JUSTIFICACION: PenLine,
  REGISTRAR_FECHA: Calendar,
  MARCAR_CASILLA: CheckSquare,
  APROBACION_RESPONSABLE: UserCheck,
  ESCRIBIR_TEXTO: Type,
  ELEGIR_OPCION: ListChecks,
  REGISTRAR_VALOR: CircleDollarSign,
  REGISTRAR_NUMERO: Hash,
};

/**
 * Actividades que el gestor trabaja desde un panel propio y no desde el
 * formulario configurable.
 *
 * Su contenido lo fija la historia —qué datos lleva un contrato, qué amparos
 * cubre una póliza— y no es cosa de configuración: pedirlo aquí crearía un
 * segundo formulario que el gestor nunca vería. Se listan para poder decirlo,
 * porque el aviso de «no se le pide nada» sería falso en ellas.
 */
const CON_PANEL_PROPIO: Record<string, string> = {
  '4.1': 'la solicitud del CDP',
  '4.2': 'la verificación del CDP',
  '4.3': 'la expedición del CDP',
  '5.1': 'los documentos del proceso',
  '5.2': 'la publicación del proyecto de pliego',
  '5.3': 'las observaciones al pliego',
  '5.4': 'la limitación a MIPYME',
  '5.5': 'la audiencia de riesgos',
  '5.6': 'las adendas',
  '5.7': 'la apertura del proceso',
  '6.1': 'la recepción de ofertas',
  '6.2': 'la designación del comité',
  '8.1': 'el contrato y su suscripción',
  '8.4': 'las garantías y sus amparos',
  '8.5': 'la afiliación a la ARL',
};

interface Props {
  /** Para poder decir cuándo la actividad se trabaja desde su propio panel. */
  numeral?: string;
  campos: CampoConfigurable[];
  cargando?: boolean;
  onAgregar: (peticion: Peticion) => Promise<void>;
  onRenombrar: (campo: CampoConfigurable, etiqueta: string) => Promise<void>;
  /** Alterna si el gestor puede terminar la actividad sin diligenciarlo. */
  onExigir: (campo: CampoConfigurable, obligatorio: boolean) => Promise<void>;
  onQuitar: (campo: CampoConfigurable) => Promise<void>;
}

/**
 * Lo que el gestor debe hacer para terminar la actividad.
 *
 * Cada línea es una cosa que se le pide, con su texto editable ahí mismo: es lo
 * que más se retoca —una errata, una redacción más clara— y abrir un formulario
 * aparte para cambiar una palabra desanimaba a corregirlo.
 */
export function QueSePide({
  numeral,
  campos,
  cargando,
  onAgregar,
  onRenombrar,
  onExigir,
  onQuitar,
}: Props) {
  const panelPropio = numeral ? CON_PANEL_PROPIO[numeral] : undefined;
  const [agregando, setAgregando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const activos = campos.filter((c) => c.activo);

  const elegir = async (peticion: Peticion) => {
    setGuardando(true);
    try {
      await onAgregar(peticion);
      setAgregando(false);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="space-y-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-800 m-0">
        Para terminar esta actividad, el gestor debe:
      </p>

      {activos.length === 0 ? (
        /* Sin nada configurado el gestor la cierra con un clic y el expediente
           queda sin constancia de que se hizo. Casi toda actividad de
           contratación deja evidencia documental, así que esto se avisa en
           ámbar: es válido, pero rara vez es lo que se quiere. */
        panelPropio ? (
          /* La actividad sí pide cosas, solo que desde su propio panel: avisar
             aquí de que "no se le pide nada" sería falso, y llevaría a añadir
             un campo que el gestor nunca vería. */
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-sm font-semibold text-blue-900 m-0">
              Esta actividad tiene su propia pantalla
            </p>
            <p className="text-xs text-blue-800 mt-1 mb-0 leading-relaxed">
              El gestor la trabaja desde el panel de {panelPropio}, donde el sistema le pide lo
              que la actividad necesita. Lo que se agregue aquí no aparecería allí.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900 m-0">
              No se le pide nada todavía
            </p>
            <p className="text-xs text-amber-800 mt-1 mb-0 leading-relaxed">
              El gestor la marcará como terminada sin dejar constancia en el expediente.
              Si la actividad produce un documento, pídelo aquí.
            </p>
          </div>
        )
      ) : (
        <ul className="m-0 p-0 list-none space-y-1.5">
          {activos.map((campo) => (
            <Fila
              key={campo.id}
              campo={campo}
              onRenombrar={onRenombrar}
              onExigir={onExigir}
              onQuitar={onQuitar}
            />
          ))}
        </ul>
      )}

      {agregando ? (
        /* Elegir ocurre en la misma lista donde se ve el resultado: un modal
           aparte obligaba a decidir a ciegas, sin ver lo que ya se pide. */
        <div className="rounded-xl border border-[#003DA5] bg-[#E0EDFF] p-3">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-xs font-bold text-gray-800 m-0">¿Qué debe hacer el gestor?</p>
            <button
              type="button"
              onClick={() => setAgregando(false)}
              aria-label="Cancelar"
              className="text-gray-400 hover:text-gray-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid gap-1.5 sm:grid-cols-2">
            {ORDEN_PETICIONES.map((p) => {
              const { nombre, ayuda } = PETICIONES[p];
              const Icono = ICONO[p];
              return (
                <button
                  key={p}
                  type="button"
                  disabled={guardando}
                  onClick={() => elegir(p)}
                  className="flex items-start gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left transition-colors hover:border-[#003DA5] hover:bg-gray-100 disabled:opacity-60"
                >
                  <span className="mt-0.5 flex-shrink-0 text-[#003DA5]">
                    <Icono className="w-4 h-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-gray-900 leading-snug">
                      {nombre}
                    </span>
                    <span className="block text-[10px] text-gray-500 mt-0.5 leading-snug">
                      {ayuda}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAgregando(true)}
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Plus className="w-3.5 h-3.5" />
          Pedir algo más
        </button>
      )}
    </div>
  );
}

/**
 * Una cosa que se le pide al gestor.
 *
 * El texto va en una caja de aspecto editable y se guarda al salir: es lo que
 * el gestor leerá, así que corregirlo tiene que costar un clic y no abrir un
 * formulario.
 */
function Fila({
  campo,
  onRenombrar,
  onExigir,
  onQuitar,
}: {
  campo: CampoConfigurable;
  onRenombrar: (c: CampoConfigurable, etiqueta: string) => Promise<void>;
  onExigir: (c: CampoConfigurable, obligatorio: boolean) => Promise<void>;
  onQuitar: (c: CampoConfigurable) => Promise<void>;
}) {
  const peticion = peticionDe(campo.tipo);
  const { nombre } = PETICIONES[peticion];
  const Icono = ICONO[peticion];

  const [texto, setTexto] = useState(campo.etiqueta);

  const guardar = async () => {
    const limpio = texto.trim();
    if (!limpio || limpio === campo.etiqueta) {
      setTexto(campo.etiqueta);
      return;
    }
    try {
      await onRenombrar(campo, limpio);
    } catch {
      setTexto(campo.etiqueta);
    }
  };

  return (
    <li className="group flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2">
      <span
        title={nombre}
        className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-md bg-gray-100 text-gray-500"
      >
        <Icono className="w-3.5 h-3.5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold text-gray-500 leading-none mb-0.5">
          {nombre}
        </span>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={guardar}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              setTexto(campo.etiqueta);
              e.currentTarget.blur();
            }
          }}
          maxLength={300}
          aria-label="Texto que lee el gestor"
          className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-sm text-gray-900 transition-colors hover:border-gray-300 focus:border-[#003DA5] focus:bg-white focus:ring-1 focus:ring-[#003DA5] outline-none"
        />
      </span>

      {/* Obligatorio u opcional se ve siempre, no al pasar por encima: decide
          si el gestor puede terminar la actividad sin diligenciarlo, y eso hay
          que poder leerlo de un vistazo en toda la lista. */}
      <button
        type="button"
        onClick={() => onExigir(campo, !campo.obligatorio)}
        aria-pressed={campo.obligatorio}
        title={
          campo.obligatorio
            ? 'Obligatorio: sin esto no puede terminar la actividad'
            : 'Opcional: puede terminarla sin diligenciarlo'
        }
        className={`flex-shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
          campo.obligatorio
            ? 'border-[#003DA5] bg-[#E0EDFF] text-[#003DA5]'
            : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
        }`}
      >
        {campo.obligatorio ? 'Obligatorio' : 'Opcional'}
      </button>

      <button
        type="button"
        onClick={() => onQuitar(campo)}
        title="Dejar de pedirlo"
        className="flex-shrink-0 rounded-md p-1.5 text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}
